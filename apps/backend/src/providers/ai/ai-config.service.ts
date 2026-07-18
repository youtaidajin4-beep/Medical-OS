import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { isFfmpegAvailable } from './ffmpeg.util';

export type AiConfigSnapshot = {
  sttProvider: string;
  llmProvider: string;
  apiKeyConfigured: boolean;
  ffmpegAvailable: boolean;
  whisperModel: string;
  llmModel: string;
};

@Injectable()
export class AiConfigService implements OnModuleInit {
  private readonly logger = new Logger(AiConfigService.name);
  private ffmpegAvailable = false;

  constructor(private readonly config: ConfigService) {}

  async onModuleInit() {
    this.validateProviders();
    this.ffmpegAvailable = await isFfmpegAvailable();
    if (!this.ffmpegAvailable && this.usesOpenAi()) {
      this.logger.warn(
        'ffmpeg is not installed. Multi-chunk recording may fail STT. Install: brew install ffmpeg',
      );
    }
  }

  getSnapshot(): AiConfigSnapshot {
    return {
      sttProvider: this.getSttProvider(),
      llmProvider: this.getLlmProvider(),
      apiKeyConfigured: this.isApiKeyConfigured(),
      ffmpegAvailable: this.ffmpegAvailable,
      whisperModel: this.config.get<string>('OPENAI_WHISPER_MODEL', 'whisper-1'),
      llmModel: this.config.get<string>('OPENAI_LLM_MODEL', 'gpt-4o-mini'),
    };
  }

  getSttProvider(): string {
    return this.config.get<string>('STT_PROVIDER', 'mock');
  }

  getLlmProvider(): string {
    return this.config.get<string>('LLM_PROVIDER', 'mock');
  }

  isApiKeyConfigured(): boolean {
    return Boolean(this.config.get<string>('OPENAI_API_KEY', '').trim());
  }

  usesOpenAi(): boolean {
    return this.getSttProvider() === 'openai' || this.getLlmProvider() === 'openai';
  }

  isOpenAiStt(): boolean {
    return this.getSttProvider() === 'openai';
  }

  isOpenAiLlm(): boolean {
    return this.getLlmProvider() === 'openai';
  }

  private validateProviders() {
    const stt = this.getSttProvider();
    const llm = this.getLlmProvider();
    const apiKey = this.isApiKeyConfigured();

    if ((stt === 'openai' || llm === 'openai') && !apiKey) {
      throw new Error(
        'OPENAI_API_KEY is required when STT_PROVIDER or LLM_PROVIDER is set to openai. ' +
          'Set OPENAI_API_KEY in your environment or use mock providers.',
      );
    }

    const validStt = ['mock', 'openai'];
    const validLlm = ['mock', 'openai'];
    if (!validStt.includes(stt)) {
      throw new Error(`Invalid STT_PROVIDER: ${stt}. Must be one of: ${validStt.join(', ')}`);
    }
    if (!validLlm.includes(llm)) {
      throw new Error(`Invalid LLM_PROVIDER: ${llm}. Must be one of: ${validLlm.join(', ')}`);
    }
  }
}
