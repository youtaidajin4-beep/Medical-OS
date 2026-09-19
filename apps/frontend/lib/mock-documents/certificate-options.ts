/**
 * 診断書（検査結果）の固定要素。紙の様式に印字されている語と基準値をそのまま持つ。
 * 様式の現物: 04_MVP_SPECIFICATION/assets/certificate.png
 */
import type { MedicalCertificateData } from './types';
import { emptyExamValue } from './types';

/** 様式左下の判断基準。A〜G の意味は紙に印字されている */
export const JUDGEMENT_CRITERIA = [
  { code: 'A', label: '異常なし' },
  { code: 'B', label: '軽度異常' },
  { code: 'C', label: '要注意（要再検査含）' },
  { code: 'D', label: '病院受診（要精検査含）' },
  { code: 'E', label: '治療継続・経過観察要' },
  { code: 'F', label: '通院受診' },
  { code: 'G', label: '判定不能' },
] as const;

/** 血液検査（空腹時）の行。括弧の中は様式に印字されている基準値 */
export const BLOOD_TESTS = [
  { key: 'ast', label: 'AST', range: '13-33U/L', unit: 'U/L' },
  { key: 'alt', label: 'ALT', range: '6-30U/L', unit: 'U/L' },
  { key: 'gtp', label: 'γ-GTP', range: '10-47U/L', unit: 'U/L' },
  { key: 'ldl', label: 'LDL コレステロール', range: '65-139mg/dl', unit: 'mg/dl' },
  { key: 'hdl', label: 'HDL コレステロール', range: '40-96mg/dl', unit: 'mg/dl' },
  { key: 'triglyceride', label: '中性脂肪', range: '30-149mg/dl', unit: 'mg/dl' },
  { key: 'fastingGlucose', label: '空腹時血糖', range: '69-109mg/dl', unit: 'mg/dl' },
  {
    key: 'hemoglobin',
    label: '血色素量',
    range: '男性 13.5-17.6g/dl／女性 11.3-15.2g/dl',
    unit: 'g/dl',
  },
] as const;

export function emptyMedicalCertificate(): MedicalCertificateData {
  return {
    address: '',
    patientName: '',
    dateOfBirth: '',
    age: null,
    examDate: '',
    issuedDate: '',
    interview: '',
    smokingMedication: '',
    symptoms: '',
    height: emptyExamValue(),
    weight: emptyExamValue(),
    waist: emptyExamValue(),
    bmi: emptyExamValue(),
    hearing: {
      right1000: '',
      right4000: '',
      left1000: '',
      left4000: '',
      judgement: '',
    },
    vision: { right: '', rightCorrected: '', left: '', leftCorrected: '', judgement: '' },
    bloodPressure: { systolic: '', diastolic: '', judgement: '' },
    pulse: { rate: '', rhythm: '', judgement: '' },
    urinalysis: { glucose: '', protein: '', judgement: '' },
    chestXray: {
      abnormality: '',
      abnormalityDetail: '',
      tuberculosis: '',
      tuberculosisDetail: '',
      judgement: '',
    },
    ecg: { abnormality: '', abnormalityDetail: '', judgement: '' },
    ast: emptyExamValue(),
    alt: emptyExamValue(),
    gtp: emptyExamValue(),
    ldl: emptyExamValue(),
    hdl: emptyExamValue(),
    triglyceride: emptyExamValue(),
    fastingGlucose: emptyExamValue(),
    hemoglobin: emptyExamValue(),
    remarks: '',
    doctorDiagnosis: '',
    overallJudgement: '',
    clinicAddress: '',
    clinicName: '',
    clinicTel: '',
    physicianName: '',
  };
}
