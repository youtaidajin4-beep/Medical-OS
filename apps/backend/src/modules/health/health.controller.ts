import { Controller, Get } from '@nestjs/common';
import { APP_VERSION } from '@medical-os/shared';
import { HealthService } from './health.service';

@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  getHealth() {
    return this.healthService.getOverall();
  }

  @Get('database')
  getDatabaseHealth() {
    return this.healthService.getDatabase();
  }

  @Get('storage')
  getStorageHealth() {
    return this.healthService.getStorage();
  }

  @Get('ai')
  getAiHealth() {
    return this.healthService.getAi();
  }
}

export { APP_VERSION };
