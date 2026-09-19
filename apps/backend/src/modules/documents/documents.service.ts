import {
  Inject,
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { DocumentType, GeneratedDocumentType, MedicalRiskLevel, Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { ConsultationAccessService } from '../../common/services/consultation-access.service';
import { LLM_PROVIDER } from '../../providers/ai/llm.tokens';
import { LlmProvider, StructuredClinicalDataPayload } from '../../providers/ai/llm.provider';
import { SettingsService } from '../settings/settings.service';
import { buildDocumentPrompt } from './document-prompts';
import { logAiExecution } from '../ai/ai-execution.helper';
import {
  BACKEND_DOC_TYPE_MAP,
  DOC_TYPE_LABEL_JA,
  DocumentGenerationContext,
  FRONTEND_DOC_TYPE_MAP,
  GENERATED_DOCUMENT_TYPES,
} from './document-types';
import { finalizeReferralContent, ReferralPatientContext } from './referral-template';

@Injectable()
export class DocumentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly consultationAccess: ConsultationAccessService,
    private readonly settingsService: SettingsService,
    @Inject(LLM_PROVIDER) private readonly llmProvider: LlmProvider,
  ) {}

  /**
   * Block final documents while high-risk knowledge entities still need physician approval.
   */
  async assertHighRiskKnowledgeApproved(consultationId: string) {
    const entities = await this.prisma.clinicalEntity.findMany({
      where: {
        consultationId,
        needsReview: true,
        riskLevel: { in: [MedicalRiskLevel.high, MedicalRiskLevel.critical] },
      },
    });
    if (!entities.length) return;

    const approved = await this.prisma.transcriptCorrection.findMany({
      where: { consultationId, approvedByDoctor: true },
      select: { originalTerm: true, correctedTerm: true },
    });
    const approvedKeys = new Set(
      approved.map((a) => `${a.originalTerm ?? ''}→${a.correctedTerm ?? ''}`),
    );

    const unresolved = entities.filter((e) => {
      const to = e.normalizedValue ?? e.rawValue;
      return (
        !approvedKeys.has(`${e.rawValue}→${to}`) && !approvedKeys.has(`${e.rawValue}→${e.rawValue}`)
      );
    });

    if (unresolved.length > 0) {
      throw new ConflictException(
        `要確認の医療用語が ${unresolved.length} 件残っています。レビュー画面で確定してから書類を作成してください。`,
      );
    }
  }

  async list(consultationId: string, physicianId: string) {
    await this.consultationAccess.assertPhysicianOwns(consultationId, physicianId);
    const docs = await this.prisma.generatedDocument.findMany({
      where: { consultationId },
      orderBy: [{ type: 'asc' }, { version: 'desc' }],
    });
    const latestByType = new Map<GeneratedDocumentType, (typeof docs)[0]>();
    for (const doc of docs) {
      if (!latestByType.has(doc.type)) {
        latestByType.set(doc.type, doc);
      }
    }
    return Array.from(latestByType.values()).map((doc) => ({
      id: doc.id,
      type: FRONTEND_DOC_TYPE_MAP[doc.type],
      content: doc.content,
      version: doc.version,
      isAiGenerated: doc.isAiGenerated,
      approved: doc.approved,
      updatedAt: doc.updatedAt,
    }));
  }

  async generateAll(
    consultationId: string,
    physicianId: string,
    options?: { referralPattern?: 'simple' | 'complex' },
  ) {
    await this.consultationAccess.assertPhysicianOwns(consultationId, physicianId);
    await this.assertHighRiskKnowledgeApproved(consultationId);
    const ctx = await this.buildContext(consultationId, physicianId, options?.referralPattern);
    const start = Date.now();

    // 全か無かにしない。
    //
    // 6種類を Promise.all で回していたため、OpenAI が1本だけ 429 を返したり
    // JSON を崩したりすると、**出来ていた5枚も一緒に捨てられていた**。
    // 診療の合間に押すボタンなので、ここで全部失うのは実運用で一番痛い。
    // 出来たものは残し、出来なかったものだけ理由をつけて医師へ返す。
    const settled = await Promise.allSettled(
      GENERATED_DOCUMENT_TYPES.map((type) => this.generateOne(consultationId, type, ctx)),
    );

    const documents: Awaited<ReturnType<typeof this.generateOne>>[] = [];
    const failed: Array<{ type: string; label: string; reason: string }> = [];
    settled.forEach((result, i) => {
      if (result.status === 'fulfilled') {
        documents.push(result.value);
        return;
      }
      const type = GENERATED_DOCUMENT_TYPES[i]!;
      failed.push({
        type: FRONTEND_DOC_TYPE_MAP[type],
        // 医師の目に触れる経路（チャットの返信）で英語のIDを出さないため、書類名も返す
        label: DOC_TYPE_LABEL_JA[type],
        reason: result.reason instanceof Error ? result.reason.message : String(result.reason),
      });
    });

    await logAiExecution(this.prisma, {
      consultationId,
      step: 'documents_complete',
      provider: this.llmProvider.name,
      // 失敗を黙って飲み込むと、あとで「なぜ出なかったのか」を辿れない
      status: failed.length === 0 ? 'completed' : 'failed',
      errorMessage: failed.length
        ? failed.map((f) => `${f.label}: ${f.reason}`).join(' / ')
        : undefined,
      durationMs: Date.now() - start,
      promptVersion: this.llmProvider.name === 'openai' ? 'openai-docs-v1' : 'mock-v1',
      ...this.getLlmUsage(),
    });

    // 1枚も出なかったときだけ、従来どおり例外にする（画面に赤いエラーを出す）
    if (documents.length === 0) {
      throw new BadRequestException(
        `書類を作成できませんでした。${failed.map((f) => f.reason).join(' / ')}`,
      );
    }

    return { documents, failed };
  }

  async generateOne(
    consultationId: string,
    type: GeneratedDocumentType,
    ctx?: DocumentGenerationContext,
  ) {
    if (!ctx) {
      await this.assertHighRiskKnowledgeApproved(consultationId);
    }
    const context = ctx ?? (await this.buildContext(consultationId, ''));
    const { system, user } = buildDocumentPrompt(type, context);
    const raw = await this.llmProvider.generateDocument(type, system, user);
    // 紹介状は紙の雛形が決まっている。固定文・患者欄・発行日はAIの出力を採用せず、ここで上書きする
    const content = await this.applyReferralTemplate(
      FRONTEND_DOC_TYPE_MAP[type],
      raw,
      referralPatientContextFrom(context),
    );

    const latest = await this.prisma.generatedDocument.findFirst({
      where: { consultationId, type },
      orderBy: { version: 'desc' },
    });
    const version = (latest?.version ?? 0) + 1;

    const doc = await this.prisma.generatedDocument.create({
      data: {
        consultationId,
        type,
        content: content as Prisma.InputJsonValue,
        version,
        isAiGenerated: true,
      },
    });

    return {
      id: doc.id,
      type: FRONTEND_DOC_TYPE_MAP[doc.type],
      content: doc.content,
      version: doc.version,
      isAiGenerated: doc.isAiGenerated,
      approved: doc.approved,
      updatedAt: doc.updatedAt,
    };
  }

  /**
   * 紹介状（と情報提供書＋処方の紹介状部分）に、紙の雛形を当てる。
   *
   * AIやチャットが返した内容のうち、雛形で決まっているところ（固定文・患者欄・発行日）を
   * 捨てて、こちらの値で埋め直す。紹介状以外の書類はそのまま通す。
   */
  applyReferralTemplate(
    frontendType: string,
    content: Record<string, unknown>,
    patient: ReferralPatientContext,
    issuedAt: Date = new Date(),
  ): Record<string, unknown> {
    if (frontendType === 'referral') {
      return finalizeReferralContent(content, patient, issuedAt) as unknown as Record<
        string,
        unknown
      >;
    }
    if (frontendType === 'info-combined') {
      const referral = (content.referral ?? {}) as Record<string, unknown>;
      return {
        ...content,
        referral: finalizeReferralContent(referral, patient, issuedAt),
      };
    }
    return content;
  }

  /**
   * チャット経由の書類パッチ用。診療IDから患者欄の材料を読んで雛形を当てる。
   *
   * 画面での手直し（updateDocument）には当てない。先生が紙の文面を直したいときに
   * 書き戻してしまうため、雛形を強制するのは「AIが書いたものを保存する経路」だけにする。
   */
  async applyReferralTemplateFor(
    consultationId: string,
    frontendType: string,
    content: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    if (frontendType !== 'referral' && frontendType !== 'info-combined') return content;
    const patient = await this.loadReferralPatientContext(consultationId);
    return this.applyReferralTemplate(frontendType, content, patient);
  }

  private async loadReferralPatientContext(
    consultationId: string,
  ): Promise<ReferralPatientContext> {
    const consultation = await this.prisma.consultation.findUnique({
      where: { id: consultationId },
      include: {
        patient: true,
        anonymousCase: true,
        attachments: {
          where: { documentKind: 'questionnaire' },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });
    if (!consultation) throw new NotFoundException('Consultation not found');
    return mergeReferralPatient(
      consultation.patient,
      consultation.anonymousCase,
      consultation.attachments[0]?.structuredData,
    );
  }

  private getLlmUsage(): { inputTokens?: number; outputTokens?: number } {
    const provider = this.llmProvider as LlmProvider & {
      getLastUsage?: () => { inputTokens?: number; outputTokens?: number };
    };
    return provider.getLastUsage?.() ?? {};
  }

  async updateDocument(
    consultationId: string,
    physicianId: string,
    frontendType: string,
    content: Record<string, unknown>,
  ) {
    await this.consultationAccess.assertPhysicianOwns(consultationId, physicianId);
    const type = BACKEND_DOC_TYPE_MAP[frontendType];
    if (!type) {
      throw new BadRequestException(`Unknown document type: ${frontendType}`);
    }

    const latest = await this.prisma.generatedDocument.findFirst({
      where: { consultationId, type },
      orderBy: { version: 'desc' },
    });
    if (!latest) {
      throw new NotFoundException('Document not found');
    }

    const version = latest.version + 1;
    const doc = await this.prisma.generatedDocument.create({
      data: {
        consultationId,
        type,
        content: content as Prisma.InputJsonValue,
        version,
        isAiGenerated: false,
      },
    });

    await this.recordDocumentRevisions(
      consultationId,
      physicianId,
      type,
      latest.content as Record<string, unknown>,
      content,
    );

    return {
      id: doc.id,
      type: FRONTEND_DOC_TYPE_MAP[doc.type],
      content: doc.content,
      version: doc.version,
      isAiGenerated: doc.isAiGenerated,
      approved: doc.approved,
      updatedAt: doc.updatedAt,
    };
  }

  private async buildContext(
    consultationId: string,
    physicianId: string,
    referralPattern: 'simple' | 'complex' = 'simple',
  ): Promise<DocumentGenerationContext> {
    const consultation = await this.prisma.consultation.findUnique({
      where: { id: consultationId },
      include: {
        patient: true,
        anonymousCase: true,
        structuredData: true,
        soapDocuments: { orderBy: { version: 'desc' }, take: 1 },
        transcriptSegments: { orderBy: { sequenceNumber: 'asc' } },
        attachments: {
          where: { documentKind: 'questionnaire', ocrText: { not: null } },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });
    if (!consultation) throw new NotFoundException('Consultation not found');

    const soapDoc = consultation.soapDocuments[0];
    if (!soapDoc) {
      throw new BadRequestException('SOAP must be generated before documents');
    }

    const structured = (consultation.structuredData?.data ?? {}) as StructuredClinicalDataPayload;
    const caseCode =
      consultation.patient?.patientCode ?? consultation.anonymousCase?.caseCode ?? 'UNKNOWN';
    const patientName =
      consultation.patient?.name ?? consultation.anonymousCase?.displayName ?? '患者';
    const age =
      consultation.anonymousCase?.age ??
      (consultation.patient?.dateOfBirth
        ? Math.floor(
            (Date.now() - consultation.patient.dateOfBirth.getTime()) /
              (365.25 * 24 * 60 * 60 * 1000),
          )
        : null);

    const physicianRules = physicianId
      ? await this.settingsService.getPhysicianRules(physicianId)
      : await this.settingsService.getPhysicianRules(consultation.physicianId);

    const revisionExamples = await this.buildRevisionExamples(consultation.physicianId);

    const chatMessages = await this.prisma.consultationChatMessage.findMany({
      where: { consultationId, role: 'user' },
      orderBy: { createdAt: 'asc' },
      take: 50,
    });
    const physicianSubkarte = chatMessages.map((m) => `- ${m.content}`).join('\n');

    // 同じ患者の過去の診療。紹介状・主治医意見書は「経過」を書く書類なので、
    // 今回の1回分だけでは書けない。直近5回を材料に加える。
    const PAST_VISIT_LIMIT = 5;
    const patientScope = consultation.patientId
      ? { patientId: consultation.patientId }
      : consultation.anonymousCaseId
        ? { anonymousCaseId: consultation.anonymousCaseId }
        : null;
    const pastVisitRows = patientScope
      ? await this.prisma.consultation.findMany({
          where: {
            ...patientScope,
            clinicId: consultation.clinicId,
            id: { not: consultationId },
            soapDocuments: { some: {} },
          },
          orderBy: { createdAt: 'desc' },
          take: PAST_VISIT_LIMIT,
          include: { soapDocuments: { orderBy: { version: 'desc' }, take: 1 } },
        })
      : [];
    const pastVisits = pastVisitRows
      .map((row) => {
        const past = row.soapDocuments[0];
        if (!past) return null;
        // 4欄とも空の回（音声から作れなかった回）は経過の材料にならない
        const empty =
          !past.subjective.trim() &&
          !past.objective.trim() &&
          !past.assessment.trim() &&
          !past.plan.trim();
        if (empty) return null;
        return {
          dateJa: formatJapaneseDate(row.createdAt),
          visitType: row.visitType === 'CHECKUP' ? ('CHECKUP' as const) : ('ROUTINE' as const),
          soap: {
            subjective: past.subjective,
            objective: past.objective,
            assessment: past.assessment,
            plan: past.plan,
          },
        };
      })
      .filter((v): v is NonNullable<typeof v> => v !== null);

    const TRANSCRIPT_EXCERPT_LIMIT = 8000;
    const transcriptFull = consultation.transcriptSegments
      .map((seg) => seg.text.trim())
      .filter(Boolean)
      .join('\n');
    const transcriptExcerpt = transcriptFull
      ? transcriptFull.length > TRANSCRIPT_EXCERPT_LIMIT
        ? `${transcriptFull.slice(0, TRANSCRIPT_EXCERPT_LIMIT)}\n…（以降省略）`
        : transcriptFull
      : undefined;

    const questionnaireText = consultation.attachments[0]?.ocrText?.trim() || undefined;

    // 紹介状の患者欄。患者情報が正で、空いているところだけ問診票の読み取り結果で補う
    const referralPatient = mergeReferralPatient(
      consultation.patient,
      consultation.anonymousCase,
      consultation.attachments[0]?.structuredData,
    );

    return {
      consultationId,
      caseCode,
      patientName,
      sex:
        consultation.patient?.sex === 'F'
          ? '女'
          : consultation.patient?.sex === 'M'
            ? '男'
            : consultation.anonymousCase?.sex === 'F'
              ? '女'
              : consultation.anonymousCase?.sex === 'M'
                ? '男'
                : '—',
      age,
      // 患者属性は、患者情報 →（空いていれば）問診票の読み取り結果の順で埋める
      dateOfBirth: referralPatient.dateOfBirth,
      patientNameKana: referralPatient.patientNameKana,
      postalCode: referralPatient.postalCode,
      address: referralPatient.address,
      occupation: referralPatient.occupation,
      phone: referralPatient.phone,
      memo: consultation.patient?.memo ?? undefined,
      soap: {
        subjective: soapDoc.subjective,
        objective: soapDoc.objective,
        assessment: soapDoc.assessment,
        plan: soapDoc.plan,
      },
      structured,
      physicianRules,
      revisionExamples,
      referralPattern,
      physicianSubkarte,
      todayJa: formatJapaneseDate(new Date()),
      transcriptExcerpt,
      questionnaireText,
      pastVisits,
    };
  }

  private async buildRevisionExamples(physicianId: string): Promise<string> {
    const revisions = await this.prisma.revisionHistory.findMany({
      where: {
        changedById: physicianId,
        documentType: {
          in: [
            DocumentType.REFERRAL,
            DocumentType.MEDICAL_CERTIFICATE,
            DocumentType.CARE_OPINION_1,
            DocumentType.CARE_OPINION_2,
            DocumentType.PRESCRIPTION_LIST,
            DocumentType.INFO_PROVIDE_COMBINED,
          ],
        },
      },
      orderBy: { changedAt: 'desc' },
      take: 10,
    });

    if (!revisions.length) return '';

    return revisions
      .map((r) => `[${r.documentType}/${r.fieldName}] 「${r.beforeValue}」→「${r.afterValue}」`)
      .join('\n');
  }

  private async recordDocumentRevisions(
    consultationId: string,
    userId: string,
    docType: GeneratedDocumentType,
    before: Record<string, unknown>,
    after: Record<string, unknown>,
  ) {
    const documentType = docType as unknown as DocumentType;
    const flatBefore = flattenObject(before);
    const flatAfter = flattenObject(after);

    for (const [field, afterVal] of Object.entries(flatAfter)) {
      const beforeVal = flatBefore[field] ?? '';
      if (beforeVal !== afterVal) {
        await this.prisma.revisionHistory.create({
          data: {
            consultationId,
            documentType,
            fieldName: field,
            beforeValue: beforeVal,
            afterValue: afterVal,
            changedById: userId,
          },
        });
      }
    }
  }
}

/**
 * 紹介状の患者欄を、患者情報と問診票の読み取り結果から組み立てる。
 *
 * 患者情報（受付が直すこともある）が正。そこが空のときだけ問診票の値を使う。
 * 匿名症例には患者情報が無いので、そのときは問診票だけが頼りになる。
 */
function mergeReferralPatient(
  patient: {
    name: string;
    nameKana: string | null;
    sex: string | null;
    dateOfBirth: Date | null;
    postalCode: string | null;
    address: string | null;
    phone: string | null;
    occupation: string | null;
  } | null,
  anonymousCase: {
    displayName: string;
    sex: string | null;
    age: number | null;
  } | null,
  questionnaire: unknown,
): ReferralPatientContext {
  const q = (questionnaire && typeof questionnaire === 'object' ? questionnaire : {}) as Record<
    string,
    unknown
  >;
  const fromQuestionnaire = (key: string): string | undefined => {
    const value = q[key];
    return typeof value === 'string' && value.trim() ? value.trim() : undefined;
  };
  const pick = (own: string | null | undefined, key: string): string =>
    (own && own.trim()) || fromQuestionnaire(key) || '';

  const dateOfBirth =
    patient?.dateOfBirth?.toISOString() ??
    (fromQuestionnaire('dateOfBirth')
      ? `${fromQuestionnaire('dateOfBirth')}T00:00:00.000Z`
      : undefined);

  return {
    patientName: patient?.name ?? anonymousCase?.displayName ?? fromQuestionnaire('name') ?? '',
    patientNameKana: pick(patient?.nameKana, 'nameKana'),
    sex: toSexLabel(patient?.sex ?? anonymousCase?.sex ?? fromQuestionnaire('sex')),
    dateOfBirth,
    age: anonymousCase?.age ?? null,
    postalCode: pick(patient?.postalCode, 'postalCode'),
    address: pick(patient?.address, 'address'),
    phone: pick(patient?.phone, 'phone'),
    occupation: pick(patient?.occupation, 'occupation'),
  };
}

/** 紹介状の患者欄に入れる値を、書類生成コンテキストから取り出す */
function referralPatientContextFrom(ctx: DocumentGenerationContext): ReferralPatientContext {
  return {
    patientName: ctx.patientName,
    patientNameKana: ctx.patientNameKana ?? '',
    sex: ctx.sex === '男' || ctx.sex === '女' ? ctx.sex : '',
    dateOfBirth: ctx.dateOfBirth,
    age: ctx.age,
    postalCode: ctx.postalCode ?? '',
    address: ctx.address ?? '',
    phone: ctx.phone ?? '',
    occupation: ctx.occupation ?? '',
  };
}

function toSexLabel(raw: string | null | undefined): string {
  if (raw === 'F' || raw === '女') return '女';
  if (raw === 'M' || raw === '男') return '男';
  return '';
}

function formatJapaneseDate(date: Date): string {
  return new Intl.DateTimeFormat('ja-JP-u-ca-japanese', {
    era: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date);
}

function flattenObject(obj: Record<string, unknown>, prefix = ''): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      Object.assign(result, flattenObject(value as Record<string, unknown>, path));
    } else {
      result[path] = String(value ?? '');
    }
  }
  return result;
}
