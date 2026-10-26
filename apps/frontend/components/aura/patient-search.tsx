'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Plus, Search, UserPlus, X } from 'lucide-react';
import { filterPatients } from '@/lib/patient-search';
import { cn } from '@/lib/utils';
import { PatientCard, type PatientLike } from './patient-card';

/**
 * 患者を探す。大きな検索バーが主役で、結果は軽いカードで並べる。
 * 名前・フリガナ・カルテ番号・電話で引ける。「/」で検索欄へ、↑↓ と Enter で選べる。
 */
export function PatientSearch<T extends PatientLike & { phone?: string | null }>({
  patients,
  loading,
  selectedId,
  onSelect,
  onAddNew,
  onAnonymous,
  autoFocus,
  maxHeightClass = 'max-h-[26rem]',
}: {
  patients: T[];
  loading?: boolean;
  selectedId?: string;
  onSelect: (patient: T) => void;
  onAddNew: (query: string) => void;
  onAnonymous?: () => void;
  autoFocus?: boolean;
  maxHeightClass?: string;
}) {
  const [query, setQuery] = useState('');
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const results = useMemo(() => filterPatients(patients, query), [patients, query]);

  useEffect(() => setCursor(0), [query]);
  useEffect(() => {
    if (autoFocus) inputRef.current?.focus();
  }, [autoFocus]);
  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>(`[data-index="${cursor}"]`)?.scrollIntoView?.({ block: 'nearest' });
  }, [cursor]);
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const t = e.target as HTMLElement | null;
      const typing = t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable);
      if (e.key === '/' && !typing) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.nativeEvent.isComposing) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setCursor((c) => Math.min(results.length - 1, c + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setCursor((c) => Math.max(0, c - 1));
    } else if (e.key === 'Enter' && !(e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      const hit = results[cursor];
      if (hit) onSelect(hit);
    } else if (e.key === 'Escape') {
      setQuery('');
    }
  }

  return (
    <div className="w-full">
      <div className="relative">
        <Search className="pointer-events-none absolute left-5 top-1/2 h-5 w-5 -translate-y-1/2 text-aura-ink-muted" />
        <input
          ref={inputRef}
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="患者名・患者IDで検索"
          aria-label="患者を検索"
          className="h-14 w-full rounded-full border border-aura-line bg-white pl-14 pr-14 text-[16px] text-aura-ink shadow-float outline-none transition duration-200 placeholder:text-aura-ink-muted/70 focus:border-aura-mint-300 focus:shadow-float-lg"
        />
        {query ? (
          <button
            type="button"
            onClick={() => {
              setQuery('');
              inputRef.current?.focus();
            }}
            aria-label="検索をクリア"
            className="absolute right-4 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-aura-ink-muted hover:bg-aura-mist"
          >
            <X className="h-4 w-4" />
          </button>
        ) : (
          <kbd className="pointer-events-none absolute right-5 top-1/2 hidden -translate-y-1/2 rounded-md border border-aura-line bg-aura-paper px-2 py-0.5 font-sans text-[11px] text-aura-ink-muted min-[640px]:block">
            /
          </kbd>
        )}
      </div>

      <div ref={listRef} className={cn('mt-5 overflow-y-auto pr-1', maxHeightClass)}>
        {loading ? (
          <p className="px-4 py-8 text-center text-sm text-aura-ink-muted">読み込み中…</p>
        ) : patients.length === 0 ? (
          <div className="px-4 py-10 text-center">
            <p className="text-sm text-aura-ink-soft">まだ患者が登録されていません</p>
            <button
              type="button"
              onClick={() => onAddNew('')}
              className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-aura-ink px-4 py-2 text-[13px] font-semibold text-white transition hover:-translate-y-px"
            >
              <Plus className="h-4 w-4" />
              新規患者を登録
            </button>
          </div>
        ) : results.length === 0 ? (
          <div className="px-4 py-10 text-center">
            <p className="text-sm text-aura-ink">「{query}」に当てはまる患者がいません</p>
            <button
              type="button"
              onClick={() => onAddNew(query.trim())}
              className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-aura-ink px-4 py-2 text-[13px] font-semibold text-white transition hover:-translate-y-px"
            >
              <UserPlus className="h-4 w-4" />
              この名前で新規登録
            </button>
          </div>
        ) : (
          <div role="listbox" aria-label="患者の一覧" className="space-y-1">
            {!query && (
              <p className="px-4 pb-1 text-[11px] font-semibold tracking-[0.18em] text-aura-ink-muted">
                最近の診療順
              </p>
            )}
            {results.map((p, i) => (
              <PatientCard
                key={p.id}
                index={i}
                patient={p}
                selected={p.id === selectedId}
                highlighted={Boolean(query) && i === cursor}
                onSelect={() => onSelect(p)}
              />
            ))}
          </div>
        )}
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-aura-line pt-4 text-[13px]">
        <button
          type="button"
          onClick={() => onAddNew(query.trim())}
          className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 font-medium text-aura-teal-600 transition hover:bg-aura-mint-50"
        >
          <Plus className="h-4 w-4" />
          新規患者
        </button>
        {onAnonymous && (
          <button
            type="button"
            onClick={onAnonymous}
            className="rounded-full px-3 py-1.5 text-aura-ink-muted transition hover:bg-aura-mist hover:text-aura-ink"
          >
            患者を選ばずに始める
          </button>
        )}
      </div>
    </div>
  );
}
