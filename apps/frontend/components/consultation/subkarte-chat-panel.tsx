'use client';

import { FormEvent, useEffect, useRef, useState } from 'react';
import { NotebookPen, Send } from 'lucide-react';
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
  compact = false,
  className,
}: {
  consultationId: string;
  onResult?: (result: SubkarteAskResult) => void;
  compact?: boolean;
  className?: string;
}) {
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
  }, [messages, loading]);

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
    <div
      className={cn(
        'flex flex-col rounded-xl border border-slate-200 bg-white',
        compact ? 'p-2.5' : 'p-3',
        className,
      )}
    >
      <div className="mb-1.5 flex items-center gap-2 text-sm font-medium text-slate-800">
        <NotebookPen className="h-4 w-4 text-brand-600" />
        サブカルテ
      </div>
      <p className={cn('text-slate-500', compact ? 'mb-1.5 text-[10px] leading-snug' : 'mb-2 text-[11px]')}>
        疑い・処方意図を書くと書類に反映。修正もここで（例: 紹介状の宛先を〇〇病院に）
      </p>

      <ul
        ref={listRef}
        className={cn(
          'space-y-2 overflow-y-auto text-sm',
          compact ? 'max-h-28' : 'max-h-48',
        )}
      >
        {messages.length === 0 && (
          <li className="text-xs text-slate-400">まだ記載がありません</li>
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
            反映中…
          </li>
        )}
      </ul>

      {error && (
        <Alert variant="error" className="mt-2">
          {error}
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="mt-2 flex gap-2">
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          rows={compact ? 2 : 3}
          className="min-h-0 flex-1 text-sm"
          placeholder="例: 気管支炎疑い、アモキシシリン処方"
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
  );
}
