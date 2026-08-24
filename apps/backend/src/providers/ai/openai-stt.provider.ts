import { Logger } from '@nestjs/common';
import { SttProvider, SttTranscriptSegment } from './stt.provider';

export interface OpenAiSttConfig {
  apiKey: string;
  model?: string;
  fallbackModel?: string;
}

const MIN_AUDIO_BYTES = 1024;
/** OpenAI Whisper hard limit is 25MB; reject earlier with a clear message. */
const WHISPER_MAX_UPLOAD_BYTES = 24 * 1024 * 1024;
const MAX_RETRIES = 3;
const WHISPER_HALLUCINATION_PATTERNS = [
  /ご視聴ありがとうございました/,
  /ご視聴ありがとうございます/,
  /字幕/,
  /チャンネル登録/,
];

const DIARIZE_MODEL = 'gpt-4o-transcribe-diarize';

type WhisperSegment = {
  id: number;
  start: number;
  end: number;
  text: string;
};

type WhisperVerboseResponse = {
  text?: string;
  segments?: WhisperSegment[];
};

type DiarizedSegment = {
  speaker?: string;
  text?: string;
  start?: number;
  end?: number;
};

type DiarizedResponse = {
  text?: string;
  segments?: DiarizedSegment[];
  duration?: number;
};

function isDiarizeModel(model: string): boolean {
  return model.includes('diarize');
}

export class OpenAiSttProvider implements SttProvider {
  readonly name = 'openai';
  private readonly logger = new Logger(OpenAiSttProvider.name);
  private readonly apiKey: string;
  private readonly model: string;
  private readonly fallbackModel: string;

  constructor(config: OpenAiSttConfig) {
    this.apiKey = config.apiKey;
    this.model = config.model ?? DIARIZE_MODEL;
    this.fallbackModel = config.fallbackModel ?? 'whisper-1';
  }

  async transcribeStream(
    _chunk: Buffer,
    _sequenceNumber: number,
    _consultationId?: string,
  ): Promise<SttTranscriptSegment | null> {
    return null;
  }

  async transcribeFinal(
    audio: Buffer,
    _consultationId?: string,
    options?: { whisperPrompt?: string },
  ): Promise<SttTranscriptSegment[]> {
    this.assertApiKey();
    if (audio.length < MIN_AUDIO_BYTES) {
      throw new Error(
        '音声データが短すぎます。マイクの入力を確認し、30秒以上録音してから再試行してください。',
      );
    }
    if (audio.length > WHISPER_MAX_UPLOAD_BYTES) {
      throw new Error(
        `録音が長すぎます（約${Math.round(audio.length / (1024 * 1024))}MB）。短く区切って録り直すか、診療を分割してください。`,
      );
    }
    const header = audio.subarray(0, 4).toString('ascii');
    const isWav = header === 'RIFF';
    const isId3 = audio.length > 2 && audio[0] === 0x49 && audio[1] === 0x44 && audio[2] === 0x33;
    const isMp3Frame = audio.length > 1 && audio[0] === 0xff && (audio[1]! & 0xe0) === 0xe0;
    const isMp3 = isId3 || isMp3Frame;
    const filename = isWav ? 'consultation.wav' : isMp3 ? 'consultation.mp3' : 'consultation.webm';
    const mimeType = isWav ? 'audio/wav' : isMp3 ? 'audio/mpeg' : 'audio/webm';

    if (isDiarizeModel(this.model)) {
      try {
        return await this.transcribeDiarized(audio, filename, mimeType);
      } catch (error) {
        this.logger.warn(
          `Diarize STT failed, falling back to ${this.fallbackModel}: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
        return this.transcribeWhisper(
          audio,
          filename,
          mimeType,
          options?.whisperPrompt,
          this.fallbackModel,
        );
      }
    }

    return this.transcribeWhisper(audio, filename, mimeType, options?.whisperPrompt, this.model);
  }

  private assertApiKey() {
    if (!this.apiKey) {
      throw new Error('OPENAI_API_KEY is required when STT_PROVIDER=openai');
    }
  }

  private buildWhisperForm(
    audio: Buffer,
    filename: string,
    mimeType: string,
    model: string,
    whisperPrompt?: string,
  ): FormData {
    const form = new FormData();
    form.append('file', new Blob([audio], { type: mimeType }), filename);
    form.append('model', model);
    form.append('language', 'ja');
    form.append('response_format', 'verbose_json');
    form.append('temperature', '0');
    if (whisperPrompt?.trim()) {
      form.append('prompt', whisperPrompt.trim());
    }
    return form;
  }

  private buildDiarizeForm(audio: Buffer, filename: string, mimeType: string): FormData {
    const form = new FormData();
    form.append('file', new Blob([audio], { type: mimeType }), filename);
    form.append('model', this.model);
    form.append('language', 'ja');
    form.append('response_format', 'diarized_json');
    form.append('chunking_strategy', 'auto');
    return form;
  }

  private async transcribeDiarized(
    audio: Buffer,
    filename: string,
    mimeType: string,
  ): Promise<SttTranscriptSegment[]> {
    const data = await this.requestDiarize(audio, filename, mimeType);
    const segments = (data.segments ?? [])
      .map((seg) => ({
        text: (seg.text ?? '').trim(),
        speaker: 'unknown' as const,
        diarizationLabel: (seg.speaker ?? '').trim() || undefined,
        confidence: 0.9,
        startMs: Math.round((seg.start ?? 0) * 1000),
        endMs: Math.round((seg.end ?? seg.start ?? 0) * 1000),
      }))
      .filter((seg) => seg.text.length > 0);

    if (segments.length) {
      const combined = segments.map((s) => s.text).join('');
      this.assertTranscriptQuality(audio.length, combined);
      return segments;
    }

    const text = data.text?.trim();
    if (!text) {
      throw new Error(
        '文字起こし結果が空です。マイク入力または音声形式を確認してください。',
      );
    }
    this.assertTranscriptQuality(audio.length, text);
    return [{ text, speaker: 'unknown', confidence: 0.85, startMs: 0, endMs: 0 }];
  }

  private async transcribeWhisper(
    audio: Buffer,
    filename: string,
    mimeType: string,
    whisperPrompt: string | undefined,
    model: string,
  ): Promise<SttTranscriptSegment[]> {
    const data = await this.requestWhisper(audio, filename, mimeType, whisperPrompt, model);
    const segments = data.segments?.length
      ? data.segments
          .map((seg) => ({
            text: seg.text.trim(),
            speaker: 'unknown' as const,
            confidence: 0.85,
            startMs: Math.round(seg.start * 1000),
            endMs: Math.round(seg.end * 1000),
          }))
          .filter((seg) => seg.text.length > 0)
      : null;

    if (segments?.length) {
      const combined = segments.map((s) => s.text).join('');
      this.assertTranscriptQuality(audio.length, combined);
      return segments;
    }

    const text = data.text?.trim();
    if (!text) {
      throw new Error(
        '文字起こし結果が空です。マイク入力または音声形式を確認してください。',
      );
    }
    this.assertTranscriptQuality(audio.length, text);
    return [{ text, speaker: 'unknown', confidence: 0.85, startMs: 0, endMs: 0 }];
  }

  private assertTranscriptQuality(audioBytes: number, text: string) {
    if (
      audioBytes < 50_000 &&
      WHISPER_HALLUCINATION_PATTERNS.some((pattern) => pattern.test(text))
    ) {
      throw new Error(
        '音声が正しく録音されていない可能性があります。マイクの距離・権限・音量を確認し、30秒以上話してから再試行してください。',
      );
    }
  }

  private async requestDiarize(
    audio: Buffer,
    filename: string,
    mimeType: string,
    attempt = 0,
  ): Promise<DiarizedResponse> {
    const form = this.buildDiarizeForm(audio, filename, mimeType);
    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${this.apiKey}` },
      body: form,
    });

    if (!response.ok) {
      const errorBody = await response.text();
      if ((response.status === 429 || response.status >= 500) && attempt < MAX_RETRIES - 1) {
        const delayMs = Math.min(8000, 1000 * 2 ** attempt);
        this.logger.warn(
          `Diarize retry ${attempt + 1}/${MAX_RETRIES} after ${response.status} (wait ${delayMs}ms)`,
        );
        await new Promise((r) => setTimeout(r, delayMs));
        return this.requestDiarize(audio, filename, mimeType, attempt + 1);
      }
      if (response.status === 429) {
        throw new Error('混み合っています。しばらく待ってから再試行してください。');
      }
      if (response.status >= 500) {
        throw new Error(
          '混み合っています。再試行してください。改善しない場合は紙カルテで継続してください。',
        );
      }
      throw new Error(`OpenAI diarize STT failed (${response.status}): ${errorBody}`);
    }

    return (await response.json()) as DiarizedResponse;
  }

  private async requestWhisper(
    audio: Buffer,
    filename: string,
    mimeType: string,
    whisperPrompt: string | undefined,
    model: string,
    attempt = 0,
  ): Promise<WhisperVerboseResponse> {
    const form = this.buildWhisperForm(audio, filename, mimeType, model, whisperPrompt);
    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${this.apiKey}` },
      body: form,
    });

    if (!response.ok) {
      const errorBody = await response.text();
      if ((response.status === 429 || response.status >= 500) && attempt < MAX_RETRIES - 1) {
        const delayMs = Math.min(8000, 1000 * 2 ** attempt);
        this.logger.warn(
          `Whisper retry ${attempt + 1}/${MAX_RETRIES} after ${response.status} (wait ${delayMs}ms)`,
        );
        await new Promise((r) => setTimeout(r, delayMs));
        return this.requestWhisper(audio, filename, mimeType, whisperPrompt, model, attempt + 1);
      }
      if (response.status === 429) {
        throw new Error('混み合っています。しばらく待ってから再試行してください。');
      }
      if (response.status >= 500) {
        throw new Error(
          '混み合っています。再試行してください。改善しない場合は紙カルテで継続してください。',
        );
      }
      throw new Error(`OpenAI Whisper failed (${response.status}): ${errorBody}`);
    }

    return (await response.json()) as WhisperVerboseResponse;
  }
}
