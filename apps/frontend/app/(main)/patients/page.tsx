'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronRight, Search, User, UserX } from 'lucide-react';
import { api, getToken, isUnauthorizedError } from '@/lib/api-client';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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

export default function PatientsPage() {
  const router = useRouter();
  const [items, setItems] = useState<CaseItem[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [startingId, setStartingId] = useState<string | null>(null);

  useEffect(() => {
    if (!getToken()) {
      router.replace('/login');
      return;
    }
    api
      .patients()
      .then((data) => {
        setItems([
          ...data.patients.map((p) => ({ ...p, type: 'patient' as const })),
          ...data.anonymousCases.map((c) => ({ ...c, type: 'anonymous' as const })),
        ]);
      })
      .catch((error) => {
        if (isUnauthorizedError(error)) {
          router.replace('/login');
        }
      })
      .finally(() => setLoading(false));
  }, [router]);

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
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">症例選択</h1>
        <p className="mt-1 text-sm text-slate-500">診療を開始する症例を選んでください</p>
      </div>

      <Input
        icon={<Search />}
        placeholder="名前・コード・メモで検索"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      {loading ? (
        <div className="space-y-3">
          <ListItemSkeleton />
          <ListItemSkeleton />
          <ListItemSkeleton />
        </div>
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
    </div>
  );
}
