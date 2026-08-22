import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { PrismaService } from '../../database/prisma.service';

export interface AuthUser {
  sub: string;
  email: string;
  role: string;
  clinicId: string;
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request & { user?: AuthUser }>();
    if (this.config.get<string>('SINGLE_CLINIC_MODE', 'false') === 'true') {
      const email = this.config.get<string>('SINGLE_CLINIC_PHYSICIAN_EMAIL', 'doctor@demo.clinic');
      const physician = await this.prisma.user.findUnique({
        where: { email },
        select: { id: true, email: true, role: true, clinicId: true },
      });
      if (!physician) {
        throw new UnauthorizedException(
          'Single-clinic physician is not seeded. Run the database seed first.',
        );
      }
      request.user = {
        sub: physician.id,
        email: physician.email,
        role: physician.role,
        clinicId: physician.clinicId,
      };
      return true;
    }

    const authHeader = request.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing authorization token');
    }
    try {
      const token = authHeader.slice(7);
      request.user = this.jwtService.verify<AuthUser>(token);
      return true;
    } catch {
      throw new UnauthorizedException('Invalid token');
    }
  }
}
