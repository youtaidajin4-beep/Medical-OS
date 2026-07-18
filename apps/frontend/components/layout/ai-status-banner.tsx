'use client';

import { useEffect, useState } from 'react';
import { Sparkles } from 'lucide-react';
import { api } from '@/lib/api-client';

export function AiStatusBanner() {
  const [status, setStatus] = useState<{
    sttProvider: string;
    llmProvider: string;
    apiKeyConfigured: boolean;
    warning?: string;
  } | null>(null);

  useEffect(() => {
    void api
      .healthAi()
      .then((data) => setStatus(data))
      .catch(() => setStatus(null));
  }, []);

  if (process.env.NEXT_PUBLIC_DEMO_MODE === 'true') return null;
  if (!status) return null;

  const isRealAi =
    (status.sttProvider === 'openai' || status.llmProvider === 'openai') &&
    status.apiKeyConfigured;

  if (!isRealAi) {
    return (
      <div className="no-print flex items-center justify-center gap-2 bg-amber-600 px-4 py-1.5 text-xs font-medium text-white">
        AI: mock モード（実音声・実AIには OpenAI 設定が必要です）
      </div>
    );
  }

  return (
    <div className="no-print flex items-center justify-center gap-2 bg-emerald-700 px-4 py-1.5 text-xs font-medium text-white">
      <Sparkles className="h-3.5 w-3.5" />
      実AI接続中（OpenAI）— 診療終了後に文字起こし・SOAP・書類を生成します
      {status.warning && <span className="opacity-90">· {status.warning}</span>}
    </div>
  );
}
