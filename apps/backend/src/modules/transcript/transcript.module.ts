import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TranscriptController } from './transcript.controller';
import { TranscriptService } from './transcript.service';
import { MockSttProvider } from '../../providers/ai/stt.provider';
import { OpenAiSttProvider } from '../../providers/ai/openai-stt.provider';
import { STT_PROVIDER } from '../../providers/ai/stt.tokens';

@Module({
  controllers: [TranscriptController],
  providers: [
    TranscriptService,
    {
      provide: STT_PROVIDER,
      useFactory: (config: ConfigService) => {
        const provider = config.get<string>('STT_PROVIDER', 'mock');
        if (provider === 'openai') {
          return new OpenAiSttProvider({
            apiKey: config.get<string>('OPENAI_API_KEY', ''),
            model: config.get<string>('OPENAI_WHISPER_MODEL', 'whisper-1'),
          });
        }
        return new MockSttProvider();
      },
      inject: [ConfigService],
    },
  ],
  exports: [TranscriptService, STT_PROVIDER],
})
export class TranscriptModule {}
