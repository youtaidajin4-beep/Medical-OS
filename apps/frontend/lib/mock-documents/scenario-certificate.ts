import type { MedicalCertificateData } from './types';

type CertificateMock = Omit<MedicalCertificateData, 'issuedDate' | 'patientName' | 'dateOfBirth' | 'age' | 'examDate' | 'doctorDiagnosis'>;

const P001: CertificateMock = {
  interview: '特記すべき既往歴なし',
  smokingMeds: '喫煙歴なし。内服なし',
  symptoms: '咳・発熱あり',
  height: '172',
  weight: '68',
  waist: '82',
  bmi: '23.0',
  hearing: '1000Hz 正 / 4000Hz 正（両側）',
  vision: '右 1.0 / 左 1.0',
  bloodPressure: '128 / 78',
  pulse: '76 回/分 整',
  urinalysis: '糖 (−) 蛋白 (−)',
  chestXray: '異常なし / 結核なし',
  ecg: '異常なし',
  bloodTests: 'AST 22 / ALT 18 / γ-GTP 28 / LDL 118 / HDL 58 / TG 98 / 空腹時血糖 92 / Hb 14.2',
  overallGrade: 'B',
  remarks: '',
};

const P002: CertificateMock = {
  interview: '高血圧症で当院フォロー中',
  smokingMeds: '喫煙歴なし。降圧薬内服中',
  symptoms: '血圧高値を自覚',
  height: '158',
  weight: '62',
  waist: '84',
  bmi: '24.8',
  hearing: '1000Hz 正 / 4000Hz 正（両側）',
  vision: '右 0.9 / 左 1.0',
  bloodPressure: '147 / 92',
  pulse: '72 回/分 整',
  urinalysis: '糖 (−) 蛋白 (−)',
  chestXray: '異常なし / 結核なし',
  ecg: '異常なし',
  bloodTests: 'AST 24 / ALT 20 / γ-GTP 32 / LDL 142 / HDL 52 / TG 128 / 空腹時血糖 98 / Hb 13.1',
  overallGrade: 'C',
  remarks: '血圧管理の継続が必要',
};

const P003: CertificateMock = {
  interview: '緊張型頭痛の疑い',
  smokingMeds: '喫煙歴なし。ロキソニン頓服',
  symptoms: '頭痛、睡眠不足',
  height: '175',
  weight: '70',
  waist: '83',
  bmi: '22.9',
  hearing: '1000Hz 正 / 4000Hz 正（両側）',
  vision: '右 1.0 / 左 1.0',
  bloodPressure: '128 / 78',
  pulse: '68 回/分 整',
  urinalysis: '糖 (−) 蛋白 (−)',
  chestXray: '異常なし / 結核なし',
  ecg: '異常なし',
  bloodTests: 'AST 20 / ALT 16 / γ-GTP 24 / LDL 110 / HDL 60 / TG 88 / 空腹時血糖 88 / Hb 14.5',
  overallGrade: 'A',
  remarks: '',
};

export const SCENARIO_CERTIFICATE: Record<string, CertificateMock> = {
  'P-001': P001,
  'P-002': P002,
  'P-003': P003,
  'ANON-001': P003,
};

export function getCertificateMock(caseCode: string): CertificateMock {
  return SCENARIO_CERTIFICATE[caseCode] ?? P002;
}
