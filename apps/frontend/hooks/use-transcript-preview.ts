'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api-client';

type PreviewSegment = { id: string; text: string; speaker: string };

export function useTranscriptPreview(consultationId: string, enabled: boolean) {
  const [preview, setPreview] = useState('');
  const [segments, setSegments] = useState<PreviewSegment[]>([]);

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;
    const poll = async () => {
      try {
        const data = await api.getTranscript(consultationId, false);
        if (cancelled) return;
        setSegments(data);
        const latest = data.slice(-2).map((s) => s.text);
        setPreview(latest.join('\n') || '（OpenAIモード：停止後に文字起こしが表示されます）');
      } catch {
        if (!cancelled) setPreview('（OpenAIモード：停止後に文字起こしが表示されます）');
      }
    };

    void poll();
    const timer = setInterval(poll, 3000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [consultationId, enabled]);

  return { preview, segments };
}
