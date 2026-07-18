'use client';

import { useEffect, useState } from 'react';
import { AudioLines, Brain, Check, FileAudio, Loader2, Sparkles } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api-client';
import { isOpenAiMode } from '@/lib/ai-status';

const MOCK_STEPS = [
  { label: '音声を結合中', icon: FileAudio },
  { label: '文字起こし中', icon: AudioLines },
  { label: '下書きを生成中', icon: Sparkles },
] as const;

const OPENAI_STEPS = [
  { label: '音声を結合中', icon: FileAudio },
  { label: 'Whisper で文字起こし中', icon: AudioLines },
  { label: '診療データを整理中', icon: Brain },
  { label: 'SOAP を作成中', icon: Sparkles },
] as const;

export function ProcessingPhase() {
  const [stepIndex, setStepIndex] = useState(0);
  const [openAi, setOpenAi] = useState(false);

  useEffect(() => {
    void api.healthAi().then((h) => setOpenAi(isOpenAiMode(h))).catch(() => {});
  }, []);

  const steps = openAi ? OPENAI_STEPS : MOCK_STEPS;
  const intervalMs = openAi ? 4000 : 900;

  useEffect(() => {
    setStepIndex(0);
    const timer = setInterval(() => {
      setStepIndex((i) => Math.min(i + 1, steps.length - 1));
    }, intervalMs);
    return () => clearInterval(timer);
  }, [steps.length, intervalMs]);

  const progress = ((stepIndex + 0.5) / steps.length) * 100;

  return (
    <div className="mx-auto flex max-w-lg flex-col items-center gap-8 py-16">
      <div className="relative flex h-20 w-20 items-center justify-center">
        <span className="absolute inset-0 animate-pulse-ring rounded-full bg-brand-400/30" />
        <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-brand-600 text-white shadow-lg shadow-brand-600/25">
          <Loader2 className="h-7 w-7 animate-spin" />
        </div>
      </div>

      <div className="text-center">
        <h1 className="text-xl font-bold tracking-tight text-slate-900">AI が処理しています</h1>
        <p className="mt-2 text-sm text-slate-600">
          {openAi
            ? '実音声の文字起こしと SOAP 下書きの生成には30秒〜2分かかることがあります'
            : '文字起こしと SOAP 下書きの生成を行っています'}
        </p>
      </div>

      <Card className="w-full">
        <CardContent className="space-y-5 py-5">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-brand-500 transition-all duration-700 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>

          <ul className="space-y-3">
            {steps.map(({ label, icon: Icon }, i) => {
              const done = i < stepIndex;
              const current = i === stepIndex;
              return (
                <li key={label} className="flex items-center gap-3">
                  <span
                    className={cn(
                      'flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition-colors',
                      done && 'bg-emerald-100 text-emerald-600',
                      current && 'bg-brand-100 text-brand-600',
                      !done && !current && 'bg-slate-100 text-slate-400',
                    )}
                  >
                    {done ? (
                      <Check className="h-4 w-4 animate-scale-in" />
                    ) : current ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Icon className="h-4 w-4" />
                    )}
                  </span>
                  <span
                    className={cn(
                      'text-sm transition-colors',
                      done && 'text-slate-500 line-through decoration-slate-300',
                      current && 'font-medium text-slate-900',
                      !done && !current && 'text-slate-400',
                    )}
                  >
                    {label}
                  </span>
                </li>
              );
            })}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
