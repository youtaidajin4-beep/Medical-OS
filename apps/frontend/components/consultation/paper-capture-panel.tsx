'use client';

import { useEffect, useState } from 'react';
import { Camera, FileImage } from 'lucide-react';
import { api } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Alert } from '@/components/ui/alert';
import { Spinner } from '@/components/ui/spinner';

type Attachment = {
  id: string;
  fileName: string;
  mimeType: string;
  ocrText: string | null;
  documentKind: string;
  createdAt: string;
};

type Timeline = {
  current: {
    id: string;
    label?: string | null;
    soap: { assessment: string } | null;
    documents: Array<{ type: string }>;
    attachments: Attachment[];
  };
  history: Array<{
    id: string;
    createdAt: string;
    status: string;
    assessment: string | null;
    documentCount: number;
    attachmentCount: number;
  }>;
};

export function PaperCapturePanel({
  consultationId,
  onApplied,
}: {
  consultationId: string;
  onApplied?: (soap: { subjective: string; objective: string; assessment: string; plan: string }) => void;
}) {
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [timeline, setTimeline] = useState<Timeline | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  async function refresh() {
    const [list, tl] = await Promise.all([
      api.listAttachments(consultationId),
      api.getTimeline(consultationId),
    ]);
    setAttachments(list);
    setTimeline(tl);
  }

  useEffect(() => {
    void refresh().catch(() => {});
  }, [consultationId]);

  async function handleFile(file: File | null, kind: string) {
    if (!file) return;
    setUploading(true);
    setError('');
    try {
      await api.uploadAttachment(consultationId, file, kind);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'アップロードに失敗しました');
    } finally {
      setUploading(false);
    }
  }

  async function applyToSoap(attachmentId: string) {
    setUploading(true);
    setError('');
    try {
      const result = await api.applyQuestionnaire(consultationId, attachmentId);
      if (result.soap) onApplied?.(result.soap);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'SOAPへの反映に失敗しました');
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-slate-200 bg-white p-3 space-y-2">
        <p className="flex items-center gap-2 text-sm font-medium text-slate-800">
          <Camera className="h-4 w-4 text-brand-600" />
          紙資料を撮影・読取
        </p>
        <p className="text-[11px] text-slate-500">
          介護保険問診票・紹介状・検査結果などを撮影すると、この診療に保存し OCR します（下書き）。
        </p>
        <label className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-brand-300 bg-brand-50/50 px-3 py-4 text-sm font-medium text-brand-700">
          <FileImage className="h-4 w-4" />
          {uploading ? '処理中…' : '問診票を撮影 / 選ぶ'}
          <input
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            disabled={uploading}
            onChange={(e) => void handleFile(e.target.files?.[0] ?? null, 'questionnaire')}
          />
        </label>
        {uploading && (
          <p className="flex items-center gap-2 text-xs text-slate-500">
            <Spinner /> OCR 処理中…
          </p>
        )}
        {error && <Alert variant="error">{error}</Alert>}
      </div>

      <div className="space-y-2">
        <p className="text-xs font-medium text-slate-500">この診療の資料</p>
        {attachments.length === 0 ? (
          <p className="text-xs text-slate-400">まだありません</p>
        ) : (
          <ul className="space-y-2">
            {attachments.map((a) => (
              <li key={a.id} className="rounded-lg border border-slate-200 bg-white p-3 text-xs">
                <p className="font-medium text-slate-800">{a.fileName}</p>
                <p className="mt-1 whitespace-pre-wrap text-slate-600">
                  {a.ocrText ?? '（読取なし）'}
                </p>
                {a.ocrText && (
                  <Button
                    size="sm"
                    variant="secondary"
                    className="mt-2"
                    disabled={uploading}
                    onClick={() => void applyToSoap(a.id)}
                  >
                    SOAP / 患者メモへ反映
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {timeline && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-slate-500">関連する過去診療</p>
          <ul className="space-y-1.5">
            {timeline.history.map((h) => (
              <li
                key={h.id}
                className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-[11px] text-slate-600"
              >
                {new Date(h.createdAt).toLocaleString('ja-JP')} · {h.status}
                {h.assessment ? ` · ${h.assessment.slice(0, 40)}` : ''}
                {` · 書類${h.documentCount} / 資料${h.attachmentCount}`}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
