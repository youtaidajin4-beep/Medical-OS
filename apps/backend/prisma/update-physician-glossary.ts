import { PrismaClient, UserRole } from '@prisma/client';
import {
  DEFAULT_MEDICAL_GLOSSARY,
  mergeMedicalGlossary,
  MedicalGlossary,
} from '../src/providers/ai/medical-glossary.types';
import { parsePhysicianRules, PhysicianRules } from '../src/modules/settings/physician-rules.types';

const prisma = new PrismaClient();

function mergePhysicianGlossary(rules: PhysicianRules): PhysicianRules {
  const existing = rules.medicalGlossary;
  return {
    ...rules,
    medicalGlossary: mergeMedicalGlossary(existing),
  };
}

export async function updatePhysicianGlossariesForAllUsers() {
  const users = await prisma.user.findMany({
    where: { role: UserRole.PHYSICIAN },
    include: { settings: true },
  });

  let updated = 0;
  for (const user of users) {
    const settings = (user.settings?.settings as Record<string, unknown> | undefined) ?? {};
    const rules = parsePhysicianRules(settings.physicianRules);
    const merged = mergePhysicianGlossary(rules);

    await prisma.userSettings.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        settings: { ...settings, physicianRules: merged },
      },
      update: {
        settings: { ...settings, physicianRules: merged },
      },
    });
    updated += 1;
  }

  return { updated, glossary: DEFAULT_MEDICAL_GLOSSARY as MedicalGlossary };
}

async function main() {
  const result = await updatePhysicianGlossariesForAllUsers();
  console.log(
    `Updated medicalGlossary for ${result.updated} physician(s). ` +
      `Drugs: ${result.glossary.drugNames.length}, ` +
      `Diagnoses: ${result.glossary.diagnoses.length}, ` +
      `Replacements: ${result.glossary.customReplacements.length}`,
  );
}

if (require.main === module) {
  main()
    .catch((error) => {
      console.error(error);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
