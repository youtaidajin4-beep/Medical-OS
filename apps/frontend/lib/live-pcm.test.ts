import {
  DEFAULT_CUTTER,
  encodeWav,
  LIVE_SAMPLE_RATE,
  Resampler,
  SegmentCutter,
} from './live-pcm';

/** 16kHz・ms ミリ秒ぶんの、振幅 amp の一定の音（RMS = amp） */
function tone(ms: number, amp: number): Float32Array {
  const n = Math.round((LIVE_SAMPLE_RATE * ms) / 1000);
  return new Float32Array(n).fill(amp);
}

describe('SegmentCutter', () => {
  it('声が続いたあとの無音で区切る', () => {
    const cutter = new SegmentCutter();
    // 声 3秒 → 無音 0.6秒
    const out = [...cutter.push(tone(3000, 0.1)), ...cutter.push(tone(600, 0))];
    expect(out).toHaveLength(1);
    expect(out[0]!.startMs).toBeLessThan(400);
    expect(out[0]!.endMs - out[0]!.startMs).toBeGreaterThanOrEqual(DEFAULT_CUTTER.minMs);
  });

  it('短すぎる間では切らない（言葉の途中のためらいを区切りにしない）', () => {
    const cutter = new SegmentCutter();
    // 声 1秒 → 無音 0.6秒 → 声 1秒（合わせて2.6秒だが、最初の無音の時点ではminMs未満）
    const out = [
      ...cutter.push(tone(1000, 0.1)),
      ...cutter.push(tone(600, 0)),
      ...cutter.push(tone(1000, 0.1)),
    ];
    expect(out).toHaveLength(0);
  });

  it('無音を待たずに喋り続けても、上限で区切る', () => {
    const cutter = new SegmentCutter();
    const out = cutter.push(tone(10_000, 0.1));
    expect(out).toHaveLength(1);
    const ms = out[0]!.endMs - out[0]!.startMs;
    expect(ms).toBeLessThanOrEqual(DEFAULT_CUTTER.maxMs + 40);
  });

  it('声がまったく無い時間は区間にしない', () => {
    const cutter = new SegmentCutter();
    expect(cutter.push(tone(20_000, 0))).toHaveLength(0);
    expect(cutter.flush()).toBeNull();
  });

  it('診察が終わったとき、残りの声を返す', () => {
    const cutter = new SegmentCutter();
    expect(cutter.push(tone(1200, 0.1))).toHaveLength(0);
    const rest = cutter.flush();
    expect(rest).not.toBeNull();
    expect(rest!.endMs - rest!.startMs).toBeGreaterThanOrEqual(1100);
  });

  it('0.5秒に満たない物音は、声として送らない', () => {
    const cutter = new SegmentCutter();
    cutter.push(tone(300, 0.1));
    expect(cutter.flush()).toBeNull();
  });

  it('続きを録るときは、前半の長さぶんだけ時刻をずらす', () => {
    const cutter = new SegmentCutter({}, 60_000);
    const out = [...cutter.push(tone(3000, 0.1)), ...cutter.push(tone(600, 0))];
    expect(out[0]!.startMs).toBeGreaterThanOrEqual(60_000);
  });

  it('声の出だしが削れない（始まる前の少しを残す）', () => {
    const cutter = new SegmentCutter();
    cutter.push(tone(5000, 0)); // 長い無音
    const out = [...cutter.push(tone(3000, 0.1)), ...cutter.push(tone(600, 0))];
    expect(out).toHaveLength(1);
    // 声が始まったのは5000ms。切り出しの先頭は、その少し前（preRoll）まで遡っている
    expect(out[0]!.startMs).toBeLessThan(5000);
    expect(out[0]!.startMs).toBeGreaterThanOrEqual(5000 - DEFAULT_CUTTER.preRollMs - 40);
  });
});

describe('Resampler', () => {
  it('48kHz → 16kHz で、長さが3分の1になる', () => {
    const r = new Resampler(48000);
    const out = r.process(new Float32Array(4800).fill(0.5));
    expect(out.length).toBeGreaterThanOrEqual(1599);
    expect(out.length).toBeLessThanOrEqual(1601);
    expect(out[10]).toBeCloseTo(0.5, 3);
  });

  it('ブロックに分けて流しても、1回で流したのとほぼ同じ長さになる', () => {
    const whole = new Resampler(44100).process(new Float32Array(44100));
    const split = new Resampler(44100);
    let n = 0;
    for (let i = 0; i < 10; i++) n += split.process(new Float32Array(4410)).length;
    expect(Math.abs(n - whole.length)).toBeLessThanOrEqual(2);
  });

  it('同じレートなら、そのまま通す', () => {
    const input = new Float32Array([0.1, 0.2]);
    expect(new Resampler(16000).process(input)).toBe(input);
  });
});

describe('encodeWav', () => {
  it('WAVの見出しと長さが正しい', async () => {
    const samples = new Float32Array(1600).fill(0.25);
    const blob = encodeWav(samples);
    expect(blob.size).toBe(44 + 1600 * 2);
    expect(blob.type).toBe('audio/wav');
    const buf = await new Promise<ArrayBuffer>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as ArrayBuffer);
      reader.onerror = () => reject(reader.error);
      reader.readAsArrayBuffer(blob);
    });
    const view = new DataView(buf);
    const tag = (o: number) => String.fromCharCode(...new Uint8Array(buf, o, 4));
    expect(tag(0)).toBe('RIFF');
    expect(tag(8)).toBe('WAVE');
    expect(view.getUint32(24, true)).toBe(16000);
    expect(view.getUint16(22, true)).toBe(1);
  });
});
