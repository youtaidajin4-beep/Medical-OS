import { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';
import { isWeakPassword, WEAK_PASSWORD_MESSAGE } from '../src/modules/auth/password-policy';

const prisma = new PrismaClient();

async function main() {
  const email = process.env.PHYSICIAN_EMAIL ?? 'doctor@demo.clinic';
  const newPassword = process.env.NEW_PASSWORD;

  if (!newPassword) {
    console.error('NEW_PASSWORD environment variable is required.');
    console.error(
      'Example: DATABASE_URL="..." PHYSICIAN_EMAIL="doctor@demo.clinic" NEW_PASSWORD="..." pnpm set-password',
    );
    process.exit(1);
  }

  if (newPassword.length < 8) {
    console.error('NEW_PASSWORD must be at least 8 characters.');
    process.exit(1);
  }

  if (isWeakPassword(newPassword)) {
    console.error(WEAK_PASSWORD_MESSAGE);
    process.exit(1);
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    console.error(`User not found: ${email}`);
    process.exit(1);
  }

  const passwordHash = await argon2.hash(newPassword);
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash, mustChangePassword: false },
  });

  console.log(`Password updated for ${email} (${user.name}). mustChangePassword=false`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
