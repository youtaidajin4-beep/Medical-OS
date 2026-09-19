/**
 * 問診票から患者の属性（氏名・カナ・生年月日・住所・電話・職業）を取り出す。
 *
 * 紹介状の患者欄は、AIに文脈から書かせてはいけないところ。紙の問診票に患者本人が
 * 書いた値が唯一の正で、そこを推測で埋めると別人の住所が印刷されて病院へ出てしまう。
 * だからOCRの本文から機械的に拾い、読めなかった項目は空のままにする。
 */

export type QuestionnairePatientProfile = {
  name?: string;
  nameKana?: string;
  /** 'M' | 'F'。患者テーブルの表記に合わせる */
  sex?: string;
  /** YYYY-MM-DD */
  dateOfBirth?: string;
  /** 123-4567 */
  postalCode?: string;
  address?: string;
  phone?: string;
  occupation?: string;
};

export const QUESTIONNAIRE_PROFILE_SYSTEM = `あなたは日本のクリニックの問診票から、患者の属性だけを抜き出す係です。
渡されたテキストに書かれている値だけを返してください。

厳守:
- 書かれていない項目、読めなかった項目は null にする。推測・補完は禁止（住所や生年月日の創作は事故になる）
- 氏名は姓名の間の空白を残したまま、書かれているとおりに返す
- カナは全角カタカナ。ふりがながひらがなで書かれていればカタカナに直す
- 生年月日は西暦の YYYY-MM-DD。和暦（昭和・平成・令和）で書かれていれば西暦へ直す
- 郵便番号は 123-4567 の形。住所は郵便番号を含めず、都道府県から書く
- 電話番号は書かれているとおり（ハイフンありなしを変えない）
- 職業は書かれていればそのまま。「無職」「主婦」もそのまま返す
- JSONのみを返す（説明文禁止）

出力: {"name":string|null,"nameKana":string|null,"sex":"男"|"女"|null,"dateOfBirth":string|null,"postalCode":string|null,"address":string|null,"phone":string|null,"occupation":string|null}`;

/** 「要確認」「不明」など、値が入っていないことを表す語 */
const PLACEHOLDER = /^(要確認|不明|なし|未記入|記載なし|―|—|-|null|undefined)$/i;

const ERA_OFFSET: Array<{ pattern: RegExp; base: number }> = [
  { pattern: /^(明治|M)$/u, base: 1867 },
  { pattern: /^(大正|T)$/u, base: 1911 },
  { pattern: /^(昭和|S)$/u, base: 1925 },
  { pattern: /^(平成|H)$/u, base: 1988 },
  { pattern: /^(令和|R)$/u, base: 2018 },
];

function clean(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const text = value.replace(/\s+/g, ' ').trim();
  if (!text || PLACEHOLDER.test(text)) return undefined;
  return text;
}

/** 全角数字を半角に直す（OCRは全角で返すことがある） */
function toHalfWidthDigits(text: string): string {
  return text.replace(/[０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0));
}

export function toKatakana(value: string): string {
  return value.replace(/[ぁ-ゖ]/g, (c) => String.fromCharCode(c.charCodeAt(0) + 0x60));
}

/** 「昭和33年3月4日」「1958/3/4」「1958-03-04」→「1958-03-04」 */
export function normalizeBirthDate(value: unknown): string | undefined {
  const text = clean(value);
  if (!text) return undefined;
  const half = toHalfWidthDigits(text);

  const era = half.match(
    /^(明治|大正|昭和|平成|令和|[MTSHR])\s*(\d{1,2})\D+(\d{1,2})\D+(\d{1,2})/u,
  );
  if (era) {
    const found = ERA_OFFSET.find((e) => e.pattern.test(era[1]!));
    if (found) {
      const year = found.base + Number(era[2]);
      return `${year}-${era[3]!.padStart(2, '0')}-${era[4]!.padStart(2, '0')}`;
    }
  }

  const western = half.match(/(\d{4})\D+(\d{1,2})\D+(\d{1,2})/);
  if (western) {
    return `${western[1]}-${western[2]!.padStart(2, '0')}-${western[3]!.padStart(2, '0')}`;
  }
  return undefined;
}

/** 「〒8560832」「856 0832」→「856-0832」 */
export function normalizePostalCode(value: unknown): string | undefined {
  const text = clean(value);
  if (!text) return undefined;
  const digits = toHalfWidthDigits(text).replace(/[^\d]/g, '');
  if (digits.length !== 7) return undefined;
  return `${digits.slice(0, 3)}-${digits.slice(3)}`;
}

function normalizeSex(value: unknown): string | undefined {
  const text = clean(value);
  if (!text) return undefined;
  if (/^(男|男性|M|male)$/i.test(text)) return 'M';
  if (/^(女|女性|F|female)$/i.test(text)) return 'F';
  return undefined;
}

/** 住所欄に郵便番号が混ざっていることがあるので切り出す */
function splitAddress(address: string | undefined): {
  address?: string;
  postalCode?: string;
} {
  if (!address) return {};
  const half = toHalfWidthDigits(address);
  const match = half.match(/〒?\s*(\d{3})-?\s?(\d{4})/);
  if (!match) return { address };
  const rest = half.replace(match[0], '').trim();
  return {
    address: rest || undefined,
    postalCode: `${match[1]}-${match[2]}`,
  };
}

/**
 * LLMが返したJSONを、患者テーブルにそのまま入れられる形へ均す。
 * 読めなかった項目はキーごと落とす（空文字で既存の値を潰さないため）。
 */
export function normalizeQuestionnaireProfile(raw: unknown): QuestionnairePatientProfile {
  if (!raw || typeof raw !== 'object') return {};
  const input = raw as Record<string, unknown>;

  const fromAddress = splitAddress(clean(input.address));
  const kana = clean(input.nameKana);

  const profile: QuestionnairePatientProfile = {
    name: clean(input.name),
    nameKana: kana ? toKatakana(kana) : undefined,
    sex: normalizeSex(input.sex),
    dateOfBirth: normalizeBirthDate(input.dateOfBirth),
    postalCode: normalizePostalCode(input.postalCode) ?? fromAddress.postalCode,
    address: fromAddress.address,
    phone: clean(input.phone) ? toHalfWidthDigits(clean(input.phone)!) : undefined,
    occupation: clean(input.occupation),
  };

  for (const key of Object.keys(profile) as Array<keyof QuestionnairePatientProfile>) {
    if (profile[key] === undefined) delete profile[key];
  }
  return profile;
}

/**
 * 問診票の値で患者情報を補う。**既に入っている値は上書きしない。**
 *
 * 患者情報は受付が直していることがあり、問診票（数か月前の紙かもしれない）で
 * 上書きすると、直したはずの住所や電話が古い値に戻る。空欄のときだけ埋める。
 */
export function patientFieldsToFill(
  profile: QuestionnairePatientProfile,
  current: {
    nameKana?: string | null;
    postalCode?: string | null;
    address?: string | null;
    occupation?: string | null;
    phone?: string | null;
    dateOfBirth?: Date | null;
    sex?: string | null;
  },
): Record<string, string | Date> {
  const fill: Record<string, string | Date> = {};
  const isEmpty = (v: unknown) => v == null || (typeof v === 'string' && v.trim() === '');

  if (profile.nameKana && isEmpty(current.nameKana)) fill.nameKana = profile.nameKana;
  if (profile.postalCode && isEmpty(current.postalCode)) fill.postalCode = profile.postalCode;
  if (profile.address && isEmpty(current.address)) fill.address = profile.address;
  if (profile.occupation && isEmpty(current.occupation)) fill.occupation = profile.occupation;
  if (profile.phone && isEmpty(current.phone)) fill.phone = profile.phone;
  if (profile.sex && isEmpty(current.sex)) fill.sex = profile.sex;
  if (profile.dateOfBirth && current.dateOfBirth == null) {
    const parsed = new Date(`${profile.dateOfBirth}T00:00:00Z`);
    if (!Number.isNaN(parsed.getTime())) fill.dateOfBirth = parsed;
  }
  return fill;
}
