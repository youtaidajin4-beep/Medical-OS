import { Module } from '@nestjs/common';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { AiModule } from '../ai/ai.module';
import { DocumentsModule } from '../documents/documents.module';
import { TranscriptModule } from '../transcript/transcript.module';

@Module({
  imports: [AiModule, DocumentsModule, TranscriptModule],
  controllers: [ChatController],
  providers: [ChatService],
})
export class ChatModule {}