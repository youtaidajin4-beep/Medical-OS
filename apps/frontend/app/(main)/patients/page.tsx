'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Mic, Plus, Save, UserPlus } from 'lucide-react';
import { api, getToken, isUnauthorizedError } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import { Alert } from '@/components/ui/alert';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';

type PatientRow = {
  id: string;
  type: 'patient' | 'anonymous';
  code: string;
  name: string;
  age: number | null;
  sex: string | null;
  dateOfBirth?: string | null;
  phone?: string | null;
  memo?: string | null;
  visitCount?: number;
};

type FormState = {
  name: string;
  sex: string;
  dateOfBirth: string;
  phone: string;
  memo: string;
};

const emptyForm: FormState = {
  name: '',
  sex: '',
  dateOfBirth: '',
  phone: '',
  memo: '',
};

function sexLabel(sex: string | null | undefined) {
  if (sex === 'M') return '男';
  if (sex === 'F') return '女';
  return '—';
}

export default function PatientsPage() {
  const router = useRouter();
  const [patients, setPatients] = useState<PatientRow[]>([]);
  const [anonymous, setAnonymous] = useState<PatientRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [mode, setMode] = useState<'create' | 'edit'>('create');
  const [saving, setSaving] = useState(false);
  const [startingId, setStartingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await api.patients();
    setPatients(res.patients);
    setAnonymous(res.anonymousCases);
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

  function startCreate() {
    setMode('create');
    setSelectedId(null);
    setForm(emptyForm);
    setSuccess('');
    setError('');
  }

  function selectPatient(p: PatientRow) {
    if (p.type !== 'patient') return;
    setMode('edit');
    setSelectedId(p.id);
    setForm({
      name: p.name,
      sex: p.sex === 'M' || p.sex === 'F' ? p.sex : '',
      dateOfBirth: p.dateOfBirth ?? '',
      phone: p.phone ?? '',
      memo: p.memo ?? '',
    });
    setSuccess('');
    setError('');
  }

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) {
      setError('氏名を入力してください');
      return;
    }
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const payload = {
        name: form.name.trim(),
        sex: form.sex === 'M' || form.sex === 'F' ? form.sex : undefined,
        dateOfBirth: form.dateOfBirth || undefined,
        phone: form.phone.trim() || undefined,
        memo: form.memo.trim() || undefined,
      };
      if (mode === 'edit' && selectedId) {
        await api.updatePatient(selectedId, payload);
        setSuccess('患者情報を更新しました');
      } else {
        const created = await api.createPatient(payload);
        setSuccess('患者を登録しました');
        setMode('edit');
        setSelectedId(created.id);
      }
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存に失敗しました');
    } finally {
      setSaving(false);
    }
  }

  async function startConsultation(patientId: string) {
    setStartingId(patientId);
    setError('');
    try {
      const consultation = await api.createConsultation({ patientId });
      router.push(`/consultation/${consultation.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : '診療を開始できませんでした');
      setStartingId(null);
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">患者</h1>
          <p className="mt-1 text-sm text-slate-500">
            基本情報を登録・編集し、この患者で診療を開始できます。
          </p>
        </div>
        <Button type="button" variant="secondary" icon={<Plus />} onClick={startCreate}>
          新規登録
        </Button>
      </div>

      {error && <Alert variant="error">{error}</Alert>}
      {success && <Alert variant="success">{success}</Alert>}

      <div className="grid gap-6 lg:grid-cols-5">
        <section className="space-y-3 lg:col-span-2">
          <h2 className="text-sm font-semibold text-slate-800">患者一覧</h2>
          {loading ? (
            <p className="flex items-center gap-2 text-sm text-slate-400">
              <Spinner className="h-4 w-4" />
              読み込み中…
            </p>
          ) : patients.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 bg-white px-4 py-8 text-center text-sm text-slate-400">
              まだ登録がありません
            </div>
          ) : (
            <ul className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 bg-white">
              {patients.map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() => selectPatient(p)}
                    className={cn(
                      'flex w-full items-start gap-3 px-3 py-3 text-left transition hover:bg-slate-50',
                      selectedId === p.id && 'bg-brand-50',
                    )}
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-slate-900">
                        {p.name}
                      </span>
                      <span className="mt-0.5 block text-xs text-slate-500">
                        {p.code} · {sexLabel(p.sex)}
                        {p.age != null ? ` · ${p.age}歳` : ''}
                        {typeof p.visitCount === 'number' ? ` · ${p.visitCount}回` : ''}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}

          {anonymous.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                一時診療（未登録）
              </h3>
              <ul className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                {anonymous.map((a) => (
                  <li key={a.id} className="px-3 py-2.5 text-sm text-slate-600">
                    <span className="font-medium text-slate-800">{a.name}</span>
                    <span className="mt-0.5 block text-xs text-slate-400">
                      {a.code}
                      {typeof a.visitCount === 'number' ? ` · ${a.visitCount}回` : ''}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-3">
          <div className="mb-4 flex items-center gap-2">
            <UserPlus className="h-4 w-4 text-brand-600" />
            <h2 className="text-sm font-semibold text-slate-800">
              {mode === 'edit' ? '基本情報を編集' : '基本情報を登録'}
            </h2>
          </div>

          <form onSubmit={handleSave} className="space-y-3">
            <div className="space-y-1.5">
              <label htmlFor="name" className="text-sm font-medium text-slate-700">
                氏名 <span className="text-red-500">*</span>
              </label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="例: 山田 太郎"
                required
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label htmlFor="sex" className="text-sm font-medium text-slate-700">
                  性別
                </label>
                <Select
                  id="sex"
                  className="block w-full"
                  value={form.sex}
                  onChange={(e) => setForm((f) => ({ ...f, sex: e.target.value }))}
                >
                  <option value="">未設定</option>
                  <option value="M">男</option>
                  <option value="F">女</option>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label htmlFor="dateOfBirth" className="text-sm font-medium text-slate-700">
                  生年月日
                </label>
                <Input
                  id="dateOfBirth"
                  type="date"
                  value={form.dateOfBirth}
                  onChange={(e) => setForm((f) => ({ ...f, dateOfBirth: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="phone" className="text-sm font-medium text-slate-700">
                電話番号
              </label>
              <Input
                id="phone"
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                placeholder="例: 090-1234-5678"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="memo" className="text-sm font-medium text-slate-700">
                メモ
              </label>
              <Textarea
                id="memo"
                rows={3}
                value={form.memo}
                onChange={(e) => setForm((f) => ({ ...f, memo: e.target.value }))}
                placeholder="アレルギー、注意事項など"
              />
            </div>

            <div className="flex flex-wrap gap-2 pt-2">
              <Button
                type="submit"
                icon={saving ? <Spinner className="text-white" /> : <Save />}
                disabled={saving}
              >
                {saving ? '保存中…' : mode === 'edit' ? '更新する' : '登録する'}
              </Button>
              {mode === 'edit' && selectedId && (
                <Button
                  type="button"
                  variant="secondary"
                  icon={
                    startingId === selectedId ? (
                      <Spinner />
                    ) : (
                      <Mic className="h-4 w-4" />
                    )
                  }
                  disabled={startingId === selectedId}
                  onClick={() => void startConsultation(selectedId)}
                >
                  {startingId === selectedId ? '開始中…' : 'この患者で診療開始'}
                </Button>
              )}
            </div>
          </form>
        </section>
      </div>
    </div>
  );
}
