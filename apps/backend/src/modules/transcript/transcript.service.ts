import { Inject, Injectable } from '@nestjs/common';
import { SpeakerLabel } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { SttProvider } from '../../providers/ai/stt.provider';
import { STT_PROVIDER } from '../../providers/ai/stt.tokens';
import { TranscriptNormalizer } from '../ai/transcript-normalizer';

const SPEAKER_MAP: Record<string, SpeakerLabel> = {
  physician: SpeakerLabel.PHYSICIAN,
  patient: SpeakerLabel.PATIENT,
  other: SpeakerLabel.OTHER,
  unknown: SpeakerLabel.UNKNOWN,
};

@Injectable()
export class TranscriptService {
  private readonly normalizer = new TranscriptNormalizer();

  constructor(
    private readonly prisma: PrismaService,
    @Inject(STT_PROVIDER) private readonly sttProvider: SttProvider,
  ) {}

  async processPreviewChunk(consultationId: string, sequenceNumber: number, buffer: Buffer) {
    if (this.sttProvider.name === 'openai') return null;
    if (!this.sttProvider.transcribeStream) return null;

    const preview = await this.sttProvider.transcribeStream(buffer, sequenceNumber, consultationId);
    if (!preview?.text) return null;

    const normalized = this.normalizer.normalize([preview])[0];
    if (!normalized) return null;

    await this.prisma.transcriptSegment.deleteMany({
      where: { consultationId, sequenceNumber, isFinal: false },
    });

    return this.prisma.transcriptSegment.create({
      data: {
        consultationId,
        sequenceNumber,
        text: preview.text,
        normalizedText: normalized.text,
        speaker: SPEAKER_MAP[normalized.speaker ?? 'unknown'],
        confidence: preview.confidence,
        isFinal: false,
        startMs: preview.startMs,
        endMs: preview.endMs,
      },
    });
  }

  async finalizeFromAudio(consultationId: string, audio: Buffer) {
    const rawSegments = await this.sttProvider.transcribeFinal(audio, consultationId);
    const normalizedSegments = this.normalizer.normalize(rawSegments);

    await this.prisma.transcriptSegment.deleteMany({
      where: { consultationId, isFinal: false },
    });

    const segments = await Promise.all(
      normalizedSegments.map((seg, i) =>
        this.prisma.transcriptSegment.create({
          data: {
            consultationId,
            sequenceNumber: i,
            text: seg.text,
            normalizedText: seg.text,
            speaker: SPEAKER_MAP[seg.speaker ?? 'unknown'],
            confidence: seg.confidence,
            isFinal: true,
            startMs: seg.startMs ?? i * 5000,
            endMs: seg.endMs ?? (i + 1) * 5000,
          },
        }),
      ),
    );

    return segments;
  }

  async updateSegmentSpeaker(segmentId: string, speaker: SpeakerLabel) {
    return this.prisma.transcriptSegment.update({
      where: { id: segmentId },
      data: { speaker },
    });
  }

  async getSegments(consultationId: string, options?: { final?: boolean }) {
    return this.prisma.transcriptSegment.findMany({
      where: {
        consultationId,
        ...(options?.final !== undefined ? { isFinal: options.final } : {}),
      },
      orderBy: { sequenceNumber: 'asc' },
    });
  }

  toFullText(segments: Array<{ text: string }>): string {
    return segments.map((s) => s.text).join('\n');
  }
}
