import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AiPipelineService } from './ai-pipeline.service';
import { TranscriptModule } from '../transcript/transcript.module';
import { RecordingModule } from '../recording/recording.module';
import { MockLlmProvider } from '../../providers/ai/llm.provider';
import { OpenAiLlmProvider } from '../../providers/ai/openai-llm.provider';
import { LLM_PROVIDER } from '../../providers/ai/llm.tokens';

@Module({
  imports: [TranscriptModule, RecordingModule],
  providers: [
    AiPipelineService,
    {
      provide: LLM_PROVIDER,
      useFactory: (config: ConfigService) => {
        const provider = config.get<string>('LLM_PROVIDER', 'mock');
        if (provider === 'openai') {
          return new OpenAiLlmProvider({
            apiKey: config.get<string>('OPENAI_API_KEY', ''),
            model: config.get<string>('OPENAI_LLM_MODEL', 'gpt-4o-mini'),
          });
        }
        return new MockLlmProvider();
      },
      inject: [ConfigService],
    },
  ],
  exports: [AiPipelineService, LLM_PROVIDER],
})
export class AiModule {}
