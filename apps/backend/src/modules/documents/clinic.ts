/**
 * 書類に印刷する医療機関の情報。
 *
 * **クリニックごとに違うので、DBの clinics / users から読む。**
 * ここにある値は、まだ設定が入っていないときの下敷き（くしま内科の値）で、
 * 2院目が入るまでの安全網として残している。表記（ハイフンの有無・法人名）は
 * 紙の様式に合わせてあるので、勝手に整えない。
 */
export type ClinicProfile = {
  legalName: string;
  address: string;
  tel: string;
  fax: string;
  department: string;
  /** 主治医意見書の市町村コード・管理市町村コード */
  municipalityCode: string;
  /** 主治医意見書の医師番号（医師ごと） */
  doctorNumber: string;
  /** 書類に署名する医師の氏名 */
  physicianName: string;
};

export const CLINIC: ClinicProfile = {
  legalName: '医療法人 十慶会　くしま内科クリニック',
  address: '長崎県大村市本町 436-16',
  tel: '0957-51-1256',
  fax: '0957-51-4156',
  department: '内科',
  municipalityCode: '42205',
  doctorNumber: '0092618202',
  physicianName: '谷口 広明',
};

/** DBの値で下敷きを上書きする。空の項目は下敷きのまま（紙が空欄になるのを防ぐ） */
export function resolveClinicProfile(
  clinic?: {
    legalName?: string | null;
    address?: string | null;
    tel?: string | null;
    fax?: string | null;
    department?: string | null;
    municipalityCode?: string | null;
  } | null,
  physician?: { name?: string | null; doctorNumber?: string | null } | null,
): ClinicProfile {
  const pick = (value: string | null | undefined, fallback: string) =>
    value && value.trim() ? value.trim() : fallback;
  return {
    legalName: pick(clinic?.legalName, CLINIC.legalName),
    address: pick(clinic?.address, CLINIC.address),
    tel: pick(clinic?.tel, CLINIC.tel),
    fax: pick(clinic?.fax, CLINIC.fax),
    department: pick(clinic?.department, CLINIC.department),
    municipalityCode: pick(clinic?.municipalityCode, CLINIC.municipalityCode),
    doctorNumber: pick(physician?.doctorNumber, CLINIC.doctorNumber),
    physicianName: pick(physician?.name, CLINIC.physicianName),
  };
}
