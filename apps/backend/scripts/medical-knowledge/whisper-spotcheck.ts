/**
 * TTS → Whisper → knowledge correction spot-check (50 cases).
 * Requires OPENAI_API_KEY. Skips cleanly when absent.
 *
 * Usage: npx ts-node scripts/medical-knowledge/whisper-spotcheck.ts
 */
import * as fs from 'fs';
import * as path from 'path';
import { KnowledgeIndex } from '../../src/modules/medical-knowledge/knowledge-index';
import { INTERNAL_MEDICINE_SEED_TERMS } from '../../src/modules/medical-knowledge/data/internal-medicine-seed';
import { EvalCase } from '../../test/fixtures/medical-knowledge/cases.schema';
import { loadCasesFromJsonl, scoreCase } from './score-case';

const FIXTURE_DIR = path.join(__dirname, '../../test/fixtures/medical-knowledge');
const CASES = path.join(FIXTURE_DIR, 'generated-cases.jsonl');
const OUT = path.join(FIXTURE_DIR, 'whisper-spotcheck-report.json');
const SPOT_N = 50;

async function ttsToFile(apiKey: string, text: string, filePath: string) {
  const res = await fetch('https://api.openai.com/v1/audio/speech', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini-tts',
      voice: 'alloy',
      input: text,
      response_format: 'mp3',
    }),
  });
  if (!res.ok) {
    // fallback older model
    const res2 = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'tts-1',
        voice: 'alloy',
        input: text,
        response_format: 'mp3',
      }),
    });
    if (!res2.ok) throw new Error(`TTS failed: ${res.status} / ${res2.status} ${await res2.text()}`);
    fs.writeFileSync(filePath, Buffer.from(await res2.arrayBuffer()));
    return;
  }
  fs.writeFileSync(filePath, Buffer.from(await res.arrayBuffer()));
}

async function whisper(apiKey: string, filePath: string): Promise<string> {
  const buf = fs.readFileSync(filePath);
  const form = new FormData();
  form.append('file', new Blob([buf], { type: 'audio/mpeg' }), path.basename(filePath));
  form.append('model', 'whisper-1');
  form.append('language', 'ja');
  const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form,
  });
  if (!res.ok) throw new Error(`Whisper failed: ${res.status} ${await res.text()}`);
  const json = (await res.json()) as { text?: string };
  return json.text ?? '';
}

/** Prefer a contiguous ASR token that looks like a misheard expected term */
function guessSurface(asr: string, expected: string, fallback?: string): string | undefined {
  if (asr.includes(expected)) return undefined;
  // longest CJK/kana run not equal to expected
  const runs = asr.match(/[一-龯ぁ-んァ-ンー]{3,}/g) ?? [];
  const ranked = runs
    .filter((r) => r !== expected)
    .sort((a, b) => b.length - a.length);
  return ranked[0] ?? fallback;
}

function pickSpotCases(all: EvalCase[]): EvalCase[] {
  const criticalCats = new Set(['medication', 'negation', 'dosage', 'stt_error', 'brand', 'lab']);
  const pool = all.filter((c) => c.critical && criticalCats.has(c.category));
  const picked: EvalCase[] = [];
  const perCat = Math.ceil(SPOT_N / criticalCats.size);
  for (const cat of criticalCats) {
    const slice = pool.filter((c) => c.category === cat).slice(0, perCat);
    picked.push(...slice);
  }
  return picked.slice(0, SPOT_N);
}

async function main() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    const skip = {
      skipped: true,
      reason: 'OPENAI_API_KEY not set',
      generatedAt: new Date().toISOString(),
    };
    fs.writeFileSync(OUT, JSON.stringify(skip, null, 2));
    console.log('OPENAI_API_KEY missing — wrote skip report', OUT);
    return;
  }
  if (!fs.existsSync(CASES)) {
    console.error('Missing generated-cases.jsonl');
    process.exit(1);
  }
  const all = loadCasesFromJsonl(fs.readFileSync(CASES, 'utf8'));
  const spot = pickSpotCases(all);
  const index = KnowledgeIndex.fromSeed(INTERNAL_MEDICINE_SEED_TERMS);
  const tmpDir = path.join(FIXTURE_DIR, '.whisper-tmp');
  fs.mkdirSync(tmpDir, { recursive: true });

  const results: Array<Record<string, unknown>> = [];
  let criticalFailed = 0;

  for (let i = 0; i < spot.length; i++) {
    const c = spot[i]!;
    const audioPath = path.join(tmpDir, `${c.id}.mp3`);
    try {
      await ttsToFile(apiKey, c.input, audioPath);
      const asr = await whisper(apiKey, audioPath);
      const expected =
        c.expect.expectedCanonical ??
        c.expect.mustContain?.[0] ??
        c.expect.entityNormalized?.find((e) => e.entityType === 'medication')?.value;
      // Re-score against ASR; attach surface hint from ASR tokens when expected is known
      const asrCase: EvalCase = {
        ...c,
        input: asr,
        id: `${c.id}-asr`,
        expect: {
          ...c.expect,
          surfaceForm: expected ? guessSurface(asr, expected, c.expect.surfaceForm) : c.expect.surfaceForm,
          expectedCanonical: expected ?? c.expect.expectedCanonical,
        },
      };
      const fail = scoreCase(asrCase, index);
      if (fail?.critical) criticalFailed += 1;
      results.push({
        id: c.id,
        category: c.category,
        originalInput: c.input,
        asrText: asr,
        passed: !fail,
        critical: c.critical,
        failure: fail,
        patchHint: fail?.patchHint,
      });
      console.log(`[${i + 1}/${spot.length}] ${c.id} ${fail ? 'FAIL' : 'OK'}`);
    } catch (e) {
      results.push({
        id: c.id,
        error: e instanceof Error ? e.message : String(e),
      });
      console.error(`[${i + 1}/${spot.length}] ${c.id} ERROR`, e);
    }
  }

  const aliasCandidates = results
    .filter((r) => r.patchHint && typeof r.patchHint === 'object')
    .map((r) => r.patchHint);

  const report = {
    skipped: false,
    generatedAt: new Date().toISOString(),
    total: results.length,
    criticalFailed,
    aliasCandidates,
    results,
  };
  fs.writeFileSync(OUT, JSON.stringify(report, null, 2));
  const candPath = path.join(FIXTURE_DIR, 'whisper-alias-candidates.json');
  fs.writeFileSync(candPath, JSON.stringify({ generatedAt: report.generatedAt, aliasCandidates }, null, 2));
  console.log(`Whisper spotcheck → ${OUT} (criticalFailed=${criticalFailed})`);
  console.log(`Alias candidates → ${candPath}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
