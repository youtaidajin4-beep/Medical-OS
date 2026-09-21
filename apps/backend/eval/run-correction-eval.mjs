/**
 * 文字起こし校正の精度を、条件を変えながら測る。
 *
 * 「辞書を増やせば良くなるはず」で実装しないための道具。条件ごとに同じ問題を
 * 何回も解かせ、**的（失われた医療用語）が戻ったか**だけを数える。
 * 表記の違い（「五ミリグラム」→「5mg」）は的から外してあるので、
 * 正しい正規化を減点しない。
 *
 * 問題は eval/stt-corpus/cases.json（build-stt-corpus.mjs が作る）。
 *
 * 使い方:
 *   OPENAI_API_KEY=... node eval/run-correction-eval.mjs [試行回数]
 *
 * 読み方:
 *   - 回復率 … 失われた医療用語のうち、校正で戻った割合。高いほど良い
 *   - 改悪   … 直さなくてよい行を変えてしまった数。0であるべき
 *   - ばらつきが条件差より大きいときは、その差を根拠にしない
 */
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const KEY = process.env.OPENAI_API_KEY;
if (!KEY) {
  console.error('OPENAI_API_KEY が要ります');
  process.exit(1);
}

const TRIALS = Number(process.argv[2] ?? 3);

const SYSTEM = readFileSync(
  join(HERE, '..', 'src', 'providers', 'ai', 'openai-llm.provider.ts'),
  'utf8',
).match(/const TRANSCRIPT_CORRECTION_SYSTEM = `([\s\S]*?)`;\n/)[1];

const pack = JSON.parse(
  readFileSync(
    join(HERE, '..', 'src', 'modules', 'medical-knowledge', 'data', 'medical_os_internal_medicine_knowledge_v2.json'),
    'utf8',
  ),
);
const corpus = JSON.parse(readFileSync(join(HERE, 'stt-corpus', 'cases.json'), 'utf8'));
const scorable = corpus.cases.filter((c) => c.kind === 'scorable');
/**
 * 直さなくてよい行。ここを変えたら改悪。
 * **表記ゆれの行だけ**を使う。辞書の穴（本物の誤変換だが的にできない行）を混ぜると、
 * 正しい修正まで改悪に数えてしまう（実際に「副部超音波検査→腹部超音波検査」を
 * 改悪として数えていた）。
 */
const controls = corpus.cases.filter((c) => c.kind === 'notation');

/**
 * 同じものを指す的をひとつにまとめる。
 * ムコダインとカルボシステインは同じ薬なので、どちらかが戻れば回復。
 */
function dedupeTargets(targets) {
  const out = [];
  for (const t of targets) {
    const same = out.find((o) => o.accept.some((f) => t.accept.includes(f)));
    if (same) {
      same.accept = [...new Set([...same.accept, ...t.accept])];
      continue;
    }
    out.push({ canonical: t.canonical, accept: [...t.accept] });
  }
  return out;
}

const byCategory = (category) =>
  pack.terms.filter((t) => t.category === category).map((t) => t.canonical_name);

/** 測る条件。ここを増やして比べる */
const CONFIGS = [
  { label: '辞書なし', hint: null },
  {
    label: 'いまの本番（各20語）',
    hint:
      `常用診断: ${byCategory('diagnoses').slice(0, 20).join('、')}\n` +
      `常用薬剤: ${byCategory('medications_generic').slice(0, 20).join('、')}`,
  },
  {
    label: '全カテゴリ',
    hint:
      `常用診断: ${byCategory('diagnoses').join('、')}\n` +
      `常用薬剤: ${byCategory('medications_generic').join('、')}\n` +
      `症状・所見: ${byCategory('symptoms_findings').join('、')}\n` +
      `検査・画像: ${[...byCategory('laboratory_tests'), ...byCategory('imaging_procedures')].join('、')}`,
  },
];

async function correct(lines, hint) {
  const system = hint ? `${SYSTEM}\n\nクリニック語彙:\n${hint}` : SYSTEM;
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: lines.map((t, i) => `${i + 1}: ${t}`).join('\n') },
      ],
      response_format: { type: 'json_object' },
      max_tokens: 2500,
      temperature: 0,
    }),
  });
  const json = await res.json();
  if (json.error) throw new Error(json.error.message);
  const out = new Map();
  for (const c of JSON.parse(json.choices[0].message.content).corrections ?? []) {
    out.set(Number(c.line), String(c.text));
  }
  return out;
}

async function runOnce(hint) {
  const lines = [...scorable.map((c) => c.heard), ...controls.map((c) => c.heard)];
  const fixed = await correct(lines, hint);

  let recovered = 0;
  let total = 0;
  const missed = [];
  scorable.forEach((c, i) => {
    const text = fixed.get(i + 1) ?? c.heard;
    for (const target of dedupeTargets(c.targets)) {
      total += 1;
      // その語のどの書き方でも戻ったとみなす
      if (target.accept.some((form) => text.includes(form))) recovered += 1;
      else missed.push(target.canonical);
    }
  });

  let worsened = 0;
  controls.forEach((c, i) => {
    const text = fixed.get(scorable.length + i + 1);
    if (text && text !== c.heard) worsened += 1;
  });

  return { recovered, total, missed, worsened };
}

function stats(values) {
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const spread = Math.max(...values) - Math.min(...values);
  return { mean, spread };
}

async function main() {
  console.log(`問題: 的 ${scorable.reduce((n, c) => n + c.targets.length, 0)} 件 / 変えてはいけない行 ${controls.length} 件`);
  console.log(`各条件 ${TRIALS} 回\n`);

  const results = [];
  for (const config of CONFIGS) {
    const runs = [];
    for (let i = 0; i < TRIALS; i++) runs.push(await runOnce(config.hint));
    const rate = stats(runs.map((r) => (r.total ? r.recovered / r.total : 0)));
    const worsened = runs.map((r) => r.worsened);
    results.push({ label: config.label, rate, worsened, runs });
    console.log(
      `${config.label.padEnd(22)} 回復率 ${(rate.mean * 100).toFixed(0)}% ` +
        `(${runs.map((r) => `${r.recovered}/${r.total}`).join(' ')})  ` +
        `幅 ${(rate.spread * 100).toFixed(0)}pt  改悪 ${worsened.join(',')}  ` +
        `ヒント${(config.hint ?? '').length}字`,
    );
    const stillMissed = [...new Set(runs.flatMap((r) => r.missed))];
    if (stillMissed.length) console.log(`    戻らず: ${stillMissed.join('、')}`);
  }

  const best = results.reduce((a, b) => (b.rate.mean > a.rate.mean ? b : a));
  const base = results[0];
  const gap = (best.rate.mean - base.rate.mean) * 100;
  console.log(
    `\n最良: ${best.label}（辞書なしとの差 ${gap.toFixed(0)}pt、ばらつきの幅 ${(best.rate.spread * 100).toFixed(0)}pt）`,
  );
  if (gap <= best.rate.spread * 100) {
    console.log('※ 差がばらつきの幅に収まっている。この結果を根拠に採用しないこと。');
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
