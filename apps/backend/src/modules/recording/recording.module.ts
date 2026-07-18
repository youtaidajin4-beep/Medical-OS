import { Module, forwardRef } from '@nestjs/common';
import { RecordingController } from './recording.controller';
import { RecordingService } from './recording.service';
import { AudioAssemblerService } from './audio-assembler.service';
import { TranscriptModule } from '../transcript/transcript.module';

@Module({
  imports: [forwardRef(() => TranscriptModule)],
  controllers: [RecordingController],
  providers: [RecordingService, AudioAssemblerService],
  exports: [RecordingService],
})
export class RecordingModule {}
