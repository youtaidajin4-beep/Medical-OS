'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  ClipboardCopy,
  FileScan,
  History,
  Mic,
  RefreshCw,
  Save,
} from 'lucide-react';
import { Toast, useToast } from '@/components/ui/toast';
import { Select } from '@/components/ui/select';
import { DocumentsPanel } from '@/components/documents/documents-panel';
import {
  DocumentLauncher,
  type Recipient,
} from '@/components/consultation/document-launcher';
import {
  SubkarteCommandBar,
  type SubkarteResult,
} from '@/components/consultation/subkarte-command-bar';
import { PaperCapturePanel } from '@/components/consultation/paper-capture-panel';
import { KnowledgeTranscriptPanel } from '@/components/consultation/knowledge-transcript-panel';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api-client';
import type { DocumentTypeId, SoapData } from '@/lib/mock-documents/types';
import {
  formatRoutineApCombined,
  SOAP_TEMPLATE_TEXT,
  templateTargets,
  type SoapFieldKey,
  type VisitType,
} from '@/lib/soap-visit';

/**
 * 診察が終わったあとの画面。
 *
 * ここは1日に何十回も通る場所なので、迷う要素を全部落とした。
 *
 * - **SOAPが主役**。以前は左の一等地を文字起こしが占めていたが、谷口先生は
 *   「文字起こしを後々じっくり見返すことはない」(2026-09-28) と言われている。畳んだ
 * - **書類は1タップ**。「確認済みにする → 書類を全部作る → カードで選ぶ → 生成」の4手を、
 *   書類カードを押すだけにした。紹介状の宛先は過去に出した先から選ぶ
 * - **サブカルテは画面の下に常にいる**。右下のふきだしに隠れていたが、SOAPを直すのも
 *   書類を作るのも一番速い入口なので、押さずに打てる位置へ出した
 * - **操作を一か所に**。下の固定バーに6つ並んでいたボタンは、使う場所の隣へ移した
 */

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

const SOAP_FIELDS = [
  { key: 'subjective', label: 'S', name: '主観的情報' },
  { key: 'objective', label: 'O', name: '客観的情報' },
  { key: 'assessment', label: 'A', name: '評価' },
  { key: 'plan', label: 'P', name: '計画' },
] as const;

function Section({
  title,
  count,
  icon,
  defaultOpen = false,
  children,
}: {
  title: string;
  count?: number;
  icon?: React.ReactNode;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="no-print overflow-hidden rounded-2xl border border-clinic-line bg-white">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 px-3.5 py-3 text-left hover:bg-clinic-tint"
      >
        <span className="text-clinic-ink-muted">{icon}</span>
        <span className="text-[13px] font-semibold text-clinic-ink">{title}</span>
        {typeof count === 'number' && count > 0 && (
          <span className="rounded-full bg-clinic-tint px-2 py-0.5 text-[11px] font-semibold text-clinic-ink-muted">
            {count}
          </span>
        )}
        <ChevronDown
          className={cn(
            'ml-auto h-4 w-4 text-clinic-ink-muted transition-transform',
            open && 'rotate-180',
          )}
        />
      </button>
      {open && <div className="border-t border-clinic-line px-3.5 py-3">{children}</div>}
    </div>
  );
}

export function ReviewPhase({
  consultationId,
  caseName,
  visitType = 'ROUTINE',
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
  onReprocess,
  onAppendRecording,
  reprocessing,
  backHref = '/home',
}: {
  consultationId: string;
  caseName: string;
  visitType?: VisitType;
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
  /** 残っている録音からSOAPを作り直す。保持期間を過ぎるとサーバー側で断られる */
  onReprocess?: () => void;
  /** 同じ診察の続きを録る（採血で中断したときなど）。確認済みでは渡らない */
  onAppendRecording?: () => void;
  reprocessing?: boolean;
  /** @deprecated 画面はひとつになった。残っている呼び出しのために受けるだけ */
  density?: 'compact' | 'full';
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
  backHref?: string;
}) {
  const { toast, show } = useToast();
  const [templatedFields, setTemplatedFields] = useState<Partial<Record<SoapFieldKey, true>>>({});
  const [copiedField, setCopiedField] = useState('');
  const [madeTypes, setMadeTypes] = useState<DocumentTypeId[]>([]);
  const [busyType, setBusyType] = useState<DocumentTypeId | null>(null);
  const [docsError, setDocsError] = useState('');
  const [docsRefresh, setDocsRefresh] = useState(0);
  const [referralPattern, setReferralPattern] = useState<'simple' | 'complex'>('simple');
  const [selectedSuggestions, setSelectedSuggestions] = useState<Record<string, boolean>>({});
  const [warningsOpen, setWarningsOpen] = useState(true);

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

  const visitLabel = visitType === 'CHECKUP' ? '健診' : '通常診察';
  const apCombined =
    visitType === 'ROUTINE' ? formatRoutineApCombined(soap.assessment, soap.plan) : '';
  const soapIsEmpty = SOAP_FIELDS.every(({ key }) => !soap[key].trim());
  const criticalCount = useMemo(
    () => warnings.filter((w) => w.severity === 'CRITICAL').length,
    [warnings],
  );

  async function copyField(label: string, text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(label);
      show(`${label} をコピーしました`, 'success');
      window.setTimeout(() => setCopiedField(''), 2000);
    } catch {
      show('コピーに失敗しました', 'error');
    }
  }

  /** 定型文を指定の欄へ差す。医師が押したときだけ動く */
  function applyTemplate(fields: SoapFieldKey[]) {
    const template = SOAP_TEMPLATE_TEXT[visitType];
    const next = { ...soap };
    const marked: Partial<Record<SoapFieldKey, true>> = { ...templatedFields };
    for (const field of fields) {
      next[field] = template[field];
      marked[field] = true;
    }
    onSoapChange(next);
    setTemplatedFields(marked);
  }

  /** 医師が手で書き直したら、その欄の「定型文」表示は外す */
  function changeSoapField(key: SoapFieldKey, value: string) {
    onSoapChange({ ...soap, [key]: value });
    if (templatedFields[key] && value !== SOAP_TEMPLATE_TEXT[visitType][key]) {
      setTemplatedFields((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
  }

  function handleSubkarteResult(result: SubkarteResult) {
    if (result.soap) onSoapChange(result.soap);
    if (result.note != null) onNoteChange(result.note);
    if (result.documents?.length) {
      setDocsRefresh((n) => n + 1);
      show('書類を作りました', 'success');
    }
  }

  /** 書類カードを押したときだけ、その書類を作る */
  async function handleGenerateDocument(type: DocumentTypeId, recipient?: Recipient) {
    setBusyType(type);
    setDocsError('');
    try {
      const { failed } = await api.generateAllDocuments(consultationId, {
        referralPattern,
        types: [type],
        referralRecipient: recipient?.hospital ? recipient : undefined,
      });
      setDocsRefresh((n) => n + 1);
      if (failed?.length) {
        setDocsError(`作成できませんでした：${failed.map((f) => f.reason).join(' / ')}`);
      } else {
        show('書類ができました', 'success');
      }
    } catch (e) {
      setDocsError(e instanceof Error ? e.message : '書類の生成に失敗しました');
    } finally {
      setBusyType(null);
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 pb-4 min-[480px]:px-6">
      <Toast toast={toast} />

      {/* 患者と状態、そしてこの画面で一番したいこと */}
      <header className="no-print sticky top-0 z-20 -mx-4 mb-4 border-b border-clinic-line bg-clinic-paper/95 px-4 py-3 backdrop-blur min-[480px]:-mx-6 min-[480px]:px-6">
        <div className="flex flex-wrap items-center gap-3">
          <Link
            href={backHref}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-clinic-line bg-white text-clinic-ink hover:bg-clinic-tint"
            aria-label="戻る"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[15px] font-semibold text-clinic-ink">{caseName}</p>
            <p className="flex items-center gap-1.5 text-[11px] text-clinic-ink-muted">
              {visitLabel}
              <span className="text-clinic-line">·</span>
              <span className={cn(approved ? 'text-emerald-700' : 'text-amber-700')}>
                {approved ? '確認済み' : '下書き'}
              </span>
            </p>
          </div>

          {onAppendRecording && (
            <button
              type="button"
              onClick={onAppendRecording}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-clinic-line bg-white px-3 py-2 text-[12px] font-semibold text-clinic-ink hover:bg-clinic-tint"
              title="採血などで中断したとき、同じ診察の続きを録ります"
            >
              <Mic className="h-3.5 w-3.5" />
              続きを録る
            </button>
          )}

          {approved ? (
            <button
              type="button"
              onClick={onCopySoap}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-clinic-ink px-3.5 py-2 text-[12px] font-semibold text-clinic-cream hover:bg-clinic-ink-soft"
            >
              <ClipboardCopy className="h-3.5 w-3.5" />
              カルテへコピー
            </button>
          ) : (
            <button
              type="button"
              onClick={onApprove}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-clinic-ink px-3.5 py-2 text-[12px] font-semibold text-clinic-cream hover:bg-clinic-ink-soft"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              確認済みにする
            </button>
          )}
        </div>
      </header>

      {warnings.length > 0 && (
        <div
          className={cn(
            'no-print mb-4 overflow-hidden rounded-2xl border',
            criticalCount ? 'border-rose-200 bg-rose-50' : 'border-amber-200 bg-amber-50/70',
          )}
        >
          <button
            type="button"
            onClick={() => setWarningsOpen((v) => !v)}
            className="flex w-full items-center gap-2 px-3.5 py-2.5 text-left"
          >
            <AlertTriangle
              className={cn('h-4 w-4', criticalCount ? 'text-rose-600' : 'text-amber-600')}
            />
            <span
              className={cn(
                'text-[13px] font-semibold',
                criticalCount ? 'text-rose-900' : 'text-amber-900',
              )}
            >
              要確認 {warnings.length}件
            </span>
            <ChevronDown
              className={cn(
                'ml-auto h-4 w-4 transition-transform',
                criticalCount ? 'text-rose-500' : 'text-amber-500',
                warningsOpen && 'rotate-180',
              )}
            />
          </button>
          {warningsOpen && (
            <ul className="space-y-1.5 px-3.5 pb-3">
              {warnings.map((w) => (
                <li
                  key={w.id}
                  className={cn(
                    'text-[13px] leading-relaxed',
                    w.severity === 'CRITICAL' ? 'text-rose-900' : 'text-amber-900',
                  )}
                >
                  {w.message}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className="grid gap-5 min-[900px]:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] min-[900px]:items-start">
        {/* 左：SOAP が主役 */}
        <div className="min-w-0 space-y-3">
          {soapIsEmpty && (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-[13px] leading-relaxed text-rose-900">
              <p className="font-semibold">音声からSOAPを作成できませんでした</p>
              <p className="mt-1">
                診療の内容を取り出せなかったため、<strong>あえて空欄にしています</strong>。
                定型文を自動で入れると、診察で確認していない所見がカルテに残るためです。
              </p>
              {onReprocess && !approved && (
                <button
                  type="button"
                  className="mt-3 rounded-full bg-rose-700 px-4 py-1.5 text-[12px] font-semibold text-white hover:bg-rose-800 disabled:opacity-50"
                  disabled={reprocessing}
                  onClick={onReprocess}
                >
                  {reprocessing ? '作り直しています…' : '同じ録音でもう一度SOAPを作る'}
                </button>
              )}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-semibold tracking-[0.2em] text-clinic-ink-muted">
              SOAP
            </span>
            <span className="text-[11px] text-clinic-ink-muted">定型文</span>
            {templateTargets(visitType).map((target) => (
              <button
                key={target.label}
                type="button"
                className="rounded-full border border-clinic-line bg-white px-2.5 py-1 text-[11px] font-medium text-clinic-ink hover:border-clinic-ink disabled:opacity-40"
                disabled={approved}
                onClick={() => applyTemplate(target.fields)}
              >
                {target.label}
              </button>
            ))}
            {onReprocess && !approved && !soapIsEmpty && (
              <button
                type="button"
                className="ml-auto inline-flex items-center gap-1 text-[11px] font-medium text-clinic-ink-muted hover:text-clinic-ink disabled:opacity-40"
                disabled={reprocessing}
                onClick={onReprocess}
              >
                <RefreshCw className={cn('h-3 w-3', reprocessing && 'animate-spin')} />
                {reprocessing ? '作り直し中…' : '作り直す'}
              </button>
            )}
          </div>

          {SOAP_FIELDS.map(({ key, label, name }) => (
            <div key={key} className="rounded-2xl border border-clinic-line bg-white p-3.5">
              <div className="mb-2 flex items-center gap-2">
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-clinic-ink text-[13px] font-bold text-clinic-gold">
                  {label}
                </span>
                <span className="text-[11px] font-semibold text-clinic-ink-muted">{name}</span>
                {templatedFields[key] && (
                  <span className="rounded-full bg-clinic-tint px-2 py-0.5 text-[10px] font-semibold text-clinic-ink-muted">
                    定型文
                  </span>
                )}
                <button
                  type="button"
                  className="ml-auto inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-medium text-clinic-ink-muted hover:bg-clinic-tint disabled:opacity-40"
                  disabled={!approved}
                  onClick={() => void copyField(label, soap[key])}
                >
                  <ClipboardCopy className="h-3 w-3" />
                  {copiedField === label ? 'コピー済み' : 'コピー'}
                </button>
              </div>
              <textarea
                rows={3}
                value={soap[key]}
                onChange={(e) => changeSoapField(key, e.target.value)}
                className={cn(
                  'w-full resize-y rounded-xl bg-clinic-tint px-3 py-2.5 text-[13px] leading-relaxed text-clinic-ink outline-none focus:ring-2 focus:ring-clinic-ink/15',
                  templatedFields[key] && 'text-clinic-ink-muted',
                )}
              />
            </div>
          ))}

          {visitType === 'ROUTINE' && apCombined ? (
            <div className="rounded-2xl border border-dashed border-clinic-line bg-white px-3.5 py-2.5">
              <p className="text-[10px] font-semibold tracking-wide text-clinic-ink-muted">
                カルテ貼付時（A/P 結合）
              </p>
              <p className="mt-1 whitespace-pre-wrap font-mono text-[12px] text-clinic-ink">
                {apCombined}
              </p>
            </div>
          ) : null}
          {visitType === 'CHECKUP' ? (
            <p className="text-[11px] leading-relaxed text-clinic-ink-muted">
              健診定型: O に身体所見・CXR・ECG を含みます。根拠のない A/P は空のままにしてください。
            </p>
          ) : null}

          <button
            type="button"
            onClick={onSaveSoap}
            className="inline-flex w-full items-center justify-center gap-1.5 rounded-2xl border border-clinic-line bg-white py-3 text-[13px] font-semibold text-clinic-ink hover:bg-clinic-tint"
          >
            <Save className="h-4 w-4" />
            SOAP を保存
          </button>

          {/* 使う頻度の低いものは畳んでおく */}
          <div className="space-y-2 pt-1">
            <Section title="通常診療記録" icon={<ClipboardCopy className="h-4 w-4" />}>
              <textarea
                value={note}
                onChange={(e) => onNoteChange(e.target.value)}
                rows={10}
                className="w-full resize-y rounded-xl bg-clinic-tint px-3 py-2.5 text-[13px] leading-relaxed text-clinic-ink outline-none focus:ring-2 focus:ring-clinic-ink/15"
              />
              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={onSaveNote}
                  className="rounded-xl border border-clinic-line px-3 py-1.5 text-[12px] font-semibold text-clinic-ink hover:bg-clinic-tint"
                >
                  保存
                </button>
                <button
                  type="button"
                  disabled={!approved}
                  onClick={onCopyNote}
                  className="rounded-xl px-3 py-1.5 text-[12px] font-semibold text-clinic-ink-muted hover:bg-clinic-tint disabled:opacity-40"
                >
                  コピー
                </button>
              </div>
            </Section>

            <Section
              title="文字起こし"
              count={transcript.length}
              icon={<Mic className="h-4 w-4" />}
            >
              <ul className="max-h-[50vh] space-y-2 overflow-y-auto pr-1">
                {transcript.map((seg) => (
                  <li
                    key={seg.id}
                    className={cn(
                      'space-y-1.5 rounded-xl p-2.5',
                      seg.speaker === 'PHYSICIAN' ? 'bg-clinic-ink/5' : 'bg-clinic-tint',
                    )}
                  >
                    <Select
                      value={seg.speaker}
                      onChange={(e) => onSpeakerChange(seg.id, e.target.value)}
                      className="w-24 text-[11px]"
                    >
                      {SPEAKER_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </Select>
                    <textarea
                      value={seg.text}
                      onChange={(e) => onTranscriptTextChange(seg.id, e.target.value)}
                      rows={2}
                      className="w-full resize-y rounded-lg bg-white px-2.5 py-2 text-[13px] leading-relaxed text-clinic-ink outline-none"
                    />
                  </li>
                ))}
              </ul>
              <button
                type="button"
                onClick={onSaveTranscript}
                disabled={savingTranscript}
                className="mt-2 rounded-xl border border-clinic-line px-3 py-1.5 text-[12px] font-semibold text-clinic-ink hover:bg-clinic-tint disabled:opacity-50"
              >
                {savingTranscript ? '保存中…' : '文字起こしを保存'}
              </button>

              {glossarySuggestions && glossarySuggestions.length > 0 && (
                <div className="mt-3 space-y-2 rounded-xl border border-clinic-line bg-clinic-paper p-3">
                  <p className="text-[12px] font-semibold text-clinic-ink">
                    直した語を医院の辞書に入れますか
                  </p>
                  {glossarySuggestions.map((item) => {
                    const key = `${item.wrong}→${item.correct}`;
                    return (
                      <label
                        key={key}
                        className="flex items-center gap-2 text-[12px] text-clinic-ink"
                      >
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
                    <button
                      type="button"
                      className="rounded-xl bg-clinic-ink px-3 py-1.5 text-[12px] font-semibold text-clinic-cream"
                      onClick={() => {
                        const selected = glossarySuggestions.filter(
                          (item) => selectedSuggestions[`${item.wrong}→${item.correct}`],
                        );
                        onAddGlossarySuggestions?.(selected);
                      }}
                    >
                      辞書に入れる
                    </button>
                    <button
                      type="button"
                      className="rounded-xl px-3 py-1.5 text-[12px] font-semibold text-clinic-ink-muted"
                      onClick={onDismissGlossarySuggestions}
                    >
                      後で
                    </button>
                  </div>
                </div>
              )}
            </Section>

            <Section title="紙の資料を取り込む" icon={<FileScan className="h-4 w-4" />}>
              <PaperCapturePanel consultationId={consultationId} onApplied={onSoapChange} />
            </Section>

            <Section title="医療ナレッジ" icon={<History className="h-4 w-4" />}>
              <KnowledgeTranscriptPanel consultationId={consultationId} />
            </Section>

            {revisions.length > 0 && (
              <Section title="編集履歴" count={revisions.length} icon={<History className="h-4 w-4" />}>
                <ul className="space-y-2">
                  {revisions.map((r) => (
                    <li key={r.id} className="rounded-xl bg-clinic-tint px-3 py-2 text-[12px]">
                      <p className="font-semibold text-clinic-ink">{r.fieldName}</p>
                      <p className="mt-0.5 text-clinic-ink-muted line-through">{r.beforeValue}</p>
                      <p className="text-clinic-ink">{r.afterValue}</p>
                      <p className="mt-1 text-[10px] text-clinic-ink-muted">
                        {new Date(r.changedAt).toLocaleString('ja-JP')}
                      </p>
                    </li>
                  ))}
                </ul>
              </Section>
            )}
          </div>
        </div>

        {/* 右：書類は1タップ */}
        <div className="min-w-0 space-y-3 min-[900px]:sticky min-[900px]:top-24">
          <DocumentLauncher
            consultationId={consultationId}
            disabled={!approved}
            disabledReason={!approved ? '先に「確認済みにする」' : undefined}
            madeTypes={madeTypes}
            busyType={busyType}
            onGenerate={(type, recipient) => void handleGenerateDocument(type, recipient)}
          />
          {docsError && (
            <p className="rounded-xl bg-rose-50 px-3 py-2 text-[12px] text-rose-800">{docsError}</p>
          )}
          <DocumentsPanel
            key={docsRefresh}
            consultationId={consultationId}
            documentInput={{ caseCode: '', patientName: caseName, soap }}
            approved={approved}
            controlled
            showTypes={madeTypes}
            onDocsLoaded={setMadeTypes}
            referralPattern={referralPattern}
            onReferralPatternChange={setReferralPattern}
          />
        </div>
      </div>

      <SubkarteCommandBar consultationId={consultationId} onResult={handleSubkarteResult} />
    </div>
  );
}
