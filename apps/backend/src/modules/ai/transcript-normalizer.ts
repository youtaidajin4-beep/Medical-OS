import { SttTranscriptSegment } from '../../providers/ai/stt.provider';

export class TranscriptNormalizer {
  normalize(segments: SttTranscriptSegment[]): SttTranscriptSegment[] {
    return segments.map((segment) => ({
      ...segment,
      text: this.normalizeText(segment.text),
      speaker: this.normalizeSpeaker(segment),
    }));
  }

  private normalizeText(text: string): string {
    let normalized = text.trim();
    normalized = normalized.replace(/\s+/g, ' ');
    normalized = normalized.replace(/([。、！？])\1+/g, '$1');
    if (normalized && !/[。！？]$/.test(normalized)) {
      normalized = `${normalized}。`;
    }
    return normalized;
  }

  private normalizeSpeaker(segment: SttTranscriptSegment): SttTranscriptSegment['speaker'] {
    if ((segment.confidence ?? 1) < 0.7) {
      return 'unknown';
    }
    return segment.speaker ?? 'unknown';
  }
}
