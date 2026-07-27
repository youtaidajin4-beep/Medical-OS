import { Inject, Injectable, Logger } from '@nestjs/common';
import { SttProvider, SttTranscriptSegment } from './stt.provider';

export interface OpenAiSttConfig {
  apiKey: string;
  model?: string;
}

const MIN_AUDIO_BYTES = 1024;
const WHISPER_HALLUCINATION_PATTERNS = [
  /ご視聴ありがとうございました/,
  /ご視聴ありがとうございます/,
  /字幕/,
  /チャンネル登録/,
];

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

export class OpenAiSttProvider implements SttProvider {
  readonly name = 'openai';
  private readonly logger = new Logger(OpenAiSttProvider.name);
  private readonly apiKey: string;
  private readonly model: string;

  constructor(config: OpenAiSttConfig) {
    this.apiKey = config.apiKey;
    this.model = config.model ?? 'whisper-1';
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
    const isWav = audio.length > 4 && audio.toString('ascii', 0, 4) === 'RIFF';
    const filename = isWav ? 'consultation.wav' : 'consultation.webm';
    const mimeType = isWav ? 'audio/wav' : 'audio/webm';
    return this.transcribeBuffer(audio, filename, mimeType, options?.whisperPrompt);
  }

  private assertApiKey() {
    if (!this.apiKey) {
      throw new Error('OPENAI_API_KEY is required when STT_PROVIDER=openai');
    }
  }

  private async transcribeBuffer(
    audio: Buffer,
    filename: string,
    mimeType: string,
    whisperPrompt?: string,
  ): Promise<SttTranscriptSegment[]> {
    const form = new FormData();
    form.append('file', new Blob([audio], { type: mimeType }), filename);
    form.append('model', this.model);
    form.append('language', 'ja');
    form.append('response_format', 'verbose_json');
    form.append('temperature', '0');
    if (whisperPrompt?.trim()) {
      form.append('prompt', whisperPrompt.trim());
    }

    const data = await this.requestWhisper(form);
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

  private async requestWhisper(form: FormData, attempt = 0): Promise<WhisperVerboseResponse> {
    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${this.apiKey}` },
      body: form,
    });

    if (!response.ok) {
      const errorBody = await response.text();
      if ((response.status === 429 || response.status >= 500) && attempt < 1) {
        this.logger.warn(`Whisper retry after ${response.status}`);
        await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
        return this.requestWhisper(form, attempt + 1);
      }
      throw new Error(`OpenAI Whisper failed (${response.status}): ${errorBody}`);
    }

    return (await response.json()) as WhisperVerboseResponse;
  }
}
