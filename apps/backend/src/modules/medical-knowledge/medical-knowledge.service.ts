import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import {
  MedicalKnowledgeSource,
  MedicalRiskLevel,
  MedicalTermAliasType,
  MedicalTermCategory,
} from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { INTERNAL_MEDICINE_SEED_TERMS } from './data/internal-medicine-seed';
import { KnowledgeIndex } from './knowledge-index';
import { correctTranscriptWithKnowledge, PatientContext } from './transcript-knowledge-corrector';
import { KnowledgeCorrectionResult } from './knowledge-types';

@Injectable()
export class MedicalKnowledgeService implements OnModuleInit {
  private readonly logger = new Logger(MedicalKnowledgeService.name);
  private index = KnowledgeIndex.fromSeed();

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    try {
      await this.refreshIndexFromDb();
    } catch (e) {
      this.logger.warn(`Knowledge index DB refresh skipped: ${(e as Error).message}`);
    }
  }

  getIndex(): KnowledgeIndex {
    return this.index;
  }

  correct(
    rawText: string,
    patientContext?: PatientContext,
  ): KnowledgeCorrectionResult {
    return correctTranscriptWithKnowledge(rawText, this.index, patientContext);
  }

  async refreshIndexFromDb() {
    const idx = KnowledgeIndex.fromSeed();
    const clinicTerms = await this.prisma.clinicDictionaryTerm.findMany({
      where: { isActive: true },
      take: 5000,
    });
    for (const t of clinicTerms) {
      const aliases = Array.isArray(t.aliases) ? (t.aliases as string[]) : [];
      for (const a of aliases) {
        idx.addClinicAlias(String(a), t.canonicalName, t.category as never);
      }
    }
    const doctorTerms = await this.prisma.doctorDictionaryTerm.findMany({ take: 5000 });
    for (const t of doctorTerms) {
      idx.addPhysicianSpoken(t.spokenForm, t.preferredWrittenForm);
    }
    this.index = idx;
  }

  async ensureSeedTerms() {
    const count = await this.prisma.medicalTerm.count();
    if (count > 0) {
      this.logger.log(`medical_terms already seeded (${count})`);
      return { inserted: 0, skipped: count };
    }
    let inserted = 0;
    for (const t of INTERNAL_MEDICINE_SEED_TERMS) {
      const created = await this.prisma.medicalTerm.create({
        data: {
          canonicalName: t.canonicalName,
          reading: t.reading,
          category: t.category as MedicalTermCategory,
          subcategory: t.subcategory,
          englishName: t.englishName,
          abbreviation: t.abbreviation,
          priority: t.priority ?? 100,
          riskLevel: (t.riskLevel ?? 'medium') as MedicalRiskLevel,
          source: MedicalKnowledgeSource.internal_medicine_seed,
          sourceCode: null,
          aliases: {
            create: (t.aliases ?? []).map((a) => ({
              alias: a.alias,
              aliasReading: a.aliasReading,
              aliasType: a.aliasType as MedicalTermAliasType,
            })),
          },
        },
      });
      void created;
      inserted += 1;
    }
    await this.refreshIndexFromDb();
    return { inserted, skipped: 0 };
  }

  async persistCorrectionResult(params: {
    clinicId: string;
    physicianId: string;
    consultationId: string;
    result: KnowledgeCorrectionResult;
  }) {
    const { clinicId, physicianId, consultationId, result } = params;

    await this.prisma.clinicalEntity.deleteMany({ where: { consultationId } });
    await this.prisma.transcriptCorrection.deleteMany({
      where: { consultationId, approvedByDoctor: false },
    });

    for (const e of result.entities) {
      await this.prisma.clinicalEntity.create({
        data: {
          consultationId,
          entityType: e.entityType as MedicalTermCategory,
          rawValue: e.rawValue,
          normalizedValue: e.normalizedValue,
          confidence: e.confidence,
          startPosition: e.startPosition,
          endPosition: e.endPosition,
          needsReview: e.needsReview,
          riskLevel: e.riskLevel as MedicalRiskLevel,
          candidates: {
            create: e.candidates.map((c) => ({
              candidateValue: c.candidateValue,
              score: c.score,
              candidateSource: c.candidateSource,
            })),
          },
        },
      });
    }

    if (result.corrections.length) {
      await this.prisma.transcriptCorrection.createMany({
        data: result.corrections.map((c) => ({
          clinicId,
          physicianId,
          consultationId,
          rawText: result.rawText,
          correctedText: result.correctedText,
          originalTerm: c.originalTerm,
          correctedTerm: c.correctedTerm,
          category: c.category as MedicalTermCategory | null,
          confidence: c.confidence,
          correctionSource: c.correctionSource,
          approvedByDoctor: false,
        })),
      });
    }

    await this.prisma.knowledgeQualityMetric.upsert({
      where: { consultationId },
      create: {
        consultationId,
        automaticCorrectionCount: result.automaticCorrectionCount,
        reviewRequiredCount: result.reviewRequiredCount,
      },
      update: {
        automaticCorrectionCount: result.automaticCorrectionCount,
        reviewRequiredCount: result.reviewRequiredCount,
      },
    });
  }

  async listTerms(params: {
    q?: string;
    category?: string;
    take?: number;
  }) {
    const take = Math.min(params.take ?? 100, 500);
    return this.prisma.medicalTerm.findMany({
      where: {
        isActive: true,
        ...(params.category ? { category: params.category as MedicalTermCategory } : {}),
        ...(params.q
          ? {
              OR: [
                { canonicalName: { contains: params.q } },
                { reading: { contains: params.q } },
                { abbreviation: { contains: params.q } },
                { aliases: { some: { alias: { contains: params.q } } } },
              ],
            }
          : {}),
      },
      include: { aliases: true },
      orderBy: [{ priority: 'desc' }, { canonicalName: 'asc' }],
      take,
    });
  }

  async listClinicTerms(clinicId: string) {
    return this.prisma.clinicDictionaryTerm.findMany({
      where: { clinicId, isActive: true },
      orderBy: [{ frequency: 'desc' }, { priority: 'desc' }],
      take: 200,
    });
  }

  async listDoctorTerms(physicianId: string) {
    return this.prisma.doctorDictionaryTerm.findMany({
      where: { physicianId },
      orderBy: [{ frequency: 'desc' }, { priority: 'desc' }],
      take: 200,
    });
  }

  async listMisrecognitionRanking(clinicId: string) {
    const rows = await this.prisma.transcriptCorrection.groupBy({
      by: ['originalTerm', 'correctedTerm'],
      where: { clinicId, originalTerm: { not: null }, correctedTerm: { not: null } },
      _count: { _all: true },
      orderBy: { _count: { originalTerm: 'desc' } },
      take: 50,
    });
    return rows.map((r) => ({
      originalTerm: r.originalTerm,
      correctedTerm: r.correctedTerm,
      count: r._count._all,
    }));
  }

  async listLearningCandidates(clinicId: string) {
    return this.prisma.dictionaryLearningCandidate.findMany({
      where: { clinicId, status: 'pending' },
      orderBy: { occurrenceCount: 'desc' },
      take: 100,
    });
  }

  async recordDoctorApproval(params: {
    clinicId: string;
    physicianId: string;
    consultationId: string;
    originalTerm: string;
    correctedTerm: string;
    category?: MedicalTermCategory;
  }) {
    await this.prisma.transcriptCorrection.create({
      data: {
        clinicId: params.clinicId,
        physicianId: params.physicianId,
        consultationId: params.consultationId,
        rawText: params.originalTerm,
        correctedText: params.correctedTerm,
        originalTerm: params.originalTerm,
        correctedTerm: params.correctedTerm,
        category: params.category,
        confidence: 1,
        correctionSource: 'physician_manual',
        approvedByDoctor: true,
      },
    });

    const existing = await this.prisma.dictionaryLearningCandidate.findUnique({
      where: {
        clinicId_originalTerm_correctedTerm: {
          clinicId: params.clinicId,
          originalTerm: params.originalTerm,
          correctedTerm: params.correctedTerm,
        },
      },
    });
    if (existing) {
      await this.prisma.dictionaryLearningCandidate.update({
        where: { id: existing.id },
        data: { occurrenceCount: { increment: 1 } },
      });
    } else {
      await this.prisma.dictionaryLearningCandidate.create({
        data: {
          clinicId: params.clinicId,
          originalTerm: params.originalTerm,
          correctedTerm: params.correctedTerm,
          category: params.category,
          occurrenceCount: 1,
          status: 'pending',
        },
      });
    }
  }

  async approveLearningCandidate(id: string, clinicId: string) {
    const cand = await this.prisma.dictionaryLearningCandidate.findFirst({
      where: { id, clinicId },
    });
    if (!cand) throw new Error('Candidate not found');
    await this.prisma.clinicDictionaryTerm.create({
      data: {
        clinicId,
        canonicalName: cand.correctedTerm,
        category: cand.category ?? MedicalTermCategory.other,
        aliases: [cand.originalTerm],
        frequency: cand.occurrenceCount,
        priority: 150,
      },
    });
    await this.prisma.dictionaryLearningCandidate.update({
      where: { id },
      data: { status: 'approved' },
    });
    await this.refreshIndexFromDb();
    return { ok: true };
  }

  async getConsultationKnowledge(consultationId: string) {
    const [entities, corrections, metrics, segments] = await Promise.all([
      this.prisma.clinicalEntity.findMany({
        where: { consultationId },
        include: { candidates: { orderBy: { score: 'desc' } } },
        orderBy: { startPosition: 'asc' },
      }),
      this.prisma.transcriptCorrection.findMany({
        where: { consultationId },
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.knowledgeQualityMetric.findUnique({ where: { consultationId } }),
      this.prisma.transcriptSegment.findMany({
        where: { consultationId, isFinal: true },
        orderBy: { sequenceNumber: 'asc' },
      }),
    ]);
    const rawText = segments.map((s) => s.rawText ?? s.text).join('\n');
    const correctedText = segments.map((s) => s.text).join('\n');
    return { rawText, correctedText, entities, corrections, metrics };
  }
}
