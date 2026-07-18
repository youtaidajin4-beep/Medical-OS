'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, FileText, Mic, Sparkles, Stethoscope } from 'lucide-react';
import { api, clearToken, getToken } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const FEATURES = [
  { icon: Mic, title: '診療音声を録音', description: '診察しながらワンタップで録音' },
  { icon: Sparkles, title: 'AI が自動要約', description: 'SOAP 形式のカルテ下書きを生成' },
  { icon: FileText, title: '書類まで一気に', description: '紹介状・診断書などを自動作成' },
] as const;

export default function HomePage() {
  const router = useRouter();
  const [health, setHealth] = useState<'checking' | 'ok' | 'down'>('checking');

  useEffect(() => {
    api.health()
      .then(() => setHealth('ok'))
      .catch(() => setHealth('down'));

    const token = getToken();
    if (!token) return;

    api
      .me()
      .then(() => router.replace('/dashboard'))
      .catch(() => {
        clearToken();
      });
  }, [router]);

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-slate-50 p-6">
      <div
        aria-hidden
        className="absolute inset-x-0 top-0 h-96 bg-gradient-to-b from-brand-50 via-brand-50/40 to-transparent"
      />

      <div className="relative flex w-full max-w-2xl animate-fade-in-up flex-col items-center text-center">
        <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-600 text-white shadow-lg shadow-brand-600/25">
          <Stethoscope className="h-8 w-8" />
        </div>

        <h1 className="text-4xl font-bold tracking-tight text-slate-900">Medical OS</h1>
        <p className="mt-3 max-w-md text-slate-600">
          診療の音声から、カルテと医療書類まで。
          <br />
          医師のためのAIメディカルスクライブ。
        </p>

        <Button
          size="lg"
          className="mt-8 px-10"
          icon={<ArrowRight />}
          onClick={() => router.push('/login')}
        >
          ログインして始める
        </Button>

        <div className="mt-12 grid w-full gap-4 sm:grid-cols-3">
          {FEATURES.map(({ icon: Icon, title, description }) => (
            <div
              key={title}
              className="rounded-xl border border-slate-200 bg-white/80 p-5 text-left shadow-card backdrop-blur"
            >
              <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                <Icon className="h-5 w-5" />
              </div>
              <p className="text-sm font-semibold text-slate-900">{title}</p>
              <p className="mt-1 text-xs leading-relaxed text-slate-500">{description}</p>
            </div>
          ))}
        </div>

        <p className="mt-10 flex items-center gap-1.5 text-xs text-slate-400">
          <span
            className={cn(
              'inline-block h-2 w-2 rounded-full',
              health === 'ok' && 'bg-emerald-500',
              health === 'down' && 'bg-red-500',
              health === 'checking' && 'animate-pulse bg-slate-300',
            )}
          />
          サーバー: {health === 'ok' ? '稼働中' : health === 'down' ? '接続不可' : '確認中...'}
          <span className="mx-1">·</span>
          Version 0.1
        </p>
      </div>
    </main>
  );
}
