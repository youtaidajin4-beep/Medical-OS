export type SoapVisitType = 'ROUTINE' | 'CHECKUP';

export type SoapTemplateFloor = {
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
};

/** くしま内科・相場先生カルテ準拠の床（変化がないときの下書き）. */
export const SOAP_TEMPLATE_FLOORS: Record<SoapVisitType, SoapTemplateFloor> = {
  ROUTINE: {
    subjective: '体調変わりない。',
    objective: '脈拍異常なし。貧血・黄疸なし。心音・呼吸音異常なし。',
    assessment: 'stable',
    plan: '定時薬を継続する。',
  },
  CHECKUP: {
    subjective: '健診で受診。',
    objective: [
      '脈拍異常なし。貧血・黄疸なし。心音・呼吸音異常なし。肝脾腫なし。下腿浮腫なし。',
      'CXR：有意な異常なし。',
      'ECG：有意な異常なし。',
    ].join('\n'),
    assessment: '',
    plan: '',
  },
};

export function resolveSoapVisitType(value?: string | null): SoapVisitType {
  return value === 'CHECKUP' ? 'CHECKUP' : 'ROUTINE';
}

/** カルテ貼付用（通常診察の A/P 結合）. */
export function formatRoutineApCombined(assessment: string, plan: string): string {
  const a = assessment.trim();
  const p = plan.trim();
  if (!a && !p) return '';
  if (!a) return `A/P：${p}`;
  if (!p) return `A/P：${a}`;
  const aPart = /[。．.!?！？]$/.test(a) ? a : `${a}。`;
  return `A/P：${aPart}${p}`;
}
