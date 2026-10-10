'use client';

import { Fragment, useEffect, useState } from 'react';
import { api, type QualityVisit, type QualityVisitDetail } from '@/lib/api-client';
import { Badge } from '@/components/ui/badge';
import { dateTimeLabel, pct, VISIT_TYPE_LABEL } from '@/lib/quality-format';

function Detail({ visit }: { visit: QualityVisit }) {
  const [detail, setDetail] = useState<QualityVisitDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    api
      .qualityVisitDetail(visit.id)
      .then((d) => live && setDetail(d))
      .catch((e: unknown) => live && setError(e instanceof Error ? e.message : '読み込めませんでした'));
    return () => {
      live = false;
    };
  }, [visit.id]);

  if (error) return <p className="text-sm text-red-700">{error}</p>;
  if (!detail) return <p className="text-sm text-slate-500">読み込み中…</p>;

  const list = (items: string[], empty: string) =>
    items.length ? (
      <ul className="flex flex-wrap gap-1.5">
        {items.map((t, i) => (
          <li key={`${t}-${i}`}>
            <Badge>{t}</Badge>
          </li>
        ))}
      </ul>
    ) : (
      <p className="text-slate-400">{empty}</p>
    );

  return (
    <div className="grid gap-4 text-sm md:grid-cols-2">
      <section>
        <h4 className="mb-1 font-semibold text-slate-800">診察中の文字起こしで落ちた医療用語</h4>
        {list(detail.missedTerms, '落ちた語はありません（または未計測）')}
      </section>
      <section>
        <h4 className="mb-1 font-semibold text-slate-800">SOAPに書かれなかった事実</h4>
        {detail.missedFacts.length ? (
          <ul className="list-disc space-y-0.5 pl-5 text-slate-700">
            {detail.missedFacts.map((f, i) => (
              <li key={i}>{f}</li>
            ))}
          </ul>
        ) : (
          <p className="text-slate-400">落ちた事実はありません（または未計測）</p>
        )}
      </section>
      <section>
        <h4 className="mb-1 font-semibold text-slate-800">会話に根拠のない記載（0であるべき）</h4>
        {detail.unsupportedClaims.length ? (
          <ul className="list-disc space-y-0.5 pl-5 text-red-800">
            {detail.unsupportedClaims.map((u, i) => (
              <li key={i}>
                {u.text}
                {u.reason ? <span className="text-slate-500">（{u.reason}）</span> : null}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-slate-400">ありません</p>
        )}
      </section>
      <section>
        <h4 className="mb-1 font-semibold text-slate-800">測ったときの構成</h4>
        <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-xs text-slate-600">
          {Object.entries(detail.config ?? {}).map(([k, v]) => (
            <Fragment key={k}>
              <dt className="text-slate-400">{k}</dt>
              <dd>{v == null ? '—' : String(v)}</dd>
            </Fragment>
          ))}
        </dl>
        {detail.judgeCostJpy != null && (
          <p className="mt-1 text-xs text-slate-400">SOAP判定の費用 約{detail.judgeCostJpy.toFixed(1)}円</p>
        )}
      </section>
    </div>
  );
}

export function VisitTable({ visits }: { visits: QualityVisit[] }) {
  const [openId, setOpenId] = useState<string | null>(null);

  if (visits.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500">
        この月に計測できた診察はまだありません。診察を終えると自動で積まれます。
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-card">
      <table className="w-full min-w-[56rem] text-left text-sm">
        <thead className="border-b border-slate-100 bg-slate-50 text-xs text-slate-500">
          <tr>
            <th className="px-3 py-2 font-medium">診察</th>
            <th className="px-3 py-2 font-medium">種別</th>
            <th className="px-3 py-2 text-right font-medium">発話の再現率</th>
            <th className="px-3 py-2 text-right font-medium">用語の回収率<span className="block font-normal text-slate-400">補正後（前）</span></th>
            <th className="px-3 py-2 text-right font-medium">SOAPの転記率</th>
            <th className="px-3 py-2 text-right font-medium">根拠なし</th>
            <th className="px-3 py-2 text-right font-medium">先生の修正<span className="block font-normal text-slate-400">SOAP / 文字</span></th>
            <th className="px-3 py-2 font-medium">状態</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {visits.map((v) => {
            const open = openId === v.id;
            const failed = v.sttError ?? v.soapError;
            return (
              <Fragment key={v.id}>
                <tr
                  className="cursor-pointer hover:bg-slate-50 focus-within:bg-slate-50"
                  onClick={() => setOpenId(open ? null : v.id)}
                >
                  <td className="px-3 py-2">
                    <button
                      type="button"
                      className="text-left font-medium text-brand-700 underline-offset-2 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-600"
                      aria-expanded={open}
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenId(open ? null : v.id);
                      }}
                    >
                      {dateTimeLabel(v.visitedAt)}
                    </button>
                    <span className="ml-2 text-xs text-slate-400">{v.id.slice(0, 8)}</span>
                  </td>
                  <td className="px-3 py-2 text-slate-600">{VISIT_TYPE_LABEL[v.visitType] ?? v.visitType}</td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {pct(v.utteranceRecall)}
                    {v.utterancePrecision != null && (
                      <span className="ml-1 text-xs text-slate-400">（一致 {pct(v.utterancePrecision)}）</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {pct(v.termRecall)}
                    <span className="ml-1 text-xs text-slate-400">（{pct(v.termRecallRaw)}）</span>
                    {v.termRefCount != null && <span className="ml-1 text-xs text-slate-400">{v.termRefCount}語</span>}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {pct(v.soapCoverage)}
                    {v.factCount != null && <span className="ml-1 text-xs text-slate-400">{v.factCount}件</span>}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {v.unsupportedCount == null ? '—' : v.unsupportedCount > 0 ? <Badge variant="critical">{v.unsupportedCount}</Badge> : '0'}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums text-slate-600">
                    {v.soapEdits} / {v.transcriptEdits}
                  </td>
                  <td className="px-3 py-2">
                    {failed ? (
                      <Badge variant="warning" title={failed}>
                        一部未計測
                      </Badge>
                    ) : v.utteranceRecall == null && v.soapCoverage == null ? (
                      <Badge>計測待ち</Badge>
                    ) : (
                      <Badge variant="success">計測済み</Badge>
                    )}
                  </td>
                </tr>
                {open && (
                  <tr className="bg-slate-50/60">
                    <td colSpan={8} className="px-4 py-4">
                      {failed && <p className="mb-3 text-sm text-amber-800">測れなかった理由: {failed}</p>}
                      <Detail visit={v} />
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
