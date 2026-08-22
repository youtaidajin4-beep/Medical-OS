import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { IsString, MinLength } from 'class-validator';
import { ChatService } from './chat.service';
import { JwtAuthGuard, AuthUser } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

class AskDto {
  @IsString()
  @MinLength(1)
  content!: string;
}

@Controller('consultations/:consultationId/chat')
@UseGuards(JwtAuthGuard)
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Get()
  list(@Param('consultationId') consultationId: string, @CurrentUser() user: AuthUser) {
    return this.chatService.list(consultationId, user.sub);
  }

  @Post()
  ask(
    @Param('consultationId') consultationId: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: AskDto,
  ) {
    return this.chatService.ask(consultationId, user.sub, dto.content);
  }

  @Post('transcribe')
  @UseInterceptors(FileInterceptor('audio'))
  transcribe(
    @Param('consultationId') consultationId: string,
    @CurrentUser() user: AuthUser,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.chatService.transcribeVoice(consultationId, user.sub, file);
  }
}
