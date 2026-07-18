import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { IsOptional, IsString, IsUUID } from 'class-validator';
import { ConsultationsService } from './consultations.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthUser } from '../../common/guards/jwt-auth.guard';

class CreateConsultationDto {
  @IsOptional()
  @IsUUID()
  patientId?: string;

  @IsOptional()
  @IsUUID()
  anonymousCaseId?: string;
}

class UpdateSoapDto {
  @IsString()
  subjective!: string;
  @IsString()
  objective!: string;
  @IsString()
  assessment!: string;
  @IsString()
  plan!: string;
}

class UpdateNoteDto {
  @IsString()
  content!: string;
}

@Controller('consultations')
@UseGuards(JwtAuthGuard)
export class ConsultationsController {
  constructor(private readonly consultationsService: ConsultationsService) {}

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateConsultationDto) {
    return this.consultationsService.create(user.sub, user.clinicId, dto);
  }

  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.consultationsService.list(user.sub);
  }

  @Get(':id')
  get(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.consultationsService.getById(id, user.sub);
  }

  @Post(':id/recording/start')
  startRecording(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.consultationsService.startRecording(id, user.sub);
  }

  @Post(':id/recording/stop')
  stopRecording(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.consultationsService.stopRecording(id, user.sub);
  }

  @Patch(':id/soap')
  updateSoap(
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdateSoapDto,
  ) {
    return this.consultationsService.updateSoap(id, user.sub, dto);
  }

  @Patch(':id/clinical-note')
  updateNote(
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdateNoteDto,
  ) {
    return this.consultationsService.updateClinicalNote(id, user.sub, dto.content);
  }

  @Post(':id/approve')
  approve(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.consultationsService.approve(id, user.sub);
  }

  @Post(':id/copied')
  copied(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.consultationsService.markCopied(id, user.sub);
  }
}
