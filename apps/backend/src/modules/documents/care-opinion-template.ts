/**
 * 主治医意見書①②を、紙の様式どおりに固定する層。
 *
 * 紹介状（referral-template.ts）と同じ考え方で、欄を3つに分ける。
 *
 * 1. 毎回同じ … 市町村コード・管理市町村コード・医師番号・医療機関の情報
 * 2. 転記するだけ … 申請日・記入日・最終診察日（作成日）、申請者欄（患者情報と問診票）
 * 3. 医師が決める … 診断名と発症年月日、安定性、経過及び治療内容、各チェック
 *
 * 1と2はAIに書かせない。3も、様式に印字されていない語を書かれると紙と合わなくなるので、
 * 選択肢は様式にある語だけを通す（合わないものは捨てる＝空欄のまま）。
 *
 * 様式の現物: 04_MVP_SPECIFICATION/assets/care-opinion-1.png / care-opinion-2.png
 */
import { CLINIC } from './clinic';
import { calcAge, formatBirthDate, ReferralPatientContext, toText } from './referral-template';

const CLINIC_TIME_ZONE = 'Asia/Tokyo';

/** 記入日・申請日は和暦（例: 令和8年7月10日）。サーバーのUTCで数えない */
export function formatReiwaDate(date: Date): string {
  return new Intl.DateTimeFormat('ja-JP-u-ca-japanese', {
    timeZone: CLINIC_TIME_ZONE,
    era: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date);
}

// ─── 様式に印字されている選択肢（画面側 care-opinion-options.ts と同じ並び） ───

export const OTHER_DEPARTMENTS = [
  '内科',
  '精神科',
  '外科',
  '整形外科',
  '脳神経外科',
  '皮膚科',
  '泌尿器科',
  '婦人科',
  '眼科',
  '耳鼻咽喉科',
  'リハビリテーション科',
  '歯科',
];

export const PROCEDURES = [
  '点滴の管理',
  '中心静脈栄養',
  '透析',
  'ストーマの処置',
  '酸素療法',
  'レスピレーター',
  '気管切開の処置',
  '疼痛の看護',
  '経管栄養',
];

export const SPECIAL_RESPONSES = ['モニター測定（血圧、心拍、酸素飽和度 等）', '褥瘡の処置'];

export const INCONTINENCE_RESPONSES = [
  'カテーテル（コンドームカテーテル、留置カテーテル 等）',
];

export const ADL_LEVELS = ['自立', 'J1', 'J2', 'A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
export const DEMENTIA_LEVELS = ['自立', 'Ⅰ', 'Ⅱa', 'Ⅱb', 'Ⅲa', 'Ⅲb', 'Ⅳ', 'M'];
export const SHORT_TERM_MEMORY = ['問題なし', '問題あり'];
export const DECISION_CAPACITY = ['自立', 'いくらか困難', '見守りが必要', '判断できない'];
export const COMMUNICATION_ABILITY = [
  '伝えられる',
  'いくらか困難',
  '具体的要求に限られる',
  '伝えられない',
];
export const PERIPHERAL_SYMPTOMS = [
  '幻視・幻聴',
  '妄想',
  '昼夜逆転',
  '暴言',
  '暴行',
  '介護への抵抗',
  '徘徊',
  '火の不始末',
  '不潔行為',
  '異食行動',
  '性的問題行動',
];

export const OUTDOOR_WALKING = ['自立', '介助があればしている', 'していない'];
export const WHEELCHAIR = ['用いていない', '主に自分で操作している', '主に他人が操作している'];
export const WALKING_AIDS = ['用いてない', '屋外で使用', '屋内で使用'];
export const EATING = ['自立ないし何とか自分で食べられる', '全面介助'];
export const NUTRITION_STATE = ['良好', '不良'];
export const RISKS = [
  '尿失禁',
  '転倒・骨折',
  '移動能力の低下',
  '褥瘡',
  '心肺機能の低下',
  '閉じこもり',
  '意欲低下',
  '徘徊',
  '低栄養',
  '摂食・嚥下機能低下',
  '脱水',
  '易感染症',
  'がん等による疼痛',
];
export const MEDICAL_MANAGEMENT = [
  '訪問診療',
  '訪問看護',
  '看護職員の訪問による相談・支援',
  '訪問歯科診療',
  '訪問薬剤管理指導',
  '訪問リハビリテーション',
  '短期入所療養介護',
  '訪問歯科衛生指導',
  '訪問栄養食事指導',
  '通所リハビリテーション',
];

/** 様式に無い語は捨てる。紙に印字されていない項目を作られても書けない */
function onlyFromForm(value: unknown, allowed: string[]): string[] {
  if (!Array.isArray(value)) return [];
  const picked = value
    .map((v) => toText(v))
    .filter((v) => allowed.includes(v));
  return Array.from(new Set(picked));
}

function oneOf<T extends string>(value: unknown, allowed: readonly T[]): T | '' {
  const text = toText(value);
  return (allowed as readonly string[]).includes(text) ? (text as T) : '';
}

function oneOfLabel(value: unknown, allowed: string[]): string {
  const text = toText(value);
  return allowed.includes(text) ? text : '';
}

type DegreeRow = { checked: boolean; site?: string; degree: '' | 'mild' | 'moderate' | 'severe' };

function degreeRow(value: unknown, withSite = true): DegreeRow {
  const v = (value && typeof value === 'object' ? value : {}) as Record<string, unknown>;
  const row: DegreeRow = {
    checked: v.checked === true,
    degree: oneOf(v.degree, ['mild', 'moderate', 'severe'] as const),
  };
  if (withSite) row.site = toText(v.site);
  return row;
}

function detailRow(value: unknown): { none: boolean; detail: string } {
  const v = (value && typeof value === 'object' ? value : {}) as Record<string, unknown>;
  return { none: v.none === true, detail: toText(v.detail) };
}

/**
 * 主治医意見書①。AIが書いてよいのは 1(1)〜(3)、2、3(1)〜(4) だけ。
 * ヘッダー・申請者欄・医療機関欄・日付はここで決め打ちにする。
 */
export function finalizeCareOpinion1(
  raw: Record<string, unknown> | null | undefined,
  patient: ReferralPatientContext,
  issuedAt: Date = new Date(),
): Record<string, unknown> {
  const ai = raw ?? {};
  const today = formatReiwaDate(issuedAt);
  const diagnosesRaw = Array.isArray(ai.diagnoses) ? ai.diagnoses : [];
  const diagnoses = [0, 1, 2].map((i) => {
    const d = (diagnosesRaw[i] && typeof diagnosesRaw[i] === 'object'
      ? diagnosesRaw[i]
      : {}) as Record<string, unknown>;
    return { name: toText(d.name), onsetDate: toText(d.onsetDate) };
  });

  return {
    // 毎回同じ
    municipalityCode: CLINIC.municipalityCode,
    supervisorMunicipalityCode: CLINIC.municipalityCode,
    doctorNumber: CLINIC.doctorNumber,
    physicianName: CLINIC.physicianName,
    clinicName: CLINIC.legalName,
    clinicAddress: CLINIC.address,
    clinicTel: CLINIC.tel,
    clinicFax: CLINIC.fax,
    consent: 'agree',

    // 谷口先生へのヒアリング待ち（空欄で出す）
    insuredNumber: '',
    surveyCount: '',

    // 作成日
    applicationDate: today,
    entryDate: today,
    lastExamDate: toText(ai.lastExamDate) || today,

    // 申請者欄（患者情報と問診票が正）
    patientName: patient.patientName,
    patientNameKana: patient.patientNameKana ?? '',
    dateOfBirth: formatBirthDate(patient.dateOfBirth),
    age: calcAge(patient.dateOfBirth, issuedAt) ?? patient.age,
    contact: patient.phone ?? '',

    // 医師が決めるところ
    opinionCount: oneOf(ai.opinionCount, ['first', 'repeat'] as const),
    otherDepartmentVisit: oneOf(ai.otherDepartmentVisit, ['yes', 'no'] as const),
    otherDepartments: onlyFromForm(ai.otherDepartments, OTHER_DEPARTMENTS),
    otherDepartmentOther: toText(ai.otherDepartmentOther),

    diagnoses,
    stability: oneOf(ai.stability, ['stable', 'unstable', 'unknown'] as const),
    instabilityDetail: toText(ai.instabilityDetail),
    courseAndTreatment: toText(ai.courseAndTreatment),

    procedures: onlyFromForm(ai.procedures, PROCEDURES),
    specialResponses: onlyFromForm(ai.specialResponses, SPECIAL_RESPONSES),
    incontinenceResponses: onlyFromForm(ai.incontinenceResponses, INCONTINENCE_RESPONSES),

    adlLevel: oneOfLabel(ai.adlLevel, ADL_LEVELS),
    dementiaLevel: oneOfLabel(ai.dementiaLevel, DEMENTIA_LEVELS),
    shortTermMemory: oneOfLabel(ai.shortTermMemory, SHORT_TERM_MEMORY),
    decisionCapacity: oneOfLabel(ai.decisionCapacity, DECISION_CAPACITY),
    communicationAbility: oneOfLabel(ai.communicationAbility, COMMUNICATION_ABILITY),
    peripheralPresence: oneOf(ai.peripheralPresence, ['none', 'present'] as const),
    peripheralSymptoms: onlyFromForm(ai.peripheralSymptoms, PERIPHERAL_SYMPTOMS),
    peripheralOther: toText(ai.peripheralOther),
    psychSymptomPresence: oneOf(ai.psychSymptomPresence, ['none', 'present'] as const),
    psychSymptomName: toText(ai.psychSymptomName),
    specialistVisit: oneOf(ai.specialistVisit, ['yes', 'no'] as const),
    specialistDetail: toText(ai.specialistDetail),
  };
}

/** 主治医意見書②。3(5)・4・5。 */
export function finalizeCareOpinion2(
  raw: Record<string, unknown> | null | undefined,
  issuedAt: Date = new Date(),
): Record<string, unknown> {
  const ai = raw ?? {};
  const paralysis = (ai.paralysis && typeof ai.paralysis === 'object'
    ? ai.paralysis
    : {}) as Record<string, unknown>;
  const ataxia = (ai.ataxia && typeof ai.ataxia === 'object' ? ai.ataxia : {}) as Record<
    string,
    unknown
  >;
  const precautions = (ai.precautions && typeof ai.precautions === 'object'
    ? ai.precautions
    : {}) as Record<string, unknown>;
  const infection = (ai.infection && typeof ai.infection === 'object'
    ? ai.infection
    : {}) as Record<string, unknown>;
  const limbLoss = (ai.limbLoss && typeof ai.limbLoss === 'object' ? ai.limbLoss : {}) as Record<
    string,
    unknown
  >;

  return {
    municipalityCode: CLINIC.municipalityCode,
    insuredNumber: '',
    entryDate: formatReiwaDate(issuedAt),

    dominantHand: oneOf(ai.dominantHand, ['right', 'left'] as const),
    height: toText(ai.height),
    weight: toText(ai.weight),
    weightChange: oneOf(ai.weightChange, ['increase', 'maintain', 'decrease'] as const),
    limbLoss: { checked: limbLoss.checked === true, site: toText(limbLoss.site) },
    paralysis: {
      checked: paralysis.checked === true,
      rightUpper: degreeRow(paralysis.rightUpper, false),
      leftUpper: degreeRow(paralysis.leftUpper, false),
      rightLower: degreeRow(paralysis.rightLower, false),
      leftLower: degreeRow(paralysis.leftLower, false),
      other: degreeRow(paralysis.other, false),
    },
    muscleWeakness: degreeRow(ai.muscleWeakness),
    jointContracture: degreeRow(ai.jointContracture),
    jointPain: degreeRow(ai.jointPain),
    ataxia: {
      checked: ataxia.checked === true,
      upper: onlyFromForm(ataxia.upper, ['右', '左']),
      lower: onlyFromForm(ataxia.lower, ['右', '左']),
      trunk: onlyFromForm(ataxia.trunk, ['右', '左']),
    },
    pressureUlcer: degreeRow(ai.pressureUlcer),
    otherSkinDisease: degreeRow(ai.otherSkinDisease),

    outdoorWalking: oneOfLabel(ai.outdoorWalking, OUTDOOR_WALKING),
    wheelchair: oneOfLabel(ai.wheelchair, WHEELCHAIR),
    walkingAids: onlyFromForm(ai.walkingAids, WALKING_AIDS),
    eating: oneOfLabel(ai.eating, EATING),
    nutritionState: oneOfLabel(ai.nutritionState, NUTRITION_STATE),
    nutritionNote: toText(ai.nutritionNote),
    risks: onlyFromForm(ai.risks, RISKS),
    riskOther: toText(ai.riskOther),
    riskPolicy: toText(ai.riskPolicy),
    serviceOutlook: oneOf(ai.serviceOutlook, ['expected', 'notExpected', 'unknown'] as const),
    medicalManagement: onlyFromForm(ai.medicalManagement, MEDICAL_MANAGEMENT),
    medicalManagementOther: toText(ai.medicalManagementOther),
    precautions: {
      bloodPressure: detailRow(precautions.bloodPressure),
      movement: detailRow(precautions.movement),
      eating: detailRow(precautions.eating),
      exercise: detailRow(precautions.exercise),
      swallowing: detailRow(precautions.swallowing),
      other: toText(precautions.other),
    },
    infection: {
      state: oneOf(infection.state, ['none', 'present', 'unknown'] as const),
      detail: toText(infection.detail),
    },
    specialNotes: toText(ai.specialNotes),
    notifyCarePlan: oneOf(ai.notifyCarePlan, ['yes', 'no'] as const),
    notifyResult: oneOf(ai.notifyResult, ['yes', 'no'] as const),
  };
}
