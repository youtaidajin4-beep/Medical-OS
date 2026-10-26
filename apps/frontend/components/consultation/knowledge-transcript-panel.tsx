'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle, Check, RotateCcw } from 'lucide-react';
import { api } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type KnowledgePayload = Awaited<ReturnType<typeof api.getConsultationKnowledge>>;


/** 確認を出す価値のある種類。否定表現（はない→なし）や言い回しの正規化は、医師が確かめることではない */
const REVIEW_KINDS: Record<string, { label: string; ask: string }> = {
  strength: { label: '用量', ask: 'この量で合っていますか' },
  medication: { label: '薬', ask: 'この薬名で合っていますか' },
  laboratory_value: { label: '検査の数値', ask: 'この数値で合っていますか' },
  laboratory_test: { label: '検査', ask: 'この検査名で合っていますか' },
  diagnosis: { label: '病名', ask: 'この病名で合っていますか' },
  treatment_action: { label: '処置', ask: 'この処置で合っていますか' },
};

type Entity = KnowledgePayload['entities'][number];

/** 本文の中で、その語がどこに出てきたか。前後の文脈を付けて返す（どこの何かが分かるように） */
function contextOf(text: string, e: Entity): { before: string; term: string; after: string } | null {
  let start = e.startPosition ?? -1;
  if (start < 0 || text.slice(start, start + e.rawValue.length) !== e.rawValue) {
    start = text.indexOf(e.rawValue);
  }
  if (start < 0) return null;
  const end = start + e.rawValue.length;
  // 文の区切り（改行・句点）までを、前後それぞれ最大24字
  const head = text.slice(Math.max(0, start - 24), start);
  const tail = text.slice(end, end + 24);
  const before = head.split(/[\n。]/).pop() ?? '';
  const after = tail.split(/[\n。]/)[0] ?? '';
  return { before, term: e.rawValue, after };
}

/** 確認が要る語だけを、同じ語はまとめて返す */
function pickReviewItems(entities: Entity[]) {
  const groups = new Map<string, { entity: Entity; count: number }>();
  for (const e of entities) {
    if (!e.needsReview || !REVIEW_KINDS[e.entityType]) continue;
    const top = e.candidates[0]?.candidateValue ?? '';
    // 原文と候補が同じ（確かめることが無い）ものは出さない
    if (top && top === e.rawValue) continue;
    const key = `${e.entityType}|${e.rawValue}|${top}`;
    const g = groups.get(key);
    if (g) g.count += 1;
    else groups.set(key, { entity: e, count: 1 });
  }
  const order = Object.keys(REVIEW_KINDS);
  return [...groups.values()].sort(
    (a, b) => order.indexOf(a.entity.entityType) - order.indexOf(b.entity.entityType),
  );
}

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
  const reviewItems = pickReviewItems(data.entities);
  const meaningfulCorrections = [
    ...new Map(
      data.corrections
        .filter((c) => c.originalTerm && c.correctedTerm && c.originalTerm !== c.correctedTerm)
        .filter((c) => c.category !== 'negation')
        .map((c) => [`${c.originalTerm}|${c.correctedTerm}`, c]),
    ).values(),
  ];

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

      {mode === 'corrected' && meaningfulCorrections.length > 0 && (
        <div className="space-y-1">
          <p className="text-[11px] font-medium text-slate-600">自動で直した語</p>
          <ul className="flex flex-wrap gap-1">
            {meaningfulCorrections
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

      {reviewItems.length > 0 && (
        <div className="space-y-2">
          <p className="flex items-center gap-1 text-[11px] font-medium text-amber-800">
            <AlertTriangle className="h-3.5 w-3.5" />
            聞き取りを確かめたい語 {reviewItems.length}件
          </p>
          <ul className="max-h-64 space-y-2 overflow-y-auto">
            {reviewItems.slice(0, 12).map(({ entity: e, count }) => {
              const top = e.candidates[0];
              const kind = REVIEW_KINDS[e.entityType];
              const ctx = contextOf(data.rawText, e);
              return (
                <li
                  key={e.id}
                  className="rounded-lg border border-amber-200 bg-amber-50/60 p-2 text-xs"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-[10px] font-medium text-amber-700">
                        {kind?.label}の確認{count > 1 ? `（${count}か所）` : ''}
                      </p>
                      {ctx ? (
                        <p className="mt-0.5 leading-relaxed text-slate-700">
                          …{ctx.before}
                          <mark className="rounded bg-amber-200/70 px-0.5 font-semibold text-slate-900">
                            {ctx.term}
                          </mark>
                          {ctx.after}…
                        </p>
                      ) : (
                        <p className="mt-0.5 font-medium text-slate-800">{e.rawValue}</p>
                      )}
                      <p className="mt-0.5 text-slate-600">
                        {top && top.candidateValue !== e.rawValue
                          ? `「${e.rawValue}」は「${top.candidateValue}」のことですか？`
                          : kind?.ask}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col gap-1">
                      {top && top.candidateValue !== e.rawValue && (
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

      {reviewItems.length === 0 && (
        <p className="text-[11px] text-slate-500">聞き取りを確かめたい語は、ありませんでした。</p>
      )}
    </div>
  );
}
