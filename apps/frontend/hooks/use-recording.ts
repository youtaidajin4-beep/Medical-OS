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
import { startLiveTap, type LiveSegment, type LiveTap } from '@/lib/live-pcm';
import {
  boostedLevel,
  createBoostedStream,
  loadPreferredGain,
  resolveGain,
  type BoostedStream,
} from '@/lib/audio-gain';

type RecordingState = 'idle' | 'recording' | 'paused' | 'stopped';

/** 診察中に流れる書き起こしの1行。pending は、音声を送って文字になるのを待っている行 */
export type LiveLine = {
  id: string;
  startMs: number;
  text: string;
  pending: boolean;
  /** 文ごとの話者（判別できたとき）。画面で「医師」「患者」を付ける */
  parts?: Array<{ speaker: 'physician' | 'patient' | 'other' | 'unknown'; text: string }>;
};

/** この文字数に満たないときは、診察中の文字だけでSOAPを作らず、従来どおり録音全体から作る */
const MIN_LIVE_CHARS = 30;
/** 診察を終えるとき、最後の区間が文字になるのを待つ上限 */
const LIVE_SETTLE_MS = 6000;
const MAX_RECORDING_SECONDS = 60 * 60;
const CHUNK_MS = 3000;

function pickRecorderMimeType(): string | undefined {
  const candidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'];
  return candidates.find((type) => MediaRecorder.isTypeSupported(type));
}

export function useRecording(consultationId: string, deviceId?: string | null) {
  /** 増幅後のストリーム。MediaRecorder はこちらを録る */
  const boosted = useRef<BoostedStream | null>(null);
  /** マイクの素のストリーム。止めるときに track を閉じるために持っておく */
  const rawStream = useRef<MediaStream | null>(null);
  const [state, setState] = useState<RecordingState>('idle');
  const [seconds, setSeconds] = useState(0);
  const [pendingChunks, setPendingChunks] = useState(0);
  const [limitReached, setLimitReached] = useState(false);
  /** 録音中の入力レベル（0〜1）。診療の最中に「入っていない」に気づけるようにする */
  const [level, setLevel] = useState(0);
  /** 直近2秒の判定。silent のまま録り続けると、あとで白紙のSOAPが出てくる */
  const [micVerdict, setMicVerdict] = useState<MicVerdict>('ok');
  const [micLabel, setMicLabel] = useState<string | null>(null);
  const [liveLines, setLiveLines] = useState<LiveLine[]>([]);
  const liveTap = useRef<LiveTap | null>(null);
  /** 診察中の文字の送受信の集計。全部そろっているかの判断に使う */
  const liveStats = useRef({ failed: 0, chars: 0 });
  const liveInflight = useRef<Promise<void>[]>([]);
  const secondsRef = useRef(0);
  secondsRef.current = seconds;
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const meter = useRef<LevelMeter | null>(null);
  const meterPoll = useRef<ReturnType<typeof setInterval> | null>(null);
  const localBlobs = useRef<Blob[]>([]);
  const recorderMimeType = useRef('audio/webm');
  const sequence = useRef(0);
  /**
   * この回の録音が始まるチャンク番号。
   *
   * 「続きを録る」で0から振り直すと、`uploadChunk` が「同じ番号は再送」とみなして
   * 新しい音声を捨ててしまう（サーバー側の二重送信対策）。続きの番号から始める。
   */
  const appendFrom = useRef(0);
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

  /**
   * 声の切れ目ごとの音声を送って、文字になった行を画面へ足す。
   *
   * これは「流れて見える下書き」。失敗しても録音には影響しないし、診察後の文字起こしは
   * 録音全体から作り直す。だから失敗はその行を静かに消すだけにする。
   */
  const sendLiveSegment = useCallback(
    (segment: LiveSegment) => {
      const id = `live-${Math.round(segment.startMs)}`;
      setLiveLines((prev) =>
        [...prev.filter((l) => l.id !== id), { id, startMs: segment.startMs, text: '', pending: true }].sort(
          (a, b) => a.startMs - b.startMs,
        ),
      );
      const task = api
        .liveTranscribe(consultationId, segment.wav, segment.startMs, segment.endMs)
        .then((res) => {
          if (res.segment) liveStats.current.chars += res.segment.text.length;
          setLiveLines((prev) =>
            prev.flatMap((l) =>
              l.id !== id
                ? [l]
                : res.segment
                  ? [{ ...l, text: res.segment.text, parts: res.segment.parts, pending: false }]
                  : [],
            ),
          );
        })
        .catch(() => {
          liveStats.current.failed += 1;
          setLiveLines((prev) => prev.filter((l) => l.id !== id));
        });
      liveInflight.current.push(task);
      void task.finally(() => {
        liveInflight.current = liveInflight.current.filter((p) => p !== task);
      });
    },
    [consultationId],
  );

  const uploadFinalBlob = useCallback(async () => {
    const blobs = localBlobs.current;
    if (!blobs.length) return;
    const finalBlob = new Blob(blobs, { type: recorderMimeType.current });
    if (finalBlob.size === 0) return;
    const checksum = await sha256Hex(finalBlob);
    // 続きを録ったときは、この回の開始番号を渡す。0 のまま送ると前半の音声が消える
    await api.uploadFinalRecording(consultationId, finalBlob, checksum, appendFrom.current);
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
        // 残っている声を最後の区間として送って、止める
        liveTap.current?.stop();
        liveTap.current = null;
        if (timer.current) clearInterval(timer.current);
        stopMeter();
        recorder.stream.getTracks().forEach((t) => t.stop());
        boosted.current?.stop();
        boosted.current = null;
        // 増幅後のストリームを止めても、マイク自体は掴んだままなので明示的に閉じる
        rawStream.current?.getTracks().forEach((t) => t.stop());
        rawStream.current = null;
        setState('stopped');
        // 診察中の文字が全部そろうのを、少しだけ待つ（最後の区間は、止めた直後に送られる）
        const settled = await Promise.race([
          Promise.allSettled(liveInflight.current).then(() => true),
          new Promise<boolean>((r) => setTimeout(() => r(false), LIVE_SETTLE_MS)),
        ]);
        const fromLive =
          settled && liveStats.current.failed === 0 && liveStats.current.chars >= MIN_LIVE_CHARS;
        await Promise.allSettled(inFlightUploads.current);
        await flushPendingChunks(true);
        if (fromLive) {
          // 診察中の文字からSOAPを作る。録音の保存は、待たずに裏で行う
          void uploadFinalBlob().catch(() => undefined);
          await api.stopRecording(consultationId, { fromLive: true });
        } else {
          try {
            await uploadFinalBlob();
          } catch {
            // final blob upload failed; pipeline may still use chunks
          }
          await api.stopRecording(consultationId);
        }
        resolve();
      };
      if (recorder.state !== 'inactive') {
        recorder.requestData();
        recorder.stop();
      }
    });
  }, [consultationId, flushPendingChunks, stopMeter, uploadFinalBlob]);

  stopRef.current = stop;

  const start = useCallback(async (options?: { appendFromSequence?: number }) => {
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
    rawStream.current = stream;

    // 録音中もレベルを出し続ける。20分喋ったあとで「入っていなかった」が一番痛い。
    // 計測は素の音に対して行い、表示と判定には増幅ぶんを掛ける
    stopMeter();
    const levelMeter = createLevelMeter(stream);
    meter.current = levelMeter;
    setMicVerdict('ok');

    // 自動ゲインを切ったぶん、こちらで持ち上げてから録る。
    // 表示だけ上げても文字起こしへ渡る音は小さいままなので、録音そのものに掛ける。
    const gainSetting = loadPreferredGain();
    const startGain = resolveGain(gainSetting, levelMeter.peak());
    const boostedStream = createBoostedStream(stream, startGain);
    boosted.current = boostedStream;

    meterPoll.current = setInterval(() => {
      // 診察の途中で声量が変わっても追従する（自動のときだけ）
      const gain = resolveGain(gainSetting, levelMeter.peak());
      boostedStream.setGain(gain);
      setLevel(boostedLevel(levelMeter.level(), gain));
      setMicVerdict(judgeMicLevel(boostedLevel(levelMeter.peak(), gain)));
    }, 200);

    const mimeType = pickRecorderMimeType();
    recorderMimeType.current = mimeType ?? 'audio/webm';
    const target = boostedStream.stream;
    const recorder = mimeType ? new MediaRecorder(target, { mimeType }) : new MediaRecorder(target);
    mediaRecorder.current = recorder;
    localBlobs.current = [];
    const from = options?.appendFromSequence ?? 0;
    appendFrom.current = from;
    sequence.current = from;
    setLimitReached(false);

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        localBlobs.current.push(e.data);
        const seq = sequence.current++;
        void uploadChunk(e.data, seq);
      }
    };

    recorder.start(CHUNK_MS);
    // 録音とは別に、声の切れ目で区切った音声を送って、診察中に文字を流す
    liveTap.current?.stop();
    if (!options?.appendFromSequence) {
      setLiveLines([]);
      liveStats.current = { failed: 0, chars: 0 };
    }
    liveTap.current = startLiveTap(target, sendLiveSegment, {
      offsetMs: options?.appendFromSequence ? secondsRef.current * 1000 : 0,
    });
    // 続きを録るときは、サーバー側で既に RECORDING へ戻してある。
    // ここで startRecording を呼ぶと startedAt が今に戻り、前半の録音時間が消える
    if (!options?.appendFromSequence) {
      await api.startRecording(consultationId);
      setSeconds(0);
    }
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
  }, [consultationId, deviceId, stopMeter, uploadChunk, flushPendingChunks, sendLiveSegment]);

  const pause = useCallback(() => {
    liveTap.current?.pause();
    mediaRecorder.current?.pause();
    setState('paused');
    if (timer.current) clearInterval(timer.current);
  }, []);

  /**
   * 同じ診察の続きを録る。
   *
   * 池田さんの診察（2026-09-28）のように、採血で患者さんが退室して別の患者さんを診てから
   * 戻ってくる流れでは、画面を離れるので一時停止では続けられない。
   * サーバーに続きの番号をもらい、そこから録り足す。
   */
  const startAppend = useCallback(async () => {
    const { nextSequence } = await api.resumeRecording(consultationId);
    await start({ appendFromSequence: nextSequence });
  }, [consultationId, start]);

  const resume = useCallback(() => {
    liveTap.current?.resume();
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
      liveTap.current?.stop();
      liveTap.current = null;
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
    liveLines,
    start,
    startAppend,
    pause,
    resume,
    stop,
    formatDuration,
  };
}
