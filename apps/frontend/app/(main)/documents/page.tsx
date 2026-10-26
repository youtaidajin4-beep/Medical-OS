'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronRight, Search } from 'lucide-react';
import { api, getToken, isUnauthorizedError } from '@/lib/api-client';
import { DocumentCard } from '@/components/aura/document-card';
import { DOCUMENT_KINDS } from '@/components/consultation/document-launcher';
import { PatientAvatar } from '@/components/aura/patient-card';
import { cn } from '@/lib/utils';

type Row = { id: string; label: string; createdAt: string; status: string; hasDocuments: boolean };

function whenLabel(iso: string) {
  return new Date(iso).toLocaleString('ja-JP', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

/**
 * 書類をつくる。SOAPができた診療から、書類を作る入口。
 * 書類の種類を選び、SOAPのある診療を選ぶと、その診療の書類パネルが開く。
 */
export default function DocumentsPage() {
  const router = useRouter();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [kind, setKind] = useState<string>('referral');
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (!getToken()) {
      router.replace('/login');
      return;
    }
    api
      .consultations()
      .then((list) =>
        setRows(
          list
            .filter((c) => ['REVIEW', 'APPROVED', 'COMPLETED'].includes(c.status))
            .slice(0, 60)
            .map((c) => ({
              id: c.id,
              label: c.patient?.name ?? c.anonymousCase?.displayName ?? '診療',
              createdAt: c.startedAt ?? c.createdAt,
              status: c.status,
              hasDocuments: Boolean(c.hasDocuments),
            })),
        ),
      )
      .catch((e) => {
        if (isUnauthorizedError(e)) router.replace('/login');
      })
      .finally(() => setLoading(false));
  }, [router]);

  const shown = query.trim() ? rows.filter((r) => r.label.includes(query.trim())) : rows.slice(0, 12);
  const kindLabel = DOCUMENT_KINDS.find((k) => k.id === kind)?.label ?? '';

  return (
    <div className="mx-auto w-full max-w-3xl py-4">
      <p className="text-[12px] font-semibold tracking-[0.3em] text-aura-teal-500">DOCUMENTS</p>
      <h1 className="mt-2 text-[32px] font-semibold tracking-tight text-aura-ink">書類をつくる</h1>
      <p className="mt-2 text-[15px] text-aura-ink-soft">SOAPをもとに、AIが下書きを作ります。</p>

      <section className="mt-9">
        <p className="mb-3 text-[12px] font-semibold tracking-[0.2em] text-aura-ink-muted">1. 書類をえらぶ</p>
        <div className="grid gap-4 min-[640px]:grid-cols-3">
          {DOCUMENT_KINDS.map((k) => (
            <DocumentCard key={k.id} kind={k} selected={kind === k.id} onSelect={() => setKind(k.id)} />
          ))}
        </div>
      </section>

      <section className="mt-10">
        <p className="mb-3 text-[12px] font-semibold tracking-[0.2em] text-aura-ink-muted">
          2. 誰の、いつの診療から作りますか
        </p>
        <div className="relative mb-3">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-aura-ink-muted" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="患者名で絞り込む"
            aria-label="患者名で絞り込む"
            className="h-11 w-full rounded-full border border-aura-line bg-white pl-11 pr-4 text-[14px] text-aura-ink outline-none transition focus:border-aura-mint-300 focus:shadow-float"
          />
        </div>
        {loading ? (
          <p className="px-2 py-6 text-sm text-aura-ink-muted">読み込み中…</p>
        ) : rows.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-aura-line px-6 py-10 text-center">
            <p className="text-sm text-aura-ink-soft">SOAPができた診療が、まだありません。</p>
            <p className="mt-1 text-xs text-aura-ink-muted">左上の「SOAPをつくる」から、診療をはじめましょう。</p>
          </div>
        ) : shown.length === 0 ? (
          <p className="px-2 py-6 text-sm text-aura-ink-muted">「{query}」の診療が見つかりません。</p>
        ) : (
          <ul className="space-y-1">
            {shown.map((r) => (
              <li key={r.id}>
                <button
                  type="button"
                  onClick={() => router.push(`/consultation/${r.id}?docs=1&kind=${kind}`)}
                  className="group flex w-full items-center gap-4 rounded-3xl border border-transparent px-4 py-3 text-left transition duration-200 hover:-translate-y-px hover:border-aura-line hover:bg-white hover:shadow-float"
                >
                  <PatientAvatar name={r.label} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[15px] font-semibold text-aura-ink">{r.label}</span>
                    <span className="block text-[12px] text-aura-ink-muted">{whenLabel(r.createdAt)}</span>
                  </span>
                  <span
                    className={cn(
                      'text-[12px] font-medium',
                      r.status === 'REVIEW' ? 'text-amber-600' : 'text-aura-teal-600',
                    )}
                  >
                    {r.status === 'REVIEW' ? '● 確認待ち' : '✓ SOAP完成'}
                    {r.hasDocuments ? ' · 書類あり' : ''}
                  </span>
                  <span className="hidden text-[12px] text-aura-ink-muted min-[640px]:inline">{kindLabel}を作る</span>
                  <ChevronRight className="h-4 w-4 text-aura-ink-muted/50 transition group-hover:translate-x-0.5 group-hover:text-aura-teal-500" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
