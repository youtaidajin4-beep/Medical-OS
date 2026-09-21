import { Module } from '@nestjs/common';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { AiModule } from '../ai/ai.module';
import { DocumentsModule } from '../documents/documents.module';
import { TranscriptModule } from '../transcript/transcript.module';
import { SettingsModule } from '../settings/settings.module';

@Module({
  imports: [AiModule, DocumentsModule, TranscriptModule, SettingsModule],
  controllers: [ChatController],
  providers: [ChatService],
})
export class ChatModule {}