import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { PatientsService } from './patients.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthUser } from '../../common/guards/jwt-auth.guard';
import { CreatePatientDto } from './dto/create-patient.dto';
import { CreateAnonymousCaseDto } from './dto/create-anonymous-case.dto';

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

  @Post('anonymous-cases')
  createAnonymousCase(@CurrentUser() user: AuthUser, @Body() dto: CreateAnonymousCaseDto) {
    return this.patientsService.createAnonymousCase(user.clinicId, dto);
  }
}
