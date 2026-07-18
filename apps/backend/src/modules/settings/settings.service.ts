import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import {
  DEFAULT_PHYSICIAN_RULES,
  parsePhysicianRules,
  PhysicianRules,
} from './physician-rules.types';

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
}
