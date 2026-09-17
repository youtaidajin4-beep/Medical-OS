/**
 * 診察室のマイク入力の設定。
 *
 * 2026-09-05、谷口先生から「マイクを近くに置いてボリュームを100にしても、
 * すべての音声を拾いきれていないように思う」という報告があった。
 * 原因は録音をブラウザ任せにしていたこと。`getUserMedia({ audio: true })` だけだと
 * Chromeの既定で echoCancellation / noiseSuppression / autoGainControl が全部オンになる。
 * この3つはWeb会議（1人が近くで喋る）向けの処理で、医師と患者が離れて座る診察室では
 * 遠いほうの声＝患者の声をノイズとして削ってしまう。入力ボリュームを上げても
 * ブラウザ側で削られるので届かない。
 *
 * さらに、デバイスを指定していなかったため、外付けマイクを置いてもOS既定
 * （ノートPCの内蔵マイク）で録っている可能性があった。
 *
 * ここでは「診察室で2人の声を素のまま録る」ための制約を組み立てる。
 */

/** 選んだマイクを次の診療でも使うために覚えておくキー */
export const MIC_DEVICE_STORAGE_KEY = 'kushima.mic-device-id';

export type AudioInputDevice = {
  deviceId: string;
  label: string;
};

/**
 * 診察室向けの getUserMedia 制約。
 *
 * 3つの音声処理をすべて切る。deviceId を渡したときは、そのマイクを必ず使う
 * （`exact` にしないと、ブラウザが勝手に別のマイクへフォールバックして
 * 「選んだはずなのに内蔵マイクで録れていた」が再発する）。
 */
export function buildAudioConstraints(deviceId?: string | null): MediaStreamConstraints {
  const audio: MediaTrackConstraints = {
    echoCancellation: false,
    noiseSuppression: false,
    autoGainControl: false,
    channelCount: 1,
  };
  if (deviceId) {
    audio.deviceId = { exact: deviceId };
  }
  return { audio };
}

/**
 * `exact` 指定のマイクが使えなくなっていた（抜かれた・別の端末で開いた）ときの制約。
 * デバイス指定だけを落とし、音声処理オフはそのまま維持する。
 * ここでブラウザ任せの `{ audio: true }` に戻すと、患者の声が削られる状態へ逆戻りする。
 */
export function buildFallbackAudioConstraints(): MediaStreamConstraints {
  return buildAudioConstraints(null);
}

/** 指定したマイクが見つからない種類のエラーか（フォールバックしてよいか） */
export function isDeviceUnavailableError(error: unknown): boolean {
  const name = (error as { name?: string } | null)?.name;
  return (
    name === 'OverconstrainedError' ||
    name === 'NotFoundError' ||
    name === 'ConstraintNotSatisfiedError'
  );
}

/**
 * 実際に適用された音声処理の設定を読み出す。
 * ブラウザによっては制約を黙って無視するため、「切ったつもりで切れていない」を
 * 画面で確かめられるようにする。
 */
export function readAppliedAudioSettings(track: MediaStreamTrack | undefined | null): {
  deviceId?: string;
  label?: string;
  processingDisabled: boolean;
} {
  if (!track) return { processingDisabled: false };
  const settings = (track.getSettings?.() ?? {}) as MediaTrackSettings;
  const processingDisabled =
    settings.echoCancellation !== true &&
    settings.noiseSuppression !== true &&
    settings.autoGainControl !== true;
  return {
    deviceId: settings.deviceId,
    label: track.label || undefined,
    processingDisabled,
  };
}

/** 端末につながっているマイクの一覧。ラベルは許可を出したあとでないと空で返る。 */
export async function listAudioInputs(): Promise<AudioInputDevice[]> {
  if (typeof navigator === 'undefined' || !navigator.mediaDevices?.enumerateDevices) return [];
  const devices = await navigator.mediaDevices.enumerateDevices();
  return devices
    .filter((d) => d.kind === 'audioinput')
    .map((d, i) => ({
      deviceId: d.deviceId,
      label: d.label || `マイク ${i + 1}`,
    }));
}

export function loadPreferredDeviceId(): string | null {
  try {
    return window.localStorage.getItem(MIC_DEVICE_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function savePreferredDeviceId(deviceId: string | null): void {
  try {
    if (deviceId) window.localStorage.setItem(MIC_DEVICE_STORAGE_KEY, deviceId);
    else window.localStorage.removeItem(MIC_DEVICE_STORAGE_KEY);
  } catch {
    // プライベートブラウジング等で書けなくても録音自体は続けられる
  }
}

/**
 * 波形サンプル（0〜255、128が無音）から入力レベルを 0〜1 で出す。
 * RMSを使う（ピークだと一瞬の物音で振り切れて、声が入っているように見えてしまう）。
 */
export function computeLevel(samples: Uint8Array | number[]): number {
  if (!samples.length) return 0;
  let sumSquares = 0;
  for (let i = 0; i < samples.length; i += 1) {
    const centered = ((samples[i] ?? 128) - 128) / 128;
    sumSquares += centered * centered;
  }
  const rms = Math.sqrt(sumSquares / samples.length);
  // 生のRMSは声でも0.05前後にしかならず、そのままバーにすると動いて見えない。
  // 会話の音量帯（RMS 0.01〜0.3）が目で追える範囲に伸ばす。
  return Math.min(1, rms * 4);
}

/** 声が入っていると言えるレベル。空調やタイピング音はこの下に収まる。 */
export const VOICE_LEVEL_THRESHOLD = 0.08;

export type MicVerdict = 'silent' | 'faint' | 'ok';

/**
 * 直近の入力レベルから、録音を始めてよいかを判定する。
 * 谷口先生が「患者さんの声が拾えているか」を録り始める前に自分の目で確認できるようにするための判定。
 *
 * @param peakLevel 直近の観測窓でのレベルの最大値（0〜1）
 */
export function judgeMicLevel(peakLevel: number): MicVerdict {
  if (peakLevel < 0.02) return 'silent';
  if (peakLevel < VOICE_LEVEL_THRESHOLD) return 'faint';
  return 'ok';
}

export function micVerdictMessage(verdict: MicVerdict): string {
  switch (verdict) {
    case 'silent':
      return '音がまったく入っていません。マイクが選ばれているか、ミュートになっていないかを確認してください。';
    case 'faint':
      return '音が小さすぎます。患者さんの位置から話してもらい、バーが緑まで振れるかを確認してください。マイクを患者さん寄りに置くと改善します。';
    case 'ok':
      return '声が拾えています。';
  }
}
