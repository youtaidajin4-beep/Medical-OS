'use client';

import { FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { MessageCircle, Mic, Send, Square, X } from 'lucide-react';
import { api } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Alert } from '@/components/ui/alert';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';

type ChatMessage = { id: string; role: string; content: string; createdAt: string };

export type SubkarteSoap = {
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
};

export type SubkarteAskResult = {
  message: { id: string; role: string; content: string; createdAt?: string };
  soap?: SubkarteSoap;
  note?: string;
  documents?: Array<{ type: string; content: Record<string, unknown> }>;
  documentGenerationError?: string;
};

export function SubkarteChatPanel({
  consultationId,
  onResult,
  className,
}: {
  consultationId: string;
  onResult?: (result: SubkarteAskResult) => void;
  /** @deprecated unused — panel is always floating */
  compact?: boolean;
  className?: string;
}) {
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const listRef = useRef<HTMLUListElement>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    setMounted(true);
    return () => {
      const recorder = recorderRef.current;
      if (recorder && recorder.state !== 'inactive') {
        recorder.stream.getTracks().forEach((t) => t.stop());
        recorder.stop();
      }
    };
  }, []);

  const toggleRecording = useCallback(async () => {
    if (recording) {
      recorderRef.current?.stop();
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'].find(
        (t) => typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(t),
      );
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        setRecording(false);
        const blob = new Blob(chunksRef.current, {
          type: recorder.mimeType || 'audio/webm',
        });
        chunksRef.current = [];
        if (blob.size < 2048) {
          setError('音声が短すぎます。マイクボタンを押してから話し、もう一度ボタンで停止してください。');
          return;
        }
        setTranscribing(true);
        try {
          const { text } = await api.transcribeChatAudio(consultationId, blob);
          setInput((prev) => (prev.trim() ? `${prev.trim()} ${text}` : text));
        } catch (err) {
          setError(err instanceof Error ? err.message : '音声の文字起こしに失敗しました');
        } finally {
          setTranscribing(false);
        }
      };
      recorder.start();
      recorderRef.current = recorder;
      setRecording(true);
      setError('');
    } catch {
      setError('マイクを使用できません。ブラウザのマイク権限を確認してください。');
    }
  }, [recording, consultationId]);

  useEffect(() => {
    void api
      .listChat(consultationId)
      .then(setMessages)
      .catch(() => setMessages([]));
  }, [consultationId]);

  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, loading, open]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!input.trim() || loading) return;
    const text = input.trim();
    setLoading(true);
    setError('');
    setInput('');
    setMessages((prev) => [
      ...prev,
      {
        id: `local-user-${Date.now()}`,
        role: 'user',
        content: text,
        createdAt: new Date().toISOString(),
      },
    ]);
    try {
      const result = await api.askChat(consultationId, text);
      onResult?.(result);
      if (result.documentGenerationError) {
        setError(
          `書類生成に失敗しました: ${result.documentGenerationError}`,
        );
      }
      const list = await api.listChat(consultationId);
      setMessages(list);
    } catch (err) {
      setError(err instanceof Error ? err.message : '送信に失敗しました');
      const list = await api.listChat(consultationId).catch(() => null);
      if (list) setMessages(list);
    } finally {
      setLoading(false);
    }
  }

  // Portal to body: parent shells use animate-fade-in (transform), which breaks position:fixed
  const ui = (
    <div
      className={cn(
        'pointer-events-none fixed bottom-4 right-4 z-[60] flex flex-col items-end gap-2',
        className,
      )}
    >
      {open && (
        <div
          className="pointer-events-auto flex w-[min(100vw-2rem,22rem)] flex-col overflow-hidden rounded-3xl border border-white/20 bg-[#0c2f2c]/95 text-[#f3efe4] shadow-[0_24px_80px_-20px_rgba(6,24,22,0.7)] backdrop-blur-xl"
          style={{ height: 'min(70vh, 28rem)' }}
          role="dialog"
          aria-label="チャット"
        >
          <div className="flex shrink-0 items-center justify-between gap-2 border-b border-white/10 px-3 py-2.5">
            <div className="flex min-w-0 items-center gap-2">
              <MessageCircle className="h-4 w-4 shrink-0 text-[#e8c98a]" />
              <div className="min-w-0">
                <p className="text-sm font-medium text-[#f3efe4]">チャット</p>
                <p className="truncate text-[10px] leading-snug text-[#c9ddd8]">
                  音声・テキストで追記・修正・書類作成
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-lg p-1.5 text-[#c9ddd8] hover:bg-white/10"
              aria-label="チャットを閉じる"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <ul ref={listRef} className="min-h-0 flex-1 space-y-2 overflow-y-auto px-3 py-2 text-sm">
            {messages.length === 0 && (
              <li className="rounded-2xl bg-white/5 px-3 py-2 text-xs leading-relaxed text-[#d5e6e1]">
                疑い・方針の記録や「紹介状を作って」などと指示してください。マイクボタンで音声入力もできます。チャットの判断が SOAP より優先されます。
              </li>
            )}
            {messages.map((m) => (
              <li
                key={m.id}
                className={
                  m.role === 'user'
                    ? 'ml-auto max-w-[90%] rounded-2xl bg-[#1f6f66] px-2.5 py-1.5 text-white'
                    : 'max-w-[90%] rounded-2xl bg-white/10 px-2.5 py-1.5 text-[#f3efe4]'
                }
              >
                <p className="mb-0.5 text-[10px] font-medium text-[#b7cec8]">
                  {m.role === 'user' ? '医師' : 'AI'}
                </p>
                <p className="whitespace-pre-wrap text-xs leading-relaxed">{m.content}</p>
              </li>
            ))}
            {loading && (
              <li className="flex items-center gap-2 text-xs text-slate-400">
                <Spinner className="h-3.5 w-3.5" />
                考えています…
              </li>
            )}
          </ul>

          {error && (
            <Alert variant="error" className="mx-3 mb-2">
              {error}
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="flex shrink-0 flex-col gap-1.5 border-t border-white/10 p-2.5">
            {(recording || transcribing) && (
              <p className="flex items-center gap-1.5 px-1 text-[10px] text-[#e8c98a]">
                {recording ? (
                  <>
                    <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-red-400" />
                    録音中… もう一度マイクボタンで停止
                  </>
                ) : (
                  <>
                    <Spinner className="h-3 w-3" />
                    文字起こし中…
                  </>
                )}
              </p>
            )}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => void toggleRecording()}
                disabled={transcribing || loading}
                className={cn(
                  'shrink-0 self-end rounded-xl p-2.5 transition disabled:opacity-50',
                  recording
                    ? 'animate-pulse bg-red-500 text-white hover:bg-red-600'
                    : 'bg-white/10 text-[#e8c98a] hover:bg-white/20',
                )}
                aria-label={recording ? '録音を停止' : '音声で入力'}
                title={recording ? '録音を停止' : '音声で入力'}
              >
                {recording ? <Square className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
              </button>
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                rows={2}
                className="min-h-0 flex-1 border-white/10 bg-white/10 text-sm text-[#f3efe4] placeholder:text-[#9bb8b1]"
                placeholder="例: アムロジピン継続。紹介状を市立病院向けに作って"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    void handleSubmit(e);
                  }
                }}
              />
              <Button
                type="submit"
                size="sm"
                className="shrink-0 self-end"
                disabled={loading || !input.trim()}
                icon={loading ? <Spinner className="text-white" /> : <Send />}
                aria-label="送信"
              />
            </div>
          </form>
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'pointer-events-auto inline-flex items-center gap-2 rounded-full px-4 py-3 text-sm font-medium shadow-lg transition',
          open
            ? 'bg-[#1a3f3a] text-white hover:bg-[#134540]'
            : 'bg-[#0c2f2c] text-[#f3efe4] hover:bg-[#134540]',
        )}
        aria-expanded={open}
        aria-label={open ? 'チャットを閉じる' : 'チャットを開く'}
      >
        {open ? <X className="h-4 w-4" /> : <MessageCircle className="h-4 w-4" />}
        チャット
        {!open && messages.length > 0 && (
          <span className="rounded-full bg-white/20 px-1.5 py-0.5 text-[10px] tabular-nums">
            {messages.length}
          </span>
        )}
      </button>
    </div>
  );

  if (!mounted) return null;
  return createPortal(ui, document.body);
}
