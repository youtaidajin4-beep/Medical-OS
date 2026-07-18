import { Injectable } from '@nestjs/common';
import { APP_VERSION } from '@medical-os/shared';
import { PrismaService } from '../../database/prisma.service';
import { AiConfigService } from '../../providers/ai/ai-config.service';

@Injectable()
export class HealthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly aiConfig: AiConfigService,
  ) {}

  getOverall() {
    return {
      status: 'ok' as const,
      version: APP_VERSION,
      timestamp: new Date().toISOString(),
      service: 'medical-os-backend',
    };
  }

  async getDatabase() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return {
        ...this.getOverall(),
        database: 'connected' as const,
      };
    } catch {
      return {
        status: 'error' as const,
        version: APP_VERSION,
        timestamp: new Date().toISOString(),
        service: 'medical-os-backend',
        database: 'disconnected' as const,
      };
    }
  }

  getStorage() {
    return {
      ...this.getOverall(),
      status: 'not_configured' as const,
      subsystem: 'storage',
    };
  }

  getAi() {
    const snapshot = this.aiConfig.getSnapshot();
    const needsKey = snapshot.sttProvider === 'openai' || snapshot.llmProvider === 'openai';
    const ok = !needsKey || snapshot.apiKeyConfigured;
    const ffmpegWarning =
      snapshot.sttProvider === 'openai' && !snapshot.ffmpegAvailable;

    return {
      ...this.getOverall(),
      status: ok ? ('ok' as const) : ('error' as const),
      subsystem: 'ai' as const,
      sttProvider: snapshot.sttProvider,
      llmProvider: snapshot.llmProvider,
      apiKeyConfigured: snapshot.apiKeyConfigured,
      ffmpegAvailable: snapshot.ffmpegAvailable,
      whisperModel: snapshot.whisperModel,
      llmModel: snapshot.llmModel,
      ...(ffmpegWarning
        ? { warning: 'ffmpeg is not installed; multi-chunk STT may fail' }
        : {}),
    };
  }
}
