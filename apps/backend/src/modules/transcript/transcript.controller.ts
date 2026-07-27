import { Body, Controller, Get, Param, Patch, Put, Query, UseGuards } from '@nestjs/common';
import { SpeakerLabel } from '@prisma/client';
import { IsArray, IsEnum, IsOptional, IsBoolean, IsString, ValidateNested } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { TranscriptService } from './transcript.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthUser } from '../../common/guards/jwt-auth.guard';
import { ConsultationAccessService } from '../../common/services/consultation-access.service';

class UpdateSpeakerDto {
  @IsEnum(SpeakerLabel)
  speaker!: SpeakerLabel;
}

class TranscriptQueryDto {
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  final?: boolean;
}

class TranscriptSegmentEditDto {
  @IsString()
  id!: string;

  @IsString()
  text!: string;
}

class SaveTranscriptDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TranscriptSegmentEditDto)
  segments!: TranscriptSegmentEditDto[];
}

@Controller('consultations/:consultationId/transcript')
@UseGuards(JwtAuthGuard)
export class TranscriptController {
  constructor(
    private readonly transcriptService: TranscriptService,
    private readonly consultationAccess: ConsultationAccessService,
  ) {}

  @Get()
  async list(
    @Param('consultationId') consultationId: string,
    @CurrentUser() user: AuthUser,
    @Query() query: TranscriptQueryDto,
  ) {
    await this.consultationAccess.assertPhysicianOwns(consultationId, user.sub);
    return this.transcriptService.getSegments(consultationId, { final: query.final });
  }

  @Patch('segments/:segmentId/speaker')
  async updateSpeaker(
    @Param('consultationId') consultationId: string,
    @Param('segmentId') segmentId: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdateSpeakerDto,
  ) {
    await this.consultationAccess.assertPhysicianOwns(consultationId, user.sub);
    return this.transcriptService.updateSegmentSpeaker(segmentId, dto.speaker);
  }

  @Put()
  async saveTranscript(
    @Param('consultationId') consultationId: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: SaveTranscriptDto,
  ) {
    await this.consultationAccess.assertPhysicianOwns(consultationId, user.sub);
    return this.transcriptService.saveTranscriptEdits(consultationId, user.sub, dto.segments);
  }
}
