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

function pickRecorderMimeType(): string | undefined {
  const candidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'];
  return candidates.find((type) => MediaRecorder.isTypeSupported(type));
}

export function useRecording(consultationId: string) {
  const [state, setState] = useState<RecordingState>('idle');
  const [seconds, setSeconds] = useState(0);
  const [pendingChunks, setPendingChunks] = useState(0);
  const [limitReached, setLimitReached] = useState(false);
  const mediaRecorder = useRef<MediaRecorder | null>(null);
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
    // #region agent log
    fetch('http://127.0.0.1:7691/ingest/361a7d21-06dd-46cb-8e34-20e49f62c5c0',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'9009b6'},body:JSON.stringify({sessionId:'9009b6',location:'use-recording.ts:uploadFinalBlob',message:'final blob uploaded',data:{consultationId,partCount:blobs.length,finalBytes:finalBlob.size,seconds},timestamp:Date.now(),hypothesisId:'H1'})}).catch(()=>{});
    // #endregion
  }, [consultationId, seconds]);

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
        await flushPendingChunks(true);
        try {
          await uploadFinalBlob();
        } catch {
          // #region agent log
          fetch('http://127.0.0.1:7691/ingest/361a7d21-06dd-46cb-8e34-20e49f62c5c0',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'9009b6'},body:JSON.stringify({sessionId:'9009b6',location:'use-recording.ts:stop',message:'final blob upload failed',data:{consultationId,partCount:localBlobs.current.length},timestamp:Date.now(),hypothesisId:'H1'})}).catch(()=>{});
          // #endregion
        }
        await api.stopRecording(consultationId);
        resolve();
      };
      if (recorder.state !== 'inactive') {
        recorder.requestData();
        recorder.stop();
      }
    });
  }, [consultationId, flushPendingChunks, uploadFinalBlob]);

  stopRef.current = stop;

  const start = useCallback(async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
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
