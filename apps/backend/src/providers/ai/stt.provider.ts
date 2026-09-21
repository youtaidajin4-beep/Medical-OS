import { mockScenarioContext } from './mock-scenario-context';
import { MOCK_SCENARIOS } from './mock-scenarios';

export interface SttTranscriptSegment {
  text: string;
  speaker?: 'physician' | 'patient' | 'other' | 'unknown';
  /** Anonymous label from diarization API (e.g. speaker_0, A) before role mapping. */
  diarizationLabel?: string;
  confidence?: number;
  startMs?: number;
  endMs?: number;
}

export type SttOptions = {
  whisperPrompt?: string;
};

export type DictationOptions = {
  /** 出てくる語をモデルへ先に教える。薬剤名・病名の取り違えが目に見えて減る */
  vocabularyPrompt?: string;
};

export interface SttProvider {
  readonly name: string;
  transcribeStream?(
    chunk: Buffer,
    sequenceNumber: number,
    consultationId?: string,
  ): Promise<SttTranscriptSegment | null>;
  transcribeFinal(
    audio: Buffer,
    consultationId?: string,
    options?: SttOptions,
  ): Promise<SttTranscriptSegment[]>;
  /**
   * 医師がチャットへ口述する短い指示の文字起こし。
   *
   * 診察の録音と違って話し手は医師ひとりなので、話者分離は要らない。
   * 分離モデルは語彙のヒントを受け付けない（APIが拒否する）ため、
   * 分離を外して語彙を渡すほうが速くて正確になる。
   * 実測（同じ音声）: 分離 8.3秒「症状名は高血圧症と乳糖尿病、老削皮の共通の疑い」
   * → 語彙つき 1.9秒「病名は高血圧症と2型糖尿病、あと労作時の胸痛の疑い」
   */
  transcribeDictation?(audio: Buffer, options?: DictationOptions): Promise<string>;
}

export class MockSttProvider implements SttProvider {
  readonly name = 'mock';

  private resolveScenario(consultationId?: string) {
    if (consultationId) {
      const fromContext = mockScenarioContext.get(consultationId);
      if (fromContext) return fromContext;
    }
    return MOCK_SCENARIOS['P-001']!;
  }

  async transcribeStream(
    chunk: Buffer,
    sequenceNumber: number,
    consultationId?: string,
  ): Promise<SttTranscriptSegment | null> {
    if (chunk.length < 64) return null;
    const scenario = this.resolveScenario(consultationId);
    const text = scenario.previewLines[sequenceNumber % scenario.previewLines.length] ?? '（音声を認識中…）';
    return {
      text,
      speaker: 'unknown',
      confidence: 0.55,
      startMs: sequenceNumber * 3000,
      endMs: (sequenceNumber + 1) * 3000,
    };
  }

  async transcribeFinal(
    _audio: Buffer,
    consultationId?: string,
    _options?: SttOptions,
  ): Promise<SttTranscriptSegment[]> {
    const scenario = this.resolveScenario(consultationId);
    return scenario.transcript;
  }
}
