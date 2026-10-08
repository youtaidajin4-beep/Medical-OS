import { Inject, Injectable, Logger } from '@nestjs/common';
import { SpeakerLabel } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { STT_PROVIDER } from '../../providers/ai/stt.tokens';
import { SttProvider } from '../../providers/ai/stt.provider';
import { LLM_PROVIDER } from '../../providers/ai/llm.tokens';
import { LlmProvider } from '../../providers/ai/llm.provider';
import { buildWhisperPrompt, resolveMedicalGlossary } from '../../providers/ai/medical-glossary';
import { correctMedicalTerms } from '../../providers/ai/medical-term-corrector';
import { SettingsService } from '../settings/settings.service';
import { capSentences, cleanLiveText, MAX_SENTENCES_PER_SEGMENT, splitSentences } from './live-text';

export type LiveSpeaker = 'physician' | 'patient' | 'other' | 'unknown';

export type LiveSegmentResult = {
  /** 画面に出す区間。落とした区間（無音・定型句）は null */
  segment: {
    sequenceNumber: number;
    text: string;
    startMs: number;
    endMs: number;
    /** 文ごとの話者。画面で「医師」「患者」を付ける */
    parts: Array<{ speaker: LiveSpeaker; text: string }>;
  } | null;
  dropped?: string;
};

const SPEAKER_DB: Record<LiveSpeaker, SpeakerLabel> = {
  physician: SpeakerLabel.PHYSICIAN,
  patient: SpeakerLabel.PATIENT,
  other: SpeakerLabel.OTHER,
  unknown: SpeakerLabel.UNKNOWN,
};

const SPEAKER_BACK: Record<SpeakerLabel, LiveSpeaker> = {
  [SpeakerLabel.PHYSICIAN]: 'physician',
  [SpeakerLabel.PATIENT]: 'patient',
  [SpeakerLabel.OTHER]: 'other',
  [SpeakerLabel.UNKNOWN]: 'unknown',
};

const SPEAKER_JA: Record<LiveSpeaker, string> = {
  physician: '医師',
  patient: '患者',
  other: 'その他',
  unknown: '不明',
};

/** 話者の判別に渡す、直前の流れの行数 */
const CONTEXT_ROWS = 6;

/**
 * 診察中のリアルタイム書き起こし。
 *
 * 画面が、声の切れ目ごとに数秒ぶんの音声をここへ送る。1区間ずつ文字にして、診察が終わる前から
 * 文字が流れる。さらに文ごとに「医師か患者か」を判別して、1文ずつ保存する。
 * 診察が終わったときは、ここで溜めた文をそのまま診察記録の材料にして、録音全体の文字起こしを
 * 待たずにSOAPの作成へ進める（`TranscriptService.finalizeFromLive`）。
 *
 * 文字起こしは、分離モデルではなく**語彙を渡せる経路**を使う。分離モデルはクリニックの薬剤名・
 * 病名のヒントを受け付けない。ただし口述用のモデルは、2人の声が混じると片方の発話を落とす
 * （同じ診察音声で、録音全体の文字起こしに対する再現率 61%）。会話には小さいモデル
 * （gpt-4o-mini-transcribe）を使う。再現率 84%・一致率 90%。話者は、音ではなく内容から判別する。
 */
@Injectable()
export class LiveTranscriptionService {
  private readonly logger = new Logger(LiveTranscriptionService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(STT_PROVIDER) private readonly stt: SttProvider,
    @Inject(LLM_PROVIDER) private readonly llm: LlmProvider,
    private readonly settings: SettingsService,
  ) {}

  async transcribeSegment(params: {
    consultationId: string;
    physicianId: string;
    audio: Buffer;
    startMs: number;
    endMs: number;
  }): Promise<LiveSegmentResult> {
    const { consultationId, physicianId, audio, startMs, endMs } = params;
    // 専用の経路がない（モック等）ときは、何もしない。診察そのものは止めない
    if (!this.stt.transcribeConversation) return { segment: null, dropped: 'unsupported' };

    const rules = await this.settings.getPhysicianRules(physicianId).catch(() => undefined);
    const glossary = resolveMedicalGlossary(rules);
    const heard = await this.stt.transcribeConversation(audio, {
      vocabularyPrompt: buildWhisperPrompt(glossary),
    });

    const cleaned = cleanLiveText(heard);
    if (!cleaned.keep) return { segment: null, dropped: cleaned.reason };

    // 同音の取り違え（辞書にある語だけ）。CPUだけで終わるので待ち時間は増えない
    const text = correctMedicalTerms(cleaned.text, glossary).text;
    const sentences = capSentences(splitSentences(text));

    const base = Math.max(0, Math.round(startMs)) * MAX_SENTENCES_PER_SEGMENT;
    const speakers = await this.labelSentences(consultationId, base, sentences);

    // 送り直しで同じ区間が2回届いても、同じ行を置き換える
    await this.prisma.$transaction([
      this.prisma.transcriptSegment.deleteMany({
        where: {
          consultationId,
          isFinal: false,
          sequenceNumber: { gte: base, lt: base + MAX_SENTENCES_PER_SEGMENT },
        },
      }),
      this.prisma.transcriptSegment.createMany({
        data: sentences.map((sentence, i) => ({
          consultationId,
          sequenceNumber: base + i,
          rawText: sentence,
          text: sentence,
          normalizedText: sentence,
          speaker: SPEAKER_DB[speakers[i] ?? 'unknown'],
          isFinal: false,
          startMs: Math.round(startMs),
          endMs: Math.round(endMs),
        })),
      }),
    ]);

    this.logger.debug(`live segment ${consultationId} @${startMs}ms: ${sentences.length}文`);
    return {
      segment: {
        sequenceNumber: base,
        text,
        startMs: Math.round(startMs),
        endMs: Math.round(endMs),
        parts: sentences.map((sentence, i) => ({
          speaker: speakers[i] ?? 'unknown',
          text: sentence,
        })),
      },
    };
  }

  /** 直前の流れを渡して、文ごとの話者を判別する。失敗しても「不明」にするだけ */
  private async labelSentences(
    consultationId: string,
    base: number,
    sentences: string[],
  ): Promise<LiveSpeaker[]> {
    const unknown = sentences.map(() => 'unknown' as const);
    if (!this.llm.labelSpeakers) return unknown;
    try {
      const prior = await this.prisma.transcriptSegment.findMany({
        where: { consultationId, isFinal: false, sequenceNumber: { lt: base } },
        orderBy: { sequenceNumber: 'desc' },
        take: CONTEXT_ROWS,
        select: { text: true, speaker: true },
      });
      const context = prior
        .reverse()
        .map((row) => `${SPEAKER_JA[SPEAKER_BACK[row.speaker]]}: ${row.text}`);
      return await this.llm.labelSpeakers(sentences, context);
    } catch (error) {
      this.logger.warn(
        `話者の判別に失敗: ${error instanceof Error ? error.message : String(error)}`,
      );
      return unknown;
    }
  }
}
