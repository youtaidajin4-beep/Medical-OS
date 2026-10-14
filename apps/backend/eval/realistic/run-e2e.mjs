/**
 * 合成音声（scripts.py の mp3）→ 文字起こし → SOAP の通し測定。
 *
 *   node eval/realistic/run-e2e.mjs [試行回数]
 *
 * 1. mp3 を gpt-4o-transcribe-diarize で文字にする（本番の録音全体の経路。語彙ヒントなし）。結果は .local/ にキャッシュ。作り直すときは --retranscribe
 * 2. 的（scripts.py の targets / forbidden）と合わせて cases-realistic.json を作る
 * 3. run-soap-coverage-eval.mjs --only after で SOAP 転記率と捏造を測る
 *
 * 合成の声は実際の声より聞き取りやすい。ここで落ちるものは、実機ではまず落ちる。
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync, spawnSync } from 'node:child_process';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..', '..', '..');
const AUDIO = join(ROOT, '.local', 'verification-audio', 'realistic');
const CACHE = join(AUDIO, 'transcripts');
const KEY = process.env.OPENAI_API_KEY;
const TRIALS = process.argv.find((a) => /^\d+$/.test(a)) ?? '3';
if (!KEY) { console.error('OPENAI_API_KEY が要ります'); process.exit(1); }
mkdirSync(CACHE, { recursive: true });

const cases = JSON.parse(execFileSync('python3', [join(HERE, 'scripts.py'), 'cases'], { encoding: 'utf8' }));

for (const c of cases) {
  const cache = join(CACHE, `${c.id}.txt`);
  if (!existsSync(cache) || process.argv.includes('--retranscribe')) {
    // 本番の「録音全体の文字起こし」と同じ経路（話者分離つき）。gpt-4o-transcribe の単体は長い音声の後半を切るので使わない
    const form = new FormData();
    form.append('model', 'gpt-4o-transcribe-diarize');
    form.append('response_format', 'diarized_json');
    form.append('chunking_strategy', 'auto');
    form.append('file', new Blob([readFileSync(join(AUDIO, `${c.id}.mp3`))], { type: 'audio/mpeg' }), `${c.id}.mp3`);
    const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST', headers: { Authorization: `Bearer ${KEY}` }, body: form,
    });
    if (!res.ok) { console.error(c.id, res.status, await res.text()); process.exit(1); }
    const j = await res.json();
    // 話者ラベルは A/B/C。最初に話した人を医師、ほかを患者側にする（本番は speaker-role-mapper が内容から決める）
    const first = j.segments?.[0]?.speaker;
    const text = (j.segments ?? []).map((sg) => `${sg.speaker === first ? '医師' : '患者'}: ${sg.text}`).join('\n');
    writeFileSync(cache, text);
    console.log(`${c.id}: 文字起こし ${text.length}字 / 話者 ${[...new Set((j.segments ?? []).map((x) => x.speaker))].join(',')}`);
  }
  c.transcript = readFileSync(cache, 'utf8');
  c.baselineZoomGpt = '';
}

const out = join(HERE, '..', 'soap-corpus', 'cases-realistic.json');
writeFileSync(out, JSON.stringify({ source: '合成音声（scripts.py）→ gpt-4o-transcribe', cases }, null, 1));
const r = spawnSync('node', [join(HERE, '..', 'run-soap-coverage-eval.mjs'), TRIALS, '--only', 'after'], {
  env: { ...process.env, EVAL_CORPUS: out }, stdio: 'inherit',
});
process.exit(r.status ?? 0);
