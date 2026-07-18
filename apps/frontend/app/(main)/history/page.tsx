'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { History, Mic } from 'lucide-react';
import { api, getToken, isUnauthorizedError } from '@/lib/api-client';
import { ListItemSkeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { Button } from '@/components/ui/button';
import {
  ConsultationListItem,
  type ConsultationListItemData,
} from '@/components/consultation/consultation-list-item';

export default function HistoryPage() {
  const router = useRouter();
  const [list, setList] = useState<ConsultationListItemData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!getToken()) {
      router.replace('/login');
      return;
    }
    api
      .consultations()
      .then(setList)
      .catch((error) => {
        if (isUnauthorizedError(error)) {
          router.replace('/login');
        }
      })
      .finally(() => setLoading(false));
  }, [router]);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">診療履歴</h1>
        <p className="mt-1 text-sm text-slate-500">
          患者名・主訴・状態から過去の診療を確認できます
        </p>
      </div>

      {loading ? (
        <div className="space-y-3">
          <ListItemSkeleton />
          <ListItemSkeleton />
          <ListItemSkeleton />
          <ListItemSkeleton />
        </div>
      ) : list.length === 0 ? (
        <EmptyState
          icon={<History />}
          title="まだ診療履歴がありません"
          description="症例を選んで最初の診療を始めましょう"
          action={
            <Link href="/patients">
              <Button size="sm" icon={<Mic />}>
                診療を開始
              </Button>
            </Link>
          }
        />
      ) : (
        <ul className="space-y-3">
          {list.map((c) => (
            <li key={c.id}>
              <ConsultationListItem item={c} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
