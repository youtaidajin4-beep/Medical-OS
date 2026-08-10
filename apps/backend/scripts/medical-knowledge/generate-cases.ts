/**
 * Generate ~3000 deterministic medical STT evaluation cases → JSONL.
 * Usage: npx ts-node scripts/medical-knowledge/generate-cases.ts
 */
import * as fs from 'fs';
import * as path from 'path';
import { INTERNAL_MEDICINE_SEED_TERMS } from '../../src/modules/medical-knowledge/data/internal-medicine-seed';
import { EvalCase } from '../../test/fixtures/medical-knowledge/cases.schema';

const OUT = path.join(
  __dirname,
  '../../test/fixtures/medical-knowledge/generated-cases.jsonl',
);

const ACTIONS = ['継続', '開始', '中止', '増量', '減量', '再開', 'そのまま継続'];
const NEG_SUFFIXES = ['なし', 'はありません', 'はない', '認めない', '陰性'];
const LAB_VALUES = ['6.8', '7.2', '5.9', '8.1', '6.2', '7.0'];
const DOSES = ['2.5', '5', '10', '20', '40', '50', '100'];

/** Known STT / brand surfaces already in seed (or intended) */
const KNOWN_STT: Array<[string, string]> = [
  ['アムロジビン', 'アムロジピン'],
  ['無効団員', 'ムコダイン'],
  ['無効だいん', 'ムコダイン'],
  ['期間支援', '気管支炎'],
  ['エーワンシー', 'HbA1c'],
  ['ヘモグロビンエーワンシー', 'HbA1c'],
  ['A1C', 'HbA1c'],
  ['ワーファリン', 'ワルファリン'],
];

const BRANDS: Array<[string, string]> = [
  ['カロナール', 'アセトアミノフェン'],
  ['ロキソニン', 'ロキソプロフェン'],
  ['タケキャブ', 'ボノプラザン'],
  ['ネキシウム', 'エソメプラゾール'],
  ['タケプロン', 'ランソプラゾール'],
  ['ガスター', 'ファモチジン'],
  ['ムコスタ', 'レバミピド'],
  ['ムコダイン', 'カルボシステイン'],
  ['アレグラ', 'フェキソフェナジン'],
  ['ビラノア', 'ビラスチン'],
  ['デザレックス', 'デスロラタジン'],
  ['ジャヌビア', 'シタグリプチン'],
  ['トラゼンタ', 'リナグリプチン'],
  ['エクア', 'ビルダグリプチン'],
  ['フォシーガ', 'ダパグリフロジン'],
  ['ジャディアンス', 'エンパグリフロジン'],
  ['リベルサス', 'セマグルチド'],
  ['オゼンピック', 'セマグルチド'],
  ['エリキュース', 'アピキサバン'],
  ['リクシアナ', 'エドキサバン'],
  ['イグザレルト', 'リバーロキサバン'],
  ['プラザキサ', 'ダビガトラン'],
  ['フェブリク', 'フェブキソスタット'],
  ['ユリス', 'ドチヌラド'],
  ['ラシックス', 'フロセミド'],
];

const ABBREVS: Array<[string, string]> = [
  ['HT', '高血圧'],
  ['DM', '糖尿病'],
  ['T2DM', '2型糖尿病'],
  ['CKD', '慢性腎臓病'],
  ['AKI', '急性腎障害'],
  ['HF', '心不全'],
  ['AF', '心房細動'],
  ['AMI', '急性心筋梗塞'],
  ['COPD', '慢性閉塞性肺疾患'],
  ['GERD', '胃食道逆流症'],
  ['IBS', '過敏性腸症候群'],
  ['UTI', '尿路感染症'],
  ['TIA', '一過性脳虚血発作'],
];

function byCat(cat: string) {
  return INTERNAL_MEDICINE_SEED_TERMS.filter((t) => t.category === cat);
}

function mutateStt(name: string): string[] {
  const out = new Set<string>();
  if (name.includes('ピン')) out.add(name.replace(/ピン/g, 'ビン'));
  if (name.includes('チン')) out.add(name.replace(/チン/g, 'ティン'));
  if (name.includes('ジン')) out.add(name.replace(/ジン/g, 'ヂン'));
  if (name.includes('ザ')) out.add(name.replace(/ザ/g, 'サ'));
  // Long-vowel drop is a common STT collapse (ボグリボース→ボグリボス)
  if (name.includes('ー')) out.add(name.replace(/ー/g, ''));
  // Do not emit whitespace-separated forms — unsafe as dictionary aliases
  return [...out].filter((x) => x !== name && x.length >= 3 && !/\s/.test(x));
}

function push(cases: EvalCase[], c: EvalCase) {
  cases.push(c);
}

function main() {
  const cases: EvalCase[] = [];
  let n = 0;
  const id = (prefix: string) => `${prefix}-${String(++n).padStart(5, '0')}`;

  const meds = byCat('medication').map((t) => t.canonicalName);
  const symptoms = byCat('symptom').map((t) => t.canonicalName);
  const diagnoses = byCat('diagnosis').map((t) => t.canonicalName);
  const labs = byCat('laboratory_test').map((t) => t.canonicalName);
  const vitals = byCat('vital_sign').map((t) => t.canonicalName);
  const actions = byCat('treatment_action').map((t) => t.canonicalName);

  // 1) Medication + action templates (~ meds * actions subset)
  for (const med of meds) {
    for (const action of ACTIONS.slice(0, 4)) {
      push(cases, {
        id: id('med'),
        category: 'medication',
        input: `${med}を${action}`,
        expect: {
          mustContain: [med],
          entityNormalized: [{ entityType: 'medication', value: med }],
        },
        critical: true,
      });
    }
  }

  // 2) Dosage ambiguity — must not auto-commit ミリ → mg in text without review
  for (const med of meds.slice(0, 80)) {
    for (const dose of DOSES.slice(0, 4)) {
      push(cases, {
        id: id('dose'),
        category: 'dosage',
        input: `${med}${dose}ミリ継続`,
        expect: {
          mustContain: [med],
          dosageNeedsReview: true,
          mustNotContain: [`${dose}mg`], // should remain ミリ or not silently rewrite without review trail
        },
        critical: true,
      });
    }
  }

  // 3) Brand → generic (entity/candidate OK; text rewrite not required)
  for (const [brand, generic] of BRANDS) {
    for (const action of ['を処方', 'を継続', '頓服で', 'について']) {
      push(cases, {
        id: id('brand'),
        category: 'brand',
        input: `${brand}${action}`,
        expect: {
          expectedCanonical: generic,
          surfaceForm: brand,
          mustNotContain: [], // do not invent doses
        },
        critical: true,
      });
    }
  }

  // 4) Known STT errors
  for (const [wrong, correct] of KNOWN_STT) {
    for (const tpl of [`${wrong}です`, `${wrong}を継続`, `今日は${wrong}`, `${wrong}5ミリ`]) {
      push(cases, {
        id: id('stt'),
        category: 'stt_error',
        input: tpl,
        expect: {
          expectedCanonical: correct,
          surfaceForm: wrong,
        },
        critical: true,
      });
    }
  }

  // 5) Synthetic STT mutations (patch loop will add aliases until Critical=0)
  for (const med of meds) {
    for (const mut of mutateStt(med)) {
      push(cases, {
        id: id('sttmut'),
        category: 'stt_error',
        input: `${mut}を継続`,
        expect: {
          expectedCanonical: med,
          surfaceForm: mut,
          mustContain: [], // after correction should contain med OR entity
        },
        critical: true,
      });
    }
  }

  // 6) Negation safety
  for (const symptom of symptoms) {
    for (const neg of NEG_SUFFIXES.slice(0, 3)) {
      push(cases, {
        id: id('neg'),
        category: 'negation',
        input: `${symptom}${neg}`,
        expect: {
          forbidNegationFlip: true,
        },
        critical: true,
      });
    }
  }

  // 7) Labs + values
  for (const lab of labs) {
    for (const v of LAB_VALUES.slice(0, 3)) {
      push(cases, {
        id: id('lab'),
        category: 'lab',
        input: `${lab}は${v}です`,
        expect: {
          entityNormalized: [{ entityType: 'laboratory_test', value: lab }],
        },
        critical: lab === 'HbA1c',
      });
    }
  }
  for (const v of LAB_VALUES) {
    for (const spoken of ['A1C', 'エーワンシー', 'HbA1c']) {
      push(cases, {
        id: id('hba1c'),
        category: 'lab',
        input: `${spoken}は${v}ですね`,
        expect: {
          mustContain: ['HbA1c'],
          expectedCanonical: 'HbA1c',
          surfaceForm: spoken === 'HbA1c' ? undefined : spoken,
        },
        critical: true,
      });
    }
  }

  // 8) Actions
  for (const a of actions.length ? actions : ACTIONS) {
    push(cases, {
      id: id('act'),
      category: 'action',
      input: `薬を${a}します`,
      expect: {
        entityNormalized: [{ entityType: 'treatment_action', value: a }],
      },
      critical: ['中止', '増量', '減量', '開始'].includes(a),
    });
  }

  // 9) Vitals
  for (const v of vitals) {
    for (const tpl of [`${v}を測定`, `${v}を確認`, `本日の${v}`]) {
      push(cases, {
        id: id('vital'),
        category: 'vital',
        input: tpl,
        expect: {
          entityNormalized: [{ entityType: 'vital_sign', value: v }],
        },
        critical: false,
      });
    }
  }

  // 10) Abbreviations
  for (const [abbr, canon] of ABBREVS) {
    for (const tpl of [`${abbr}あり`, `${abbr}の患者`, `既往に${abbr}`]) {
      push(cases, {
        id: id('abbr'),
        category: 'abbreviation',
        input: tpl,
        expect: {
          expectedCanonical: canon,
          surfaceForm: abbr,
        },
        critical: true,
      });
    }
  }

  // 11) Diagnoses presence
  for (const d of diagnoses) {
    push(cases, {
      id: id('dx'),
      category: 'spoken',
      input: `${d}で通院中`,
      expect: {
        entityNormalized: [{ entityType: 'diagnosis', value: d }],
      },
      critical: false,
    });
  }

  // 12) Multi medication / multi lab
  for (let i = 0; i + 1 < meds.length && i < 120; i += 2) {
    const a = meds[i]!;
    const b = meds[i + 1]!;
    push(cases, {
      id: id('multi'),
      category: 'multi',
      input: `${a}と${b}を継続`,
      expect: {
        mustContain: [a, b],
      },
      critical: true,
    });
  }
  for (let i = 0; i + 1 < labs.length && i < 40; i += 2) {
    const a = labs[i]!;
    const b = labs[i + 1]!;
    push(cases, {
      id: id('multilab'),
      category: 'multi',
      input: `${a}と${b}を確認`,
      expect: {
        entityNormalized: [
          { entityType: 'laboratory_test', value: a },
          { entityType: 'laboratory_test', value: b },
        ],
      },
      critical: false,
    });
  }

  // 13) Mechanical noise on known-good phrases (fullwidth, spaces)
  const anchors = [
    ...meds.slice(0, 40).map((m) => ({ input: `${m}を継続`, must: m, cat: 'medication' as const })),
    ...symptoms.slice(0, 30).map((s) => ({
      input: `${s}はありません`,
      must: s,
      cat: 'negation' as const,
    })),
  ];
  for (const a of anchors) {
    const variants = [
      a.input,
      a.input.replace(/を/g, ' を '),
      a.input.normalize('NFKC'),
      a.input.replace(/\d/g, (d) => String.fromCharCode(0xff10 + Number(d))),
    ];
    for (const input of variants) {
      push(cases, {
        id: id('noise'),
        category: a.cat,
        input,
        expect:
          a.cat === 'negation'
            ? { forbidNegationFlip: true }
            : { mustContain: [a.must] },
        critical: true,
      });
    }
  }

  // Pad / trim toward ~3000
  const TARGET = 3000;
  if (cases.length < TARGET) {
    let i = 0;
    while (cases.length < TARGET) {
      const med = meds[i % meds.length]!;
      const dose = DOSES[i % DOSES.length]!;
      const action = ACTIONS[i % ACTIONS.length]!;
      push(cases, {
        id: id('pad'),
        category: 'medication',
        input: `${med}${dose}ミリグラムを${action}`,
        expect: {
          mustContain: [med],
          entityNormalized: [{ entityType: 'medication', value: med }],
        },
        critical: true,
      });
      i += 1;
    }
  }

  // Keep first TARGET if overshot slightly, but prefer keeping all if within +15%
  const finalCases = cases.length > TARGET * 1.15 ? cases.slice(0, TARGET) : cases;

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, finalCases.map((c) => JSON.stringify(c)).join('\n') + '\n', 'utf8');
  console.log(`Wrote ${finalCases.length} cases → ${OUT}`);
}

main();
