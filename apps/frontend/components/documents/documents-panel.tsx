'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  Check,
  ClipboardList,
  FileHeart,
  FileText,
  Loader2,
  Pill,
  Printer,
  RotateCcw,
  Stethoscope,
  Wand2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api-client';
import { buildConsultationContext, generateDocuments } from '@/lib/mock-documents/generate-documents';
import type {
  ConsultationContext,
  DocumentTypeId,
  GeneratedDocuments,
  SoapData,
} from '@/lib/mock-documents/types';
import { ReferralLetter } from './referral-letter';
import { PrescriptionList } from './prescription-list';
import { MedicalCertificate } from './medical-certificate';
import { CareOpinion1 } from './care-opinion-1';
import { CareOpinion2 } from './care-opinion-2';
import { InfoProvideCombined } from './info-provide-combined';
import '@/styles/documents-print.css';

const DOCUMENT_OPTIONS: Array<{
  id: DocumentTypeId;
  label: string;
  icon: typeof FileText;
}> = [
  { id: 'referral', label: '診療情報提供書', icon: FileText },
  { id: 'prescription', label: '現在の処方', icon: Pill },
  { id: 'info-combined', label: '情報提供書＋処方', icon: ClipboardList },
  { id: 'certificate', label: '診断書', icon: Stethoscope },
  { id: 'care-opinion-1', label: '主治医意見書①', icon: FileHeart },
  { id: 'care-opinion-2', label: '主治医意見書②', icon: FileHeart },
];

const API_TYPE_TO_KEY: Record<string, keyof GeneratedDocuments> = {
  referral: 'referral',
  prescription: 'prescription',
  certificate: 'certificate',
  'care-opinion-1': 'careOpinion1',
  'care-opinion-2': 'careOpinion2',
  'info-combined': 'infoCombined',
};

function apiDocsToGenerated(
  apiDocs: Array<{ type: string; content: Record<string, unknown> }>,
  fallback: GeneratedDocuments,
): GeneratedDocuments {
  const result = { ...fallback };
  for (const doc of apiDocs) {
    const key = API_TYPE_TO_KEY[doc.type];
    if (key === 'infoCombined') {
      result.infoCombined = doc.content as GeneratedDocuments['infoCombined'];
    } else if (key) {
      (result as Record<string, unknown>)[key] = doc.content;
    }
  }
  return result;
}

export function DocumentsPanel({
  consultationId,
  documentInput,
  approved,
  onBack,
  autoGenerate,
}: {
  consultationId: string;
  documentInput: {
    caseCode: string;
    patientName: string;
    sex?: string | null;
    age?: number | null;
    dateOfBirth?: string | null;
    phone?: string | null;
    memo?: string | null;
    soap: SoapData;
    structured?: Record<string, unknown> | null;
  };
  approved: boolean;
  onBack?: () => void;
  autoGenerate?: boolean;
}) {
  const [selected, setSelected] = useState<DocumentTypeId[]>(['referral', 'prescription']);
  const [docs, setDocs] = useState<GeneratedDocuments | null>(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [hasApiDocs, setHasApiDocs] = useState(false);

  const ctx: ConsultationContext = useMemo(
    () => buildConsultationContext(documentInput),
    [documentInput],
  );

  const mockFallback = useMemo(() => generateDocuments(ctx), [ctx]);

  const loadDocuments = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const apiDocs = await api.getDocuments(consultationId);
      if (apiDocs.length > 0) {
        setDocs(apiDocsToGenerated(apiDocs, mockFallback));
        setHasApiDocs(true);
      } else {
        setDocs(mockFallback);
        setHasApiDocs(false);
      }
    } catch {
      setDocs(mockFallback);
      setHasApiDocs(false);
    } finally {
      setLoading(false);
    }
  }, [consultationId, mockFallback]);

  useEffect(() => {
    void loadDocuments();
  }, [loadDocuments]);

  useEffect(() => {
    if (autoGenerate && !hasApiDocs && !generating && approved) {
      void handleGenerateAll();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoGenerate, hasApiDocs, approved]);

  async function handleGenerateAll() {
    setGenerating(true);
    setError('');
    try {
      const apiDocs = await api.generateAllDocuments(consultationId);
      setDocs(apiDocsToGenerated(apiDocs, mockFallback));
      setHasApiDocs(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : '書類の生成に失敗しました');
    } finally {
      setGenerating(false);
    }
  }

  async function persistDoc(type: DocumentTypeId, updated: GeneratedDocuments) {
    const contentMap: Record<DocumentTypeId, Record<string, unknown>> = {
      referral: updated.referral as unknown as Record<string, unknown>,
      prescription: updated.prescription as unknown as Record<string, unknown>,
      certificate: updated.certificate as unknown as Record<string, unknown>,
      'care-opinion-1': updated.careOpinion1 as unknown as Record<string, unknown>,
      'care-opinion-2': updated.careOpinion2 as unknown as Record<string, unknown>,
      'info-combined': (updated.infoCombined ?? {}) as unknown as Record<string, unknown>,
    };
    if (hasApiDocs) {
      try {
        await api.updateDocument(consultationId, type, contentMap[type]);
      } catch {
        /* ローカル編集は維持 */
      }
    }
  }

  function updateDocs(type: DocumentTypeId, updater: (prev: GeneratedDocuments) => GeneratedDocuments) {
    setDocs((prev) => {
      if (!prev) return prev;
      const next = updater(prev);
      void persistDoc(type, next);
      return next;
    });
  }

  function toggle(id: DocumentTypeId) {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function handleReset() {
    if (hasApiDocs) {
      void loadDocuments();
    } else {
      setDocs(mockFallback);
    }
  }

  function handlePrint() {
    window.print();
  }

  function renderDoc(id: DocumentTypeId) {
    if (!docs) return null;
    switch (id) {
      case 'referral':
        return (
          <ReferralLetter
            data={docs.referral}
            onChange={(referral) => updateDocs('referral', (d) => ({ ...d, referral }))}
          />
        );
      case 'prescription':
        return (
          <PrescriptionList
            data={docs.prescription}
            onChange={(prescription) => updateDocs('prescription', (d) => ({ ...d, prescription }))}
          />
        );
      case 'info-combined':
        return docs.infoCombined ? (
          <InfoProvideCombined
            data={docs.infoCombined}
            onChange={(infoCombined) => updateDocs('info-combined', (d) => ({ ...d, infoCombined }))}
          />
        ) : null;
      case 'certificate':
        return (
          <MedicalCertificate
            data={docs.certificate}
            onChange={(certificate) => updateDocs('certificate', (d) => ({ ...d, certificate }))}
          />
        );
      case 'care-opinion-1':
        return (
          <CareOpinion1
            data={docs.careOpinion1}
            onChange={(careOpinion1) => updateDocs('care-opinion-1', (d) => ({ ...d, careOpinion1 }))}
          />
        );
      case 'care-opinion-2':
        return (
          <CareOpinion2
            data={docs.careOpinion2}
            onChange={(careOpinion2) => updateDocs('care-opinion-2', (d) => ({ ...d, careOpinion2 }))}
          />
        );
    }
  }

  if (loading && !docs) {
    return (
      <div className="flex items-center justify-center gap-2 py-12 text-slate-500">
        <Loader2 className="h-5 w-5 animate-spin" />
        書類を読み込み中…
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Alert variant="info" className="no-print">
        書類は診療データと先生のルール設定から生成されます。編集内容は自動保存され、次回生成の参考になります。
      </Alert>

      {error && (
        <Alert variant="error" className="no-print">
          {error}
        </Alert>
      )}

      <div className="no-print flex flex-wrap gap-2">
        <Button
          size="sm"
          icon={generating ? <Loader2 className="animate-spin" /> : <Wand2 />}
          disabled={!approved || generating}
          onClick={handleGenerateAll}
        >
          {generating ? '生成中…' : '全書類を生成'}
        </Button>
        {!approved && (
          <p className="self-center text-sm text-amber-700">書類生成には先に「確認済みにする」が必要です</p>
        )}
      </div>

      <div className="no-print grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {DOCUMENT_OPTIONS.map(({ id, label, icon: Icon }) => {
          const active = selected.includes(id);
          return (
            <button
              key={id}
              type="button"
              onClick={() => toggle(id)}
              aria-pressed={active}
              className={cn(
                'relative flex items-center gap-2.5 rounded-xl border p-3 text-left text-sm font-medium transition-all',
                active
                  ? 'border-brand-500 bg-brand-50 text-brand-800 shadow-sm'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50',
              )}
            >
              <Icon className={cn('h-4 w-4 shrink-0', active ? 'text-brand-600' : 'text-slate-400')} />
              <span className="min-w-0 flex-1 truncate">{label}</span>
              <span
                className={cn(
                  'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-colors',
                  active ? 'border-brand-600 bg-brand-600 text-white' : 'border-slate-300 bg-white',
                )}
              >
                {active && <Check className="h-3 w-3" />}
              </span>
            </button>
          );
        })}
      </div>

      <div className="no-print sticky top-2 z-20 flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white/95 p-3 shadow-card backdrop-blur">
        {onBack && (
          <Button size="sm" variant="ghost" icon={<ArrowLeft />} onClick={onBack}>
            SOAP に戻る
          </Button>
        )}
        <Button size="sm" variant="secondary" icon={<RotateCcw />} onClick={handleReset}>
          生成内容に戻す
        </Button>
        <Button
          size="sm"
          icon={<Printer />}
          disabled={!approved || selected.length === 0}
          onClick={handlePrint}
        >
          選択した書類を印刷（{selected.length}件）
        </Button>
      </div>

      <div className="doc-print-root doc-print-area overflow-x-auto rounded-xl border border-slate-200 bg-slate-100 p-4">
        {selected.length === 0 && (
          <div className="no-print flex flex-col items-center gap-2 py-12 text-slate-400">
            <ClipboardList className="h-8 w-8" />
            <p className="text-sm">上のカードから印刷する書類を選択してください</p>
          </div>
        )}
        {selected.map((id) => (
          <div key={id}>{renderDoc(id)}</div>
        ))}
      </div>
    </div>
  );
}
