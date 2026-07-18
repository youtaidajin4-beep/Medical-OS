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

type RecordingState = 'idle' | 'recording' | 'paused' | 'stopped';
const MAX_RECORDING_SECONDS = 60 * 60;
const CHUNK_MS = 3000;

export function useRecording(consultationId: string) {
  const [state, setState] = useState<RecordingState>('idle');
  const [seconds, setSeconds] = useState(0);
  const [pendingChunks, setPendingChunks] = useState(0);
  const [limitReached, setLimitReached] = useState(false);
  const mediaRecorder = useRef<MediaRecorder | null>(null);
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

  const flushPendingChunks = useCallback(async () => {
    const pending = await listPendingChunks(consultationId);
    for (const chunk of pending) {
      const delayMs = Math.min(30_000, 1000 * 2 ** chunk.attempts);
      if (Date.now() - chunk.createdAt < delayMs) continue;
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
  }, [consultationId, refreshPendingCount]);

  const stop = useCallback(async () => {
    return new Promise<void>((resolve) => {
      const recorder = mediaRecorder.current;
      if (!recorder) {
        resolve();
        return;
      }
      recorder.onstop = async () => {
        if (timer.current) clearInterval(timer.current);
        recorder.stream.getTracks().forEach((t) => t.stop());
        setState('stopped');
        await Promise.allSettled(inFlightUploads.current);
        await flushPendingChunks();
        await api.stopRecording(consultationId);
        resolve();
      };
      recorder.stop();
    });
  }, [consultationId, flushPendingChunks]);

  stopRef.current = stop;

  const start = useCallback(async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const recorder = new MediaRecorder(stream);
    mediaRecorder.current = recorder;
    sequence.current = 0;
    setLimitReached(false);

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
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
    await flushPendingChunks();
  }, [consultationId, uploadChunk, flushPendingChunks]);

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
      mediaRecorder.current?.stream.getTracks().forEach((t) => t.stop());
    };
  }, [flushPendingChunks, refreshPendingCount]);

  return {
    state,
    seconds,
    pendingChunks,
    limitReached,
    start,
    pause,
    resume,
    stop,
    formatDuration,
  };
}
