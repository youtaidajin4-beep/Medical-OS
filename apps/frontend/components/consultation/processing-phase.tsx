'use client';

import { useEffect, useMemo, useState } from 'react';
import { AudioLines, Brain, Check, ClipboardList, FileAudio, Loader2, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

const STEPS = [
  { label: '音声を結合中', icon: FileAudio },
  { label: '文字起こし中', icon: AudioLines },
  { label: '診療データを整理中', icon: Brain },
  { label: 'SOAP を作成中', icon: Sparkles },
  { label: '診療記録を作成中', icon: ClipboardList },
] as const;

function pipelineStepToIndex(step: string | null | undefined): number {
  if (!step) return 0;
  switch (step) {
    case 'pipeline_start':
    case 'assemble_started':
      return 0;
    case 'stt_started':
    case 'stt_complete':
      return 1;
    case 'dict_correction_complete':
    case 'medical_knowledge_complete':
    case 'llm_correction_started':
    case 'llm_correction_complete':
    case 'extract_started':
    case 'extract_complete':
      return 2;
    case 'soap_started':
    case 'soap_progress':
      return 3;
    case 'soap_complete':
    case 'note_progress':
    case 'note_complete':
    case 'pipeline_complete':
      return 4;
    default:
      return 0;
  }
}

function formatElapsed(startedAt: string | null | undefined): string | null {
  if (!startedAt) return null;
  const ms = Date.now() - new Date(startedAt).getTime();
  if (!Number.isFinite(ms) || ms < 0) return null;
  const sec = Math.floor(ms / 1000);
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return m > 0 ? `${m}分${s}秒` : `${s}秒`;
}

export function ProcessingPhase({
  density = 'full',
  pipelineStep = null,
  pipelineStartedAt = null,
}: {
  density?: 'compact' | 'full';
  pipelineStep?: string | null;
  pipelineStartedAt?: string | null;
}) {
  const compact = density === 'compact';
  const [tick, setTick] = useState(0);
  const [fallbackIndex, setFallbackIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  // Until the first real step arrives, nudge slowly so the screen does not look frozen.
  useEffect(() => {
    if (pipelineStep) return;
    const timer = setInterval(() => {
      setFallbackIndex((i) => Math.min(i + 1, 1));
    }, 8000);
    return () => clearInterval(timer);
  }, [pipelineStep]);

  const stepIndex = pipelineStep ? pipelineStepToIndex(pipelineStep) : fallbackIndex;
  const progress = ((stepIndex + 0.55) / STEPS.length) * 100;
  const elapsed = useMemo(() => formatElapsed(pipelineStartedAt), [pipelineStartedAt, tick]);

  return (
    <section className="flex min-h-[62dvh] flex-col items-center justify-center gap-5 text-center">
      <div className="h-12 w-12 animate-spin rounded-full border-4 border-[#c9ddd8] border-t-[#0c2f2c]" />
      <p className={cn('font-semibold text-[#0c2f2c]', compact ? 'text-base' : 'text-lg')}>
        文字起こしと SOAP を作成中
      </p>
      <p className="max-w-sm text-sm leading-relaxed text-slate-500">
        音声を文字にし、内科の言葉に寄せています。
        <br />
        録音が長い場合は数分かかることがあります。
      </p>
      {elapsed && (
        <p className="text-xs font-medium tracking-wide text-[#6f8f88]">経過 {elapsed}</p>
      )}
      <div className="h-1.5 w-full max-w-sm overflow-hidden rounded-full bg-[#d7e2dd]">
        <div
          className="h-full rounded-full bg-[#0c2f2c] transition-all duration-700 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>
      <ul className="w-full max-w-sm space-y-2 text-left">
        {STEPS.map(({ label, icon: Icon }, i) => {
          const done = i < stepIndex;
          const current = i === stepIndex;
          return (
            <li key={label} className="flex items-center gap-3">
              <span
                className={cn(
                  'flex h-7 w-7 shrink-0 items-center justify-center rounded-full',
                  done && 'bg-emerald-100 text-emerald-600',
                  current && 'bg-[#0c2f2c] text-[#e8c98a]',
                  !done && !current && 'bg-[#e8eee9] text-slate-400',
                )}
              >
                {done ? (
                  <Check className="h-4 w-4" />
                ) : current ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Icon className="h-4 w-4" />
                )}
              </span>
              <span className={cn('text-sm', current ? 'font-medium text-[#0c2f2c]' : 'text-slate-500')}>
                {label}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
