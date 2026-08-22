import { SeedTerm, AliasType, EntityType, RiskLevel } from '../knowledge-types';
import { AUTO_STT_ERROR_PATCHES } from './stt-error-auto-patches';
import { loadInternalMedicineKnowledgePack } from './load-knowledge-pack';

type AliasInput = string | { alias: string; aliasType: AliasType; aliasReading?: string };

function term(
  canonicalName: string,
  category: EntityType,
  opts: {
    reading?: string;
    subcategory?: string;
    englishName?: string;
    abbreviation?: string;
    priority?: number;
    riskLevel?: RiskLevel;
    aliases?: AliasInput[];
  } = {},
): SeedTerm {
  const aliases = (opts.aliases ?? []).map((a) =>
    typeof a === 'string' ? { alias: a, aliasType: 'spoken' as AliasType } : a,
  );
  return {
    canonicalName,
    category,
    subcategory: opts.subcategory,
    reading: opts.reading,
    englishName: opts.englishName,
    abbreviation: opts.abbreviation,
    priority: opts.priority ?? 100,
    riskLevel: opts.riskLevel ?? defaultRisk(category),
    aliases,
  };
}

function defaultRisk(category: EntityType): RiskLevel {
  if (['medication', 'dosage', 'strength', 'allergy', 'laboratory_value', 'negation'].includes(category)) {
    return 'critical';
  }
  if (['treatment_action', 'body_side', 'vital_sign', 'laboratory_test'].includes(category)) {
    return 'high';
  }
  return 'medium';
}

/** Hand-curated STT error surfaces that must always win over generic aliases. */
const STT_ERRORS: SeedTerm[] = [
  term('アムロジピン', 'medication', {
    riskLevel: 'critical',
    aliases: [{ alias: 'アムロジビン', aliasType: 'stt_error' }],
  }),
  term('ムコダイン', 'medication', {
    riskLevel: 'critical',
    aliases: [
      { alias: '無効団員', aliasType: 'stt_error' },
      { alias: '無効だいん', aliasType: 'stt_error' },
    ],
  }),
  term('気管支炎', 'diagnosis', {
    aliases: [{ alias: '期間支援', aliasType: 'stt_error' }],
  }),
  term('聴診', 'finding', {
    aliases: [
      { alias: '調子ん', aliasType: 'stt_error' },
      { alias: '調子んでは', aliasType: 'stt_error' },
    ],
  }),
  term('再診', 'other', {
    aliases: [
      { alias: '最新', aliasType: 'stt_error' },
      { alias: '最新しましょう', aliasType: 'stt_error' },
    ],
  }),
];

const BODY_SIDE: SeedTerm[] = [
  term('右', 'body_side', { riskLevel: 'critical', priority: 160 }),
  term('左', 'body_side', { riskLevel: 'critical', priority: 160 }),
  term('両側', 'body_side', { riskLevel: 'critical', priority: 160 }),
];

function mergeTerms(base: SeedTerm[], extras: SeedTerm[]): SeedTerm[] {
  const byName = new Map<string, SeedTerm>(
    base.map((t) => [t.canonicalName, { ...t, aliases: [...(t.aliases ?? [])] }]),
  );
  for (const extra of extras) {
    const existing = byName.get(extra.canonicalName);
    if (!existing) {
      byName.set(extra.canonicalName, { ...extra, aliases: [...(extra.aliases ?? [])] });
      continue;
    }
    const aliases = [...(existing.aliases ?? [])];
    for (const a of extra.aliases ?? []) {
      if (!aliases.some((x) => x.alias === a.alias)) aliases.push(a);
    }
    byName.set(extra.canonicalName, {
      ...existing,
      aliases,
      priority: Math.max(existing.priority ?? 100, extra.priority ?? 100),
      subcategory: existing.subcategory ?? extra.subcategory,
      abbreviation: existing.abbreviation ?? extra.abbreviation,
      riskLevel:
        existing.riskLevel === 'critical' || extra.riskLevel === 'critical'
          ? 'critical'
          : existing.riskLevel === 'high' || extra.riskLevel === 'high'
            ? 'high'
            : existing.riskLevel ?? extra.riskLevel,
    });
  }
  return [...byName.values()];
}

function applyAutoSttPatches(terms: SeedTerm[]): SeedTerm[] {
  const byName = new Map<string, SeedTerm>(
    terms.map((t) => [t.canonicalName, { ...t, aliases: [...(t.aliases ?? [])] }]),
  );
  for (const p of AUTO_STT_ERROR_PATCHES) {
    const existing = byName.get(p.canonicalName);
    const alias = { alias: p.alias, aliasType: 'stt_error' as AliasType };
    if (existing) {
      const already = (existing.aliases ?? []).some((a) => a.alias === p.alias);
      if (!already) existing.aliases = [...(existing.aliases ?? []), alias];
    } else {
      byName.set(
        p.canonicalName,
        term(p.canonicalName, p.category ?? 'other', {
          riskLevel: 'critical',
          aliases: [alias],
        }),
      );
    }
  }
  return [...byName.values()];
}

/**
 * Specialty seed = Medical OS 内科ナレッジ v1 JSON pack
 * + hand STT errors + auto patches from eval / Whisper spotcheck.
 */
export const INTERNAL_MEDICINE_SEED_TERMS: SeedTerm[] = applyAutoSttPatches(
  mergeTerms(loadInternalMedicineKnowledgePack(), [...STT_ERRORS, ...BODY_SIDE]),
);
