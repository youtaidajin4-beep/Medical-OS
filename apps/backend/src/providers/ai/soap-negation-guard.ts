import { WarningSeverity } from '@prisma/client';
import { ClinicalValidationWarning } from './clinical-data-validator';

/**
 * 会話で否定されたことが、SOAPで「ある」に反転していないかを確かめる。
 *
 * 2026-10-26、介護保険の意見書の台本で、娘が「夜中に起きて歩き回ることもないです」と言ったのに、
 * SOAPは「夜中に起きて歩き回ることがある」と書いた。徘徊の有無は主治医意見書にそのまま出る項目で、
 * 反転はカルテの嘘になる。プロンプトの約束だけでは防げないので、出てきた後に機械で突き合わせる。
 *
 * 消さずに「要確認」に出す（先生の目を1秒そこへ向ける）。
 */

const NEGATION = /(こともない|ことはない|ことも無い|ありません|ないです|なかった|ていない|してない|なし|ません|ない)(?:[。、]|$)/;
const PARTICLES = /[てにをがはもでと、]/;
/** SOAPの側で「ある」と読める言い方 */
const POSITIVE = /(ことがある|あり|ある|している|する|出る|認める|みられる|あった|いる)/;
/** SOAPの側で否定と読める言い方 */
const NEGATIVE = /(ない|なし|ません|認めず|否定|なかった|無し)/;

function sentences(text: string): string[] {
  return text
    .split(/[。\n]/)
    .map((s) => s.replace(/^\s*[\[［][^\]］]*[\]］]\s*/, '').trim())
    .filter(Boolean);
}

/** 否定された出来事の言い方（「歩き回る」のような短い語）を会話から拾う */
export function negatedPhrases(transcript: string): string[] {
  const out = new Set<string>();
  const all = sentences(transcript);
  for (const s of all) {
    const m = s.match(NEGATION);
    if (!m || m.index == null) continue;
    const before = s.slice(0, m.index).replace(/(こと|の)?(も|は)?$/, '');
    const stem = before.split(PARTICLES).pop()?.trim() ?? '';
    if (stem.length < 3 || stem.length > 8) continue;
    // 同じ言い方が、否定でない文にも出てくるなら（実際にあった話）、反転とは言えない
    const positive = all.some((t) => t.includes(stem) && !NEGATION.test(t));
    if (!positive) out.add(stem);
  }
  return [...out];
}

export type NegationInversion = { phrase: string; line: string };

export function findNegationInversions(
  soap: { subjective: string; objective: string; assessment: string; plan: string },
  transcript: string,
): NegationInversion[] {
  const phrases = negatedPhrases(transcript);
  if (!phrases.length) return [];
  const lines = [soap.subjective, soap.objective, soap.assessment, soap.plan].flatMap(sentences);
  const hits: NegationInversion[] = [];
  for (const phrase of phrases) {
    const line = lines.find((l) => l.includes(phrase) && POSITIVE.test(l) && !NEGATIVE.test(l));
    if (line) hits.push({ phrase, line });
  }
  return hits;
}

export function buildNegationInversionWarnings(hits: NegationInversion[]): ClinicalValidationWarning[] {
  return hits.map((h) => ({
    category: 'negation_inversion',
    message: `要確認：会話では「${h.phrase}」は否定されていますが、SOAPでは「あり」と読める書き方です（${h.line.slice(0, 40)}）。原文を確かめてください。`,
    severity: WarningSeverity.WARNING,
  }));
}
