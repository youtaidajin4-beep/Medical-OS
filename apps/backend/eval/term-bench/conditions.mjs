/**
 * 比べる条件。run.mjs が順に走らせる。
 *
 *   prompt(ctx) … 文字起こしに渡す語彙ヒント（無ければ渡さない）
 *   post(text)  … 文字起こしのあとに通す補正（辞書で近い語に直す）
 *
 * 本番の経路と同じ関数を dist から読む。**`nest build` 後に走らせること**。
 */
import { buildWhisperPrompt, resolveMedicalGlossary } from '../../dist/providers/ai/medical-glossary.js';

const production = buildWhisperPrompt(resolveMedicalGlossary());

export const CONDITIONS = [
  { id: 'A', name: 'ヒントなし', prompt: null },
  { id: 'B', name: '現行のヒント（固定・約40語）', prompt: () => production },
];

// 以降の条件は、仕組みを入れるたびにここへ足す（動的な語彙、近い語への補正など）
try {
  const extra = await import('./conditions.extra.mjs');
  CONDITIONS.push(...extra.EXTRA_CONDITIONS);
} catch (e) {
  if (e?.code !== 'ERR_MODULE_NOT_FOUND') throw e;
}
