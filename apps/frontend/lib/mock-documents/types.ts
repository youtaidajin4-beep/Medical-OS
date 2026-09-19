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

export type CareOpinion1Data = {
  municipalityCode: string;
  doctorNumber: string;
  applicationDate: string;
  entryDate: string;
  patientName: string;
  patientNameKana: string;
  dateOfBirth: string;
  age: number | null;
  contact: string;
  diagnoses: Array<{ name: string; onsetDate: string }>;
  stability: 'stable' | 'unstable' | 'unknown';
  treatmentCourse: string;
  independencePhysical: string;
  independenceCognitive: string;
  specialMedicalCare: string[];
  coreSymptoms: Record<string, string>;
  peripheralSymptoms: string[];
  otherPsychSymptoms: string;
};

export type CareOpinion2Data = {
  municipalityCode: string;
  entryDate: string;
  dominantHand: 'right' | 'left';
  height: string;
  weight: string;
  weightChange: 'increase' | 'maintain' | 'decrease';
  physicalImpairments: string[];
  mobility: string[];
  nutrition: string;
  risks: string[];
  riskPolicy: string;
  serviceOutlook: string;
  medicalManagement: string[];
  servicePrecautions: string;
  infectiousDisease: string;
  specialNotes: string;
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
