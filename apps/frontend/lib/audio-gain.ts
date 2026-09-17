/**
 * 入力音量をこちら側で持ち上げる。
 *
 * 2026-09-17、診察室向けにブラウザの自動ゲイン（autoGainControl）を切った。
 * 切ったのは正しい — あれは「近くで1人が喋る」前提の処理で、医師が近くで喋ると
 * 全体の増幅を下げ、離れて座る患者の声を聞こえなくしてしまうため。
 *
 * ただし切ったぶん、**小さい声は小さいまま入る**ようになった。その結果
 * 「音が小さすぎます」が出やすくなっている。ブラウザ任せの自動調整には戻さず、
 * 代わりに自分たちで増幅する。こうすれば「医師が喋ったから患者の声が下がる」は起きない。
 *
 * 大事なのは、**メーターだけでなく録音される音そのものを持ち上げる**こと。
 * 表示だけ上げても、文字起こしへ渡る音は小さいままで何も解決しない。
 */

/** 選んだ増幅率を次の診療でも使うために覚えておくキー */
export const MIC_GAIN_STORAGE_KEY = 'kushima.mic-gain';

/** 医師が選べる増幅率 */
export const GAIN_CHOICES = [1, 2, 4, 8] as const;

export type GainSetting = 'auto' | (typeof GAIN_CHOICES)[number];

/** 増幅しすぎると空調音まで持ち上がるので上限を置く */
export const MAX_GAIN = 8;

/**
 * 自動のとき狙うレベル。`computeLevel` のスケールで、
 * 「はっきり声が入っている」と判定される 0.08 に対して十分な余裕がある位置。
 */
const TARGET_PEAK = 0.35;

/** これ未満のピークは無音とみなし、増幅率の計算に使わない（空調だけを増幅しても意味がない） */
const MIN_PEAK_FOR_SUGGESTION = 0.005;

/**
 * 観測したピークから、適切な増幅率を求める。
 * 1未満（もともと十分大きい）にはしない。音を絞るのはこの機能の仕事ではない。
 */
export function suggestGain(rawPeak: number): number {
  if (rawPeak < MIN_PEAK_FOR_SUGGESTION) return 1;
  const raw = TARGET_PEAK / rawPeak;
  if (!Number.isFinite(raw)) return 1;
  return Math.min(MAX_GAIN, Math.max(1, Math.round(raw * 10) / 10));
}

/** 設定と観測ピークから、実際に掛ける増幅率を決める */
export function resolveGain(setting: GainSetting, rawPeak: number): number {
  return setting === 'auto' ? suggestGain(rawPeak) : setting;
}

export function loadPreferredGain(): GainSetting {
  try {
    const raw = window.localStorage.getItem(MIC_GAIN_STORAGE_KEY);
    if (!raw || raw === 'auto') return 'auto';
    const value = Number(raw);
    return (GAIN_CHOICES as readonly number[]).includes(value)
      ? (value as GainSetting)
      : 'auto';
  } catch {
    return 'auto';
  }
}

export function savePreferredGain(setting: GainSetting): void {
  try {
    window.localStorage.setItem(MIC_GAIN_STORAGE_KEY, String(setting));
  } catch {
    // プライベートブラウジング等で書けなくても録音は続けられる
  }
}

export type BoostedStream = {
  /** MediaRecorder へ渡す、増幅後のストリーム */
  stream: MediaStream;
  setGain: (gain: number) => void;
  stop: () => void;
};

type AudioContextCtor = typeof AudioContext;

function getAudioContextCtor(): AudioContextCtor | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as {
    AudioContext?: AudioContextCtor;
    webkitAudioContext?: AudioContextCtor;
  };
  return w.AudioContext ?? w.webkitAudioContext ?? null;
}

/**
 * マイクのストリームを増幅したストリームを作る。
 *
 * source → gain → limiter → destination
 *
 * リミッターを挟むのは、医師がマイクの近くで喋ったときに増幅ぶんが振り切れて
 * 音が割れるのを防ぐため。割れた音は文字起こしで化ける。
 * 小さい音はそのまま増幅され、大きい音だけが頭を押さえられる。
 *
 * WebAudio が使えない環境では、増幅せず元のストリームをそのまま返す
 * （録れなくなるより、増幅なしで録れるほうがよい）。
 */
export function createBoostedStream(stream: MediaStream, initialGain: number): BoostedStream {
  const Ctor = getAudioContextCtor();
  if (!Ctor || typeof AudioContext === 'undefined') {
    return { stream, setGain: () => undefined, stop: () => undefined };
  }

  let context: AudioContext;
  try {
    context = new Ctor();
  } catch {
    return { stream, setGain: () => undefined, stop: () => undefined };
  }

  const source = context.createMediaStreamSource(stream);
  const gainNode = context.createGain();
  gainNode.gain.value = Math.min(MAX_GAIN, Math.max(1, initialGain));

  const limiter = context.createDynamicsCompressor();
  limiter.threshold.value = -6;
  limiter.knee.value = 0;
  limiter.ratio.value = 20;
  limiter.attack.value = 0.003;
  limiter.release.value = 0.15;

  const destination = context.createMediaStreamDestination();
  source.connect(gainNode);
  gainNode.connect(limiter);
  limiter.connect(destination);
  // スピーカーへはつながない。診察室でハウリングする。

  return {
    stream: destination.stream,
    setGain: (gain: number) => {
      const next = Math.min(MAX_GAIN, Math.max(1, gain));
      try {
        gainNode.gain.setTargetAtTime(next, context.currentTime, 0.05);
      } catch {
        gainNode.gain.value = next;
      }
    },
    stop: () => {
      try {
        source.disconnect();
        gainNode.disconnect();
        limiter.disconnect();
      } catch {
        // 既に切れていることがある
      }
      void context.close().catch(() => undefined);
    },
  };
}

/** バーと判定に使う、増幅後の見かけのレベル */
export function boostedLevel(rawLevel: number, gain: number): number {
  return Math.min(1, rawLevel * gain);
}
