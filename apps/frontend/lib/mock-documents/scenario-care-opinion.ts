import type { CareOpinion1Data, CareOpinion2Data } from './types';

type CareOpinion1Mock = Omit<
  CareOpinion1Data,
  'municipalityCode' | 'doctorNumber' | 'applicationDate' | 'entryDate' | 'patientName' | 'patientNameKana' | 'dateOfBirth' | 'age' | 'contact' | 'diagnoses' | 'treatmentCourse'
>;

type CareOpinion2Mock = Omit<
  CareOpinion2Data,
  'municipalityCode' | 'entryDate' | 'specialNotes' | 'riskPolicy'
>;

const HYPERTENSION_CO1: CareOpinion1Mock = {
  stability: 'stable',
  independencePhysical: '自立',
  independenceCognitive: '自立',
  specialMedicalCare: [],
  coreSymptoms: {
    shortTermMemory: '問題なし',
    decisionMaking: '問題なし',
    communication: '問題なし',
  },
  peripheralSymptoms: [],
  otherPsychSymptoms: 'なし',
};

const HYPERTENSION_CO2: CareOpinion2Mock = {
  dominantHand: 'right',
  height: '158',
  weight: '62',
  weightChange: 'maintain',
  physicalImpairments: [],
  mobility: ['屋外歩行: 自立'],
  nutrition: '食事行為: 自立 / 栄養状態: 良好',
  risks: ['血圧管理'],
  serviceOutlook: '期待できる',
  medicalManagement: ['訪問診療: 不要', '訪問看護: 不要'],
  servicePrecautions: '血圧・服薬状況の確認',
  infectiousDisease: '無',
};

const BRONCHITIS_CO1: CareOpinion1Mock = {
  stability: 'unstable',
  independencePhysical: '自立',
  independenceCognitive: '自立',
  specialMedicalCare: [],
  coreSymptoms: {
    shortTermMemory: '問題なし',
    decisionMaking: '問題なし',
    communication: '問題なし',
  },
  peripheralSymptoms: [],
  otherPsychSymptoms: 'なし',
};

const BRONCHITIS_CO2: CareOpinion2Mock = {
  dominantHand: 'right',
  height: '172',
  weight: '68',
  weightChange: 'maintain',
  physicalImpairments: [],
  mobility: ['屋外歩行: 自立'],
  nutrition: '食事行為: 自立 / 栄養状態: 良好',
  risks: ['感染症'],
  serviceOutlook: '期待できる',
  medicalManagement: ['訪問診療: 不要'],
  servicePrecautions: '特になし',
  infectiousDisease: '無',
};

export function getCareOpinion1Mock(caseCode: string): CareOpinion1Mock {
  if (caseCode === 'P-001') return BRONCHITIS_CO1;
  return HYPERTENSION_CO1;
}

export function getCareOpinion2Mock(caseCode: string): CareOpinion2Mock {
  if (caseCode === 'P-001') return BRONCHITIS_CO2;
  return HYPERTENSION_CO2;
}
