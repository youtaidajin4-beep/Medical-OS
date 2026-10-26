'use client';

import Link from 'next/link';
import { Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * このサービスの中心の操作。サイドナビの一番上に、独立して置く。ホームを兼ねる（押すと患者選びから診療が始まる）。
 * 丸みのある横長で、ごくわずかな光だけ（ネオンにしない）。閉じたサイドバーでは、丸いボタンになる。
 */
export function PrimarySOAPAction({
  className,
  collapsed,
  active,
}: {
  className?: string;
  collapsed?: boolean;
  active?: boolean;
}) {
  return (
    <Link
      href="/home"
      title={collapsed ? 'SOAPをつくる' : undefined}
      aria-label={collapsed ? 'SOAPをつくる' : undefined}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'group relative flex items-center justify-center gap-2.5 overflow-hidden rounded-full',
        collapsed ? 'h-11 w-11' : 'h-12 w-full',
        'bg-gradient-to-b from-aura-mint-400 to-aura-teal-500 text-[14px] font-semibold tracking-tight text-white shadow-glow',
        'transition duration-300 ease-out hover:-translate-y-0.5 hover:brightness-[1.04] active:translate-y-0 active:scale-[0.985]',
        active && 'ring-2 ring-aura-mint-200 ring-offset-2 ring-offset-aura-paper',
        className,
      )}
    >
      {/* 上面のやわらかい反射 */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-3 top-0 h-1/2 rounded-b-full bg-gradient-to-b from-white/35 to-transparent"
      />
      <Sparkles className="relative h-[18px] w-[18px] transition-transform duration-300 group-hover:rotate-12 group-hover:scale-110" />
      {!collapsed && <span className="relative">SOAPをつくる</span>}
    </Link>
  );
}
