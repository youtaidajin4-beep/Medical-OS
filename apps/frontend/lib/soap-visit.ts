export type VisitType = 'ROUTINE' | 'CHECKUP';

export type SoapFieldKey = 'subjective' | 'objective' | 'assessment' | 'plan';

/**
 * 谷口先生のカルテの定型文（2026-08-10 に画像で共有されたもの）。
 *
 * サーバー側（`soap-templates.ts`）と同じ内容を持つ。サーバーのほうは
 * 「音声から所見が取れたとき、変化がなければこれをベースにする」ための床。
 * こちらは **医師がボタンで自分の意思で入れる** ためのもの。
 * AIが勝手に入れるのと、医師が押して入れるのは、カルテの意味がまったく違う。
 */
export const SOAP_TEMPLATE_TEXT: Record<VisitType, Record<SoapFieldKey, string>> = {
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

/** 定型文を入れるボタンの単位。A/P だけ差したい、という使い方が中心 */
export type TemplateTarget = { label: string; fields: SoapFieldKey[] };

export function templateTargets(visitType: VisitType): TemplateTarget[] {
  // 健診の定型文は A/P が空なので、差せるのは S/O だけ
  if (visitType === 'CHECKUP') {
    return [{ label: 'S/O に定型文', fields: ['subjective', 'objective'] }];
  }
  return [
    { label: 'A/P に定型文', fields: ['assessment', 'plan'] },
    { label: 'S/O に定型文', fields: ['subjective', 'objective'] },
    { label: '全部に定型文', fields: ['subjective', 'objective', 'assessment', 'plan'] },
  ];
}

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
