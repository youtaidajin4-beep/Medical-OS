import { Logger } from '@nestjs/common';
import { SttProvider, SttTranscriptSegment } from './stt.provider';
import { isAbortError } from './openai-retry.util';

export interface OpenAiSttConfig {
  apiKey: string;
  model?: string;
  fallbackModel?: string;
}

const MIN_AUDIO_BYTES = 1024;
/** OpenAI Whisper hard limit is 25MB; reject earlier with a clear message. */
const WHISPER_MAX_UPLOAD_BYTES = 24 * 1024 * 1024;
const MAX_RETRIES = 3;
/** Long visits (~20min) need headroom; fail instead of hanging forever. */
const STT_FETCH_TIMEOUT_MS = 15 * 60 * 1000;
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

/** リクエストの作り方が悪くて断られた種類のエラーか（作り直せば通る可能性がある） */
function isBadRequest(error: unknown): boolean {
  return error instanceof Error && /\(4\d\d\)/.test(error.message);
}

/**
 * どの経路で文字起こししたか。
 *
 * 話者分離が落ちると whisper-1 へ黙って下がり、画面には「話者が全部不明」だけが残る。
 * 2026-09-05 に谷口先生が見たのがその状態で、原因が分離の失敗なのか本当に1人しか
 * 喋っていないのかを、あとから区別できなかった。実行ログに経路を残す。
 */
export type SttMode =
  | 'diarize'
  | 'diarize-no-language'
  | 'fallback-whisper'
  | 'whisper';

export class OpenAiSttProvider implements SttProvider {
  readonly name = 'openai';
  private readonly logger = new Logger(OpenAiSttProvider.name);
  private readonly apiKey: string;
  private readonly model: string;
  private readonly fallbackModel: string;
  private lastSttMode: SttMode = 'diarize';
  private lastSttDetail?: string;

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
      this.lastSttMode = 'diarize';
      this.lastSttDetail = undefined;
      try {
        return await this.transcribeDiarized(audio, filename, mimeType);
      } catch (error) {
        const reason = error instanceof Error ? error.message : String(error);
        this.logger.warn(`Diarize STT failed, falling back to ${this.fallbackModel}: ${reason}`);
        // ここへ来た時点で話者分離は失われる。画面には「話者が全部不明」としか
        // 出ないので、理由を実行ログへ残しておく
        this.lastSttMode = 'fallback-whisper';
        this.lastSttDetail = reason;
        return this.transcribeWhisper(
          audio,
          filename,
          mimeType,
          options?.whisperPrompt,
          this.fallbackModel,
        );
      }
    }

    this.lastSttMode = 'whisper';
    this.lastSttDetail = undefined;
    return this.transcribeWhisper(audio, filename, mimeType, options?.whisperPrompt, this.model);
  }

  /** 直近の文字起こしがどの経路だったか。実行ログに残して原因を追えるようにする */
  getLastSttMode(): { mode: SttMode; detail?: string } {
    return { mode: this.lastSttMode, detail: this.lastSttDetail };
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

  /**
   * @param withLanguage `language` を付けるか。
   *   gpt-4o-transcribe-diarize の公式ドキュメントに `language` の記載が無い。
   *   受け付ける実装なら日本語の精度が上がるので既定では送るが、
   *   これが理由で弾かれると話者分離ごと失うため、外して1度やり直せるようにしておく。
   */
  private buildDiarizeForm(
    audio: Buffer,
    filename: string,
    mimeType: string,
    withLanguage: boolean,
  ): FormData {
    const form = new FormData();
    form.append('file', new Blob([audio], { type: mimeType }), filename);
    form.append('model', this.model);
    if (withLanguage) form.append('language', 'ja');
    form.append('response_format', 'diarized_json');
    // 30秒を超える音声では auto が必要。診察は必ず超える
    form.append('chunking_strategy', 'auto');
    return form;
  }

  private async transcribeDiarized(
    audio: Buffer,
    filename: string,
    mimeType: string,
  ): Promise<SttTranscriptSegment[]> {
    let data: DiarizedResponse;
    try {
      data = await this.requestDiarize(audio, filename, mimeType, true);
    } catch (error) {
      // `language` はこのモデルの公式ドキュメントに記載が無い。これが理由で 400 に
      // なっているだけなら、外せば通る。話者分離を捨てる前にもう一度試す。
      if (!isBadRequest(error)) throw error;
      this.logger.warn(
        `Diarize rejected the request; retrying without language: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      this.lastSttMode = 'diarize-no-language';
      data = await this.requestDiarize(audio, filename, mimeType, false);
    }
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
    withLanguage = true,
    attempt = 0,
  ): Promise<DiarizedResponse> {
    const form = this.buildDiarizeForm(audio, filename, mimeType, withLanguage);
    let response: Response;
    try {
      response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${this.apiKey}` },
        signal: AbortSignal.timeout(STT_FETCH_TIMEOUT_MS),
        body: form,
      });
    } catch (error) {
      if (isAbortError(error)) {
        throw new Error('OpenAI STT timed out');
      }
      throw error;
    }

    if (!response.ok) {
      const errorBody = await response.text();
      if ((response.status === 429 || response.status >= 500) && attempt < MAX_RETRIES - 1) {
        const delayMs = Math.min(8000, 1000 * 2 ** attempt);
        this.logger.warn(
          `Diarize retry ${attempt + 1}/${MAX_RETRIES} after ${response.status} (wait ${delayMs}ms)`,
        );
        await new Promise((r) => setTimeout(r, delayMs));
        return this.requestDiarize(audio, filename, mimeType, withLanguage, attempt + 1);
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
    let response: Response;
    try {
      response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${this.apiKey}` },
        signal: AbortSignal.timeout(STT_FETCH_TIMEOUT_MS),
        body: form,
      });
    } catch (error) {
      if (isAbortError(error)) {
        throw new Error('OpenAI STT timed out');
      }
      throw error;
    }

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
