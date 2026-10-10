/**
 * 品質の計測（QualityMeasurement）を、月ごとに表にして出す。読み取りだけ。
 *
 *   DATABASE_URL=... npx ts-node scripts/quality-report.ts [月数=6] [--visits YYYY-MM]
 *
 * 管理画面（/admin/quality）と同じ集計関数を使う。AIが「どの月に何が動いたか」を読むための口で、
 * 数字の定義と読み方は 07_ROADMAP/10_quality_measurement.md。
 */
import { PrismaClient } from '@prisma/client';
import {
  aggregateMonth,
  monthKeyJst,
  monthRangeJst,
} from '../src/modules/quality/quality-metrics';

const pct = (v: number | null) => (v == null ? '  —  ' : `${(v * 100).toFixed(1).padStart(5)}%`);

async function main() {
  const prisma = new PrismaClient();
  const months = Number(process.argv.find((a) => /^\d+$/.test(a)) ?? 6);
  const visitsIdx = process.argv.indexOf('--visits');
  const visitsMonth = visitsIdx >= 0 ? process.argv[visitsIdx + 1] : null;

  const rows = await prisma.qualityMeasurement.findMany({ orderBy: { visitedAt: 'asc' } });
  const keys = [...new Set(rows.map((r) => monthKeyJst(r.visitedAt)))].slice(-months);

  console.log('月        診察 | 発話再現 一致 | 用語回収(補正後/前) | SOAP転記  根拠なし/診察');
  for (const key of keys) {
    const inMonth = rows.filter((r) => monthKeyJst(r.visitedAt) === key);
    const a = aggregateMonth(inMonth);
    console.log(
      `${key}  ${String(a.measuredVisits).padStart(3)} | ${pct(a.utteranceRecall)} ${pct(a.utterancePrecision)} | ${pct(a.termRecall)} / ${pct(a.termRecallRaw)} | ${pct(a.soapCoverage)}  ${a.unsupportedPerVisit?.toFixed(2) ?? '—'}`,
    );
  }
  console.log('
※ SOAP転記率はLLM判定の物差し。人が的を付けたeval（Zoom+GPT=74%）の数字とは比べない');
  console.log('※ 割合は診察の合算。基準は録音全体の文字起こしで、正解ではない。1か月の動きを見る');

  if (visitsMonth) {
    const range = monthRangeJst(visitsMonth);
    if (!range) throw new Error('月は YYYY-MM で指定してください');
    console.log(`\n${visitsMonth} の診察ごと`);
    for (const r of rows.filter((x) => x.visitedAt >= range.from && x.visitedAt < range.to)) {
      const cfg = (r.config ?? {}) as Record<string, unknown>;
      console.log(
        `${r.visitedAt.toISOString().slice(0, 16)}  ${r.consultationId.slice(0, 8)}  再現 ${pct(r.utteranceRecall)}  用語 ${r.termHitCount ?? '—'}/${r.termRefCount ?? '—'}  事実 ${r.factHitCount ?? '—'}/${r.factCount ?? '—'}  commit ${cfg.commit ?? '—'}${r.sttError || r.soapError ? `  ⚠ ${r.sttError ?? r.soapError}` : ''}`,
      );
    }
  }
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
