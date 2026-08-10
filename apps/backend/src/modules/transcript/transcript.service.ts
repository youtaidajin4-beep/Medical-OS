import { Inject, Injectable } from '@nestjs/common';
import { DocumentType, SpeakerLabel } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { SttProvider, SttOptions } from '../../providers/ai/stt.provider';
import { STT_PROVIDER } from '../../providers/ai/stt.tokens';
import { TranscriptNormalizer } from '../ai/transcript-normalizer';
import { extractReplacementCandidates } from '../../providers/ai/transcript-diff.util';
import { MedicalGlossaryReplacement } from '../../providers/ai/medical-glossary.types';

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

  async finalizeFromAudio(consultationId: string, audio: Buffer, options?: SttOptions) {
    const rawSegments = await this.sttProvider.transcribeFinal(audio, consultationId, options);
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
            rawText: seg.text,
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

  async replaceFinalTranscript(consultationId: string, correctedText: string) {
    const existing = await this.prisma.transcriptSegment.findMany({
      where: { consultationId, isFinal: true },
      orderBy: { sequenceNumber: 'asc' },
    });

    if (!existing.length) {
      return this.prisma.transcriptSegment.create({
        data: {
          consultationId,
          sequenceNumber: 0,
          rawText: correctedText,
          text: correctedText,
          normalizedText: correctedText,
          speaker: SpeakerLabel.UNKNOWN,
          isFinal: true,
          startMs: 0,
          endMs: 0,
        },
      });
    }

    const [first, ...rest] = existing;
    // Preserve rawText forever — only update display/corrected text fields
    const preservedRaw =
      first!.rawText ??
      existing.map((s) => s.rawText ?? s.text).join('\n');
    await this.prisma.transcriptSegment.update({
      where: { id: first!.id },
      data: {
        rawText: preservedRaw,
        text: correctedText,
        normalizedText: correctedText,
      },
    });
    if (rest.length) {
      await this.prisma.transcriptSegment.deleteMany({
        where: { id: { in: rest.map((seg) => seg.id) } },
      });
    }
    return this.prisma.transcriptSegment.findFirstOrThrow({
      where: { id: first!.id },
    });
  }

  async updateSegmentSpeaker(segmentId: string, speaker: SpeakerLabel) {
    return this.prisma.transcriptSegment.update({
      where: { id: segmentId },
      data: { speaker },
    });
  }

  async saveTranscriptEdits(
    consultationId: string,
    physicianId: string,
    segments: Array<{ id: string; text: string }>,
  ): Promise<{ segments: Awaited<ReturnType<TranscriptService['getSegments']>>; suggestedReplacements: MedicalGlossaryReplacement[] }> {
    const existing = await this.getSegments(consultationId, { final: true });
    const beforeText = this.toFullText(existing);

    await Promise.all(
      segments.map((seg) =>
        this.prisma.transcriptSegment.update({
          where: { id: seg.id },
          data: { text: seg.text, normalizedText: seg.text },
        }),
      ),
    );

    const updated = await this.getSegments(consultationId, { final: true });
    const afterText = this.toFullText(updated);
    if (beforeText !== afterText) {
      await this.prisma.revisionHistory.create({
        data: {
          consultationId,
          documentType: DocumentType.TRANSCRIPT,
          fieldName: 'fullText',
          beforeValue: beforeText,
          afterValue: afterText,
          changedById: physicianId,
        },
      });
    }

    return {
      segments: updated,
      suggestedReplacements: extractReplacementCandidates(beforeText, afterText),
    };
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
