import { Module } from '@nestjs/common';
import { DocumentsService } from './documents.service';
import { DocumentsController } from './documents.controller';
import { SettingsModule } from '../settings/settings.module';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [SettingsModule, AiModule],
  controllers: [DocumentsController],
  providers: [DocumentsService],
  exports: [DocumentsService],
})
export class DocumentsModule {}
