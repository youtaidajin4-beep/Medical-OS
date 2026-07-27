import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const CLINIC_ID = '00000000-0000-0000-0000-000000000001';

async function main() {
  const clinic = await prisma.clinic.findUnique({ where: { id: CLINIC_ID } });
  if (!clinic) {
    console.log('Clinic not found — nothing to reset.');
    return;
  }

  const deletedConsultations = await prisma.consultation.deleteMany({
    where: { clinicId: CLINIC_ID },
  });
  const deletedPatients = await prisma.patient.deleteMany({
    where: { clinicId: CLINIC_ID },
  });
  const deletedAnonymous = await prisma.anonymousCase.deleteMany({
    where: { clinicId: CLINIC_ID },
  });

  console.log(
    `Reset complete for ${clinic.name}: ` +
      `${deletedConsultations.count} consultations, ` +
      `${deletedPatients.count} patients, ` +
      `${deletedAnonymous.count} anonymous cases removed.`,
  );
  console.log('Kept: clinic, users, user settings.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
