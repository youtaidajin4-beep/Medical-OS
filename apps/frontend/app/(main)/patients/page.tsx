'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronDown, Mic, Plus, Save, UserPlus, X } from 'lucide-react';
import { api, getToken, isUnauthorizedError } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import { Alert } from '@/components/ui/alert';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';
import { PatientHistoryPanel } from '@/components/patients/patient-history-panel';
import { PatientSearch } from '@/components/aura/patient-search';
import { PatientAvatar, sexLabel as sexJa } from '@/components/aura/patient-card';
import { PatientJourney } from '@/components/aura/patient-journey';

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
  /** 紹介状・主治医意見書の患者欄に印刷する項目（問診票からも入る） */
  nameKana?: string | null;
  postalCode?: string | null;
  address?: string | null;
  occupation?: string | null;
  visitCount?: number;
};

type FormState = {
  name: string;
  nameKana: string;
  sex: string;
  dateOfBirth: string;
  postalCode: string;
  address: string;
  phone: string;
  occupation: string;
  memo: string;
};

const emptyForm: FormState = {
  name: '',
  nameKana: '',
  sex: '',
  dateOfBirth: '',
  postalCode: '',
  address: '',
  phone: '',
  occupation: '',
  memo: '',
};

/** 紹介状・主治医意見書の患者欄に必要な項目 */
const DOCUMENT_FIELDS: Array<{ key: keyof FormState; label: string }> = [
  { key: 'name', label: '氏名' },
  { key: 'nameKana', label: 'ふりがな' },
  { key: 'sex', label: '性別' },
  { key: 'dateOfBirth', label: '生年月日' },
  { key: 'address', label: '住所' },
  { key: 'phone', label: '電話番号' },
];

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
  const missingCount = DOCUMENT_FIELDS.filter(({ key }) => form[key].trim() === '').length;
  const [saving, setSaving] = useState(false);
  const [startingId, setStartingId] = useState<string | null>(null);
  const [visitType, setVisitType] = useState<'ROUTINE' | 'CHECKUP'>('ROUTINE');
  const [editOpen, setEditOpen] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);

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

  function startCreate(name = '') {
    setPanelOpen(true);
    setEditOpen(true);
    setMode('create');
    setSelectedId(null);
    setForm({ ...emptyForm, name });
    setSuccess('');
    setError('');
  }

  function selectPatient(p: PatientRow) {
    if (p.type !== 'patient') return;
    setPanelOpen(true);
    setEditOpen(false);
    setMode('edit');
    setSelectedId(p.id);
    setForm({
      name: p.name,
      nameKana: p.nameKana ?? '',
      sex: p.sex === 'M' || p.sex === 'F' ? p.sex : '',
      dateOfBirth: p.dateOfBirth ?? '',
      postalCode: p.postalCode ?? '',
      address: p.address ?? '',
      phone: p.phone ?? '',
      occupation: p.occupation ?? '',
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
        nameKana: form.nameKana.trim(),
        sex: form.sex === 'M' || form.sex === 'F' ? form.sex : undefined,
        dateOfBirth: form.dateOfBirth || undefined,
        postalCode: form.postalCode.trim(),
        address: form.address.trim(),
        phone: form.phone.trim(),
        occupation: form.occupation.trim(),
        memo: form.memo.trim(),
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
      const consultation = await api.createConsultation({ patientId, visitType });
      router.push(`/consultation/${consultation.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : '診療を開始できませんでした');
      setStartingId(null);
    }
  }

  const selected = patients.find((p) => p.id === selectedId) ?? null;

  return (
    <div className="mx-auto w-full max-w-2xl py-4">
      <p className="text-center text-[12px] font-semibold tracking-[0.3em] text-aura-teal-500">PATIENTS</p>
      <h1 className="mt-2 text-center text-[32px] font-semibold tracking-tight text-aura-ink">患者をさがす</h1>
      <p className="mb-8 mt-2 text-center text-[14px] text-aura-ink-soft">診療を始める患者さんを選びます。</p>

      {error && !panelOpen && <Alert variant="error" className="mb-4">{error}</Alert>}

      <PatientSearch
        patients={patients.map((p) => ({ ...p, lastVisit: null }))}
        loading={loading}
        selectedId={selectedId ?? undefined}
        onSelect={(p) => {
          const row = patients.find((x) => x.id === p.id);
          if (row) selectPatient(row);
        }}
        onAddNew={(q) => startCreate(q)}
        maxHeightClass="max-h-[28rem]"
      />

      {anonymous.length > 0 && (
        <p className="mt-6 text-center text-[12px] text-aura-ink-muted">
          患者を選ばずに記録した診療が{anonymous.length}件あります（「SOAP」から開けます）
        </p>
      )}

      {/* 右からすべり出る詳細。患者管理ではなく、SOAPを作るための最小限だけ */}
      {panelOpen && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-aura-ink/25 backdrop-blur-[2px]" onClick={() => setPanelOpen(false)} />
          <aside className="absolute right-0 top-0 flex h-full w-full max-w-md animate-fade-in flex-col overflow-y-auto bg-aura-paper p-6 shadow-float-lg min-[640px]:rounded-l-[2rem]">
            <button
              type="button"
              onClick={() => setPanelOpen(false)}
              aria-label="閉じる"
              className="absolute right-4 top-4 rounded-full p-2 text-aura-ink-muted transition hover:bg-aura-mist hover:text-aura-ink"
            >
              <X className="h-5 w-5" />
            </button>

            {mode === 'edit' && selected ? (
              <>
                <div className="mt-2 flex items-center gap-4">
                  <PatientAvatar name={selected.name} size="lg" />
                  <div className="min-w-0">
                    <p className="truncate text-[22px] font-semibold tracking-tight text-aura-ink">{selected.name}</p>
                    <p className="text-[13px] text-aura-ink-muted">
                      {[selected.age != null ? `${selected.age}歳` : '', sexJa(selected.sex), `ID ${selected.code}`]
                        .filter(Boolean)
                        .join(' / ')}
                    </p>
                  </div>
                </div>

                <PatientJourney
                  className="mt-7"
                  states={[
                    missingCount === 0 ? 'done' : 'todo',
                    'current',
                    (selected.visitCount ?? 0) > 0 ? 'done' : 'todo',
                    'todo',
                  ]}
                />

                <div className="mt-7 space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    {(
                      [
                        ['ROUTINE', '通常診察'],
                        ['CHECKUP', '健診'],
                      ] as const
                    ).map(([value, label]) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setVisitType(value)}
                        className={cn(
                          'rounded-2xl border px-4 py-2.5 text-[13px] font-semibold transition',
                          visitType === value
                            ? 'border-aura-mint-300 bg-aura-mint-50 text-aura-ink shadow-float'
                            : 'border-aura-line bg-white text-aura-ink-soft hover:-translate-y-px',
                        )}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                  <button
                    type="button"
                    disabled={startingId === selected.id}
                    onClick={() => void startConsultation(selected.id)}
                    className="flex h-14 w-full items-center justify-center gap-2.5 rounded-full bg-gradient-to-b from-aura-mint-400 to-aura-teal-500 text-[16px] font-semibold text-white shadow-glow transition duration-300 hover:-translate-y-0.5 hover:brightness-105 active:translate-y-0 disabled:opacity-60"
                  >
                    {startingId === selected.id ? <Spinner className="text-white" /> : <Mic className="h-5 w-5" />}
                    {startingId === selected.id ? '開始しています…' : 'この患者でSOAPをつくる'}
                  </button>
                  {missingCount > 0 && (
                    <p className="text-center text-[12px] text-amber-700">
                      書類に入る情報があと{missingCount}件、未入力です
                    </p>
                  )}
                  {error && <Alert variant="error">{error}</Alert>}
                </div>

                <section className="mt-8">
                  <p className="mb-3 text-[11px] font-semibold tracking-[0.2em] text-aura-ink-muted">これまでの診療・SOAP</p>
                  <PatientHistoryPanel patientId={selected.id} />
                </section>
              </>
            ) : (
              <div className="mt-2">
                <p className="text-[12px] font-semibold tracking-[0.2em] text-aura-teal-500">NEW PATIENT</p>
                <h2 className="mt-1 text-[22px] font-semibold tracking-tight text-aura-ink">患者を登録</h2>
              </div>
            )}

            {/* 基本情報。書類（紹介状・意見書）の患者欄の出どころなので、必要なときだけ開く */}
            <section className="mt-8 border-t border-aura-line pt-4">
              <button
                type="button"
                onClick={() => setEditOpen((v) => !v)}
                aria-expanded={editOpen}
                className="flex w-full items-center justify-between rounded-2xl px-1 py-2 text-left text-[14px] font-semibold text-aura-ink-soft transition hover:text-aura-ink"
              >
                {mode === 'edit' ? '基本情報を編集' : '基本情報'}
                <ChevronDown className={cn('h-4 w-4 transition-transform', editOpen && 'rotate-180')} />
              </button>
              {success && <Alert variant="success" className="mt-2">{success}</Alert>}
              {editOpen && (
                <div className="mt-3 space-y-4">
                  {error && panelOpen && mode === 'create' && <Alert variant="error">{error}</Alert>}
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

            <div className="space-y-1.5">
              <label htmlFor="nameKana" className="text-sm font-medium text-slate-700">
                ふりがな
              </label>
              <Input
                id="nameKana"
                value={form.nameKana}
                onChange={(e) => setForm((f) => ({ ...f, nameKana: e.target.value }))}
                placeholder="例: ヤマダ タロウ"
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

            <div className="grid gap-3 sm:grid-cols-[10rem_1fr]">
              <div className="space-y-1.5">
                <label htmlFor="postalCode" className="text-sm font-medium text-slate-700">
                  郵便番号
                </label>
                <Input
                  id="postalCode"
                  value={form.postalCode}
                  onChange={(e) => setForm((f) => ({ ...f, postalCode: e.target.value }))}
                  placeholder="例: 856-0832"
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="address" className="text-sm font-medium text-slate-700">
                  住所
                </label>
                <Input
                  id="address"
                  value={form.address}
                  onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                  placeholder="例: 長崎県大村市本町 436-16"
                />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
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
                <label htmlFor="occupation" className="text-sm font-medium text-slate-700">
                  職業
                </label>
                <Input
                  id="occupation"
                  value={form.occupation}
                  onChange={(e) => setForm((f) => ({ ...f, occupation: e.target.value }))}
                  placeholder="例: 無職（元会社員）"
                />
              </div>
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
            </div>
          </form>
                </div>
              )}
            </section>
          </aside>
        </div>
      )}
    </div>
  );
}
