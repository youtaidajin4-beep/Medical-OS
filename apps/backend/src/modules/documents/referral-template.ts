/**
 * 診療情報提供書（紹介状）を、くしま内科の紙の雛形どおりに固定する層。
 *
 * この書類はくしま内科で一番多く作られる。雛形の中身は3種類に分かれる。
 *
 * 1. 毎回まったく同じ文（紹介元医療機関・【検査結果】・【治療経過】の挨拶）
 * 2. 患者の属性（問診票と患者情報が正。カルテから転記するだけの情報）
 * 3. 医師がその場で決めること（傷病名・紹介目的・既往歴及び家族歴・現在の処方・備考）
 *
 * 揺れてよいのは 3 だけ。1 と 2 をAIに書かせると、作るたびに言い回しや
 * 表記が変わり、先生が毎回直すことになる（そして直し忘れたまま病院へ出る）。
 * だから 1 は定数、2 は診療データから決め打ちにして、AIの出力を上書きする。
 * AIに残すのは 3 と宛先だけ。
 *
 * 雛形の現物: 2026-09-19 に谷口先生から受領（04_MVP_SPECIFICATION/assets/referral-template.png）
 */

/** 雛形に印字されている、毎回同じ文 */
export const REFERRAL_FIXED_TEXT = {
  /** 【検査結果】…検査結果の紙は病院側が作り、紹介状に同封して渡す運用 */
  examResults: '別紙を同封しております。',
  /** 【治療経過】…雛形に印字されている挨拶2文 */
  clinicalCourse:
    'いつも大変お世話になっております。\n御多忙中誠に恐縮ですが、ご高診・ご加療を宜しくお願いいたします。',
  /** 【紹介目的】…医師が紹介目的を言わなかったときに入れる既定文 */
  defaultPurpose: '上記疾患につきまして、ご高診・ご加療のほどよろしくお願い申し上げます。',
} as const;

export type ReferralContent = {
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
  diagnosis: string;
  purpose: string;
  pastHistory: string;
  examResults: string;
  clinicalCourse: string;
  currentPrescription: string;
  remarks: string;
};

/** 紹介状の患者欄は、AIの出力ではなくこの値で埋める */
export type ReferralPatientContext = {
  patientName: string;
  patientNameKana?: string;
  sex: string;
  dateOfBirth?: string;
  age: number | null;
  postalCode?: string;
  address?: string;
  phone?: string;
  occupation?: string;
};

/** 雛形の日付欄は西暦（例: 2026年7月10日）。和暦にしない */
export function formatGregorianDate(date: Date): string {
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
}

/** 生年月日欄は西暦のゼロ詰め（例: 2007年01月01日） */
export function formatBirthDate(value?: string | Date | null): string {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return typeof value === 'string' ? value : '';
  const mm = `${date.getMonth() + 1}`.padStart(2, '0');
  const dd = `${date.getDate()}`.padStart(2, '0');
  return `${date.getFullYear()}年${mm}月${dd}日`;
}

/** 発行日時点の満年齢。生年月日が無いときだけ、渡された年齢をそのまま使う */
export function calcAge(dateOfBirth: string | Date | null | undefined, at: Date): number | null {
  if (!dateOfBirth) return null;
  const dob = dateOfBirth instanceof Date ? dateOfBirth : new Date(dateOfBirth);
  if (Number.isNaN(dob.getTime())) return null;
  let age = at.getFullYear() - dob.getFullYear();
  const beforeBirthday =
    at.getMonth() < dob.getMonth() ||
    (at.getMonth() === dob.getMonth() && at.getDate() < dob.getDate());
  if (beforeBirthday) age -= 1;
  return age >= 0 ? age : null;
}

/**
 * AIは配列やnullを返すことがある。書類にそのまま出せる1つの文字列へ均す。
 */
export function toText(value: unknown): string {
  if (value == null) return '';
  if (Array.isArray(value)) {
    return value
      .map((v) => toText(v))
      .filter(Boolean)
      .join('\n');
  }
  if (typeof value === 'object') return '';
  return String(value).trim();
}

/** AIが「要確認」「なし」「特記事項なし」だけを返したときは空欄にする（紙は空欄のほうが読みやすい） */
const EMPTY_MARKERS = /^(要確認|不明|なし|特になし|特記事項なし|―|—|-)$/;

function blankIfPlaceholder(value: string): string {
  return EMPTY_MARKERS.test(value.trim()) ? '' : value;
}

/** 「〇〇病院 御中」「〇〇病院様」→「〇〇病院」 */
export function normalizeHospital(value: unknown): string {
  return toText(value)
    .replace(/[\s\u3000]*(御中|様)$/u, '')
    .trim();
}

/**
 * 診療科は「科」で終わる正式名に揃える。
 * 雛形は「＿＿科 先生 御机下」と印字されているので、空のときは空文字を返す。
 */
export function normalizeDepartment(value: unknown): string {
  const text = toText(value)
    .replace(/[\s\u3000]*(科)?[\s\u3000]*(御中|様)$/u, '$1')
    .trim();
  if (!text) return '';
  return text.endsWith('科') ? text : `${text}科`;
}

/** 「山田先生」「山田 太郎 先生 御机下」→「山田 太郎」（敬称は雛形側に印字されている） */
export function normalizeDoctor(value: unknown): string {
  return toText(value)
    .replace(/[\s\u3000]*(御机下|机下|侍史)$/u, '')
    .replace(/[\s\u3000]*(先生|様|医師)$/u, '')
    .trim();
}

/**
 * AIが書いた紹介状に、雛形の固定文・患者情報・発行日を上書きする。
 *
 * AIの出力をそのまま採用するのは、宛先と医師がチャットで話した5項目だけ。
 */
export function finalizeReferralContent(
  raw: Record<string, unknown> | null | undefined,
  patient: ReferralPatientContext,
  issuedAt: Date = new Date(),
): ReferralContent {
  const ai = raw ?? {};
  const purpose = blankIfPlaceholder(toText(ai.purpose));

  return {
    // 作成した瞬間の日付。AIに書かせない（和暦になったり前回の日付が残ったりする）
    issuedDate: formatGregorianDate(issuedAt),

    // 宛先 — 先生がチャットで指定したもの
    recipientHospital: normalizeHospital(ai.recipientHospital),
    recipientDepartment: normalizeDepartment(ai.recipientDepartment),
    recipientDoctor: normalizeDoctor(ai.recipientDoctor),

    // 患者欄 — 問診票と患者情報が正。AIの出力は使わない
    patientName: patient.patientName,
    patientNameKana: patient.patientNameKana ?? '',
    sex: patient.sex,
    postalCode: patient.postalCode ?? '',
    address: patient.address ?? '',
    phone: patient.phone ?? '',
    dateOfBirth: formatBirthDate(patient.dateOfBirth),
    age: calcAge(patient.dateOfBirth, issuedAt) ?? patient.age,
    occupation: patient.occupation ?? '',

    // 先生がチャットで話すところ
    diagnosis: blankIfPlaceholder(toText(ai.diagnosis)),
    purpose: purpose || REFERRAL_FIXED_TEXT.defaultPurpose,
    pastHistory: blankIfPlaceholder(toText(ai.pastHistory)),
    currentPrescription: blankIfPlaceholder(toText(ai.currentPrescription)),
    remarks: blankIfPlaceholder(toText(ai.remarks)),

    // 雛形に印字されている固定文
    examResults: REFERRAL_FIXED_TEXT.examResults,
    clinicalCourse: REFERRAL_FIXED_TEXT.clinicalCourse,
  };
}
