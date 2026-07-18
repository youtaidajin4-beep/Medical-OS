import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { LoggerModule } from 'nestjs-pino';
import { PrismaModule } from './database/prisma.module';
import { HealthModule } from './modules/health/health.module';
import { AuthModule } from './modules/auth/auth.module';
import { PatientsModule } from './modules/patients/patients.module';
import { ConsultationsModule } from './modules/consultations/consultations.module';
import { RecordingModule } from './modules/recording/recording.module';
import { TranscriptModule } from './modules/transcript/transcript.module';
import { AiModule } from './modules/ai/ai.module';
import { AuditModule } from './modules/audit/audit.module';
import { SettingsModule } from './modules/settings/settings.module';
import { DocumentsModule } from './modules/documents/documents.module';
import { AiConfigModule } from './providers/ai/ai-config.module';
import { StorageModule } from './providers/storage/storage.module';
import { CommonModule } from './common/common.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    AiConfigModule,
    CommonModule,
    StorageModule,
    LoggerModule.forRoot({
      pinoHttp: {
        transport:
          process.env.NODE_ENV !== 'production'
            ? { target: 'pino/file', options: { destination: 1 } }
            : undefined,
        redact: ['req.headers.authorization', 'password'],
      },
    }),
    PrismaModule,
    HealthModule,
    AuthModule,
    PatientsModule,
    ConsultationsModule,
    RecordingModule,
    TranscriptModule,
    AiModule,
    AuditModule,
    SettingsModule,
    DocumentsModule,
  ],
})
export class AppModule {}
