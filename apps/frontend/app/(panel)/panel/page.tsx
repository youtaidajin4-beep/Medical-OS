'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Mic, Play } from 'lucide-react';
import { api, getToken, isUnauthorizedError } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert } from '@/components/ui/alert';
import { Spinner } from '@/components/ui/spinner';
import { getConsultationStatusLabel } from '@/lib/consultation-status';
import { useUiMode } from '@/components/layout/ui-mode-provider';

type RecentItem = {
  id: string;
  status: string;
  label: string;
  createdAt: string;
};

function defaultDisplayName() {
  const now = new Date();
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  return `本日の診療 ${hh}:${mm}`;
}

export default function PanelIdlePage() {
  const router = useRouter();
  const { setMode } = useUiMode();
  const [displayName, setDisplayName] = useState('');
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState('');
  const [recent, setRecent] = useState<RecentItem[]>([]);
  const [loadingRecent, setLoadingRecent] = useState(true);

  useEffect(() => {
    setMode('compact');
  }, [setMode]);

  useEffect(() => {
    if (!getToken()) {
      router.replace('/login');
      return;
    }
    void api
      .consultations()
      .then((list) => {
        setRecent(
          list.slice(0, 3).map((c) => ({
            id: c.id,
            status: c.status,
            label: c.patient?.name ?? c.anonymousCase?.displayName ?? '診療',
            createdAt: c.createdAt,
          })),
        );
      })
      .catch((err) => {
        if (isUnauthorizedError(err)) router.replace('/login');
      })
      .finally(() => setLoadingRecent(false));
  }, [router]);

  async function handleStart(e: FormEvent) {
    e.preventDefault();
    setError('');
    setStarting(true);
    try {
      const name = displayName.trim() || defaultDisplayName();
      const anonymous = await api.createAnonymousCase({ displayName: name });
      const consultation = await api.createConsultation({ anonymousCaseId: anonymous.id });
      router.push(`/panel/${consultation.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : '診療を開始できませんでした');
      setStarting(false);
    }
  }

  return (
    <div className="mx-auto flex max-w-md flex-col gap-5">
      <div>
        <h1 className="text-lg font-bold tracking-tight text-slate-900">診療パネル</h1>
        <p className="mt-1 text-xs leading-relaxed text-slate-500">
          CLINICS を全画面のまま、このウィンドウ（画面右下 1/4）で使います。録音 → SOAP →
          コピーまでここで完結します。
        </p>
      </div>

      <form
        onSubmit={handleStart}
        className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
      >
        <div>
          <label htmlFor="displayName" className="mb-1 block text-xs font-medium text-slate-600">
            表示名（任意）
          </label>
          <Input
            id="displayName"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="例: 午前1人目 / 空欄可"
            autoComplete="off"
          />
          <p className="mt-1 text-[11px] text-slate-400">
            空欄の場合は「本日の診療 HH:mm」で開始します。患者マスタは CLINICS 側です。
          </p>
        </div>

        {error && <Alert variant="error">{error}</Alert>}

        <Button
          type="submit"
          size="lg"
          className="w-full"
          icon={starting ? <Spinner className="text-white" /> : <Mic />}
          disabled={starting}
        >
          {starting ? '開始中...' : '診療を開始'}
        </Button>
      </form>

      <div className="space-y-2">
        <p className="text-xs font-medium text-slate-500">直近の診療</p>
        {loadingRecent ? (
          <p className="text-xs text-slate-400">読み込み中...</p>
        ) : recent.length === 0 ? (
          <p className="text-xs text-slate-400">まだ診療がありません</p>
        ) : (
          <ul className="space-y-1.5">
            {recent.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => router.push(`/panel/${item.id}`)}
                  className="flex w-full items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-left hover:border-brand-200 hover:bg-brand-50/40"
                >
                  <Play className="h-3.5 w-3.5 shrink-0 text-brand-600" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-slate-800">
                      {item.label}
                    </span>
                    <span className="text-[11px] text-slate-400">
                      {getConsultationStatusLabel(item.status)} ·{' '}
                      {new Date(item.createdAt).toLocaleString('ja-JP', {
                        month: 'numeric',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
