/**
 * 主治医意見書の選択肢。紙の様式に印字されている語をそのまま、印字順に並べている。
 *
 * ここを勝手に増やすと紙と合わなくなる。様式が変わったときだけ直す。
 * 様式の現物: 04_MVP_SPECIFICATION/assets/care-opinion-1.png / care-opinion-2.png
 */
import type { CareOpinion1Data, CareOpinion2Data } from './types';
import { emptyDegreeRow } from './types';

/** (3) 他科受診の有無 */
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
] as const;

/** 2 特別な医療 — 処置内容 */
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
] as const;

/** 2 特別な医療 — 特別な対応 */
export const SPECIAL_RESPONSES = [
  'モニター測定（血圧、心拍、酸素飽和度 等）',
  '褥瘡の処置',
] as const;

/** 2 特別な医療 — 失禁への対応 */
export const INCONTINENCE_RESPONSES = [
  'カテーテル（コンドームカテーテル、留置カテーテル 等）',
] as const;

/** 3(1) 障害高齢者の日常生活自立度（寝たきり度） */
export const ADL_LEVELS = ['自立', 'J1', 'J2', 'A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as const;

/** 3(1) 認知症高齢者の日常生活自立度 */
export const DEMENTIA_LEVELS = [
  '自立',
  'Ⅰ',
  'Ⅱa',
  'Ⅱb',
  'Ⅲa',
  'Ⅲb',
  'Ⅳ',
  'M',
] as const;

export const SHORT_TERM_MEMORY = ['問題なし', '問題あり'] as const;
export const DECISION_CAPACITY = [
  '自立',
  'いくらか困難',
  '見守りが必要',
  '判断できない',
] as const;
export const COMMUNICATION_ABILITY = [
  '伝えられる',
  'いくらか困難',
  '具体的要求に限られる',
  '伝えられない',
] as const;

/** 3(3) 認知症の周辺症状 */
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
] as const;

/** 4(1) 移動 */
export const OUTDOOR_WALKING = ['自立', '介助があればしている', 'していない'] as const;
export const WHEELCHAIR = [
  '用いていない',
  '主に自分で操作している',
  '主に他人が操作している',
] as const;
export const WALKING_AIDS = ['用いてない', '屋外で使用', '屋内で使用'] as const;

/** 4(2) 栄養・食生活 */
export const EATING = ['自立ないし何とか自分で食べられる', '全面介助'] as const;
export const NUTRITION_STATE = ['良好', '不良'] as const;

/** 4(3) 現在あるかまたは今後発生の可能性の高い状態 */
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
] as const;

/** 4(5) 医学的管理の必要性 */
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
] as const;

export function emptyCareOpinion1(): CareOpinion1Data {
  return {
    municipalityCode: '',
    supervisorMunicipalityCode: '',
    applicationDate: '',
    insuredNumber: '',
    surveyCount: '',
    doctorNumber: '',
    entryDate: '',
    patientNameKana: '',
    patientName: '',
    dateOfBirth: '',
    age: null,
    contact: '',
    consent: '',
    physicianName: '',
    clinicName: '',
    clinicAddress: '',
    clinicTel: '',
    clinicFax: '',
    lastExamDate: '',
    opinionCount: '',
    otherDepartmentVisit: '',
    otherDepartments: [],
    otherDepartmentOther: '',
    diagnoses: [
      { name: '', onsetDate: '' },
      { name: '', onsetDate: '' },
      { name: '', onsetDate: '' },
    ],
    stability: '',
    instabilityDetail: '',
    courseAndTreatment: '',
    procedures: [],
    specialResponses: [],
    incontinenceResponses: [],
    adlLevel: '',
    dementiaLevel: '',
    shortTermMemory: '',
    decisionCapacity: '',
    communicationAbility: '',
    peripheralPresence: '',
    peripheralSymptoms: [],
    peripheralOther: '',
    psychSymptomPresence: '',
    psychSymptomName: '',
    specialistVisit: '',
    specialistDetail: '',
  };
}

export function emptyCareOpinion2(): CareOpinion2Data {
  return {
    municipalityCode: '',
    insuredNumber: '',
    entryDate: '',
    dominantHand: '',
    height: '',
    weight: '',
    weightChange: '',
    limbLoss: { checked: false, site: '' },
    paralysis: {
      checked: false,
      rightUpper: emptyDegreeRow(),
      leftUpper: emptyDegreeRow(),
      rightLower: emptyDegreeRow(),
      leftLower: emptyDegreeRow(),
      other: emptyDegreeRow(),
    },
    muscleWeakness: emptyDegreeRow(),
    jointContracture: emptyDegreeRow(),
    jointPain: emptyDegreeRow(),
    ataxia: { checked: false, upper: [], lower: [], trunk: [] },
    pressureUlcer: emptyDegreeRow(),
    otherSkinDisease: emptyDegreeRow(),
    outdoorWalking: '',
    wheelchair: '',
    walkingAids: [],
    eating: '',
    nutritionState: '',
    nutritionNote: '',
    risks: [],
    riskOther: '',
    riskPolicy: '',
    serviceOutlook: '',
    medicalManagement: [],
    medicalManagementOther: '',
    precautions: {
      bloodPressure: { none: false, detail: '' },
      movement: { none: false, detail: '' },
      eating: { none: false, detail: '' },
      exercise: { none: false, detail: '' },
      swallowing: { none: false, detail: '' },
      other: '',
    },
    infection: { state: '', detail: '' },
    specialNotes: '',
    notifyCarePlan: '',
    notifyResult: '',
  };
}
