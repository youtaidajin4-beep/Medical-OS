'use client';

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronRight, Plus, Search, User, UserPlus, UserX, X } from 'lucide-react';
import { api, getToken, isUnauthorizedError } from '@/lib/api-client';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Alert } from '@/components/ui/alert';
import { ListItemSkeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { Spinner } from '@/components/ui/spinner';

type CaseItem = {
  id: string;
  type: 'patient' | 'anonymous';
  code: string;
  name: string;
  age: number | null;
  sex: string | null;
  memo?: string | null;
};

type ModalType = 'patient' | 'anonymous' | null;

function FormModal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            aria-label="閉じる"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export default function PatientsPage() {
  const router = useRouter();
  const [items, setItems] = useState<CaseItem[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [startingId, setStartingId] = useState<string | null>(null);
  const [modal, setModal] = useState<ModalType>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const [patientForm, setPatientForm] = useState({
    name: '',
    sex: '',
    dateOfBirth: '',
    phone: '',
    memo: '',
  });
  const [anonymousForm, setAnonymousForm] = useState({
    displayName: '',
    age: '',
    sex: '',
  });

  const loadPatients = useCallback(async () => {
    const data = await api.patients();
    setItems([
      ...data.patients.map((p) => ({ ...p, type: 'patient' as const })),
      ...data.anonymousCases.map((c) => ({ ...c, type: 'anonymous' as const })),
    ]);
  }, []);

  useEffect(() => {
    if (!getToken()) {
      router.replace('/login');
      return;
    }
    loadPatients()
      .catch((error) => {
        if (isUnauthorizedError(error)) {
          router.replace('/login');
        }
      })
      .finally(() => setLoading(false));
  }, [router, loadPatients]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (item) =>
        item.name.toLowerCase().includes(q) ||
        item.code.toLowerCase().includes(q) ||
        (item.memo?.toLowerCase().includes(q) ?? false),
    );
  }, [items, query]);

  function closeModal() {
    setModal(null);
    setFormError('');
    setPatientForm({ name: '', sex: '', dateOfBirth: '', phone: '', memo: '' });
    setAnonymousForm({ displayName: '', age: '', sex: '' });
  }

  async function handleCreatePatient(e: FormEvent) {
    e.preventDefault();
    if (!patientForm.name.trim()) return;
    setSubmitting(true);
    setFormError('');
    try {
      await api.createPatient({
        name: patientForm.name.trim(),
        sex: patientForm.sex || undefined,
        dateOfBirth: patientForm.dateOfBirth || undefined,
        phone: patientForm.phone.trim() || undefined,
        memo: patientForm.memo.trim() || undefined,
      });
      await loadPatients();
      closeModal();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : '患者の追加に失敗しました');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCreateAnonymous(e: FormEvent) {
    e.preventDefault();
    if (!anonymousForm.displayName.trim()) return;
    setSubmitting(true);
    setFormError('');
    try {
      await api.createAnonymousCase({
        displayName: anonymousForm.displayName.trim(),
        age: anonymousForm.age ? Number(anonymousForm.age) : undefined,
        sex: anonymousForm.sex || undefined,
      });
      await loadPatients();
      closeModal();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : '匿名症例の追加に失敗しました');
    } finally {
      setSubmitting(false);
    }
  }

  async function selectCase(item: CaseItem) {
    if (startingId) return;
    setStartingId(item.id);
    try {
      const body =
        item.type === 'patient' ? { patientId: item.id } : { anonymousCaseId: item.id };
      const consultation = await api.createConsultation(body);
      router.push(`/consultation/${consultation.id}`);
    } catch {
      setStartingId(null);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">症例選択</h1>
          <p className="mt-1 text-sm text-slate-500">診療を開始する症例を選んでください</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" icon={<UserPlus />} onClick={() => setModal('patient')}>
            患者を追加
          </Button>
          <Button variant="secondary" icon={<Plus />} onClick={() => setModal('anonymous')}>
            匿名症例を追加
          </Button>
        </div>
      </div>

      {items.length > 0 && (
        <Input
          icon={<Search />}
          placeholder="名前・コード・メモで検索"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      )}

      {loading ? (
        <div className="space-y-3">
          <ListItemSkeleton />
          <ListItemSkeleton />
          <ListItemSkeleton />
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon={<User />}
          title="最初の症例を追加してください"
          description="患者または匿名症例を登録してから、診療を開始できます"
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <Button icon={<UserPlus />} onClick={() => setModal('patient')}>
                患者を追加
              </Button>
              <Button variant="secondary" icon={<Plus />} onClick={() => setModal('anonymous')}>
                匿名症例を追加
              </Button>
            </div>
          }
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Search />}
          title="該当する症例が見つかりません"
          description="検索条件を変えてお試しください"
        />
      ) : (
        <ul className="space-y-3">
          {filtered.map((item) => {
            const starting = startingId === item.id;
            return (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => selectCase(item)}
                  disabled={startingId !== null}
                  className="group w-full text-left disabled:opacity-60"
                >
                  <Card className="relative overflow-hidden py-4 pl-5 pr-4 transition-all hover:-translate-y-px hover:border-brand-300 hover:shadow-card-hover">
                    <div className="flex items-center gap-4">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-600">
                        {item.type === 'anonymous' ? (
                          <UserX className="h-5 w-5" />
                        ) : (
                          <User className="h-5 w-5" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-base font-semibold text-slate-900">{item.name}</p>
                          <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] text-slate-500">
                            {item.code}
                          </span>
                          <Badge variant={item.type === 'anonymous' ? 'default' : 'brand'}>
                            {item.type === 'anonymous' ? '匿名症例' : '患者'}
                          </Badge>
                        </div>
                        {item.memo && (
                          <p className="mt-1 line-clamp-2 text-sm text-brand-800">{item.memo}</p>
                        )}
                        <p className="mt-1 text-xs text-slate-500">
                          {item.age != null ? `${item.age}歳` : '年齢 —'} · {item.sex ?? '性別 —'}
                        </p>
                      </div>
                      {starting ? (
                        <Spinner />
                      ) : (
                        <ChevronRight className="h-4 w-4 shrink-0 text-slate-300 transition-all group-hover:translate-x-0.5 group-hover:text-brand-500" />
                      )}
                    </div>
                  </Card>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {modal === 'patient' && (
        <FormModal title="患者を追加" onClose={closeModal}>
          <form onSubmit={handleCreatePatient} className="space-y-4">
            {formError && <Alert variant="error">{formError}</Alert>}
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">氏名 *</label>
              <Input
                value={patientForm.name}
                onChange={(e) => setPatientForm({ ...patientForm, name: e.target.value })}
                placeholder="例: 山田 太郎"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">性別</label>
                <Select
                  value={patientForm.sex}
                  onChange={(e) => setPatientForm({ ...patientForm, sex: e.target.value })}
                >
                  <option value="">未選択</option>
                  <option value="M">男性</option>
                  <option value="F">女性</option>
                </Select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">生年月日</label>
                <Input
                  type="date"
                  value={patientForm.dateOfBirth}
                  onChange={(e) => setPatientForm({ ...patientForm, dateOfBirth: e.target.value })}
                />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">電話番号</label>
              <Input
                value={patientForm.phone}
                onChange={(e) => setPatientForm({ ...patientForm, phone: e.target.value })}
                placeholder="090-1234-5678"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">メモ</label>
              <Input
                value={patientForm.memo}
                onChange={(e) => setPatientForm({ ...patientForm, memo: e.target.value })}
                placeholder="主訴メモ等"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="secondary" onClick={closeModal}>
                キャンセル
              </Button>
              <Button type="submit" disabled={submitting || !patientForm.name.trim()}>
                {submitting ? '追加中...' : '追加する'}
              </Button>
            </div>
          </form>
        </FormModal>
      )}

      {modal === 'anonymous' && (
        <FormModal title="匿名症例を追加" onClose={closeModal}>
          <form onSubmit={handleCreateAnonymous} className="space-y-4">
            {formError && <Alert variant="error">{formError}</Alert>}
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">表示名 *</label>
              <Input
                value={anonymousForm.displayName}
                onChange={(e) =>
                  setAnonymousForm({ ...anonymousForm, displayName: e.target.value })
                }
                placeholder="例: 匿名 — 検証1"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">年齢</label>
                <Input
                  type="number"
                  min={0}
                  value={anonymousForm.age}
                  onChange={(e) => setAnonymousForm({ ...anonymousForm, age: e.target.value })}
                  placeholder="72"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">性別</label>
                <Select
                  value={anonymousForm.sex}
                  onChange={(e) => setAnonymousForm({ ...anonymousForm, sex: e.target.value })}
                >
                  <option value="">未選択</option>
                  <option value="M">男性</option>
                  <option value="F">女性</option>
                </Select>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="secondary" onClick={closeModal}>
                キャンセル
              </Button>
              <Button type="submit" disabled={submitting || !anonymousForm.displayName.trim()}>
                {submitting ? '追加中...' : '追加する'}
              </Button>
            </div>
          </form>
        </FormModal>
      )}
    </div>
  );
}
