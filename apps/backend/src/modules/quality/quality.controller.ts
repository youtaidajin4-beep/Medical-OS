import { Controller, Get, Header, Param, ParseIntPipe, Query, UseGuards, DefaultValuePipe } from '@nestjs/common';
import { JwtAuthGuard, AuthUser } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { monthKeyJst } from './quality-metrics';
import { QualityService } from './quality.service';

/**
 * 管理画面（/admin/quality）向け。診療の画面とは別の入口で、管理者だけが読める。
 * 会話やSOAPの本文は返さない（用語・事実の短い断片と数字だけ）。
 */
@Controller('quality')
@UseGuards(JwtAuthGuard)
export class QualityController {
  constructor(private readonly quality: QualityService) {}

  @Get('overview')
  overview(
    @CurrentUser() user: AuthUser,
    @Query('months', new DefaultValuePipe(12), ParseIntPipe) months: number,
  ) {
    return this.quality.overview(user, months);
  }

  @Get('visits')
  visits(@CurrentUser() user: AuthUser, @Query('month') month?: string) {
    return this.quality.visits(user, month ?? monthKeyJst(new Date()));
  }

  @Get('visits/:id')
  visit(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.quality.visitDetail(user, id);
  }

  @Get('export.csv')
  @Header('Content-Type', 'text/csv; charset=utf-8')
  exportCsv(@CurrentUser() user: AuthUser, @Query('month') month?: string) {
    return this.quality.exportCsv(user, month ?? monthKeyJst(new Date()));
  }
}
