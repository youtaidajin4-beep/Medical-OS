'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, FileText, Mic, Sparkles, Stethoscope } from 'lucide-react';
import { api, clearToken, getToken, SINGLE_CLINIC_MODE } from '@/lib/api-client';
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
    if (SINGLE_CLINIC_MODE) {
      router.replace('/home');
      return;
    }
    api.health()
      .then(() => setHealth('ok'))
      .catch(() => setHealth('down'));

    const token = getToken();
    if (!token) return;

    api
      .me()
      .then(() => router.replace('/home'))
      .catch(() => {
        clearToken();
      });
  }, [router]);

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-[#eef3f0] px-6 py-12">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(12,47,44,0.08),transparent_55%)]"
      />

      <div className="relative flex w-full max-w-2xl animate-fade-in-up flex-col items-center">
        <section className="relative w-full overflow-hidden rounded-[2rem] border border-[#d7e2dd] bg-[linear-gradient(135deg,#0c2f2c_0%,#1a5c55_55%,#0c2f2c_100%)] px-8 py-10 text-center text-[#f3efe4] shadow-[0_30px_70px_-40px_rgba(12,47,44,0.55)] sm:px-12 sm:py-12">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_20%_10%,rgba(232,201,138,0.16),transparent_45%)]"
          />
          <div className="relative mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#e8c98a] text-[#0c2f2c] shadow-[0_12px_30px_-12px_rgba(232,201,138,0.8)] animate-scale-in">
            <Stethoscope className="h-7 w-7" />
          </div>
          <p className="relative text-[11px] font-semibold tracking-[0.28em] text-[#e8c98a]">
            KUSHIMA INTERNAL MEDICINE
          </p>
          <h1 className="relative mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">Medical OS</h1>
          <p className="relative mx-auto mt-4 max-w-md text-sm leading-relaxed text-[#d5e6e1] sm:text-base">
            診療の音声から、カルテと医療書類まで。
            <br />
            医師のための AI メディカルスクライブ。
          </p>
          <Button
            size="lg"
            className="relative mt-8 rounded-xl bg-[#e8c98a] px-10 text-[#0c2f2c] shadow-[0_14px_28px_-16px_rgba(232,201,138,0.85)] hover:bg-[#f0d6a4] hover:shadow-[0_16px_32px_-14px_rgba(232,201,138,0.9)]"
            icon={<ArrowRight />}
            onClick={() => router.push(SINGLE_CLINIC_MODE ? '/home' : '/login')}
          >
            {SINGLE_CLINIC_MODE ? '診療を始める' : 'ログインして始める'}
          </Button>
        </section>

        <div className="mt-8 grid w-full gap-4 sm:grid-cols-3">
          {FEATURES.map(({ icon: Icon, title, description }) => (
            <div
              key={title}
              className="rounded-2xl border border-[#d7e2dd] bg-[#fbfaf6] p-5 text-left shadow-[0_20px_40px_-28px_rgba(12,47,44,0.35)]"
            >
              <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-[#eef8f5] text-[#0f766e]">
                <Icon className="h-5 w-5" />
              </div>
              <p className="text-sm font-semibold text-[#0c2f2c]">{title}</p>
              <p className="mt-1 text-xs leading-relaxed text-[#6f8f88]">{description}</p>
            </div>
          ))}
        </div>

        <p className="mt-10 flex items-center gap-1.5 text-xs text-[#6f8f88]">
          <span
            className={cn(
              'inline-block h-2 w-2 rounded-full',
              health === 'ok' && 'bg-[#0f766e]',
              health === 'down' && 'bg-red-500',
              health === 'checking' && 'animate-pulse bg-[#d7e2dd]',
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
