'use client';

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Mic, Users } from 'lucide-react';
import { api, getToken, isUnauthorizedError } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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

type PatientOption = { id: string; name: string; code: string };

function defaultDisplayName() {
  const now = new Date();
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  return `本日の診療 ${hh}:${mm}`;
}

function formatWhen(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString('ja-JP', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function HomePage() {
  const router = useRouter();
  const [displayName, setDisplayName] = useState('');
  const [patientId, setPatientId] = useState('');
  const [patients, setPatients] = useState<PatientOption[]>([]);
  const [logs, setLogs] = useState<LogItem[]>([]);
  const [starting, setStarting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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
    setPatients(
      patientRes.patients.map((p) => ({
        id: p.id,
        name: p.name,
        code: p.code,
      })),
    );
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

  const patientOptions = useMemo(
    () => [
      { value: '', label: '患者未選択（その場で開始）' },
      ...patients.map((p) => ({ value: p.id, label: `${p.name}（${p.code}）` })),
    ],
    [patients],
  );

  async function handleStart(e: FormEvent) {
    e.preventDefault();
    setError('');
    setStarting(true);
    try {
      if (patientId) {
        const consultation = await api.createConsultation({ patientId });
        router.push(`/consultation/${consultation.id}`);
        return;
      }
      const name = displayName.trim() || defaultDisplayName();
      const anonymous = await api.createAnonymousCase({ displayName: name });
      const consultation = await api.createConsultation({ anonymousCaseId: anonymous.id });
      router.push(`/consultation/${consultation.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : '診療を開始できませんでした');
      setStarting(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">診療</h1>
        <p className="mt-1 text-sm text-slate-500">
          診療を開始すると録音・SOAP・書類作成に進みます。患者はメニューの「患者」から登録できます。
        </p>
      </div>

      <form
        onSubmit={handleStart}
        className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
      >
        <div className="space-y-1.5">
          <label htmlFor="patientId" className="text-sm font-medium text-slate-700">
            患者（任意）
          </label>
          <Select
            id="patientId"
            className="block w-full"
            value={patientId}
            onChange={(e) => setPatientId(e.target.value)}
          >
            {patientOptions.map((opt) => (
              <option key={opt.value || 'none'} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </Select>
          <p className="text-xs text-slate-400">
            未選択のまま開始すると、下の表示名で一時的な診療として記録されます。{' '}
            <Link href="/patients" className="font-medium text-brand-600 hover:underline">
              患者を登録
            </Link>
          </p>
        </div>

        {!patientId && (
          <div className="space-y-1.5">
            <label htmlFor="displayName" className="text-sm font-medium text-slate-700">
              表示名（任意）
            </label>
            <Input
              id="displayName"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="例: 午前の新規"
              autoComplete="off"
            />
          </div>
        )}

        {error && <Alert variant="error">{error}</Alert>}

        <Button
          type="submit"
          size="lg"
          className="w-full"
          icon={starting ? <Spinner className="text-white" /> : <Mic />}
          disabled={starting}
        >
          {starting ? '開始中…' : '診療を開始'}
        </Button>
      </form>

      <section className="space-y-3">
        <div className="flex items-end justify-between gap-2">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">診療ログ</h2>
            <p className="text-xs text-slate-500">直近の診療。タップで続きを開けます。</p>
          </div>
          <Link
            href="/history"
            className="text-xs font-medium text-brand-600 hover:underline"
          >
            すべての履歴
          </Link>
        </div>

        {loading ? (
          <p className="flex items-center gap-2 text-sm text-slate-400">
            <Spinner className="h-4 w-4" />
            読み込み中…
          </p>
        ) : logs.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 bg-white px-4 py-8 text-center text-sm text-slate-400">
            まだ診療ログがありません
          </div>
        ) : (
          <ul className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 bg-white">
            {logs.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => router.push(`/consultation/${item.id}`)}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-slate-50"
                >
                  <span
                    className={cn(
                      'flex h-9 min-w-9 items-center justify-center rounded-lg text-xs font-bold',
                      item.kind === 'new'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-brand-100 text-brand-800',
                    )}
                  >
                    {item.visitNumber}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-slate-900">
                      {item.label}
                    </span>
                    <span className="mt-0.5 block text-xs text-slate-500">
                      {formatWhen(item.createdAt)} · {getConsultationStatusLabel(item.status)}
                      {item.hasDocuments ? ' · 書類あり' : ''}
                    </span>
                  </span>
                  <Users className="h-4 w-4 shrink-0 text-slate-300" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
