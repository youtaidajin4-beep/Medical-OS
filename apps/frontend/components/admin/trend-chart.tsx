import type { QualityMonth } from '@/lib/api-client';
import { pct } from '@/lib/quality-format';

const W = 260;
const H = 112;
const PAD = { l: 34, r: 10, t: 10, b: 22 };

/**
 * 月ごとの推移を1指標ずつ描く（小さな図を並べる）。縦軸は0〜100%で共通にして、図どうしを比べられるようにする。
 * 測れていない月は線をつながない（0%として描かない）。
 */
export function TrendChart({
  title,
  months,
  pick,
  baseline,
  baselineLabel,
}: {
  title: string;
  months: QualityMonth[];
  pick: (m: QualityMonth) => number | null;
  baseline?: number;
  baselineLabel?: string;
}) {
  const innerW = W - PAD.l - PAD.r;
  const innerH = H - PAD.t - PAD.b;
  const x = (i: number) =>
    PAD.l + (months.length <= 1 ? innerW / 2 : (i / (months.length - 1)) * innerW);
  const y = (v: number) => PAD.t + (1 - Math.min(Math.max(v, 0), 1)) * innerH;

  const segments: string[] = [];
  let current: string[] = [];
  months.forEach((m, i) => {
    const v = pick(m);
    if (v == null) {
      if (current.length) segments.push(current.join(' '));
      current = [];
    } else {
      current.push(`${current.length ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`);
    }
  });
  if (current.length) segments.push(current.join(' '));

  const summary = months.map((m) => `${m.month} ${pct(pick(m))}`).join('、');

  return (
    <figure className="rounded-xl border border-slate-200 bg-white p-4 shadow-card">
      <figcaption className="mb-1 flex items-baseline justify-between gap-2 text-sm font-medium text-slate-700">
        <span>{title}</span>
        {baseline != null && (
          <span className="text-xs font-normal text-amber-700">
            <span aria-hidden="true">╌╌ </span>
            {baselineLabel ?? `基準 ${pct(baseline)}`}
          </span>
        )}
      </figcaption>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={`${title}の月ごとの推移。${summary}`}>
        {[0, 0.5, 1].map((g) => (
          <g key={g}>
            <line x1={PAD.l} x2={W - PAD.r} y1={y(g)} y2={y(g)} className="stroke-slate-200" strokeWidth="1" />
            <text x={PAD.l - 6} y={y(g) + 3} textAnchor="end" className="fill-slate-400" fontSize="9">
              {g * 100}%
            </text>
          </g>
        ))}
        {baseline != null && (
          <line
            x1={PAD.l}
            x2={W - PAD.r}
            y1={y(baseline)}
            y2={y(baseline)}
            className="stroke-amber-500"
            strokeWidth="1"
            strokeDasharray="4 3"
          />
        )}
        {segments.map((d, i) => (
          <path key={i} d={d} fill="none" className="stroke-brand-600" strokeWidth="2" strokeLinejoin="round" />
        ))}
        {months.map((m, i) => {
          const v = pick(m);
          return (
            <g key={m.month}>
              {v != null && (
                <>
                  <circle cx={x(i)} cy={y(v)} r="3" className="fill-brand-600" />
                  <text x={x(i)} y={y(v) - 6} textAnchor="middle" className="fill-slate-700" fontSize="9" fontWeight="600">
                    {pct(v)}
                  </text>
                </>
              )}
              <text x={x(i)} y={H - 6} textAnchor="middle" className="fill-slate-500" fontSize="9">
                {Number(m.month.split('-')[1])}月
              </text>
            </g>
          );
        })}
      </svg>
    </figure>
  );
}
