/**
 * 診断書（検査結果）を、紙の様式どおりに固定する層。
 *
 * 紹介状・主治医意見書と同じ考え方で、欄を3つに分ける。
 *
 * 1. 毎回同じ … 医療機関の住所・名称・電話・医師氏名、左下の判断基準
 * 2. 転記するだけ … 右下の日付（作成日）、住所・氏名・生年月日・年齢
 * 3. 先生が入れる … 健診日、検査の数値と判定、備考、医師の診断、総合判定
 *
 * **数値はAIに作らせない。** ここは検査の結果そのもので、もっともらしい値が入ると
 * 紹介先がそれを見て判断してしまう。先生がチャットへ貼った検査結果か、
 * 問診票に書かれている値だけを入れ、無いものは空欄のままにする。
 *
 * 様式の現物: 04_MVP_SPECIFICATION/assets/certificate.png
 */
import { CLINIC, ClinicProfile } from './clinic';
import { formatReiwaDate } from './care-opinion-template';
import { calcAge, ReferralPatientContext, toText } from './referral-template';

/** 様式左下の判断基準 */
export const JUDGEMENTS = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];

/** 血液検査（空腹時）の行。キーは様式の並び順 */
export const BLOOD_TEST_KEYS = [
  'ast',
  'alt',
  'gtp',
  'ldl',
  'hdl',
  'triglyceride',
  'fastingGlucose',
  'hemoglobin',
];

/** 身長・体重・血液検査のような「値＋判定」の欄 */
type ExamValue = { value: string; judgement: string };

function judgement(value: unknown): string {
  const text = toText(value).toUpperCase();
  return JUDGEMENTS.includes(text) ? text : '';
}

function examValue(value: unknown): ExamValue {
  const v = (value && typeof value === 'object' ? value : {}) as Record<string, unknown>;
  return { value: toText(v.value), judgement: judgement(v.judgement) };
}

function normalOrAbnormal(value: unknown): string {
  const text = toText(value);
  return text === 'normal' || text === 'abnormal' ? text : '';
}

function noneOrPresent(value: unknown): string {
  const text = toText(value);
  return text === 'none' || text === 'present' ? text : '';
}

/**
 * 生年月日は和暦で出す（様式が「平成19年1月1日」の形）。
 * サーバーはUTCで動くので、必ず日本時間で数える。
 */
export function formatReiwaBirthDate(value?: string | Date | null): string {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return formatReiwaDate(date);
}

/**
 * 健診日を紙の表記（和暦）に寄せる。
 *
 * 先生は「健診日は今日」と言い、カルテを貼れば「2026/09/21」の形で入ってくる。
 * どちらも紙の「令和8年9月21日」に直す。日付として読めない言い回し
 * （「先週」など）はそのまま残す — 勝手に日付を決めない。
 */
export function normalizeExamDate(value: unknown): string {
  const text = toText(value);
  if (!text) return '';
  const iso = text.match(/^(\d{4})[-/年.](\d{1,2})[-/月.](\d{1,2})/);
  if (!iso) return text;
  const [, y, m, d] = iso;
  const date = new Date(Number(y), Number(m) - 1, Number(d));
  if (Number.isNaN(date.getTime())) return text;
  return formatReiwaDate(date);
}

export function finalizeCertificate(
  raw: Record<string, unknown> | null | undefined,
  patient: ReferralPatientContext,
  issuedAt: Date = new Date(),
  clinic: ClinicProfile = CLINIC,
): Record<string, unknown> {
  const ai = raw ?? {};
  const hearing = (ai.hearing && typeof ai.hearing === 'object' ? ai.hearing : {}) as Record<
    string,
    unknown
  >;
  const vision = (ai.vision && typeof ai.vision === 'object' ? ai.vision : {}) as Record<
    string,
    unknown
  >;
  const bp = (ai.bloodPressure && typeof ai.bloodPressure === 'object'
    ? ai.bloodPressure
    : {}) as Record<string, unknown>;
  const pulse = (ai.pulse && typeof ai.pulse === 'object' ? ai.pulse : {}) as Record<
    string,
    unknown
  >;
  const urinalysis = (ai.urinalysis && typeof ai.urinalysis === 'object'
    ? ai.urinalysis
    : {}) as Record<string, unknown>;
  const chestXray = (ai.chestXray && typeof ai.chestXray === 'object'
    ? ai.chestXray
    : {}) as Record<string, unknown>;
  const ecg = (ai.ecg && typeof ai.ecg === 'object' ? ai.ecg : {}) as Record<string, unknown>;

  const blood: Record<string, ExamValue> = {};
  for (const key of BLOOD_TEST_KEYS) {
    blood[key] = examValue(ai[key]);
  }

  return {
    // 転記するだけ
    address: patient.address ?? '',
    patientName: patient.patientName,
    dateOfBirth: formatReiwaBirthDate(patient.dateOfBirth),
    age: calcAge(patient.dateOfBirth, issuedAt) ?? patient.age,
    // 右下の日付は作成日。健診日は先生が入れる（言われていなければ空欄）
    issuedDate: formatReiwaDate(issuedAt),
    examDate: normalizeExamDate(ai.examDate),

    // 問診票から
    interview: toText(ai.interview),
    smokingMedication: toText(ai.smokingMedication),
    symptoms: toText(ai.symptoms),

    // 左列
    height: examValue(ai.height),
    weight: examValue(ai.weight),
    waist: examValue(ai.waist),
    bmi: examValue(ai.bmi),
    hearing: {
      right1000: normalOrAbnormal(hearing.right1000),
      right4000: normalOrAbnormal(hearing.right4000),
      left1000: normalOrAbnormal(hearing.left1000),
      left4000: normalOrAbnormal(hearing.left4000),
      judgement: judgement(hearing.judgement),
    },
    vision: {
      right: toText(vision.right),
      rightCorrected: toText(vision.rightCorrected),
      left: toText(vision.left),
      leftCorrected: toText(vision.leftCorrected),
      judgement: judgement(vision.judgement),
    },
    bloodPressure: {
      systolic: toText(bp.systolic),
      diastolic: toText(bp.diastolic),
      judgement: judgement(bp.judgement),
    },
    pulse: {
      rate: toText(pulse.rate),
      rhythm:
        toText(pulse.rhythm) === 'regular' || toText(pulse.rhythm) === 'irregular'
          ? toText(pulse.rhythm)
          : '',
      judgement: judgement(pulse.judgement),
    },
    urinalysis: {
      glucose: toText(urinalysis.glucose),
      protein: toText(urinalysis.protein),
      judgement: judgement(urinalysis.judgement),
    },

    // 右列
    chestXray: {
      abnormality: noneOrPresent(chestXray.abnormality),
      abnormalityDetail: toText(chestXray.abnormalityDetail),
      tuberculosis: noneOrPresent(chestXray.tuberculosis),
      tuberculosisDetail: toText(chestXray.tuberculosisDetail),
      judgement: judgement(chestXray.judgement),
    },
    ecg: {
      abnormality: noneOrPresent(ecg.abnormality),
      abnormalityDetail: toText(ecg.abnormalityDetail),
      judgement: judgement(ecg.judgement),
    },
    ...blood,

    // 先生が入れる
    remarks: toText(ai.remarks),
    doctorDiagnosis: toText(ai.doctorDiagnosis),
    overallJudgement: judgement(ai.overallJudgement),

    // 毎回同じ
    clinicAddress: clinic.address,
    clinicName: clinic.legalName,
    // 様式どおりハイフン無し
    clinicTel: clinic.tel.replace(/-/g, ''),
    physicianName: clinic.physicianName,
  };
}
