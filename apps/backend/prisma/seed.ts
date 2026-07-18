import { PrismaClient, UserRole } from '@prisma/client';
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

  await prisma.userSettings.upsert({
    where: { userId: demoUser.id },
    create: {
      userId: demoUser.id,
      settings: {
        physicianRules: {
          referralRules: [
            { trigger: '脳梗塞疑い', mustInclude: ['紹介理由', '依頼事項', '経過'] },
          ],
          fixedPhrases: {
            greeting:
              'いつも大変お世話になっております。御多忙中誠に恐縮ですが、ご高診・ご加療を宜しくお願いいたします。',
            closing: 'ご高診のほどよろしくお願い申し上げます。',
          },
        },
      },
    },
    update: {},
  });

  await prisma.anonymousCase.upsert({
    where: {
      clinicId_caseCode: {
        clinicId: clinic.id,
        caseCode: 'ANON-001',
      },
    },
    update: { displayName: '匿名症例 — 頭痛', age: 35, sex: 'F' },
    create: {
      clinicId: clinic.id,
      caseCode: 'ANON-001',
      displayName: '匿名症例 — 頭痛',
      age: 35,
      sex: 'F',
    },
  });

  await prisma.patient.upsert({
    where: {
      clinicId_patientCode: {
        clinicId: clinic.id,
        patientCode: 'P-001',
      },
    },
    update: { memo: '気管支炎（咳・発熱）', phone: '0957-50-1234' },
    create: {
      clinicId: clinic.id,
      patientCode: 'P-001',
      name: '山田 太郎',
      dateOfBirth: new Date('1980-05-15'),
      sex: 'M',
      memo: '気管支炎（咳・発熱）',
      phone: '0957-50-1234',
    },
  });

  await prisma.patient.upsert({
    where: {
      clinicId_patientCode: {
        clinicId: clinic.id,
        patientCode: 'P-002',
      },
    },
    update: { memo: '高血圧フォロー', phone: '0957-51-5678' },
    create: {
      clinicId: clinic.id,
      patientCode: 'P-002',
      name: '佐藤 花子',
      dateOfBirth: new Date('1967-03-20'),
      sex: 'F',
      memo: '高血圧フォロー',
      phone: '0957-51-5678',
    },
  });

  await prisma.patient.upsert({
    where: {
      clinicId_patientCode: {
        clinicId: clinic.id,
        patientCode: 'P-003',
      },
    },
    update: { memo: '頭痛', phone: '090-1234-5678' },
    create: {
      clinicId: clinic.id,
      patientCode: 'P-003',
      name: '鈴木 一郎',
      dateOfBirth: new Date('1983-11-08'),
      sex: 'M',
      memo: '頭痛',
      phone: '090-1234-5678',
    },
  });

  console.log('Seed complete: doctor@demo.clinic / password123');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
