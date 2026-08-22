'use client';

import { useEffect, useState } from 'react';
import { formatDuration } from '@medical-os/shared';
import { Mic, Pause, Play, Square } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
  const compact = density === 'compact';

  useEffect(() => {
    void api
      .healthAi()
      .then((h) => setOpenAi(isOpenAiMode(h)))
      .catch(() => {});
  }, []);

  const live = state === 'recording' || state === 'paused';

  return (
    <section
      className={cn(
        'flex flex-col items-center justify-center rounded-[2rem] px-6 text-[#f3efe4] shadow-[0_40px_80px_-40px_rgba(12,47,44,0.8)]',
        compact ? 'min-h-[62dvh]' : 'min-h-[72dvh]',
        'bg-[radial-gradient(circle_at_50%_30%,#1a5c55,transparent_55%),linear-gradient(180deg,#0c2f2c,#071c1a)]',
      )}
    >
      <div className={cn('relative mb-8 flex items-center justify-center', compact ? 'h-28 w-28' : 'h-40 w-40')}>
        {state === 'recording' && (
          <>
            <span className="absolute inset-0 animate-pulse-ring rounded-full bg-red-400/40" />
            <span className="absolute inset-6 animate-pulse rounded-full bg-red-500/20" />
          </>
        )}
        <span
          className={cn(
            'relative flex items-center justify-center rounded-full text-white',
            compact ? 'h-16 w-16' : 'h-24 w-24',
            state === 'paused' ? 'bg-amber-500' : 'bg-red-600 shadow-[0_0_40px_rgba(220,38,38,0.45)]',
          )}
        >
          {state === 'paused' ? <Pause className={compact ? 'h-7 w-7' : 'h-10 w-10'} /> : <Mic className={compact ? 'h-7 w-7' : 'h-10 w-10'} />}
        </span>
      </div>

      <p className="text-xs font-semibold tracking-[0.35em] text-red-200">
        {state === 'paused' ? 'PAUSED' : live ? 'RECORDING' : 'READY'}
      </p>
      <p className={cn('mt-2 font-mono font-light tabular-nums tracking-tight', compact ? 'text-5xl' : 'text-6xl min-[480px]:text-7xl')}>
        {formatDuration(seconds)}
      </p>
      <p className="mt-4 text-sm text-[#c9ddd8]">{caseName}</p>

      {pendingChunks > 0 && (
        <Alert variant="warning" className="mt-4 w-full max-w-md">
          未送信チャンク: {pendingChunks}
        </Alert>
      )}
      {limitReached && (
        <Alert variant="error" className="mt-4 w-full max-w-md">
          録音上限（60分）に達したため終了しました
        </Alert>
      )}
      {live && seconds >= 12 * 60 && (
        <Alert variant="error" className="mt-4 w-full max-w-md">
          録音が12分を超えています。試験運用では10分前後を目安に区切ると安定します。必要なら一度終了してSOAPを作り、続きは別診療で録ってください。
        </Alert>
      )}
      {live && seconds >= 8 * 60 && seconds < 12 * 60 && (
        <Alert variant="warning" className="mt-4 w-full max-w-md">
          録音8分経過。長時間は文字起こし失敗のリスクが上がります。区切りの良いところで終了を検討してください。
        </Alert>
      )}

      {!openAi && preview && live && (
        <p className="mt-4 max-w-md text-center text-xs leading-relaxed text-[#c9ddd8]">{preview}</p>
      )}

      <div className="mt-10 flex w-full max-w-md flex-col gap-3">
        {state === 'idle' && (
          <>
            <label className="flex w-full cursor-pointer items-start gap-3 rounded-2xl border border-white/15 bg-white/5 px-4 py-3.5 text-sm leading-relaxed text-[#d5e6e1]">
              <input
                type="checkbox"
                className="mt-0.5 h-4 w-4 rounded accent-[#e8c98a]"
                checked={consentGiven}
                onChange={(e) => onConsentChange(e.target.checked)}
              />
              <span>患者の同意を得た上で診療音声を記録します。音声はSOAP生成後に削除されます。</span>
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
            <Button variant="secondary" size="lg" className="flex-1 rounded-full" icon={<Pause />} onClick={onPause}>
              一時停止
            </Button>
            <Button size="lg" variant="danger" className="flex-1 rounded-full" icon={<Square />} onClick={onStop}>
              終了
            </Button>
          </div>
        )}
        {state === 'paused' && (
          <div className="flex w-full gap-2">
            <Button variant="secondary" size="lg" className="flex-1 rounded-full" icon={<Play />} onClick={onResume}>
              再開
            </Button>
            <Button size="lg" variant="danger" className="flex-1 rounded-full" icon={<Square />} onClick={onStop}>
              終了
            </Button>
          </div>
        )}
      </div>
    </section>
  );
}
