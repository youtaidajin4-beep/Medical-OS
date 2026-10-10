/**
 * 音声認識とSOAPの品質を、診察ごとに数字にする（純関数。DBもAPIも触らない）。
 *
 * 正解データが無い本番で測れるのは、次の3つ。どれも「正解との一致」ではなく、
 * **基準との比**であることを、画面にも書く（QUALITY_METRIC_GUIDE）。
 *
 *   発話の再現率 … 録音全体を文字にしたもの（基準）の文字2連のうち、診察中の文字起こしに残った割合
 *   用語の回収率 … 基準に出た医療用語のうち、診察中の文字起こしにも出た割合
 *   SOAPの転記率 … 会話に出た診療上の事実のうち、SOAPに書かれた割合（LLMが判定）
 *
 * 基準そのものが誤っていることもある（2人の声が重なる区間など）。だから絶対値ではなく、
 * 条件を変えたときの**動き**を見る道具として使う。
 */

/** 医師・患者などの行頭ラベル（「医師:」「患者：」）を外すための正規表現 */
const SPEAKER_PREFIX = /^(医師|患者|その他|不明|physician|patient|other|unknown)\s*[:：]\s*/gim;

/** 比べるときに無視する記号。ーは音を表す文字なので残す */
const IGNORED = /[\s\u3000。、．，,.!?！？「」『』（）()[\]【】…・~〜\-_/:：;；"'\u201c\u201d\u2018\u2019]/g;

/** 全角の英数字・半角カナを揃え、記号と空白を除く。比較のための正規化で、表示には使わない */
export function normalizeForCompare(text: string): string {
  return text.replace(SPEAKER_PREFIX, '').normalize('NFKC').toLowerCase().replace(IGNORED, '');
}

function bigramCounts(text: string): Map<string, number> {
  const counts = new Map<string, number>();
  for (let i = 0; i < text.length - 1; i++) {
    const gram = text.slice(i, i + 2);
    counts.set(gram, (counts.get(gram) ?? 0) + 1);
  }
  return counts;
}

/** これより短い基準では、割合がぶれすぎるので出さない（文字数・正規化後） */
export const MIN_REFERENCE_CHARS = 40;

export type TextOverlap = {
  refChars: number;
  hypChars: number;
  /** 基準の文字2連のうち、仮説に残った数 */
  matched: number;
  /** 基準の文字2連の総数 */
  refGrams: number;
  /** 仮説の文字2連の総数 */
  hypGrams: number;
  /** 再現率。基準が短いときは null */
  recall: number | null;
  /** 一致率。仮説のうち基準にもある割合。幻聴や言い換えが多いと下がる */
  precision: number | null;
};

/**
 * 基準（reference）と仮説（hypothesis）の文字2連の重なり。
 * 順序は見ない：話者の並び替えや文の区切り直しで崩れないようにするため。
 */
export function textOverlap(reference: string, hypothesis: string): TextOverlap {
  const ref = normalizeForCompare(reference);
  const hyp = normalizeForCompare(hypothesis);
  const refCounts = bigramCounts(ref);
  const hypCounts = bigramCounts(hyp);
  let matched = 0;
  let refGrams = 0;
  let hypGrams = 0;
  for (const n of refCounts.values()) refGrams += n;
  for (const n of hypCounts.values()) hypGrams += n;
  for (const [gram, n] of refCounts) {
    matched += Math.min(n, hypCounts.get(gram) ?? 0);
  }
  const enough = ref.length >= MIN_REFERENCE_CHARS && refGrams > 0;
  return {
    refChars: ref.length,
    hypChars: hyp.length,
    matched,
    refGrams,
    hypGrams,
    recall: enough ? matched / refGrams : null,
    precision: enough && hypGrams > 0 ? matched / hypGrams : null,
  };
}

export type TermOverlap = {
  refCount: number;
  hitCount: number;
  recall: number | null;
  /** 基準にあって仮説に無かった語（医療用語のみ。患者の言葉は含まない） */
  missed: string[];
};

/** 基準の用語の数がこれより少ないと、割合は出さない（1語の有無で0%か100%になる） */
export const MIN_REFERENCE_TERMS = 3;

export function termOverlap(reference: Iterable<string>, hypothesis: Iterable<string>): TermOverlap {
  const ref = new Set(reference);
  const hyp = new Set(hypothesis);
  const missed = [...ref].filter((t) => !hyp.has(t));
  const hitCount = ref.size - missed.length;
  return {
    refCount: ref.size,
    hitCount,
    recall: ref.size >= MIN_REFERENCE_TERMS ? hitCount / ref.size : null,
    missed,
  };
}

/** 用語として数える種類。SOAPを書くモデルへ渡す「要確認」と同じ範囲にそろえる */
export const COUNTED_TERM_TYPES: ReadonlySet<string> = new Set([
  'diagnosis',
  'symptom',
  'finding',
  'medication',
  'laboratory_test',
  'imaging',
  'procedure',
]);

export type TermLookup = {
  findSurfacesInText(text: string): Array<{
    surface: string;
    hits: Array<{ canonicalName: string; category: string }>;
  }>;
};

/** 辞書にある医療用語を、正規名の集合として取り出す。同じ語が何回出ても1つ */
export function extractCanonicalTerms(index: TermLookup, text: string): Set<string> {
  const out = new Set<string>();
  for (const found of index.findSurfacesInText(text)) {
    const hit = found.hits.find((h) => COUNTED_TERM_TYPES.has(h.category));
    if (hit) out.add(hit.canonicalName);
  }
  return out;
}

// ---- SOAPの転記率（LLMの判定結果を数字にする） ----

export type JudgedFact = { fact: string; inSoap: boolean };
export type JudgedUnsupported = { text: string; reason?: string };

export type SoapCoverage = {
  factCount: number;
  factHitCount: number;
  coverage: number | null;
  missedFacts: string[];
  unsupported: JudgedUnsupported[];
};

/** 事実がこれより少ない診察（「変わりなし」だけなど）は、割合を出さない */
export const MIN_FACTS = 3;

function asString(v: unknown): string {
  return typeof v === 'string' ? v.trim() : '';
}

/** LLMの返したJSONを検算する。形が崩れていたら null（測れなかったことを、0%として積まない） */
export function parseSoapJudgement(raw: unknown): SoapCoverage | null {
  if (!raw || typeof raw !== 'object') return null;
  const obj = raw as { facts?: unknown; unsupported?: unknown };
  if (!Array.isArray(obj.facts)) return null;
  const facts: JudgedFact[] = [];
  for (const item of obj.facts) {
    if (!item || typeof item !== 'object') continue;
    const f = item as { fact?: unknown; inSoap?: unknown };
    const text = asString(f.fact);
    if (!text || typeof f.inSoap !== 'boolean') continue;
    facts.push({ fact: text, inSoap: f.inSoap });
  }
  if (facts.length === 0) return null;
  const unsupported: JudgedUnsupported[] = [];
  if (Array.isArray(obj.unsupported)) {
    for (const item of obj.unsupported) {
      if (!item || typeof item !== 'object') continue;
      const u = item as { text?: unknown; reason?: unknown };
      const text = asString(u.text);
      if (text) unsupported.push({ text, reason: asString(u.reason) || undefined });
    }
  }
  const hit = facts.filter((f) => f.inSoap).length;
  return {
    factCount: facts.length,
    factHitCount: hit,
    coverage: facts.length >= MIN_FACTS ? hit / facts.length : null,
    missedFacts: facts.filter((f) => !f.inSoap).map((f) => f.fact),
    unsupported,
  };
}

/** 事実が1つも挙がらなかった短い会話。転記率は出さず、根拠のない記載だけを残す */
export function emptyJudgement(raw: unknown): SoapCoverage | null {
  if (!raw || typeof raw !== 'object') return null;
  const obj = raw as { facts?: unknown; unsupported?: unknown };
  if (!Array.isArray(obj.facts) || obj.facts.length !== 0) return null;
  const unsupported: JudgedUnsupported[] = [];
  if (Array.isArray(obj.unsupported)) {
    for (const item of obj.unsupported) {
      const u = item as { text?: unknown; reason?: unknown };
      const text = asString(u?.text);
      if (text) unsupported.push({ text, reason: asString(u?.reason) || undefined });
    }
  }
  return { factCount: 0, factHitCount: 0, coverage: null, missedFacts: [], unsupported };
}

// ---- 月ごとの集計 ----

export type MeasurementRow = {
  refChars: number | null;
  utteranceRecall: number | null;
  utterancePrecision: number | null;
  termRefCount: number | null;
  termHitCount: number | null;
  termRawHitCount: number | null;
  factCount: number | null;
  factHitCount: number | null;
  unsupportedCount: number | null;
};

export type MonthAggregate = {
  /** 計測できた診察の数（どれか1つでも数字がある） */
  measuredVisits: number;
  /** 基準の文字数の重みづけ。短い診察に引っ張られないよう、診察の平均ではなく合算で出す */
  utteranceRecall: number | null;
  utterancePrecision: number | null;
  termRecall: number | null;
  /** 辞書補正の前（音声認識そのまま）の回収率。termRecall との差が補正の効き */
  termRecallRaw: number | null;
  soapCoverage: number | null;
  /** 1診察あたりの、会話に根拠のない記載の数。0であるべき */
  unsupportedPerVisit: number | null;
  /** 割合を出す分母になった診察の数 */
  counts: { stt: number; term: number; soap: number };
};

function ratio(num: number, den: number): number | null {
  return den > 0 ? num / den : null;
}

/** 診察の合算で出す（診察ごとの割合の平均ではない） */
export function aggregateMonth(rows: MeasurementRow[]): MonthAggregate {
  let sttWeight = 0;
  let recallSum = 0;
  let precisionSum = 0;
  let sttVisits = 0;
  let termRef = 0;
  let termHit = 0;
  let termRawHit = 0;
  let termVisits = 0;
  let facts = 0;
  let factHits = 0;
  let unsupported = 0;
  let soapVisits = 0;
  let measured = 0;

  for (const r of rows) {
    let any = false;
    if (r.utteranceRecall != null && r.refChars) {
      sttWeight += r.refChars;
      recallSum += r.utteranceRecall * r.refChars;
      if (r.utterancePrecision != null) precisionSum += r.utterancePrecision * r.refChars;
      sttVisits += 1;
      any = true;
    }
    if (r.termRefCount != null && r.termHitCount != null && r.termRefCount >= MIN_REFERENCE_TERMS) {
      termRef += r.termRefCount;
      termHit += r.termHitCount;
      termRawHit += r.termRawHitCount ?? 0;
      termVisits += 1;
      any = true;
    }
    if (r.factCount != null && r.factHitCount != null && r.factCount >= MIN_FACTS) {
      facts += r.factCount;
      factHits += r.factHitCount;
      unsupported += r.unsupportedCount ?? 0;
      soapVisits += 1;
      any = true;
    }
    if (any) measured += 1;
  }

  return {
    measuredVisits: measured,
    utteranceRecall: ratio(recallSum, sttWeight),
    utterancePrecision: ratio(precisionSum, sttWeight),
    termRecall: ratio(termHit, termRef),
    termRecallRaw: ratio(termRawHit, termRef),
    soapCoverage: ratio(factHits, facts),
    unsupportedPerVisit: ratio(unsupported, soapVisits),
    counts: { stt: sttVisits, term: termVisits, soap: soapVisits },
  };
}

/** JST の年月（YYYY-MM）。月の境界は日本時間で切る */
export function monthKeyJst(date: Date): string {
  const jst = new Date(date.getTime() + 9 * 60 * 60 * 1000);
  return `${jst.getUTCFullYear()}-${String(jst.getUTCMonth() + 1).padStart(2, '0')}`;
}

/** YYYY-MM の月初・翌月初（JST）を UTC の Date で返す */
export function monthRangeJst(month: string): { from: Date; to: Date } | null {
  const m = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(month);
  if (!m) return null;
  const year = Number(m[1]);
  const mon = Number(m[2]);
  const from = new Date(Date.UTC(year, mon - 1, 1) - 9 * 60 * 60 * 1000);
  const to = new Date(Date.UTC(year, mon, 1) - 9 * 60 * 60 * 1000);
  return { from, to };
}
