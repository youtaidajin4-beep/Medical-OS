import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { AliasType, EntityType, RiskLevel, SeedTerm } from '../knowledge-types';

type V2Term = {
  canonical_name: string;
  /** ひらがなの読み。英字略語（HbA1c, CRP など）は持たない */
  reading?: string;
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

function resolveDataPath(file: string): string | null {
  const candidates = [
    join(__dirname, file),
    join(process.cwd(), 'src/modules/medical-knowledge/data', file),
    join(process.cwd(), 'apps/backend/src/modules/medical-knowledge/data', file),
  ];
  for (const p of candidates) {
    if (existsSync(p)) return p;
  }
  return null;
}

function resolvePackPath(): string {
  const found = resolveDataPath('medical_os_internal_medicine_knowledge_v2.json');
  if (!found) throw new Error('medical_os_internal_medicine_knowledge_v2.json not found');
  return found;
}

const data = JSON.parse(readFileSync(resolvePackPath(), 'utf8')) as KnowledgePackV2;

/**
 * 追加語彙（curated lexicon）。標準の辞書（v2）に無い薬・病名・検査・処置を足したもの。
 *
 * 標準の辞書は、実診察の書き起こしに出る語の取りこぼしが多かった（抗菌薬・抗ウイルス薬・
 * 精神科の薬・漢方・外用薬・皮膚科や整形の病名がほぼ無い）。公的マスターを取り込むまでの
 * つなぎとして、外来の内科で実際に出る語を足している。まだ医師・薬剤師の確認前なので、
 * 標準のヒント（音声認識の語彙・校正の語彙）へは入れず、**辞書の照合と近い語の検索**にだけ使う。
 * 無くても動く（ファイルが無ければ標準の辞書だけ）。
 */
function loadCurated(): KnowledgePackV2 | null {
  const found = resolveDataPath('curated-lexicon-v1.json');
  if (!found) return null;
  try {
    return JSON.parse(readFileSync(found, 'utf8')) as KnowledgePackV2;
  } catch {
    return null;
  }
}
const curated = loadCurated();

/** 標準＋追加。同じ語は標準を優先する（重複は追加側で除いてあるが、念のため） */
const merged: KnowledgePackV2 = {
  ...data,
  terms: [...(data.terms ?? []), ...(curated?.terms ?? [])],
  medication_brand_generic: [
    ...(data.medication_brand_generic ?? []),
    ...(curated?.medication_brand_generic ?? []),
  ],
  abbreviations: [...(data.abbreviations ?? []), ...(curated?.abbreviations ?? [])],
  spoken_forms: [...(data.spoken_forms ?? []), ...(curated?.spoken_forms ?? [])],
  common_stt_errors: [...(data.common_stt_errors ?? []), ...(curated?.common_stt_errors ?? [])],
};

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
    // ブランド名や略語の行には読みが無い。あとから来た行で読みを消さない
    reading: next.reading ?? existing.reading,
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

  for (const t of merged.terms ?? []) {
    const category = mapPackCategory(t.category, t.canonical_name);
    upsertTerm(byName, {
      canonicalName: t.canonical_name,
      reading: t.reading,
      category,
      subcategory: t.category,
      priority: mapPriority(t.priority),
      riskLevel: mapRisk(t.risk_level, category),
      aliases: [],
    });
  }

  for (const row of merged.medication_brand_generic ?? []) {
    upsertTerm(byName, {
      canonicalName: row.generic_name,
      category: 'medication',
      priority: 150,
      riskLevel: mapRisk(row.risk_level, 'medication'),
      aliases: [{ alias: row.brand_name, aliasType: 'brand_name' }],
    });
  }

  for (const row of merged.abbreviations ?? []) {
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

  for (const row of merged.spoken_forms ?? []) {
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

  for (const row of merged.common_stt_errors ?? []) {
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

/**
 * 語の読み（ひらがな）。索引の鍵に使う。
 *
 * 医院辞書へ語を育てるときにも引く。読みを持たせないと、
 * 音声認識がかなのまま出したときに当たらない。
 */
export function knowledgePackReading(canonicalName: string): string | undefined {
  if (!readingByName) {
    readingByName = new Map(
      (merged.terms ?? [])
        .filter((t) => t.reading)
        .map((t) => [t.canonical_name, t.reading as string]),
    );
  }
  return readingByName.get(canonicalName);
}
let readingByName: Map<string, string> | null = null;

/**
 * 校正へ渡す内科の語をひととおり。
 *
 * ここは長いあいだ各20語だけを渡していた。しかも五十音順の先頭20語なので、
 * 循環器の病名ばかりで消化器も呼吸器も1語も入っていなかった。
 * 実際の誤変換で測ると、渡す範囲を広げるほうが**回復率 33% → 42%**（各5回・ばらつき0）。
 * eval/run-correction-eval.mjs で測り直せる。
 *
 * 増やせば増えるほど良い、という話ではない。手で作った問題では
 * 「偏った200語」が「渡さない」より悪くなった。効くのは**実際に出る語を
 * 覆っているか**であって、語数ではない。
 */
export function knowledgePackCorrectionTerms(): {
  diagnoses: string[];
  drugNames: string[];
  symptoms: string[];
  tests: string[];
} {
  const pick = (category: string) =>
    (data.terms ?? []).filter((t) => t.category === category).map((t) => t.canonical_name);
  return {
    diagnoses: pick('diagnoses'),
    drugNames: pick('medications_generic'),
    symptoms: pick('symptoms_findings'),
    tests: [...pick('laboratory_tests'), ...pick('imaging_procedures')],
  };
}

/** 商品名→一般名の対応表。書類で一般名を主に書くために使う */
export function knowledgePackBrandGeneric(): Array<{ brand: string; generic: string }> {
  return (merged.medication_brand_generic ?? [])
    .filter((row) => row.brand_name && row.generic_name)
    .map((row) => ({ brand: row.brand_name, generic: row.generic_name }));
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

/** 追加語彙を含めた語の一覧（近い語の検索・語彙の候補づくり用）。読みは無い語もある */
export function knowledgePackLexiconTerms(): Array<{
  name: string;
  reading?: string;
  category: string;
  priority: string;
}> {
  return (merged.terms ?? []).map((t) => ({
    name: t.canonical_name,
    reading: t.reading,
    category: t.category,
    priority: t.priority ?? 'normal',
  }));
}

/** 商品名と一般名を含めた、薬の表記の一覧（カタカナの近似照合用） */
export function knowledgePackDrugSurfaces(): Array<{
  surface: string;
  canonical: string;
  kind: 'generic' | 'brand';
}> {
  const out: Array<{ surface: string; canonical: string; kind: 'generic' | 'brand' }> = [];
  for (const t of merged.terms ?? []) {
    if (t.category === 'medications_generic') {
      out.push({ surface: t.canonical_name, canonical: t.canonical_name, kind: 'generic' });
    }
  }
  for (const b of merged.medication_brand_generic ?? []) {
    out.push({ surface: b.brand_name, canonical: b.generic_name, kind: 'brand' });
  }
  return out;
}

/**
 * 広い固定リスト。患者・医院の情報が無いときの土台になる語。
 * 標準の辞書で優先度が高い薬・病名・検査と、代表的な商品名。追加語彙は含めない（確認前のため）。
 */
export function knowledgePackBroadPool(): string[] {
  const high = (category: string) =>
    (data.terms ?? []).filter((t) => t.priority === 'high' && t.category === category).map((t) => t.canonical_name);
  return [
    ...high('medications_generic'),
    ...(data.medication_brand_generic ?? []).slice(0, 60).map((b) => b.brand_name),
    ...high('diagnoses'),
    ...high('laboratory_tests'),
  ];
}
