import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common';
import { IsArray, IsObject, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { SettingsService } from './settings.service';
import { JwtAuthGuard, AuthUser } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PhysicianRules } from './physician-rules.types';

class ReferralRuleDto {
  @IsString()
  trigger!: string;

  @IsArray()
  @IsString({ each: true })
  mustInclude!: string[];
}

class FixedPhrasesDto {
  @IsOptional()
  @IsString()
  closing?: string;

  @IsOptional()
  @IsString()
  greeting?: string;
}

class PhysicianRulesDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReferralRuleDto)
  referralRules!: ReferralRuleDto[];

  @IsObject()
  @ValidateNested()
  @Type(() => FixedPhrasesDto)
  fixedPhrases!: FixedPhrasesDto;
}

@Controller('settings')
@UseGuards(JwtAuthGuard)
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get('physician-rules')
  getPhysicianRules(@CurrentUser() user: AuthUser) {
    return this.settingsService.getPhysicianRules(user.sub);
  }

  @Put('physician-rules')
  updatePhysicianRules(@CurrentUser() user: AuthUser, @Body() dto: PhysicianRulesDto) {
    return this.settingsService.updatePhysicianRules(user.sub, dto as PhysicianRules);
  }
}
