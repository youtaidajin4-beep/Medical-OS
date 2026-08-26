import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { ConsultationStatus, DocumentType, VisitType } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { AiPipelineService } from '../ai/ai-pipeline.service';
import { ConsultationAccessService } from '../../common/services/consultation-access.service';
import { RecordingService } from '../recording/recording.service';
import { mockScenarioContext } from '../../providers/ai/mock-scenario-context';
import { resolveMockScenario } from '../../providers/ai/mock-scenarios';
import {
  isPipelineStale,
  PIPELINE_STALE_MESSAGE,
} from '../ai/pipeline-progress';
import { logAiExecution } from '../ai/ai-execution.helper';

@Injectable()
export class ConsultationsService {
  private readonly logger = new Logger(ConsultationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly aiPipeline: AiPipelineService,
    private readonly consultationAccess: ConsultationAccessService,
    private readonly recordingService: RecordingService,
  ) {}

  async create(
    physicianId: string,
    clinicId: string,
    data: { patientId?: string; anonymousCaseId?: string; visitType?: VisitType },
  ) {
    if (!data.patientId && !data.anonymousCaseId) {
      throw new BadRequestException('Patient or anonymous case required');
    }
    const consultation = await this.prisma.consultation.create({
      data: {
        clinicId,
        physicianId,
        patientId: data.patientId,
        anonymousCaseId: data.anonymousCaseId,
        visitType: data.visitType === VisitType.CHECKUP ? VisitType.CHECKUP : VisitType.ROUTINE,
        status: ConsultationStatus.DRAFT,
      },
      include: { patient: true, anonymousCase: true },
    });
    await this.auditService.log({
      userId: physicianId,
      action: 'CONSULTATION_CREATE',
      resource: 'consultation',
      resourceId: consultation.id,
    });
    const scenario = resolveMockScenario(
      consultation.patient?.patientCode,
      consultation.anonymousCase?.caseCode,
    );
    mockScenarioContext.set(consultation.id, scenario);
    return consultation;
  }

  async list(physicianId: string) {
    const rows = await this.prisma.consultation.findMany({
      where: { physicianId },
      orderBy: { createdAt: 'desc' },
      include: {
        patient: true,
        anonymousCase: true,
        soapDocuments: { orderBy: { version: 'desc' }, take: 1 },
        clinicalNotes: { orderBy: { version: 'desc' }, take: 1 },
        generatedDocuments: { select: { id: true }, take: 1 },
      },
    });

    const patientIds = [
      ...new Set(rows.map((r) => r.patientId).filter((id): id is string => Boolean(id))),
    ];
    const anonIds = [
      ...new Set(rows.map((r) => r.anonymousCaseId).filter((id): id is string => Boolean(id))),
    ];

    const [patientAll, anonAll] = await Promise.all([
      patientIds.length
        ? this.prisma.consultation.findMany({
            where: { patientId: { in: patientIds } },
            select: { id: true, patientId: true, anonymousCaseId: true, createdAt: true },
            orderBy: { createdAt: 'asc' },
          })
        : Promise.resolve(
            [] as Array<{
              id: string;
              patientId: string | null;
              anonymousCaseId: string | null;
              createdAt: Date;
            }>,
          ),
      anonIds.length
        ? this.prisma.consultation.findMany({
            where: { anonymousCaseId: { in: anonIds } },
            select: { id: true, patientId: true, anonymousCaseId: true, createdAt: true },
            orderBy: { createdAt: 'asc' },
          })
        : Promise.resolve(
            [] as Array<{
              id: string;
              patientId: string | null;
              anonymousCaseId: string | null;
              createdAt: Date;
            }>,
          ),
    ]);

    const visitIndex = new Map<string, number>();
    for (const group of [patientAll, anonAll]) {
      const buckets = new Map<string, typeof group>();
      for (const row of group) {
        const key = row.patientId ?? row.anonymousCaseId;
        if (!key) continue;
        const list = buckets.get(key) ?? [];
        list.push(row);
        buckets.set(key, list);
      }
      for (const list of buckets.values()) {
        list.forEach((row, i) => visitIndex.set(row.id, i + 1));
      }
    }

    return rows.map((row) => {
      const done =
        row.status === ConsultationStatus.APPROVED ||
        row.status === ConsultationStatus.COMPLETED ||
        Boolean(row.copiedAt) ||
        Boolean(row.approvedAt);
      return {
        ...row,
        kind: row.patientId ? ('repeater' as const) : ('new' as const),
        visitNumber: visitIndex.get(row.id) ?? 1,
        lane: done ? ('done' as const) : ('waiting' as const),
        hasDocuments: row.generatedDocuments.length > 0,
      };
    });
  }

  async getById(id: string, physicianId: string) {
    let consultation = await this.prisma.consultation.findFirst({
      where: { id, physicianId },
      include: {
        patient: true,
        anonymousCase: true,
        transcriptSegments: {
          where: { isFinal: true },
          orderBy: { sequenceNumber: 'asc' },
        },
        structuredData: true,
        warnings: true,
        soapDocuments: { orderBy: { version: 'desc' } },
        clinicalNotes: { orderBy: { version: 'desc' } },
        generatedDocuments: { orderBy: [{ type: 'asc' }, { version: 'desc' }] },
        revisions: { orderBy: { changedAt: 'desc' } },
      },
    });
    if (!consultation) throw new NotFoundException('Consultation not found');

    const [failedExecution, latestExecution, pipelineStart] = await Promise.all([
      this.prisma.aIExecution.findFirst({
        where: { consultationId: id, step: 'pipeline_failed' },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.aIExecution.findFirst({
        where: { consultationId: id },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.aIExecution.findFirst({
        where: { consultationId: id, step: 'pipeline_start' },
        orderBy: { createdAt: 'asc' },
      }),
    ]);

    const pipelineStep = latestExecution?.step ?? null;
    const pipelineStartedAt = pipelineStart?.createdAt ?? consultation.endedAt ?? null;
    const pipelineUpdatedAt = latestExecution?.createdAt ?? null;

    // Orphan success: SOAP+note written but status never flipped to REVIEW.
    if (
      consultation.status === ConsultationStatus.PROCESSING &&
      consultation.soapDocuments.length > 0 &&
      consultation.clinicalNotes.length > 0 &&
      !failedExecution
    ) {
      await this.prisma.consultation.update({
        where: { id },
        data: { status: ConsultationStatus.REVIEW },
      });
      consultation = { ...consultation, status: ConsultationStatus.REVIEW };
    }

    let pipelineError =
      failedExecution?.errorMessage && consultation.status === ConsultationStatus.PROCESSING
        ? failedExecution.errorMessage
        : undefined;

    if (
      !pipelineError &&
      consultation.status === ConsultationStatus.PROCESSING &&
      isPipelineStale({
        nowMs: Date.now(),
        pipelineStartedAt,
        pipelineUpdatedAt,
      })
    ) {
      pipelineError = PIPELINE_STALE_MESSAGE;
      if (!failedExecution) {
        await logAiExecution(this.prisma, {
          consultationId: id,
          step: 'pipeline_failed',
          provider: 'pipeline-watchdog',
          status: 'failed',
          errorMessage: PIPELINE_STALE_MESSAGE,
        });
      }
    }

    const hasAudio =
      Boolean(pipelineError) || consultation.status === ConsultationStatus.PROCESSING
        ? await this.recordingService.hasAudio(id)
        : false;

    return {
      ...consultation,
      pipelineError,
      hasAudio,
      pipelineStep,
      pipelineStartedAt: pipelineStartedAt?.toISOString?.() ?? pipelineStartedAt,
      pipelineUpdatedAt: pipelineUpdatedAt?.toISOString?.() ?? pipelineUpdatedAt,
    };
  }

  async startRecording(id: string, physicianId: string) {
    await this.consultationAccess.assertPhysicianOwns(id, physicianId);
    return this.prisma.consultation.update({
      where: { id },
      data: {
        status: ConsultationStatus.RECORDING,
        startedAt: new Date(),
      },
    });
  }

  async stopRecording(id: string, physicianId: string) {
    await this.consultationAccess.assertPhysicianOwns(id, physicianId);
    const consultation = await this.prisma.consultation.update({
      where: { id },
      data: {
        status: ConsultationStatus.PROCESSING,
        endedAt: new Date(),
      },
    });
    void this.aiPipeline.processConsultation(id).catch((error) => {
      this.logger.error(`Async pipeline failed for consultation ${id}`, error);
    });
    return consultation;
  }

  async reprocess(id: string, physicianId: string) {
    await this.consultationAccess.assertPhysicianOwns(id, physicianId);
    const consultation = await this.prisma.consultation.findFirst({
      where: { id, physicianId },
      include: {
        soapDocuments: { take: 1 },
        clinicalNotes: { take: 1 },
      },
    });
    if (!consultation) throw new NotFoundException('Consultation not found');

    const hasDraftArtifacts =
      consultation.soapDocuments.length > 0 || consultation.clinicalNotes.length > 0;
    const canClearFailedDraft =
      consultation.status === ConsultationStatus.PROCESSING && hasDraftArtifacts;

    if (hasDraftArtifacts && !canClearFailedDraft) {
      throw new BadRequestException(
        'すでにSOAPがあります。録り直す場合は新規診療を開始してください。',
      );
    }

    const hasAudio = await this.recordingService.hasAudio(id);
    if (!hasAudio) {
      throw new BadRequestException(
        '再処理できる録音がありません。「録り直す」から再度録音してください。',
      );
    }

    if (canClearFailedDraft) {
      await this.prisma.$transaction([
        this.prisma.soapDocument.deleteMany({ where: { consultationId: id } }),
        this.prisma.clinicalNote.deleteMany({ where: { consultationId: id } }),
        this.prisma.aIExecution.deleteMany({
          where: { consultationId: id, step: 'pipeline_failed' },
        }),
      ]);
    }

    const updated = await this.prisma.consultation.update({
      where: { id },
      data: {
        status: ConsultationStatus.PROCESSING,
        endedAt: consultation.endedAt ?? new Date(),
      },
    });
    void this.aiPipeline.processConsultation(id).catch((error) => {
      this.logger.error(`Reprocess pipeline failed for consultation ${id}`, error);
    });
    return { ...updated, hasAudio: true };
  }

  async resetForRerecord(id: string, physicianId: string) {
    await this.consultationAccess.assertPhysicianOwns(id, physicianId);
    await this.recordingService.resetAudioForRerecord(id);
    return this.prisma.consultation.update({
      where: { id },
      data: {
        status: ConsultationStatus.RECORDING,
        startedAt: new Date(),
        endedAt: null,
      },
    });
  }

  async updateSoap(
    id: string,
    physicianId: string,
    data: { subjective: string; objective: string; assessment: string; plan: string },
  ) {
    const latest = await this.prisma.soapDocument.findFirst({
      where: { consultationId: id },
      orderBy: { version: 'desc' },
    });
    const version = (latest?.version ?? 0) + 1;
    const soap = await this.prisma.soapDocument.create({
      data: {
        consultationId: id,
        ...data,
        version,
        isAiGenerated: false,
        approved: false,
      },
    });
    await this.recordRevision(id, physicianId, DocumentType.SOAP, latest, data);
    await this.prisma.consultation.update({
      where: { id },
      data: { status: ConsultationStatus.REVIEW },
    });
    return soap;
  }

  async updateClinicalNote(id: string, physicianId: string, content: string) {
    const latest = await this.prisma.clinicalNote.findFirst({
      where: { consultationId: id },
      orderBy: { version: 'desc' },
    });
    const version = (latest?.version ?? 0) + 1;
    const note = await this.prisma.clinicalNote.create({
      data: {
        consultationId: id,
        content,
        version,
        isAiGenerated: false,
        approved: false,
      },
    });
    await this.recordRevision(id, physicianId, DocumentType.CLINICAL_NOTE, latest, {
      content,
    });
    return note;
  }

  async approve(id: string, physicianId: string) {
    const consultation = await this.prisma.consultation.update({
      where: { id },
      data: {
        status: ConsultationStatus.APPROVED,
        approvedAt: new Date(),
        approvedById: physicianId,
      },
    });
    const latestSoap = await this.prisma.soapDocument.findFirst({
      where: { consultationId: id },
      orderBy: { version: 'desc' },
    });
    const latestNote = await this.prisma.clinicalNote.findFirst({
      where: { consultationId: id },
      orderBy: { version: 'desc' },
    });
    if (latestSoap) {
      await this.prisma.soapDocument.update({
        where: { id: latestSoap.id },
        data: { approved: true },
      });
    }
    if (latestNote) {
      await this.prisma.clinicalNote.update({
        where: { id: latestNote.id },
        data: { approved: true },
      });
    }
    await this.auditService.log({
      userId: physicianId,
      action: 'CONSULTATION_APPROVE',
      resource: 'consultation',
      resourceId: id,
    });
    return consultation;
  }

  async markCopied(id: string, physicianId: string) {
    if (!(await this.isApproved(id))) {
      throw new BadRequestException('Consultation must be approved before copy');
    }
    return this.prisma.consultation.update({
      where: { id },
      data: { copiedAt: new Date(), status: ConsultationStatus.COMPLETED },
    });
  }

  async isApproved(id: string) {
    const c = await this.prisma.consultation.findUnique({ where: { id } });
    return c?.status === ConsultationStatus.APPROVED || c?.status === ConsultationStatus.COMPLETED;
  }

  private async recordRevision(
    consultationId: string,
    userId: string,
    documentType: DocumentType,
    before: Record<string, unknown> | null,
    after: Record<string, unknown>,
  ) {
    for (const [field, value] of Object.entries(after)) {
      const beforeVal = before ? String(before[field] ?? '') : '';
      const afterVal = String(value ?? '');
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
