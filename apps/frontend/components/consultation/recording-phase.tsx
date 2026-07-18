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
}: RecordingPhaseProps) {
  const [openAi, setOpenAi] = useState(false);

  useEffect(() => {
    void api.healthAi().then((h) => setOpenAi(isOpenAiMode(h))).catch(() => {});
  }, []);

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div>
        <p className="text-sm text-slate-500">{caseName}</p>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">診療中</h1>
      </div>

      <Card>
        <CardContent className="flex flex-col items-center gap-6 py-10">
          <MicVisual state={state} />

          <div
            className={cn(
              'inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium',
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
            <p className="font-mono text-5xl font-semibold tabular-nums tracking-tight text-slate-900">
              {formatDuration(seconds)}
            </p>
            <SoundBars active={state === 'recording'} />
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
            <div className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="mb-1 text-xs font-medium text-slate-400">
                {openAi ? '文字起こし' : 'リアルタイムプレビュー'}
              </p>
              <p className="whitespace-pre-line text-sm leading-relaxed text-slate-700">
                {openAi
                  ? '診療終了後に OpenAI Whisper で文字起こしします。録音中はプレビューを表示しません。'
                  : preview}
              </p>
            </div>
          )}

          <div className="flex flex-wrap justify-center gap-3">
            {state === 'idle' && (
              <>
                <label className="flex w-full max-w-md items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    className="mt-0.5 h-4 w-4 rounded border-slate-300 text-brand-600"
                    checked={consentGiven}
                    onChange={(e) => onConsentChange(e.target.checked)}
                  />
                  <span>
                    患者の同意を得た上で診療音声を記録します。音声はSOAP生成後に削除され、文字起こしと下書きのみ保存されます。
                  </span>
                </label>
                <Button
                  size="lg"
                  variant="danger"
                  className="rounded-full px-10"
                  icon={<Mic />}
                  disabled={!consentGiven}
                  onClick={onStart}
                >
                  録音開始
                </Button>
              </>
            )}
            {state === 'recording' && (
              <>
                <Button variant="secondary" size="lg" icon={<Pause />} onClick={onPause}>
                  一時停止
                </Button>
                <Button size="lg" icon={<Square />} onClick={onStop}>
                  診療を終了
                </Button>
              </>
            )}
            {state === 'paused' && (
              <>
                <Button variant="secondary" size="lg" icon={<Play />} onClick={onResume}>
                  再開
                </Button>
                <Button size="lg" icon={<Square />} onClick={onStop}>
                  診療を終了
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
