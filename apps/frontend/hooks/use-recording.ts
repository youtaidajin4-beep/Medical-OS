'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { formatDuration } from '@medical-os/shared';
import { api } from '@/lib/api-client';
import {
  enqueueChunk,
  listPendingChunks,
  removeChunk,
  sha256Hex,
  updateChunkAttempts,
} from '@/lib/chunk-queue';
import {
  buildAudioConstraints,
  buildFallbackAudioConstraints,
  isDeviceUnavailableError,
  judgeMicLevel,
  readAppliedAudioSettings,
  type MicVerdict,
} from '@/lib/audio-input';
import { createLevelMeter, type LevelMeter } from '@/lib/level-meter';

type RecordingState = 'idle' | 'recording' | 'paused' | 'stopped';
const MAX_RECORDING_SECONDS = 60 * 60;
const CHUNK_MS = 3000;

function pickRecorderMimeType(): string | undefined {
  const candidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'];
  return candidates.find((type) => MediaRecorder.isTypeSupported(type));
}

export function useRecording(consultationId: string, deviceId?: string | null) {
  const [state, setState] = useState<RecordingState>('idle');
  const [seconds, setSeconds] = useState(0);
  const [pendingChunks, setPendingChunks] = useState(0);
  const [limitReached, setLimitReached] = useState(false);
  /** 録音中の入力レベル（0〜1）。診療の最中に「入っていない」に気づけるようにする */
  const [level, setLevel] = useState(0);
  /** 直近2秒の判定。silent のまま録り続けると、あとで白紙のSOAPが出てくる */
  const [micVerdict, setMicVerdict] = useState<MicVerdict>('ok');
  const [micLabel, setMicLabel] = useState<string | null>(null);
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const meter = useRef<LevelMeter | null>(null);
  const meterPoll = useRef<ReturnType<typeof setInterval> | null>(null);
  const localBlobs = useRef<Blob[]>([]);
  const recorderMimeType = useRef('audio/webm');
  const sequence = useRef(0);
  const inFlightUploads = useRef<Promise<void>[]>([]);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const retryTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const stopRef = useRef<(() => Promise<void>) | null>(null);

  const refreshPendingCount = useCallback(async () => {
    const pending = await listPendingChunks(consultationId);
    setPendingChunks(pending.length);
  }, [consultationId]);

  const uploadChunk = useCallback(
    (blob: Blob, seq: number) => {
      const task = (async () => {
        const checksum = await sha256Hex(blob);
        const id = `${consultationId}-${seq}`;
        try {
          await api.uploadChunk(consultationId, seq, blob, checksum);
          await removeChunk(id).catch(() => undefined);
          await refreshPendingCount();
        } catch {
          await enqueueChunk({
            id,
            consultationId,
            sequenceNumber: seq,
            blob,
            checksum,
            attempts: 0,
            createdAt: Date.now(),
          });
          await refreshPendingCount();
        }
      })();
      inFlightUploads.current.push(task);
      void task.finally(() => {
        inFlightUploads.current = inFlightUploads.current.filter((p) => p !== task);
      });
      return task;
    },
    [consultationId, refreshPendingCount],
  );

  const flushPendingChunks = useCallback(
    async (force = false) => {
      const pending = await listPendingChunks(consultationId);
      for (const chunk of pending) {
        if (!force) {
          const delayMs = Math.min(30_000, 1000 * 2 ** chunk.attempts);
          if (Date.now() - chunk.createdAt < delayMs) continue;
        }
        try {
          await api.uploadChunk(
            chunk.consultationId,
            chunk.sequenceNumber,
            chunk.blob,
            chunk.checksum,
          );
          await removeChunk(chunk.id);
        } catch {
          await updateChunkAttempts(chunk.id, chunk.attempts + 1);
        }
      }
      await refreshPendingCount();
    },
    [consultationId, refreshPendingCount],
  );

  const uploadFinalBlob = useCallback(async () => {
    const blobs = localBlobs.current;
    if (!blobs.length) return;
    const finalBlob = new Blob(blobs, { type: recorderMimeType.current });
    if (finalBlob.size === 0) return;
    const checksum = await sha256Hex(finalBlob);
    await api.uploadFinalRecording(consultationId, finalBlob, checksum);
  }, [consultationId, seconds]);

  const stopMeter = useCallback(() => {
    if (meterPoll.current) clearInterval(meterPoll.current);
    meterPoll.current = null;
    meter.current?.stop();
    meter.current = null;
    setLevel(0);
  }, []);

  const stop = useCallback(async () => {
    return new Promise<void>((resolve) => {
      const recorder = mediaRecorder.current;
      if (!recorder) {
        stopMeter();
        resolve();
        return;
      }
      recorder.onstop = async () => {
        if (timer.current) clearInterval(timer.current);
        stopMeter();
        recorder.stream.getTracks().forEach((t) => t.stop());
        setState('stopped');
        await Promise.allSettled(inFlightUploads.current);
        await flushPendingChunks(true);
        try {
          await uploadFinalBlob();
        } catch {
          // final blob upload failed; pipeline may still use chunks
        }
        await api.stopRecording(consultationId);
        resolve();
      };
      if (recorder.state !== 'inactive') {
        recorder.requestData();
        recorder.stop();
      }
    });
  }, [consultationId, flushPendingChunks, stopMeter, uploadFinalBlob]);

  stopRef.current = stop;

  const start = useCallback(async () => {
    // ブラウザ任せの getUserMedia({ audio: true }) は、エコーキャンセル・ノイズ抑制・
    // 自動ゲインが全部オンになり、診察室で離れて座る患者の声をノイズとして削る。
    // 診察室向けの制約（3つともオフ＋マイクの明示指定）で開き直す。
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia(buildAudioConstraints(deviceId));
    } catch (e) {
      // 選んでいたマイクが使えない時だけ、デバイス指定を外して開き直す（処理オフは維持）
      if (!isDeviceUnavailableError(e)) throw e;
      stream = await navigator.mediaDevices.getUserMedia(buildFallbackAudioConstraints());
    }
    setMicLabel(readAppliedAudioSettings(stream.getAudioTracks()[0]).label ?? null);

    // 録音中もレベルを出し続ける。20分喋ったあとで「入っていなかった」が一番痛い
    stopMeter();
    const levelMeter = createLevelMeter(stream);
    meter.current = levelMeter;
    setMicVerdict('ok');
    meterPoll.current = setInterval(() => {
      setLevel(levelMeter.level());
      setMicVerdict(judgeMicLevel(levelMeter.peak()));
    }, 200);

    const mimeType = pickRecorderMimeType();
    recorderMimeType.current = mimeType ?? 'audio/webm';
    const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
    mediaRecorder.current = recorder;
    localBlobs.current = [];
    sequence.current = 0;
    setLimitReached(false);

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        localBlobs.current.push(e.data);
        const seq = sequence.current++;
        void uploadChunk(e.data, seq);
      }
    };

    recorder.start(CHUNK_MS);
    await api.startRecording(consultationId);
    setState('recording');
    timer.current = setInterval(() => {
      setSeconds((s) => {
        const next = s + 1;
        if (next >= MAX_RECORDING_SECONDS) {
          setLimitReached(true);
          void stopRef.current?.();
        }
        return next;
      });
    }, 1000);
    await flushPendingChunks(true);
  }, [consultationId, deviceId, stopMeter, uploadChunk, flushPendingChunks]);

  const pause = useCallback(() => {
    mediaRecorder.current?.pause();
    setState('paused');
    if (timer.current) clearInterval(timer.current);
  }, []);

  const resume = useCallback(() => {
    mediaRecorder.current?.resume();
    setState('recording');
    timer.current = setInterval(() => {
      setSeconds((s) => {
        const next = s + 1;
        if (next >= MAX_RECORDING_SECONDS) {
          setLimitReached(true);
          void stopRef.current?.();
        }
        return next;
      });
    }, 1000);
  }, []);

  useEffect(() => {
    void refreshPendingCount();
    retryTimer.current = setInterval(() => {
      void flushPendingChunks();
    }, 5000);
    return () => {
      if (timer.current) clearInterval(timer.current);
      if (retryTimer.current) clearInterval(retryTimer.current);
      stopMeter();
      mediaRecorder.current?.stream.getTracks().forEach((t) => t.stop());
    };
  }, [flushPendingChunks, refreshPendingCount, stopMeter]);

  return {
    state,
    seconds,
    pendingChunks,
    limitReached,
    level,
    micVerdict,
    micLabel,
    start,
    pause,
    resume,
    stop,
    formatDuration,
  };
}
