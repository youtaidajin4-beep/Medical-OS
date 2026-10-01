import { PhysicianRules } from '../../modules/settings/physician-rules.types';

/**
 * 話し言葉を、先生の書き方へ言い換える。
 *
 * 2026-09-26、谷口先生の10名分の報告を受けて挙げた直す順の4番目がこれだった。
 * 「いつもの薬を出す」と言われたら、カルテには「定時薬を継続する。」と書きたい。
 * 同じ意味を毎回違う言葉で書かれると、先生が毎回直すことになる。
 *
 * これをAIに頼まない。言い換えは意味を変えない機械的な置換なので、
 * 表にして当てるほうが確実で、先生が設定画面で足せる。
 * （AIに任せると、言い換えのついでに中身まで書き換わる）
 *
 * 当てるのは SOAP の A と P だけ。S は患者さんの言葉、O は所見なので、
 * 医師の方針の書き方に寄せるのは A/P に限る。
 */

export type PhraseRewrite = { from: string; to: string };

/** 谷口先生の書き方（2026-09-26 の報告から）。設定画面で足し引きできる */
export const DEFAULT_PHRASE_REWRITES: PhraseRewrite[] = [
  { from: 'いつもの薬を出す', to: '定時薬を継続する' },
  { from: 'いつものお薬を出す', to: '定時薬を継続する' },
  { from: 'いつもの薬を継続', to: '定時薬を継続する' },
  { from: '同じ薬を続ける', to: '定時薬を継続する' },
  { from: '薬はそのまま', to: '定時薬を継続する' },
  { from: '変わりありません', to: '変わりない' },
  { from: '様子を見る', to: '経過観察' },
  { from: '様子をみる', to: '経過観察' },
];

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function resolvePhraseRewrites(rules?: PhysicianRules): PhraseRewrite[] {
  const custom = rules?.phraseRewrites ?? [];
  // 先生が設定したものを先に当てる。既定と衝突したら先生の表が勝つ
  const merged = [...custom, ...DEFAULT_PHRASE_REWRITES].filter(
    (r) => r.from.trim() && r.to.trim(),
  );
  const seen = new Set<string>();
  return merged
    .filter((r) => (seen.has(r.from) ? false : (seen.add(r.from), true)))
    // 長い言い回しから当てる。「いつもの薬を出す」が「薬はそのまま」より先に来るように
    .sort((a, b) => b.from.length - a.from.length);
}

export function rewritePhrases(text: string, rewrites: PhraseRewrite[]): string {
  if (!text) return text;
  let out = text;
  for (const { from, to } of rewrites) {
    out = out.replace(new RegExp(escapeRegExp(from), 'g'), to);
  }
  return out;
}

/**
 * SOAP の A/P だけに言い換えを当てる。
 *
 * S（患者さんの訴え）と O（所見）には当てない。患者さんが言ったことを
 * 医師の言い回しに直すと、誰が言ったのかが分からなくなる。
 */
export function applyPhrasingToSoap(
  soap: { subjective: string; objective: string; assessment: string; plan: string },
  rules?: PhysicianRules,
): { subjective: string; objective: string; assessment: string; plan: string } {
  const rewrites = resolvePhraseRewrites(rules);
  if (!rewrites.length) return soap;
  return {
    ...soap,
    assessment: rewritePhrases(soap.assessment, rewrites),
    plan: rewritePhrases(soap.plan, rewrites),
  };
}
