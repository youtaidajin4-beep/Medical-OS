import Link from 'next/link';
import { CheckCheck, ChevronRight, Clock, FileText, Timer } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import {
  getConsultationStatusAccentClass,
  getConsultationStatusBadgeVariant,
  getConsultationStatusLabel,
} from '@/lib/consultation-status';

export type ConsultationListItemData = {
  id: string;
  status: string;
  createdAt: string;
  startedAt?: string | null;
  endedAt?: string | null;
  approvedAt?: string | null;
  copiedAt?: string | null;
  patient?: { name: string; patientCode: string; memo?: string | null } | null;
  anonymousCase?: { displayName: string; caseCode: string } | null;
  soapDocuments?: Array<{ subjective: string; assessment: string }>;
  clinicalNotes?: Array<{ content: string }>;
};

function resolveCaseName(item: ConsultationListItemData): string {
  return item.patient?.name ?? item.anonymousCase?.displayName ?? '症例未設定';
}

function resolveCaseCode(item: ConsultationListItemData): string | null {
  return item.patient?.patientCode ?? item.anonymousCase?.caseCode ?? null;
}

function resolveSummary(item: ConsultationListItemData): string | null {
  if (item.patient?.memo) return item.patient.memo;
  const soap = item.soapDocuments?.[0];
  if (soap?.assessment) return soap.assessment;
  if (soap?.subjective) {
    const firstLine = soap.subjective.split('\n')[0] ?? '';
    return firstLine.replace(/^主訴:\s*/, '').trim() || null;
  }
  const note = item.clinicalNotes?.[0]?.content;
  if (note) return note.split('\n')[0] ?? null;
  return null;
}

function formatDuration(startedAt?: string | null, endedAt?: string | null): string | null {
  if (!startedAt || !endedAt) return null;
  const sec = Math.max(0, Math.round((new Date(endedAt).getTime() - new Date(startedAt).getTime()) / 1000));
  const min = Math.floor(sec / 60);
  const rem = sec % 60;
  if (min === 0) return `${rem}秒`;
  return `${min}分${rem > 0 ? `${rem}秒` : ''}`;
}

function formatWhen(item: ConsultationListItemData): string {
  const base = item.endedAt ?? item.createdAt;
  return new Date(base).toLocaleString('ja-JP', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function ConsultationListItem({ item }: { item: ConsultationListItemData }) {
  const caseName = resolveCaseName(item);
  const caseCode = resolveCaseCode(item);
  const summary = resolveSummary(item);
  const duration = formatDuration(item.startedAt, item.endedAt);
  const statusLabel = getConsultationStatusLabel(item.status);
  const statusVariant = getConsultationStatusBadgeVariant(item.status);
  const hasDraft = (item.soapDocuments?.length ?? 0) > 0;

  return (
    <Link href={`/consultation/${item.id}`} className="group block">
      <Card className="relative overflow-hidden transition-all hover:-translate-y-px hover:border-brand-300 hover:shadow-card-hover">
        <span
          aria-hidden
          className={cn(
            'absolute inset-y-0 left-0 w-1',
            getConsultationStatusAccentClass(item.status),
          )}
        />
        <div className="flex items-start justify-between gap-3 py-4 pl-5 pr-4">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-base font-semibold text-slate-900">{caseName}</p>
              {caseCode && (
                <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] text-slate-500">
                  {caseCode}
                </span>
              )}
            </div>
            {summary && <p className="mt-1 line-clamp-2 text-sm text-slate-600">{summary}</p>}
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
              <span className="inline-flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {formatWhen(item)}
              </span>
              {duration && (
                <span className="inline-flex items-center gap-1">
                  <Timer className="h-3 w-3" />
                  {duration}
                </span>
              )}
              {hasDraft && item.status !== 'DRAFT' && item.status !== 'RECORDING' && (
                <span className="inline-flex items-center gap-1">
                  <FileText className="h-3 w-3" />
                  SOAP下書きあり
                </span>
              )}
              {item.copiedAt && (
                <span className="inline-flex items-center gap-1 text-emerald-600">
                  <CheckCheck className="h-3 w-3" />
                  コピー済み
                </span>
              )}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Badge variant={statusVariant}>{statusLabel}</Badge>
            <ChevronRight className="h-4 w-4 text-slate-300 transition-all group-hover:translate-x-0.5 group-hover:text-brand-500" />
          </div>
        </div>
      </Card>
    </Link>
  );
}
