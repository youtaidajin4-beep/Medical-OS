/**
 * Apply safe stt_error aliases from last-report.json into stt-error-auto-patches.ts
 * Usage: npx ts-node scripts/medical-knowledge/patch-from-failures.ts
 */
import * as fs from 'fs';
import * as path from 'path';
import { INTERNAL_MEDICINE_SEED_TERMS } from '../../src/modules/medical-knowledge/data/internal-medicine-seed';
import { EvalReport } from '../../test/fixtures/medical-knowledge/cases.schema';
import { SttErrorPatch } from '../../src/modules/medical-knowledge/data/stt-error-auto-patches';

const REPORT = path.join(__dirname, '../../test/fixtures/medical-knowledge/last-report.json');
const PATCH_FILE = path.join(
  __dirname,
  '../../src/modules/medical-knowledge/data/stt-error-auto-patches.ts',
);
const MANUAL = path.join(
  __dirname,
  '../../test/fixtures/medical-knowledge/manual-review-aliases.json',
);

const existingSurfaces = new Set<string>();
for (const t of INTERNAL_MEDICINE_SEED_TERMS) {
  existingSurfaces.add(t.canonicalName);
  for (const a of t.aliases ?? []) existingSurfaces.add(a.alias);
}

function isSafeAlias(surface: string, canonical: string): string | null {
  if (!surface || !canonical) return 'empty';
  if (surface === canonical) return 'same as canonical';
  if (surface.length < 3 && !/^[A-Za-z0-9]{2,}$/.test(surface)) return 'too short';
  // Spaced-out kana is noisy and collides; skip spaces/punctuation-only mutations
  if (/\s/.test(surface)) return 'contains whitespace';
  if (existingSurfaces.has(surface) && surface !== canonical) {
    // already mapped somewhere — only OK if already to this canonical
    const owner = INTERNAL_MEDICINE_SEED_TERMS.find(
      (t) => t.canonicalName === surface || t.aliases?.some((a) => a.alias === surface),
    );
    if (owner && owner.canonicalName !== canonical) return `collides with ${owner.canonicalName}`;
  }
  // Reject if surface equals another medication canonical
  const otherMed = INTERNAL_MEDICINE_SEED_TERMS.find(
    (t) => t.category === 'medication' && t.canonicalName === surface && t.canonicalName !== canonical,
  );
  if (otherMed) return `is another medication canonical (${otherMed.canonicalName})`;
  return null;
}

function parseExistingPatches(src: string): SttErrorPatch[] {
  const match = src.match(/AUTO_STT_ERROR_PATCHES[^=]*=\s*(\[[\s\S]*?\]);/);
  if (!match) return [];
  try {
    // eslint-disable-next-line no-eval
    return eval(`(${match[1]})`) as SttErrorPatch[];
  } catch {
    return [];
  }
}

function main() {
  if (!fs.existsSync(REPORT)) {
    console.error(`Missing ${REPORT}. Run knowledge:eval first.`);
    process.exit(1);
  }
  const report = JSON.parse(fs.readFileSync(REPORT, 'utf8')) as EvalReport;
  const existingSrc = fs.readFileSync(PATCH_FILE, 'utf8');
  const patches = parseExistingPatches(existingSrc);
  const seen = new Set(patches.map((p) => `${p.alias}=>${p.canonicalName}`));
  const manual: Array<{ surfaceForm: string; expectedCanonical: string; reason: string }> = [];
  let added = 0;

  for (const f of report.failures) {
    if (!f.critical || !f.patchHint) continue;
    const { surfaceForm, expectedCanonical } = f.patchHint;
    const key = `${surfaceForm}=>${expectedCanonical}`;
    if (seen.has(key)) continue;
    const unsafe = isSafeAlias(surfaceForm, expectedCanonical);
    if (unsafe) {
      manual.push({ surfaceForm, expectedCanonical, reason: unsafe });
      continue;
    }
    const catTerm = INTERNAL_MEDICINE_SEED_TERMS.find((t) => t.canonicalName === expectedCanonical);
    patches.push({
      canonicalName: expectedCanonical,
      alias: surfaceForm,
      category: (catTerm?.category as SttErrorPatch['category']) ?? 'medication',
    });
    seen.add(key);
    existingSurfaces.add(surfaceForm);
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
  console.log(`Added ${added} aliases. Manual review: ${manual.length}. Patches file → ${PATCH_FILE}`);
}

main();
