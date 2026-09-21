'use client';

import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, Check, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api-client';

type PendingTerm = {
  id: string;
  rawValue: string;
  entityType: string;
  riskLevel: string;
  suggestion: string | null;
};

/**
 * 書類を作る前に、先生の確認が要る用語をその場で片づけるための欄。
 *
 * 「5ミリ」は 5mg とも 5mL とも取れるので、確かめずに紙へ出さない決まりになっている。
 * 以前はこの確認がSOAPの画面にしか無く、書類の画面では
 * 「レビュー画面で確定してください」とだけ出て、**そこから進めなかった**。
 * 確認する場所を、書類を作ろうとしている場所に置く。
 */
export function PendingTermsNotice({
  consultationId,
  onResolved,
}: {
  consultationId: string;
  /** 全部片づいたら親へ知らせる（書類作成をそのまま続けられるように） */
  onResolved?: () => void;
}) {
  const [terms, setTerms] = useState<PendingTerm[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setTerms(await api.listPendingTerms(consultationId));
    } catch {
      // 確認欄が出せないことで書類の画面を止めない
      setTerms([]);
    }
  }, [consultationId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function decide(term: PendingTerm, correctedTerm: string) {
    setBusyId(term.id);
    try {
      await api.approveDoctorCorrection({
        consultationId,
        originalTerm: term.rawValue,
        correctedTerm,
        category: term.entityType,
      });
      const rest = terms.filter((t) => t.id !== term.id);
      setTerms(rest);
      if (rest.length === 0) onResolved?.();
    } finally {
      setBusyId(null);
    }
  }

  if (terms.length === 0) return null;

  return (
    <div className="no-print rounded-2xl border border-amber-300 bg-amber-50/70 p-3">
      <p className="flex items-center gap-1.5 text-xs font-semibold text-amber-900">
        <AlertTriangle className="h-4 w-4" />
        紙に出す前に確認してください（{terms.length}件）
      </p>
      <p className="mt-0.5 text-[11px] text-amber-800">
        聞き取った言葉のままでは単位が決まりません。ここを決めるまで書類は作れません。
      </p>
      <ul className="mt-2 space-y-1.5">
        {terms.map((term) => (
          <li
            key={term.id}
            className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-200 bg-white/80 px-2.5 py-1.5"
          >
            <span className="text-sm text-slate-800">
              {term.rawValue}
              {term.suggestion && term.suggestion !== term.rawValue && (
                <span className="ml-2 text-xs text-slate-500">→ {term.suggestion}</span>
              )}
            </span>
            <span className="flex shrink-0 gap-1">
              {term.suggestion && term.suggestion !== term.rawValue && (
                <Button
                  size="sm"
                  variant="secondary"
                  icon={<Check />}
                  disabled={busyId === term.id}
                  onClick={() => decide(term, term.suggestion!)}
                >
                  {term.suggestion} にする
                </Button>
              )}
              <Button
                size="sm"
                variant="ghost"
                icon={<RotateCcw />}
                disabled={busyId === term.id}
                onClick={() => decide(term, term.rawValue)}
              >
                原文のまま
              </Button>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
