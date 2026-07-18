import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';

describe('HealthController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue({
        $connect: jest.fn(),
        $disconnect: jest.fn(),
        $queryRaw: jest.fn().mockResolvedValue([{ '?column?': 1 }]),
      })
      .compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('/api/v1/health (GET)', () => {
    return request(app.getHttpServer())
      .get('/api/v1/health')
      .expect(200)
      .expect((res) => {
        expect(res.body.status).toBe('ok');
        expect(res.body.service).toBe('medical-os-backend');
      });
  });

  it('/api/v1/health/ai (GET)', () => {
    return request(app.getHttpServer())
      .get('/api/v1/health/ai')
      .expect(200)
      .expect((res) => {
        expect(res.body.subsystem).toBe('ai');
        expect(res.body).toHaveProperty('sttProvider');
        expect(res.body).toHaveProperty('llmProvider');
        expect(res.body).toHaveProperty('apiKeyConfigured');
      });
  });
});
