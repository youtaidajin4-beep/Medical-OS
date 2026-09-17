import { Inject, Injectable } from '@nestjs/common';
import { DocumentType, SpeakerLabel } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { SttProvider, SttOptions } from '../../providers/ai/stt.provider';
import { STT_PROVIDER } from '../../providers/ai/stt.tokens';
import { TranscriptNormalizer } from '../ai/transcript-normalizer';
import { extractReplacementCandidates } from '../../providers/ai/transcript-diff.util';
import { stripLoopedSegments } from '../../providers/ai/transcript-hallucination';
import { MedicalGlossaryReplacement } from '../../providers/ai/medical-glossary.types';
import {
  formatSpeakerPrefixedTranscript,
  mapSpeakerRoles,
} from '../../providers/ai/speaker-role-mapper';

const SPEAKER_MAP: Record<string, SpeakerLabel> = {
  physician: SpeakerLabel.PHYSICIAN,
  patient: SpeakerLabel.PATIENT,
  other: SpeakerLabel.OTHER,
  unknown: SpeakerLabel.UNKNOWN,
};

export type FinalizeAudioOptions = SttOptions & {
  resolvePhysicianLabel?: (
    labelA: string,
    labelB: string,
    sampleA: string,
    sampleB: string,
  ) => Promise<'A' | 'B' | null>;
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

  async finalizeFromAudio(consultationId: string, audio: Buffer, options?: FinalizeAudioOptions) {
    const rawSegments = await this.sttProvider.transcribeFinal(audio, consultationId, options);
    const withRoles = await mapSpeakerRoles(rawSegments, {
      resolvePhysicianLabel: options?.resolvePhysicianLabel,
    });
    const normalizedSegments = this.normalizer.normalize(withRoles);

    // 「読み 読み 読み…」のようなループ・ハルシネーションを落とす。
    // 残したままだと SOAP と書類の材料に混ざる（2026-09-05 谷口先生の画面）。
    const { kept, dropped } = stripLoopedSegments(normalizedSegments);

    // 話者分離が効いたか。ラベルが1つ以下なら speaker-role-mapper が全員 unknown にするため、
    // 画面が「不明」で埋まる。黙って埋めずに、医師へ伝えられるよう件数を返す。
    const diarizationSpeakers = new Set(
      rawSegments.map((seg) => seg.diarizationLabel?.trim()).filter(Boolean),
    ).size;

    // 以前はセグメントを1件ずつ Promise.all で並列 INSERT していた。20分の診療なら
    // 数十〜数百件が一斉に接続を取りに行き、Supabase のプール（session mode・15本）を
    // 使い切って EMAXCONNSESSION で診療そのものが落ちていた（2026-09-05 谷口先生の報告）。
    // 削除と一括作成を1トランザクション＝1接続にまとめる。
    const rows = kept.map((seg, i) => ({
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
    }));

    await this.prisma.$transaction([
      this.prisma.transcriptSegment.deleteMany({ where: { consultationId } }),
      this.prisma.transcriptSegment.createMany({ data: rows }),
    ]);

    return {
      segments: await this.getSegments(consultationId, { final: true }),
      quality: {
        droppedLoopSegments: dropped.length,
        diarizationSpeakers,
      },
    };
  }

  /**
   * @deprecated Prefer updateFinalSegmentTexts to preserve diarized speakers.
   * Kept for single-segment / empty cases and backward-compatible callers.
   */
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

    if (existing.length === 1) {
      const first = existing[0]!;
      return this.prisma.transcriptSegment.update({
        where: { id: first.id },
        data: {
          rawText: first.rawText ?? first.text,
          text: correctedText,
          normalizedText: correctedText,
        },
      });
    }

    const strippedLines = correctedText
      .split('\n')
      .map((l) => l.replace(/^(医師|患者|不明)[:：]\s*/, '').trim())
      .filter((l) => l.length > 0);

    if (strippedLines.length === existing.length) {
      await this.updateFinalSegmentTexts(
        consultationId,
        existing.map((seg, i) => ({ id: seg.id, text: strippedLines[i]! })),
      );
      return this.prisma.transcriptSegment.findFirstOrThrow({ where: { id: existing[0]!.id } });
    }

    // Last resort: do not delete speakers — leave segment texts unchanged for multi-seg mismatch.
    // Callers should use updateFinalSegmentTexts.
    return this.prisma.transcriptSegment.findFirstOrThrow({ where: { id: existing[0]!.id } });
  }

  async updateFinalSegmentTexts(
    consultationId: string,
    updates: Array<{ id: string; text: string }>,
  ) {
    // 1接続で順に流す。並列 update は接続プールを食い潰す（finalizeFromAudio と同じ理由）
    await this.prisma.$transaction(
      updates.map((u) =>
        this.prisma.transcriptSegment.update({
          where: { id: u.id },
          data: { text: u.text, normalizedText: u.text },
        }),
      ),
    );
    return this.getSegments(consultationId, { final: true });
  }

  toSpeakerPrefixedText(
    segments: Array<{ text: string; speaker?: SpeakerLabel | string | null }>,
  ): string {
    return formatSpeakerPrefixedTranscript(segments);
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
  ): Promise<{
    segments: Awaited<ReturnType<TranscriptService['getSegments']>>;
    suggestedReplacements: MedicalGlossaryReplacement[];
  }> {
    const existing = await this.getSegments(consultationId, { final: true });
    const beforeText = this.toFullText(existing);

    // 1接続で順に流す（並列 update は接続プールを食い潰す）
    await this.prisma.$transaction(
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
