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
  const streamRef = useRef<MediaStream | null>(null);
  const meterRef = useRef<LevelMeter | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    setDeviceId(loadPreferredDeviceId());
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
          setLevel(meter.level());
          setVerdict(judgeMicLevel(meter.peak()));
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
  };
}
