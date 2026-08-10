'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Spinner } from '@/components/ui/spinner';

/** ダッシュボードは診療ホームへ統合。 */
export default function DashboardRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/home');
  }, [router]);

  return (
    <div className="flex items-center justify-center gap-2 py-16 text-sm text-slate-500">
      <Spinner />
      診療ホームへ移動中...
    </div>
  );
}
