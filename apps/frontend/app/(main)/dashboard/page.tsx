'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Spinner } from '@/components/ui/spinner';

/** 日常導線は /panel。ダッシュボードはパネルへ誘導。 */
export default function DashboardRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/panel');
  }, [router]);

  return (
    <div className="flex items-center justify-center gap-2 py-16 text-sm text-slate-500">
      <Spinner />
      診療パネルへ移動中...
    </div>
  );
}
