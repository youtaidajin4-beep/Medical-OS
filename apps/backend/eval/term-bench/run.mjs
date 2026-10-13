/**
 * 薬名・病名・検査名の聞き取りを、条件を変えて比べる。
 *
 * 使い方（apps/backend で。先に `nest build` しておく）:
 *   OPENAI_API_KEY=... node eval/term-bench/run.mjs            # すべての条件
 *   OPENAI_API_KEY=... node eval/term-bench/run.mjs --only=B,D # 条件を絞る
 *   OPENAI_API_KEY=... node eval/term-bench/run.mjs --repeat=3 # 試行回数（ばらつきを見る）
 *
 * 音声は macOS の `say` で台本を読み上げて作る（初回のみ。audio/ にキャッシュ）。
 * 合成音声なので実際の診察室の音とは違う。**条件どうしの差**を見る道具で、
 * 絶対値を診察室の精度として読まないこと。
 *
 * 見る数字
 *   - 語の回収率 … 台本に出た医療用語のうち、文字起こしに正しく残った割合
 *   - 補正後     … さらに、辞書による補正（近い語への置き換え）を通した後の割合
 *   - 改悪       … 正しく聞き取れていた語を、補正が別の語に変えてしまった数。0であるべき
 *   - 写し       … 渡した語彙ヒントをそのまま文字にした数（幻覚）。0であるべき
 */
import { execFile } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { HARD_SCRIPTS } from './hard-terms.mjs';
import { CONDITIONS } from './conditions.mjs';

const run = promisify(execFile);
const HERE = dirname(fileURLToPath(import.meta.url));
const AUDIO = join(HERE, 'audio');
mkdirSync(AUDIO, { recursive: true });

const KEY = process.env.OPENAI_API_KEY;
if (!KEY) {
  console.error('OPENAI_API_KEY が要ります');
  process.exit(1);
}
const arg = (name) => process.argv.find((a) => a.startsWith(`--${name}=`))?.split('=')[1];
const only = arg('only')?.split(',');
const repeat = Number(arg('repeat') ?? 1);

const VOICES = { doctor: 'Rocko (日本語（日本）)', patient: 'Grandpa (日本語（日本）)' };
const norm = (s) =>
  s.normalize('NFKC').replace(/[\s、。，．,.!?！？「」\-‐]/g, '').toLowerCase();

async function ensureAudio(i, [voice, text]) {
  const id = `h${String(i + 1).padStart(2, '0')}`;
  const mp3 = join(AUDIO, `${id}.mp3`);
  if (!existsSync(mp3)) {
    const aiff = join(AUDIO, `${id}.aiff`);
    await run('say', ['-v', VOICES[voice], '-o', aiff, text]);
    await run('ffmpeg', ['-loglevel', 'error', '-y', '-i', aiff, '-ar', '16000', '-ac', '1', '-c:a', 'libmp3lame', '-b:a', '64k', mp3]);
  }
  return mp3;
}

async function stt(model, file, prompt) {
  const form = new FormData();
  form.append('file', new Blob([readFileSync(file)], { type: 'audio/mpeg' }), 'a.mp3');
  form.append('model', model);
  form.append('language', 'ja');
  form.append('response_format', 'json');
  form.append('temperature', '0');
  if (prompt) form.append('prompt', prompt);
  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${KEY}` },
      body: form,
    });
    const json = await res.json();
    if (!json.error) return (json.text ?? '').trim();
    await new Promise((r) => setTimeout(r, 800 * (attempt + 1)));
  }
  return '';
}

const files = [];
for (let i = 0; i < HARD_SCRIPTS.length; i++) files.push(await ensureAudio(i, HARD_SCRIPTS[i]));
const targetsOf = HARD_SCRIPTS.map(([, , ts]) => (ts ?? []).map((t) => (Array.isArray(t) ? t : [t])));
const total = targetsOf.reduce((a, t) => a + t.length, 0);
console.log(`台本 ${HARD_SCRIPTS.length} 文 / 的の語 ${total}  （試行 ${repeat} 回）\n`);

const results = {};
for (const cond of CONDITIONS) {
  if (only && !only.includes(cond.id)) continue;
  const runs = [];
  for (let r = 0; r < repeat; r++) {
    const heard = await Promise.all(
      files.map(async (file, i) => {
        const prompt = cond.prompt ? await cond.prompt({ script: HARD_SCRIPTS[i], index: i }) : undefined;
        const text = await stt(cond.model ?? 'gpt-4o-mini-transcribe', file, prompt);
        return { text, prompt };
      }),
    );
    let hit = 0, hitAfter = 0, worse = 0, echo = 0;
    const misses = [];
    for (let i = 0; i < heard.length; i++) {
      const raw = heard[i].text;
      const fixed = cond.post ? cond.post(raw) : raw;
      for (const [canonical, ...alts] of targetsOf[i]) {
        const ok = (s) => [canonical, ...alts].some((a) => norm(s).includes(norm(a)));
        const a = ok(raw);
        const b = ok(fixed);
        if (a) hit++;
        if (b) hitAfter++;
        if (a && !b) worse++;
        if (!b) misses.push(`${canonical} ← ${fixed.slice(0, 60)}`);
      }
      const p = heard[i].prompt;
      if (p && norm(raw).includes(norm(p).slice(0, 12))) echo++;
    }
    runs.push({ hit, hitAfter, worse, echo, misses });
  }
  results[cond.id] = runs;
  const rate = (k) => runs.map((r) => (100 * r[k]) / total);
  const fmt = (xs) => `${(xs.reduce((a, b) => a + b, 0) / xs.length).toFixed(0)}%` + (xs.length > 1 ? `（幅 ${(Math.max(...xs) - Math.min(...xs)).toFixed(0)}pt）` : '');
  console.log(
    `${cond.id}  ${cond.name.padEnd(34)} 回収 ${fmt(rate('hit'))}  補正後 ${fmt(rate('hitAfter'))}  改悪 ${Math.max(...runs.map((r) => r.worse))}  写し ${Math.max(...runs.map((r) => r.echo))}`,
  );
}
writeFileSync(join(HERE, 'last-result.json'), JSON.stringify(results, null, 1));
if (process.argv.includes('--misses')) {
  for (const [id, runs] of Object.entries(results)) {
    console.log(`\n[${id}] 取りこぼし`);
    for (const m of runs[0].misses) console.log('  ' + m);
  }
}
