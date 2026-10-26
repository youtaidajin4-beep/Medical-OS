'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { createPortal } from 'react-dom';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronDown,
  ClipboardCopy,
  FileScan,
  FileText,
  History,
  Mic,
  MoreHorizontal,
  RefreshCw,
  Sparkles,
  X,
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
import { SOAPCard } from '@/components/aura/soap-card';
import { api } from '@/lib/api-client';
import {
  CUSTOM_PRESET_ID,
  findPreset,
  presetIdFor,
  SUMMARY_PRESETS,
} from '@/lib/summary-style';
import type { DocumentTypeId, SoapData } from '@/lib/mock-documents/types';
import {
  defaultCopyStyle,
  formatSoapForChartCopy,
  SOAP_TEMPLATE_TEXT,
  type CopyStyle,
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
  { key: 'subjective', label: 'S', name: '主観的情報', english: 'Subjective' },
  { key: 'objective', label: 'O', name: '客観的情報', english: 'Objective' },
  { key: 'assessment', label: 'A', name: '評価', english: 'Assessment' },
  { key: 'plan', label: 'P', name: '計画', english: 'Plan' },
] as const;

/**
 * 中身に合わせて高さが伸びる入力欄。
 *
 * 3行で固定すると、長いSOAPは途中で切れて、先生が下まで読み切らないままコピーしてしまう。
 * 全文が見える高さにしておく。
 */
function AutoTextarea({
  value,
  onChange,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight + 2}px`;
  }, [value]);
  return (
    <textarea
      ref={ref}
      rows={2}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={className}
    />
  );
}

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
    <div className="no-print overflow-hidden rounded-2xl border border-aura-line bg-white">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 px-3.5 py-3 text-left hover:bg-aura-mist"
      >
        <span className="text-aura-ink-muted">{icon}</span>
        <span className="text-[13px] font-semibold text-aura-ink">{title}</span>
        {typeof count === 'number' && count > 0 && (
          <span className="rounded-full bg-aura-mist px-2 py-0.5 text-[11px] font-semibold text-aura-ink-muted">
            {count}
          </span>
        )}
        <ChevronDown
          className={cn(
            'ml-auto h-4 w-4 text-aura-ink-muted transition-transform',
            open && 'rotate-180',
          )}
        />
      </button>
      {open && <div className="border-t border-aura-line px-3.5 py-3">{children}</div>}
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
  copied = false,
  soapDirty = false,
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
  /** 電子カルテへコピーした後か */
  copied?: boolean;
  /** 画面の編集がまだ保存されていないか */
  soapDirty?: boolean;
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
  onCopySoap: (style?: CopyStyle) => void | Promise<void>;
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
  const [tab, setTab] = useState<'source' | 'docs' | 'more'>('source');
  /** 原文・書類・その他を出す横のパネル。普段は閉じて、カルテ原稿だけを見せる */
  const [drawerOpen, setDrawerOpen] = useState(false);
  /** 開いた時点のSOAP。ここから変わった欄を「医師が編集」と見せる */
  const initialSoap = useRef<Soap>(soap);
  const [confirming, setConfirming] = useState(false);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const [copyStyle, setCopyStyle] = useState<CopyStyle>(defaultCopyStyle(visitType));

  useEffect(() => {
    try {
      const saved = localStorage.getItem('soapCopyStyle');
      if (saved === 'ap-combined' || saved === 'separate') setCopyStyle(saved);
    } catch {
      // 読めなければ既定のまま
    }
  }, []);

  // 書き方（形式・文体・長さ）。見本を選ぶか、自分の言葉で指示する
  const [styleOpen, setStyleOpen] = useState(false);
  const [styleChoice, setStyleChoice] = useState('standard');
  const [styleText, setStyleText] = useState('');
  const [styling, setStyling] = useState(false);
  const [styleMsg, setStyleMsg] = useState('');

  useEffect(() => {
    void api
      .getPhysicianRules()
      .then((rules) => {
        const saved = rules.summaryStyle;
        if (!saved?.instruction) return;
        setStyleText(saved.instruction);
        setStyleChoice(presetIdFor(saved.instruction, saved.presetId));
      })
      .catch(() => undefined);
  }, []);

  function choosePreset(id: string) {
    setStyleChoice(id);
    setStyleMsg('');
    const preset = findPreset(id);
    if (preset) setStyleText(preset.instruction);
  }

  async function restyle() {
    // 標準は「何も足さない」見本で指示が空。書き直しには、標準の書き方を言葉にして渡す
    const text =
      styleChoice === 'standard' || !styleText.trim()
        ? '1行1事実の、簡潔な体言止めで書く。'
        : styleText.trim();
    setStyling(true);
    setStyleMsg('');
    try {
      const res = await api.restyleSoap(consultationId, text);
      onSoapChange(res.soap);
      setStyleMsg('書き直しました。保存・コピーすると確定します');
    } catch (e) {
      setStyleMsg(e instanceof Error ? e.message : '書き直せませんでした');
    } finally {
      setStyling(false);
    }
  }

  async function saveDefaultStyle() {
    try {
      const rules = await api.getPhysicianRules();
      const instruction = styleText.trim();
      await api.updatePhysicianRules({
        ...rules,
        summaryStyle: instruction ? { instruction, presetId: styleChoice } : undefined,
      });
      setStyleMsg(
        instruction
          ? '次の診察から、この書き方で原稿を作ります'
          : '標準の書き方に戻しました（次の診察から）',
      );
    } catch (e) {
      setStyleMsg(e instanceof Error ? e.message : '保存できませんでした');
    }
  }

  function chooseCopyStyle(style: CopyStyle) {
    setCopyStyle(style);
    try {
      localStorage.setItem('soapCopyStyle', style);
    } catch {
      // 保存できなくても、この画面では効く
    }
  }

  function openDrawer(next: 'source' | 'docs' | 'more') {
    setTab(next);
    setDrawerOpen(true);
  }
  // 書類の画面（/documents）から来たときは、書類のパネルを開いた状態で始める
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('docs') === '1') openDrawer('docs');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [warningsOpen, setWarningsOpen] = useState(true);
  const [copying, setCopying] = useState(false);
  const [modKey, setModKey] = useState('Ctrl');

  useEffect(() => {
    if (/Mac|iPhone|iPad/.test(navigator.platform)) setModKey('⌘');
  }, []);

  async function runCopy() {
    if (copying) return;
    setCopying(true);
    try {
      await onCopySoap(copyStyle);
    } finally {
      setCopying(false);
    }
  }

  // ⌘/Ctrl + Enter で、電子カルテへコピー。サブカルテの入力欄では、Enter は送信なので奪わない
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== 'Enter' || !(e.metaKey || e.ctrlKey)) return;
      if ((e.target as HTMLElement | null)?.closest('[data-subkarte-bar]')) return;
      e.preventDefault();
      void runCopy();
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [copying, onCopySoap]);

  useEffect(() => {
    if (copyMsg) show(copyMsg, /失敗|できませんでした/.test(copyMsg) ? 'error' : 'success');
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
  const pasteText = formatSoapForChartCopy(soap, visitType, copyStyle);
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

  const tabs = [
    { id: 'source', label: '原文', icon: Mic, count: transcript.length },
    { id: 'docs', label: '書類', icon: FileText, count: madeTypes.length },
    { id: 'more', label: 'その他', icon: MoreHorizontal, count: 0 },
  ] as const;

  const statusLabel = copied ? 'コピー済み' : approved ? '確認済み' : '下書き';
  const statusTone = copied
    ? 'bg-emerald-100 text-emerald-800'
    : approved
      ? 'bg-sky-100 text-sky-800'
      : 'bg-amber-100 text-amber-800';

  return (
    <div className="mx-auto max-w-3xl px-4 pb-28 min-[480px]:px-6">
      <Toast toast={toast} />

      {/* 患者・状態・この画面でする一番のこと（電子カルテへコピー） */}
      <header className="no-print sticky top-0 z-20 -mx-4 mb-5 border-b border-aura-line bg-aura-paper/90 px-4 py-3 backdrop-blur min-[480px]:-mx-6 min-[480px]:px-6">
        <div className="flex items-center gap-2.5">
          <Link
            href={backHref}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-aura-line bg-white text-aura-ink hover:bg-aura-mist"
            aria-label="戻る"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[16px] font-semibold leading-tight text-aura-ink">
              {caseName}
            </p>
            <p className="mt-0.5 flex items-center gap-2 text-[11px] text-aura-ink-muted">
              {visitLabel}
              <span
                className={cn(
                  'rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wide',
                  statusTone,
                )}
              >
                {statusLabel}
              </span>
              {soapDirty && <span className="text-amber-700">未保存の変更</span>}
            </p>
          </div>

          <button
            type="button"
            onClick={() => openDrawer('source')}
            className="hidden h-10 shrink-0 items-center gap-1.5 rounded-xl border border-aura-line bg-white px-3 text-[12px] font-semibold text-aura-ink hover:bg-aura-mist min-[560px]:inline-flex"
          >
            <Mic className="h-3.5 w-3.5" />
            原文
          </button>
          <button
            type="button"
            onClick={() => openDrawer('docs')}
            className="hidden h-10 shrink-0 items-center gap-1.5 rounded-xl border border-aura-line bg-white px-3 text-[12px] font-semibold text-aura-ink hover:bg-aura-mist min-[560px]:inline-flex"
          >
            <FileText className="h-3.5 w-3.5" />
            書類
            {madeTypes.length > 0 && (
              <span className="rounded-full bg-aura-mist px-1.5 text-[10px]">
                {madeTypes.length}
              </span>
            )}
          </button>
          {onAppendRecording && (
            <button
              type="button"
              onClick={onAppendRecording}
              className="hidden h-10 shrink-0 items-center gap-1.5 rounded-xl border border-aura-line bg-white px-3 text-[12px] font-semibold text-aura-ink hover:bg-aura-mist min-[760px]:inline-flex"
              title="採血などで中断したとき、同じ診察の続きを録ります"
            >
              <Mic className="h-3.5 w-3.5" />
              続きを録る
            </button>
          )}

          <button
            type="button"
            onClick={() => void runCopy()}
            disabled={copying || soapIsEmpty}
            className={cn(
              'inline-flex h-11 shrink-0 items-center gap-2.5 rounded-xl px-4 text-[13px] font-semibold shadow-sm transition-colors disabled:cursor-not-allowed disabled:opacity-50',
              copied
                ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                : 'bg-aura-ink text-white hover:bg-aura-ink-soft',
            )}
          >
            {copied ? <Check className="h-4 w-4" /> : <ClipboardCopy className="h-4 w-4" />}
            {copying ? 'コピー中…' : copied ? 'もう一度コピー' : '電子カルテへコピー'}
            <kbd className="hidden rounded-md bg-white/15 px-1.5 py-0.5 font-sans text-[10px] font-medium tracking-wide min-[640px]:inline">
              {modKey} ↵
            </kbd>
          </button>
        </div>

        {copied && (
          <div className="mt-3 flex items-center gap-3 rounded-xl bg-emerald-50 px-3.5 py-2.5 text-[13px] text-emerald-900">
            <Check className="h-4 w-4 shrink-0 text-emerald-600" />
            <span className="min-w-0 flex-1">
              コピーしました。電子カルテに貼り付けたら、次の診察へ。
            </span>
            <Link
              href={backHref}
              className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-[12px] font-semibold text-white hover:bg-emerald-700"
            >
              次の診察へ
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        )}
      </header>

      {/* 要確認は1行にたたむ。開くと中身が出る（赤い大きな箱で原稿を押し下げない） */}
      {warnings.length > 0 && (
        <div className="no-print mb-4">
          <button
            type="button"
            onClick={() => setWarningsOpen((v) => !v)}
            className={cn(
              'inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-[12px] font-semibold',
              criticalCount
                ? 'border-rose-200 bg-rose-50 text-rose-900'
                : 'border-amber-200 bg-amber-50 text-amber-900',
            )}
          >
            <AlertTriangle className="h-3.5 w-3.5" />
            貼る前に確認 {warnings.length}件
            <ChevronDown
              className={cn('h-3.5 w-3.5 transition-transform', warningsOpen && 'rotate-180')}
            />
          </button>
          {warningsOpen && (
            <ul
              className={cn(
                'mt-2 space-y-1.5 rounded-2xl border px-4 py-3',
                criticalCount ? 'border-rose-200 bg-rose-50' : 'border-amber-200 bg-amber-50/70',
              )}
            >
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

      {/* SOAPを作れなかったときは、4つの空欄を見せるより、何をすればよいかを見せる */}
      {soapIsEmpty && (
        <div className="mb-5 rounded-3xl border border-aura-line bg-white p-6 text-center shadow-card">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
            <AlertTriangle className="h-6 w-6" />
          </span>
          <p className="mt-3 text-[15px] font-semibold text-aura-ink">
            音声からカルテ原稿を作れませんでした
          </p>
          <p className="mx-auto mt-1.5 max-w-md text-[13px] leading-relaxed text-aura-ink-muted">
            診察の内容を取り出せなかったため、<strong>あえて空欄にしています</strong>
            。定型文を自動で入れると、診察で確認していない所見が残るためです。マイクに声が届いていたかを確認して、同じ録音から作り直すか、録り直してください。
          </p>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
            {onReprocess && !approved && (
              <button
                type="button"
                className="rounded-full bg-aura-ink px-4 py-2 text-[12px] font-semibold text-white hover:bg-aura-ink-soft disabled:opacity-50"
                disabled={reprocessing}
                onClick={onReprocess}
              >
                {reprocessing ? '作り直しています…' : '同じ録音でもう一度作る'}
              </button>
            )}
            <button
              type="button"
              onClick={() => openDrawer('source')}
              className="rounded-full border border-aura-line bg-white px-4 py-2 text-[12px] font-semibold text-aura-ink hover:bg-aura-mist"
            >
              原文を見る
            </button>
          </div>
        </div>
      )}

      {/* カルテ原稿：1枚の紙として、S・O・A・P を上から並べる */}
      <article className="space-y-1">
        <div className="flex flex-wrap items-center gap-2 px-1 pb-3">
          <span className="text-[11px] font-semibold tracking-[0.2em] text-aura-ink-muted">
            カルテ原稿
          </span>
          <button
            type="button"
            onClick={() => setStyleOpen((v) => !v)}
            aria-expanded={styleOpen}
            className={cn(
              'ml-auto inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[11px] font-semibold transition-colors',
              styleOpen
                ? 'border-aura-ink bg-aura-ink text-white'
                : 'border-aura-line bg-white text-aura-ink hover:border-aura-ink/40',
            )}
          >
            <Sparkles className="h-3 w-3" />
            書き方
            <span className="font-normal opacity-75">
              {findPreset(styleChoice)?.label ?? '自分の指示'}
            </span>
          </button>
          <div
            role="group"
            aria-label="貼り付け形式"
            className="inline-flex rounded-lg bg-aura-mist p-0.5 text-[11px] font-semibold"
          >
            {(
              [
                ['ap-combined', 'S / O / A+P'],
                ['separate', 'S / O / A / P'],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                aria-pressed={copyStyle === value}
                onClick={() => chooseCopyStyle(value)}
                className={cn(
                  'rounded-md px-2.5 py-1 transition-colors',
                  copyStyle === value
                    ? 'bg-white text-aura-ink shadow-sm'
                    : 'text-aura-ink-muted hover:text-aura-ink',
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* 書き方：見本を選ぶか、自分の言葉で指示する。事実は変えず、形式・文体・長さだけを変える */}
        {styleOpen && (
          <div className="space-y-3 border-b border-aura-line bg-aura-paper/70 px-5 py-4">
            <div className="flex flex-wrap gap-1.5">
              {SUMMARY_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => choosePreset(preset.id)}
                  title={preset.hint}
                  className={cn(
                    'rounded-full border px-3 py-1 text-[12px] font-semibold transition-colors',
                    styleChoice === preset.id
                      ? 'border-aura-ink bg-aura-ink text-white'
                      : 'border-aura-line bg-white text-aura-ink hover:border-aura-ink/40',
                  )}
                >
                  {preset.label}
                </button>
              ))}
              <span
                className={cn(
                  'rounded-full border px-3 py-1 text-[12px] font-semibold',
                  styleChoice === CUSTOM_PRESET_ID
                    ? 'border-aura-ink bg-aura-ink text-white'
                    : 'border-dashed border-aura-line text-aura-ink-muted',
                )}
              >
                自分の指示
              </span>
            </div>
            <textarea
              value={styleText}
              onChange={(e) => {
                setStyleText(e.target.value);
                setStyleChoice(presetIdFor(e.target.value));
                setStyleMsg('');
              }}
              rows={3}
              maxLength={600}
              placeholder="例：Sは患者の言葉に近く、Pは番号をつけて書く。Aは診断名だけにする。"
              className="w-full resize-y rounded-xl border border-aura-line bg-white px-3 py-2 text-[13px] leading-relaxed text-aura-ink outline-none focus:ring-2 focus:ring-aura-ink/10"
            />
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => void restyle()}
                disabled={styling || soapIsEmpty}
                className="inline-flex items-center gap-1.5 rounded-xl bg-aura-ink px-3.5 py-2 text-[12px] font-semibold text-white hover:bg-aura-ink-soft disabled:opacity-50"
              >
                <Sparkles className={cn('h-3.5 w-3.5', styling && 'animate-pulse')} />
                {styling ? '書き直しています…' : 'この書き方で書き直す'}
              </button>
              <button
                type="button"
                onClick={() => void saveDefaultStyle()}
                className="rounded-xl border border-aura-line bg-white px-3 py-2 text-[12px] font-semibold text-aura-ink hover:bg-aura-mist"
              >
                いつもこの書き方にする
              </button>
              {styleMsg && <span className="text-[12px] text-aura-ink-muted">{styleMsg}</span>}
            </div>
            <p className="text-[11px] leading-relaxed text-aura-ink-muted">
              書き方（形式・文体・長さ）だけを変えます。会話に無いことは足さず、あることは削りません。
            </p>
          </div>
        )}

        <div className="space-y-4 px-0 pb-1 pt-2">
          {SOAP_FIELDS.map(({ key, label, name, english }) => (
            <SOAPCard
              key={key}
              letter={label}
              english={english}
              name={name}
              value={soap[key]}
              edited={soap[key] !== initialSoap.current[key]}
              templated={Boolean(templatedFields[key])}
              copied={copiedField === label}
              onChange={(v) => changeSoapField(key, v)}
              onCopy={() => void copyField(label, soap[key])}
            />
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-1.5 px-2 pt-3">
          <span className="text-[11px] text-aura-ink-muted">定型文</span>
          {templateTargets(visitType).map((target) => (
            <button
              key={target.label}
              type="button"
              className="rounded-full border border-aura-line bg-white px-2.5 py-1 text-[11px] font-medium text-aura-ink hover:border-aura-ink disabled:opacity-40"
              disabled={copied}
              onClick={() => applyTemplate(target.fields)}
            >
              {target.label}
            </button>
          ))}
          <div className="ml-auto flex items-center gap-3">
            {soapDirty && (
              <button
                type="button"
                onClick={onSaveSoap}
                className="text-[11px] font-semibold text-aura-ink underline decoration-aura-line underline-offset-2 hover:decoration-aura-ink"
              >
                保存
              </button>
            )}
            {onReprocess && !approved && !soapIsEmpty && (
              <button
                type="button"
                className="inline-flex items-center gap-1 text-[11px] font-medium text-aura-ink-muted hover:text-aura-ink disabled:opacity-40"
                disabled={reprocessing}
                onClick={onReprocess}
              >
                <RefreshCw className={cn('h-3 w-3', reprocessing && 'animate-spin')} />
                {reprocessing ? '作り直し中…' : '作り直す'}
              </button>
            )}
          </div>
        </div>
      </article>

      {visitType === 'CHECKUP' ? (
        <p className="mt-3 text-[11px] leading-relaxed text-aura-ink-muted">
          健診定型: O に身体所見・CXR・ECG を含みます。根拠のない A/P は空のままにしてください。
        </p>
      ) : null}

      {/* SOAPを確定。確定したら、次は書類へ */}
      {!soapIsEmpty && (
        <div className="no-print mt-8">
          {approved || copied ? (
            <div className="animate-fade-in-up rounded-[1.75rem] border border-aura-mint-200 bg-aura-mint-50/80 p-6 text-center shadow-float">
              <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-aura-teal-500 text-white shadow-glow">
                <Check className="h-6 w-6" />
              </span>
              <p className="mt-3 text-[18px] font-semibold text-aura-ink">SOAPが完成しました</p>
              <div className="mt-4 flex flex-wrap items-center justify-center gap-2.5">
                <button
                  type="button"
                  onClick={() => openDrawer('docs')}
                  className="inline-flex h-12 items-center gap-2 rounded-full bg-gradient-to-b from-aura-mint-400 to-aura-teal-500 px-7 text-[15px] font-semibold text-white shadow-glow transition duration-300 hover:-translate-y-0.5 hover:brightness-105 active:translate-y-0"
                >
                  <FileText className="h-4 w-4" />
                  書類を作成する
                  <ArrowRight className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => void runCopy()}
                  disabled={copying}
                  className="inline-flex h-12 items-center gap-2 rounded-full border border-aura-line bg-white px-5 text-[14px] font-medium text-aura-ink-soft transition hover:-translate-y-px hover:shadow-float disabled:opacity-50"
                >
                  <ClipboardCopy className="h-4 w-4" />
                  {copied ? 'もう一度コピー' : '電子カルテへコピー'}
                </button>
              </div>
            </div>
          ) : (
            <div className="flex justify-center">
              <button
                type="button"
                disabled={confirming}
                onClick={async () => {
                  setConfirming(true);
                  try {
                    if (soapDirty) await onSaveSoap();
                    await onApprove();
                  } finally {
                    setConfirming(false);
                  }
                }}
                className="inline-flex h-14 items-center gap-2.5 rounded-full bg-aura-ink px-10 text-[16px] font-semibold text-white shadow-float-lg transition duration-300 hover:-translate-y-0.5 hover:bg-aura-ink-soft active:translate-y-0 active:scale-[0.99] disabled:opacity-60"
              >
                <Check className="h-5 w-5" />
                {confirming ? '確定しています…' : 'SOAPを確定'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* 貼る前に、実際に貼られる文字を確かめる */}
      <details className="no-print group/preview mt-4 rounded-2xl border border-dashed border-aura-line bg-white/70 px-4 py-2.5">
        <summary className="cursor-pointer list-none text-[11px] font-semibold tracking-[0.18em] text-aura-ink-muted">
          貼り付けられる内容
          <span className="ml-2 font-normal tracking-normal text-aura-ink-muted/70">
            （開いて確認）
          </span>
        </summary>
        <pre className="mt-2 whitespace-pre-wrap font-sans text-[12px] leading-relaxed text-aura-ink">
          {pasteText || '（まだ内容がありません）'}
        </pre>
      </details>

      {/* 横のパネル：原文・書類・その他。使うときだけ開く */}
      {mounted &&
        createPortal(
      <aside
        className={cn(
          'no-print fixed inset-y-0 right-0 z-40 flex w-full max-w-[460px] flex-col border-l border-aura-line bg-aura-paper shadow-[-24px_0_48px_-24px_rgba(12,47,44,0.35)] transition-transform duration-200 [transition-property:transform,visibility]',
          drawerOpen ? 'translate-x-0' : 'invisible pointer-events-none translate-x-full',
        )}
        aria-hidden={!drawerOpen}
      >
        <div className="flex items-center gap-2 border-b border-aura-line px-4 py-3">
          <div role="tablist" className="flex flex-1 gap-1 rounded-2xl bg-aura-mist p-1">
            {tabs.map(({ id, label, icon: Icon, count }) => (
              <button
                key={id}
                role="tab"
                type="button"
                aria-selected={tab === id}
                onClick={() => setTab(id)}
                className={cn(
                  'flex min-w-0 flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-xl px-2 py-2 text-[12px] font-semibold transition-colors',
                  tab === id
                    ? 'bg-aura-ink text-white'
                    : 'text-aura-ink-muted hover:bg-white hover:text-aura-ink',
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
                {count > 0 && (
                  <span
                    className={cn(
                      'rounded-full px-1.5 text-[10px]',
                      tab === id ? 'bg-white/15' : 'bg-white',
                    )}
                  >
                    {count}
                  </span>
                )}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setDrawerOpen(false)}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-aura-ink-muted hover:bg-aura-mist hover:text-aura-ink"
            aria-label="閉じる"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto p-4">
          {/* 原文（診察で言ったことと、原稿を見比べる） */}
          <div className={cn('space-y-3', tab !== 'source' && 'hidden')}>
            <div className="rounded-2xl border border-aura-line bg-white p-3">
              <ul className="max-h-[64vh] space-y-2 overflow-y-auto pr-1">
                {transcript.length === 0 && (
                  <li className="px-1 py-6 text-center text-[12px] text-aura-ink-muted">
                    文字起こしはまだありません
                  </li>
                )}
                {transcript.map((seg) => (
                  <li
                    key={seg.id}
                    className={cn(
                      'space-y-1.5 rounded-xl p-2.5',
                      seg.speaker === 'PHYSICIAN' ? 'bg-aura-ink/5' : 'bg-aura-mist',
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
                      className="w-full resize-y rounded-lg bg-white px-2.5 py-2 text-[13px] leading-relaxed text-aura-ink outline-none"
                    />
                  </li>
                ))}
              </ul>
              {transcript.length > 0 && (
                <button
                  type="button"
                  onClick={onSaveTranscript}
                  disabled={savingTranscript}
                  className="mt-2 rounded-xl border border-aura-line px-3 py-1.5 text-[12px] font-semibold text-aura-ink hover:bg-aura-mist disabled:opacity-50"
                >
                  {savingTranscript ? '保存中…' : '文字起こしを保存'}
                </button>
              )}
            </div>

            {glossarySuggestions && glossarySuggestions.length > 0 && (
              <div className="space-y-2 rounded-2xl border border-aura-line bg-white p-3">
                <p className="text-[12px] font-semibold text-aura-ink">
                  直した語を医院の辞書に入れますか
                </p>
                {glossarySuggestions.map((item) => {
                  const key = `${item.wrong}→${item.correct}`;
                  return (
                    <label key={key} className="flex items-center gap-2 text-[12px] text-aura-ink">
                      <input
                        type="checkbox"
                        checked={selectedSuggestions[key] ?? false}
                        onChange={(e) =>
                          setSelectedSuggestions((prev) => ({ ...prev, [key]: e.target.checked }))
                        }
                      />
                      {item.wrong} → {item.correct}
                    </label>
                  );
                })}
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="rounded-xl bg-aura-ink px-3 py-1.5 text-[12px] font-semibold text-white"
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
                    className="rounded-xl px-3 py-1.5 text-[12px] font-semibold text-aura-ink-muted"
                    onClick={onDismissGlossarySuggestions}
                  >
                    後で
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* 書類（押したときだけ作る） */}
          <div className={cn('space-y-3', tab !== 'docs' && 'hidden')}>
            <DocumentLauncher
              consultationId={consultationId}
              disabled={!approved}
              disabledReason={
                !approved ? '先に「電子カルテへコピー」で確認済みにします' : undefined
              }
              madeTypes={madeTypes}
              busyType={busyType}
              onGenerate={(type, recipient) => void handleGenerateDocument(type, recipient)}
            />
            {docsError && (
              <p className="rounded-xl bg-rose-50 px-3 py-2 text-[12px] text-rose-800">
                {docsError}
              </p>
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

          {/* その他（使う頻度の低いもの） */}
          <div className={cn('space-y-2', tab !== 'more' && 'hidden')}>
            <Section title="通常診療記録" icon={<ClipboardCopy className="h-4 w-4" />}>
              <textarea
                value={note}
                onChange={(e) => onNoteChange(e.target.value)}
                rows={10}
                className="w-full resize-y rounded-xl bg-aura-mist px-3 py-2.5 text-[13px] leading-relaxed text-aura-ink outline-none focus:ring-2 focus:ring-aura-ink/15"
              />
              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={onSaveNote}
                  className="rounded-xl border border-aura-line px-3 py-1.5 text-[12px] font-semibold text-aura-ink hover:bg-aura-mist"
                >
                  保存
                </button>
                <button
                  type="button"
                  onClick={onCopyNote}
                  className="rounded-xl px-3 py-1.5 text-[12px] font-semibold text-aura-ink-muted hover:bg-aura-mist"
                >
                  コピー
                </button>
              </div>
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
                    <li key={r.id} className="rounded-xl bg-aura-mist px-3 py-2 text-[12px]">
                      <p className="font-semibold text-aura-ink">{r.fieldName}</p>
                      <p className="mt-0.5 text-aura-ink-muted line-through">{r.beforeValue}</p>
                      <p className="text-aura-ink">{r.afterValue}</p>
                      <p className="mt-1 text-[10px] text-aura-ink-muted">
                        {new Date(r.changedAt).toLocaleString('ja-JP')}
                      </p>
                    </li>
                  ))}
                </ul>
              </Section>
            )}
          </div>
        </div>
      </aside>,
        document.body,
      )}

      <SubkarteCommandBar consultationId={consultationId} onResult={handleSubkarteResult} />
    </div>
  );
}
