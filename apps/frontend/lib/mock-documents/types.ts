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

export type ReferralLetterData = {
  issuedDate: string;
  recipientHospital: string;
  recipientDepartment: string;
  recipientDoctor: string;
  patientName: string;
  patientNameKana: string;
  sex: string;
  address: string;
  phone: string;
  dateOfBirth: string;
  age: number | null;
  occupation: string;
  diagnosis: string;
  purpose: string;
  pastHistory: string;
  examResults: string;
  clinicalCourse: string;
  greeting: string;
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
