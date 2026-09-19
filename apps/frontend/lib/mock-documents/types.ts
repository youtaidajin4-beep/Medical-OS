export type StructuredClinicalData = {
  chiefComplaint?: string;
  presentIllness?: string;
  pastHistory?: string;
  medications?: string[];
  allergies?: string[];
  vitals?: string;
  physicalExam?: string;
  assessment?: string;
  plan?: string;
};

export type SoapData = {
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
};

export type ConsultationContext = {
  caseCode: string;
  patientName: string;
  patientNameKana?: string;
  sex: string;
  age: number | null;
  dateOfBirth?: string;
  address?: string;
  phone?: string;
  occupation?: string;
  memo?: string;
  soap: SoapData;
  structured: StructuredClinicalData;
  issuedAt: Date;
};

export type DocumentTypeId =
  | 'referral'
  | 'prescription'
  | 'certificate'
  | 'care-opinion-1'
  | 'care-opinion-2'
  /** 主治医意見書は①②で1セット。画面ではこの1枚のカードとして扱う（保存は①②それぞれ） */
  | 'care-opinion-set'
  | 'info-combined';

export type PrescriptionLine = {
  index: number;
  name: string;
  dosePerTake: string;
  dailyDose: string;
  days: string;
  frequency: string;
  note?: string;
  prescribedDate: string;
};

/**
 * 診療情報提供書。並びは紙の雛形（谷口先生から受領）どおり。
 *
 * issuedDate・患者欄・examResults・clinicalCourse はバックエンドが雛形どおりに埋める
 * （`referral-template.ts`）。画面では手直しできるが、AIは書き換えない。
 */
export type ReferralLetterData = {
  issuedDate: string;
  recipientHospital: string;
  recipientDepartment: string;
  recipientDoctor: string;
  patientName: string;
  patientNameKana: string;
  sex: string;
  postalCode: string;
  address: string;
  phone: string;
  dateOfBirth: string;
  age: number | null;
  occupation: string;
  /** 【傷病名】 */
  diagnosis: string;
  /** 【紹介目的】 */
  purpose: string;
  /** 【既往歴及び家族歴】 */
  pastHistory: string;
  /** 【検査結果】…雛形の固定文 */
  examResults: string;
  /** 【治療経過】…雛形の固定文（挨拶2文） */
  clinicalCourse: string;
  /** 【現在の処方】 */
  currentPrescription: string;
  /** 【備考】 */
  remarks: string;
};

export type PrescriptionListData = {
  items: PrescriptionLine[];
};

export type MedicalCertificateData = {
  issuedDate: string;
  patientName: string;
  dateOfBirth: string;
  age: number | null;
  examDate: string;
  interview: string;
  smokingMeds: string;
  symptoms: string;
  height: string;
  weight: string;
  waist: string;
  bmi: string;
  hearing: string;
  vision: string;
  bloodPressure: string;
  pulse: string;
  urinalysis: string;
  chestXray: string;
  ecg: string;
  bloodTests: string;
  doctorDiagnosis: string;
  overallGrade: string;
  remarks: string;
};

/** 「程度: □軽 □中 □重」を伴う行（麻痺・筋力の低下・関節の拘縮など） */
export type DegreeRow = {
  checked: boolean;
  /** 部位（雛形に部位欄がある行だけ使う） */
  site?: string;
  degree: '' | 'mild' | 'moderate' | 'severe';
};

export const emptyDegreeRow = (): DegreeRow => ({ checked: false, site: '', degree: '' });

/**
 * 主治医意見書①（表）。並びは紙の様式どおり。
 *
 * 市町村コード・医師番号・医療機関の情報は毎回同じ。日付は作成日。
 * 申請者欄は患者情報と問診票から入る。医師が決めるのは 1(1)〜(3) と 2、3(1)〜(4)。
 * 様式の現物: 04_MVP_SPECIFICATION/assets/care-opinion-1.png
 */
export type CareOpinion1Data = {
  municipalityCode: string;
  /** 管理市町村コード */
  supervisorMunicipalityCode: string;
  applicationDate: string;
  /** 被保険者番号（谷口先生へのヒアリング待ちのため空欄） */
  insuredNumber: string;
  /** 調査回数（同上） */
  surveyCount: string;
  doctorNumber: string;
  entryDate: string;

  patientNameKana: string;
  patientName: string;
  dateOfBirth: string;
  age: number | null;
  contact: string;

  /** 介護サービス計画への利用に同意するか */
  consent: '' | 'agree' | 'disagree';
  physicianName: string;
  clinicName: string;
  clinicAddress: string;
  clinicTel: string;
  clinicFax: string;

  /** (1) 最終診察日 */
  lastExamDate: string;
  /** (2) 意見書作成回数 */
  opinionCount: '' | 'first' | 'repeat';
  /** (3) 他科受診の有無 */
  otherDepartmentVisit: '' | 'yes' | 'no';
  otherDepartments: string[];
  otherDepartmentOther: string;

  /** 1(1) 診断名及び発症年月日（3行） */
  diagnoses: Array<{ name: string; onsetDate: string }>;
  /** 1(2) 症状としての安定性 */
  stability: '' | 'stable' | 'unstable' | 'unknown';
  instabilityDetail: string;
  /** 1(3) 経過及び投薬内容を含む治療内容 */
  courseAndTreatment: string;

  /** 2 特別な医療（過去14日以内） */
  procedures: string[];
  specialResponses: string[];
  incontinenceResponses: string[];

  /** 3(1) 日常生活の自立度 */
  adlLevel: string;
  dementiaLevel: string;
  /** 3(2) 認知症の中核症状 */
  shortTermMemory: string;
  decisionCapacity: string;
  communicationAbility: string;
  /** 3(3) 認知症の周辺症状 */
  peripheralPresence: '' | 'none' | 'present';
  peripheralSymptoms: string[];
  peripheralOther: string;
  /** 3(4) その他の精神・神経症状 */
  psychSymptomPresence: '' | 'none' | 'present';
  psychSymptomName: string;
  specialistVisit: '' | 'yes' | 'no';
  specialistDetail: string;
};

/**
 * 主治医意見書②（裏）。3(5)身体の状態・4生活機能とサービス・5特記すべき事項。
 * 様式の現物: 04_MVP_SPECIFICATION/assets/care-opinion-2.png
 */
export type CareOpinion2Data = {
  municipalityCode: string;
  insuredNumber: string;
  entryDate: string;

  /** 3(5) 身体の状態 */
  dominantHand: '' | 'right' | 'left';
  height: string;
  weight: string;
  weightChange: '' | 'increase' | 'maintain' | 'decrease';
  limbLoss: { checked: boolean; site: string };
  paralysis: {
    checked: boolean;
    rightUpper: DegreeRow;
    leftUpper: DegreeRow;
    rightLower: DegreeRow;
    leftLower: DegreeRow;
    other: DegreeRow;
  };
  muscleWeakness: DegreeRow;
  jointContracture: DegreeRow;
  jointPain: DegreeRow;
  ataxia: { checked: boolean; upper: string[]; lower: string[]; trunk: string[] };
  pressureUlcer: DegreeRow;
  otherSkinDisease: DegreeRow;

  /** 4(1) 移動 */
  outdoorWalking: string;
  wheelchair: string;
  walkingAids: string[];
  /** 4(2) 栄養・食生活 */
  eating: string;
  nutritionState: string;
  nutritionNote: string;
  /** 4(3) 現在あるかまたは今後発生の可能性の高い状態 */
  risks: string[];
  riskOther: string;
  riskPolicy: string;
  /** 4(4) サービス利用による生活機能の維持・改善の見通し */
  serviceOutlook: '' | 'expected' | 'notExpected' | 'unknown';
  /** 4(5) 医学的管理の必要性 */
  medicalManagement: string[];
  medicalManagementOther: string;
  /** 4(6) サービス提供時における医学的観点からの留意事項 */
  precautions: {
    bloodPressure: { none: boolean; detail: string };
    movement: { none: boolean; detail: string };
    eating: { none: boolean; detail: string };
    exercise: { none: boolean; detail: string };
    swallowing: { none: boolean; detail: string };
    other: string;
  };
  /** 4(7) 感染症の有無 */
  infection: { state: '' | 'none' | 'present' | 'unknown'; detail: string };

  /** 5 特記すべき事項 */
  specialNotes: string;
  notifyCarePlan: '' | 'yes' | 'no';
  notifyResult: '' | 'yes' | 'no';
};

export type InfoProvideCombinedData = {
  referral: ReferralLetterData;
  prescription: PrescriptionListData;
  combinedNote?: string;
};

export type GeneratedDocuments = {
  referral: ReferralLetterData;
  prescription: PrescriptionListData;
  certificate: MedicalCertificateData;
  careOpinion1: CareOpinion1Data;
  careOpinion2: CareOpinion2Data;
  infoCombined?: InfoProvideCombinedData;
};
