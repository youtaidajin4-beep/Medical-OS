import { Module } from '@nestjs/common';
import { MedicalKnowledgeService } from './medical-knowledge.service';
import { MedicalKnowledgeController } from './medical-knowledge.controller';

@Module({
  controllers: [MedicalKnowledgeController],
  providers: [MedicalKnowledgeService],
  exports: [MedicalKnowledgeService],
})
export class MedicalKnowledgeModule {}
