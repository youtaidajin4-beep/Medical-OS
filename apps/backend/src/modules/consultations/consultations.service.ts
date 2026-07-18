import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { ConsultationStatus, DocumentType } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { AiPipelineService } from '../ai/ai-pipeline.service';
import { ConsultationAccessService } from '../../common/services/consultation-access.service';
import { mockScenarioContext } from '../../providers/ai/mock-scenario-context';
import { resolveMockScenario } from '../../providers/ai/mock-scenarios';

@Injectable()
export class ConsultationsService {
  private readonly logger = new Logger(ConsultationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly aiPipeline: AiPipelineService,
    private readonly consultationAccess: ConsultationAccessService,
  ) {}

  async create(
    physicianId: string,
    clinicId: string,
    data: { patientId?: string; anonymousCaseId?: string },
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
    return this.prisma.consultation.findMany({
      where: { physicianId },
      orderBy: { createdAt: 'desc' },
      include: {
        patient: true,
        anonymousCase: true,
        soapDocuments: { orderBy: { version: 'desc' }, take: 1 },
        clinicalNotes: { orderBy: { version: 'desc' }, take: 1 },
      },
    });
  }

  async getById(id: string, physicianId: string) {
    const consultation = await this.prisma.consultation.findFirst({
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

    const failedExecution = await this.prisma.aIExecution.findFirst({
      where: { consultationId: id, step: 'pipeline_failed' },
      orderBy: { createdAt: 'desc' },
    });

    const pipelineError =
      failedExecution?.errorMessage &&
      consultation.soapDocuments.length === 0 &&
      consultation.status === ConsultationStatus.PROCESSING
        ? failedExecution.errorMessage
        : undefined;

    return { ...consultation, pipelineError };
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
