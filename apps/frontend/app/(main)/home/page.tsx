'use client';

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Camera, ChevronRight, Mic, Plus, Search, UserPlus, X } from 'lucide-react';
import { api, getToken, isUnauthorizedError } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import { Alert } from '@/components/ui/alert';
import { Spinner } from '@/components/ui/spinner';
import { getConsultationStatusLabel } from '@/lib/consultation-status';
import { filterPatients } from '@/lib/patient-search';
import { cn } from '@/lib/utils';

type LogItem = {
  id: string;
  status: string;
  createdAt: string;
  label: string;
  kind: 'new' | 'repeater';
  visitNumber: number;
  hasDocuments: boolean;
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

const EMPTY_FORM: PatientForm = {
  name: '',
  nameKana: '',
  sex: '',
  dateOfBirth: '',
  phone: '',
  memo: '',
};

function formatWhen(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString('ja-JP', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function sexLabel(sex: string | null | undefined) {
  if (sex === 'M') return '男';
  if (sex === 'F') return '女';
  return '—';
}

export default function HomePage() {
  const router = useRouter();
  const [patientId, setPatientId] = useState('');
  /** 患者を選ばずに始める（一時診療）。選んだつもりで違う人の診察を始めないよう、明示的に選ばせる */
  const [anonymous, setAnonymous] = useState(false);
  const [patients, setPatients] = useState<PatientOption[]>([]);
  const [logs, setLogs] = useState<LogItem[]>([]);
  const [query, setQuery] = useState('');
  const [cursor, setCursor] = useState(0);
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
  const searchRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const load = useCallback(async () => {
    const [consultations, patientRes] = await Promise.all([api.consultations(), api.patients()]);
    setLogs(
      consultations.slice(0, 30).map((c) => ({
        id: c.id,
        status: c.status,
        createdAt: c.startedAt ?? c.createdAt,
        label: c.patient?.name ?? c.anonymousCase?.displayName ?? '診療',
        kind: c.kind ?? (c.patient ? 'repeater' : 'new'),
        visitNumber: c.visitNumber ?? 1,
        hasDocuments: Boolean(c.hasDocuments),
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
  const results = useMemo(() => filterPatients(patients, query), [patients, query]);
  const canStart = Boolean(patient || anonymous);

  // 絞り込みが変わったら、先頭の候補に合わせる
  useEffect(() => {
    setCursor(0);
  }, [query]);

  // 「/」で検索欄へ。診察室で手が空いていないときも、キーボードだけで患者を呼べる
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      const typing =
        target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);
      if (e.key === '/' && !typing) {
        e.preventDefault();
        searchRef.current?.focus();
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  // 矢印で動かしたとき、選択中の行を見える位置へ
  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>(`[data-index="${cursor}"]`);
    el?.scrollIntoView({ block: 'nearest' });
  }, [cursor]);

  function choosePatient(id: string) {
    setPatientId(id);
    setAnonymous(false);
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
      choosePatient(created.id);
      setQuery('');
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

  function handleStart(e: FormEvent) {
    e.preventDefault();
    void startConsultation();
  }

  // ⌘/Ctrl + Enter で診療を開始
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && !addOpen) {
        e.preventDefault();
        void startConsultation();
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [consentGiven, canStart, starting, patient, visitType, questionnaireFile, addOpen]);

  function onSearchKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.nativeEvent.isComposing) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setCursor((c) => Math.min(results.length - 1, c + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setCursor((c) => Math.max(0, c - 1));
    } else if (e.key === 'Enter' && !(e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      const hit = results[cursor];
      if (hit) choosePatient(hit.id);
    } else if (e.key === 'Escape') {
      setQuery('');
      searchRef.current?.blur();
    }
  }

  // この患者の直近の診療（名前が一致するものを新しい順に）。患者を選んでいなければ全体の直近
  const visibleLogs = useMemo(() => {
    const rows = patient ? logs.filter((l) => l.label === patient.name) : logs;
    return rows.slice(0, 8);
  }, [logs, patient]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold tracking-[0.28em] text-clinic-ink-muted">
            TODAY&apos;S VISIT
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-clinic-ink">診療を始める</h1>
        </div>
        <Link
          href="/history"
          className="text-xs font-medium text-brand-600 hover:underline"
        >
          すべての履歴
        </Link>
      </div>

      <div className="grid gap-5 min-[1024px]:grid-cols-[minmax(20rem,26rem)_minmax(0,1fr)] min-[1024px]:items-start">
        {/* 左：患者を探す */}
        <section className="flex flex-col overflow-hidden rounded-3xl border border-clinic-line bg-white shadow-card min-[1024px]:sticky min-[1024px]:top-6 min-[1024px]:max-h-[calc(100dvh-7.5rem)]">
          <div className="space-y-3 border-b border-clinic-line p-4">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-[15px] font-semibold text-clinic-ink">
                患者
                <span className="ml-2 text-xs font-normal text-clinic-ink-muted">
                  {loading ? '' : `${patients.length}人`}
                </span>
              </h2>
              <Button
                size="sm"
                className="rounded-full bg-clinic-ink hover:bg-clinic-ink-soft"
                icon={<Plus />}
                onClick={() => {
                  setForm({ ...EMPTY_FORM, name: query.trim() });
                  setFormError('');
                  setAddOpen(true);
                }}
              >
                新規患者
              </Button>
            </div>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-clinic-ink-muted" />
              <input
                ref={searchRef}
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={onSearchKeyDown}
                placeholder="名前・フリガナ・カルテ番号・電話で検索"
                aria-label="患者を検索"
                className="h-11 w-full rounded-2xl border border-clinic-line bg-clinic-tint pl-10 pr-10 text-[14px] text-clinic-ink outline-none transition focus:border-clinic-ink/40 focus:bg-white focus:ring-2 focus:ring-clinic-ink/10"
              />
              {query ? (
                <button
                  type="button"
                  onClick={() => {
                    setQuery('');
                    searchRef.current?.focus();
                  }}
                  className="absolute right-2.5 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full text-clinic-ink-muted hover:bg-clinic-line"
                  aria-label="検索をクリア"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              ) : (
                <kbd className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 rounded-md border border-clinic-line bg-white px-1.5 py-0.5 font-sans text-[10px] text-clinic-ink-muted min-[640px]:block">
                  /
                </kbd>
              )}
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto">
            {loading ? (
              <p className="flex items-center gap-2 px-4 py-6 text-sm text-clinic-ink-muted">
                <Spinner className="h-4 w-4" />
                読み込み中…
              </p>
            ) : patients.length === 0 ? (
              <div className="px-4 py-10 text-center">
                <p className="text-sm text-clinic-ink-muted">まだ患者が登録されていません</p>
                <p className="mt-1 text-xs text-clinic-ink-muted">
                  「新規患者」から登録すると、ここから検索して選べます。
                </p>
              </div>
            ) : results.length === 0 ? (
              <div className="px-4 py-10 text-center">
                <p className="text-sm text-clinic-ink">「{query}」に当てはまる患者がいません</p>
                <button
                  type="button"
                  onClick={() => {
                    setForm({ ...EMPTY_FORM, name: query.trim() });
                    setFormError('');
                    setAddOpen(true);
                  }}
                  className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-clinic-ink px-3.5 py-1.5 text-xs font-semibold text-clinic-cream hover:bg-clinic-ink-soft"
                >
                  <UserPlus className="h-3.5 w-3.5" />
                  この名前で新規登録
                </button>
              </div>
            ) : (
              <ul ref={listRef} className="p-2" role="listbox" aria-label="患者の一覧">
                {!query && (
                  <li className="px-3 pb-1 pt-2 text-[10px] font-semibold tracking-[0.2em] text-clinic-ink-muted">
                    最近の診療順
                  </li>
                )}
                {results.map((p, i) => {
                  const selected = p.id === patientId && !anonymous;
                  return (
                    <li key={p.id} data-index={i} role="option" aria-selected={selected}>
                      <button
                        type="button"
                        onClick={() => choosePatient(p.id)}
                        className={cn(
                          'flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition',
                          selected
                            ? 'bg-clinic-ink text-clinic-cream'
                            : i === cursor && query
                              ? 'bg-clinic-tint ring-1 ring-clinic-ink/20'
                              : 'hover:bg-clinic-tint',
                        )}
                      >
                        <span
                          className={cn(
                            'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-semibold',
                            selected ? 'bg-white/15 text-clinic-gold' : 'bg-clinic-ink text-clinic-gold',
                          )}
                        >
                          {p.name.slice(0, 1)}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[14px] font-semibold">{p.name}</span>
                          <span
                            className={cn(
                              'block truncate text-[11px]',
                              selected ? 'text-clinic-cream/75' : 'text-clinic-ink-muted',
                            )}
                          >
                            {p.nameKana ? `${p.nameKana} · ` : ''}
                            {p.code}
                            {p.age != null ? ` · ${p.age}歳` : ''} · {sexLabel(p.sex)}
                          </span>
                        </span>
                        {selected ? null : (
                          <ChevronRight className="h-4 w-4 shrink-0 text-clinic-line" />
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <button
            type="button"
            onClick={() => {
              setAnonymous(true);
              setPatientId('');
            }}
            className={cn(
              'border-t border-clinic-line px-4 py-3 text-left text-[12px] transition-colors',
              anonymous
                ? 'bg-clinic-tint font-semibold text-clinic-ink'
                : 'text-clinic-ink-muted hover:bg-clinic-tint hover:text-clinic-ink',
            )}
          >
            患者を選ばずに始める（一時診療）
          </button>
        </section>

        {/* 右：診療を始める */}
        <form
          onSubmit={handleStart}
          className="space-y-5 rounded-3xl border border-clinic-line bg-white p-5 shadow-card min-[480px]:p-6"
        >
          {patient ? (
            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-clinic-ink text-lg font-semibold text-clinic-gold">
                {patient.name.slice(0, 1)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xl font-semibold tracking-tight text-clinic-ink">{patient.name}</p>
                <p className="mt-0.5 text-sm text-clinic-ink-muted">
                  {patient.nameKana ? `${patient.nameKana} · ` : ''}
                  カルテ番号 {patient.code}
                  {patient.age != null ? ` · ${patient.age}歳` : ''} · {sexLabel(patient.sex)}
                  {patient.visitCount != null ? ` · 通院${patient.visitCount}回` : ''}
                </p>
                <p className="mt-1.5 text-xs leading-relaxed text-clinic-ink-muted">
                  {[patient.phone, patient.memo].filter(Boolean).join(' / ') ||
                    '基本情報は問診票で補えます。'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPatientId('')}
                className="rounded-lg p-1.5 text-clinic-ink-muted hover:bg-clinic-tint"
                aria-label="患者の選択を外す"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : anonymous ? (
            <div className="rounded-2xl bg-clinic-tint px-4 py-3.5 text-sm text-clinic-ink">
              <p className="font-semibold">一時診療として始めます</p>
              <p className="mt-0.5 text-xs text-clinic-ink-muted">
                患者に紐づかないので、書類の宛名や経過は引き継がれません。
              </p>
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-clinic-line px-4 py-6 text-center">
              <p className="text-sm font-semibold text-clinic-ink">まず、左で患者を選びます</p>
              <p className="mt-1 text-xs text-clinic-ink-muted">
                <kbd className="rounded border border-clinic-line bg-white px-1.5 py-0.5 font-sans">/</kbd>{' '}
                で検索、↑↓ で動かして Enter で選べます。
              </p>
            </div>
          )}

          <div className="space-y-2">
            <p className="text-xs font-semibold tracking-wide text-clinic-ink-muted">診療タイプ</p>
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
                    'rounded-xl border px-3 py-2.5 text-left text-sm transition',
                    visitType === value
                      ? 'border-clinic-ink bg-clinic-ink text-clinic-cream'
                      : 'border-clinic-line bg-white text-slate-700 hover:border-clinic-ink/40',
                  )}
                >
                  <span className="block font-semibold">{title}</span>
                  <span className="mt-0.5 block text-[11px] opacity-80">{sub}</span>
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
            className="group flex w-full items-center gap-3.5 rounded-2xl border border-dashed border-[#b7cfc8] bg-clinic-tint px-4 py-3 text-left transition hover:border-brand-600 hover:bg-white"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-clinic-line">
              {questionnairePreview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={questionnairePreview} alt="問診票" className="h-full w-full object-cover" />
              ) : (
                <Camera className="h-4.5 w-4.5 text-brand-600" />
              )}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold text-clinic-ink">
                {questionnaireFile ? '問診票を取り込み済み' : '問診票を撮影して取り込む（任意）'}
              </span>
              <span className="mt-0.5 block text-xs text-clinic-ink-muted">
                基本情報とSOAPへ反映します
              </span>
            </span>
          </button>

          <label className="flex w-full cursor-pointer items-start gap-3 rounded-2xl border border-clinic-line bg-white px-4 py-3 text-sm leading-relaxed text-slate-700">
            <input
              type="checkbox"
              className="mt-0.5 h-4 w-4 rounded border-slate-300 accent-[#0c2f2c]"
              checked={consentGiven}
              onChange={(e) => setConsentGiven(e.target.checked)}
            />
            <span>患者の同意を得た上で診療音声を記録します。音声はSOAP生成後に削除されます。</span>
          </label>

          {error && <Alert variant="error">{error}</Alert>}

          <Button
            type="submit"
            size="lg"
            className="h-14 w-full rounded-2xl bg-clinic-ink text-base hover:bg-clinic-ink-soft"
            icon={starting ? <Spinner className="text-white" /> : <Mic />}
            disabled={starting || !consentGiven || !canStart}
          >
            {starting
              ? '開始中…'
              : patient
                ? `${patient.name}さんの診療を開始`
                : anonymous
                  ? '一時診療を開始'
                  : '患者を選んでください'}
            {canStart && !starting && (
              <kbd className="ml-2 hidden rounded-md bg-white/15 px-1.5 py-0.5 font-sans text-[10px] font-medium min-[640px]:inline">
                {modKey} ↵
              </kbd>
            )}
          </Button>

          {/* 直近の診療 */}
          <div className="border-t border-clinic-line pt-4">
            <div className="mb-2 flex items-baseline justify-between gap-2">
              <h2 className="text-[14px] font-semibold text-clinic-ink">
                {patient ? `${patient.name}さんの直近の診療` : '直近の診療'}
              </h2>
              <span className="text-[11px] text-clinic-ink-muted">タップで続きを開く</span>
            </div>
            {visibleLogs.length === 0 ? (
              <p className="rounded-xl border border-dashed border-clinic-line px-4 py-6 text-center text-sm text-clinic-ink-muted">
                {patient ? 'まだ診療の記録がありません' : 'まだ診療ログがありません'}
              </p>
            ) : (
              <ul className="divide-y divide-clinic-line overflow-hidden rounded-2xl border border-clinic-line">
                {visibleLogs.map((item) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => router.push(`/consultation/${item.id}`)}
                      className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition hover:bg-clinic-tint"
                    >
                      <span
                        className={cn(
                          'flex h-8 min-w-8 items-center justify-center rounded-lg text-xs font-bold',
                          item.kind === 'new'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-clinic-tint text-clinic-ink',
                        )}
                      >
                        {item.visitNumber}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-clinic-ink">
                          {item.label}
                        </span>
                        <span className="block text-xs text-clinic-ink-muted">
                          {formatWhen(item.createdAt)} · {getConsultationStatusLabel(item.status)}
                          {item.hasDocuments ? ' · 書類あり' : ''}
                        </span>
                      </span>
                      <ChevronRight className="h-4 w-4 text-clinic-line" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </form>
      </div>

      {addOpen && (
        <div className="fixed inset-0 z-[70] flex items-end justify-center bg-[#0c2f2c]/45 p-3 backdrop-blur-sm min-[640px]:items-center">
          <form
            onSubmit={savePatient}
            className="w-full max-w-lg rounded-3xl border border-clinic-line bg-clinic-paper p-5 shadow-[0_30px_80px_-28px_rgba(12,47,44,0.55)] min-[480px]:p-7"
          >
            <div className="mb-5 flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold tracking-[0.2em] text-clinic-ink-muted">PATIENT</p>
                <h2 className="mt-1 text-xl font-semibold tracking-tight text-clinic-ink">患者を追加</h2>
                <p className="mt-1 text-sm text-slate-500">
                  登録すると、カルテ番号が付いて、次から検索で出せます。
                </p>
              </div>
              <button
                type="button"
                className="rounded-full p-2 text-slate-500 hover:bg-slate-100"
                onClick={() => setAddOpen(false)}
                aria-label="閉じる"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="grid gap-3 min-[520px]:grid-cols-2">
              <label className="space-y-1">
                <span className="text-xs font-medium text-slate-600">氏名</span>
                <Input
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="山田 太郎"
                  autoFocus
                />
              </label>
              <label className="space-y-1">
                <span className="text-xs font-medium text-slate-600">フリガナ</span>
                <Input
                  value={form.nameKana}
                  onChange={(e) => setForm((f) => ({ ...f, nameKana: e.target.value }))}
                  placeholder="ヤマダ タロウ"
                />
              </label>
              <label className="space-y-1">
                <span className="text-xs font-medium text-slate-600">性別</span>
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
                <span className="text-xs font-medium text-slate-600">生年月日</span>
                <Input
                  type="date"
                  value={form.dateOfBirth}
                  onChange={(e) => setForm((f) => ({ ...f, dateOfBirth: e.target.value }))}
                />
              </label>
              <label className="space-y-1 min-[520px]:col-span-2">
                <span className="text-xs font-medium text-slate-600">電話</span>
                <Input
                  value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                />
              </label>
              <label className="space-y-1 min-[520px]:col-span-2">
                <span className="text-xs font-medium text-slate-600">メモ</span>
                <Textarea
                  rows={2}
                  value={form.memo}
                  onChange={(e) => setForm((f) => ({ ...f, memo: e.target.value }))}
                />
              </label>
            </div>
            {formError && <p className="mt-3 text-sm text-red-600">{formError}</p>}
            <div className="mt-5 flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => setAddOpen(false)}>
                キャンセル
              </Button>
              <Button
                type="submit"
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
