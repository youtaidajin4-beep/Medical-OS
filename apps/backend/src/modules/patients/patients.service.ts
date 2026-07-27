import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateAnonymousCaseDto } from './dto/create-anonymous-case.dto';
import { CreatePatientDto } from './dto/create-patient.dto';

function nextCode(prefix: string, existing: string[]): string {
  const numbers = existing
    .map((code) => {
      const match = code.match(new RegExp(`^${prefix}-(\\d+)$`));
      return match ? Number(match[1]) : 0;
    })
    .filter((n) => n > 0);
  const next = numbers.length ? Math.max(...numbers) + 1 : 1;
  return `${prefix}-${String(next).padStart(3, '0')}`;
}

@Injectable()
export class PatientsService {
  constructor(private readonly prisma: PrismaService) {}

  async listPatients(clinicId: string) {
    const [patients, anonymousCases] = await Promise.all([
      this.prisma.patient.findMany({
        where: { clinicId },
        orderBy: { updatedAt: 'desc' },
      }),
      this.prisma.anonymousCase.findMany({
        where: { clinicId },
        orderBy: { updatedAt: 'desc' },
      }),
    ]);
    return {
      patients: patients.map((p) => ({
        id: p.id,
        type: 'patient' as const,
        code: p.patientCode,
        name: p.name,
        age: p.dateOfBirth
          ? Math.floor(
              (Date.now() - p.dateOfBirth.getTime()) / (365.25 * 24 * 60 * 60 * 1000),
            )
          : null,
        sex: p.sex,
        memo: p.memo,
      })),
      anonymousCases: anonymousCases.map((c) => ({
        id: c.id,
        type: 'anonymous' as const,
        code: c.caseCode,
        name: c.displayName,
        age: c.age,
        sex: c.sex,
      })),
    };
  }

  async createPatient(clinicId: string, dto: CreatePatientDto) {
    const existing = await this.prisma.patient.findMany({
      where: { clinicId },
      select: { patientCode: true },
    });
    const patientCode = nextCode(
      'P',
      existing.map((p) => p.patientCode),
    );

    const patient = await this.prisma.patient.create({
      data: {
        clinicId,
        patientCode,
        name: dto.name.trim(),
        sex: dto.sex,
        dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : undefined,
        phone: dto.phone?.trim() || undefined,
        memo: dto.memo?.trim() || undefined,
      },
    });

    return {
      id: patient.id,
      type: 'patient' as const,
      code: patient.patientCode,
      name: patient.name,
      age: patient.dateOfBirth
        ? Math.floor(
            (Date.now() - patient.dateOfBirth.getTime()) / (365.25 * 24 * 60 * 60 * 1000),
          )
        : null,
      sex: patient.sex,
      memo: patient.memo,
    };
  }

  async createAnonymousCase(clinicId: string, dto: CreateAnonymousCaseDto) {
    const existing = await this.prisma.anonymousCase.findMany({
      where: { clinicId },
      select: { caseCode: true },
    });
    const caseCode = nextCode(
      'ANON',
      existing.map((c) => c.caseCode),
    );

    const anonymousCase = await this.prisma.anonymousCase.create({
      data: {
        clinicId,
        caseCode,
        displayName: dto.displayName.trim(),
        age: dto.age,
        sex: dto.sex,
      },
    });

    return {
      id: anonymousCase.id,
      type: 'anonymous' as const,
      code: anonymousCase.caseCode,
      name: anonymousCase.displayName,
      age: anonymousCase.age,
      sex: anonymousCase.sex,
    };
  }
}
