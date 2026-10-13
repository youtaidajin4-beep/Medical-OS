// 実験中の条件。固まったら conditions.mjs へ移す
import { readFileSync } from 'node:fs';
import { HARD_SCRIPTS } from './hard-terms.mjs';

const BASE = '内科診察の会話。';
const targets = (i) => HARD_SCRIPTS[i][2].map((t) => (Array.isArray(t) ? t[0] : t));

// 無関係な語を n 個混ぜた場合に、正解の語がどこまで効くか（語数を増やしても効くか）
function mixed(n) {
  return ({ index }) => {
    const all = [...new Set(HARD_SCRIPTS.flatMap((s) => s[2].map((t) => (Array.isArray(t) ? t[0] : t))))];
    const lex = JSON.parse(
      readFileSync(new URL('../../src/modules/medical-knowledge/data/curated-lexicon-v1.json', import.meta.url), 'utf8'),
    ).terms.filter((t) => t.category === 'medications_generic' || t.category === 'diagnoses').map((t) => t.canonical_name);
    const pool = [...all, ...lex];
    const mine = targets(index);
    const picked = [];
    for (let k = 0; picked.length < n; k++) {
      const t = pool[(index * 13 + k * 7) % pool.length];
      if (!mine.includes(t) && !picked.includes(t)) picked.push(t);
    }
    // 正解の語が並びの中ほどに紛れるようにする（先頭・末尾の効きを避ける）
    const at = Math.floor(picked.length / 2);
    return `${BASE}${[...picked.slice(0, at), ...mine, ...picked.slice(at)].join('、')}`;
  };
}

export const EXTRA_CONDITIONS = [
  { id: 'M60', name: '正解＋無関係60語', prompt: mixed(60) },
  { id: 'M120', name: '正解＋無関係120語', prompt: mixed(120) },
  { id: 'M240', name: '正解＋無関係240語', prompt: mixed(240) },
  // 上限の見積り：その文に出る語をそのまま渡す（現実には知り得ない）
  { id: 'O', name: '【上限】その文の語を渡す', prompt: ({ index }) => `${BASE}${targets(index).join('、')}` },
  // 上限の見積り（余計な語が混じる）：その文の語＋他の台本の語を混ぜて、計30語
  {
    id: 'N',
    name: '【現実的】その文の語＋無関係な語',
    prompt: ({ index }) => {
      const all = HARD_SCRIPTS.flatMap((s) => s[2].map((t) => (Array.isArray(t) ? t[0] : t)));
      const mine = targets(index);
      const others = all.filter((t) => !mine.includes(t));
      const picked = [];
      for (let k = 0; picked.length < 24; k++) picked.push(others[(index * 7 + k * 5) % others.length]);
      const mixed = [...new Set([...mine, ...picked])].sort((a, b) => ((a.length * 31 + index) % 7) - ((b.length * 31 + index) % 7));
      return `${BASE}${mixed.join('、')}`;
    },
  },
];
