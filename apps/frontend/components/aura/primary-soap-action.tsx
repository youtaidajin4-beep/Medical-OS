'use client';

import Link from 'next/link';
import { Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * このサービスの中心の操作。サイドナビの一番上に、独立して置く。
 * 丸みのある横長で、ごくわずかな光だけ（ネオンにしない）。押すと診療の始まりへ。
 */
export function PrimarySOAPAction({ className }: { className?: string }) {
  return (
    <Link
      href="/home?start=1"
      className={cn(
        'group relative flex h-12 w-full items-center justify-center gap-2.5 overflow-hidden rounded-full',
        'bg-gradient-to-b from-aura-mint-400 to-aura-teal-500 text-[14px] font-semibold tracking-tight text-white shadow-glow',
        'transition duration-300 ease-out hover:-translate-y-0.5 hover:brightness-[1.04] active:translate-y-0 active:scale-[0.985]',
        className,
      )}
    >
      {/* 上面のやわらかい反射 */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-3 top-0 h-1/2 rounded-b-full bg-gradient-to-b from-white/35 to-transparent"
      />
      <Sparkles className="relative h-[18px] w-[18px] transition-transform duration-300 group-hover:rotate-12 group-hover:scale-110" />
      <span className="relative">SOAPをつくる</span>
    </Link>
  );
}
