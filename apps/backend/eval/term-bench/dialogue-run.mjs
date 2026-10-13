/**
 * 診察の流れに沿って、語彙ヒントの選び方を比べる。
 *
 * 使い方（apps/backend で。先に `nest build`）:
 *   OPENAI_API_KEY=... node eval/term-bench/dialogue-run.mjs [--only=S0,S1] [--repeat=1] [--misses]
 *
 * 各ターンの文字起こしに渡すヒントを、その時点までに分かっていること（カルテの内容と、
 * それまでの会話の文字起こし）だけから選ぶ。**これから話される語は使わない**。
 */
import { execFile } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { DIALOGUES } from './dialogues.mjs';
import { DIALOGUE_STRATEGIES } from './strategies.mjs';

const run = promisify(execFile);
const HERE = dirname(fileURLToPath(import.meta.url));
const AUDIO = join(HERE, 'audio-dialogue');
mkdirSync(AUDIO, { recursive: true });
const KEY = process.env.OPENAI_API_KEY;
if (!KEY) { console.error('OPENAI_API_KEY が要ります'); process.exit(1); }
const arg = (n) => process.argv.find((a) => a.startsWith(`--${n}=`))?.split('=')[1];
const only = arg('only')?.split(',');
const repeat = Number(arg('repeat') ?? 1);
const VOICES = { doctor: 'Rocko (日本語（日本）)', patient: 'Grandpa (日本語（日本）)' };
const norm = (s) => s.normalize('NFKC').replace(/[\s、。，．,.!?！？「」\-‐]/g, '').toLowerCase();

async function audioFor(dlg, i, [voice, text]) {
  const mp3 = join(AUDIO, `${dlg.id}-${i}.mp3`);
  if (!existsSync(mp3)) {
    const aiff = join(AUDIO, `${dlg.id}-${i}.aiff`);
    await run('say', ['-v', VOICES[voice], '-o', aiff, text]);
    await run('ffmpeg', ['-loglevel', 'error', '-y', '-i', aiff, '-ar', '16000', '-ac', '1', '-c:a', 'libmp3lame', '-b:a', '64k', mp3]);
  }
  return mp3;
}
async function stt(file, prompt) {
  const form = new FormData();
  form.append('file', new Blob([readFileSync(file)], { type: 'audio/mpeg' }), 'a.mp3');
  form.append('model', 'gpt-4o-mini-transcribe'); form.append('language', 'ja');
  form.append('response_format', 'json'); form.append('temperature', '0');
  if (prompt) form.append('prompt', prompt);
  for (let a = 0; a < 3; a++) {
    const r = await fetch('https://api.openai.com/v1/audio/transcriptions', { method: 'POST', headers: { Authorization: `Bearer ${KEY}` }, body: form });
    const j = await r.json();
    if (!j.error) return (j.text ?? '').trim();
    await new Promise((r) => setTimeout(r, 800 * (a + 1)));
  }
  return '';
}

for (const d of DIALOGUES) for (let i = 0; i < d.turns.length; i++) await audioFor(d, i, d.turns[i]);
const total = DIALOGUES.reduce((a, d) => a + d.turns.reduce((b, t) => b + t[2].length, 0), 0);
console.log(`会話 ${DIALOGUES.length} 件 / 的の語 ${total}（試行 ${repeat} 回）\n`);

for (const strat of DIALOGUE_STRATEGIES) {
  if (only && !only.includes(strat.id)) continue;
  const runs = [];
  for (let r = 0; r < repeat; r++) {
    let hit = 0, echo = 0, promptChars = 0, promptN = 0, covered = 0;
    const misses = [];
    await Promise.all(DIALOGUES.map(async (d) => {
      const heardSoFar = [];
      for (let i = 0; i < d.turns.length; i++) {
        const prompt = strat.prompt ? await strat.prompt({ dialogue: d, turn: i, heard: [...heardSoFar] }) : undefined;
        const rawText = await stt(join(AUDIO, `${d.id}-${i}.mp3`), prompt);
        const text = strat.post ? strat.post(rawText, { dialogue: d, heard: [...heardSoFar] }) : rawText;
        heardSoFar.push(text);
        if (prompt) { promptChars += prompt.length; promptN++; }
        if (prompt && norm(text).includes(norm(prompt).slice(0, 12))) echo++;
        for (const t of d.turns[i][2]) {
          const ok = norm(text).includes(norm(t));
          if (ok) hit++; else misses.push(`${d.id}#${i} ${t} ← ${text.slice(0, 50)}`);
          if (prompt && norm(prompt).includes(norm(t))) covered++;
        }
      }
    }));
    runs.push({ hit, echo, avg: promptN ? Math.round(promptChars / promptN) : 0, covered, misses });
  }
  const rate = runs.map((x) => (100 * x.hit) / total);
  const mean = rate.reduce((a, b) => a + b, 0) / rate.length;
  console.log(`${strat.id}  ${strat.name.padEnd(36)} 回収 ${mean.toFixed(0)}%${repeat > 1 ? `（幅 ${(Math.max(...rate) - Math.min(...rate)).toFixed(0)}pt）` : ''}  ヒント内に正解の語 ${runs[0].covered}/${total}  平均 ${runs[0].avg}字  写し ${Math.max(...runs.map((x) => x.echo))}`);
  if (process.argv.includes('--misses')) for (const m of runs[0].misses) console.log('    ' + m);
}
