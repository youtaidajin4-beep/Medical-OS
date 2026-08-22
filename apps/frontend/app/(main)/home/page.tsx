'use client';

import { FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Camera, Mic, Plus, UserPlus, X } from 'lucide-react';
import { api, getToken, isUnauthorizedError } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import { Alert } from '@/components/ui/alert';
import { Spinner } from '@/components/ui/spinner';
import { getConsultationStatusLabel } from '@/lib/consultation-status';
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
  code: string;
  age: number | null;
  sex: string | null;
  phone?: string | null;
  memo?: string | null;
};

type PatientForm = {
  name: string;
  sex: string;
  dateOfBirth: string;
  phone: string;
  memo: string;
};

const EMPTY_FORM: PatientForm = {
  name: '',
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
  const photoInputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    const [consultations, patientRes] = await Promise.all([api.consultations(), api.patients()]);
    setLogs(
      consultations.slice(0, 20).map((c) => ({
        id: c.id,
        status: c.status,
        createdAt: c.startedAt ?? c.createdAt,
        label: c.patient?.name ?? c.anonymousCase?.displayName ?? '診療',
        kind: c.kind ?? (c.patient ? 'repeater' : 'new'),
        visitNumber: c.visitNumber ?? 1,
        hasDocuments: Boolean(c.hasDocuments),
      })),
    );
    const rows = patientRes.patients.map((p) => ({
      id: p.id,
      name: p.name,
      code: p.code,
      age: p.age,
      sex: p.sex,
      phone: p.phone,
      memo: p.memo,
    }));
    setPatients(rows);
    setPatientId((prev) => prev || rows[0]?.id || '');
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
        sex: form.sex === 'M' || form.sex === 'F' ? form.sex : undefined,
        dateOfBirth: form.dateOfBirth || undefined,
        phone: form.phone.trim() || undefined,
        memo: form.memo.trim() || undefined,
      });
      await load();
      setPatientId(created.id);
      setAddOpen(false);
      setForm(EMPTY_FORM);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : '追加できませんでした');
    } finally {
      setSaving(false);
    }
  }

  async function handleStart(e: FormEvent) {
    e.preventDefault();
    if (!consentGiven) return;
    setError('');
    setStarting(true);
    try {
      const consultation = patientId
        ? await api.createConsultation({ patientId })
        : await api.createConsultation({
            anonymousCaseId: (await api.createAnonymousCase({ displayName: '本日の診療' })).id,
          });
      if (questionnaireFile) {
        await api.uploadAttachment(consultation.id, questionnaireFile, 'questionnaire');
      }
      router.push(`/consultation/${consultation.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : '診療を開始できませんでした');
      setStarting(false);
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <section className="grid gap-5 min-[900px]:grid-cols-[minmax(0,1.15fr)_minmax(18rem,0.85fr)] min-[900px]:items-start">
        <form
          onSubmit={handleStart}
          className="overflow-hidden rounded-[2rem] border border-[#d7e2dd] bg-[#fbfaf6] shadow-[0_30px_70px_-40px_rgba(12,47,44,0.55)]"
        >
          <div className="border-b border-[#e4ebe7] bg-[linear-gradient(135deg,#0c2f2c_0%,#1a5c55_55%,#0c2f2c_100%)] px-6 py-7 text-[#f3efe4] min-[480px]:px-8">
            <p className="text-[11px] font-semibold tracking-[0.28em] text-[#e8c98a]">TODAY&apos;S VISIT</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight min-[480px]:text-4xl">診療を始める</h1>
            <p className="mt-3 max-w-md text-sm leading-relaxed text-[#d5e6e1]">
              録音終了後に、文字起こし・SOAP・書類を作成します。
            </p>
          </div>

          <div className="space-y-5 px-5 py-6 min-[480px]:px-8">
            {patient ? (
              <div className="flex items-start gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#0c2f2c] text-lg font-semibold text-[#e8c98a]">
                  {patient.name.slice(0, 1)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xl font-semibold tracking-tight text-[#0c2f2c]">{patient.name}</p>
                  <p className="mt-0.5 text-sm text-slate-500">
                    {patient.code}
                    {patient.age != null ? ` · ${patient.age}歳` : ''}
                    {' · '}
                    {sexLabel(patient.sex)}
                  </p>
                  <p className="mt-2 text-xs leading-relaxed text-slate-500">
                    {[patient.phone, patient.memo].filter(Boolean).join(' / ') || '基本情報は問診票で補えます。'}
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-slate-500">患者を選ぶか、追加してから開始できます。未選択のまま始めると一時診療になります。</p>
            )}

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
              className="group flex w-full items-center gap-4 rounded-2xl border border-dashed border-[#b7cfc8] bg-[#f3f7f5] px-4 py-4 text-left transition hover:border-[#0f766e] hover:bg-white"
            >
              <span className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-[#d7e2dd]">
                {questionnairePreview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={questionnairePreview} alt="問診票" className="h-full w-full object-cover" />
                ) : (
                  <Camera className="h-5 w-5 text-[#0f766e]" />
                )}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-[#0c2f2c]">
                  {questionnaireFile ? '問診票を取り込み済み' : '問診票を撮影して取り込む'}
                </span>
                <span className="mt-0.5 block text-xs text-slate-500">
                  紙の問診票を撮ると、開始後に基本情報とSOAPへ反映します
                </span>
              </span>
            </button>

            <label className="flex w-full cursor-pointer items-start gap-3 rounded-2xl border border-[#d7e2dd] bg-white px-4 py-3.5 text-sm leading-relaxed text-slate-700">
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
              className="h-14 w-full rounded-2xl bg-[#0c2f2c] text-base hover:bg-[#134540]"
              icon={starting ? <Spinner className="text-white" /> : <Mic />}
              disabled={starting || !consentGiven}
            >
              {starting ? '開始中…' : '診療を開始'}
            </Button>
          </div>
        </form>

        <aside className="rounded-[2rem] border border-[#d7e2dd] bg-[#fbfaf6]/90 p-4 shadow-[0_20px_50px_-36px_rgba(12,47,44,0.5)] min-[480px]:p-5">
          <div className="mb-4 flex items-center justify-between gap-2">
            <div>
              <p className="text-[11px] font-semibold tracking-[0.22em] text-[#6f8f88]">PATIENTS</p>
              <h2 className="text-lg font-semibold text-[#0c2f2c]">患者一覧</h2>
            </div>
            <Button
              size="sm"
              className="rounded-full bg-[#0c2f2c] hover:bg-[#134540]"
              icon={<Plus />}
              onClick={() => {
                setForm(EMPTY_FORM);
                setFormError('');
                setAddOpen(true);
              }}
            >
              追加
            </Button>
          </div>
          {loading ? (
            <p className="flex items-center gap-2 text-sm text-slate-400">
              <Spinner className="h-4 w-4" />
              読み込み中…
            </p>
          ) : patients.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-[#d7e2dd] px-3 py-8 text-center text-sm text-slate-400">
              まだ患者がいません
            </p>
          ) : (
            <ul className="space-y-2">
              {patients.map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() => setPatientId(p.id)}
                    className={cn(
                      'w-full rounded-2xl border px-3.5 py-3 text-left transition',
                      p.id === patientId
                        ? 'border-[#0f766e] bg-[#eef8f5] shadow-sm'
                        : 'border-transparent bg-white hover:border-[#d7e2dd]',
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0c2f2c] text-sm font-semibold text-[#e8c98a]">
                        {p.name.slice(0, 1)}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-[#0c2f2c]">{p.name}</span>
                        <span className="block text-xs text-slate-500">
                          {p.age != null ? `${p.age}歳` : '年齢—'} · {sexLabel(p.sex)}
                        </span>
                      </span>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </aside>
      </section>

      <section className="space-y-3">
        <div className="flex items-end justify-between gap-2">
          <div>
            <h2 className="text-lg font-semibold text-[#0c2f2c]">診療ログ</h2>
            <p className="text-xs text-slate-500">直近の診療。タップで続きを開けます。</p>
          </div>
          <Link href="/history" className="text-xs font-medium text-[#0f766e] hover:underline">
            すべての履歴
          </Link>
        </div>
        {logs.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[#d7e2dd] bg-[#fbfaf6] px-4 py-8 text-center text-sm text-slate-400">
            まだ診療ログがありません
          </div>
        ) : (
          <ul className="divide-y divide-[#e4ebe7] overflow-hidden rounded-2xl border border-[#d7e2dd] bg-[#fbfaf6]">
            {logs.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => router.push(`/consultation/${item.id}`)}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-white"
                >
                  <span
                    className={cn(
                      'flex h-9 min-w-9 items-center justify-center rounded-lg text-xs font-bold',
                      item.kind === 'new' ? 'bg-amber-100 text-amber-800' : 'bg-[#eef8f5] text-[#0c2f2c]',
                    )}
                  >
                    {item.visitNumber}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-[#0c2f2c]">{item.label}</span>
                    <span className="mt-0.5 block text-xs text-slate-500">
                      {formatWhen(item.createdAt)} · {getConsultationStatusLabel(item.status)}
                      {item.hasDocuments ? ' · 書類あり' : ''}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {addOpen && (
        <div className="fixed inset-0 z-[70] flex items-end justify-center bg-[#0c2f2c]/45 p-3 backdrop-blur-sm min-[640px]:items-center">
          <form
            onSubmit={savePatient}
            className="w-full max-w-lg rounded-3xl border border-[#d7e2dd] bg-[#fbfaf6] p-5 shadow-[0_30px_80px_-28px_rgba(12,47,44,0.55)] min-[480px]:p-7"
          >
            <div className="mb-5 flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold tracking-[0.2em] text-[#6f8f88]">PATIENT</p>
                <h2 className="mt-1 text-xl font-semibold tracking-tight text-[#0c2f2c]">患者を追加</h2>
                <p className="mt-1 text-sm text-slate-500">基本情報を入れてから、問診票の写真で補完できます。</p>
              </div>
              <button type="button" className="rounded-full p-2 text-slate-500 hover:bg-slate-100" onClick={() => setAddOpen(false)}>
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="grid gap-3 min-[520px]:grid-cols-2">
              <label className="space-y-1 min-[520px]:col-span-2">
                <span className="text-xs font-medium text-slate-600">氏名</span>
                <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="山田 太郎" />
              </label>
              <label className="space-y-1">
                <span className="text-xs font-medium text-slate-600">性別</span>
                <Select className="w-full" value={form.sex} onChange={(e) => setForm((f) => ({ ...f, sex: e.target.value }))}>
                  <option value="">未選択</option>
                  <option value="M">男</option>
                  <option value="F">女</option>
                </Select>
              </label>
              <label className="space-y-1">
                <span className="text-xs font-medium text-slate-600">生年月日</span>
                <Input type="date" value={form.dateOfBirth} onChange={(e) => setForm((f) => ({ ...f, dateOfBirth: e.target.value }))} />
              </label>
              <label className="space-y-1 min-[520px]:col-span-2">
                <span className="text-xs font-medium text-slate-600">電話</span>
                <Input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
              </label>
              <label className="space-y-1 min-[520px]:col-span-2">
                <span className="text-xs font-medium text-slate-600">メモ</span>
                <Textarea rows={2} value={form.memo} onChange={(e) => setForm((f) => ({ ...f, memo: e.target.value }))} />
              </label>
            </div>
            {formError && <p className="mt-3 text-sm text-red-600">{formError}</p>}
            <div className="mt-5 flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => setAddOpen(false)}>
                キャンセル
              </Button>
              <Button type="submit" icon={saving ? <Spinner className="text-white" /> : <UserPlus />} disabled={saving}>
                追加する
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
