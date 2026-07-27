import { PrismaClient } from '@prisma/client';
import { SettingsService } from '../src/modules/settings/settings.service';
import { PrismaService } from '../src/database/prisma.service';

const prisma = new PrismaClient();
const settingsService = new SettingsService(prisma as unknown as PrismaService);

async function main() {
  const physicians = await prisma.user.findMany({
    where: { role: 'PHYSICIAN' },
    select: { id: true, email: true, name: true },
  });

  for (const physician of physicians) {
    const suggestions = await settingsService.getSuggestedReplacements(physician.id);
    console.log(`\n=== ${physician.name ?? physician.email} ===`);
    if (!suggestions.length) {
      console.log('（提案なし）');
      continue;
    }
    for (const s of suggestions) {
      console.log(`${s.count}x  ${s.wrong} → ${s.correct}`);
    }
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
