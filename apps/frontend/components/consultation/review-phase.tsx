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
import {
  SubkarteChatPanel,
  type SubkarteAskResult,
} from '@/components/consultation/subkarte-chat-panel';
import { PaperCapturePanel } from '@/components/consultation/paper-capture-panel';
import { KnowledgeTranscriptPanel } from '@/components/consultation/knowledge-transcript-panel';
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
  onTranscriptTextChange,
  onSaveTranscript,
  savingTranscript,
  glossarySuggestions,
  onAddGlossarySuggestions,
  onDismissGlossarySuggestions,
  onApprove,
  onCopySoap,
  onCopyNote,
  onGenerateAll,
  generatingDocs,
  documentInput,
  density = 'full',
  backHref = '/panel',
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
  onTranscriptTextChange: (segmentId: string, text: string) => void;
  onSaveTranscript: () => void;
  savingTranscript?: boolean;
  glossarySuggestions?: Array<{ wrong: string; correct: string }>;
  onAddGlossarySuggestions?: (selected: Array<{ wrong: string; correct: string }>) => void;
  onDismissGlossarySuggestions?: () => void;
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
  density?: 'compact' | 'full';
  backHref?: string;
}) {
  const [tab, setTab] = useState<'soap' | 'note' | 'documents'>('soap');
  const [showRevisions, setShowRevisions] = useState(false);
  const [showTranscript, setShowTranscript] = useState(density !== 'compact');
  const [showDocuments, setShowDocuments] = useState(false);
  const [docsTrigger, setDocsTrigger] = useState(0);
  const [referralPattern, setReferralPattern] = useState<'simple' | 'complex'>('simple');
  const [panelTab, setPanelTab] = useState<'soap' | 'docs' | 'paper'>('soap');
  const [pendingDocPatches, setPendingDocPatches] = useState<
    Array<{ type: string; content: Record<string, unknown> }> | undefined
  >();
  const [selectedSuggestions, setSelectedSuggestions] = useState<Record<string, boolean>>({});
  const { toast, show } = useToast();
  const compact = density === 'compact';

  function handleSubkarteResult(result: SubkarteAskResult) {
    if (result.soap) onSoapChange(result.soap);
    if (result.note != null) onNoteChange(result.note);
    if (result.documents?.length) {
      setPendingDocPatches(
        result.documents.map((d) => ({
          type: d.type,
          content: d.content,
        })),
      );
      if (compact) {
        setPanelTab('docs');
        setShowDocuments(true);
      } else {
        setTab('documents');
      }
    }
  }

  useEffect(() => {
    if (copyMsg) show(copyMsg, 'success');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [copyMsg]);

  useEffect(() => {
    if (saveMsg) show(saveMsg, 'success');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [saveMsg]);

  useEffect(() => {
    if (!glossarySuggestions?.length) {
      setSelectedSuggestions({});
      return;
    }
    setSelectedSuggestions(
      Object.fromEntries(glossarySuggestions.map((s) => [`${s.wrong}→${s.correct}`, true])),
    );
  }, [glossarySuggestions]);

  function openDocsAndGenerate() {
    setShowDocuments(true);
    setPanelTab('docs');
    setDocsTrigger((n) => n + 1);
    if (onGenerateAll) void onGenerateAll();
  }

  const primaryAction = !approved ? (
    <Button className="w-full" icon={<CheckCircle2 />} onClick={onApprove}>
      確認済みにする
    </Button>
  ) : (
    <div className="flex w-full flex-col gap-2">
      <Button className="w-full" icon={<ClipboardCopy />} onClick={onCopySoap}>
        SOAP をコピー → CLINICS
      </Button>
      <Button
        className="w-full"
        variant="secondary"
        icon={<Printer />}
        disabled={generatingDocs}
        onClick={openDocsAndGenerate}
      >
        {generatingDocs ? '書類生成中…' : '書類を全部作る'}
      </Button>
    </div>
  );

  if (compact) {
    return (
      <div className="mx-auto max-w-md space-y-4 pb-28">
        <Toast toast={toast} />

        <div className="no-print flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-xs text-slate-500">{caseName}</p>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-lg font-bold tracking-tight text-slate-900">SOAP</h1>
              {approved ? (
                <Badge variant="success">
                  <CheckCircle2 className="h-3 w-3" />
                  確認済み
                </Badge>
              ) : (
                <Badge variant="warning">下書き</Badge>
              )}
            </div>
          </div>
          <Link
            href={backHref}
            className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-brand-600"
          >
            <ArrowLeft className="h-3 w-3" />
            戻る
          </Link>
        </div>

        {warnings.length > 0 && (
          <Alert variant="warning">
            要確認 {warnings.length}件 — {warnings[0]?.message}
            {warnings.length > 1 ? ` 他${warnings.length - 1}件` : ''}
          </Alert>
        )}

        <div className="no-print flex gap-1 rounded-lg border border-slate-200 bg-white p-1 text-xs">
          {(
            [
              { id: 'soap' as const, label: 'SOAP' },
              { id: 'docs' as const, label: '書類' },
              { id: 'paper' as const, label: '紙資料' },
            ] as const
          ).map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                setPanelTab(item.id);
                if (item.id === 'docs') setShowDocuments(true);
              }}
              className={cn(
                'flex-1 rounded-md px-2 py-1.5 font-medium transition-colors',
                panelTab === item.id
                  ? 'bg-brand-600 text-white'
                  : 'text-slate-600 hover:bg-slate-50',
              )}
            >
              {item.label}
            </button>
          ))}
        </div>

        {panelTab === 'soap' && (
          <>
            <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-3">
              {SOAP_FIELDS.map(({ key, label, name }) => (
                <div key={key}>
                  <label className="mb-1 flex items-center gap-2 text-xs">
                    <span className="flex h-5 w-5 items-center justify-center rounded bg-brand-600 text-[10px] font-bold text-white">
                      {label}
                    </span>
                    <span className="text-slate-500">{name}</span>
                  </label>
                  <Textarea
                    value={soap[key]}
                    onChange={(e) => onSoapChange({ ...soap, [key]: e.target.value })}
                    rows={2}
                  />
                </div>
              ))}
              <Button variant="secondary" size="sm" icon={<Save />} onClick={onSaveSoap}>
                SOAP を保存
              </Button>
            </div>

            <div className="no-print space-y-2">
              <button
                type="button"
                className="text-xs font-medium text-brand-600"
                onClick={() => setShowTranscript((v) => !v)}
              >
                {showTranscript ? '文字起こしを閉じる' : '文字起こしを表示'}
              </button>
              {showTranscript && (
                <div className="space-y-2 rounded-xl border border-slate-200 bg-white p-3">
                  <ul className="max-h-48 space-y-2 overflow-y-auto text-sm">
                    {transcript.map((seg) => (
                      <li key={seg.id} className="space-y-1 rounded-lg border border-slate-100 p-2">
                        <Select
                          value={seg.speaker}
                          onChange={(e) => onSpeakerChange(seg.id, e.target.value)}
                        >
                          {SPEAKER_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </Select>
                        <Textarea
                          value={seg.text}
                          onChange={(e) => onTranscriptTextChange(seg.id, e.target.value)}
                          rows={2}
                        />
                      </li>
                    ))}
                  </ul>
                  <Button
                    variant="secondary"
                    size="sm"
                    icon={<Save />}
                    onClick={onSaveTranscript}
                    disabled={savingTranscript}
                  >
                    {savingTranscript ? '保存中…' : '文字起こしを保存'}
                  </Button>
                </div>
              )}
              <KnowledgeTranscriptPanel consultationId={consultationId} />
            </div>

            <div className="no-print space-y-2 rounded-xl border border-slate-200 bg-white p-3">
              <p className="text-xs font-medium text-slate-600">通常診療記録</p>
              <Textarea value={note} onChange={(e) => onNoteChange(e.target.value)} rows={4} />
              <div className="flex flex-wrap gap-2">
                <Button variant="secondary" size="sm" icon={<Save />} onClick={onSaveNote}>
                  保存
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  icon={<ClipboardCopy />}
                  disabled={!approved}
                  onClick={onCopyNote}
                >
                  コピー
                </Button>
              </div>
            </div>
          </>
        )}

        {panelTab === 'docs' && (
          <DocumentsPanel
            consultationId={consultationId}
            documentInput={documentInput}
            approved={approved}
            autoGenerate={false}
            compact
            referralPattern={referralPattern}
            onReferralPatternChange={setReferralPattern}
            openTrigger={docsTrigger}
            pendingDocPatches={pendingDocPatches}
            onPendingDocPatchesApplied={() => setPendingDocPatches(undefined)}
          />
        )}

        {panelTab === 'paper' && <PaperCapturePanel consultationId={consultationId} />}

        <div className="no-print fixed inset-x-0 bottom-0 z-20 border-t border-slate-200 bg-white/95 backdrop-blur">
          <div className="mx-auto max-w-md space-y-2 p-3 pr-28">
            {panelTab === 'soap' ? primaryAction : null}
          </div>
        </div>

        <SubkarteChatPanel consultationId={consultationId} onResult={handleSubkarteResult} />
      </div>
    );
  }

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
          href={backHref}
          className="inline-flex items-center gap-1 text-sm font-medium text-brand-600 hover:text-brand-700"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          戻る
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
          pendingDocPatches={pendingDocPatches}
          onPendingDocPatchesApplied={() => setPendingDocPatches(undefined)}
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
                    <Textarea
                      value={seg.text}
                      onChange={(e) => onTranscriptTextChange(seg.id, e.target.value)}
                      rows={2}
                      className="min-w-0 flex-1"
                    />
                  </li>
                ))}
              </ul>
              <Button
                variant="secondary"
                icon={<Save />}
                className="mt-3"
                onClick={onSaveTranscript}
                disabled={savingTranscript}
              >
                {savingTranscript ? '保存中…' : '文字起こしを保存'}
              </Button>
              {glossarySuggestions && glossarySuggestions.length > 0 && (
                <div className="mt-4 space-y-3 rounded-lg border border-brand-200 bg-brand-50/50 p-4">
                  <p className="text-sm font-medium text-slate-800">
                    検出された修正を語彙に追加しますか？
                  </p>
                  {glossarySuggestions.map((item) => {
                    const key = `${item.wrong}→${item.correct}`;
                    return (
                      <label key={key} className="flex items-center gap-2 text-sm text-slate-700">
                        <input
                          type="checkbox"
                          checked={selectedSuggestions[key] ?? false}
                          onChange={(e) =>
                            setSelectedSuggestions((prev) => ({
                              ...prev,
                              [key]: e.target.checked,
                            }))
                          }
                        />
                        {item.wrong} → {item.correct}
                      </label>
                    );
                  })}
                  <div className="flex gap-2">
                    <Button
                      onClick={() => {
                        const selected = glossarySuggestions.filter(
                          (item) => selectedSuggestions[`${item.wrong}→${item.correct}`],
                        );
                        onAddGlossarySuggestions?.(selected);
                      }}
                    >
                      選択した修正を語彙に追加
                    </Button>
                    <Button variant="ghost" onClick={onDismissGlossarySuggestions}>
                      後で
                    </Button>
                  </div>
                </div>
              )}
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
            <Button variant="ghost" icon={<Printer />} onClick={() => setTab('documents')}>
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

      <SubkarteChatPanel consultationId={consultationId} onResult={handleSubkarteResult} />
    </div>
  );
}
