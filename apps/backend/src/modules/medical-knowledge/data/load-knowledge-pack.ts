import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { AliasType, EntityType, RiskLevel, SeedTerm } from '../knowledge-types';

type V2Term = {
  canonical_name: string;
  category: string;
  priority?: string;
  risk_level?: string;
};

type V2Brand = { brand_name: string; generic_name: string; risk_level?: string };
type V2AliasRow = { alias: string; canonical: string; alias_type?: string };

type KnowledgePackV2 = {
  name?: string;
  version?: string;
  purpose?: string;
  safety_rules?: string[];
  terms: V2Term[];
  medication_brand_generic: V2Brand[];
  abbreviations: V2AliasRow[];
  spoken_forms: V2AliasRow[];
  common_stt_errors: V2AliasRow[];
  recommended_entity_types?: string[];
};

function resolvePackPath(): string {
  const candidates = [
    join(__dirname, 'medical_os_internal_medicine_knowledge_v2.json'),
    join(process.cwd(), 'src/modules/medical-knowledge/data/medical_os_internal_medicine_knowledge_v2.json'),
    join(
      process.cwd(),
      'apps/backend/src/modules/medical-knowledge/data/medical_os_internal_medicine_knowledge_v2.json',
    ),
  ];
  for (const p of candidates) {
    if (existsSync(p)) return p;
  }
  throw new Error('medical_os_internal_medicine_knowledge_v2.json not found');
}

const data = JSON.parse(readFileSync(resolvePackPath(), 'utf8')) as KnowledgePackV2;

function mapPriority(raw?: string): number {
  if (raw === 'high') return 150;
  if (raw === 'low') return 90;
  return 120;
}

function mapRisk(raw?: string, category?: EntityType): RiskLevel {
  if (raw === 'critical') return 'critical';
  if (raw === 'high') return 'high';
  if (category === 'treatment_action' || category === 'negation') return 'critical';
  if (category === 'medication' || category === 'dosage' || category === 'strength' || category === 'allergy') {
    return 'critical';
  }
  if (
    category === 'vital_sign' ||
    category === 'laboratory_test' ||
    category === 'laboratory_value' ||
    category === 'unit' ||
    category === 'body_side'
  ) {
    return 'high';
  }
  if (raw === 'normal' || raw === 'low') return raw === 'low' ? 'low' : 'medium';
  return 'medium';
}

function isImaging(name: string): boolean {
  return /心電図|ホルター|X線|レントゲン|XP|CT|MRI|MRA|超音波|エコー|CXR|ECG/.test(name);
}

function isFinding(name: string): boolean {
  return /聴診|所見|ラ音|wheeze|雑音|浮腫|腫大|圧痛|反射/.test(name);
}

function classifyDosageUnitRoute(name: string): EntityType {
  if (/日|朝|昼|夕|眠前|就寝前|食前|食後|頓服|回/.test(name)) return 'frequency';
  if (/経口|内服|外用|吸入|静注|点滴|皮下|舌下|貼付/.test(name)) return 'route';
  if (/mg|μg|g|ｍｇ|ミリ|用量|用量/.test(name)) return 'dosage';
  if (/錠|カプセル|散|顆粒|シロップ|液|テープ|軟膏|クリーム|注射/.test(name)) return 'unit';
  return 'unit';
}

function mapPackCategory(packCategory: string, canonicalName: string): EntityType {
  switch (packCategory) {
    case 'diagnoses':
      return 'diagnosis';
    case 'medications_generic':
      return 'medication';
    case 'symptoms_findings':
      return isFinding(canonicalName) ? 'finding' : 'symptom';
    case 'vitals':
      return 'vital_sign';
    case 'laboratory_tests':
      return 'laboratory_test';
    case 'imaging_procedures':
      return isImaging(canonicalName) ? 'imaging' : 'procedure';
    case 'dosage_units_routes':
      return classifyDosageUnitRoute(canonicalName);
    case 'negation_assertion':
      return /今回|前回|昨日|今日|次回|初診|再診|日前|週間/.test(canonicalName) ? 'date' : 'negation';
    case 'treatment_actions':
      return 'treatment_action';
    case 'documents_workflow':
      return 'other';
    default:
      return 'other';
  }
}

function mapAliasType(raw?: string): AliasType {
  if (raw === 'brand_name' || raw === 'brand') return 'brand_name';
  if (raw === 'abbreviation') return 'abbreviation';
  if (raw === 'spoken') return 'spoken';
  if (raw === 'stt_error') return 'stt_error';
  if (raw === 'generic_name') return 'generic_name';
  return 'spoken';
}

function upsertTerm(byName: Map<string, SeedTerm>, next: SeedTerm) {
  const existing = byName.get(next.canonicalName);
  if (!existing) {
    byName.set(next.canonicalName, { ...next, aliases: [...(next.aliases ?? [])] });
    return;
  }
  const aliases = [...(existing.aliases ?? [])];
  for (const a of next.aliases ?? []) {
    if (!aliases.some((x) => x.alias === a.alias)) aliases.push(a);
  }
  byName.set(next.canonicalName, {
    ...existing,
    ...next,
    aliases,
    priority: Math.max(existing.priority ?? 100, next.priority ?? 100),
    riskLevel:
      existing.riskLevel === 'critical' || next.riskLevel === 'critical'
        ? 'critical'
        : existing.riskLevel === 'high' || next.riskLevel === 'high'
          ? 'high'
          : next.riskLevel ?? existing.riskLevel,
    abbreviation: existing.abbreviation ?? next.abbreviation,
  });
}

/** Convert the v2 JSON pack into SeedTerm entries for the in-memory knowledge index. */
export function loadInternalMedicineKnowledgePack(): SeedTerm[] {
  const byName = new Map<string, SeedTerm>();

  for (const t of data.terms ?? []) {
    const category = mapPackCategory(t.category, t.canonical_name);
    upsertTerm(byName, {
      canonicalName: t.canonical_name,
      category,
      subcategory: t.category,
      priority: mapPriority(t.priority),
      riskLevel: mapRisk(t.risk_level, category),
      aliases: [],
    });
  }

  for (const row of data.medication_brand_generic ?? []) {
    upsertTerm(byName, {
      canonicalName: row.generic_name,
      category: 'medication',
      priority: 150,
      riskLevel: mapRisk(row.risk_level, 'medication'),
      aliases: [{ alias: row.brand_name, aliasType: 'brand_name' }],
    });
  }

  for (const row of data.abbreviations ?? []) {
    const existing = byName.get(row.canonical);
    const category = existing?.category ?? 'diagnosis';
    upsertTerm(byName, {
      canonicalName: row.canonical,
      category,
      priority: 140,
      riskLevel: existing?.riskLevel ?? mapRisk(undefined, category),
      abbreviation: row.alias,
      aliases: [{ alias: row.alias, aliasType: mapAliasType(row.alias_type ?? 'abbreviation') }],
    });
  }

  for (const row of data.spoken_forms ?? []) {
    const existing = byName.get(row.canonical);
    const category = existing?.category ?? 'laboratory_test';
    upsertTerm(byName, {
      canonicalName: row.canonical,
      category,
      priority: 150,
      riskLevel: existing?.riskLevel ?? 'high',
      aliases: [{ alias: row.alias, aliasType: mapAliasType(row.alias_type ?? 'spoken') }],
    });
  }

  for (const row of data.common_stt_errors ?? []) {
    const existing = byName.get(row.canonical);
    const category = existing?.category ?? 'other';
    upsertTerm(byName, {
      canonicalName: row.canonical,
      category,
      priority: 160,
      riskLevel: existing?.riskLevel ?? 'critical',
      aliases: [{ alias: row.alias, aliasType: 'stt_error' }],
    });
  }

  return [...byName.values()];
}

export function knowledgePackSafetyRules(): string[] {
  return data.safety_rules ?? [];
}

export function knowledgePackMeta(): { name?: string; version?: string } {
  return { name: data.name, version: data.version };
}

/** Compact glossary defaults for Whisper/LLM — not the full pack. */
export function knowledgePackGlossaryDefaults(): {
  diagnoses: string[];
  drugNames: string[];
  spokenHints: string[];
} {
  const diagnoses = (data.terms ?? [])
    .filter((t) => t.category === 'diagnoses' && t.priority === 'high')
    .map((t) => t.canonical_name)
    .slice(0, 40);
  const drugNames = [
    ...(data.terms ?? [])
      .filter((t) => t.category === 'medications_generic' && t.priority === 'high')
      .map((t) => t.canonical_name)
      .slice(0, 40),
    ...(data.medication_brand_generic ?? []).slice(0, 20).map((b) => b.brand_name),
  ];
  const spokenHints = [
    ...(data.spoken_forms ?? []).map((s) => s.alias),
    ...(data.abbreviations ?? []).slice(0, 30).map((a) => a.alias),
    ...(data.common_stt_errors ?? []).map((e) => e.alias),
  ];
  return {
    diagnoses: [...new Set(diagnoses)],
    drugNames: [...new Set(drugNames)],
    spokenHints: [...new Set(spokenHints)],
  };
}

export function knowledgePackDocumentHint(): string {
  const g = knowledgePackGlossaryDefaults();
  const rules = knowledgePackSafetyRules();
  const meta = knowledgePackMeta();
  return [
    `【内科ナレッジ ${meta.version ?? 'v2'}】`,
    `優先診断例: ${g.diagnoses.slice(0, 25).join('、')}`,
    `優先薬剤例: ${g.drugNames.slice(0, 25).join('、')}`,
    rules.length ? `安全ルール:\n${rules.map((r) => `- ${r}`).join('\n')}` : '',
  ]
    .filter(Boolean)
    .join('\n');
}

/** Stats for tests / health checks. */
export function knowledgePackV2Counts(): {
  terms: number;
  brandGeneric: number;
  abbreviations: number;
  spokenForms: number;
  sttErrors: number;
} {
  return {
    terms: data.terms?.length ?? 0,
    brandGeneric: data.medication_brand_generic?.length ?? 0,
    abbreviations: data.abbreviations?.length ?? 0,
    spokenForms: data.spoken_forms?.length ?? 0,
    sttErrors: data.common_stt_errors?.length ?? 0,
  };
}
