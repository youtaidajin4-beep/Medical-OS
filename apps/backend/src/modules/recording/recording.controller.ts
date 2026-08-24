import {
  Controller,
  Param,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  Body,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Transform } from 'class-transformer';
import { IsInt, IsOptional, IsString } from 'class-validator';
import { RecordingService } from './recording.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthUser } from '../../common/guards/jwt-auth.guard';
import { ConsultationAccessService } from '../../common/services/consultation-access.service';

class UploadChunkDto {
  @Transform(({ value }) => Number(value))
  @IsInt()
  sequenceNumber!: number;

  @IsOptional()
  @IsString()
  checksum?: string;
}

@Controller('consultations/:consultationId/recording')
@UseGuards(JwtAuthGuard)
export class RecordingController {
  constructor(
    private readonly recordingService: RecordingService,
    private readonly consultationAccess: ConsultationAccessService,
  ) {}

  @Post('chunks')
  @UseInterceptors(FileInterceptor('audio'))
  async uploadChunk(
    @Param('consultationId') consultationId: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: UploadChunkDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    await this.consultationAccess.assertPhysicianOwns(consultationId, user.sub, user.clinicId);
    if (!file?.buffer?.length) {
      throw new BadRequestException('Audio chunk is empty or missing');
    }
    return this.recordingService.uploadChunk(
      consultationId,
      dto.sequenceNumber,
      file.buffer,
      dto.checksum,
    );
  }

  @Post('final')
  @UseInterceptors(FileInterceptor('audio'))
  async uploadFinal(
    @Param('consultationId') consultationId: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: UploadChunkDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    await this.consultationAccess.assertPhysicianOwns(consultationId, user.sub, user.clinicId);
    if (!file?.buffer?.length) {
      throw new BadRequestException('Audio file is empty or missing');
    }
    return this.recordingService.uploadFinalRecording(
      consultationId,
      file.buffer,
      dto.checksum,
    );
  }

  @Post('assemble')
  async assemble(
    @Param('consultationId') consultationId: string,
    @CurrentUser() user: AuthUser,
  ) {
    await this.consultationAccess.assertPhysicianOwns(consultationId, user.sub, user.clinicId);
    return this.recordingService.assembleAudioFile(consultationId);
  }
}
