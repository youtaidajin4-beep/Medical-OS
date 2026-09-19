import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';

export interface AuthUser {
  sub: string;
  email: string;
  role: string;
  clinicId: string;
}

/**
 * ログインした人のトークンから、その人と所属クリニックを決める。
 *
 * 以前は SINGLE_CLINIC_MODE という抜け道があり、**トークンが何であっても
 * 決まった医師として通していた**（1医院しか無い前提の近道）。
 * 院が増えると他院のデータへ入れてしまうので外した。本番は以前からJWTで動いている。
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request & { user?: AuthUser }>();
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
