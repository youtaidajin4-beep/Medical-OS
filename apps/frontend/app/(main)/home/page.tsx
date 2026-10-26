'use client';

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Camera, ChevronRight, FileText, Mic, UserPlus, X } from 'lucide-react';
import { api, getToken, isUnauthorizedError } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import { Alert } from '@/components/ui/alert';
import { Spinner } from '@/components/ui/spinner';
import { PatientSearch } from '@/components/aura/patient-search';
import { PatientAvatar, sexLabel } from '@/components/aura/patient-card';
import { PatientJourney } from '@/components/aura/patient-journey';
import { cn } from '@/lib/utils';

type LogItem = {
  id: string;
  status: string;
  createdAt: string;
  label: string;
  hasPatient: boolean;
};

type PatientOption = {
  id: string;
  name: string;
  nameKana?: string | null;
  code: string;
  age: number | null;
  sex: string | null;
  phone?: string | null;
  memo?: string | null;
  visitCount?: number;
};

type PatientForm = {
  name: string;
  nameKana: string;
  sex: string;
  dateOfBirth: string;
  phone: string;
  memo: string;
};

const EMPTY_FORM: PatientForm = { name: '', nameKana: '', sex: '', dateOfBirth: '', phone: '', memo: '' };

/** 「10分前」「昨日」。診察室で、直近の記録が一目で分かる言い方 */
function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'たった今';
  if (min < 60) return `${min}分前`;
  const hour = Math.floor(min / 60);
  if (hour < 24) return `${hour}時間前`;
  const day = Math.floor(hour / 24);
  if (day === 1) return '昨日';
  if (day < 7) return `${day}日前`;
  return new Date(iso).toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' });
}

function statusChip(status: string): { label: string; tone: 'done' | 'wait' | 'busy' } {
  if (status === 'APPROVED' || status === 'COMPLETED') return { label: 'SOAP完成', tone: 'done' };
  if (status === 'REVIEW') return { label: '確認待ち', tone: 'wait' };
  if (status === 'PROCESSING') return { label: '作成中', tone: 'busy' };
  return { label: '録音前', tone: 'busy' };
}

type Stage = 'idle' | 'choose' | 'ready';

export default function HomePage() {
  const router = useRouter();
  const [stage, setStage] = useState<Stage>('idle');
  const [patientId, setPatientId] = useState('');
  /** 患者を選ばずに始める（一時診療）。選んだつもりで違う人の診察を始めないよう、明示的に選ばせる */
  const [anonymous, setAnonymous] = useState(false);
  const [patients, setPatients] = useState<PatientOption[]>([]);
  const [logs, setLogs] = useState<LogItem[]>([]);
  const [starting, setStarting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [consentGiven, setConsentGiven] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState<PatientForm>(EMPTY_FORM);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [questionnaireFile, setQuestionnaireFile] = useState<File | null>(null);
  const [questionnairePreview, setQuestionnairePreview] = useState('');
  const [visitType, setVisitType] = useState<'ROUTINE' | 'CHECKUP'>('ROUTINE');
  const [modKey, setModKey] = useState('Ctrl');
  const photoInputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    const [consultations, patientRes] = await Promise.all([api.consultations(), api.patients()]);
    setLogs(
      consultations.slice(0, 40).map((c) => ({
        id: c.id,
        status: c.status,
        createdAt: c.startedAt ?? c.createdAt,
        label: c.patient?.name ?? c.anonymousCase?.displayName ?? '診療',
        hasPatient: Boolean(c.patient),
      })),
    );
    setPatients(
      patientRes.patients.map((p) => ({
        id: p.id,
        name: p.name,
        nameKana: p.nameKana,
        code: p.code,
        age: p.age,
        sex: p.sex,
        phone: p.phone,
        memo: p.memo,
        visitCount: (p as { visitCount?: number }).visitCount,
      })),
    );
  }, []);

  useEffect(() => {
    if (/Mac|iPhone|iPad/.test(navigator.platform)) setModKey('⌘');
    // サイドナビの「SOAPをつくる」から来たときは、すぐ患者選びへ
    if (new URLSearchParams(window.location.search).get('start') === '1') setStage('choose');
  }, []);

  useEffect(() => {
    if (!getToken()) {
      router.replace('/login');
      return;
    }
    void load()
      .catch((err) => {
        if (isUnauthorizedError(err)) router.replace('/login');
        else setError(err instanceof Error ? err.message : '読み込みに失敗しました');
      })
      .finally(() => setLoading(false));
  }, [router, load]);

  const patient = patients.find((p) => p.id === patientId) ?? null;
  const canStart = Boolean(patient || anonymous);

  // 最近の患者（患者ごとに、いちばん新しい診療だけ）
  const recent = useMemo(() => {
    const seen = new Set<string>();
    const out: LogItem[] = [];
    for (const l of logs) {
      if (seen.has(l.label)) continue;
      seen.add(l.label);
      out.push(l);
      if (out.length >= 4) break;
    }
    return out;
  }, [logs]);

  function choose(p: PatientOption) {
    setPatientId(p.id);
    setAnonymous(false);
    setStage('ready');
  }

  function openAdd(query: string) {
    setForm({ ...EMPTY_FORM, name: query });
    setFormError('');
    setAddOpen(true);
  }

  function handleQuestionnaire(file: File | null) {
    if (questionnairePreview) URL.revokeObjectURL(questionnairePreview);
    if (!file) {
      setQuestionnaireFile(null);
      setQuestionnairePreview('');
      return;
    }
    setQuestionnaireFile(file);
    setQuestionnairePreview(URL.createObjectURL(file));
  }

  async function savePatient(e: FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) {
      setFormError('氏名を入力してください');
      return;
    }
    setSaving(true);
    setFormError('');
    try {
      const created = await api.createPatient({
        name: form.name.trim(),
        nameKana: form.nameKana.trim() || undefined,
        sex: form.sex === 'M' || form.sex === 'F' ? form.sex : undefined,
        dateOfBirth: form.dateOfBirth || undefined,
        phone: form.phone.trim() || undefined,
        memo: form.memo.trim() || undefined,
      });
      await load();
      setPatientId(created.id);
      setAnonymous(false);
      setStage('ready');
      setAddOpen(false);
      setForm(EMPTY_FORM);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : '追加できませんでした');
    } finally {
      setSaving(false);
    }
  }

  async function startConsultation() {
    if (!consentGiven || !canStart || starting) return;
    setError('');
    setStarting(true);
    try {
      const consultation = patient
        ? await api.createConsultation({ patientId: patient.id, visitType })
        : await api.createConsultation({
            anonymousCaseId: (await api.createAnonymousCase({ displayName: '本日の診療' })).id,
            visitType,
          });
      if (questionnaireFile) {
        await api.uploadAttachment(consultation.id, questionnaireFile, 'questionnaire');
      }
      // ここで確認した同意を、録音画面へ引き継ぐ（同じ確認を2回させない）
      try {
        sessionStorage.setItem(`consent:${consultation.id}`, '1');
      } catch {
        // 引き継げなくても、録音画面で改めて確認するだけ
      }
      router.push(`/consultation/${consultation.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : '診療を開始できませんでした');
      setStarting(false);
    }
  }

  // ⌘/Ctrl + Enter で診療を開始（準備が整っているとき）
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && !addOpen && stage === 'ready') {
        e.preventDefault();
        void startConsultation();
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [consentGiven, canStart, starting, patient, visitType, questionnaireFile, addOpen, stage]);

  return (
    <div className="mx-auto flex min-h-[calc(100dvh-8rem)] w-full max-w-2xl flex-col items-center justify-center py-6">
      {stage === 'idle' && (
        <div key="idle" className="w-full animate-fade-in-up text-center">
          <p className="text-[12px] font-semibold tracking-[0.3em] text-aura-teal-500">TODAY</p>
          <h1 className="mt-3 text-[34px] font-semibold leading-tight tracking-tight text-aura-ink min-[640px]:text-[40px]">
            診療をはじめましょう。
          </h1>
          <p className="mt-3 text-[15px] text-aura-ink-soft">話すだけで、SOAPと書類ができあがります。</p>

          {/* 中央の主役。押すと患者選びへ */}
          <button
            type="button"
            onClick={() => setStage('choose')}
            className="group relative mx-auto mt-10 block w-full max-w-md overflow-hidden rounded-[2.25rem] border border-white/80 bg-white/80 px-8 py-10 text-center shadow-float-lg backdrop-blur transition duration-300 ease-out hover:-translate-y-1 hover:shadow-[0_2px_2px_rgb(36_48_46/0.03),0_24px_56px_-14px_rgb(36_48_46/0.18),0_48px_96px_-36px_rgb(31_138_133/0.28)] active:translate-y-0 active:scale-[0.99]"
          >
            <span
              aria-hidden
              className="pointer-events-none absolute -top-24 left-1/2 h-56 w-56 -translate-x-1/2 rounded-full bg-gradient-to-b from-aura-mint-200/60 to-transparent blur-2xl"
            />
            <span className="relative mx-auto flex h-24 w-24 items-center justify-center">
              <span className="absolute inset-0 animate-orb-ripple rounded-full bg-aura-mint-300/40" />
              <span className="absolute inset-0 animate-orb-breathe rounded-full bg-gradient-to-br from-aura-cyan-300 via-aura-mint-300 to-aura-teal-400 shadow-glow" />
              <span className="absolute inset-[5px] rounded-full bg-gradient-to-br from-white/60 to-transparent" />
              <Mic className="relative h-9 w-9 text-white drop-shadow transition-transform duration-300 group-hover:scale-110" />
            </span>
            <span className="relative mt-7 block text-[22px] font-semibold tracking-tight text-aura-ink">
              SOAPを作成する
            </span>
            <span className="relative mt-2 block text-[14px] leading-relaxed text-aura-ink-soft">
              診察を録音するとAIが
              <br />
              SOAPを自動作成します
            </span>
          </button>

          <Link
            href="/documents"
            className="mx-auto mt-5 inline-flex items-center gap-2 rounded-full border border-aura-line bg-white/70 px-5 py-2.5 text-[14px] font-medium text-aura-ink-soft backdrop-blur transition duration-200 hover:-translate-y-px hover:bg-white hover:text-aura-ink hover:shadow-float"
          >
            <FileText className="h-4 w-4 text-aura-teal-500" />
            書類を作成する
          </Link>

          {/* 最近の患者。管理画面ではなく、次の一歩のための短い一覧 */}
          {recent.length > 0 && (
            <div className="mx-auto mt-14 w-full max-w-md text-left">
              <p className="mb-2 px-2 text-[11px] font-semibold tracking-[0.2em] text-aura-ink-muted">最近の患者</p>
              <ul className="space-y-0.5">
                {recent.map((r) => {
                  const chip = statusChip(r.status);
                  return (
                    <li key={r.id}>
                      <button
                        type="button"
                        onClick={() => router.push(`/consultation/${r.id}`)}
                        className="group flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition duration-200 hover:bg-white hover:shadow-float"
                      >
                        <span className="min-w-0 flex-1 truncate text-[14px] font-medium text-aura-ink">{r.label}</span>
                        <span className="text-[12px] text-aura-ink-muted">{relativeTime(r.createdAt)}</span>
                        <span
                          className={cn(
                            'inline-flex w-[5.5rem] items-center justify-end gap-1.5 text-[12px] font-medium',
                            chip.tone === 'done' && 'text-aura-teal-600',
                            chip.tone === 'wait' && 'text-amber-600',
                            chip.tone === 'busy' && 'text-aura-ink-muted',
                          )}
                        >
                          {chip.tone === 'done' ? '✓' : '●'} {chip.label}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>
      )}

      {stage === 'choose' && (
        <div key="choose" className="w-full animate-fade-in-up">
          <button
            type="button"
            onClick={() => setStage('idle')}
            className="mb-6 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] text-aura-ink-muted transition hover:bg-aura-mist hover:text-aura-ink"
          >
            <ArrowLeft className="h-4 w-4" />
            もどる
          </button>
          <h1 className="mb-6 text-center text-[28px] font-semibold tracking-tight text-aura-ink">
            どの患者さんですか？
          </h1>
          <PatientSearch
            patients={patients}
            loading={loading}
            selectedId={patientId}
            autoFocus
            onSelect={choose}
            onAddNew={openAdd}
            onAnonymous={() => {
              setAnonymous(true);
              setPatientId('');
              setStage('ready');
            }}
          />
        </div>
      )}

      {stage === 'ready' && (
        <form
          key="ready"
          onSubmit={(e) => {
            e.preventDefault();
            void startConsultation();
          }}
          className="w-full animate-fade-in-up space-y-6"
        >
          <button
            type="button"
            onClick={() => setStage('choose')}
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] text-aura-ink-muted transition hover:bg-aura-mist hover:text-aura-ink"
          >
            <ArrowLeft className="h-4 w-4" />
            患者をえらびなおす
          </button>

          <section className="rounded-[2rem] border border-white/80 bg-white/85 p-6 shadow-float-lg backdrop-blur min-[480px]:p-8">
            <div className="flex items-center gap-4">
              <PatientAvatar name={patient?.name ?? '一'} size="lg" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[24px] font-semibold tracking-tight text-aura-ink">
                  {patient ? patient.name : '一時診療'}
                </p>
                <p className="mt-0.5 text-[13px] text-aura-ink-muted">
                  {patient
                    ? [
                        patient.age != null ? `${patient.age}歳` : '',
                        sexLabel(patient.sex),
                        `ID ${patient.code}`,
                        patient.visitCount != null ? `通院${patient.visitCount}回` : '',
                      ]
                        .filter(Boolean)
                        .join(' / ')
                    : '患者に紐づけず、この診察だけ記録します'}
                </p>
              </div>
            </div>
            <PatientJourney
              className="mt-7"
              states={[questionnaireFile ? 'done' : 'todo', 'current', 'todo', 'todo']}
            />
          </section>

          <section className="space-y-5 rounded-[2rem] border border-white/80 bg-white/70 p-6 backdrop-blur min-[480px]:p-8">
            <div>
              <p className="mb-2 text-[12px] font-semibold tracking-wide text-aura-ink-muted">診療のタイプ</p>
              <div className="grid grid-cols-2 gap-2">
                {(
                  [
                    ['ROUTINE', '通常診察', 'A/P 定型・フォロー向け'],
                    ['CHECKUP', '健診', 'CXR / ECG 定型つき'],
                  ] as const
                ).map(([value, title, sub]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setVisitType(value)}
                    className={cn(
                      'rounded-2xl border px-4 py-3 text-left transition duration-200',
                      visitType === value
                        ? 'border-aura-mint-300 bg-aura-mint-50 shadow-float'
                        : 'border-aura-line bg-white hover:-translate-y-px hover:shadow-float',
                    )}
                  >
                    <span className="block text-[14px] font-semibold text-aura-ink">{title}</span>
                    <span className="mt-0.5 block text-[11px] text-aura-ink-muted">{sub}</span>
                  </button>
                ))}
              </div>
            </div>

            <input
              ref={photoInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => {
                handleQuestionnaire(e.target.files?.[0] ?? null);
                e.target.value = '';
              }}
            />
            <button
              type="button"
              onClick={() => photoInputRef.current?.click()}
              className="group flex w-full items-center gap-3.5 rounded-2xl border border-dashed border-aura-mint-300 bg-aura-mint-50/60 px-4 py-3 text-left transition hover:border-aura-teal-400 hover:bg-white"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-aura-line">
                {questionnairePreview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={questionnairePreview} alt="問診票" className="h-full w-full object-cover" />
                ) : (
                  <Camera className="h-[18px] w-[18px] text-aura-teal-500" />
                )}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[14px] font-semibold text-aura-ink">
                  {questionnaireFile ? '問診票を取り込み済み' : '問診票を撮影して取り込む（任意）'}
                </span>
                <span className="mt-0.5 block text-[12px] text-aura-ink-muted">基本情報とSOAPへ反映します</span>
              </span>
              {questionnaireFile && (
                <X
                  className="h-4 w-4 text-aura-ink-muted hover:text-aura-ink"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleQuestionnaire(null);
                  }}
                />
              )}
            </button>

            <label className="flex w-full cursor-pointer items-start gap-3 rounded-2xl border border-aura-line bg-white px-4 py-3 text-[13px] leading-relaxed text-aura-ink-soft">
              <input
                type="checkbox"
                className="mt-0.5 h-4 w-4 rounded border-slate-300 accent-[#1f8a85]"
                checked={consentGiven}
                onChange={(e) => setConsentGiven(e.target.checked)}
              />
              <span>患者の同意を得た上で診療音声を記録します。音声はSOAP生成後、24時間以内に自動で削除されます。</span>
            </label>

            {error && <Alert variant="error">{error}</Alert>}

            <button
              type="submit"
              disabled={starting || !consentGiven || !canStart}
              className="group relative flex h-14 w-full items-center justify-center gap-3 overflow-hidden rounded-full bg-gradient-to-b from-aura-mint-400 to-aura-teal-500 text-[16px] font-semibold text-white shadow-glow transition duration-300 hover:-translate-y-0.5 hover:brightness-105 active:translate-y-0 active:scale-[0.99] disabled:translate-y-0 disabled:cursor-not-allowed disabled:from-aura-cloud disabled:to-aura-cloud disabled:text-aura-ink-muted disabled:shadow-none"
            >
              {starting ? <Spinner className="text-white" /> : <Mic className="h-5 w-5" />}
              {starting ? '開始しています…' : '録音をはじめる'}
              {canStart && consentGiven && !starting && (
                <kbd className="hidden rounded-md bg-white/20 px-1.5 py-0.5 font-sans text-[10px] font-medium min-[640px]:inline">
                  {modKey} ↵
                </kbd>
              )}
            </button>
            {!consentGiven && (
              <p className="text-center text-[12px] text-aura-ink-muted">同意の確認にチェックを入れると、はじめられます。</p>
            )}
          </section>
        </form>
      )}

      {error && stage !== 'ready' && (
        <div className="mt-6 w-full">
          <Alert variant="error">{error}</Alert>
        </div>
      )}

      {addOpen && (
        <div className="fixed inset-0 z-[70] flex items-end justify-center bg-aura-ink/35 p-3 backdrop-blur-sm min-[640px]:items-center">
          <form
            onSubmit={savePatient}
            className="w-full max-w-lg animate-scale-in rounded-[2rem] border border-white/80 bg-aura-paper p-5 shadow-float-lg min-[480px]:p-7"
          >
            <div className="mb-5 flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold tracking-[0.2em] text-aura-teal-500">PATIENT</p>
                <h2 className="mt-1 text-xl font-semibold tracking-tight text-aura-ink">患者を追加</h2>
                <p className="mt-1 text-sm text-aura-ink-soft">登録すると、カルテ番号が付いて、次から検索で出せます。</p>
              </div>
              <button
                type="button"
                className="rounded-full p-2 text-aura-ink-muted hover:bg-aura-mist"
                onClick={() => setAddOpen(false)}
                aria-label="閉じる"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="grid gap-3 min-[520px]:grid-cols-2">
              <label className="space-y-1">
                <span className="text-xs font-medium text-aura-ink-soft">氏名</span>
                <Input
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="山田 太郎"
                  autoFocus
                />
              </label>
              <label className="space-y-1">
                <span className="text-xs font-medium text-aura-ink-soft">フリガナ</span>
                <Input
                  value={form.nameKana}
                  onChange={(e) => setForm((f) => ({ ...f, nameKana: e.target.value }))}
                  placeholder="ヤマダ タロウ"
                />
              </label>
              <label className="space-y-1">
                <span className="text-xs font-medium text-aura-ink-soft">性別</span>
                <Select
                  className="w-full"
                  value={form.sex}
                  onChange={(e) => setForm((f) => ({ ...f, sex: e.target.value }))}
                >
                  <option value="">未選択</option>
                  <option value="M">男</option>
                  <option value="F">女</option>
                </Select>
              </label>
              <label className="space-y-1">
                <span className="text-xs font-medium text-aura-ink-soft">生年月日</span>
                <Input
                  type="date"
                  value={form.dateOfBirth}
                  onChange={(e) => setForm((f) => ({ ...f, dateOfBirth: e.target.value }))}
                />
              </label>
              <label className="space-y-1 min-[520px]:col-span-2">
                <span className="text-xs font-medium text-aura-ink-soft">電話</span>
                <Input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
              </label>
              <label className="space-y-1 min-[520px]:col-span-2">
                <span className="text-xs font-medium text-aura-ink-soft">メモ</span>
                <Textarea rows={2} value={form.memo} onChange={(e) => setForm((f) => ({ ...f, memo: e.target.value }))} />
              </label>
            </div>
            {formError && <p className="mt-3 text-sm text-red-600">{formError}</p>}
            <div className="mt-5 flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => setAddOpen(false)}>
                キャンセル
              </Button>
              <Button
                type="submit"
                className="rounded-full bg-aura-teal-500 hover:bg-aura-teal-600"
                icon={saving ? <Spinner className="text-white" /> : <UserPlus />}
                disabled={saving}
              >
                追加する
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
