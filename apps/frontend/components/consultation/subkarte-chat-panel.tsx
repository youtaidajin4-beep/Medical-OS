'use client';

import { FormEvent, useEffect, useRef, useState } from 'react';
import { MessageCircle, Send, X } from 'lucide-react';
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
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const listRef = useRef<HTMLUListElement>(null);

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

  return (
    <div className={cn('pointer-events-none fixed bottom-4 right-4 z-40 flex flex-col items-end gap-2', className)}>
      {open && (
        <div
          className="pointer-events-auto flex w-[min(100vw-2rem,22rem)] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl"
          style={{ height: 'min(70vh, 28rem)' }}
          role="dialog"
          aria-label="チャット"
        >
          <div className="flex shrink-0 items-center justify-between gap-2 border-b border-slate-100 px-3 py-2.5">
            <div className="flex min-w-0 items-center gap-2">
              <MessageCircle className="h-4 w-4 shrink-0 text-brand-600" />
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-800">チャット</p>
                <p className="truncate text-[10px] leading-snug text-slate-500">
                  質問・修正・書類作成（例: 市立病院向けに紹介状作って）
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
              aria-label="チャットを閉じる"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <ul ref={listRef} className="min-h-0 flex-1 space-y-2 overflow-y-auto px-3 py-2 text-sm">
            {messages.length === 0 && (
              <li className="text-xs text-slate-400">
                まだメッセージがありません。疑い・方針の記録や「紹介状を作って」などと書いてください。
              </li>
            )}
            {messages.map((m) => (
              <li
                key={m.id}
                className={
                  m.role === 'user'
                    ? 'rounded-lg bg-brand-50 px-2.5 py-1.5 text-slate-800'
                    : 'rounded-lg border border-slate-100 bg-slate-50 px-2.5 py-1.5 text-slate-700'
                }
              >
                <p className="mb-0.5 text-[10px] font-medium text-slate-400">
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

          <form onSubmit={handleSubmit} className="flex shrink-0 gap-2 border-t border-slate-100 p-2.5">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              rows={2}
              className="min-h-0 flex-1 text-sm"
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
          </form>
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'pointer-events-auto inline-flex items-center gap-2 rounded-full px-4 py-3 text-sm font-medium shadow-lg transition',
          open
            ? 'bg-slate-800 text-white hover:bg-slate-700'
            : 'bg-brand-600 text-white hover:bg-brand-700',
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
}
