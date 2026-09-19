import { PrismaClient, UserRole } from '@prisma/client';
import { DEFAULT_MEDICAL_GLOSSARY, mergeMedicalGlossary } from '../src/providers/ai/medical-glossary.types';
import { parsePhysicianRules } from '../src/modules/settings/physician-rules.types';
import { isWeakPassword } from '../src/modules/auth/password-policy';
import { seedMedicalKnowledge } from './seed-medical-knowledge';
import * as argon2 from 'argon2';
import { randomBytes } from 'crypto';

const prisma = new PrismaClient();

const CLINIC_ID = '00000000-0000-0000-0000-000000000001';
const CLINIC_CODE = 'kushima_internal';
const CLINIC_NAME = 'くしま内科';
/** 書類に印刷する医療機関の情報。表記は紙の様式に合わせてある */
const CLINIC_PROFILE = {
  legalName: '医療法人 十慶会　くしま内科クリニック',
  postalCode: '856-0832',
  address: '長崎県大村市本町 436-16',
  tel: '0957-51-1256',
  fax: '0957-51-4156',
  department: '内科',
  municipalityCode: '42205',
};
/** 主治医意見書の医師番号（谷口先生） */
const DOCTOR_NUMBER = '0092618202';

function resolveSeedPassword(): string {
  const fromEnv = process.env.SEED_PASSWORD?.trim();
  if (fromEnv) {
    if (fromEnv.length < 8) {
      throw new Error('SEED_PASSWORD must be at least 8 characters.');
    }
    if (isWeakPassword(fromEnv)) {
      throw new Error('SEED_PASSWORD is a known weak password. Use a unique password.');
    }
    return fromEnv;
  }

  const generated = randomBytes(18).toString('base64url');
  console.log('SEED_PASSWORD not set — generated a one-time password (save this):');
  console.log(generated);
  return generated;
}

async function main() {
  const seedPassword = resolveSeedPassword();
  const passwordHash = await argon2.hash(seedPassword);

  const clinic = await prisma.clinic.upsert({
    where: { id: CLINIC_ID },
    update: { name: CLINIC_NAME, code: CLINIC_CODE, ...CLINIC_PROFILE },
    create: {
      id: CLINIC_ID,
      code: CLINIC_CODE,
      name: CLINIC_NAME,
      ...CLINIC_PROFILE,
    },
  });

  const demoUser = await prisma.user.upsert({
    where: { email: 'doctor@demo.clinic' },
    update: { name: '谷口 広明', clinicId: clinic.id, doctorNumber: DOCTOR_NUMBER },
    create: {
      clinicId: clinic.id,
      name: '谷口 広明',
      doctorNumber: DOCTOR_NUMBER,
      email: 'doctor@demo.clinic',
      passwordHash,
      role: UserRole.PHYSICIAN,
      mustChangePassword: true,
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

  await seedMedicalKnowledge(prisma);

  console.log(`Seed complete: clinic=${clinic.code} (${clinic.name}) id=${clinic.id}`);
  console.log('Login: doctor@demo.clinic');
  console.log('Initial login requires password change (mustChangePassword=true).');
  if (process.env.SEED_PASSWORD?.trim()) {
    console.log('Password: value from SEED_PASSWORD environment variable.');
  }
  console.log('Patients and anonymous cases are not seeded — add them from the app.');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
