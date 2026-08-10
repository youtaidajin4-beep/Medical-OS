'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Spinner } from '@/components/ui/spinner';

/** パネル診療ルートは /consultation/[id] に統一。 */
export default function PanelConsultationRedirectPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();

  useEffect(() => {
    if (id) router.replace(`/consultation/${id}`);
  }, [id, router]);

  return (
    <div className="flex items-center justify-center gap-2 py-16 text-sm text-slate-500">
      <Spinner />
      診療画面へ移動中...
    </div>
  );
}
