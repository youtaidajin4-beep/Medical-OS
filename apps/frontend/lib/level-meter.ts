import { computeLevel } from './audio-input';

export type LevelMeter = {
  /** 直近のレベル（0〜1）。バーの長さに使う */
  level: () => number;
  /** 観測窓（既定2秒）の最大レベル。判定に使う */
  peak: () => number;
  stop: () => void;
};

type AudioContextCtor = typeof AudioContext;

function getAudioContextCtor(): AudioContextCtor | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as { AudioContext?: AudioContextCtor; webkitAudioContext?: AudioContextCtor };
  return w.AudioContext ?? w.webkitAudioContext ?? null;
}

/**
 * マイクのストリームから入力レベルを読み続ける。
 * 「録音ボタンを押す前に、患者さんの声が拾えているかを目で確認する」ための計測で、
 * 音声そのものには一切手を加えない（録るのは常に素の音）。
 *
 * @param peakWindowMs ピークを保持する時間。短すぎると判定が揺れ、長すぎると直した効果が見えない
 */
export function createLevelMeter(stream: MediaStream, peakWindowMs = 2000): LevelMeter {
  const Ctor = getAudioContextCtor();
  if (!Ctor) {
    return { level: () => 0, peak: () => 0, stop: () => undefined };
  }

  const context = new Ctor();
  const source = context.createMediaStreamSource(stream);
  const analyser = context.createAnalyser();
  analyser.fftSize = 1024;
  source.connect(analyser);
  // 出力（スピーカー）へはつながない。つなぐと診察室でハウリングする。

  const buffer = new Uint8Array(analyser.fftSize);
  let current = 0;
  const recent: Array<{ at: number; level: number }> = [];
  let frame: number | null = null;
  let stopped = false;

  const tick = () => {
    if (stopped) return;
    analyser.getByteTimeDomainData(buffer);
    current = computeLevel(buffer);
    const now = Date.now();
    recent.push({ at: now, level: current });
    while (recent.length && now - (recent[0]?.at ?? now) > peakWindowMs) recent.shift();
    frame = requestAnimationFrame(tick);
  };
  frame = requestAnimationFrame(tick);

  return {
    level: () => current,
    peak: () => recent.reduce((max, s) => (s.level > max ? s.level : max), 0),
    stop: () => {
      stopped = true;
      if (frame !== null) cancelAnimationFrame(frame);
      try {
        source.disconnect();
      } catch {
        // 既に切れていることがある
      }
      void context.close().catch(() => undefined);
    },
  };
}
