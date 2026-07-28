'use client';

import { FormEvent, useEffect, useState } from 'react';
import { MessageSquarePlus, Send } from 'lucide-react';
import { api } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Alert } from '@/components/ui/alert';
import { Spinner } from '@/components/ui/spinner';

type ChatMessage = { id: string; role: string; content: string; createdAt: string };

export function ConsultChatPanel({
  consultationId,
  onAppendToPlan,
}: {
  consultationId: string;
  onAppendToPlan: (text: string) => void;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    void api
      .listChat(consultationId)
      .then(setMessages)
      .catch(() => setMessages([]));
  }, [consultationId]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!input.trim() || loading) return;
    setLoading(true);
    setError('');
    try {
      const reply = await api.askChat(consultationId, input.trim());
      setInput('');
      const list = await api.listChat(consultationId);
      setMessages(list);
      void reply;
    } catch (err) {
      setError(err instanceof Error ? err.message : '相談に失敗しました');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-3">
      <div className="flex items-center gap-2 text-sm font-medium text-slate-800">
        <MessageSquarePlus className="h-4 w-4 text-brand-600" />
        診療相談（診断は断定しません）
      </div>
      <p className="text-[11px] text-slate-500">
        鑑別のヒント・疾患検索・見逃しチェックをこのパネル内で。回答は下書きです。
      </p>

      <ul className="max-h-56 space-y-2 overflow-y-auto text-sm">
        {messages.length === 0 && (
          <li className="text-xs text-slate-400">まだ会話がありません</li>
        )}
        {messages.map((m) => (
          <li
            key={m.id}
            className={
              m.role === 'user'
                ? 'rounded-lg bg-brand-50 px-3 py-2 text-slate-800'
                : 'rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-slate-700'
            }
          >
            <p className="mb-1 text-[10px] font-medium text-slate-400">
              {m.role === 'user' ? '医師' : 'AI'}
            </p>
            <p className="whitespace-pre-wrap">{m.content}</p>
            {m.role === 'assistant' && (
              <Button
                size="sm"
                variant="ghost"
                className="mt-2"
                onClick={() => onAppendToPlan(m.content)}
              >
                Plan に追記
              </Button>
            )}
          </li>
        ))}
      </ul>

      {error && <Alert variant="error">{error}</Alert>}

      <form onSubmit={handleSubmit} className="space-y-2">
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          rows={3}
          placeholder="例: 咳と息苦しさで見逃してはいけない疾患は？"
        />
        <Button
          type="submit"
          className="w-full"
          disabled={loading || !input.trim()}
          icon={loading ? <Spinner className="text-white" /> : <Send />}
        >
          {loading ? '考え中…' : '質問する'}
        </Button>
      </form>
    </div>
  );
}
