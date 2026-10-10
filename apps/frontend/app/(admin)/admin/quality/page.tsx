'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Download } from 'lucide-react';
import {
  api,
  ApiError,
  getToken,
  isUnauthorizedError,
  type QualityMonth,
  type QualityOverview,
  type QualityVisit,
} from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { TrendChart } from '@/components/admin/trend-chart';
import { MetricGuide } from '@/components/admin/metric-guide';
import { VisitTable } from '@/components/admin/visit-table';
import { deltaPt, monthLabel, pct } from '@/lib/quality-format';

function Tile({
  label,
  value,
  delta,
  note,
  tone,
}: {
  label: string;
  value: string;
  delta?: string | null;
  note: string;
  tone?: 'good' | 'bad';
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-card">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-1 text-3xl font-bold tracking-tight text-slate-900 tabular-nums">{value}</p>
      <p className="mt-1 text-xs text-slate-500">
        {delta && (
          <span
            className={
              tone === 'good' ? 'mr-1.5 font-semibold text-emerald-700' : tone === 'bad' ? 'mr-1.5 font-semibold text-red-700' : 'mr-1.5 font-semibold text-slate-600'
            }
          >
            前月比 {delta}
          </span>
        )}
        {note}
      </p>
    </div>
  );
}

function toneOf(delta: string | null): 'good' | 'bad' | undefined {
  if (!delta || delta === '±0pt') return undefined;
  return delta.startsWith('+') ? 'good' : 'bad';
}

export default function AdminQualityPage() {
  const router = useRouter();
  const [overview, setOverview] = useState<QualityOverview | null>(null);
  const [month, setMonth] = useState<string | null>(null);
  const [visits, setVisits] = useState<QualityVisit[] | null>(null);
  const [error, setError] = useState<{ message: string; forbidden: boolean } | null>(null);

  useEffect(() => {
    if (!getToken()) {
      router.replace('/login');
      return;
    }
    api
      .qualityOverview(12)
      .then((o) => {
        setOverview(o);
        const withData = [...o.months].reverse().find((m) => m.measuredVisits > 0);
        setMonth((withData ?? o.months[o.months.length - 1])?.month ?? null);
      })
      .catch((e: unknown) => {
        if (isUnauthorizedError(e)) {
          router.replace('/login');
          return;
        }
        setError({
          message: e instanceof Error ? e.message : '読み込めませんでした',
          forbidden: e instanceof ApiError && e.status === 403,
        });
      });
  }, [router]);

  useEffect(() => {
    if (!month) return;
    let live = true;
    setVisits(null);
    api
      .qualityVisits(month)
      .then((v) => live && setVisits(v))
      .catch((e: unknown) => live && setError({ message: e instanceof Error ? e.message : '読み込めませんでした', forbidden: false }));
    return () => {
      live = false;
    };
  }, [month]);

  const download = useCallback(async () => {
    if (!month) return;
    const blob = await api.qualityCsv(month);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `quality-${month}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [month]);

  const current: QualityMonth | undefined = useMemo(
    () => overview?.months.find((m) => m.month === month),
    [overview, month],
  );
  const previous: QualityMonth | undefined = useMemo(() => {
    if (!overview || !month) return undefined;
    const i = overview.months.findIndex((m) => m.month === month);
    return i > 0 ? overview.months[i - 1] : undefined;
  }, [overview, month]);

  if (error) {
    return (
      <Card>
        <CardContent className="space-y-2 py-8 text-center">
          <p className="text-base font-semibold text-slate-900">
            {error.forbidden ? 'この画面は管理者だけが見られます' : '読み込めませんでした'}
          </p>
          <p className="text-sm text-slate-600">
            {error.forbidden
              ? '管理者のロール（ADMIN）か、環境変数 QUALITY_ADMIN_EMAILS に載っているアカウントでログインしてください。'
              : error.message}
          </p>
        </CardContent>
      </Card>
    );
  }

  if (!overview || !current) {
    return (
      <div className="flex items-center justify-center gap-2 py-16 text-sm text-slate-500">
        <Spinner /> 読み込み中…
      </div>
    );
  }

  const empty = overview.months.every((m) => m.measuredVisits === 0);
  // 推移の図は、計測が始まった月から（最低6か月）。何も無い月を並べると、線が右端に潰れる
  const firstMeasured = overview.months.findIndex((m) => m.measuredVisits > 0);
  const chartMonths = overview.months.slice(
    firstMeasured < 0 ? overview.months.length - 6 : Math.min(firstMeasured, overview.months.length - 6),
  );
  const soapDelta = deltaPt(current.soapCoverage, previous?.soapCoverage ?? null);
  const recallDelta = deltaPt(current.utteranceRecall, previous?.utteranceRecall ?? null);
  const termDelta = deltaPt(current.termRecall, previous?.termRecall ?? null);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">品質計測</h1>
          <p className="mt-1 text-sm text-slate-500">
            診察が終わるたびに数字が積まれます。診察の画面には出ません。
          </p>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-slate-600" htmlFor="month">
            表示する月
          </label>
          <select
            id="month"
            value={month ?? ''}
            onChange={(e) => setMonth(e.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
          >
            {[...overview.months].reverse().map((m) => (
              <option key={m.month} value={m.month}>
                {monthLabel(m.month)}（{m.measuredVisits}/{m.totalVisits}件）
              </option>
            ))}
          </select>
          <Button variant="secondary" size="sm" icon={<Download />} onClick={() => void download()}>
            CSV
          </Button>
        </div>
      </div>

      {!overview.measurementEnabled && (
        <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900 ring-1 ring-inset ring-amber-200">
          計測は止めてあります（QUALITY_MEASUREMENT=off）。新しい診察の数字は積まれません。
        </p>
      )}
      {empty && (
        <p className="rounded-lg bg-slate-100 p-3 text-sm text-slate-700">
          まだ計測した診察がありません。この仕組みを入れたあとに終えた診察から、数字が積まれます。
        </p>
      )}

      <section aria-label={`${monthLabel(current.month)}の指標`} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Tile
          label="発話の再現率"
          value={pct(current.utteranceRecall)}
          delta={recallDelta}
          tone={toneOf(recallDelta)}
          note={`一致率 ${pct(current.utterancePrecision)} ・ ${current.counts.stt}件`}
        />
        <Tile
          label="医療用語の回収率"
          value={pct(current.termRecall)}
          delta={termDelta}
          tone={toneOf(termDelta)}
          note={`補正前 ${pct(current.termRecallRaw)} ・ ${current.counts.term}件`}
        />
        <Tile
          label="SOAPの転記率"
          value={pct(current.soapCoverage)}
          delta={soapDelta}
          tone={toneOf(soapDelta)}
          note={`判定による。${current.counts.soap}件`}
        />
        <Tile
          label="根拠のない記載（1診察あたり）"
          value={current.unsupportedPerVisit == null ? '—' : current.unsupportedPerVisit.toFixed(2)}
          note={`先生の修正 SOAP ${current.soapEditsPerVisit?.toFixed(1) ?? '—'} / 文字 ${current.transcriptEditsPerVisit?.toFixed(1) ?? '—'} 回`}
        />
      </section>

      <section aria-label="月ごとの推移" className="space-y-2">
        <h2 className="text-lg font-semibold text-slate-900">月ごとの推移</h2>
        <div className="grid gap-4 md:grid-cols-3">
          <TrendChart title="発話の再現率" months={chartMonths} pick={(m) => m.utteranceRecall} />
          <TrendChart title="医療用語の回収率（補正後）" months={chartMonths} pick={(m) => m.termRecall} />
          <TrendChart
            title="SOAPの転記率"
            months={chartMonths}
            pick={(m) => m.soapCoverage}
          />
        </div>
      </section>

      <section aria-label="診察ごと" className="space-y-2">
        <h2 className="text-lg font-semibold text-slate-900">{monthLabel(current.month)}の診察ごと</h2>
        {visits ? (
          <VisitTable visits={visits} />
        ) : (
          <div className="flex items-center gap-2 py-6 text-sm text-slate-500">
            <Spinner /> 読み込み中…
          </div>
        )}
      </section>

      {overview.configChanges.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">構成が変わった時点</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-3 text-sm text-slate-500">
              測ったときの構成（モデル名・コミット・辞書の語数）が前の診察と違った時点です。数字が動いた月は、ここと突き合わせます。
            </p>
            <ul className="space-y-2 text-sm">
              {[...overview.configChanges].reverse().map((c) => (
                <li key={c.at} className="rounded-lg bg-slate-50 p-3">
                  <p className="font-medium text-slate-800">{new Date(c.at).toLocaleString('ja-JP')}</p>
                  <ul className="mt-1 list-disc pl-5 text-xs text-slate-600">
                    {c.diff.map((d) => (
                      <li key={d}>{d}</li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <MetricGuide />
    </div>
  );
}
