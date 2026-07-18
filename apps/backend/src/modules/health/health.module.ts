import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';
import { AiConfigModule } from '../../providers/ai/ai-config.module';

@Module({
  imports: [AiConfigModule],
  controllers: [HealthController],
  providers: [HealthService],
})
export class HealthModule {}
