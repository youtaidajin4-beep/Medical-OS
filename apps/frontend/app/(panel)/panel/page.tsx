'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Spinner } from '@/components/ui/spinner';

/** パネル専用画面は廃止。診療ホームへ誘導。 */
export default function PanelRedirectPage() {
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
