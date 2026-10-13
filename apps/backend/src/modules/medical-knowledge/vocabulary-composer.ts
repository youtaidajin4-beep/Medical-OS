/**
 * 文字起こしに渡す語彙ヒントを組み立てる。
 *
 * 測定（eval/term-bench）で分かったこと：
 *   - 正しい語がヒントに入っていれば、薬名・病名・検査名の聞き取りは 53% → 91% まで上がる
 *   - 無関係な語が混じっても緩やかにしか落ちない（60語で83%、240語で74%）。現行の固定40語は62%
 *   - 効くのは「その診察で出る語が入っているか」。カルテの薬・病名を入れた会話の測定で 55% → 76%
 * そこで、優先度の高い順に詰めて、予算（語数）で打ち切る。
 */
export type VocabularySources = {
  /** この患者のカルテにある薬（最優先） */
  patientMedications?: string[];
  /** この患者のカルテにある病名 */
  patientDiagnoses?: string[];
  /** この患者の過去の検査 */
  patientTests?: string[];
  /** この診察の会話ですでに出た語 */
  mentioned?: string[];
  /** 医院・先生が育てた語（頻度順） */
  learned?: string[];
  /** 広い固定リスト */
  base?: string[];
};

export const DEFAULT_VOCABULARY_BUDGET = 120;
const PROMPT_LEAD = '内科診察の会話。';

const keyOf = (s: string) => s.normalize('NFKC').toLowerCase().replace(/\s/g, '');

export function composeVocabulary(sources: VocabularySources, budget = DEFAULT_VOCABULARY_BUDGET): string[] {
  const ordered = [
    ...(sources.patientMedications ?? []),
    ...(sources.patientDiagnoses ?? []),
    ...(sources.mentioned ?? []),
    ...(sources.learned ?? []),
    ...(sources.patientTests ?? []),
    ...(sources.base ?? []),
  ];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of ordered) {
    const term = raw?.trim();
    if (!term || term.length > 30) continue;
    const key = keyOf(term);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(term);
    if (out.length >= budget) break;
  }
  return out;
}

export function buildVocabularyPrompt(terms: string[]): string {
  return terms.length ? `${PROMPT_LEAD}${terms.join('、')}` : PROMPT_LEAD;
}

/** カルテの記載（「アムロジピン5mg 1錠」「ムコダイン（要確認）」）から薬名・病名の部分だけ取り出す */
export function cleanChartTerm(raw: string): string | null {
  let s = raw
    .normalize('NFKC')
    .replace(/[（(]要確認[）)]/g, '')
    .replace(/[\d.]+\s*(mg|μg|ug|g|ml|mL|錠|カプセル|包|日分|日|回|%).*$/i, '')
    .replace(/[\s　]+$/g, '')
    .trim();
  if (!s) return null;
  // 「いつもの薬」「咳の薬」のような言い回しは語ではない
  if (/(の薬|のお薬|お薬|薬$|薬剤$|分|いつも|今回)/.test(s) && !/湯|散|丸|錠/.test(s)) return null;
  if (s.length < 2 || s.length > 24) return null;
  return s;
}
