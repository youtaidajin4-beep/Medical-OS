import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import {
  DEFAULT_PHYSICIAN_RULES,
  parsePhysicianRules,
  PhysicianRules,
} from './physician-rules.types';
import {
  MedicalGlossaryReplacement,
  mergeMedicalGlossary,
} from '../../providers/ai/medical-glossary.types';
import { mergeReplacements } from '../../providers/ai/transcript-diff.util';

export type SuggestedReplacement = MedicalGlossaryReplacement & { count: number };

@Injectable()
export class SettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async getPhysicianRules(userId: string): Promise<PhysicianRules> {
    const row = await this.prisma.userSettings.findUnique({ where: { userId } });
    if (!row?.settings) return DEFAULT_PHYSICIAN_RULES;
    const settings = row.settings as Record<string, unknown>;
    return parsePhysicianRules(settings.physicianRules);
  }

  async updatePhysicianRules(userId: string, rules: PhysicianRules): Promise<PhysicianRules> {
    const existing = await this.prisma.userSettings.findUnique({ where: { userId } });
    const settings = (existing?.settings as Record<string, unknown> | undefined) ?? {};
    await this.prisma.userSettings.upsert({
      where: { userId },
      create: { userId, settings: { ...settings, physicianRules: rules } },
      update: { settings: { ...settings, physicianRules: rules } },
    });
    return rules;
  }

  async getSuggestedReplacements(userId: string): Promise<SuggestedReplacement[]> {
    const executions = await this.prisma.aIExecution.findMany({
      where: {
        step: 'dict_correction_complete',
        consultation: { physicianId: userId },
        errorMessage: { not: null },
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });

    const counts = new Map<string, SuggestedReplacement>();
    for (const row of executions) {
      if (!row.errorMessage) continue;
      try {
        const replacements = JSON.parse(row.errorMessage) as MedicalGlossaryReplacement[];
        if (!Array.isArray(replacements)) continue;
        for (const r of replacements) {
          if (!r.wrong || !r.correct) continue;
          const key = `${r.wrong}→${r.correct}`;
          const existing = counts.get(key);
          if (existing) {
            existing.count += 1;
          } else {
            counts.set(key, { wrong: r.wrong, correct: r.correct, count: 1 });
          }
        }
      } catch {
        // ignore malformed logs
      }
    }

    return Array.from(counts.values()).sort((a, b) => b.count - a.count);
  }

  async addMedicalGlossaryReplacements(
    userId: string,
    replacements: MedicalGlossaryReplacement[],
  ): Promise<PhysicianRules> {
    const rules = await this.getPhysicianRules(userId);
    const glossary = mergeMedicalGlossary(rules.medicalGlossary);
    const merged = mergeReplacements(glossary.customReplacements, replacements, 3);
    return this.updatePhysicianRules(userId, {
      ...rules,
      medicalGlossary: {
        ...glossary,
        customReplacements: merged,
      },
    });
  }
}
