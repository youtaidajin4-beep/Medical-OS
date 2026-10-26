'use client';

import { Mic } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * 録音のオーブ。普通の赤い録音ボタンにしない。
 *
 * やわらかい球が、ごくゆっくり呼吸する。声が入るとほんの少し膨らみ、波紋が外へ広がる。
 * 一時停止では呼吸が止まり、色が沈む。診察の最中に目を引きすぎず、でも一目で
 * 「記録している」と分かることが目的。
 */
export function RecordingOrb({
  level = 0,
  state,
  size = 208,
  className,
}: {
  /** 入力レベル（0〜1） */
  level?: number;
  state: 'idle' | 'recording' | 'paused';
  size?: number;
  className?: string;
}) {
  const active = state === 'recording';
  const swell = active ? 1 + Math.min(1, level) * 0.1 : 1;
  return (
    <div
      className={cn('relative flex items-center justify-center', className)}
      style={{ width: size, height: size }}
      role="img"
      aria-label={active ? '診察を記録しています' : state === 'paused' ? '一時停止中' : '録音の準備ができています'}
    >
      {/* 波紋。声が拾えているあいだだけ */}
      {active && (
        <>
          <span className="absolute inset-0 animate-orb-ripple rounded-full bg-aura-mint-300/40" />
          <span className="absolute inset-0 animate-orb-ripple rounded-full bg-aura-cyan-300/40 [animation-delay:1.8s]" />
        </>
      )}

      {/* 本体。声の大きさに合わせて、ごくわずかに膨らむ */}
      <div
        className="absolute inset-0 transition-transform duration-200 ease-out"
        style={{ transform: `scale(${swell})` }}
      >
        <div
          className={cn(
            'absolute inset-0 overflow-hidden rounded-full shadow-[0_24px_60px_-18px_rgba(31,138,133,0.55)] transition-[filter,opacity] duration-700',
            state === 'idle' ? 'animate-orb-breathe' : active ? 'animate-orb-breathe' : 'opacity-70 saturate-50',
          )}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-aura-cyan-200 via-aura-mint-200 to-aura-teal-400" />
          {/* ゆらぐ光。形のない塊を二つ、ゆっくり動かす */}
          <div
            className={cn(
              'absolute -left-1/4 -top-1/4 h-3/4 w-3/4 rounded-full bg-white/60 blur-2xl',
              active && 'animate-orb-drift',
            )}
          />
          <div
            className={cn(
              'absolute -bottom-1/4 -right-1/4 h-3/4 w-3/4 rounded-full bg-aura-teal-300/60 blur-2xl [animation-delay:-5s]',
              active && 'animate-orb-drift',
            )}
          />
          <div className="absolute inset-[3px] rounded-full bg-gradient-to-b from-white/50 via-transparent to-transparent" />
        </div>
        <Mic
          className={cn(
            'absolute left-1/2 top-1/2 h-9 w-9 -translate-x-1/2 -translate-y-1/2 text-white/90 drop-shadow transition-opacity duration-500',
            active ? 'opacity-70' : 'opacity-100',
          )}
        />
      </div>
    </div>
  );
}
