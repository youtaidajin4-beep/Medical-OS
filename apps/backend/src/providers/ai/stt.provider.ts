import { mockScenarioContext } from './mock-scenario-context';
import { MOCK_SCENARIOS } from './mock-scenarios';

export interface SttTranscriptSegment {
  text: string;
  speaker?: 'physician' | 'patient' | 'other' | 'unknown';
  confidence?: number;
  startMs?: number;
  endMs?: number;
}

export interface SttProvider {
  readonly name: string;
  transcribeStream?(
    chunk: Buffer,
    sequenceNumber: number,
    consultationId?: string,
  ): Promise<SttTranscriptSegment | null>;
  transcribeFinal(audio: Buffer, consultationId?: string): Promise<SttTranscriptSegment[]>;
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

  async transcribeFinal(_audio: Buffer, consultationId?: string): Promise<SttTranscriptSegment[]> {
    const scenario = this.resolveScenario(consultationId);
    return scenario.transcript;
  }
}
