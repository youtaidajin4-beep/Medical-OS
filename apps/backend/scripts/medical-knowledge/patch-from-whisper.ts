/**
 * Merge safe whisper ASR surfaces into stt-error-auto-patches.ts
 * Usage: npx ts-node scripts/medical-knowledge/patch-from-whisper.ts
 */
import * as fs from 'fs';
import * as path from 'path';
import { INTERNAL_MEDICINE_SEED_TERMS } from '../../src/modules/medical-knowledge/data/internal-medicine-seed';
import { SttErrorPatch } from '../../src/modules/medical-knowledge/data/stt-error-auto-patches';

const FIXTURE = path.join(__dirname, '../../test/fixtures/medical-knowledge');
const SPOT = path.join(FIXTURE, 'whisper-spotcheck-report.json');
const CAND = path.join(FIXTURE, 'whisper-alias-candidates.json');
const PATCH_FILE = path.join(
  __dirname,
  '../../src/modules/medical-knowledge/data/stt-error-auto-patches.ts',
);
const MANUAL = path.join(FIXTURE, 'whisper-manual-review.json');

const existingSurfaces = new Set<string>();
for (const t of INTERNAL_MEDICINE_SEED_TERMS) {
  existingSurfaces.add(t.canonicalName);
  for (const a of t.aliases ?? []) existingSurfaces.add(a.alias);
}

function isSafe(surface: string, canonical: string): string | null {
  if (!surface || !canonical) return 'empty';
  if (surface === canonical) return 'same';
  if (/\s|[A-Za-z]{3,}/.test(surface)) return 'latin/whitespace noise';
  if (surface.length < 3) return 'too short';
  if (/[0-9]/.test(surface) && surface.length < 5) return 'digit-heavy short';
  const owner = INTERNAL_MEDICINE_SEED_TERMS.find(
    (t) => t.canonicalName === surface || t.aliases?.some((a) => a.alias === surface),
  );
  if (owner && owner.canonicalName !== canonical) return `collides with ${owner.canonicalName}`;
  return null;
}

function parsePatches(src: string): SttErrorPatch[] {
  const match = src.match(/AUTO_STT_ERROR_PATCHES[^=]*=\s*(\[[\s\S]*?\]);/);
  if (!match) return [];
  try {
    // eslint-disable-next-line no-eval
    return eval(`(${match[1]})`) as SttErrorPatch[];
  } catch {
    return [];
  }
}

function guessSurface(asr: string, expected: string): string | undefined {
  if (!asr || asr.includes(expected)) return undefined;
  const runs = asr.match(/[一-龯ぁ-んァ-ンー]{3,}/g) ?? [];
  return runs.filter((r) => r !== expected).sort((a, b) => b.length - a.length)[0];
}

function main() {
  if (!fs.existsSync(SPOT)) {
    console.error('Missing whisper-spotcheck-report.json');
    process.exit(1);
  }
  const spot = JSON.parse(fs.readFileSync(SPOT, 'utf8')) as {
    results: Array<{
      asrText?: string;
      originalInput?: string;
      passed?: boolean;
      failure?: { patchHint?: { surfaceForm: string; expectedCanonical: string }; reasons?: string[] };
      patchHint?: { surfaceForm: string; expectedCanonical: string };
    }>;
  };

  const candidates: Array<{ surfaceForm: string; expectedCanonical: string; from: string }> = [];
  for (const r of spot.results ?? []) {
    if (r.passed) continue;
    const hint = r.patchHint ?? r.failure?.patchHint;
    const reasons = r.failure?.reasons?.join(' ') ?? '';
    const m = reasons.match(/mustContain missing: ([^\s]+)/) || reasons.match(/expectedCanonical not found: ([^\s]+)/);
    const expected = hint?.expectedCanonical ?? m?.[1];
    if (!expected || !r.asrText) continue;
    const surface = hint?.surfaceForm && hint.surfaceForm !== expected
      ? hint.surfaceForm
      : guessSurface(r.asrText, expected);
    if (!surface) continue;
    candidates.push({ surfaceForm: surface, expectedCanonical: expected, from: r.asrText });
  }

  fs.writeFileSync(
    CAND,
    JSON.stringify({ generatedAt: new Date().toISOString(), aliasCandidates: candidates }, null, 2),
  );

  const patches = parsePatches(fs.readFileSync(PATCH_FILE, 'utf8'));
  const seen = new Set(patches.map((p) => `${p.alias}=>${p.canonicalName}`));
  const manual: typeof candidates = [];
  let added = 0;
  for (const c of candidates) {
    const key = `${c.surfaceForm}=>${c.expectedCanonical}`;
    if (seen.has(key)) continue;
    const unsafe = isSafe(c.surfaceForm, c.expectedCanonical);
    if (unsafe) {
      manual.push(c);
      continue;
    }
    const catTerm = INTERNAL_MEDICINE_SEED_TERMS.find((t) => t.canonicalName === c.expectedCanonical);
    patches.push({
      canonicalName: c.expectedCanonical,
      alias: c.surfaceForm,
      category: (catTerm?.category as SttErrorPatch['category']) ?? 'medication',
    });
    seen.add(key);
    existingSurfaces.add(c.surfaceForm);
    added += 1;
  }

  const body = `/**
 * Auto-generated STT error aliases from the knowledge eval farm.
 * Updated by scripts/medical-knowledge/patch-from-failures.ts
 */
export type SttErrorPatch = {
  canonicalName: string;
  alias: string;
  /** category hint for new terms not already in seed */
  category?: 'medication' | 'diagnosis' | 'laboratory_test' | 'other';
};

export const AUTO_STT_ERROR_PATCHES: SttErrorPatch[] = ${JSON.stringify(patches, null, 2)};
`;
  fs.writeFileSync(PATCH_FILE, body, 'utf8');
  fs.writeFileSync(MANUAL, JSON.stringify({ generatedAt: new Date().toISOString(), items: manual }, null, 2));
  console.log(`Whisper aliases added=${added}, manual=${manual.length}`);
}

main();
