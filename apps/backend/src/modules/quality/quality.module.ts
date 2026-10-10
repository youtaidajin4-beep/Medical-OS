import { Module } from '@nestjs/common';
import { MedicalKnowledgeModule } from '../medical-knowledge/medical-knowledge.module';
import { QualityController } from './quality.controller';
import { QualityService } from './quality.service';

@Module({
  imports: [MedicalKnowledgeModule],
  controllers: [QualityController],
  providers: [QualityService],
  exports: [QualityService],
})
export class QualityModule {}
