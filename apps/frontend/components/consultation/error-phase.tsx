'use client';

import Link from 'next/link';
import { AlertCircle, ArrowLeft, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatPipelineError } from '@/lib/ai-status';

export function ErrorPhase({ message, onBack }: { message: string; onBack: () => void }) {
  const friendly = formatPipelineError(message);

  return (
    <div className="mx-auto flex max-w-lg flex-col items-center gap-6 py-16 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-50 text-red-500">
        <AlertCircle className="h-8 w-8" />
      </div>
      <div>
        <h1 className="text-xl font-bold tracking-tight text-slate-900">処理に失敗しました</h1>
        <p className="mt-2 text-sm text-slate-600">{friendly}</p>
        {friendly !== message && (
          <p className="mt-2 text-xs text-slate-400">詳細: {message}</p>
        )}
      </div>
      <div className="flex flex-wrap justify-center gap-3">
        <Button variant="secondary" icon={<ArrowLeft />} onClick={onBack}>
          症例一覧に戻る
        </Button>
        <Link href="/settings">
          <Button variant="ghost" icon={<Settings />}>
            設定を確認
          </Button>
        </Link>
      </div>
    </div>
  );
}
