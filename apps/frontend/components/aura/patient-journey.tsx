'use client';

import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export type JourneyState = 'done' | 'current' | 'todo';

export const JOURNEY_STEPS = ['問診', '診察', 'SOAP', '書類'] as const;

/**
 * 「いま、どこにいるか」「次に何をするか」を、常に見えるようにする。
 * 問診 ✓ ━━━ 診察 ● ━━━ SOAP ○ ━━━ 書類 ○
 */
export function PatientJourney({
  states,
  className,
}: {
  states: [JourneyState, JourneyState, JourneyState, JourneyState];
  className?: string;
}) {
  return (
    <ol className={cn('flex items-center', className)} aria-label="進み具合">
      {JOURNEY_STEPS.map((label, i) => {
        const state = states[i]!;
        return (
          <li key={label} className="flex flex-1 items-center last:flex-none">
            <span className="flex flex-col items-center gap-1.5">
              <span
                className={cn(
                  'relative flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-bold transition-all duration-500',
                  state === 'done' && 'bg-aura-teal-500 text-white',
                  state === 'current' && 'bg-white text-aura-teal-600 ring-2 ring-aura-mint-400 shadow-glow',
                  state === 'todo' && 'bg-aura-cloud text-aura-ink-muted',
                )}
              >
                {state === 'done' ? <Check className="h-4 w-4" /> : i + 1}
                {state === 'current' && (
                  <span className="absolute inset-0 animate-orb-ripple rounded-full ring-2 ring-aura-mint-300/60" />
                )}
              </span>
              <span
                className={cn(
                  'text-[11px] font-medium',
                  state === 'todo' ? 'text-aura-ink-muted' : 'text-aura-ink',
                )}
              >
                {label}
              </span>
            </span>
            {i < JOURNEY_STEPS.length - 1 && (
              <span className="relative mx-2 mb-5 h-[3px] flex-1 overflow-hidden rounded-full bg-aura-cloud">
                <span
                  className={cn(
                    'absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-aura-teal-500 to-aura-mint-400 transition-all duration-700 ease-out',
                    state === 'done' ? 'w-full' : state === 'current' ? 'w-1/3' : 'w-0',
                  )}
                />
              </span>
            )}
          </li>
        );
      })}
    </ol>
  );
}
