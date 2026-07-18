export type ConsultationStatusCode =
  | 'DRAFT'
  | 'RECORDING'
  | 'PROCESSING'
  | 'REVIEW'
  | 'APPROVED'
  | 'COMPLETED';

const STATUS_LABELS: Record<ConsultationStatusCode, string> = {
  DRAFT: '未開始',
  RECORDING: '録音中',
  PROCESSING: '処理中',
  REVIEW: '確認待ち',
  APPROVED: '確認済み',
  COMPLETED: 'コピー完了',
};

const STATUS_DESCRIPTIONS: Record<ConsultationStatusCode, string> = {
  DRAFT: '症例を選んだ直後。まだ録音を開始していません。',
  RECORDING: '診療音声を録音している最中です。',
  PROCESSING: 'AIが文字起こしとSOAP下書きを生成しています。',
  REVIEW: '下書きができました。内容の確認・修正が必要です。',
  APPROVED: '医師が内容を確認済みです。MEDLEYへのコピーができます。',
  COMPLETED: 'SOAPまたは診療記録のコピーが完了しています。',
};

const STATUS_BADGE_VARIANT: Record<
  ConsultationStatusCode,
  'default' | 'info' | 'warning' | 'critical' | 'success' | 'brand'
> = {
  DRAFT: 'default',
  RECORDING: 'critical',
  PROCESSING: 'info',
  REVIEW: 'warning',
  APPROVED: 'success',
  COMPLETED: 'brand',
};

/* Left accent bar color on list items */
const STATUS_ACCENT: Record<ConsultationStatusCode, string> = {
  DRAFT: 'bg-slate-300',
  RECORDING: 'bg-red-500',
  PROCESSING: 'bg-blue-500',
  REVIEW: 'bg-amber-500',
  APPROVED: 'bg-emerald-500',
  COMPLETED: 'bg-brand-500',
};

export function getConsultationStatusLabel(status: string): string {
  return STATUS_LABELS[status as ConsultationStatusCode] ?? status;
}

export function getConsultationStatusDescription(status: string): string {
  return STATUS_DESCRIPTIONS[status as ConsultationStatusCode] ?? '';
}

export function getConsultationStatusBadgeVariant(
  status: string,
): 'default' | 'info' | 'warning' | 'critical' | 'success' | 'brand' {
  return STATUS_BADGE_VARIANT[status as ConsultationStatusCode] ?? 'default';
}

export function getConsultationStatusAccentClass(status: string): string {
  return STATUS_ACCENT[status as ConsultationStatusCode] ?? 'bg-slate-300';
}
