import { normalizeMedicalText } from './japanese-normalizer';
import { KnowledgeIndex } from './knowledge-index';

/**
 * 先生がSOAPや診療記録で直した語から、「聞き違いの語 → 正しい語」を拾う。
 *
 * 診察のたびに、先生の直しが辞書に貯まっていく（更新される）ための入り口。
 * 直した結果の語が**辞書に載っている医療の語**で、直す前の語が近い綴りのときだけ拾う。
 * 文章を書き直しただけの編集（長さが大きく変わる）や、数字・用量の直しは対象にしない。
 */
const TERM_RE = /[ァ-ヺー]{3,}|[一-鿿々]{2,}|[A-Za-z][A-Za-z0-9\-]{1,}/g;
const LEARNABLE = new Set([
  'medication',
  'diagnosis',
  'laboratory_test',
  'imaging',
  'procedure',
  'symptom',
  'finding',
]);

let index: KnowledgeIndex | null = null;
const lexicon = () => (index ??= KnowledgeIndex.fromSeed());

function counts(text: string): Map<string, number> {
  const m = new Map<string, number>();
  for (const t of text.match(TERM_RE) ?? []) m.set(t, (m.get(t) ?? 0) + 1);
  return m;
}

function editDistance(a: string, b: string): number {
  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) dp[0]![j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      dp[i]![j] = Math.min(
        dp[i - 1]![j]! + 1,
        dp[i]![j - 1]! + 1,
        dp[i - 1]![j - 1]! + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    }
  }
  return dp[a.length]![b.length]!;
}

export type TermEdit = { wrong: string; correct: string; category: string };

export function mineTermEdits(before: string, after: string): TermEdit[] {
  if (!before || !after || before === after) return [];
  // 文章を書き直しただけの編集は、語の直しではない
  if (Math.abs(after.length - before.length) > Math.max(20, before.length * 0.4)) return [];

  const b = counts(before);
  const a = counts(after);
  const removed = [...b.entries()].filter(([t, n]) => n > (a.get(t) ?? 0)).map(([t]) => t);
  const added = [...a.entries()].filter(([t, n]) => n > (b.get(t) ?? 0)).map(([t]) => t);
  if (!removed.length || !added.length) return [];

  const out: TermEdit[] = [];
  const used = new Set<string>();
  for (const correct of added) {
    const hit = lexicon()
      .lookup(correct)
      .find((h) => LEARNABLE.has(h.category));
    if (!hit) continue;
    const c = normalizeMedicalText(correct);
    let best: { token: string; dist: number } | null = null;
    for (const wrong of removed) {
      if (used.has(wrong)) continue;
      const w = normalizeMedicalText(wrong);
      if (!w || w === c) continue;
      const dist = editDistance(w, c);
      const limit = Math.max(2, Math.ceil(Math.max(w.length, c.length) * 0.5));
      if (dist <= limit && (!best || dist < best.dist)) best = { token: wrong, dist };
    }
    if (best) {
      used.add(best.token);
      out.push({ wrong: best.token, correct, category: hit.category });
    }
  }
  return out;
}
