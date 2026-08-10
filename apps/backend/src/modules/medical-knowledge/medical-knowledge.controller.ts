import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { IsOptional, IsString, IsUUID } from 'class-validator';
import { JwtAuthGuard, AuthUser } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { MedicalKnowledgeService } from './medical-knowledge.service';

class ApproveCorrectionDto {
  @IsUUID()
  consultationId!: string;

  @IsString()
  originalTerm!: string;

  @IsString()
  correctedTerm!: string;

  @IsOptional()
  @IsString()
  category?: string;
}

@Controller('medical-knowledge')
@UseGuards(JwtAuthGuard)
export class MedicalKnowledgeController {
  constructor(private readonly knowledge: MedicalKnowledgeService) {}

  @Get('terms')
  listTerms(
    @Query('q') q?: string,
    @Query('category') category?: string,
    @Query('take') take?: string,
  ) {
    return this.knowledge.listTerms({
      q,
      category,
      take: take ? Number(take) : 100,
    });
  }

  @Get('clinic')
  listClinic(@CurrentUser() user: AuthUser) {
    return this.knowledge.listClinicTerms(user.clinicId);
  }

  @Get('doctor')
  listDoctor(@CurrentUser() user: AuthUser) {
    return this.knowledge.listDoctorTerms(user.sub);
  }

  @Get('misrecognitions')
  misrecognitions(@CurrentUser() user: AuthUser) {
    return this.knowledge.listMisrecognitionRanking(user.clinicId);
  }

  @Get('learning-candidates')
  learningCandidates(@CurrentUser() user: AuthUser) {
    return this.knowledge.listLearningCandidates(user.clinicId);
  }

  @Post('learning-candidates/:id/approve')
  approveCandidate(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.knowledge.approveLearningCandidate(id, user.clinicId);
  }

  @Get('consultations/:consultationId')
  consultationKnowledge(@Param('consultationId') consultationId: string) {
    return this.knowledge.getConsultationKnowledge(consultationId);
  }

  @Post('doctor-corrections')
  doctorCorrection(@CurrentUser() user: AuthUser, @Body() body: ApproveCorrectionDto) {
    return this.knowledge.recordDoctorApproval({
      clinicId: user.clinicId,
      physicianId: user.sub,
      consultationId: body.consultationId,
      originalTerm: body.originalTerm,
      correctedTerm: body.correctedTerm,
      category: body.category as never,
    });
  }

  @Post('seed')
  seed() {
    return this.knowledge.ensureSeedTerms();
  }
}
