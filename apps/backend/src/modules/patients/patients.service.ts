import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateAnonymousCaseDto } from './dto/create-anonymous-case.dto';
import { CreatePatientDto } from './dto/create-patient.dto';
import { UpdatePatientDto } from './dto/update-patient.dto';

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
        include: { _count: { select: { consultations: true } } },
      }),
      this.prisma.anonymousCase.findMany({
        where: { clinicId },
        orderBy: { updatedAt: 'desc' },
        include: { _count: { select: { consultations: true } } },
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
        dateOfBirth: p.dateOfBirth?.toISOString().slice(0, 10) ?? null,
        phone: p.phone,
        memo: p.memo,
        visitCount: p._count.consultations,
      })),
      anonymousCases: anonymousCases.map((c) => ({
        id: c.id,
        type: 'anonymous' as const,
        code: c.caseCode,
        name: c.displayName,
        age: c.age,
        sex: c.sex,
        visitCount: c._count.consultations,
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

    return this.toPatientResponse(patient, 0);
  }

  async updatePatient(clinicId: string, patientId: string, dto: UpdatePatientDto) {
    const existing = await this.prisma.patient.findFirst({
      where: { id: patientId, clinicId },
      include: { _count: { select: { consultations: true } } },
    });
    if (!existing) throw new NotFoundException('Patient not found');

    const patient = await this.prisma.patient.update({
      where: { id: patientId },
      data: {
        name: dto.name?.trim() || undefined,
        sex: dto.sex,
        dateOfBirth:
          dto.dateOfBirth === undefined
            ? undefined
            : dto.dateOfBirth
              ? new Date(dto.dateOfBirth)
              : null,
        phone: dto.phone === undefined ? undefined : dto.phone.trim() || null,
        memo: dto.memo === undefined ? undefined : dto.memo.trim() || null,
      },
    });

    return this.toPatientResponse(patient, existing._count.consultations);
  }

  private toPatientResponse(
    patient: {
      id: string;
      patientCode: string;
      name: string;
      sex: string | null;
      dateOfBirth: Date | null;
      phone: string | null;
      memo: string | null;
    },
    visitCount: number,
  ) {
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
      dateOfBirth: patient.dateOfBirth?.toISOString().slice(0, 10) ?? null,
      phone: patient.phone,
      memo: patient.memo,
      visitCount,
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
      visitCount: 0,
    };
  }

  /** 新規（匿名）→ リピーター（患者マスタ）へ昇格し、関連診療を付け替える */
  async promoteAnonymousToPatient(
    clinicId: string,
    anonymousCaseId: string,
    name?: string,
  ) {
    const anon = await this.prisma.anonymousCase.findFirst({
      where: { id: anonymousCaseId, clinicId },
    });
    if (!anon) {
      throw new NotFoundException('Anonymous case not found');
    }

    const patient = await this.createPatient(clinicId, {
      name: (name?.trim() || anon.displayName).trim(),
      sex: anon.sex === 'M' || anon.sex === 'F' ? anon.sex : undefined,
    });

    await this.prisma.consultation.updateMany({
      where: { anonymousCaseId, clinicId },
      data: { patientId: patient.id, anonymousCaseId: null },
    });

    const visitCount = await this.prisma.consultation.count({
      where: { patientId: patient.id },
    });

    return { ...patient, visitCount };
  }
}
