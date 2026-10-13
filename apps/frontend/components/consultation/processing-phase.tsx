'use client';

import { useEffect, useMemo, useState } from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { StopStage } from '@/hooks/use-recording';

/**
 * 診察を終えてから、カルテ原稿ができるまでの画面。
 *
 * 見せたいのは「いま何が起きているか」。診察中の文字から書く速い経路でも、録音全体から作る
 * 従来の経路でも、4つの段に収まるようにした。段は実際の処理の進みに合わせて進み、
 * 見せかけの進捗は出さない（サーバーからの知らせが無いあいだは、手前の段に留まる）。
 */
const STEPS = [
  { key: 'gather', label: '発話をまとめる', hint: '診察の会話を、ひとつの記録にそろえています' },
  { key: 'organize', label: '診療データを整理', hint: '症状・所見・薬・検査・指導を拾い分けています' },
  { key: 'soap', label: 'S・O・A・P を書く', hint: '会話の内容を、カルテの文章に要約しています' },
  { key: 'finish', label: '診療記録を仕上げる', hint: '最後の確認用の項目を整えています' },
] as const;

const ROWS = [
  { letter: 'S', title: '主観的情報', lines: ['92%', '78%', '54%'] },
  { letter: 'O', title: '客観的情報', lines: ['84%', '61%'] },
  { letter: 'A', title: '評価', lines: ['88%', '47%'] },
  { letter: 'P', title: '計画', lines: ['95%', '72%', '39%'] },
] as const;

function pipelineStepToIndex(step: string | null | undefined, stopStage: StopStage): number {
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
      return stopStage ? 0 : 0;
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
}: {
  density?: 'compact' | 'full';
  pipelineStep?: string | null;
  pipelineStartedAt?: string | null;
  stopStage?: StopStage;
}) {
  const compact = density === 'compact';
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(timer);
  }, []);

  const stepIndex = pipelineStepToIndex(pipelineStep, stopStage);
  const elapsed = useMemo(() => formatElapsed(pipelineStartedAt, now), [pipelineStartedAt, now]);
  const progress = ((stepIndex + 0.5) / STEPS.length) * 100;
  const writing = stepIndex >= 2;
  const done = stepIndex >= 3;

  return (
    <section
      aria-live="polite"
      className={cn(
        'mx-auto flex w-full max-w-xl flex-col items-center gap-6 px-1 text-center',
        compact ? 'py-6' : 'min-h-[62dvh] justify-center py-10',
      )}
    >
      <style>{`
        @keyframes mo-shimmer { 0% { background-position: -240px 0 } 100% { background-position: 240px 0 } }
        @keyframes mo-pulse { 0%,100% { opacity: .55; transform: scale(1) } 50% { opacity: 1; transform: scale(1.06) } }
        @keyframes mo-rise { from { opacity: 0; transform: translateY(8px) } to { opacity: 1; transform: none } }
        .mo-line { background-image: linear-gradient(90deg, rgba(255,255,255,.10) 0, rgba(255,255,255,.34) 50%, rgba(255,255,255,.10) 100%); background-size: 240px 100%; animation: mo-shimmer 1.4s linear infinite; }
        .mo-line-done { background: rgba(255,255,255,.38); animation: none; }
        .mo-line-idle { background: rgba(255,255,255,.12); animation: none; }
        .mo-badge-live { animation: mo-pulse 1.2s ease-in-out infinite; }
        .mo-rise { animation: mo-rise .5s ease-out both; }
        @media (prefers-reduced-motion: reduce) { .mo-line, .mo-badge-live, .mo-rise { animation: none } }
      `}</style>

      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#6f8f88]">診察を終了しました</p>
        <h2 className={cn('mt-2 font-semibold text-[#0c2f2c]', compact ? 'text-lg' : 'text-2xl')}>
          カルテ原稿を作っています
        </h2>
        <p className="mt-2 min-h-[1.5rem] text-sm text-slate-500">{stageMessage(stopStage, stepIndex)}</p>
      </div>

      {/* 書かれていく原稿のイメージ。段が進むほど明るく、書き終えると落ち着く */}
      <div className="w-full overflow-hidden rounded-[28px] bg-gradient-to-b from-[#12433e] to-[#071f1c] p-5 text-left shadow-[0_24px_48px_-24px_rgba(7,31,28,0.7)]">
        <div className="mb-4 flex items-end justify-between">
          <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#8fb3aa]">カルテ原稿</span>
          <span className="font-mono text-2xl tabular-nums text-white" aria-label="経過時間">
            {elapsed}
          </span>
        </div>
        <ul className="space-y-3">
          {ROWS.map((row, i) => {
            const lit = writing || stepIndex >= 1;
            const lineClass = done ? 'mo-line-done' : writing ? 'mo-line' : stepIndex >= 1 ? 'mo-line' : 'mo-line-idle';
            return (
              <li
                key={row.letter}
                className="mo-rise flex items-start gap-3 rounded-2xl bg-white/[0.05] p-3"
                style={{ animationDelay: `${i * 90}ms` }}
              >
                <span
                  className={cn(
                    'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sm font-bold',
                    done ? 'bg-[#e8c98a] text-[#0c2f2c]' : lit ? 'mo-badge-live bg-[#e8c98a] text-[#0c2f2c]' : 'bg-white/10 text-[#8fb3aa]',
                  )}
                  style={lit && !done ? { animationDelay: `${i * 160}ms` } : undefined}
                >
                  {done ? <Check className="h-4 w-4" /> : row.letter}
                </span>
                <div className="flex-1 space-y-2 pt-1">
                  <p className="text-[11px] font-medium text-[#8fb3aa]">{row.title}</p>
                  {row.lines.map((w, j) => (
                    <div
                      key={j}
                      className={cn('h-2.5 rounded-full', lineClass)}
                      style={{ width: w, animationDelay: `${(i * 3 + j) * 120}ms` }}
                    />
                  ))}
                </div>
              </li>
            );
          })}
        </ul>
        <div className="mt-5 h-1 overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-[#e8c98a] transition-all duration-700 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <ol className="grid w-full grid-cols-2 gap-2 sm:grid-cols-4">
        {STEPS.map((step, i) => {
          const complete = i < stepIndex;
          const current = i === stepIndex;
          return (
            <li
              key={step.key}
              className={cn(
                'flex items-center gap-2 rounded-xl border px-3 py-2 text-left text-xs leading-tight transition-colors',
                complete && 'border-emerald-200 bg-emerald-50 text-emerald-800',
                current && 'border-[#0c2f2c] bg-[#0c2f2c] text-white',
                !complete && !current && 'border-[#dbe5e0] bg-white text-slate-400',
              )}
            >
              <span
                className={cn(
                  'flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold',
                  complete && 'bg-emerald-200 text-emerald-800',
                  current && 'bg-[#e8c98a] text-[#0c2f2c]',
                  !complete && !current && 'bg-[#eef3f0] text-slate-400',
                )}
              >
                {complete ? <Check className="h-3 w-3" /> : i + 1}
              </span>
              <span className="font-medium">{step.label}</span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
