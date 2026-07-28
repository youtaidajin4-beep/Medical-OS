'use client';

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Mic, RefreshCw, UserPlus, Users } from 'lucide-react';
import { api, getToken, isUnauthorizedError } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert } from '@/components/ui/alert';
import { Spinner } from '@/components/ui/spinner';
import { getConsultationStatusLabel } from '@/lib/consultation-status';
import { useUiMode } from '@/components/layout/ui-mode-provider';
import { snapToPanelWindow } from '@/lib/panel-window';
import { cn } from '@/lib/utils';

type BoardItem = {
  id: string;
  status: string;
  createdAt: string;
  kind: 'new' | 'repeater';
  visitNumber: number;
  lane: 'waiting' | 'done';
  hasDocuments: boolean;
  label: string;
  patientId?: string | null;
  anonymousCaseId?: string | null;
};

function defaultDisplayName() {
  const now = new Date();
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  return `本日の診療 ${hh}:${mm}`;
}

function BoardCard({
  item,
  onOpen,
  onPromote,
  promoting,
}: {
  item: BoardItem;
  onOpen: () => void;
  onPromote?: () => void;
  promoting?: boolean;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-2.5 shadow-sm">
      <button type="button" onClick={onOpen} className="w-full text-left">
        <div className="flex items-start gap-2">
          <span
            className={cn(
              'mt-0.5 flex h-7 min-w-7 shrink-0 items-center justify-center rounded-md px-1.5 text-[11px] font-bold',
              item.kind === 'new'
                ? 'bg-amber-100 text-amber-800'
                : 'bg-brand-100 text-brand-800',
            )}
          >
            {item.visitNumber}回目
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold text-slate-900">{item.label}</span>
            <span className="mt-0.5 block text-[10px] text-slate-500">
              {item.kind === 'new' ? '新規' : 'リピーター'} · {getConsultationStatusLabel(item.status)}
              {item.hasDocuments ? ' · 書類あり' : ''}
            </span>
          </span>
        </div>
      </button>
      {item.kind === 'new' && item.anonymousCaseId && onPromote && (
        <Button
          type="button"
          size="sm"
          variant="secondary"
          className="mt-2 w-full"
          icon={promoting ? <Spinner /> : <RefreshCw className="h-3.5 w-3.5" />}
          disabled={promoting}
          onClick={(e) => {
            e.stopPropagation();
            onPromote();
          }}
        >
          {promoting ? '切替中…' : 'リピーターにする'}
        </Button>
      )}
    </div>
  );
}

function LaneColumn({
  title,
  hint,
  items,
  onOpen,
  onPromote,
  promotingId,
}: {
  title: string;
  hint: string;
  items: BoardItem[];
  onOpen: (id: string) => void;
  onPromote: (item: BoardItem) => void;
  promotingId: string | null;
}) {
  const news = items.filter((i) => i.kind === 'new');
  const repeaters = items.filter((i) => i.kind === 'repeater');

  return (
    <section className="flex min-w-0 flex-1 flex-col rounded-xl border border-slate-200 bg-slate-50/80">
      <header className="border-b border-slate-200 px-2.5 py-2">
        <h2 className="text-xs font-bold text-slate-800">{title}</h2>
        <p className="text-[10px] text-slate-500">{hint}</p>
        <p className="mt-0.5 text-[10px] font-medium text-slate-400">{items.length}件</p>
      </header>
      <div className="flex max-h-[50vh] flex-col gap-3 overflow-y-auto p-2">
        <div className="space-y-1.5">
          <p className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-amber-700">
            <UserPlus className="h-3 w-3" />
            新規
          </p>
          {news.length === 0 ? (
            <p className="text-[10px] text-slate-400">なし</p>
          ) : (
            news.map((item) => (
              <BoardCard
                key={item.id}
                item={item}
                onOpen={() => onOpen(item.id)}
                onPromote={() => onPromote(item)}
                promoting={promotingId === item.id}
              />
            ))
          )}
        </div>
        <div className="space-y-1.5">
          <p className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-brand-700">
            <Users className="h-3 w-3" />
            リピーター
          </p>
          {repeaters.length === 0 ? (
            <p className="text-[10px] text-slate-400">なし</p>
          ) : (
            repeaters.map((item) => (
              <BoardCard key={item.id} item={item} onOpen={() => onOpen(item.id)} />
            ))
          )}
        </div>
      </div>
    </section>
  );
}

export default function PanelIdlePage() {
  const router = useRouter();
  const { setMode } = useUiMode();
  const [displayName, setDisplayName] = useState('');
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState('');
  const [items, setItems] = useState<BoardItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [promotingId, setPromotingId] = useState<string | null>(null);

  const loadBoard = useCallback(async () => {
    const list = await api.consultations();
    setItems(
      list.map((c) => ({
        id: c.id,
        status: c.status,
        createdAt: c.createdAt,
        kind: c.kind ?? (c.patient ? 'repeater' : 'new'),
        visitNumber: c.visitNumber ?? 1,
        lane: c.lane ?? (c.approvedAt || c.copiedAt || c.status === 'APPROVED' || c.status === 'COMPLETED'
          ? 'done'
          : 'waiting'),
        hasDocuments: Boolean(c.hasDocuments),
        label: c.patient?.name ?? c.anonymousCase?.displayName ?? '診療',
        patientId: c.patientId ?? c.patient?.id ?? null,
        anonymousCaseId: c.anonymousCaseId ?? c.anonymousCase?.id ?? null,
      })),
    );
  }, []);

  useEffect(() => {
    setMode('compact');
    snapToPanelWindow();
  }, [setMode]);

  useEffect(() => {
    if (!getToken()) {
      router.replace('/login');
      return;
    }
    void loadBoard()
      .catch((err) => {
        if (isUnauthorizedError(err)) router.replace('/login');
      })
      .finally(() => setLoading(false));
  }, [router, loadBoard]);

  const waiting = useMemo(() => items.filter((i) => i.lane === 'waiting'), [items]);
  const done = useMemo(() => items.filter((i) => i.lane === 'done'), [items]);

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

  async function handlePromote(item: BoardItem) {
    if (!item.anonymousCaseId) return;
    setPromotingId(item.id);
    setError('');
    try {
      await api.promoteAnonymousToPatient(item.anonymousCaseId, item.label);
      await loadBoard();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'リピーターへの切替に失敗しました');
    } finally {
      setPromotingId(null);
    }
  }

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-4">
      <div>
        <h1 className="text-lg font-bold tracking-tight text-slate-900">診療ボード</h1>
        <p className="mt-1 text-xs leading-relaxed text-slate-500">
          左がこれから診療、右が SOAP・書類後。新規とリピーターを分け、回数が一目で分かります。
        </p>
      </div>

      <form
        onSubmit={handleStart}
        className="space-y-2 rounded-xl border border-slate-200 bg-white p-3 shadow-sm"
      >
        <label htmlFor="displayName" className="block text-xs font-medium text-slate-600">
          新規の表示名（任意）
        </label>
        <div className="flex gap-2">
          <Input
            id="displayName"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="例: 午前の新規"
            autoComplete="off"
            className="flex-1"
          />
          <Button
            type="submit"
            icon={starting ? <Spinner className="text-white" /> : <Mic />}
            disabled={starting}
          >
            {starting ? '…' : '開始'}
          </Button>
        </div>
        {error && <Alert variant="error">{error}</Alert>}
      </form>

      {loading ? (
        <p className="text-xs text-slate-400">読み込み中...</p>
      ) : (
        <div className="flex gap-2">
          <LaneColumn
            title="これから診療"
            hint="録音〜確認前"
            items={waiting}
            onOpen={(id) => router.push(`/panel/${id}`)}
            onPromote={handlePromote}
            promotingId={promotingId}
          />
          <LaneColumn
            title="診療後"
            hint="SOAP・書類済み"
            items={done}
            onOpen={(id) => router.push(`/panel/${id}`)}
            onPromote={handlePromote}
            promotingId={promotingId}
          />
        </div>
      )}
    </div>
  );
}
