import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { IsOptional, IsString, MinLength } from 'class-validator';
import { PatientsService } from './patients.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthUser } from '../../common/guards/jwt-auth.guard';
import { CreatePatientDto } from './dto/create-patient.dto';
import { UpdatePatientDto } from './dto/update-patient.dto';
import { CreateAnonymousCaseDto } from './dto/create-anonymous-case.dto';

class PromoteDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;
}

@Controller('patients')
@UseGuards(JwtAuthGuard)
export class PatientsController {
  constructor(private readonly patientsService: PatientsService) {}

  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.patientsService.listPatients(user.clinicId);
  }

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreatePatientDto) {
    return this.patientsService.createPatient(user.clinicId, dto);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdatePatientDto,
  ) {
    return this.patientsService.updatePatient(user.clinicId, id, dto);
  }

  @Post('anonymous-cases')
  createAnonymousCase(@CurrentUser() user: AuthUser, @Body() dto: CreateAnonymousCaseDto) {
    return this.patientsService.createAnonymousCase(user.clinicId, dto);
  }

  @Post('anonymous-cases/:id/promote')
  promote(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: PromoteDto,
  ) {
    return this.patientsService.promoteAnonymousToPatient(user.clinicId, id, dto.name);
  }
}
