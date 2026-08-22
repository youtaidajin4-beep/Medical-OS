'use client';

import Link from 'next/link';
import { AlertCircle, ArrowLeft, Mic, RefreshCw, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatPipelineError } from '@/lib/ai-status';
import { cn } from '@/lib/utils';
import { Spinner } from '@/components/ui/spinner';

export function ErrorPhase({
  message,
  onBack,
  backLabel = '一覧に戻る',
  density = 'full',
  canReprocess = false,
  onReprocess,
  onRerecord,
  busy = false,
}: {
  message: string;
  onBack: () => void;
  backLabel?: string;
  density?: 'compact' | 'full';
  canReprocess?: boolean;
  onReprocess?: () => void;
  onRerecord?: () => void;
  busy?: boolean;
}) {
  const friendly = formatPipelineError(message);
  const compact = density === 'compact';

  return (
    <div
      className={cn(
        'mx-auto flex flex-col items-center gap-4 text-center',
        compact ? 'max-w-md gap-4 py-8' : 'max-w-lg gap-6 py-16',
      )}
    >
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-50 text-red-500">
        <AlertCircle className="h-7 w-7" />
      </div>
      <div>
        <h1
          className={cn(
            'font-bold tracking-tight text-slate-900',
            compact ? 'text-base' : 'text-xl',
          )}
        >
          処理に失敗しました
        </h1>
        <p className="mt-2 text-sm text-slate-600">{friendly}</p>
        {friendly !== message && (
          <p className="mt-2 text-xs text-slate-400">詳細: {message}</p>
        )}
        <p className="mt-3 text-xs leading-relaxed text-slate-500">
          再試行しても直らない場合は紙カルテで診療を続行し、後で開発担当へ連絡してください。
        </p>
      </div>
      <div className="flex flex-wrap justify-center gap-3">
        {canReprocess && onReprocess && (
          <Button
            variant="primary"
            icon={busy ? <Spinner className="text-white" /> : <RefreshCw />}
            disabled={busy}
            onClick={onReprocess}
          >
            もう一度処理する
          </Button>
        )}
        {onRerecord && (
          <Button variant="secondary" icon={<Mic />} disabled={busy} onClick={onRerecord}>
            録り直す
          </Button>
        )}
        <Button variant="ghost" icon={<ArrowLeft />} disabled={busy} onClick={onBack}>
          {backLabel}
        </Button>
        {!compact && (
          <Link href="/settings">
            <Button variant="ghost" icon={<Settings />} disabled={busy}>
              設定を確認
            </Button>
          </Link>
        )}
      </div>
    </div>
  );
}
