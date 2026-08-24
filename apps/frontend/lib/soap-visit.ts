export type VisitType = 'ROUTINE' | 'CHECKUP';

export function formatRoutineApCombined(assessment: string, plan: string): string {
  const a = assessment.trim();
  const p = plan.trim();
  if (!a && !p) return '';
  if (!a) return `A/P：${p}`;
  if (!p) return `A/P：${a}`;
  const aPart = /[。．.!?！？]$/.test(a) ? a : `${a}。`;
  return `A/P：${aPart}${p}`;
}

export function formatSoapForChartCopy(
  soap: { subjective: string; objective: string; assessment: string; plan: string },
  visitType: VisitType = 'ROUTINE',
): string {
  if (visitType === 'ROUTINE') {
    const ap = formatRoutineApCombined(soap.assessment, soap.plan);
    return [`S：${soap.subjective}`, `O：${soap.objective}`, ap].filter(Boolean).join('\n');
  }
  return [
    `S：${soap.subjective}`,
    `O：${soap.objective}`,
    soap.assessment.trim() ? `A：${soap.assessment}` : '',
    soap.plan.trim() ? `P：${soap.plan}` : '',
  ]
    .filter(Boolean)
    .join('\n');
}
