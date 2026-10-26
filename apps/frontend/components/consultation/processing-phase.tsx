'use client';

import { useEffect, useMemo, useState } from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { StopStage } from '@/hooks/use-recording';

/**
 * 診察を終えてから、カルテ原稿ができるまでの画面。
 *
 * 4つの段それぞれに、はっきり違う見え方がある。
 *   1 発話をまとめる   … 録音のオーブに、会話のかけらが集まる
 *   2 診療データを整理 … オーブが4枚のカード（S・O・A・P）に変わり、拾った項目が並ぶ
 *   3 S・O・A・P を書く … カードに、文章が左から書かれていく
 *   4 診療記録を仕上げる … 書き終えた順に、カードへ確認の印がつく
 * 段は実際の処理の進みに合わせて進み、見せかけの進捗は出さない。ただし処理が速くて
 * 1秒で全部終わる診察でも、4つの段が見えるように、1つの段は最低でも約1秒は見せる。
 * できあがると、カードが落ち着いて「記録ができました。」と出て、少し置いてから次の画面へ移る。
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

/** 整理の段で、カードの上に並ぶ「拾った項目」 */
const TAGS = ['症状', '所見', '薬', '検査', '指導'] as const;

/** 会話のかけら。まとめの段で、オーブへ向かって集まる */
const SHARDS = [
  { x: '-9.5rem', y: '-4rem', w: '3.2rem', d: 0 },
  { x: '9rem', y: '-5rem', w: '2.4rem', d: 280 },
  { x: '-8rem', y: '4.5rem', w: '2.8rem', d: 560 },
  { x: '9.5rem', y: '3.5rem', w: '3.4rem', d: 140 },
  { x: '0rem', y: '-8rem', w: '2.6rem', d: 420 },
  { x: '-1rem', y: '8rem', w: '3rem', d: 700 },
] as const;

/** 1つの段を最低限見せる時間 */
const MIN_STEP_MS = 1000;
/** 「記録ができました。」を見せてから、次の画面へ移るまで */
const DONE_HOLD_MS = 1400;

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
  onDone,
}: {
  density?: 'compact' | 'full';
  pipelineStep?: string | null;
  pipelineStartedAt?: string | null;
  stopStage?: StopStage;
  /** SOAPができた。4つの段を見せ終えたあと、カードが落ち着いて「記録ができました。」を出す */
  complete?: boolean;
  /** 「記録ができました。」を見せ終えた。ここで次の画面へ移る */
  onDone?: () => void;
}) {
  const compact = density === 'compact';
  const [now, setNow] = useState(() => Date.now());
  const target = complete ? STEPS.length : pipelineStepToIndex(pipelineStep);
  /**
   * 画面に出している段。実際の進みに追いつくまで、1段ずつ（最低でも MIN_STEP_MS）進める。
   * 開き直したときなど、すでに先の段にいる場合は、最初からその段を出す。
   */
  const [shown, setShown] = useState(() => (complete ? STEPS.length : pipelineStepToIndex(pipelineStep)));

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (shown >= target) return;
    const timer = setTimeout(() => setShown((s) => Math.min(s + 1, target)), MIN_STEP_MS);
    return () => clearTimeout(timer);
  }, [shown, target]);

  const done = shown >= STEPS.length;
  useEffect(() => {
    if (!done || !onDone) return;
    const timer = setTimeout(onDone, DONE_HOLD_MS);
    return () => clearTimeout(timer);
  }, [done, onDone]);

  const stepIndex = Math.min(shown, STEPS.length - 1);
  const elapsed = useMemo(() => formatElapsed(pipelineStartedAt, now), [pipelineStartedAt, now]);
  // 録音のオーブは、整理の段に入ったところで4枚のカードへ変わる
  const morphed = shown >= 1;
  const writing = shown === 2;
  const finishing = shown === 3;
  const linesSolid = shown >= 3;

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
        @keyframes mo-write { 0% { transform: scaleX(0); opacity: .3 } 100% { transform: scaleX(1); opacity: 1 } }
        @keyframes mo-gather {
          0% { transform: translate(var(--sx), var(--sy)) scale(1); opacity: 0 }
          20% { opacity: 1 }
          85% { opacity: .9 }
          100% { transform: translate(0, 0) scale(.2); opacity: 0 }
        }
        @keyframes mo-tag-in { 0% { transform: translateY(6px) scale(.9); opacity: 0 } 100% { transform: none; opacity: 1 } }
        @keyframes mo-check-in { 0% { transform: scale(.4); opacity: 0 } 70% { transform: scale(1.15); opacity: 1 } 100% { transform: scale(1); opacity: 1 } }
        .mo-line { background-image: linear-gradient(90deg, rgba(31,138,133,.10) 0, rgba(31,138,133,.26) 50%, rgba(31,138,133,.10) 100%); background-size: 240px 100%; animation: mo-shimmer 1.5s linear infinite; }
        .mo-line-write { transform-origin: left center; background: rgba(31,138,133,.24); animation: mo-write .8s cubic-bezier(.3,.7,.3,1) both; }
        .mo-line-done { background: rgba(31,138,133,.22); }
        .mo-line-idle { background: rgba(31,138,133,.10); }
        .mo-shard { animation: mo-gather 1.6s ease-in infinite; }
        .mo-tag { animation: mo-tag-in .45s ease-out both; }
        .mo-check { animation: mo-check-in .5s ease-out both; }
        @media (prefers-reduced-motion: reduce) { .mo-line, .mo-line-write, .mo-shard, .mo-tag, .mo-check { animation: none } }
      `}</style>

      <p className="text-[12px] font-semibold tracking-[0.3em] text-aura-teal-500">
        {done ? 'DONE' : `STEP ${stepIndex + 1} / ${STEPS.length}`}
      </p>
      <h2 className={cn('mt-2 font-semibold tracking-tight text-aura-ink', compact ? 'text-xl' : 'text-[28px]')}>
        {done ? '記録ができました。' : 'カルテ原稿を作っています'}
      </h2>
      <p className="mt-2 min-h-[1.5rem] text-sm text-aura-ink-soft">
        {done ? 'S・O・A・P を確認しましょう。' : stageMessage(stopStage, stepIndex)}
      </p>

      {/* オーブ → 4枚のカード。同じ場所で、形だけが変わる */}
      <div className="relative mt-6 flex h-[22rem] w-full flex-col items-center justify-center">
        {/* 整理の段：拾った項目 */}
        <div className="mb-3 flex h-7 flex-wrap items-center justify-center gap-1.5" aria-hidden>
          {shown >= 1 &&
            TAGS.map((tag, i) => (
              <span
                key={tag}
                className={cn(
                  'mo-tag rounded-full px-2.5 py-0.5 text-[11px] font-medium transition-colors duration-500',
                  shown === 1 ? 'bg-aura-mint-100 text-aura-teal-700' : 'bg-aura-mist text-aura-ink-muted',
                )}
                style={{ animationDelay: `${i * 120}ms` }}
              >
                {tag}
              </span>
            ))}
        </div>

        <div className="relative w-full flex-1">
          {/* まとめの段：会話のかけらが、オーブへ集まる */}
          {!morphed && (
            <div aria-hidden className="pointer-events-none absolute inset-0 flex items-center justify-center">
              {SHARDS.map((s, i) => (
                <span
                  key={i}
                  className="mo-shard absolute h-2 rounded-full bg-aura-teal-400/50"
                  style={
                    {
                      width: s.w,
                      animationDelay: `${s.d}ms`,
                      ['--sx' as string]: s.x,
                      ['--sy' as string]: s.y,
                    } as React.CSSProperties
                  }
                />
              ))}
            </div>
          )}

          <div
            aria-hidden
            className={cn(
              'absolute left-1/2 top-1/2 h-40 w-40 -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-br from-aura-cyan-200 via-aura-mint-200 to-aura-teal-400 shadow-[0_24px_60px_-18px_rgba(31,138,133,0.55)]',
              'transition-all duration-700 ease-[cubic-bezier(0.4,0,0.2,1)]',
              morphed ? 'scale-50 opacity-0 blur-md' : 'animate-orb-breathe opacity-100',
            )}
          >
            <div className="absolute inset-[3px] rounded-full bg-gradient-to-b from-white/50 via-transparent to-transparent" />
          </div>

          <div className="absolute inset-0 grid grid-cols-2 content-center gap-3">
            {CARDS.map((card, i) => (
              <div
                key={card.letter}
                className={cn(
                  'rounded-3xl border bg-white/90 p-4 text-left shadow-float',
                  'transition-all duration-700 ease-[cubic-bezier(0.4,0,0.2,1)]',
                  morphed ? 'translate-y-0 scale-100 opacity-100' : 'scale-50 opacity-0',
                  done ? 'border-aura-mint-200 shadow-float-lg' : 'border-white/80',
                  writing && 'border-aura-mint-200',
                )}
                style={{ transitionDelay: morphed ? `${i * 90}ms` : '0ms' }}
              >
                <div className="flex items-center gap-2.5">
                  <span
                    className={cn(
                      'flex h-8 w-8 items-center justify-center rounded-xl text-[13px] font-bold transition-colors duration-500',
                      done || finishing ? 'bg-aura-teal-500 text-white' : 'bg-aura-mint-100 text-aura-teal-600',
                    )}
                  >
                    {done || finishing ? (
                      <Check key={finishing ? 'f' : 'd'} className="mo-check h-4 w-4" style={{ animationDelay: finishing ? `${i * 260}ms` : '0ms' }} />
                    ) : (
                      card.letter
                    )}
                  </span>
                  <span className="text-[11px] font-medium tracking-wide text-aura-ink-muted">{card.title}</span>
                </div>
                <div className="mt-3.5 space-y-2">
                  {card.lines.map((w, j) => (
                    <div
                      key={j}
                      className={cn(
                        'h-2.5 rounded-full',
                        linesSolid ? 'mo-line-done' : writing ? 'mo-line-write' : 'mo-line-idle',
                      )}
                      style={{ width: w, animationDelay: writing ? `${(i * 3 + j) * 200}ms` : undefined }}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 4つの段。今どこを作っているかが、ひと目で分かる */}
      <ol className="mt-6 flex w-full items-start" aria-label="作成の段階">
        {STEPS.map((step, i) => {
          const finished = i < shown || done;
          const current = i === stepIndex && !done;
          return (
            <li key={step.key} className="relative flex flex-1 flex-col items-center">
              {i > 0 && (
                <span
                  aria-hidden
                  className={cn(
                    'absolute right-1/2 top-[13px] h-0.5 w-full -translate-y-1/2 transition-colors duration-500',
                    i <= shown || done ? 'bg-aura-teal-400' : 'bg-aura-line',
                  )}
                />
              )}
              <span
                className={cn(
                  'relative flex h-[26px] w-[26px] items-center justify-center rounded-full text-[11px] font-semibold transition-all duration-500',
                  finished
                    ? 'bg-aura-teal-500 text-white'
                    : current
                      ? 'bg-white text-aura-teal-600 ring-2 ring-aura-teal-400'
                      : 'bg-aura-mist text-aura-ink-muted',
                )}
              >
                {current && <span className="absolute inset-0 animate-ping rounded-full bg-aura-teal-300/40" />}
                <span className="relative">{finished ? <Check className="h-3.5 w-3.5" /> : i + 1}</span>
              </span>
              <span
                className={cn(
                  'mt-2 px-1 text-[12px] leading-tight transition-colors duration-500',
                  finished ? 'text-aura-teal-600' : current ? 'font-semibold text-aura-ink' : 'text-aura-ink-muted',
                )}
              >
                {step.label}
              </span>
            </li>
          );
        })}
      </ol>

      <p className="mt-5 text-[13px] text-aura-ink-muted">
        経過 <span className="font-mono tabular-nums text-aura-ink-soft" aria-label="経過時間">{elapsed}</span>
      </p>
    </section>
  );
}
