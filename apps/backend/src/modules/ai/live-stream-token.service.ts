import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { VocabularyService } from './vocabulary.service';

export type LiveStreamToken =
  | { enabled: false }
  | {
      enabled: true;
      /** ブラウザが文字起こしの接続に使う、短時間だけ有効な鍵（本物のAPIキーではない） */
      clientSecret: string;
      expiresAt: number | null;
      model: string;
      /** 渡した語彙ヒント。画面側で、ヒントの写し（幻覚）を弾くのに使う */
      prompt: string;
    };

/**
 * 診察中の「ストリーミング表示」用の接続鍵を作る。
 *
 * 画面はOpenAIのリアルタイム文字起こしへ直接つなぎ、話し終えてすぐ（約1秒）に文字を出す。
 * ここで作るのは使い捨ての鍵だけで、本物のAPIキーは画面へ渡さない。語彙ヒントは、
 * 診察中の区間ごとの文字起こしと同じもの（カルテの薬・病名を含む）。
 * この表示は「下書き」で、SOAPの材料は従来どおり区間ごとの文字起こし（話者つき）から作る。
 * LIVE_STREAM=off で止められる。
 */
@Injectable()
export class LiveStreamTokenService {
  private readonly logger = new Logger(LiveStreamTokenService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly vocabulary: VocabularyService,
  ) {}

  async mint(params: { consultationId: string; physicianId: string }): Promise<LiveStreamToken> {
    const apiKey = this.config.get<string>('OPENAI_API_KEY', '');
    if (!apiKey || this.config.get<string>('LIVE_STREAM', 'on') === 'off') return { enabled: false };
    if (this.config.get<string>('STT_PROVIDER', 'mock') !== 'openai') return { enabled: false };

    const model = this.config.get<string>('OPENAI_STREAM_STT_MODEL', 'gpt-4o-mini-transcribe');
    const { prompt } = await this.vocabulary.promptFor({ ...params, recentText: '' });
    try {
      const res = await fetch('https://api.openai.com/v1/realtime/client_secrets', {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session: {
            type: 'transcription',
            audio: {
              input: {
                format: { type: 'audio/pcm', rate: 24000 },
                transcription: { model, language: 'ja', prompt },
                // 話し終えて0.4秒で区切る。区切りが速いほど文字が早く出る
                turn_detection: {
                  type: 'server_vad',
                  threshold: 0.5,
                  prefix_padding_ms: 300,
                  silence_duration_ms: 400,
                },
              },
            },
          },
        }),
        signal: AbortSignal.timeout(8000),
      });
      const json = (await res.json()) as { value?: string; expires_at?: number; error?: { message?: string } };
      if (!res.ok || !json.value) {
        this.logger.warn(`ストリーミングの鍵を作れませんでした: ${res.status} ${json.error?.message ?? ''}`);
        return { enabled: false };
      }
      return { enabled: true, clientSecret: json.value, expiresAt: json.expires_at ?? null, model, prompt };
    } catch (e) {
      this.logger.warn(`ストリーミングの鍵の作成に失敗: ${e instanceof Error ? e.message : String(e)}`);
      return { enabled: false };
    }
  }
}
