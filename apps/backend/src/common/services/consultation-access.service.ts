import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class ConsultationAccessService {
  constructor(private readonly prisma: PrismaService) {}

  async assertPhysicianOwns(
    consultationId: string,
    physicianId: string,
    clinicId?: string,
  ) {
    const consultation = await this.prisma.consultation.findUnique({
      where: { id: consultationId },
      select: { physicianId: true, clinicId: true },
    });
    if (!consultation) {
      throw new NotFoundException('Consultation not found');
    }
    if (consultation.physicianId !== physicianId) {
      throw new ForbiddenException('Access denied to this consultation');
    }
    if (clinicId && consultation.clinicId !== clinicId) {
      throw new ForbiddenException('Access denied to this consultation');
    }
    return consultation;
  }
}
