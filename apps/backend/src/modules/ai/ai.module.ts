import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AiPipelineService } from './ai-pipeline.service';
import { TranscriptModule } from '../transcript/transcript.module';
import { RecordingModule } from '../recording/recording.module';
import { SettingsModule } from '../settings/settings.module';
import { MedicalKnowledgeModule } from '../medical-knowledge/medical-knowledge.module';
import { MockLlmProvider } from '../../providers/ai/llm.provider';
import { OpenAiLlmProvider } from '../../providers/ai/openai-llm.provider';
import { LLM_PROVIDER } from '../../providers/ai/llm.tokens';

@Module({
  imports: [TranscriptModule, RecordingModule, SettingsModule, MedicalKnowledgeModule],
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
            correctionModel: config.get<string>('OPENAI_CORRECTION_MODEL', 'gpt-4o'),
            // 構造化抽出はSOAPの骨組みを決める。ここで落ちた事実は、SOAPを書く側に
            // 文字起こしを渡しても拾い直されない。gpt-4o-mini → gpt-4o で
            // 転記率 50%→65%（2026-10-01実測）。1診察あたり約+1円
            extractModel: config.get<string>('OPENAI_EXTRACT_MODEL', 'gpt-4o'),
            documentModel: config.get<string>('OPENAI_DOCUMENT_MODEL', 'gpt-4o'),
            // SOAPは診療の判断が載る欄。gpt-4o-mini は「定型床は差分があれば上書き」を
            // 守れず、新規の胸痛を stable と誤記した（2026-09-21実測、3回とも再現）
            soapModel: config.get<string>('OPENAI_SOAP_MODEL', 'gpt-4o'),
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
