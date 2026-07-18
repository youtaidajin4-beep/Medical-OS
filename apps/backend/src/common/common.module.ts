import { Global, Module } from '@nestjs/common';
import { ConsultationAccessService } from './services/consultation-access.service';

@Global()
@Module({
  providers: [ConsultationAccessService],
  exports: [ConsultationAccessService],
})
export class CommonModule {}
