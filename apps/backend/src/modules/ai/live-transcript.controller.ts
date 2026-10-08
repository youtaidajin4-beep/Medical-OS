import {
  BadRequestException,
  Body,
  Controller,
  Param,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Transform } from 'class-transformer';
import { IsInt, Min } from 'class-validator';
import { JwtAuthGuard, AuthUser } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ConsultationAccessService } from '../../common/services/consultation-access.service';
import { LiveTranscriptionService } from './live-transcription.service';

class LiveSegmentDto {
  /** 診察の録音の頭から、この区間が始まるまでの時間（ミリ秒） */
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(0)
  startMs!: number;

  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(0)
  endMs!: number;
}

@Controller('consultations/:consultationId/transcript')
@UseGuards(JwtAuthGuard)
export class LiveTranscriptController {
  constructor(
    private readonly liveTranscription: LiveTranscriptionService,
    private readonly consultationAccess: ConsultationAccessService,
  ) {}

  /**
   * 診察中のリアルタイム書き起こし。声の切れ目ごとの短い音声（WAV）を1区間ずつ受ける。
   * 落とした区間（無音・定型句）は segment が null で返る。
   */
  @Post('live')
  @UseInterceptors(FileInterceptor('audio', { limits: { fileSize: 8 * 1024 * 1024 } }))
  async live(
    @Param('consultationId') consultationId: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: LiveSegmentDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    await this.consultationAccess.assertPhysicianOwns(consultationId, user.sub, user.clinicId);
    if (!file?.buffer?.length) {
      throw new BadRequestException('音声データがありません');
    }
    return this.liveTranscription.transcribeSegment({
      consultationId,
      physicianId: user.sub,
      audio: file.buffer,
      startMs: dto.startMs,
      endMs: dto.endMs,
    });
  }
}
