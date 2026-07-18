import { Inject, Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { DocumentType, GeneratedDocumentType, Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { ConsultationAccessService } from '../../common/services/consultation-access.service';
import { LLM_PROVIDER } from '../../providers/ai/llm.tokens';
import { LlmProvider, StructuredClinicalDataPayload } from '../../providers/ai/llm.provider';
import { SettingsService } from '../settings/settings.service';
import { buildDocumentPrompt } from './document-prompts';
import { logAiExecution } from '../ai/ai-execution.helper';
import {
  BACKEND_DOC_TYPE_MAP,
  DocumentGenerationContext,
  FRONTEND_DOC_TYPE_MAP,
  GENERATED_DOCUMENT_TYPES,
} from './document-types';

@Injectable()
export class DocumentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly consultationAccess: ConsultationAccessService,
    private readonly settingsService: SettingsService,
    @Inject(LLM_PROVIDER) private readonly llmProvider: LlmProvider,
  ) {}

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

  async generateAll(consultationId: string, physicianId: string) {
    await this.consultationAccess.assertPhysicianOwns(consultationId, physicianId);
    const ctx = await this.buildContext(consultationId, physicianId);
    const start = Date.now();
    const results = await Promise.all(
      GENERATED_DOCUMENT_TYPES.map((type) => this.generateOne(consultationId, type, ctx)),
    );
    await logAiExecution(this.prisma, {
      consultationId,
      step: 'documents_complete',
      provider: this.llmProvider.name,
      status: 'completed',
      durationMs: Date.now() - start,
      promptVersion: this.llmProvider.name === 'openai' ? 'openai-docs-v1' : 'mock-v1',
      ...this.getLlmUsage(),
    });
    return results;
  }

  async generateOne(
    consultationId: string,
    type: GeneratedDocumentType,
    ctx?: DocumentGenerationContext,
  ) {
    const context = ctx ?? (await this.buildContext(consultationId, ''));
    const { system, user } = buildDocumentPrompt(type, context);
    const content = await this.llmProvider.generateDocument(type, system, user);

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
  ): Promise<DocumentGenerationContext> {
    const consultation = await this.prisma.consultation.findUnique({
      where: { id: consultationId },
      include: {
        patient: true,
        anonymousCase: true,
        structuredData: true,
        soapDocuments: { orderBy: { version: 'desc' }, take: 1 },
      },
    });
    if (!consultation) throw new NotFoundException('Consultation not found');

    const soapDoc = consultation.soapDocuments[0];
    if (!soapDoc) {
      throw new BadRequestException('SOAP must be generated before documents');
    }

    const structured = (consultation.structuredData?.data ??
      {}) as StructuredClinicalDataPayload;
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
      dateOfBirth: consultation.patient?.dateOfBirth?.toISOString(),
      phone: consultation.patient?.phone ?? undefined,
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
      .map(
        (r) =>
          `[${r.documentType}/${r.fieldName}] 「${r.beforeValue}」→「${r.afterValue}」`,
      )
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
