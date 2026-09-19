/**
 * デモ用の診断書（検査結果）の中身。様式の各欄に入る形で持つ。
 * 本番の値はバックエンド（certificate-template.ts）が組み立てる。
 */
import type { MedicalCertificateData } from './types';

type CertificateMock = Partial<MedicalCertificateData>;

const 正常な聴力 = {
  right1000: 'normal',
  right4000: 'normal',
  left1000: 'normal',
  left4000: 'normal',
  judgement: 'A',
} as const;

const P001: CertificateMock = {
  interview: '特記すべき既往歴なし',
  smokingMedication: '喫煙歴なし。内服なし',
  symptoms: '咳・発熱あり',
  height: { value: '172', judgement: 'A' },
  weight: { value: '68', judgement: 'A' },
  waist: { value: '82', judgement: 'A' },
  bmi: { value: '23.0', judgement: 'A' },
  hearing: { ...正常な聴力 },
  vision: { right: '1.0', rightCorrected: '', left: '1.0', leftCorrected: '', judgement: 'A' },
  bloodPressure: { systolic: '128', diastolic: '78', judgement: 'A' },
  pulse: { rate: '76', rhythm: 'regular', judgement: 'A' },
  urinalysis: { glucose: '−', protein: '−', judgement: 'A' },
  chestXray: {
    abnormality: 'none',
    abnormalityDetail: '',
    tuberculosis: 'none',
    tuberculosisDetail: '',
    judgement: 'A',
  },
  ecg: { abnormality: 'none', abnormalityDetail: '', judgement: 'A' },
  ast: { value: '22', judgement: 'A' },
  alt: { value: '18', judgement: 'A' },
  gtp: { value: '28', judgement: 'A' },
  ldl: { value: '118', judgement: 'A' },
  hdl: { value: '58', judgement: 'A' },
  triglyceride: { value: '98', judgement: 'A' },
  fastingGlucose: { value: '92', judgement: 'A' },
  hemoglobin: { value: '14.2', judgement: 'A' },
  overallJudgement: 'B',
};

const P002: CertificateMock = {
  ...P001,
  interview: '高血圧症で当院フォロー中',
  smokingMedication: '喫煙歴なし。降圧薬内服中',
  symptoms: '血圧高値を自覚',
  height: { value: '158', judgement: 'A' },
  weight: { value: '62', judgement: 'A' },
  waist: { value: '84', judgement: 'A' },
  bmi: { value: '24.8', judgement: 'B' },
  bloodPressure: { systolic: '147', diastolic: '92', judgement: 'C' },
  ldl: { value: '142', judgement: 'C' },
  hemoglobin: { value: '13.1', judgement: 'A' },
  overallJudgement: 'E',
};

export function getCertificateMock(caseCode: string): CertificateMock {
  if (caseCode === 'P-001') return P001;
  return P002;
}
