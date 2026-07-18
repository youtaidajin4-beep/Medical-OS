import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

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
}
