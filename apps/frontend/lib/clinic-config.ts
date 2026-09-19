/**
 * くしま内科クリニックの固定情報。
 *
 * 紹介状の「紹介元医療機関」欄は毎回まったく同じで、紙の雛形に印字されている
 * 表記（電話・FAXはハイフンなし）をそのまま出す。tel / fax は画面の他の場所で
 * 読みやすさのためにハイフン付きで使う。
 */
export const CLINIC_CONFIG = {
  legalName: '医療法人十慶会 くしま内科クリニック',
  shortName: 'くしま内科（デモ）',
  zip: '856-0832',
  address: '長崎県大村市本町 436-16',
  tel: '0957-51-1256',
  fax: '0957-51-4156',
  /** 紹介状の雛形どおりの表記（ハイフンなし） */
  telPlain: '0957511256',
  faxPlain: '0957514156',
  department: '内科',
  physicianName: '谷口広明',
  municipalityCode: '42205',
  doctorNumber: '0092618202',
} as const;
