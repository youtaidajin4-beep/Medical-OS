import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { AliasType, EntityType, RiskLevel, SeedTerm } from '../knowledge-types';

type AliasInput = { alias: string; aliasType: AliasType };

type KnowledgePack = {
  meta?: { name?: string; safety_rules?: string[] };
  safety_rules?: string[];
  diagnoses: Record<string, string[]>;
  symptoms_findings: string[];
  vital_signs: string[];
  laboratory_tests: Record<string, string[]>;
  examinations_procedures: string[];
  medications_priority_generic: Record<string, string[]>;
  brand_generic_aliases: Record<string, string>;
  abbreviations: Record<string, string>;
  spoken_aliases: Record<string, string>;
  dosage_units_forms: string[];
  treatment_actions: string[];
  negation_status_time: string[];
  documentation_terms: string[];
};

function resolvePackPath(): string {
  const candidates = [
    join(__dirname, 'medical_os_internal_medicine_knowledge_v1.json'),
    join(process.cwd(), 'src/modules/medical-knowledge/data/medical_os_internal_medicine_knowledge_v1.json'),
    join(
      process.cwd(),
      'apps/backend/src/modules/medical-knowledge/data/medical_os_internal_medicine_knowledge_v1.json',
    ),
  ];
  for (const p of candidates) {
    if (existsSync(p)) return p;
  }
  throw new Error('medical_os_internal_medicine_knowledge_v1.json not found');
}

const data = JSON.parse(readFileSync(resolvePackPath(), 'utf8')) as KnowledgePack;

function defaultRisk(category: EntityType): RiskLevel {
  if (['medication', 'dosage', 'strength', 'allergy', 'laboratory_value', 'negation'].includes(category)) {
    return 'critical';
  }
  if (['treatment_action', 'body_side', 'vital_sign', 'laboratory_test', 'unit', 'frequency'].includes(category)) {
    return 'high';
  }
  return 'medium';
}

function term(
  canonicalName: string,
  category: EntityType,
  opts: {
    subcategory?: string;
    priority?: number;
    riskLevel?: RiskLevel;
    aliases?: AliasInput[];
    abbreviation?: string;
  } = {},
): SeedTerm {
  return {
    canonicalName,
    category,
    subcategory: opts.subcategory,
    abbreviation: opts.abbreviation,
    priority: opts.priority ?? 120,
    riskLevel: opts.riskLevel ?? defaultRisk(category),
    aliases: opts.aliases ?? [],
  };
}

function isImaging(name: string): boolean {
  return /心電図|ホルター|X線|レントゲン|XP|CT|MRI|MRA|超音波|エコー/.test(name);
}

function classifyUnit(name: string): EntityType {
  if (/日|朝|昼|夕|眠前|就寝前|食前|食後|頓服/.test(name)) return 'frequency';
  if (/錠|カプセル|散|顆粒|シロップ|液|貼付|テープ|軟膏|クリーム|吸入|注射/.test(name)) return 'unit';
  return 'unit';
}

function classifyNegationOrTime(name: string): EntityType {
  if (/今回|前回|前々回|以前|昨日|今日|今朝|昨夜|数日前|週間前|か月前|次回|定期受診|初診|再診/.test(name)) {
    return 'date';
  }
  return 'negation';
}

/** Convert the v1 JSON pack into SeedTerm entries for the in-memory knowledge index. */
export function loadInternalMedicineKnowledgePack(): SeedTerm[] {
  const byName = new Map<string, SeedTerm>();

  const upsert = (next: SeedTerm) => {
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
      riskLevel: existing.riskLevel === 'critical' || next.riskLevel === 'critical'
        ? 'critical'
        : existing.riskLevel === 'high' || next.riskLevel === 'high'
          ? 'high'
          : next.riskLevel ?? existing.riskLevel,
    });
  };

  for (const [subcategory, names] of Object.entries(data.diagnoses)) {
    for (const name of names) {
      upsert(term(name, 'diagnosis', { subcategory, priority: 130 }));
    }
  }

  for (const name of data.symptoms_findings) {
    upsert(term(name, 'symptom', { priority: 110 }));
  }

  for (const name of data.vital_signs) {
    upsert(term(name, 'vital_sign', { riskLevel: 'high', priority: 140 }));
  }

  for (const [subcategory, names] of Object.entries(data.laboratory_tests)) {
    for (const name of names) {
      upsert(
        term(name, 'laboratory_test', {
          subcategory,
          riskLevel: /血糖|HbA1c|A1c|クレアチニン|eGFR|K|カリウム|INR/.test(name) ? 'critical' : 'high',
          priority: 140,
        }),
      );
    }
  }

  for (const name of data.examinations_procedures) {
    upsert(
      term(name, isImaging(name) ? 'imaging' : 'procedure', {
        priority: 110,
      }),
    );
  }

  for (const [subcategory, names] of Object.entries(data.medications_priority_generic)) {
    for (const name of names) {
      upsert(term(name, 'medication', { subcategory, riskLevel: 'critical', priority: 150 }));
    }
  }

  for (const [brand, generic] of Object.entries(data.brand_generic_aliases)) {
    upsert(
      term(generic, 'medication', {
        riskLevel: 'critical',
        priority: 150,
        aliases: [{ alias: brand, aliasType: 'brand_name' }],
      }),
    );
  }

  for (const [abbr, canonical] of Object.entries(data.abbreviations)) {
    const category: EntityType = /血圧|心拍|体温|酸素飽和度|SpO2/.test(canonical)
      ? 'vital_sign'
      : 'diagnosis';
    upsert(
      term(canonical, category, {
        priority: 140,
        abbreviation: abbr,
        aliases: [{ alias: abbr, aliasType: 'abbreviation' }],
      }),
    );
  }

  for (const [spoken, canonical] of Object.entries(data.spoken_aliases)) {
    const category: EntityType = /血圧|心拍|体温|SpO2|酸素/.test(canonical)
      ? 'vital_sign'
      : 'laboratory_test';
    upsert(
      term(canonical, category, {
        riskLevel: 'critical',
        priority: 150,
        aliases: [{ alias: spoken, aliasType: 'spoken' }],
      }),
    );
  }

  for (const name of data.dosage_units_forms) {
    const category = classifyUnit(name);
    upsert(term(name, category, { riskLevel: 'high', priority: 130 }));
  }

  for (const name of data.treatment_actions) {
    upsert(term(name, 'treatment_action', { riskLevel: 'critical', priority: 140 }));
  }

  for (const name of data.negation_status_time) {
    upsert(
      term(name, classifyNegationOrTime(name), {
        riskLevel: 'critical',
        priority: 140,
      }),
    );
  }

  for (const name of data.documentation_terms) {
    upsert(term(name, 'other', { subcategory: 'documentation', priority: 90, riskLevel: 'low' }));
  }

  return [...byName.values()];
}

export function knowledgePackSafetyRules(): string[] {
  return data.safety_rules ?? [];
}

export function knowledgePackGlossaryDefaults(): {
  diagnoses: string[];
  drugNames: string[];
  spokenHints: string[];
} {
  const diagnoses = Object.values(data.diagnoses).flat();
  const drugNames = Object.values(data.medications_priority_generic).flat();
  const brands = Object.keys(data.brand_generic_aliases);
  const spokenHints = [
    ...Object.keys(data.spoken_aliases),
    ...Object.keys(data.abbreviations),
    ...Object.values(data.laboratory_tests).flat().slice(0, 40),
  ];
  return {
    diagnoses: [...new Set(diagnoses)],
    drugNames: [...new Set([...drugNames, ...brands])],
    spokenHints: [...new Set(spokenHints)],
  };
}

export function knowledgePackDocumentHint(): string {
  const g = knowledgePackGlossaryDefaults();
  const rules = knowledgePackSafetyRules();
  return [
    '【内科ナレッジ v1】',
    `優先診断例: ${g.diagnoses.slice(0, 40).join('、')}`,
    `優先薬剤例: ${g.drugNames.slice(0, 40).join('、')}`,
    rules.length ? `安全ルール:\n${rules.map((r) => `- ${r}`).join('\n')}` : '',
  ]
    .filter(Boolean)
    .join('\n');
}
