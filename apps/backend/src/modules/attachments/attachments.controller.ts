import {
  Controller,
  Get,
  Param,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  Body,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { IsOptional, IsString } from 'class-validator';
import { AttachmentsService } from './attachments.service';
import { JwtAuthGuard, AuthUser } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

class UploadMetaDto {
  @IsOptional()
  @IsString()
  documentKind?: string;
}

@Controller('consultations/:consultationId')
@UseGuards(JwtAuthGuard)
export class AttachmentsController {
  constructor(private readonly attachmentsService: AttachmentsService) {}

  @Get('attachments')
  list(@Param('consultationId') consultationId: string, @CurrentUser() user: AuthUser) {
    return this.attachmentsService.list(consultationId, user.sub);
  }

  @Post('attachments')
  @UseInterceptors(FileInterceptor('file'))
  upload(
    @Param('consultationId') consultationId: string,
    @CurrentUser() user: AuthUser,
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: UploadMetaDto,
  ) {
    return this.attachmentsService.upload(consultationId, user.sub, file, dto.documentKind ?? 'other');
  }

  @Get('timeline')
  timeline(@Param('consultationId') consultationId: string, @CurrentUser() user: AuthUser) {
    return this.attachmentsService.timeline(consultationId, user.sub);
  }
}
