import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { IsArray, IsIn, IsObject, IsOptional, IsString } from 'class-validator';
import { DocumentsService } from './documents.service';
import { JwtAuthGuard, AuthUser } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

class UpdateDocumentDto {
  @IsObject()
  content!: Record<string, unknown>;
}

class GenerateAllDto {
  @IsOptional()
  @IsIn(['simple', 'complex'])
  referralPattern?: 'simple' | 'complex';

  /** 画面で選ばれた書類だけ作る。省略したときは全種類 */
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  types?: string[];
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
  generateAll(
    @Param('consultationId') consultationId: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: GenerateAllDto,
  ) {
    return this.documentsService.generateAll(consultationId, user.sub, {
      referralPattern: dto?.referralPattern ?? 'simple',
      types: dto?.types,
    });
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
