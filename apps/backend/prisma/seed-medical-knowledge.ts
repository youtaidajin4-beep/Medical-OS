import {
  PrismaClient,
  MedicalKnowledgeSource,
  MedicalRiskLevel,
  MedicalTermAliasType,
  MedicalTermCategory,
} from '@prisma/client';
import { INTERNAL_MEDICINE_SEED_TERMS } from '../src/modules/medical-knowledge/data/internal-medicine-seed';

export async function seedMedicalKnowledge(prisma: PrismaClient) {
  let inserted = 0;
  let updated = 0;
  let aliasesAdded = 0;

  for (const t of INTERNAL_MEDICINE_SEED_TERMS) {
    const existing = await prisma.medicalTerm.findFirst({
      where: { canonicalName: t.canonicalName },
      include: { aliases: true },
    });

    if (!existing) {
      await prisma.medicalTerm.create({
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
      inserted += 1;
      aliasesAdded += t.aliases?.length ?? 0;
      continue;
    }

    await prisma.medicalTerm.update({
      where: { id: existing.id },
      data: {
        reading: t.reading ?? existing.reading,
        subcategory: t.subcategory ?? existing.subcategory,
        englishName: t.englishName ?? existing.englishName,
        abbreviation: t.abbreviation ?? existing.abbreviation,
        priority: Math.max(existing.priority, t.priority ?? 100),
        riskLevel: (t.riskLevel ?? existing.riskLevel) as MedicalRiskLevel,
      },
    });
    updated += 1;

    const existingAliases = new Set(existing.aliases.map((a) => a.alias));
    for (const a of t.aliases ?? []) {
      if (existingAliases.has(a.alias)) continue;
      await prisma.medicalTermAlias.create({
        data: {
          medicalTermId: existing.id,
          alias: a.alias,
          aliasReading: a.aliasReading,
          aliasType: a.aliasType as MedicalTermAliasType,
        },
      });
      aliasesAdded += 1;
    }
  }

  console.log(
    `Seeded medical knowledge pack v1: inserted=${inserted}, updated=${updated}, aliasesAdded=${aliasesAdded} (total seed terms=${INTERNAL_MEDICINE_SEED_TERMS.length})`,
  );
}
