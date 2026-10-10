import { ForbiddenException } from '@nestjs/common';
import { QualityService } from '../src/modules/quality/quality.service';
import { PrismaService } from '../src/database/prisma.service';
import { MedicalKnowledgeService } from '../src/modules/medical-knowledge/medical-knowledge.service';

function serviceWith(env: Record<string, string>) {
  const config = { get: (key: string, fallback?: string) => env[key] ?? fallback };
  return new QualityService(
    {} as PrismaService,
    config as never,
    {} as MedicalKnowledgeService,
  );
}

const user = (role: string, email = 'doctor@example.com') => ({
  sub: 'u1',
  email,
  role,
  clinicId: 'c1',
});

describe('管理画面の閲覧権限', () => {
  it('管理者（ADMIN）は見られる', () => {
    expect(() => serviceWith({}).assertAdmin(user('ADMIN'))).not.toThrow();
  });

  it('医師は見られない。診察の最中に開く画面へ数字が出ないようにするため', () => {
    expect(() => serviceWith({}).assertAdmin(user('PHYSICIAN'))).toThrow(ForbiddenException);
  });

  it('QUALITY_ADMIN_EMAILS に載っている人は、ロールが医師でも見られる（大文字小文字は問わない）', () => {
    const svc = serviceWith({ QUALITY_ADMIN_EMAILS: 'Owner@Example.com, other@example.com' });
    expect(() => svc.assertAdmin(user('PHYSICIAN', 'owner@example.com'))).not.toThrow();
    expect(() => svc.assertAdmin(user('PHYSICIAN', 'doctor@example.com'))).toThrow(ForbiddenException);
  });

  it('QUALITY_MEASUREMENT=off で計測を止められる', () => {
    expect(serviceWith({}).isEnabled()).toBe(true);
    expect(serviceWith({ QUALITY_MEASUREMENT: 'off' }).isEnabled()).toBe(false);
  });
});
