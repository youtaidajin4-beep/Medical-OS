import { normalizeNumbers } from './soap-number-guard';

/**
 * 再診の時期をPに必ず残す。
 *
 * 構造化データには followUpInterval（医師が言った再診の時期）が入っているのに、SOAPを書くモデルが
 * Pへ書き忘れることがある（2026-10-26、「一か月後にまた来てください」がPから落ちた）。
 * 言われた時期は事実なので、Pに無ければ末尾に足す。モデルの約束に頼らず、機械で埋める。
 */
const INTERVAL = /([0-9]+)\s*(日|週間|週|か月|ヶ月|カ月|ヵ月)/;

export function ensureFollowUp(plan: string, followUp: string | undefined | null): string {
  const interval = followUp?.trim();
  if (!interval) return plan;
  const normalizedPlan = normalizeNumbers(plan);
  const wanted = normalizeNumbers(interval).match(INTERVAL);
  if (wanted) {
    const token = `${wanted[1]}${wanted[2]}`;
    if (normalizedPlan.replace(/\s/g, '').includes(token)) return plan;
  } else if (plan.includes(interval)) {
    return plan;
  }
  const line = `再診：${interval}`;
  return plan.trim() ? `${plan.trimEnd()}\n${line}` : line;
}

const DAYS = /([0-9]+)\s*(日分|日間|週間分|週間|か月分|ヶ月分|カ月分)/;

/** 言われた処方日数がPに無ければ足す（文字起こしだけでSOAPを書くときの取りこぼし対策） */
export function ensurePrescriptionDays(plan: string, days: string | undefined | null): string {
  const text = days?.trim();
  if (!text) return plan;
  const wanted = normalizeNumbers(text).match(DAYS);
  const normalizedPlan = normalizeNumbers(plan).replace(/\s/g, '');
  if (wanted) {
    if (normalizedPlan.includes(`${wanted[1]}${wanted[2]}`) || normalizedPlan.includes(`${wanted[1]}日`)) return plan;
  } else if (plan.includes(text)) {
    return plan;
  }
  const line = `処方日数：${text}`;
  return plan.trim() ? `${plan.trimEnd()}\n${line}` : line;
}
