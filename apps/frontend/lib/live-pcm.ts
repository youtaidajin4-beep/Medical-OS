/**
 * 診察中のリアルタイム書き起こしのための、音声の切り出し。
 *
 * 録音そのもの（MediaRecorder）は、3秒ごとの断片が「前の断片の続き」になっていて、1つだけでは
 * 再生も文字起こしもできない。そこで録音とは別に、マイクの音を直接受けて、**声の切れ目で区切った
 * 単独で完結する短い音声（WAV）**を作る。区切りが言葉の途中に当たると、その言葉は聞き取れなくなるので、
 * 無音が続いたところを探して切る。
 */

export const LIVE_SAMPLE_RATE = 16000;

export type CutterOptions = {
  /** これより短い区間は、無音が続いても切らない（短すぎると文脈が足りず誤認識が増える） */
  minMs: number;
  /** これを超えたら、無音を待たず切る（長く喋り続けても、文字が出ない時間を作らない） */
  maxMs: number;
  /** 区切りとみなす無音の長さ */
  silenceMs: number;
  /** 1フレーム（20ms）のRMSがこれ以上なら「声がある」 */
  speechRms: number;
  /** 声が始まる前に残しておく長さ。出だしを削らない */
  preRollMs: number;
  /** 1区間のうち「声がある」フレームが、これ（ms）に満たなければ送らない */
  minSpeechMs: number;
  /** 1区間のうち「声がある」フレームの割合が、これに満たなければ送らない（雑音だけの区間を弾く） */
  minSpeechRatio: number;
  /** 雑音の床の何倍を超えたら「声」とみなすか */
  noiseMargin: number;
};

export const DEFAULT_CUTTER: CutterOptions = {
  minMs: 2500,
  maxMs: 9000,
  silenceMs: 450,
  speechRms: 0.012,
  preRollMs: 300,
  minSpeechMs: 240,
  minSpeechRatio: 0.12,
  noiseMargin: 2.2,
};

/** 雑音の水準がどれだけ高くても、これ以上のRMSは必ず「声」と数える */
const MAX_SPEECH_THRESHOLD = 0.05;

export type PcmSegment = {
  samples: Float32Array;
  startMs: number;
  endMs: number;
};

const FRAME_SAMPLES = (LIVE_SAMPLE_RATE * 20) / 1000;

function rms(frame: Float32Array): number {
  let sum = 0;
  for (let i = 0; i < frame.length; i++) sum += frame[i]! * frame[i]!;
  return Math.sqrt(sum / Math.max(1, frame.length));
}

/**
 * 16kHzの音を流し込むと、声の切れ目で区切った区間を返す。
 * 声がまったく無い時間は区間にしない（送らない）。無音をモデルへ渡すと定型句の幻聴が出るため。
 */
export class SegmentCutter {
  private readonly opts: CutterOptions;
  private frames: Float32Array[] = [];
  private pending = new Float32Array(0);
  /** これまでに流し込んだ全サンプル数（時刻の基準） */
  private consumed = 0;
  /** frames[0] の先頭が、全体の何サンプル目か */
  private segmentStart = 0;
  private hasSpeech = false;
  private silenceRun = 0;
  private speechFrames = 0;
  /** 直近のフレームのRMS（雑音の床を求める。約3秒ぶん） */
  private recentRms: number[] = [];

  constructor(options: Partial<CutterOptions> = {}, private readonly offsetMs = 0) {
    this.opts = { ...DEFAULT_CUTTER, ...options };
  }

  private bufferedMs(): number {
    return (this.frames.length * FRAME_SAMPLES * 1000) / LIVE_SAMPLE_RATE;
  }

  /**
   * いまの雑音の床。直近約6秒のうち、いちばん静かな側10%の平均。
   *
   * 入力は増幅してから受けている（自動で最大8倍）。空調や衣擦れまで持ち上がるので、
   * 固定のしきい値だけでは「ずっと声がある」ことになり、雑音を延々と文字にしてしまう。
   *
   * 床は**保守的に**見積もる。会話には必ず間（文と文のあいだ）があり、そこが本当の雑音の水準。
   * 平均や中央値を使うと、大きい声の医師のあとに続く小さな患者さんの声を雑音と誤判定する。
   */
  private noiseFloor(): number {
    if (this.recentRms.length < 25) return 0;
    const sorted = [...this.recentRms].sort((a, b) => a - b);
    const k = Math.max(1, Math.floor(sorted.length * 0.1));
    return sorted.slice(0, k).reduce((a, b) => a + b, 0) / k;
  }

  /**
   * 声とみなす水準。雑音の床の数倍。ただし上限を置く：
   * 増幅後の小さな声（RMS 0.05前後）は、雑音の水準がどうであれ、必ず声として数える。
   */
  private speechThreshold(): number {
    // 録り始めの最初の0.5秒は、雑音の水準がまだ分からない。このあいだは、はっきり大きい音だけを声とする
    // （分からないまま低いしきい値を使うと、録り始めの雑音を声として送ってしまう）
    if (this.recentRms.length < 25) return MAX_SPEECH_THRESHOLD;
    const adaptive = this.noiseFloor() * this.opts.noiseMargin;
    return Math.min(MAX_SPEECH_THRESHOLD, Math.max(this.opts.speechRms, adaptive));
  }

  private toMs(sample: number): number {
    return this.offsetMs + Math.round((sample * 1000) / LIVE_SAMPLE_RATE);
  }

  push(input: Float32Array): PcmSegment[] {
    const out: PcmSegment[] = [];
    const merged = new Float32Array(this.pending.length + input.length);
    merged.set(this.pending, 0);
    merged.set(input, this.pending.length);

    let pos = 0;
    while (pos + FRAME_SAMPLES <= merged.length) {
      const frame = merged.subarray(pos, pos + FRAME_SAMPLES);
      pos += FRAME_SAMPLES;
      this.consumed += FRAME_SAMPLES;
      const level = rms(frame);
      const speech = level >= this.speechThreshold();
      this.recentRms.push(level);
      if (this.recentRms.length > 300) this.recentRms.shift();

      if (!this.hasSpeech && !speech) {
        // 声が始まる前は、出だし用の少しだけを残して捨てる
        this.frames.push(frame.slice());
        const keep = Math.ceil((this.opts.preRollMs * LIVE_SAMPLE_RATE) / 1000 / FRAME_SAMPLES);
        while (this.frames.length > keep) {
          this.frames.shift();
          this.segmentStart += FRAME_SAMPLES;
        }
        continue;
      }

      this.frames.push(frame.slice());
      if (speech) {
        this.hasSpeech = true;
        this.speechFrames += 1;
        this.silenceRun = 0;
      } else {
        this.silenceRun += 20;
      }

      const ms = this.bufferedMs();
      const silentEnough = this.hasSpeech && this.silenceRun >= this.opts.silenceMs;
      if ((ms >= this.opts.minMs && silentEnough) || ms >= this.opts.maxMs) {
        const seg = this.cut();
        if (seg) out.push(seg);
      }
    }
    this.pending = merged.slice(pos);
    return out;
  }

  /** 残っている区間を返す（診察が終わったとき・一時停止したとき） */
  flush(): PcmSegment | null {
    return this.hasSpeech ? this.cut() : this.reset();
  }

  private reset(): null {
    this.frames = [];
    this.hasSpeech = false;
    this.silenceRun = 0;
    this.speechFrames = 0;
    this.segmentStart = this.consumed;
    return null;
  }

  private cut(): PcmSegment | null {
    const frames = this.frames;
    const startSample = this.segmentStart;
    const endSample = startSample + frames.length * FRAME_SAMPLES;
    const samples = new Float32Array(frames.length * FRAME_SAMPLES);
    frames.forEach((f, i) => samples.set(f, i * FRAME_SAMPLES));
    const speechFrames = this.speechFrames;
    this.frames = [];
    this.hasSpeech = false;
    this.silenceRun = 0;
    this.speechFrames = 0;
    this.segmentStart = endSample;
    // 短すぎる区間（0.5秒未満）は声と呼べない（咳・物音）。送っても幻聴のもとになる
    if ((samples.length * 1000) / LIVE_SAMPLE_RATE < 500) return null;
    // 声のあるフレームが少なすぎる区間（雑音・息づかい・物音だけ）も送らない。
    // 声が無い区間をモデルへ渡すと、渡したヒントをそのまま書き出す
    const speechMs = speechFrames * 20;
    const ratio = speechFrames / Math.max(1, frames.length);
    if (speechMs < this.opts.minSpeechMs || ratio < this.opts.minSpeechRatio) return null;
    return { samples, startMs: this.toMs(startSample), endMs: this.toMs(endSample) };
  }
}

/**
 * 入力のサンプルレートを16kHzへ。線形補間。
 * ブロックの継ぎ目で音が途切れないよう、前のブロックの最後の1点と、次に出す位置を引き継ぐ。
 */
export class Resampler {
  /** 直前のブロックの最後のサンプル（継ぎ目の補間に使う） */
  private last = 0;
  /** 次に出す点の位置。[last, ...input] の上で数える */
  private position = 0;

  constructor(private readonly inRate: number, private readonly outRate = LIVE_SAMPLE_RATE) {}

  process(input: Float32Array): Float32Array {
    if (this.inRate === this.outRate || input.length === 0) return input;
    const ratio = this.inRate / this.outRate;
    const out: number[] = [];
    let t = this.position;
    const at = (i: number) => (i === 0 ? this.last : input[i - 1]!);
    // 補間には i と i+1 が要る。[last, ...input] の長さは input.length + 1
    while (t < input.length) {
      const i = Math.floor(t);
      const frac = t - i;
      const a = at(i);
      const b = at(i + 1);
      out.push(a + (b - a) * frac);
      t += ratio;
    }
    this.position = t - input.length;
    this.last = input[input.length - 1]!;
    return Float32Array.from(out);
  }
}

/** Float32（-1〜1）→ 16bit PCM の WAV。単独で再生・文字起こしできる */
export function encodeWav(samples: Float32Array, sampleRate = LIVE_SAMPLE_RATE): Blob {
  const bytes = 2;
  const buffer = new ArrayBuffer(44 + samples.length * bytes);
  const view = new DataView(buffer);
  const writeStr = (offset: number, s: string) => {
    for (let i = 0; i < s.length; i++) view.setUint8(offset + i, s.charCodeAt(i));
  };
  writeStr(0, 'RIFF');
  view.setUint32(4, 36 + samples.length * bytes, true);
  writeStr(8, 'WAVE');
  writeStr(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * bytes, true);
  view.setUint16(32, bytes, true);
  view.setUint16(34, 16, true);
  writeStr(36, 'data');
  view.setUint32(40, samples.length * bytes, true);
  let offset = 44;
  for (let i = 0; i < samples.length; i++, offset += bytes) {
    const s = Math.max(-1, Math.min(1, samples[i]!));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  return new Blob([buffer], { type: 'audio/wav' });
}

export type LiveSegment = { wav: Blob; startMs: number; endMs: number };

export type LiveTap = {
  pause: () => void;
  resume: () => void;
  /** 残りの区間を出して止める */
  stop: () => void;
};

/**
 * マイクの音（増幅後のストリーム）を受けて、区間ができるたびに onSegment を呼ぶ。
 * 録音とは独立しているので、ここが失敗しても録音は続く。
 */
export function startLiveTap(
  stream: MediaStream,
  onSegment: (segment: LiveSegment) => void,
  options: { offsetMs?: number; cutter?: Partial<CutterOptions> } = {},
): LiveTap | null {
  const Ctor: typeof AudioContext | undefined =
    typeof AudioContext !== 'undefined'
      ? AudioContext
      : (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;

  let context: AudioContext;
  try {
    context = new Ctor();
  } catch {
    return null;
  }

  const cutter = new SegmentCutter(options.cutter, options.offsetMs ?? 0);
  const resampler = new Resampler(context.sampleRate);
  let paused = false;

  const emit = (seg: PcmSegment | null) => {
    if (!seg) return;
    onSegment({ wav: encodeWav(seg.samples), startMs: seg.startMs, endMs: seg.endMs });
  };

  const source = context.createMediaStreamSource(stream);
  // ScriptProcessor は古い仕組みだが、Chromeで確実に動き、診察のあいだ止まらない
  const processor = context.createScriptProcessor(4096, 1, 1);
  const mute = context.createGain();
  mute.gain.value = 0;
  processor.onaudioprocess = (e) => {
    if (paused) return;
    const input = e.inputBuffer.getChannelData(0);
    for (const seg of cutter.push(resampler.process(new Float32Array(input)))) emit(seg);
  };
  source.connect(processor);
  processor.connect(mute);
  // 出力につなぐのは、ScriptProcessor を動かし続けるため。音は mute で消してあるのでスピーカーには出ない
  mute.connect(context.destination);

  return {
    pause: () => {
      emit(cutter.flush());
      paused = true;
    },
    resume: () => {
      paused = false;
    },
    stop: () => {
      paused = true;
      emit(cutter.flush());
      try {
        processor.disconnect();
        source.disconnect();
        mute.disconnect();
      } catch {
        // すでに切れていてよい
      }
      void context.close().catch(() => undefined);
    },
  };
}
