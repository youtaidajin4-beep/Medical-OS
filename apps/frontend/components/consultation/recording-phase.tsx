'use client';

import { useEffect, useRef, useState } from 'react';
import { formatDuration } from '@medical-os/shared';
import { ChevronDown, Mic, Pause, Play, Settings2, Square } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import type { GainSetting } from '@/lib/audio-gain';
import { api } from '@/lib/api-client';
import type { LiveLine } from '@/hooks/use-recording';
import { isOpenAiMode } from '@/lib/ai-status';
import {
  micVerdictMessage,
  VOICE_LEVEL_THRESHOLD,
  type AudioInputDevice,
  type MicVerdict,
} from '@/lib/audio-input';

export type MicCheck = {
  devices: AudioInputDevice[];
  deviceId: string | null;
  selectDevice: (deviceId: string | null) => void;
  level: number;
  verdict: MicVerdict;
  activeLabel: string | null;
  processingDisabled: boolean;
  error: string | null;
  /** 入力の増幅。自動ゲインを切ったぶんを、こちらで持ち上げる */
  gainSetting: GainSetting;
  /** いま実際に掛かっている増幅率 */
  appliedGain: number;
  selectGain: (setting: GainSetting) => void;
};

type RecordingPhaseProps = {
  caseName: string;
  state: 'idle' | 'recording' | 'paused' | 'stopped';
  seconds: number;
  preview: string;
  /** 診察中に流れる書き起こし（声の切れ目ごとに足される） */
  liveLines?: LiveLine[];
  pendingChunks: number;
  limitReached: boolean;
  consentGiven: boolean;
  onConsentChange: (value: boolean) => void;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
  /** 録音前のマイク確認。患者の声が拾えているかを録り始める前に見る */
  mic?: MicCheck;
  /** 録音中の入力レベルと判定 */
  liveLevel?: number;
  liveVerdict?: MicVerdict;
  liveMicLabel?: string | null;
  density?: 'compact' | 'full';
};

const VERDICT_FILL: Record<MicVerdict, string> = {
  silent: 'bg-red-500',
  faint: 'bg-amber-400',
  ok: 'bg-emerald-400',
};

/**
 * 入力レベルのバー。目盛りは「ここまで振れれば声が拾えている」の線。
 * 谷口先生が録音を始める前に、患者さんの位置から喋ってもらって確認するためのもの。
 */
function LevelBar({ level, verdict }: { level: number; verdict: MicVerdict }) {
  return (
    <div className="relative h-3 w-full overflow-hidden rounded-full bg-white/15">
      <div
        className={cn('h-full rounded-full transition-[width] duration-75', VERDICT_FILL[verdict])}
        style={{ width: `${Math.round(Math.min(1, level) * 100)}%` }}
      />
      <span
        className="absolute top-0 h-full w-px bg-white/70"
        style={{ left: `${VOICE_LEVEL_THRESHOLD * 100}%` }}
        aria-hidden
      />
    </div>
  );
}


/**
 * 入力の履歴を波形のバーで見せる。
 *
 * 診察の最中に一番知りたいのは「いま声が拾えているか」。数字や1本のバーより、流れていく波形のほうが
 * 無音（バーが平ら）にも、声が小さいこと（バーが低い）にも、一瞬で気づける。
 * 色は判定（verdict）に合わせる：赤＝無音、黄＝小さい、緑＝拾えている。
 */
function WaveBars({
  level,
  verdict,
  active,
}: {
  level: number;
  verdict: MicVerdict;
  active: boolean;
}) {
  const BARS = 56;
  const [history, setHistory] = useState<number[]>(() => Array(BARS).fill(0));
  const levelRef = useRef(level);
  levelRef.current = level;

  useEffect(() => {
    if (!active) return;
    const timer = setInterval(() => {
      setHistory((h) => [...h.slice(1), Math.min(1, levelRef.current)]);
    }, 90);
    return () => clearInterval(timer);
  }, [active]);

  return (
    <div
      className="flex h-16 w-full items-center justify-center gap-[3px]"
      role="img"
      aria-label="入力の波形"
    >
      {history.map((v, i) => (
        <span
          key={i}
          className={cn(
            'w-[4px] rounded-full transition-[height] duration-100',
            VERDICT_FILL[verdict],
          )}
          style={{
            height: `${Math.max(6, Math.round(v * 100))}%`,
            opacity: 0.35 + (i / BARS) * 0.65,
          }}
        />
      ))}
    </div>
  );
}

/**
 * 診察中に流れる書き起こし（右の白い欄）。
 *
 * 声の切れ目ごとに1行ずつ足される（話し終えて数秒後に文字になる）。左が音声、右が文字。
 * ここで見てほしいのは、**患者さんの声まで文字になっているか**。語の取り違えは、
 * 診察後の画面で直せる。診察を終えたとき、この文字からカルテ原稿を作る。
 */
const SPEAKER_CHIP: Record<string, { label: string; className: string }> = {
  physician: { label: '医師', className: 'bg-[#0c2f2c] text-[#e8c98a]' },
  patient: { label: '患者', className: 'bg-[#e8c98a]/40 text-[#5a4410]' },
  other: { label: 'その他', className: 'bg-slate-200 text-slate-600' },
};

function LiveTranscriptPanel({ lines, recording }: { lines: LiveLine[]; recording: boolean }) {
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    endRef.current?.scrollIntoView?.({ block: 'end', behavior: 'smooth' });
  }, [lines]);
  const chars = lines.reduce((n, l) => n + l.text.length, 0);

  return (
    <section
      aria-label="リアルタイム書き起こし"
      className="flex min-h-[22rem] flex-col overflow-hidden rounded-[2rem] border border-clinic-line bg-white shadow-card min-[1024px]:h-[calc(100dvh-8.5rem)] min-[1024px]:min-h-[30rem]"
    >
      <div className="flex items-center gap-2.5 border-b border-clinic-line px-6 py-4">
        <span
          className={cn(
            'h-2 w-2 rounded-full',
            recording ? 'animate-pulse bg-emerald-500' : 'bg-amber-400',
          )}
        />
        <h2 className="text-[13px] font-semibold tracking-[0.12em] text-clinic-ink">
          リアルタイム書き起こし
        </h2>
        <span className="ml-auto text-[11px] text-clinic-ink-muted">
          {recording ? '聞き取り中' : '一時停止中'}
          {chars > 0 ? ` · ${chars}字` : ''}
        </span>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
        {lines.length === 0 ? (
          <div className="flex h-full min-h-[10rem] flex-col items-center justify-center text-center">
            <p className="text-sm text-clinic-ink-muted">話し始めると、ここに文字が流れます</p>
            <p className="mt-1 text-xs text-clinic-ink-muted/70">話し終えて数秒後に出ます</p>
          </div>
        ) : (
          <ul className="space-y-3.5">
            {lines.map((line, i) => (
              <li
                key={line.id}
                className={cn(
                  'text-[15px] leading-relaxed text-clinic-ink',
                  i < lines.length - 4 && 'opacity-70',
                )}
              >
                {line.pending ? (
                  <span className="animate-pulse text-sm text-clinic-ink-muted">聞き取り中…</span>
                ) : line.parts && line.parts.length > 0 ? (
                  <ul className="space-y-1.5">
                    {line.parts.map((part, k) => {
                      const chip = SPEAKER_CHIP[part.speaker];
                      return (
                        <li key={k} className="flex items-baseline gap-2.5">
                          {chip ? (
                            <span
                              className={cn(
                                'inline-flex w-9 shrink-0 justify-center rounded-md px-1 py-0.5 text-[10px] font-semibold',
                                chip.className,
                              )}
                            >
                              {chip.label}
                            </span>
                          ) : (
                            <span className="w-9 shrink-0" />
                          )}
                          <span>{part.text}</span>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  line.text
                )}
              </li>
            ))}
          </ul>
        )}
        <div ref={endRef} />
      </div>
      <p className="border-t border-clinic-line bg-clinic-paper/70 px-6 py-3 text-[11px] leading-relaxed text-clinic-ink-muted">
        診察を終えると、この文字からカルテ原稿を作ります。語の取り違えは、診察後の画面で直せます。
      </p>
    </section>
  );
}

export function RecordingPhase({
  caseName,
  state,
  seconds,
  preview,
  liveLines = [],
  pendingChunks,
  limitReached,
  consentGiven,
  onConsentChange,
  onStart,
  onPause,
  onResume,
  onStop,
  mic,
  liveLevel = 0,
  liveVerdict = 'ok',
  liveMicLabel,
  density = 'full',
}: RecordingPhaseProps) {
  const [openAi, setOpenAi] = useState(false);
  const compact = density === 'compact';
  const [micSettingsOpen, setMicSettingsOpen] = useState(false);
  const [modKey, setModKey] = useState('Ctrl');

  useEffect(() => {
    if (/Mac|iPhone|iPad/.test(navigator.platform)) setModKey('⌘');
  }, []);

  // ⌘/Ctrl + Enter：録音前は「録音開始」、録音中は「診察を終了して要約」
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== 'Enter' || !(e.metaKey || e.ctrlKey)) return;
      if (state === 'idle') {
        if (!consentGiven) return;
        e.preventDefault();
        onStart();
      } else if (state === 'recording' || state === 'paused') {
        e.preventDefault();
        onStop();
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [state, consentGiven, onStart, onStop]);

  useEffect(() => {
    void api
      .healthAi()
      .then((h) => setOpenAi(isOpenAiMode(h)))
      .catch(() => {});
  }, []);

  const live = state === 'recording' || state === 'paused';
  const verdictLabel =
    liveVerdict === 'ok' ? '声が拾えています' : liveVerdict === 'faint' ? '声が小さめです' : '音が入っていません';

  return (
    <div
      className={cn(
        'mx-auto',
        live
          ? 'grid max-w-6xl gap-5 min-[1024px]:grid-cols-[minmax(0,26rem)_minmax(0,1fr)] min-[1024px]:items-start'
          : 'max-w-xl',
      )}
    >
    <section
      className={cn(
        'flex flex-col items-center justify-center rounded-[2rem] px-6 py-10 text-[#f3efe4] shadow-[0_40px_80px_-40px_rgba(12,47,44,0.8)]',
        live ? 'min-[1024px]:h-[calc(100dvh-8.5rem)] min-[1024px]:min-h-[30rem]' : compact ? 'min-h-[62dvh]' : 'min-h-[72dvh]',
        'bg-[radial-gradient(circle_at_50%_20%,#1a5c55,transparent_55%),linear-gradient(180deg,#0c2f2c,#071c1a)]',
      )}
    >
      <div className="flex w-full max-w-md flex-col items-center">
        {/* 状態と患者 */}
        <div className="flex items-center gap-2.5">
          <span
            className={cn(
              'inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-semibold tracking-[0.2em]',
              state === 'paused'
                ? 'bg-amber-400/20 text-amber-200'
                : live
                  ? 'bg-red-500/20 text-red-200'
                  : 'bg-white/10 text-[#c9ddd8]',
            )}
          >
            <span
              className={cn(
                'h-2 w-2 rounded-full',
                state === 'paused'
                  ? 'bg-amber-300'
                  : live
                    ? 'animate-pulse bg-red-400'
                    : 'bg-[#9fc0b9]',
              )}
            />
            {state === 'paused' ? 'PAUSED' : live ? 'RECORDING' : 'READY'}
          </span>
          <span className="text-sm text-[#c9ddd8]">{caseName}</span>
        </div>

        <p
          className={cn(
            'mt-5 font-mono font-light tabular-nums tracking-tight',
            compact ? 'text-5xl' : 'text-6xl min-[480px]:text-7xl',
          )}
        >
          {formatDuration(seconds)}
        </p>

        {/* 録音中：いま声が拾えているかを、波形で見せる */}
        {live && (
          <div className="mt-6 w-full rounded-2xl border border-white/10 bg-white/5 px-4 pb-3 pt-3">
            <WaveBars level={liveLevel} verdict={liveVerdict} active={state === 'recording'} />
            <div className="mt-2 flex items-baseline justify-between gap-3 text-xs text-[#c9ddd8]">
              <span className="flex items-center gap-1.5">
                <span
                  className={cn(
                    'inline-block h-1.5 w-1.5 rounded-full',
                    VERDICT_FILL[liveVerdict],
                  )}
                />
                入力レベル
                <span className="text-[#9fc0b9]">· {verdictLabel}</span>
              </span>
              <span className="truncate text-right text-[#9fc0b9]">{liveMicLabel ?? 'マイク'}</span>
            </div>
          </div>
        )}
        {live && liveVerdict !== 'ok' && (
          <Alert variant="error" className="mt-3 w-full">
            {micVerdictMessage(liveVerdict)}
          </Alert>
        )}

        {pendingChunks > 0 && (
          <Alert variant="warning" className="mt-4 w-full">
            未送信チャンク: {pendingChunks}
          </Alert>
        )}
        {limitReached && (
          <Alert variant="error" className="mt-4 w-full">
            録音上限（60分）に達したため終了しました
          </Alert>
        )}
        {live && seconds >= 12 * 60 && (
          <Alert variant="error" className="mt-4 w-full">
            録音が12分を超えています。試験運用では10分前後を目安に区切ると安定します。必要なら一度終了してSOAPを作り、続きは別診療で録ってください。
          </Alert>
        )}
        {live && seconds >= 8 * 60 && seconds < 12 * 60 && (
          <Alert variant="warning" className="mt-4 w-full">
            録音8分経過。長時間は文字起こし失敗のリスクが上がります。区切りの良いところで終了を検討してください。
          </Alert>
        )}

        {!openAi && preview && live && (
          <p className="mt-4 max-w-md text-center text-xs leading-relaxed text-[#c9ddd8]">{preview}</p>
        )}

        <div className="mt-8 flex w-full flex-col gap-3">
          {state === 'idle' && (
            <>
              {mic && (
                <div className="w-full rounded-2xl border border-white/15 bg-white/5 px-4 py-3.5 text-sm text-[#d5e6e1]">
                  <div className="mb-2.5 flex items-center gap-2">
                    <Mic className="h-4 w-4 text-[#e8c98a]" />
                    <p className="font-semibold text-[#f3efe4]">録音前にマイクを確認する</p>
                    <span className="ml-auto truncate text-[11px] text-[#9fc0b9]">
                      {mic.activeLabel ?? ''}
                    </span>
                  </div>

                  {/* 患者さんの位置から声を出して、バーが白い線を越えるかを見る */}
                  <LevelBar level={mic.level} verdict={mic.verdict} />

                  <p className="mt-2.5 text-xs leading-relaxed text-[#c9ddd8]">
                    患者さんが座る位置から声を出してもらい、バーが白い線を越えて緑になることを確かめてください。
                  </p>

                  {mic.error ? (
                    <Alert variant="error" className="mt-3 w-full">
                      {mic.error}
                    </Alert>
                  ) : (
                    <Alert
                      variant={mic.verdict === 'ok' ? 'success' : 'warning'}
                      className="mt-3 w-full"
                    >
                      {micVerdictMessage(mic.verdict)}
                    </Alert>
                  )}

                  {!mic.processingDisabled && (
                    <Alert variant="warning" className="mt-3 w-full">
                      このブラウザはノイズ抑制を切れませんでした。離れた患者さんの声が削られることがあります。Chromeで開き直してください。
                    </Alert>
                  )}

                  {/* マイクの選択と増幅は、困ったときだけ開く */}
                  <button
                    type="button"
                    onClick={() => setMicSettingsOpen((v) => !v)}
                    aria-expanded={micSettingsOpen}
                    className="mt-3 inline-flex items-center gap-1.5 text-[12px] font-medium text-[#c9ddd8] hover:text-white"
                  >
                    <Settings2 className="h-3.5 w-3.5" />
                    マイクの設定
                    <ChevronDown
                      className={cn('h-3.5 w-3.5 transition-transform', micSettingsOpen && 'rotate-180')}
                    />
                  </button>

                  <div className={cn('mt-3 space-y-3', !micSettingsOpen && 'hidden')}>
                    {mic.devices.length > 0 && (
                      <select
                        className="w-full rounded-xl border border-white/20 bg-[#0c2f2c] px-3 py-2 text-sm text-[#f3efe4]"
                        value={mic.deviceId ?? ''}
                        onChange={(e) => mic.selectDevice(e.target.value || null)}
                        aria-label="使用するマイク"
                      >
                        <option value="">自動（OSの既定のマイク）</option>
                        {mic.devices.map((d) => (
                          <option key={d.deviceId} value={d.deviceId}>
                            {d.label}
                          </option>
                        ))}
                      </select>
                    )}

                    {/* 自動ゲインを切ったぶん、小さい声はこちらで持ち上げる。
                        バーも判定も、ここで選んだ増幅を掛けた後の音で出している */}
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-[11px] text-[#9fc0b9]">入力の増幅</span>
                      {(['auto', 1, 2, 4, 8] as const).map((choice) => {
                        const selected = mic.gainSetting === choice;
                        return (
                          <button
                            key={String(choice)}
                            type="button"
                            className={
                              selected
                                ? 'rounded-full bg-[#e8c98a] px-2.5 py-1 text-[11px] font-semibold text-[#0c2f2c]'
                                : 'rounded-full border border-white/20 px-2.5 py-1 text-[11px] text-[#c9ddd8] hover:bg-white/10'
                            }
                            onClick={() => mic.selectGain(choice)}
                          >
                            {choice === 'auto' ? '自動' : `×${choice}`}
                          </button>
                        );
                      })}
                      <span className="text-[11px] text-[#9fc0b9]">
                        （いま ×{mic.appliedGain.toFixed(1)}）
                      </span>
                    </div>
                    <p className="text-[11px] leading-relaxed text-[#9fc0b9]">
                      小さいままなら増幅を上げてください（録音そのものが大きくなります）。
                    </p>
                  </div>
                </div>
              )}

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
                <kbd className="ml-2 hidden rounded-md bg-white/15 px-1.5 py-0.5 font-sans text-[10px] font-medium min-[640px]:inline">
                  {modKey} ↵
                </kbd>
              </Button>
            </>
          )}

          {live && (
            <>
              {/* 診察が終わったら、これを押すだけ */}
              <Button
                size="lg"
                variant="danger"
                className="w-full rounded-full"
                icon={<Square />}
                onClick={onStop}
              >
                診察を終了して要約
                <kbd className="ml-2 hidden rounded-md bg-white/15 px-1.5 py-0.5 font-sans text-[10px] font-medium min-[640px]:inline">
                  {modKey} ↵
                </kbd>
              </Button>
              <Button
                variant="secondary"
                size="lg"
                className="w-full rounded-full"
                icon={state === 'paused' ? <Play /> : <Pause />}
                onClick={state === 'paused' ? onResume : onPause}
              >
                {state === 'paused' ? '再開' : '一時停止'}
              </Button>
            </>
          )}
        </div>
      </div>
    </section>
    {live && <LiveTranscriptPanel lines={liveLines} recording={state === 'recording'} />}
    </div>
  );
}
