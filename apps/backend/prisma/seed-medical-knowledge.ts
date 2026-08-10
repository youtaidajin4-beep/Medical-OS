import { PrismaClient, MedicalKnowledgeSource, MedicalRiskLevel, MedicalTermAliasType, MedicalTermCategory } from '@prisma/client';
import { INTERNAL_MEDICINE_SEED_TERMS } from '../src/modules/medical-knowledge/data/internal-medicine-seed';

export async function seedMedicalKnowledge(prisma: PrismaClient) {
  const existing = await prisma.medicalTerm.count();
  if (existing > 0) {
    console.log(`medical_terms already present (${existing}) — skip knowledge seed`);
    return;
  }

  let terms = 0;
  let aliases = 0;
  for (const t of INTERNAL_MEDICINE_SEED_TERMS) {
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
          create: (t.aliases ?? []).map((a) => {
            aliases += 1;
            return {
              alias: a.alias,
              aliasReading: a.aliasReading,
              aliasType: a.aliasType as MedicalTermAliasType,
            };
          }),
        },
      },
    });
    terms += 1;
  }
  console.log(`Seeded medical knowledge: ${terms} terms, ${aliases} aliases (sourceCode=null until master import)`);
}
