/** 管理画面の数字の見せ方。null は「測れていない」で、0% とは違う */

export function pct(v: number | null | undefined, digits = 0): string {
  if (v == null || Number.isNaN(v)) return '—';
  return `${(v * 100).toFixed(digits)}%`;
}

/** 前月との差を「ポイント」で。割合の差なので % ではなく pt */
export function deltaPt(current: number | null, previous: number | null): string | null {
  if (current == null || previous == null) return null;
  const d = (current - previous) * 100;
  if (Math.abs(d) < 0.05) return '±0pt';
  return `${d > 0 ? '+' : ''}${d.toFixed(1)}pt`;
}

export function monthLabel(month: string): string {
  const [y, m] = month.split('-');
  return `${y}年${Number(m)}月`;
}

export function dateTimeLabel(iso: string): string {
  const d = new Date(iso);
  const jst = new Date(d.getTime() + 9 * 60 * 60 * 1000);
  return `${jst.getUTCMonth() + 1}/${jst.getUTCDate()} ${String(jst.getUTCHours()).padStart(2, '0')}:${String(jst.getUTCMinutes()).padStart(2, '0')}`;
}

export const VISIT_TYPE_LABEL: Record<string, string> = {
  ROUTINE: '通常',
  FIRST_VISIT: '初診',
  CHECKUP: '健診',
};
