import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { IsObject } from 'class-validator';
import { DocumentsService } from './documents.service';
import { JwtAuthGuard, AuthUser } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

class UpdateDocumentDto {
  @IsObject()
  content!: Record<string, unknown>;
}

@Controller('consultations/:consultationId/documents')
@UseGuards(JwtAuthGuard)
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Get()
  list(@Param('consultationId') consultationId: string, @CurrentUser() user: AuthUser) {
    return this.documentsService.list(consultationId, user.sub);
  }

  @Post('generate-all')
  generateAll(@Param('consultationId') consultationId: string, @CurrentUser() user: AuthUser) {
    return this.documentsService.generateAll(consultationId, user.sub);
  }

  @Patch(':type')
  update(
    @Param('consultationId') consultationId: string,
    @Param('type') type: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdateDocumentDto,
  ) {
    return this.documentsService.updateDocument(
      consultationId,
      user.sub,
      type,
      dto.content,
    );
  }
}
