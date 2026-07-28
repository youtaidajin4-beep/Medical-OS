'use client';

import { useEffect, useState } from 'react';
import { formatDuration } from '@medical-os/shared';
import { Mic, Pause, Play, Square } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Alert } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api-client';
import { isOpenAiMode } from '@/lib/ai-status';

type RecordingPhaseProps = {
  caseName: string;
  state: 'idle' | 'recording' | 'paused' | 'stopped';
  seconds: number;
  preview: string;
  pendingChunks: number;
  limitReached: boolean;
  consentGiven: boolean;
  onConsentChange: (value: boolean) => void;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
  density?: 'compact' | 'full';
};

/* Decorative sound-level bars shown while recording */
const BAR_DELAYS = ['0ms', '150ms', '300ms', '100ms', '250ms', '50ms', '200ms'];

function SoundBars({ active }: { active: boolean }) {
  return (
    <div className="flex h-8 items-center gap-1" aria-hidden>
      {BAR_DELAYS.map((delay, i) => (
        <span
          key={i}
          className={cn(
            'w-1 rounded-full bg-brand-500 transition-all',
            active ? 'h-full origin-center animate-sound-bar' : 'h-1.5 bg-slate-300',
          )}
          style={active ? { animationDelay: delay } : undefined}
        />
      ))}
    </div>
  );
}

function MicVisual({ state }: { state: RecordingPhaseProps['state'] }) {
  const recording = state === 'recording';
  const paused = state === 'paused';
  return (
    <div className="relative flex h-28 w-28 items-center justify-center">
      {recording && (
        <>
          <span className="absolute inset-0 animate-pulse-ring rounded-full bg-red-400/40" />
          <span
            className="absolute inset-0 animate-pulse-ring rounded-full bg-red-400/30"
            style={{ animationDelay: '0.5s' }}
          />
        </>
      )}
      <div
        className={cn(
          'relative flex h-24 w-24 items-center justify-center rounded-full shadow-lg transition-colors',
          recording && 'bg-red-500 text-white shadow-red-500/30',
          paused && 'bg-amber-400 text-white shadow-amber-400/30',
          !recording && !paused && 'bg-slate-100 text-slate-400',
        )}
      >
        {paused ? <Pause className="h-10 w-10" /> : <Mic className="h-10 w-10" />}
      </div>
    </div>
  );
}

export function RecordingPhase({
  caseName,
  state,
  seconds,
  preview,
  pendingChunks,
  limitReached,
  consentGiven,
  onConsentChange,
  onStart,
  onPause,
  onResume,
  onStop,
  density = 'full',
}: RecordingPhaseProps) {
  const [openAi, setOpenAi] = useState(false);
  const [showPreview, setShowPreview] = useState(density !== 'compact');
  const compact = density === 'compact';

  useEffect(() => {
    void api.healthAi().then((h) => setOpenAi(isOpenAiMode(h))).catch(() => {});
  }, []);

  return (
    <div className={cn('mx-auto flex flex-col gap-4', compact ? 'max-w-md gap-3' : 'max-w-2xl gap-6')}>
      <div>
        <p className="text-xs text-slate-500 sm:text-sm">{caseName}</p>
        <h1
          className={cn(
            'font-bold tracking-tight text-slate-900',
            compact ? 'text-lg' : 'text-2xl',
          )}
        >
          診療中
        </h1>
      </div>

      <Card>
        <CardContent
          className={cn(
            'flex flex-col items-center gap-4',
            compact ? 'py-6' : 'gap-6 py-10',
          )}
        >
          {!compact && <MicVisual state={state} />}
          {compact && (
            <div
              className={cn(
                'flex h-14 w-14 items-center justify-center rounded-full',
                state === 'recording' && 'bg-red-500 text-white',
                state === 'paused' && 'bg-amber-400 text-white',
                state !== 'recording' && state !== 'paused' && 'bg-slate-100 text-slate-400',
              )}
            >
              {state === 'paused' ? <Pause className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
            </div>
          )}

          <div
            className={cn(
              'inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium sm:px-4 sm:py-1.5 sm:text-sm',
              state === 'recording' && 'bg-red-50 text-red-700 ring-1 ring-red-200',
              state === 'paused' && 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
              state !== 'recording' && state !== 'paused' && 'bg-slate-100 text-slate-600',
            )}
          >
            {state === 'recording' && (
              <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" />
            )}
            {state === 'recording' ? '録音中' : state === 'paused' ? '一時停止中' : '待機中'}
          </div>

          <div className="flex flex-col items-center gap-2">
            <p
              className={cn(
                'font-mono font-semibold tabular-nums tracking-tight text-slate-900',
                compact ? 'text-3xl' : 'text-5xl',
              )}
            >
              {formatDuration(seconds)}
            </p>
            {!compact && <SoundBars active={state === 'recording'} />}
          </div>

          {pendingChunks > 0 && (
            <Alert variant="warning" className="w-full">
              未送信チャンク: {pendingChunks}
            </Alert>
          )}
          {limitReached && (
            <Alert variant="error" className="w-full">
              録音上限（60分）に達したため終了しました
            </Alert>
          )}

          {(openAi || preview) && (
            <div className="w-full">
              {compact ? (
                <button
                  type="button"
                  className="mb-1 text-xs font-medium text-brand-600"
                  onClick={() => setShowPreview((v) => !v)}
                >
                  {showPreview ? '文字起こしを閉じる' : '文字起こしを表示'}
                </button>
              ) : null}
              {(!compact || showPreview) && (
                <div className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 sm:px-4 sm:py-3">
                  <p className="mb-1 text-xs font-medium text-slate-400">
                    {openAi ? '文字起こし' : 'リアルタイムプレビュー'}
                  </p>
                  <p className="whitespace-pre-line text-sm leading-relaxed text-slate-700">
                    {openAi
                      ? '診療終了後に文字起こしします。録音中はプレビューを表示しません。'
                      : preview}
                  </p>
                </div>
              )}
            </div>
          )}

          <div className="flex w-full flex-col gap-3">
            {state === 'idle' && (
              <>
                <label className="flex w-full items-start gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs text-slate-700 sm:gap-3 sm:px-4 sm:py-3 sm:text-sm">
                  <input
                    type="checkbox"
                    className="mt-0.5 h-4 w-4 rounded border-slate-300 text-brand-600"
                    checked={consentGiven}
                    onChange={(e) => onConsentChange(e.target.checked)}
                  />
                  <span>
                    患者の同意を得た上で診療音声を記録します。音声はSOAP生成後に削除されます。
                  </span>
                </label>
                <Button
                  size="lg"
                  variant="danger"
                  className="w-full rounded-full"
                  icon={<Mic />}
                  disabled={!consentGiven}
                  onClick={onStart}
                >
                  録音開始
                </Button>
              </>
            )}
            {state === 'recording' && (
              <div className="flex w-full gap-2">
                <Button variant="secondary" size="lg" className="flex-1" icon={<Pause />} onClick={onPause}>
                  一時停止
                </Button>
                <Button size="lg" className="flex-1" icon={<Square />} onClick={onStop}>
                  終了
                </Button>
              </div>
            )}
            {state === 'paused' && (
              <div className="flex w-full gap-2">
                <Button variant="secondary" size="lg" className="flex-1" icon={<Play />} onClick={onResume}>
                  再開
                </Button>
                <Button size="lg" className="flex-1" icon={<Square />} onClick={onStop}>
                  終了
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
