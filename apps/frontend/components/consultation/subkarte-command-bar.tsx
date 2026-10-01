'use client';

import { FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import { ChevronDown, ChevronUp, Mic, Send, Square } from 'lucide-react';
import { api } from '@/lib/api-client';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';

/**
 * サブカルテを、隅のふきだしから画面の下の一本線へ変える。
 *
 * これまでは右下のチャットボタンを押して開く作りだった。けれどサブカルテは
 * 「ついでに使うもの」ではなく、**SOAPを直すのも書類を作るのも一番速い入口**になる。
 * 隠れていると使われないので、診察後の画面では常に下にいて、押さなくても打てる形にする。
 *
 * 会話は必要なときだけ上へ開く。普段は1行で、画面の邪魔をしない。
 */

type ChatMessage = { id: string; role: string; content: string; createdAt: string };

export type SubkarteResult = {
  message: { id: string; role: string; content: string; createdAt?: string };
  soap?: { subjective: string; objective: string; assessment: string; plan: string };
  note?: string;
  documents?: Array<{ type: string; content: Record<string, unknown> }>;
  documentGenerationError?: string;
};

/** 押すだけで送れる、よく使う言い回し。白紙の入力欄は手が止まる */
const QUICK_PROMPTS = [
  '紹介状を作って',
  '定時薬を継続',
  'A に追記：',
  '処方を追記：',
] as const;

export function SubkarteCommandBar({
  consultationId,
  onResult,
  placeholder = '追記・修正・書類の指示をどうぞ（例: 長崎医療センターの循環器内科へ紹介状）',
  className,
}: {
  consultationId: string;
  onResult?: (result: SubkarteResult) => void;
  placeholder?: string;
  className?: string;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState(false);
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const listRef = useRef<HTMLUListElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    void api
      .listChat(consultationId)
      .then(setMessages)
      .catch(() => setMessages([]));
    return () => {
      const recorder = recorderRef.current;
      if (recorder && recorder.state !== 'inactive') {
        recorder.stream.getTracks().forEach((t) => t.stop());
        recorder.stop();
      }
    };
  }, [consultationId]);

  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, loading, expanded]);

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
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' });
        chunksRef.current = [];
        if (blob.size < 2048) {
          setError('音声が短すぎます。マイクを押してから話し、もう一度押して止めてください。');
          return;
        }
        setTranscribing(true);
        try {
          const { text } = await api.transcribeChatAudio(consultationId, blob);
          setInput((prev) => (prev.trim() ? `${prev.trim()} ${text}` : text));
          inputRef.current?.focus();
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

  async function handleSubmit(e?: FormEvent) {
    e?.preventDefault();
    if (!input.trim() || loading) return;
    const text = input.trim();
    setLoading(true);
    setError('');
    setInput('');
    setExpanded(true);
    setMessages((prev) => [
      ...prev,
      { id: `local-${Date.now()}`, role: 'user', content: text, createdAt: new Date().toISOString() },
    ]);
    try {
      const result = await api.askChat(consultationId, text);
      onResult?.(result);
      if (result.documentGenerationError) {
        setError(`書類生成に失敗しました: ${result.documentGenerationError}`);
      }
      setMessages(await api.listChat(consultationId));
    } catch (err) {
      setError(err instanceof Error ? err.message : '送信に失敗しました');
      const list = await api.listChat(consultationId).catch(() => null);
      if (list) setMessages(list);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className={cn(
        'no-print sticky bottom-0 z-30 -mx-4 border-t border-clinic-line bg-clinic-paper/95 px-4 pb-3 pt-2 backdrop-blur min-[480px]:-mx-6 min-[480px]:px-6',
        className,
      )}
    >
      {expanded && (
        <div className="mx-auto mb-2 max-w-3xl overflow-hidden rounded-2xl border border-clinic-line bg-white">
          <ul
            ref={listRef}
            className="max-h-[32vh] space-y-2 overflow-y-auto px-3 py-2.5 text-sm"
          >
            {messages.length === 0 && (
              <li className="rounded-xl bg-clinic-tint px-3 py-2 text-[12px] leading-relaxed text-clinic-ink-muted">
                疑い・方針をそのまま話すと記録されます。「〇〇病院へ紹介状」と言えば書類まで作ります。
                ここで述べたことは SOAP より優先されます。
              </li>
            )}
            {messages.map((m) => (
              <li
                key={m.id}
                className={cn(
                  'max-w-[88%] rounded-2xl px-3 py-2 text-[13px] leading-relaxed',
                  m.role === 'user'
                    ? 'ml-auto bg-clinic-ink text-clinic-cream'
                    : 'bg-clinic-tint text-clinic-ink',
                )}
              >
                {m.content}
              </li>
            ))}
            {loading && (
              <li className="flex items-center gap-2 text-[12px] text-clinic-ink-muted">
                <Spinner className="h-3.5 w-3.5" />
                考えています…
              </li>
            )}
          </ul>
        </div>
      )}

      {error && (
        <p className="mx-auto mb-2 max-w-3xl rounded-xl bg-rose-50 px-3 py-2 text-[12px] text-rose-800">
          {error}
        </p>
      )}

      {!expanded && (
        <div className="mx-auto mb-2 flex max-w-3xl flex-wrap gap-1.5">
          {QUICK_PROMPTS.map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => {
                setInput((prev) => (prev ? `${prev} ${q}` : q));
                inputRef.current?.focus();
              }}
              className="rounded-full border border-clinic-line bg-white px-2.5 py-1 text-[11px] font-medium text-clinic-ink-muted hover:border-clinic-ink hover:text-clinic-ink"
            >
              {q}
            </button>
          ))}
        </div>
      )}

      <form onSubmit={handleSubmit} className="mx-auto flex max-w-3xl items-end gap-2">
        <button
          type="button"
          onClick={() => void toggleRecording()}
          disabled={transcribing || loading}
          className={cn(
            'flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl transition disabled:opacity-50',
            recording
              ? 'animate-pulse bg-rose-600 text-white'
              : 'bg-clinic-ink text-clinic-gold hover:bg-clinic-ink-soft',
          )}
          aria-label={recording ? '録音を停止' : '音声で入力'}
          title={recording ? '録音を停止' : '音声で入力'}
        >
          {recording ? <Square className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
        </button>

        <div className="relative min-w-0 flex-1">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            rows={1}
            placeholder={transcribing ? '文字起こし中…' : recording ? '録音中… もう一度マイクで停止' : placeholder}
            className="w-full resize-none rounded-2xl border border-clinic-line bg-white px-3.5 py-3 pr-10 text-[13px] leading-snug text-clinic-ink outline-none placeholder:text-clinic-ink-muted focus:border-clinic-ink"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                void handleSubmit();
              }
            }}
          />
          {messages.length > 0 && (
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-clinic-ink-muted hover:bg-clinic-tint"
              aria-label={expanded ? 'やりとりを閉じる' : 'やりとりを見る'}
            >
              {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
            </button>
          )}
        </div>

        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-clinic-gold text-clinic-ink transition hover:brightness-95 disabled:opacity-40"
          aria-label="送信"
        >
          {loading ? <Spinner className="h-4 w-4" /> : <Send className="h-4 w-4" />}
        </button>
      </form>
    </div>
  );
}
