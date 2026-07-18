'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowRight, CalendarCheck, HelpCircle, History, ListChecks, Mic } from 'lucide-react';
import { api, getToken, isUnauthorizedError } from '@/lib/api-client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatCard } from '@/components/ui/stat-card';
import { ListItemSkeleton, Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { Button } from '@/components/ui/button';
import {
  ConsultationListItem,
  type ConsultationListItemData,
} from '@/components/consultation/consultation-list-item';
import { getConsultationStatusDescription } from '@/lib/consultation-status';

export default function DashboardPage() {
  const router = useRouter();
  const [todayCount, setTodayCount] = useState(0);
  const [reviewCount, setReviewCount] = useState(0);
  const [recent, setRecent] = useState<ConsultationListItemData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!getToken()) {
      router.replace('/login');
      return;
    }
    api
      .consultations()
      .then((list) => {
        const today = new Date().toDateString();
        setTodayCount(list.filter((c) => new Date(c.createdAt).toDateString() === today).length);
        setReviewCount(list.filter((c) => c.status === 'REVIEW').length);
        setRecent(list.slice(0, 5));
      })
      .catch((error) => {
        if (isUnauthorizedError(error)) {
          router.replace('/login');
        }
      })
      .finally(() => setLoading(false));
  }, [router]);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <p className="text-sm text-slate-500">
          {new Date().toLocaleDateString('ja-JP', { dateStyle: 'full' })}
        </p>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">ダッシュボード</h1>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {loading ? (
          <>
            <Skeleton className="h-[84px]" />
            <Skeleton className="h-[84px]" />
          </>
        ) : (
          <>
            <StatCard
              icon={<CalendarCheck />}
              label="本日の診療"
              value={todayCount}
              sub={`確認待ち ${reviewCount} 件`}
            />
            <Link
              href="/patients"
              className="group flex items-center gap-3 rounded-xl bg-gradient-to-br from-brand-600 to-brand-700 p-5 text-white shadow-card transition-all hover:shadow-card-hover"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/15">
                <Mic className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold">診療を開始</p>
                <p className="text-sm text-brand-100">症例を選んで録音をスタート</p>
              </div>
              <ArrowRight className="h-5 w-5 shrink-0 transition-transform group-hover:translate-x-1" />
            </Link>
          </>
        )}
      </div>

      <Card>
        <CardHeader className="flex items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <History className="h-4 w-4 text-brand-600" />
            直近の診療
          </CardTitle>
          <Link
            href="/history"
            className="inline-flex items-center gap-1 text-sm font-medium text-brand-600 hover:text-brand-700"
          >
            すべて見る
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading && (
            <>
              <ListItemSkeleton />
              <ListItemSkeleton />
              <ListItemSkeleton />
            </>
          )}
          {!loading && recent.length === 0 && (
            <EmptyState
              icon={<ListChecks />}
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
          )}
          {recent.map((c) => (
            <ConsultationListItem key={c.id} item={c} />
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <HelpCircle className="h-4 w-4 text-brand-600" />
            状態の意味
          </CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="space-y-3 text-sm">
            {(
              ['DRAFT', 'RECORDING', 'PROCESSING', 'REVIEW', 'APPROVED', 'COMPLETED'] as const
            ).map((status) => (
              <div key={status} className="grid gap-1 sm:grid-cols-[7rem_1fr]">
                <dt className="font-medium text-slate-900">
                  {status === 'DRAFT' && '未開始'}
                  {status === 'RECORDING' && '録音中'}
                  {status === 'PROCESSING' && '処理中'}
                  {status === 'REVIEW' && '確認待ち'}
                  {status === 'APPROVED' && '確認済み'}
                  {status === 'COMPLETED' && 'コピー完了'}
                </dt>
                <dd className="text-slate-600">{getConsultationStatusDescription(status)}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-4 text-xs text-slate-500">
            ※「プレビュー（PREVIEW）」という状態はありません。録音中に表示される文字はリアルタイムプレビュー（途中経過）です。
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
