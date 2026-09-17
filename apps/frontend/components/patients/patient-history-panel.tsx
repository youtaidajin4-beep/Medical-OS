'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ChevronDown, ChevronRight, FileText } from 'lucide-react';
import { api } from '@/lib/api-client';
import { Spinner } from '@/components/ui/spinner';
import { formatRoutineApCombined } from '@/lib/soap-visit';

/**
 * その患者の過去の診療とSOAPを、新しい順に並べる。
 *
 * これまで履歴は全診療のフラットな時系列一覧しか無く、「桑原さんの前回は何だったか」を
 * 見る手段が無かった。紹介状のように経過を書く書類は、1回の診察だけでは書けない。
 */

type Consultation = {
  id: string;
  date: string;
  visitNumber: number;
  visitType: 'ROUTINE' | 'CHECKUP';
  status: string;
  physicianName: string | null;
  documentCount: number;
  soap: { subjective: string; objective: string; assessment: string; plan: string } | null;
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`;
}

export function PatientHistoryPanel({ patientId }: { patientId: string }) {
  const [rows, setRows] = useState<Consultation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [openId, setOpenId] = useState<string>('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    api
      .patientConsultations(patientId)
      .then((res) => {
        if (cancelled) return;
        setRows(res.consultations);
        // 直近の1件は最初から開いておく。だいたい見たいのはここ
        setOpenId(res.consultations[0]?.id ?? '');
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : '履歴を取得できませんでした');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [patientId]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-4 text-sm text-slate-500">
        <Spinner />
        これまでの診療を読み込んでいます…
      </div>
    );
  }

  if (error) {
    return <p className="py-3 text-sm text-rose-700">{error}</p>;
  }

  if (rows.length === 0) {
    return (
      <p className="py-3 text-sm text-slate-500">
        この患者さんの診療はまだありません。下の「この患者で診療開始」から始めると、ここに溜まっていきます。
      </p>
    );
  }

  return (
    <ul className="space-y-2">
      {rows.map((row) => {
        const open = openId === row.id;
        const ap =
          row.soap && row.visitType === 'ROUTINE'
            ? formatRoutineApCombined(row.soap.assessment, row.soap.plan)
            : '';
        return (
          <li key={row.id} className="rounded-xl border border-slate-200 bg-white">
            <button
              type="button"
              className="flex w-full items-center gap-2 px-3 py-2 text-left"
              onClick={() => setOpenId(open ? '' : row.id)}
            >
              {open ? (
                <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" />
              ) : (
                <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />
              )}
              <span className="text-sm font-semibold text-slate-800">{formatDate(row.date)}</span>
              <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-600">
                {row.visitType === 'CHECKUP' ? '健診' : '通常診察'}
              </span>
              <span className="text-xs text-slate-400">{row.visitNumber}回目</span>
              {row.documentCount > 0 && (
                <span className="flex items-center gap-1 text-[10px] text-slate-500">
                  <FileText className="h-3 w-3" />
                  書類{row.documentCount}
                </span>
              )}
              {!row.soap && (
                <span className="rounded bg-amber-50 px-1.5 py-0.5 text-[10px] text-amber-700">
                  SOAPなし
                </span>
              )}
            </button>

            {open && (
              <div className="border-t border-slate-100 px-3 py-2 text-sm">
                {row.soap ? (
                  <dl className="space-y-1.5">
                    <SoapLine label="S" value={row.soap.subjective} />
                    <SoapLine label="O" value={row.soap.objective} />
                    {ap ? (
                      <SoapLine label="A/P" value={ap.replace(/^A\/P：/, '')} />
                    ) : (
                      <>
                        <SoapLine label="A" value={row.soap.assessment} />
                        <SoapLine label="P" value={row.soap.plan} />
                      </>
                    )}
                  </dl>
                ) : (
                  <p className="text-slate-500">
                    この診療にはSOAPがありません（音声から作成できなかった回です）。
                  </p>
                )}
                <Link
                  href={`/consultation/${row.id}`}
                  className="mt-2 inline-block text-xs font-medium text-[#0f766e] hover:underline"
                >
                  この診療を開く
                </Link>
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

function SoapLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2">
      <dt className="w-8 shrink-0 text-xs font-bold text-slate-400">{label}</dt>
      <dd className="whitespace-pre-wrap text-slate-700">
        {value.trim() || <span className="text-slate-300">—</span>}
      </dd>
    </div>
  );
}
