import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { IsBoolean, IsEnum, IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';
import { VisitType } from '@prisma/client';
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

  @IsOptional()
  @IsEnum(VisitType)
  visitType?: VisitType;
}

class RestyleSoapDto {
  /** 医師が指定する書き方（形式・文体・長さ）。事実の追加・削除は受け付けない */
  @IsString()
  @MinLength(1)
  @MaxLength(600)
  instruction!: string;
}

class StopRecordingDto {
  /**
   * 診察中に文字にした分（リアルタイム書き起こし）が全部そろっている。
   * true なら、録音全体の文字起こしを待たずに、その文字からSOAPを作る。
   */
  @IsOptional()
  @IsBoolean()
  fromLive?: boolean;
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
  stopRecording(
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: StopRecordingDto,
  ) {
    return this.consultationsService.stopRecording(id, user.sub, {
      fromLive: dto?.fromLive === true,
    });
  }

  @Post(':id/reprocess')
  reprocess(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.consultationsService.reprocess(id, user.sub);
  }

  @Post(':id/recording/resume')
  async resumeRecording(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.consultationsService.resumeRecording(id, user.sub);
  }

  @Post(':id/recording/reset')
  resetRecording(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.consultationsService.resetForRerecord(id, user.sub);
  }

  @Patch(':id/soap')
  updateSoap(
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdateSoapDto,
  ) {
    return this.consultationsService.updateSoap(id, user.sub, dto);
  }

  /** いまのSOAPを、指定の書き方で書き直した案を返す（保存はしない） */
  @Post(':id/soap/restyle')
  restyleSoap(
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: RestyleSoapDto,
  ) {
    return this.consultationsService.restyleSoap(id, user.sub, dto.instruction);
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
