/**
 * 診察中のストリーミング表示。
 *
 * OpenAIのリアルタイム文字起こしへ、マイクの音をそのまま流し続ける。話し終えて約1秒で、
 * 文が出る（区間を切って送り、結果を待つ従来の方式は、数秒〜10秒かかっていた）。
 *
 * これは**下書きの表示**。SOAPの材料になるのは、従来どおり区間ごとの文字起こし（話者つき）で、
 * そちらの結果が届いたら、同じ時間の下書きは置き換わる。ここが失敗しても診察は止まらない。
 */
import { Resampler } from '@/lib/live-pcm';

export type StreamItem = {
  id: string;
  /** 録音の頭からの時間（ミリ秒） */
  startMs: number;
  text: string;
  done: boolean;
};

export type StreamToken = {
  enabled: boolean;
  clientSecret?: string;
  prompt?: string;
};

const STREAM_RATE = 24000;
/** 接続できるまでに溜めておく音の上限（秒）。超えたらあきらめる */
const MAX_QUEUE_SECONDS = 20;
const SEND_BLOCK = STREAM_RATE / 10; // 100ms

/** Float32（-1〜1）→ 16bit PCM → base64 */
export function pcm16Base64(samples: Float32Array): string {
  const bytes = new Uint8Array(samples.length * 2);
  const view = new DataView(bytes.buffer);
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]!));
    view.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  let binary = '';
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(binary);
}

/** 流した音の時間 → 録音の時間。一時停止で途切れた分を、区間ごとの目印でつなぐ */
export function audioToRecordingMs(
  marks: Array<{ audioMs: number; recMs: number }>,
  audioMs: number,
): number {
  let best = marks[0];
  for (const m of marks) {
    if (m.audioMs <= audioMs) best = m;
    else break;
  }
  return best ? best.recMs + (audioMs - best.audioMs) : audioMs;
}

/** ヒントをそのまま書き写しただけの文字（幻覚）かどうか */
export function looksLikePromptEcho(text: string, prompt: string | undefined): boolean {
  if (!prompt) return false;
  const t = text.replace(/\s/g, '');
  if (t.length < 12) return false;
  return prompt.replace(/\s/g, '').includes(t.slice(0, 12));
}

type Event = {
  type: string;
  item_id?: string;
  audio_start_ms?: number;
  delta?: string;
  transcript?: string;
  error?: { message?: string };
};

export class LiveStream {
  private ws: WebSocket | null = null;
  private opened = false;
  private closed = false;
  private readonly resampler = new Resampler(16000, STREAM_RATE);
  private carry = new Float32Array(0);
  private queue: string[] = [];
  /** 流した音の長さ（ミリ秒）。接続前に溜めた分も含めて、サーバーの時間と揃う */
  private audioMs = 0;
  private marks: Array<{ audioMs: number; recMs: number }> = [];
  private lastRecEnd = -1;
  private readonly items = new Map<string, StreamItem>();
  private prompt: string | undefined;

  constructor(
    private readonly getToken: () => Promise<StreamToken>,
    private readonly onItems: (items: StreamItem[]) => void,
  ) {
    void this.connect();
  }

  /** 16kHzの音を受ける。recMs はこの音の、録音の頭からの時間 */
  feed(samples16k: Float32Array, recMs: number): void {
    if (this.closed) return;
    // 一時停止などで録音の時間が飛んだら、目印を足して時間をつなぎ直す
    if (this.marks.length === 0 || Math.abs(recMs - this.lastRecEnd) > 250) {
      this.marks.push({ audioMs: this.audioMs + this.carry.length / (STREAM_RATE / 1000), recMs });
    }
    this.lastRecEnd = recMs + (samples16k.length * 1000) / 16000;
    const up = this.resampler.process(samples16k);
    const merged = new Float32Array(this.carry.length + up.length);
    merged.set(this.carry);
    merged.set(up, this.carry.length);
    let offset = 0;
    while (merged.length - offset >= SEND_BLOCK) {
      this.send(merged.subarray(offset, offset + SEND_BLOCK));
      offset += SEND_BLOCK;
    }
    this.carry = merged.slice(offset);
  }

  close(): void {
    this.closed = true;
    try {
      this.ws?.close();
    } catch {
      // すでに閉じていてよい
    }
    this.ws = null;
  }

  private send(block: Float32Array): void {
    this.audioMs += (block.length * 1000) / STREAM_RATE;
    const message = JSON.stringify({ type: 'input_audio_buffer.append', audio: pcm16Base64(block) });
    if (this.opened && this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(message);
    } else {
      this.queue.push(message);
      if (this.queue.length > MAX_QUEUE_SECONDS * 10) this.close(); // 接続できない。あきらめる
    }
  }

  private async connect(): Promise<void> {
    try {
      const token = await this.getToken();
      if (this.closed || !token.enabled || !token.clientSecret) {
        this.close();
        return;
      }
      this.prompt = token.prompt;
      const ws = new WebSocket('wss://api.openai.com/v1/realtime?intent=transcription', [
        'realtime',
        `openai-insecure-api-key.${token.clientSecret}`,
      ]);
      this.ws = ws;
      ws.onopen = () => {
        this.opened = true;
        for (const m of this.queue) ws.send(m);
        this.queue = [];
      };
      ws.onmessage = (m) => this.handle(m.data as string);
      ws.onerror = () => this.close();
      ws.onclose = () => {
        this.closed = true;
      };
    } catch {
      this.close();
    }
  }

  private handle(raw: string): void {
    let e: Event;
    try {
      e = JSON.parse(raw) as Event;
    } catch {
      return;
    }
    const id = e.item_id;
    switch (e.type) {
      case 'input_audio_buffer.speech_started':
        if (id) {
          this.items.set(id, {
            id,
            startMs: audioToRecordingMs(this.marks, e.audio_start_ms ?? 0),
            text: '',
            done: false,
          });
        }
        return;
      case 'conversation.item.input_audio_transcription.delta': {
        if (!id) return;
        const item = this.items.get(id) ?? { id, startMs: this.lastRecEnd, text: '', done: false };
        item.text += e.delta ?? '';
        this.items.set(id, item);
        break;
      }
      case 'conversation.item.input_audio_transcription.completed': {
        if (!id) return;
        const item = this.items.get(id) ?? { id, startMs: this.lastRecEnd, text: '', done: false };
        item.text = e.transcript ?? item.text;
        item.done = true;
        this.items.set(id, item);
        break;
      }
      default:
        return;
    }
    this.onItems(
      [...this.items.values()].filter(
        (i) => i.text.trim() && !looksLikePromptEcho(i.text, this.prompt),
      ),
    );
  }
}
