'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  CheckCircle2,
  ClipboardCopy,
  ClipboardList,
  ExternalLink,
  FileText,
  History,
  MessageSquareText,
  Printer,
  Save,
  Stethoscope,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert } from '@/components/ui/alert';
import { Tabs } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import { Toast, useToast } from '@/components/ui/toast';
import { DocumentsPanel } from '@/components/documents/documents-panel';
import { cn } from '@/lib/utils';
import type { SoapData } from '@/lib/mock-documents/types';

type Soap = SoapData;
type Warning = { id: string; message: string; severity: string };
type Revision = {
  id: string;
  fieldName: string;
  beforeValue: string;
  afterValue: string;
  changedAt: string;
  documentType: string;
};

const SPEAKER_OPTIONS = [
  { value: 'PHYSICIAN', label: '医師' },
  { value: 'PATIENT', label: '患者' },
  { value: 'OTHER', label: 'その他' },
  { value: 'UNKNOWN', label: '不明' },
] as const;

const SPEAKER_STYLE: Record<string, string> = {
  PHYSICIAN: 'border-brand-200 bg-brand-50',
  PATIENT: 'border-slate-200 bg-white',
  OTHER: 'border-slate-200 bg-slate-50',
  UNKNOWN: 'border-amber-200 bg-amber-50',
};

const SOAP_FIELDS = [
  { key: 'subjective', label: 'S', name: '主観的情報（Subjective）' },
  { key: 'objective', label: 'O', name: '客観的情報（Objective）' },
  { key: 'assessment', label: 'A', name: '評価（Assessment）' },
  { key: 'plan', label: 'P', name: '計画（Plan）' },
] as const;

function warningVariant(severity: string): 'warning' | 'critical' | 'info' {
  if (severity === 'CRITICAL') return 'critical';
  if (severity === 'WARNING') return 'warning';
  return 'info';
}

export function ReviewPhase({
  consultationId,
  caseName,
  soap,
  note,
  warnings,
  transcript,
  revisions,
  approved,
  copyMsg,
  saveMsg,
  onSoapChange,
  onNoteChange,
  onSaveSoap,
  onSaveNote,
  onSpeakerChange,
  onApprove,
  onCopySoap,
  onCopyNote,
  onGenerateAll,
  generatingDocs,
  documentInput,
}: {
  consultationId: string;
  caseName: string;
  soap: Soap;
  note: string;
  warnings: Warning[];
  transcript: Array<{ id: string; text: string; speaker: string }>;
  revisions: Revision[];
  approved: boolean;
  copyMsg: string;
  saveMsg: string;
  onSoapChange: (soap: Soap) => void;
  onNoteChange: (note: string) => void;
  onSaveSoap: () => void;
  onSaveNote: () => void;
  onSpeakerChange: (segmentId: string, speaker: string) => void;
  onApprove: () => void;
  onCopySoap: () => void;
  onCopyNote: () => void;
  onGenerateAll?: () => void;
  generatingDocs?: boolean;
  documentInput: {
    caseCode: string;
    patientName: string;
    sex?: string | null;
    age?: number | null;
    dateOfBirth?: string | null;
    phone?: string | null;
    memo?: string | null;
    soap: Soap;
    structured?: Record<string, unknown> | null;
  };
}) {
  const [tab, setTab] = useState<'soap' | 'note' | 'documents'>('soap');
  const [showRevisions, setShowRevisions] = useState(false);
  const { toast, show } = useToast();

  useEffect(() => {
    if (copyMsg) show(copyMsg, 'success');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [copyMsg]);

  useEffect(() => {
    if (saveMsg) show(saveMsg, 'success');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [saveMsg]);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <Toast toast={toast} />

      <div className="no-print flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm text-slate-500">{caseName}</p>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">診療後レビュー</h1>
            {approved ? (
              <Badge variant="success">
                <CheckCircle2 className="h-3 w-3" />
                確認済み
              </Badge>
            ) : (
              <Badge variant="warning">下書き</Badge>
            )}
          </div>
          {!approved && (
            <p className="mt-1 text-sm text-amber-700">
              確認済みにするまでコピー・印刷はできません
            </p>
          )}
        </div>
        <Link
          href="/patients"
          className="inline-flex items-center gap-1 text-sm font-medium text-brand-600 hover:text-brand-700"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          症例一覧
        </Link>
      </div>

      {warnings.length > 0 && (
        <Card className="no-print border-amber-200">
          <CardHeader className="border-amber-100 bg-amber-50/60">
            <CardTitle className="flex items-center gap-2 text-base">
              要確認項目
              <Badge variant="warning">{warnings.length}件</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {warnings.map((w) => (
              <div key={w.id} className="flex items-start gap-2 text-sm">
                <Badge variant={warningVariant(w.severity)}>{w.severity}</Badge>
                <span className="text-slate-700">{w.message}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Tabs
        className="no-print"
        items={[
          { id: 'soap' as const, label: 'SOAP', icon: <Stethoscope /> },
          { id: 'note' as const, label: '通常診療記録', icon: <MessageSquareText /> },
          { id: 'documents' as const, label: '書類・印刷', icon: <Printer /> },
        ]}
        value={tab}
        onChange={setTab}
      />

      {tab === 'documents' ? (
        <DocumentsPanel
          consultationId={consultationId}
          documentInput={documentInput}
          approved={approved}
          onBack={() => setTab('soap')}
          autoGenerate
        />
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <FileText className="h-4 w-4 text-brand-600" />
                文字起こし（最終版）
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="max-h-[28rem] space-y-2 overflow-y-auto pr-1 text-sm">
                {transcript.map((seg) => (
                  <li
                    key={seg.id}
                    className={cn(
                      'flex flex-col gap-2 rounded-lg border p-3 sm:flex-row sm:items-start',
                      SPEAKER_STYLE[seg.speaker] ?? 'border-slate-200 bg-white',
                    )}
                  >
                    <Select
                      value={seg.speaker}
                      onChange={(e) => onSpeakerChange(seg.id, e.target.value)}
                      className="shrink-0"
                    >
                      {SPEAKER_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </Select>
                    <span className="leading-relaxed text-slate-700">{seg.text}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <ClipboardList className="h-4 w-4 text-brand-600" />
                {tab === 'soap' ? 'SOAP 下書き' : '通常診療記録'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {tab === 'soap' ? (
                <div className="space-y-4">
                  {SOAP_FIELDS.map(({ key, label, name }) => (
                    <div key={key}>
                      <label className="mb-1.5 flex items-center gap-2 text-sm">
                        <span className="flex h-6 w-6 items-center justify-center rounded bg-brand-600 text-xs font-bold text-white">
                          {label}
                        </span>
                        <span className="text-slate-500">{name}</span>
                      </label>
                      <Textarea
                        value={soap[key]}
                        onChange={(e) => onSoapChange({ ...soap, [key]: e.target.value })}
                        rows={3}
                      />
                    </div>
                  ))}
                  <Button variant="secondary" icon={<Save />} onClick={onSaveSoap}>
                    SOAP を保存
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  <Textarea
                    value={note}
                    onChange={(e) => onNoteChange(e.target.value)}
                    rows={14}
                  />
                  <Button variant="secondary" icon={<Save />} onClick={onSaveNote}>
                    診療記録を保存
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {revisions.length > 0 && tab !== 'documents' && (
        <Card className="no-print">
          <CardHeader>
            <button
              type="button"
              className="flex w-full items-center justify-between text-left"
              onClick={() => setShowRevisions((v) => !v)}
            >
              <CardTitle className="flex items-center gap-2 text-base">
                <History className="h-4 w-4 text-brand-600" />
                編集履歴
                <Badge>{revisions.length}</Badge>
              </CardTitle>
              <span className="text-sm font-medium text-brand-600">
                {showRevisions ? '閉じる' : '表示'}
              </span>
            </button>
          </CardHeader>
          {showRevisions && (
            <CardContent className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-400">
                    <th className="py-2 pr-4 font-medium">種別</th>
                    <th className="py-2 pr-4 font-medium">項目</th>
                    <th className="py-2 pr-4 font-medium">変更前</th>
                    <th className="py-2 pr-4 font-medium">変更後</th>
                    <th className="py-2 font-medium">日時</th>
                  </tr>
                </thead>
                <tbody>
                  {revisions.map((r) => (
                    <tr key={r.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="py-2.5 pr-4">
                        <Badge>{r.documentType}</Badge>
                      </td>
                      <td className="py-2.5 pr-4 font-medium text-slate-700">{r.fieldName}</td>
                      <td className="max-w-[8rem] truncate py-2.5 pr-4 text-slate-400 line-through">
                        {r.beforeValue}
                      </td>
                      <td className="max-w-[8rem] truncate py-2.5 pr-4 text-slate-700">
                        {r.afterValue}
                      </td>
                      <td className="whitespace-nowrap py-2.5 text-xs text-slate-500">
                        {new Date(r.changedAt).toLocaleString('ja-JP')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          )}
        </Card>
      )}

      {tab !== 'documents' && (
        <div className="no-print sticky bottom-4 z-20">
          <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white/95 p-4 shadow-card-hover backdrop-blur">
            {!approved && (
              <Button icon={<CheckCircle2 />} onClick={onApprove}>
                確認済みにする
              </Button>
            )}
            <Button
              variant="secondary"
              icon={<ClipboardCopy />}
              disabled={!approved}
              onClick={onCopySoap}
            >
              SOAP をコピー
            </Button>
            <Button
              variant="secondary"
              icon={<ClipboardCopy />}
              disabled={!approved}
              onClick={onCopyNote}
            >
              通常診療記録をコピー
            </Button>
            <Button
              variant="ghost"
              icon={<Printer />}
              onClick={() => setTab('documents')}
            >
              書類を作成・印刷
            </Button>
            {onGenerateAll && (
              <Button
                variant="secondary"
                icon={<Printer />}
                disabled={!approved || generatingDocs}
                onClick={onGenerateAll}
              >
                {generatingDocs ? '生成中…' : '全書類を生成'}
              </Button>
            )}
            {!approved && (
              <Link
                href="/settings"
                className="ml-auto inline-flex items-center gap-1 text-sm text-slate-500 hover:text-brand-600"
              >
                MEDLEY へのコピー手順
                <ExternalLink className="h-3 w-3" />
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
