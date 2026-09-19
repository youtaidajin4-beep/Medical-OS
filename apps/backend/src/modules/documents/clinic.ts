/**
 * くしま内科クリニックの固定情報。
 *
 * 紹介状の紹介元欄、主治医意見書の医療機関欄に毎回そのまま入る。
 * 画面側は `apps/frontend/lib/clinic-config.ts` に同じ値を持っている。
 * 表記（ハイフンの有無・法人名）は紙の様式に合わせてあるので、勝手に整えない。
 */
export const CLINIC = {
  legalName: '医療法人 十慶会　くしま内科クリニック',
  address: '長崎県大村市本町 436-16',
  tel: '0957-51-1256',
  fax: '0957-51-4156',
  department: '内科',
  physicianName: '谷口 広明',
  /** 主治医意見書の市町村コード・管理市町村コード（大村市） */
  municipalityCode: '42205',
  /** 主治医意見書の医師番号 */
  doctorNumber: '0092618202',
} as const;
