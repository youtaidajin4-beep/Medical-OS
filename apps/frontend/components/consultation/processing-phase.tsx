'use client';

import { useEffect, useMemo, useState } from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { StopStage } from '@/hooks/use-recording';

/**
 * 診察を終えてから、カルテ原稿ができるまでの画面。
 *
 * 録音のオーブが、静かに4枚のカード（S・O・A・P）へ変わっていく。段は実際の処理の進みに合わせて進み、
 * 見せかけの進捗は出さない。できあがると、カードが落ち着いて「記録ができました。」と出る。
 * 派手な演出（紙吹雪など）はしない。変形は 0.7 秒ほど。
 */
const STEPS = [
  { key: 'gather', label: '発話をまとめる', hint: '診察の会話を、ひとつの記録にそろえています' },
  { key: 'organize', label: '診療データを整理', hint: '症状・所見・薬・検査・指導を拾い分けています' },
  { key: 'soap', label: 'S・O・A・P を書く', hint: '会話の内容を、カルテの文章に要約しています' },
  { key: 'finish', label: '診療記録を仕上げる', hint: '最後の確認用の項目を整えています' },
] as const;

const CARDS = [
  { letter: 'S', title: 'Subjective', lines: ['92%', '78%', '54%'] },
  { letter: 'O', title: 'Objective', lines: ['84%', '61%'] },
  { letter: 'A', title: 'Assessment', lines: ['88%', '47%'] },
  { letter: 'P', title: 'Plan', lines: ['95%', '72%', '39%'] },
] as const;

function pipelineStepToIndex(step: string | null | undefined): number {
  if (!step) return 0;
  switch (step) {
    case 'pipeline_start':
    case 'assemble_started':
    case 'stt_started':
    case 'stt_complete':
      return 0;
    case 'dict_correction_complete':
    case 'medical_knowledge_complete':
    case 'llm_correction_started':
    case 'llm_correction_complete':
    case 'extract_started':
    case 'extract_complete':
      return 1;
    case 'soap_started':
    case 'soap_progress':
      return 2;
    case 'soap_complete':
    case 'note_progress':
    case 'note_complete':
    case 'pipeline_complete':
      return 3;
    default:
      return 0;
  }
}

function stageMessage(stopStage: StopStage, stepIndex: number): string {
  if (stepIndex === 0 && stopStage === 'finishing') return '最後の発話を文字にしています';
  if (stepIndex === 0 && stopStage === 'saving') return '録音を保存しています';
  if (stepIndex === 0 && stopStage === 'submitting') return '作成を依頼しています';
  return STEPS[stepIndex]?.hint ?? '';
}

function formatElapsed(startedAt: string | null | undefined, now: number): string {
  if (!startedAt) return '0:00';
  const ms = now - new Date(startedAt).getTime();
  if (!Number.isFinite(ms) || ms < 0) return '0:00';
  const sec = Math.floor(ms / 1000);
  return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;
}

export function ProcessingPhase({
  density = 'full',
  pipelineStep = null,
  pipelineStartedAt = null,
  stopStage = null,
  complete = false,
}: {
  density?: 'compact' | 'full';
  pipelineStep?: string | null;
  pipelineStartedAt?: string | null;
  stopStage?: StopStage;
  /** SOAPができた。カードが落ち着いて「記録ができました。」を出す */
  complete?: boolean;
}) {
  const compact = density === 'compact';
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(timer);
  }, []);

  const stepIndex = complete ? STEPS.length - 1 : pipelineStepToIndex(pipelineStep);
  const elapsed = useMemo(() => formatElapsed(pipelineStartedAt, now), [pipelineStartedAt, now]);
  // 録音のオーブは、整理の段に入ったところで4枚のカードへ変わる
  const morphed = complete || stepIndex >= 1;
  const writing = stepIndex >= 2 && !complete;

  return (
    <section
      aria-live="polite"
      className={cn(
        'mx-auto flex w-full max-w-xl flex-col items-center px-1 text-center',
        compact ? 'py-6' : 'min-h-[62dvh] justify-center py-10',
      )}
    >
      <style>{`
        @keyframes mo-shimmer { 0% { background-position: -240px 0 } 100% { background-position: 240px 0 } }
        .mo-line { background-image: linear-gradient(90deg, rgba(31,138,133,.10) 0, rgba(31,138,133,.26) 50%, rgba(31,138,133,.10) 100%); background-size: 240px 100%; animation: mo-shimmer 1.5s linear infinite; }
        .mo-line-done { background: rgba(31,138,133,.22); }
        .mo-line-idle { background: rgba(31,138,133,.10); }
        @media (prefers-reduced-motion: reduce) { .mo-line { animation: none } }
      `}</style>

      <p className="text-[12px] font-semibold tracking-[0.3em] text-aura-teal-500">
        {complete ? 'DONE' : '診察を終了しました'}
      </p>
      <h2 className={cn('mt-2 font-semibold tracking-tight text-aura-ink', compact ? 'text-xl' : 'text-[28px]')}>
        {complete ? '記録ができました。' : 'カルテ原稿を作っています'}
      </h2>
      <p className="mt-2 min-h-[1.5rem] text-sm text-aura-ink-soft">
        {complete ? 'S・O・A・P を確認しましょう。' : stageMessage(stopStage, stepIndex)}
      </p>

      {/* オーブ → 4枚のカード。同じ場所で、形だけが変わる */}
      <div className="relative mt-8 flex h-[21rem] w-full items-center justify-center">
        <div
          aria-hidden
          className={cn(
            'absolute h-44 w-44 rounded-full bg-gradient-to-br from-aura-cyan-200 via-aura-mint-200 to-aura-teal-400 shadow-[0_24px_60px_-18px_rgba(31,138,133,0.55)]',
            'transition-all duration-700 ease-[cubic-bezier(0.4,0,0.2,1)]',
            morphed ? 'scale-50 opacity-0 blur-md' : 'animate-orb-breathe scale-100 opacity-100',
          )}
        >
          <div className="absolute inset-[3px] rounded-full bg-gradient-to-b from-white/50 via-transparent to-transparent" />
        </div>

        <div className="grid w-full grid-cols-2 gap-3">
          {CARDS.map((card, i) => (
            <div
              key={card.letter}
              className={cn(
                'rounded-3xl border border-white/80 bg-white/90 p-4 text-left shadow-float',
                'transition-all duration-700 ease-[cubic-bezier(0.4,0,0.2,1)]',
                morphed ? 'translate-y-0 scale-100 opacity-100' : 'scale-50 opacity-0',
                complete && 'shadow-float-lg',
              )}
              style={{ transitionDelay: morphed ? `${i * 90}ms` : '0ms' }}
            >
              <div className="flex items-center gap-2.5">
                <span
                  className={cn(
                    'flex h-8 w-8 items-center justify-center rounded-xl text-[13px] font-bold transition-colors duration-500',
                    complete ? 'bg-aura-teal-500 text-white' : 'bg-aura-mint-100 text-aura-teal-600',
                  )}
                >
                  {complete ? <Check className="h-4 w-4" /> : card.letter}
                </span>
                <span className="text-[11px] font-medium tracking-wide text-aura-ink-muted">{card.title}</span>
              </div>
              <div className="mt-3.5 space-y-2">
                {card.lines.map((w, j) => (
                  <div
                    key={j}
                    className={cn('h-2.5 rounded-full', complete ? 'mo-line-done' : writing ? 'mo-line' : 'mo-line-idle')}
                    style={{ width: w, animationDelay: `${(i * 3 + j) * 110}ms` }}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-6 flex items-center gap-3 text-[13px] text-aura-ink-muted">
        <span className="font-mono tabular-nums text-aura-ink-soft" aria-label="経過時間">
          {elapsed}
        </span>
        <span className="h-3 w-px bg-aura-line" />
        <span>
          {STEPS.map((step, i) => (
            <span
              key={step.key}
              className={cn(
                'mr-3 transition-colors duration-500 last:mr-0',
                i < stepIndex || complete ? 'text-aura-teal-600' : i === stepIndex ? 'font-semibold text-aura-ink' : '',
              )}
            >
              {i < stepIndex || complete ? '✓ ' : ''}
              {step.label}
            </span>
          ))}
        </span>
      </div>
    </section>
  );
}
