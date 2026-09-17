'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  buildAudioConstraints,
  buildFallbackAudioConstraints,
  isDeviceUnavailableError,
  judgeMicLevel,
  listAudioInputs,
  loadPreferredDeviceId,
  readAppliedAudioSettings,
  savePreferredDeviceId,
  type AudioInputDevice,
  type MicVerdict,
} from '@/lib/audio-input';
import { createLevelMeter, type LevelMeter } from '@/lib/level-meter';
import {
  boostedLevel,
  loadPreferredGain,
  resolveGain,
  savePreferredGain,
  type GainSetting,
} from '@/lib/audio-gain';

/**
 * 録音を始める前に「どのマイクで録るか」を選び、「患者さんの声が拾えているか」を
 * 自分の目で確認するための仕組み。
 *
 * @param enabled 録音前（idle）のあいだだけ true。録音中はマイクを二重に掴まないよう止める
 */
export function useMicCheck(enabled: boolean) {
  const [devices, setDevices] = useState<AudioInputDevice[]>([]);
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [level, setLevel] = useState(0);
  const [verdict, setVerdict] = useState<MicVerdict>('silent');
  const [activeLabel, setActiveLabel] = useState<string | null>(null);
  const [processingDisabled, setProcessingDisabled] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // 自動ゲインを切ったぶん、こちらで持ち上げる。表示も判定も増幅後の値で見る
  const [gainSetting, setGainSetting] = useState<GainSetting>('auto');
  const [appliedGain, setAppliedGain] = useState(1);
  const gainSettingRef = useRef<GainSetting>('auto');
  const streamRef = useRef<MediaStream | null>(null);
  const meterRef = useRef<LevelMeter | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    setDeviceId(loadPreferredDeviceId());
    const saved = loadPreferredGain();
    setGainSetting(saved);
    gainSettingRef.current = saved;
  }, []);

  const selectGain = useCallback((next: GainSetting) => {
    savePreferredGain(next);
    gainSettingRef.current = next;
    setGainSetting(next);
  }, []);

  const teardown = useCallback(() => {
    meterRef.current?.stop();
    meterRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = null;
    setLevel(0);
  }, []);

  const selectDevice = useCallback((next: string | null) => {
    savePreferredDeviceId(next);
    setDeviceId(next);
  }, []);

  useEffect(() => {
    if (!enabled) {
      teardown();
      return;
    }
    let cancelled = false;

    (async () => {
      try {
        let stream: MediaStream;
        try {
          stream = await navigator.mediaDevices.getUserMedia(buildAudioConstraints(deviceId));
        } catch (e) {
          // 選んでいたマイクが抜かれている等。音声処理オフは維持したままデバイス指定だけ外す
          if (!isDeviceUnavailableError(e)) throw e;
          stream = await navigator.mediaDevices.getUserMedia(buildFallbackAudioConstraints());
        }
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        setError(null);

        const applied = readAppliedAudioSettings(stream.getAudioTracks()[0]);
        setActiveLabel(applied.label ?? null);
        setProcessingDisabled(applied.processingDisabled);

        // 許可が出たあとでないとデバイス名が空で返るため、ここで一覧を取り直す
        const found = await listAudioInputs();
        if (!cancelled) setDevices(found);

        const meter = createLevelMeter(stream);
        meterRef.current = meter;
        pollRef.current = setInterval(() => {
          // 増幅率は素のピークから決める。増幅後の値から決めると、上げた結果を見て
          // また上げる、という追いかけっこになる
          const gain = resolveGain(gainSettingRef.current, meter.peak());
          setAppliedGain(gain);
          setLevel(boostedLevel(meter.level(), gain));
          setVerdict(judgeMicLevel(boostedLevel(meter.peak(), gain)));
        }, 100);
      } catch (e) {
        if (cancelled) return;
        const name = (e as { name?: string })?.name;
        setError(
          name === 'NotAllowedError'
            ? 'マイクの使用が許可されていません。ブラウザのアドレスバーのマイク許可を「許可」にしてください。'
            : 'マイクを開けませんでした。他のアプリがマイクを使っていないか確認してください。',
        );
      }
    })();

    return () => {
      cancelled = true;
      teardown();
    };
  }, [enabled, deviceId, teardown]);

  return {
    devices,
    deviceId,
    selectDevice,
    level,
    verdict,
    activeLabel,
    processingDisabled,
    error,
    gainSetting,
    appliedGain,
    selectGain,
  };
}
