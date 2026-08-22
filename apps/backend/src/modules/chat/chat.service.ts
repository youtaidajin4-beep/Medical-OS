import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { DocumentType, ConsultationStatus, GeneratedDocumentType, Prisma } from '@prisma/client';
import { z } from 'zod';
import { PrismaService } from '../../database/prisma.service';
import { ConsultationAccessService } from '../../common/services/consultation-access.service';
import { LLM_PROVIDER } from '../../providers/ai/llm.tokens';
import { LlmProvider } from '../../providers/ai/llm.provider';
import { STT_PROVIDER } from '../../providers/ai/stt.tokens';
import { SttProvider } from '../../providers/ai/stt.provider';
import { DocumentsService } from '../documents/documents.service';
import { FRONTEND_DOC_TYPE_MAP, BACKEND_DOC_TYPE_MAP } from '../documents/document-types';

const DOC_TYPES = [
  'referral',
  'prescription',
  'certificate',
  'care-opinion-1',
  'care-opinion-2',
  'info-combined',
] as const;

const SUBKARTE_SYSTEM = `あなたは日本の内科クリニック（くしま内科）向けの診療アシスタント「チャット」です。
医師と対話し、記録・質問回答・SOAP/書類の修正・書類作成まで会話で進めます。
入力は音声文字起こしのことがあり、多少崩れた文でも医師の意図を汲み取って処理してください。

対応モード:
1) 記録のみ … 疑い・方針・処方意図のメモ。パッチ不要
2) 質問回答 … 現在の SOAP / 診療記録 / 既存書類に基づき簡潔に答える。診断の創作はしない
3) 修正指示 … soapPatch / notePatch / documentPatches を返す
4) 書類作成依頼 … generateDocuments を返す（「作って」「生成して」「資料を」等）

意図の汲み取り（最重要）:
- 医師の指示は一字一句ではなく意図を理解して反映する。曖昧な指示でも文脈（SOAP・既存書類・会話履歴）から対象の書類・フィールドを特定する
- 例: 「経過をもう少し詳しく」→ 紹介状の clinicalCourse を SOAP・会話の事実で肉付けする
- 例: 「もっと丁寧に」「文面かたく」→ 該当書類の文体を書き直す（事実は変えない）
- 例: 「カロナール追加」→ 処方一覧に追加し、SOAP の Plan にも反映する
- 指示の対象が本当に判断できないときだけ reply で一度だけ確認する。安易に聞き返さない
- 同じ情報を持つ書類は整合させる（例: 紹介状の宛先・診断名を変えたら info-combined の紹介状部分も同時に documentPatches で更新する）

ルール:
- 医師の記載を最優先する（SOAP よりチャットの意図を尊重）
- 診断の創作はしない。医師が書いた疑い・処方意図はそのまま扱う
- 単なるメモ記録のときは soapPatch / notePatch / documentPatches / generateDocuments を付けない
- 修正指示（追記・変更・宛先変更・処方追加など）のときだけパッチを返す
- soapPatch の各フィールドは「置換後の全文」（追記なら既存文＋追記）
- documentPatches の content は当該書類の完全な JSON（部分ではなく全体）。既存の他フィールドを消さない
- 書類 type は: referral | prescription | certificate | care-opinion-1 | care-opinion-2 | info-combined
- generateDocuments は "all"（全書類）または type 配列。種類の指定がなければ "all"
- 書類の内容変更依頼で当該書類がまだ存在しない場合は generateDocuments でその書類を生成する
- 病院名が含まれる書類作成依頼では、必要なら documentPatches で紹介状の recipientHospital も更新してよい（生成後でも可）
- 出力する文章は誤字脱字なく、カルテ・書類にそのまま使える丁寧な日本語にする
- reply は医師向けの短い日本語。何を記録/反映/作成したか（または回答）を明示する
- 必ず有効な JSON のみを返す（説明文禁止）

出力スキーマ:
{
  "reply": "医師への短い返答",
  "soapPatch": { "subjective"?, "objective"?, "assessment"?, "plan"? },
  "notePatch": "通常診療記録の全文（任意）",
  "documentPatches": [{ "type": "referral", "content": { ... } }],
  "generateDocuments": "all" | ["referral", "prescription", ...]
}`;

const SubkarteLlmSchema = z.object({
  reply: z.string(),
  soapPatch: z
    .object({
      subjective: z.string().optional(),
      objective: z.string().optional(),
      assessment: z.string().optional(),
      plan: z.string().optional(),
    })
    .optional(),
  notePatch: z.string().optional(),
  documentPatches: z
    .array(
      z.object({
        type: z.string(),
        content: z.record(z.unknown()),
      }),
    )
    .optional(),
  generateDocuments: z.union([z.literal('all'), z.array(z.enum(DOC_TYPES))]).optional(),
});

export type SubkarteLlmResult = z.infer<typeof SubkarteLlmSchema>;

type DocReturn = {
  id: string;
  type: string;
  content: unknown;
  version: number;
  isAiGenerated: boolean;
  approved: boolean;
  updatedAt: Date;
};

@Injectable()
export class ChatService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly consultationAccess: ConsultationAccessService,
    private readonly documentsService: DocumentsService,
    @Inject(LLM_PROVIDER) private readonly llmProvider: LlmProvider,
    @Inject(STT_PROVIDER) private readonly sttProvider: SttProvider,
  ) {}

  async transcribeVoice(
    consultationId: string,
    physicianId: string,
    file: Express.Multer.File | undefined,
  ) {
    await this.consultationAccess.assertPhysicianOwns(consultationId, physicianId);
    if (!file?.buffer?.length) {
      throw new BadRequestException('音声データがありません');
    }
    try {
      const segments = await this.sttProvider.transcribeFinal(file.buffer, consultationId, {
        whisperPrompt:
          '内科クリニックの医師がAIアシスタントへ出す短い指示。薬剤名・病名・病院名・用法を正確に。アムロジピン、メトホルミン、ムコダイン、HbA1c、eGFR、紹介状、処方継続。例: アムロジピン継続。紹介状を市立病院向けに作って。',
      });
      const text = segments
        .map((s) => s.text.trim())
        .filter(Boolean)
        .join(' ')
        .trim();
      if (!text) {
        throw new BadRequestException('音声を認識できませんでした。もう一度お話しください。');
      }
      return { text };
    } catch (error) {
      const message = error instanceof Error ? error.message : '';
      if (/短すぎ/.test(message)) {
        throw new BadRequestException('音声が短すぎます。マイクに向かってもう一度お話しください。');
      }
      throw error;
    }
  }

  async list(consultationId: string, physicianId: string) {
    await this.consultationAccess.assertPhysicianOwns(consultationId, physicianId);
    return this.prisma.consultationChatMessage.findMany({
      where: { consultationId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async ask(consultationId: string, physicianId: string, content: string) {
    await this.consultationAccess.assertPhysicianOwns(consultationId, physicianId);
    const trimmed = content.trim();
    if (!trimmed) throw new BadRequestException('内容を入力してください');

    await this.prisma.consultationChatMessage.create({
      data: { consultationId, role: 'user', content: trimmed },
    });

    const history = await this.prisma.consultationChatMessage.findMany({
      where: { consultationId },
      orderBy: { createdAt: 'asc' },
      take: 40,
    });

    const context = await this.buildEditContext(consultationId);
    const messages = history.map((m) => ({
      role: m.role === 'assistant' ? ('assistant' as const) : ('user' as const),
      content: m.content,
    }));

    let parsed: SubkarteLlmResult;
    if (this.llmProvider.subkarteChat) {
      parsed = await this.llmProvider.subkarteChat(SUBKARTE_SYSTEM, messages, context);
    } else if (this.llmProvider.consultChat) {
      const reply = await this.llmProvider.consultChat(SUBKARTE_SYSTEM, messages);
      parsed = { reply };
    } else {
      parsed = this.mockSubkarte(trimmed, context);
    }

    const validated = SubkarteLlmSchema.safeParse(parsed);
    const result = validated.success ? validated.data : { reply: parsed.reply || '記録しました。' };

    // SOAP/記録を先に反映 → 書類生成（チャット本文を参照）→ 宛先などの書類パッチ
    const applied = await this.applyPatches(consultationId, physicianId, {
      ...result,
      documentPatches: undefined,
    }, context);
    const generatedResult = await this.runGenerateDocuments(
      consultationId,
      physicianId,
      result.generateDocuments,
    );
    const generated = generatedResult.documents;
    const patchedDocs = result.documentPatches?.length
      ? await this.applyPatches(
          consultationId,
          physicianId,
          { reply: result.reply, documentPatches: result.documentPatches },
          await this.buildEditContext(consultationId),
        )
      : { documents: undefined };

    const documents = [
      ...(applied.documents ?? []),
      ...generated,
      ...(patchedDocs.documents ?? []),
    ];
    let reply = result.reply;
    if (generated.length && !/作成|生成/.test(reply)) {
      reply = `${reply}\n書類を${generated.length}件作成しました。`;
    }
    if (generatedResult.error) {
      reply = `${reply}\n\n【書類生成に失敗】${generatedResult.error}\n再送するか、「書類を全部作る」から再試行してください。だめなら紙カルテで継続してください。`;
    }

    const assistant = await this.prisma.consultationChatMessage.create({
      data: { consultationId, role: 'assistant', content: reply },
    });

    return {
      message: assistant,
      soap: applied.soap,
      note: applied.note,
      documents: documents.length ? documents : undefined,
      documentGenerationError: generatedResult.error,
    };
  }

  private async runGenerateDocuments(
    consultationId: string,
    physicianId: string,
    generate?: SubkarteLlmResult['generateDocuments'],
  ): Promise<{ documents: DocReturn[]; error?: string }> {
    if (!generate) return { documents: [] };
    try {
      if (generate === 'all') {
        return {
          documents: await this.documentsService.generateAll(consultationId, physicianId),
        };
      }
      const out: DocReturn[] = [];
      for (const front of generate) {
        const backendType = BACKEND_DOC_TYPE_MAP[front] as GeneratedDocumentType | undefined;
        if (!backendType) continue;
        const doc = await this.documentsService.generateOne(consultationId, backendType);
        out.push(doc);
      }
      return { documents: out };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : '書類の生成に失敗しました';
      return { documents: [], error: message };
    }
  }

  private async buildEditContext(consultationId: string) {
    const consultation = await this.prisma.consultation.findUnique({
      where: { id: consultationId },
      include: {
        soapDocuments: { orderBy: { version: 'desc' }, take: 1 },
        clinicalNotes: { orderBy: { version: 'desc' }, take: 1 },
        patient: true,
        anonymousCase: true,
        structuredData: true,
      },
    });

    const soap = consultation?.soapDocuments[0]
      ? {
          subjective: consultation.soapDocuments[0].subjective,
          objective: consultation.soapDocuments[0].objective,
          assessment: consultation.soapDocuments[0].assessment,
          plan: consultation.soapDocuments[0].plan,
        }
      : { subjective: '', objective: '', assessment: '', plan: '' };

    const note = consultation?.clinicalNotes[0]?.content ?? '';

    const docs = await this.prisma.generatedDocument.findMany({
      where: { consultationId },
      orderBy: [{ type: 'asc' }, { version: 'desc' }],
    });
    const latestByType = new Map<string, Record<string, unknown>>();
    for (const doc of docs) {
      const front = FRONTEND_DOC_TYPE_MAP[doc.type];
      if (front && !latestByType.has(front)) {
        latestByType.set(front, doc.content as Record<string, unknown>);
      }
    }

    const patientName =
      consultation?.patient?.name ?? consultation?.anonymousCase?.displayName ?? '';
    const sexRaw = consultation?.patient?.sex ?? consultation?.anonymousCase?.sex;
    const sex = sexRaw === 'F' ? '女' : sexRaw === 'M' ? '男' : '';
    const age =
      consultation?.anonymousCase?.age ??
      (consultation?.patient?.dateOfBirth
        ? Math.floor(
            (Date.now() - consultation.patient.dateOfBirth.getTime()) /
              (365.25 * 24 * 60 * 60 * 1000),
          )
        : null);
    const patientSummary = patientName
      ? `${patientName}（${sex || '—'}、${age ?? '—'}歳）`
      : '';

    return {
      soap,
      note,
      documents: Object.fromEntries(latestByType),
      patientSummary,
      structured: consultation?.structuredData?.data ?? undefined,
    };
  }

  private mockSubkarte(
    content: string,
    context: {
      soap: { subjective: string; objective: string; assessment: string; plan: string };
      note: string;
      documents: Record<string, Record<string, unknown>>;
    },
  ): SubkarteLlmResult {
    const wantsGenerate = /作って|作成して|生成|資料|書類を全部|全部作/.test(content);
    if (wantsGenerate) {
      const types: Array<(typeof DOC_TYPES)[number]> = [];
      if (/紹介状/.test(content)) types.push('referral');
      if (/処方/.test(content)) types.push('prescription');
      if (/診断書/.test(content)) types.push('certificate');
      if (/意見書|ケア|介護/.test(content)) {
        types.push('care-opinion-1', 'care-opinion-2');
      }
      if (/情報提供/.test(content)) types.push('info-combined');

      const generateDocuments = types.length ? types : ('all' as const);
      const hospitalMatch = [...content.matchAll(/([^\s「」をにへ]+(?:病院|クリニック|医院))/g)];
      const recipientHospital = hospitalMatch.at(-1)?.[1];
      const documentPatches =
        recipientHospital && (generateDocuments === 'all' || types.includes('referral'))
          ? [
              {
                type: 'referral',
                content: {
                  ...(context.documents.referral ?? {}),
                  recipientHospital,
                },
              },
            ]
          : undefined;

      const label =
        generateDocuments === 'all'
          ? '必要な書類一式'
          : types.map((t) => t).join('・');
      return {
        reply: recipientHospital
          ? `${recipientHospital}向けに${label}を作成します。`
          : `${label}を作成します。`,
        documentPatches,
        generateDocuments,
        soapPatch: /継続|処方|方針/.test(content)
          ? { plan: `${context.soap.plan}\n${content}`.trim() }
          : undefined,
      };
    }

    const editLike = /修正|変更|追記|直して|にして|Assessment|assessment|Plan|plan|紹介状|宛先|処方/.test(
      content,
    );
    if (!editLike) {
      if (/[？?]|何|どう|足り|不足|確認/.test(content)) {
        return {
          reply:
            '現在の SOAP を確認しました。不足があれば指示をください。例: 「紹介状の宛先を〇〇病院に」「処方一覧を作って」。',
        };
      }
      return {
        reply: '記録しました。書類を作るときや修正指示のときに反映します。',
      };
    }

    if (/Assessment|assessment|評価/.test(content)) {
      const addition = content.replace(/^.*?[：:]\s*/, '').trim() || content;
      return {
        reply: 'Assessment を更新しました。',
        soapPatch: {
          assessment: `${context.soap.assessment}\n${addition}`.trim(),
        },
      };
    }

    if (/Plan|plan|計画|方針/.test(content)) {
      return {
        reply: 'Plan を更新しました。',
        soapPatch: {
          plan: `${context.soap.plan}\n${content}`.trim(),
        },
      };
    }

    if (/紹介状|宛先/.test(content)) {
      const matches = [...content.matchAll(/([^\s「」をにへ]+(?:病院|クリニック|医院))/g)];
      const recipientHospital = matches.at(-1)?.[1] ?? '要確認（紹介先）';
      const existing = (context.documents.referral ?? {}) as Record<string, unknown>;
      return {
        reply: `紹介状の宛先を「${recipientHospital}」に更新しました。`,
        documentPatches: [
          {
            type: 'referral',
            content: { ...existing, recipientHospital },
          },
        ],
      };
    }

    if (/処方/.test(content)) {
      const existing = (context.documents.prescription ?? { items: [] }) as {
        items?: Array<Record<string, unknown>>;
      };
      const items = [...(existing.items ?? [])];
      items.push({
        index: items.length + 1,
        name: content.slice(0, 40),
        dosePerTake: '',
        dailyDose: '',
        days: '',
        frequency: '',
        note: 'チャットより',
        prescribedDate: '',
      });
      return {
        reply: '処方一覧に追記しました。',
        documentPatches: [{ type: 'prescription', content: { items } }],
        soapPatch: {
          plan: `${context.soap.plan}\n${content}`.trim(),
        },
      };
    }

    return {
      reply: '記録し、Plan に反映しました。',
      soapPatch: {
        plan: `${context.soap.plan}\n${content}`.trim(),
      },
    };
  }

  private async applyPatches(
    consultationId: string,
    physicianId: string,
    result: SubkarteLlmResult,
    context: {
      soap: { subjective: string; objective: string; assessment: string; plan: string };
      note: string;
    },
  ) {
    let soap = context.soap;
    let note: string | undefined;
    const documents: DocReturn[] = [];

    if (result.soapPatch) {
      const next = {
        subjective: result.soapPatch.subjective ?? context.soap.subjective,
        objective: result.soapPatch.objective ?? context.soap.objective,
        assessment: result.soapPatch.assessment ?? context.soap.assessment,
        plan: result.soapPatch.plan ?? context.soap.plan,
      };
      const latest = await this.prisma.soapDocument.findFirst({
        where: { consultationId },
        orderBy: { version: 'desc' },
      });
      const version = (latest?.version ?? 0) + 1;
      const created = await this.prisma.soapDocument.create({
        data: {
          consultationId,
          ...next,
          version,
          isAiGenerated: false,
          approved: latest?.approved ?? false,
        },
      });
      await this.prisma.consultation.update({
        where: { id: consultationId },
        data: { status: ConsultationStatus.REVIEW },
      });
      if (latest) {
        for (const field of ['subjective', 'objective', 'assessment', 'plan'] as const) {
          if (latest[field] !== next[field]) {
            await this.prisma.revisionHistory.create({
              data: {
                consultationId,
                documentType: DocumentType.SOAP,
                fieldName: field,
                beforeValue: latest[field],
                afterValue: next[field],
                changedById: physicianId,
              },
            });
          }
        }
      }
      soap = {
        subjective: created.subjective,
        objective: created.objective,
        assessment: created.assessment,
        plan: created.plan,
      };
    }

    if (result.notePatch != null) {
      const latest = await this.prisma.clinicalNote.findFirst({
        where: { consultationId },
        orderBy: { version: 'desc' },
      });
      const version = (latest?.version ?? 0) + 1;
      await this.prisma.clinicalNote.create({
        data: {
          consultationId,
          content: result.notePatch,
          version,
          isAiGenerated: false,
          approved: latest?.approved ?? false,
        },
      });
      note = result.notePatch;
    }

    if (result.documentPatches?.length) {
      for (const patch of result.documentPatches) {
        if (!BACKEND_DOC_TYPE_MAP[patch.type]) continue;
        try {
          const updated = await this.documentsService.updateDocument(
            consultationId,
            physicianId,
            patch.type,
            patch.content as Record<string, unknown>,
          );
          documents.push(updated);
        } catch {
          const type = BACKEND_DOC_TYPE_MAP[patch.type];
          if (!type) continue;
          const doc = await this.prisma.generatedDocument.create({
            data: {
              consultationId,
              type,
              content: patch.content as Prisma.InputJsonValue,
              version: 1,
              isAiGenerated: false,
            },
          });
          documents.push({
            id: doc.id,
            type: FRONTEND_DOC_TYPE_MAP[doc.type],
            content: doc.content,
            version: doc.version,
            isAiGenerated: doc.isAiGenerated,
            approved: doc.approved,
            updatedAt: doc.updatedAt,
          });
        }
      }
    }

    return {
      soap: result.soapPatch ? soap : undefined,
      note,
      documents: documents.length ? documents : undefined,
    };
  }
}
