import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { knowledgePackBroadPool } from '../medical-knowledge/data/load-knowledge-pack';
import { KnowledgeIndex } from '../medical-knowledge/knowledge-index';
import {
  buildVocabularyPrompt,
  cleanChartTerm,
  composeVocabulary,
} from '../medical-knowledge/vocabulary-composer';

type ChartVocabulary = {
  medications: string[];
  diagnoses: string[];
  tests: string[];
  learned: string[];
  loadedAt: number;
};

const CACHE_MS = 10 * 60 * 1000;
const MENTION_CATEGORIES = new Set(['medication', 'diagnosis', 'laboratory_test', 'imaging', 'procedure']);

/**
 * 診察中の文字起こしに渡す語彙ヒントの材料を集める。
 *
 * - カルテ … この患者の過去の診察で記録された薬・病名・検査（同じ患者が通院中なら、そのまま出る）
 * - 学習語 … 医院・先生の辞書（先生が直した語）
 * - 会話 … この診察で直前までに出た語
 * 材料は診察の間は変わらないので、10分キャッシュする。失敗しても診察は止めず、固定リストだけで進む。
 */
@Injectable()
export class VocabularyService {
  private readonly logger = new Logger(VocabularyService.name);
  private readonly cache = new Map<string, ChartVocabulary>();
  private readonly index = KnowledgeIndex.fromSeed();
  private readonly base = knowledgePackBroadPool();

  constructor(private readonly prisma: PrismaService) {}

  async promptFor(params: {
    consultationId: string;
    physicianId: string;
    recentText: string;
  }): Promise<{ prompt: string; preferred: string[] }> {
    const chart = await this.loadChart(params.consultationId, params.physicianId).catch((e) => {
      this.logger.warn(`語彙の材料の取得に失敗: ${e instanceof Error ? e.message : String(e)}`);
      return null;
    });
    const mentioned = this.mentionedIn(params.recentText);
    const terms = composeVocabulary({
      patientMedications: chart?.medications,
      patientDiagnoses: chart?.diagnoses,
      patientTests: chart?.tests,
      mentioned,
      learned: chart?.learned,
      base: this.base,
    });
    return {
      prompt: buildVocabularyPrompt(terms),
      // 音の近い語の補正で優先する語（このカルテの薬と、先ほど話に出た語）
      preferred: [...(chart?.medications ?? []), ...mentioned],
    };
  }

  /** 直前の会話に出た、薬・病名・検査の語（正式名） */
  mentionedIn(text: string): string[] {
    if (!text.trim()) return [];
    const out: string[] = [];
    for (const hit of this.index.findSurfacesInText(text)) {
      const best = hit.hits.find((h) => MENTION_CATEGORIES.has(h.category));
      if (best) out.push(hit.surface === best.canonicalName ? hit.surface : best.canonicalName, hit.surface);
    }
    return out;
  }

  private async loadChart(consultationId: string, physicianId: string): Promise<ChartVocabulary> {
    const cached = this.cache.get(consultationId);
    if (cached && Date.now() - cached.loadedAt < CACHE_MS) return cached;

    const consultation = await this.prisma.consultation.findUnique({
      where: { id: consultationId },
      select: { patientId: true, clinicId: true },
    });
    const medications = new Set<string>();
    const diagnoses = new Set<string>();
    const tests = new Set<string>();
    const learned: string[] = [];

    if (consultation?.patientId) {
      const past = await this.prisma.consultation.findMany({
        where: { patientId: consultation.patientId, id: { not: consultationId } },
        orderBy: { createdAt: 'desc' },
        take: 8,
        select: { structuredData: { select: { data: true } } },
      });
      for (const visit of past) {
        const data = (visit.structuredData?.data ?? {}) as Record<string, unknown>;
        for (const m of asStrings(data.medications)) addClean(medications, m);
        for (const t of asStrings(data.orderedTests)) addClean(tests, t);
        for (const t of asStrings(data.inClinicTests)) addClean(tests, t);
        // 診断名は構造化されていないので、評価欄の文から辞書の病名を拾う
        if (typeof data.assessment === 'string') {
          for (const hit of this.index.findSurfacesInText(data.assessment)) {
            const dx = hit.hits.find((h) => h.category === 'diagnosis');
            if (dx) diagnoses.add(dx.canonicalName);
          }
        }
      }
    }

    if (consultation?.clinicId) {
      const [clinicTerms, doctorTerms] = await Promise.all([
        this.prisma.clinicDictionaryTerm.findMany({
          where: { clinicId: consultation.clinicId, isActive: true },
          orderBy: [{ frequency: 'desc' }, { priority: 'desc' }],
          take: 40,
          select: { canonicalName: true },
        }),
        this.prisma.doctorDictionaryTerm.findMany({
          where: { physicianId },
          orderBy: [{ frequency: 'desc' }, { priority: 'desc' }],
          take: 20,
          select: { preferredWrittenForm: true },
        }),
      ]);
      learned.push(...doctorTerms.map((t) => t.preferredWrittenForm), ...clinicTerms.map((t) => t.canonicalName));
    }

    const chart: ChartVocabulary = {
      medications: [...medications],
      diagnoses: [...diagnoses],
      tests: [...tests],
      learned,
      loadedAt: Date.now(),
    };
    this.cache.set(consultationId, chart);
    if (this.cache.size > 200) this.cache.delete(this.cache.keys().next().value as string);
    return chart;
  }
}

function asStrings(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];
}
function addClean(set: Set<string>, raw: string) {
  const t = cleanChartTerm(raw);
  if (t) set.add(t);
}
