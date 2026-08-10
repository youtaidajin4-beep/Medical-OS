'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle, Check, RotateCcw } from 'lucide-react';
import { api } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type KnowledgePayload = Awaited<ReturnType<typeof api.getConsultationKnowledge>>;

export function KnowledgeTranscriptPanel({ consultationId }: { consultationId: string }) {
  const [data, setData] = useState<KnowledgePayload | null>(null);
  const [mode, setMode] = useState<'raw' | 'corrected'>('corrected');
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = () => {
    api
      .getConsultationKnowledge(consultationId)
      .then(setData)
      .catch((e: Error) => setError(e.message));
  };

  useEffect(() => {
    load();
  }, [consultationId]);

  if (error) {
    return <p className="text-xs text-slate-500">ナレッジ情報: {error}</p>;
  }
  if (!data) {
    return <p className="text-xs text-slate-500">医療ナレッジを読み込み中…</p>;
  }

  const text = mode === 'raw' ? data.rawText : data.correctedText;
  const reviewEntities = data.entities.filter((e) => e.needsReview);

  return (
    <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-semibold text-slate-700">音声認識補正（Medical Knowledge）</p>
        <div className="flex gap-1 rounded-lg bg-slate-100 p-0.5 text-xs">
          <button
            type="button"
            className={cn(
              'rounded-md px-2 py-1',
              mode === 'raw' ? 'bg-white font-medium shadow-sm' : 'text-slate-600',
            )}
            onClick={() => setMode('raw')}
          >
            RAW
          </button>
          <button
            type="button"
            className={cn(
              'rounded-md px-2 py-1',
              mode === 'corrected' ? 'bg-white font-medium shadow-sm' : 'text-slate-600',
            )}
            onClick={() => setMode('corrected')}
          >
            補正後
          </button>
        </div>
      </div>

      <pre className="max-h-40 overflow-auto whitespace-pre-wrap rounded-lg bg-slate-50 p-2 text-xs text-slate-800">
        {text || '（空）'}
      </pre>

      {mode === 'corrected' && data.corrections.filter((c) => c.originalTerm && c.correctedTerm).length > 0 && (
        <div className="space-y-1">
          <p className="text-[11px] font-medium text-slate-600">自動補正ハイライト</p>
          <ul className="flex flex-wrap gap-1">
            {data.corrections
              .filter((c) => c.originalTerm && c.correctedTerm)
              .slice(0, 20)
              .map((c) => (
                <li
                  key={c.id}
                  className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] text-emerald-800"
                  title={c.correctionSource}
                >
                  {c.originalTerm} → {c.correctedTerm}
                </li>
              ))}
          </ul>
        </div>
      )}

      {reviewEntities.length > 0 && (
        <div className="space-y-2">
          <p className="flex items-center gap-1 text-[11px] font-medium text-amber-800">
            <AlertTriangle className="h-3.5 w-3.5" />
            要確認（HIGH RISK）{reviewEntities.length}件
          </p>
          <ul className="max-h-48 space-y-2 overflow-y-auto">
            {reviewEntities.slice(0, 12).map((e) => {
              const top = e.candidates[0];
              return (
                <li
                  key={e.id}
                  className="rounded-lg border border-amber-200 bg-amber-50/60 p-2 text-xs"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-medium text-slate-800">
                        原文: {e.rawValue}
                        <span className="ml-1 text-[10px] uppercase text-amber-700">{e.riskLevel}</span>
                      </p>
                      {top && (
                        <p className="mt-0.5 text-slate-600">
                          候補: {top.candidateValue}{' '}
                          <span className="text-slate-400">
                            Confidence {Math.round(top.score * 100)}%
                          </span>
                        </p>
                      )}
                    </div>
                    <div className="flex shrink-0 flex-col gap-1">
                      {top && (
                        <Button
                          size="sm"
                          variant="secondary"
                          icon={<Check />}
                          disabled={busyId === e.id}
                          onClick={async () => {
                            setBusyId(e.id);
                            try {
                              await api.approveDoctorCorrection({
                                consultationId,
                                originalTerm: e.rawValue,
                                correctedTerm: top.candidateValue,
                                category: e.entityType,
                              });
                              load();
                            } finally {
                              setBusyId(null);
                            }
                          }}
                        >
                          確定
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        icon={<RotateCcw />}
                        disabled={busyId === e.id}
                        onClick={async () => {
                          setBusyId(e.id);
                          try {
                            await api.approveDoctorCorrection({
                              consultationId,
                              originalTerm: e.rawValue,
                              correctedTerm: e.rawValue,
                              category: e.entityType,
                            });
                            load();
                          } finally {
                            setBusyId(null);
                          }
                        }}
                      >
                        原文のまま
                      </Button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {data.metrics && (
        <p className="text-[10px] text-slate-500">
          自動補正 {data.metrics.automaticCorrectionCount} / 要確認{' '}
          {data.metrics.reviewRequiredCount}
        </p>
      )}
    </div>
  );
}
