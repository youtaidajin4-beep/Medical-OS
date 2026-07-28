'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Spinner } from '@/components/ui/spinner';

/** 症例選択は廃止。診療開始は /panel に統合。 */
export default function PatientsRedirectPage() {
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
