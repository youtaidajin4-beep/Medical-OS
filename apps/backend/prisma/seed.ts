import { PrismaClient, UserRole } from '@prisma/client';
import { DEFAULT_MEDICAL_GLOSSARY, mergeMedicalGlossary } from '../src/providers/ai/medical-glossary.types';
import { parsePhysicianRules } from '../src/modules/settings/physician-rules.types';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

const CLINIC_ID = '00000000-0000-0000-0000-000000000001';

async function main() {
  const clinic = await prisma.clinic.upsert({
    where: { id: CLINIC_ID },
    update: { name: 'くしま内科クリニック' },
    create: {
      id: CLINIC_ID,
      name: 'くしま内科クリニック',
    },
  });

  const passwordHash = await argon2.hash('password123');
  const demoUser = await prisma.user.upsert({
    where: { email: 'doctor@demo.clinic' },
    update: { name: '谷口 広明' },
    create: {
      clinicId: clinic.id,
      name: '谷口 広明',
      email: 'doctor@demo.clinic',
      passwordHash,
      role: UserRole.PHYSICIAN,
    },
  });

  const defaultPhysicianRules = {
    referralRules: [
      { trigger: '脳梗塞疑い', mustInclude: ['紹介理由', '依頼事項', '経過'] },
    ],
    fixedPhrases: {
      greeting:
        'いつも大変お世話になっております。御多忙中誠に恐縮ですが、ご高診・ご加療を宜しくお願いいたします。',
      closing: 'ご高診のほどよろしくお願い申し上げます。',
    },
    medicalGlossary: DEFAULT_MEDICAL_GLOSSARY,
  };

  const existingSettings = await prisma.userSettings.findUnique({ where: { userId: demoUser.id } });
  const existingRules = existingSettings?.settings
    ? parsePhysicianRules((existingSettings.settings as Record<string, unknown>).physicianRules)
    : null;

  await prisma.userSettings.upsert({
    where: { userId: demoUser.id },
    create: {
      userId: demoUser.id,
      settings: { physicianRules: defaultPhysicianRules },
    },
    update: {
      settings: {
        physicianRules: {
          ...defaultPhysicianRules,
          ...(existingRules
            ? {
                referralRules: existingRules.referralRules,
                fixedPhrases: existingRules.fixedPhrases,
                medicalGlossary: mergeMedicalGlossary(existingRules.medicalGlossary),
              }
            : {}),
        },
      },
    },
  });

  console.log('Seed complete: doctor@demo.clinic / password123');
  console.log('Patients and anonymous cases are not seeded — add them from the app.');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
