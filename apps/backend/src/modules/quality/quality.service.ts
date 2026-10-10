import { ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentType, Prisma, SpeakerLabel } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { AuthUser } from '../../common/guards/jwt-auth.guard';
import { MedicalKnowledgeService } from '../medical-knowledge/medical-knowledge.service';
import {
  aggregateMonth,
  extractCanonicalTerms,
  MeasurementRow,
  monthKeyJst,
  monthRangeJst,
  emptyJudgement,
  parseSoapJudgement,
  termOverlap,
  textOverlap,
} from './quality-metrics';
import { JUDGE_VERSION, runSoapJudge } from './soap-coverage-judge';

const JUDGE_TIMEOUT_MS = 90_000;
/** eval/run-soap-coverage-eval.mjs と同じ単価（2026-10-01）。判定1回ぶんの目安を出すため */
const JUDGE_PRICE_USD_PER_M = { gpt4oIn: 2.5, gpt4oOut: 10 };
const JPY_PER_USD = 155;

const SPEAKER_JA: Record<SpeakerLabel, string> = {
  PHYSICIAN: '医師',
  PATIENT: '患者',
  OTHER: 'その他',
  UNKNOWN: '不明',
};

export type SttMeasureInput = {
  /** 録音全体を文字にしたもの（基準） */
  referenceText: string;
  /** 診察中に文字にしたもの（辞書補正の前） */
  liveRawText: string;
  /** 辞書補正のあと。SOAPの材料になった文字 */
  liveFinalText: string;
};

export type MonthSummary = ReturnType<typeof aggregateMonth> & {
  month: string;
  /** その月に診察した数（計測の有無を問わない） */
  totalVisits: number;
  /** 先生がSOAPを直した回数（1診察あたり）。少ないほど、そのまま使えている */
  soapEditsPerVisit: number | null;
  /** 先生が文字起こしを直した回数（1診察あたり） */
  transcriptEditsPerVisit: number | null;
};

export type VisitRow = {
  id: string;
  visitedAt: string;
  physicianName: string;
  visitType: string;
  refChars: number | null;
  utteranceRecall: number | null;
  utterancePrecision: number | null;
  termRefCount: number | null;
  termRecall: number | null;
  termRecallRaw: number | null;
  factCount: number | null;
  soapCoverage: number | null;
  unsupportedCount: number | null;
  soapEdits: number;
  transcriptEdits: number;
  sttError: string | null;
  soapError: string | null;
  config: Prisma.JsonValue;
};

@Injectable()
export class QualityService {
  private readonly logger = new Logger(QualityService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly medicalKnowledge: MedicalKnowledgeService,
  ) {}

  /** 計測そのものを止めたいとき（費用・障害対応）に QUALITY_MEASUREMENT=off */
  isEnabled(): boolean {
    return (this.config.get<string>('QUALITY_MEASUREMENT', 'on') ?? 'on').toLowerCase() !== 'off';
  }

  /** ADMIN ロール、または QUALITY_ADMIN_EMAILS（カンマ区切り）に載っている人だけが見られる */
  assertAdmin(user: AuthUser): void {
    if (user.role === 'ADMIN') return;
    const allow = (this.config.get<string>('QUALITY_ADMIN_EMAILS', '') ?? '')
      .split(',')
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean);
    if (allow.includes(user.email.toLowerCase())) return;
    throw new ForbiddenException('この画面は管理者だけが見られます');
  }

  // ---- 計測（パイプラインから呼ぶ。失敗しても診療を止めない） ----

  /** 測ったときの構成。数字が動いたとき、何が変わったかを辿る手がかり */
  private async configSnapshot(clinicId: string): Promise<Prisma.InputJsonObject> {
    const clinicTerms = await this.prisma.clinicDictionaryTerm
      .count({ where: { clinicId, isActive: true } })
      .catch(() => null);
    return {
      commit: (process.env.RAILWAY_GIT_COMMIT_SHA ?? process.env.VERCEL_GIT_COMMIT_SHA ?? '').slice(0, 7) || null,
      sttLive: this.config.get<string>('OPENAI_LIVE_STT_MODEL', 'gpt-4o-mini-transcribe') ?? null,
      sttReference: this.config.get<string>('OPENAI_WHISPER_MODEL', 'gpt-4o-transcribe-diarize') ?? null,
      llmExtract: this.config.get<string>('OPENAI_EXTRACT_MODEL', 'gpt-4o') ?? null,
      llmSoap: this.config.get<string>('OPENAI_SOAP_MODEL', 'gpt-4o') ?? null,
      llmCorrection: this.config.get<string>('OPENAI_CORRECTION_MODEL', 'gpt-4o') ?? null,
      judge: this.judgeModel(),
      judgeVersion: JUDGE_VERSION,
      clinicDictionaryTerms: clinicTerms,
    };
  }

  private judgeModel(): string {
    return this.config.get<string>('OPENAI_QUALITY_JUDGE_MODEL', 'gpt-4o') ?? 'gpt-4o';
  }

  private async ensureRow(consultationId: string) {
    const consultation = await this.prisma.consultation.findUnique({
      where: { id: consultationId },
      select: { id: true, clinicId: true, physicianId: true, startedAt: true, createdAt: true },
    });
    if (!consultation) return null;
    const config = await this.configSnapshot(consultation.clinicId);
    const write = () =>
      this.prisma.qualityMeasurement.upsert({
        where: { consultationId },
        create: {
          consultationId,
          clinicId: consultation.clinicId,
          physicianId: consultation.physicianId,
          visitedAt: consultation.startedAt ?? consultation.createdAt,
          config,
        },
        // 続きを録って作り直したときは、構成も測り直した時点のものにする
        update: { config },
      });
    try {
      return await write();
    } catch (error) {
      // SOAPの計測と音声の計測が同時に最初の1行を作ろうとしたとき（一意制約）は、やり直せば更新になる
      if ((error as { code?: string }).code === 'P2002') return write();
      throw error;
    }
  }

  /** 発話の再現率と、医療用語の回収率。基準（録音全体の文字起こし）が手に入ったときに呼ぶ */
  async recordStt(consultationId: string, input: SttMeasureInput): Promise<void> {
    if (!this.isEnabled()) return;
    try {
      const row = await this.ensureRow(consultationId);
      if (!row) return;
      const overlap = textOverlap(input.referenceText, input.liveRawText);

      const index = await this.medicalKnowledge.buildScopedIndex(row.clinicId, row.physicianId);
      const refTerms = extractCanonicalTerms(index, input.referenceText);
      const rawTerms = extractCanonicalTerms(index, input.liveRawText);
      const finalTerms = extractCanonicalTerms(index, input.liveFinalText);
      const afterCorrection = termOverlap(refTerms, finalTerms);
      const beforeCorrection = termOverlap(refTerms, rawTerms);

      await this.prisma.qualityMeasurement.update({
        where: { consultationId },
        data: {
          refChars: overlap.refChars,
          liveChars: overlap.hypChars,
          utteranceRecall: overlap.recall,
          utterancePrecision: overlap.precision,
          termRefCount: afterCorrection.refCount,
          termHitCount: afterCorrection.hitCount,
          termRawHitCount: beforeCorrection.hitCount,
          // 医療用語だけ。会話の文は入れない
          missedTerms: afterCorrection.missed.slice(0, 60),
          sttMeasuredAt: new Date(),
          sttError: null,
        },
      });
    } catch (error) {
      await this.recordFailure(consultationId, 'sttError', error);
    }
  }

  /** SOAPの転記率。SOAPができたあとで呼ぶ */
  async measureSoap(consultationId: string): Promise<void> {
    if (!this.isEnabled()) return;
    try {
      const apiKey = this.config.get<string>('OPENAI_API_KEY', '');
      if (!apiKey) return;
      const row = await this.ensureRow(consultationId);
      if (!row) return;

      const [segments, soap] = await Promise.all([
        this.prisma.transcriptSegment.findMany({
          where: { consultationId, isFinal: true },
          orderBy: { sequenceNumber: 'asc' },
        }),
        this.prisma.soapDocument.findFirst({
          where: { consultationId },
          orderBy: { version: 'desc' },
        }),
      ]);
      if (!soap || segments.length === 0) return;
      const soapText = [soap.subjective, soap.objective, soap.assessment, soap.plan].join('');
      if (!soapText.trim()) return;

      const transcript = segments.map((s) => `${SPEAKER_JA[s.speaker]}: ${s.text}`).join('\n');
      const judged = await this.callJudge(apiKey, transcript, soap);
      const parsed = parseSoapJudgement(judged.json) ?? emptyJudgement(judged.json);
      if (!parsed) throw new Error('判定結果の形が不正でした');

      await this.prisma.qualityMeasurement.update({
        where: { consultationId },
        data: {
          factCount: parsed.factCount,
          factHitCount: parsed.factHitCount,
          unsupportedCount: parsed.unsupported.length,
          missedFacts: parsed.missedFacts.slice(0, 40),
          unsupportedClaims: parsed.unsupported.slice(0, 20) as unknown as Prisma.InputJsonValue,
          judgeCostJpy: judged.costJpy,
          soapMeasuredAt: new Date(),
          soapError: null,
        },
      });
    } catch (error) {
      await this.recordFailure(consultationId, 'soapError', error);
    }
  }

  private async callJudge(
    apiKey: string,
    transcript: string,
    soap: { subjective: string; objective: string; assessment: string; plan: string },
  ): Promise<{ json: unknown; costJpy: number }> {
    return runSoapJudge((system, user) => this.judgeChat(apiKey, system, user), transcript, soap);
  }

  private async judgeChat(
    apiKey: string,
    system: string,
    user: string,
  ): Promise<{ json: unknown; costJpy: number }> {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(JUDGE_TIMEOUT_MS),
      body: JSON.stringify({
        model: this.judgeModel(),
        temperature: 0,
        max_tokens: 3000,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
      }),
    });
    if (!res.ok) throw new Error(`判定の呼び出しに失敗（${res.status}）`);
    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
      usage?: { prompt_tokens?: number; completion_tokens?: number };
    };
    const usage = data.usage ?? {};
    const costUsd =
      ((usage.prompt_tokens ?? 0) / 1e6) * JUDGE_PRICE_USD_PER_M.gpt4oIn +
      ((usage.completion_tokens ?? 0) / 1e6) * JUDGE_PRICE_USD_PER_M.gpt4oOut;
    return { json: JSON.parse(data.choices?.[0]?.message?.content ?? ''), costJpy: costUsd * JPY_PER_USD };
  }

  private async recordFailure(
    consultationId: string,
    column: 'sttError' | 'soapError',
    error: unknown,
  ): Promise<void> {
    const message = (error instanceof Error ? error.message : String(error)).slice(0, 300);
    this.logger.warn(`品質の計測に失敗しました（${consultationId} / ${column}）: ${message}`);
    await this.prisma.qualityMeasurement
      .update({ where: { consultationId }, data: { [column]: message } })
      .catch(() => undefined);
  }

  // ---- 管理画面向けの読み出し ----

  private async editCounts(consultationIds: string[]) {
    const out = new Map<string, { soap: number; transcript: number }>();
    if (consultationIds.length === 0) return out;
    const grouped = await this.prisma.revisionHistory.groupBy({
      by: ['consultationId', 'documentType'],
      where: {
        consultationId: { in: consultationIds },
        documentType: { in: [DocumentType.SOAP, DocumentType.CLINICAL_NOTE, DocumentType.TRANSCRIPT] },
      },
      _count: { _all: true },
    });
    for (const g of grouped) {
      const cur = out.get(g.consultationId) ?? { soap: 0, transcript: 0 };
      if (g.documentType === DocumentType.TRANSCRIPT) cur.transcript += g._count._all;
      else cur.soap += g._count._all;
      out.set(g.consultationId, cur);
    }
    return out;
  }

  private toMeasurementRow(m: {
    refChars: number | null;
    utteranceRecall: number | null;
    utterancePrecision: number | null;
    termRefCount: number | null;
    termHitCount: number | null;
    termRawHitCount: number | null;
    factCount: number | null;
    factHitCount: number | null;
    unsupportedCount: number | null;
  }): MeasurementRow {
    return m;
  }

  /** 直近 months か月ぶん（今月を含む）を、古い月から並べる */
  async overview(user: AuthUser, months = 12) {
    this.assertAdmin(user);
    const span = Math.min(Math.max(Math.trunc(months) || 12, 1), 36);
    const now = new Date();
    const keys: string[] = [];
    for (let i = span - 1; i >= 0; i--) {
      const d = new Date(now.getTime());
      d.setUTCMonth(d.getUTCMonth() - i, 1);
      keys.push(monthKeyJst(d));
    }
    const first = monthRangeJst(keys[0]!);
    if (!first) throw new NotFoundException();

    const [rows, visitDates] = await Promise.all([
      this.prisma.qualityMeasurement.findMany({
        where: { clinicId: user.clinicId, visitedAt: { gte: first.from } },
      }),
      this.prisma.consultation.findMany({
        where: { clinicId: user.clinicId, startedAt: { gte: first.from } },
        select: { startedAt: true },
      }),
    ]);
    const edits = await this.editCounts(rows.map((r) => r.consultationId));

    const summaries: MonthSummary[] = keys.map((month) => {
      const inMonth = rows.filter((r) => monthKeyJst(r.visitedAt) === month);
      const agg = aggregateMonth(inMonth.map((r) => this.toMeasurementRow(r)));
      const totalVisits = visitDates.filter((v) => v.startedAt && monthKeyJst(v.startedAt) === month).length;
      let soapEdits = 0;
      let transcriptEdits = 0;
      for (const r of inMonth) {
        const e = edits.get(r.consultationId);
        soapEdits += e?.soap ?? 0;
        transcriptEdits += e?.transcript ?? 0;
      }
      return {
        month,
        ...agg,
        totalVisits,
        soapEditsPerVisit: inMonth.length ? soapEdits / inMonth.length : null,
        transcriptEditsPerVisit: inMonth.length ? transcriptEdits / inMonth.length : null,
      };
    });

    // 構成が変わった日（モデル名・コミット・辞書の語数が前回と違う診察）。数字の動きの手がかり
    const sorted = [...rows].sort((a, b) => a.visitedAt.getTime() - b.visitedAt.getTime());
    const changes: Array<{ at: string; diff: string[] }> = [];
    let prev: Record<string, unknown> | null = null;
    for (const r of sorted) {
      const cfg = (r.config ?? {}) as Record<string, unknown>;
      if (prev) {
        const diff = Object.keys({ ...prev, ...cfg })
          .filter((k) => JSON.stringify(prev![k]) !== JSON.stringify(cfg[k]))
          .map((k) => `${k}: ${JSON.stringify(prev![k] ?? null)} → ${JSON.stringify(cfg[k] ?? null)}`);
        if (diff.length) changes.push({ at: r.visitedAt.toISOString(), diff });
      }
      prev = cfg;
    }

    return {
      months: summaries,
      configChanges: changes.slice(-30),
      measurementEnabled: this.isEnabled(),
    };
  }

  async visits(user: AuthUser, month: string): Promise<VisitRow[]> {
    this.assertAdmin(user);
    const range = monthRangeJst(month);
    if (!range) throw new NotFoundException('月の指定が不正です（YYYY-MM）');
    const rows = await this.prisma.qualityMeasurement.findMany({
      where: { clinicId: user.clinicId, visitedAt: { gte: range.from, lt: range.to } },
      orderBy: { visitedAt: 'desc' },
      include: { consultation: { select: { visitType: true, physician: { select: { name: true } } } } },
    });
    const edits = await this.editCounts(rows.map((r) => r.consultationId));
    return rows.map((r) => {
      const e = edits.get(r.consultationId);
      const hasTerms = r.termRefCount != null && r.termHitCount != null && r.termRefCount >= 3;
      return {
        id: r.consultationId,
        visitedAt: r.visitedAt.toISOString(),
        physicianName: r.consultation.physician.name,
        visitType: r.consultation.visitType,
        refChars: r.refChars,
        utteranceRecall: r.utteranceRecall,
        utterancePrecision: r.utterancePrecision,
        termRefCount: r.termRefCount,
        termRecall: hasTerms ? r.termHitCount! / r.termRefCount! : null,
        termRecallRaw: hasTerms && r.termRawHitCount != null ? r.termRawHitCount / r.termRefCount! : null,
        factCount: r.factCount,
        soapCoverage: r.factCount != null && r.factCount >= 3 && r.factHitCount != null ? r.factHitCount / r.factCount : null,
        unsupportedCount: r.unsupportedCount,
        soapEdits: e?.soap ?? 0,
        transcriptEdits: e?.transcript ?? 0,
        sttError: r.sttError,
        soapError: r.soapError,
        config: r.config,
      };
    });
  }

  async visitDetail(user: AuthUser, consultationId: string) {
    this.assertAdmin(user);
    const row = await this.prisma.qualityMeasurement.findFirst({
      where: { consultationId, clinicId: user.clinicId },
    });
    if (!row) throw new NotFoundException('この診察の計測はありません');
    return {
      id: row.consultationId,
      visitedAt: row.visitedAt.toISOString(),
      missedTerms: (row.missedTerms as string[] | null) ?? [],
      missedFacts: (row.missedFacts as string[] | null) ?? [],
      unsupportedClaims: (row.unsupportedClaims as Array<{ text: string; reason?: string }> | null) ?? [],
      judgeCostJpy: row.judgeCostJpy,
      sttMeasuredAt: row.sttMeasuredAt?.toISOString() ?? null,
      soapMeasuredAt: row.soapMeasuredAt?.toISOString() ?? null,
      config: row.config,
    };
  }

  /** 数字だけのCSV（会話・SOAPの文は入れない）。Excelで開けるようBOM付き */
  async exportCsv(user: AuthUser, month: string): Promise<string> {
    const rows = await this.visits(user, month);
    const head = [
      'visit_id',
      'visited_at',
      'visit_type',
      'ref_chars',
      'utterance_recall',
      'utterance_precision',
      'term_ref_count',
      'term_recall',
      'term_recall_raw',
      'fact_count',
      'soap_coverage',
      'unsupported_count',
      'soap_edits',
      'transcript_edits',
      'commit',
    ];
    const num = (v: number | null) => (v == null ? '' : String(Math.round(v * 1000) / 1000));
    const lines = rows.map((r) =>
      [
        r.id,
        r.visitedAt,
        r.visitType,
        r.refChars ?? '',
        num(r.utteranceRecall),
        num(r.utterancePrecision),
        r.termRefCount ?? '',
        num(r.termRecall),
        num(r.termRecallRaw),
        r.factCount ?? '',
        num(r.soapCoverage),
        r.unsupportedCount ?? '',
        r.soapEdits,
        r.transcriptEdits,
        ((r.config as Record<string, unknown> | null)?.commit as string | null) ?? '',
      ].join(','),
    );
    return `\uFEFF${[head.join(','), ...lines].join('\n')}\n`;
  }
}
