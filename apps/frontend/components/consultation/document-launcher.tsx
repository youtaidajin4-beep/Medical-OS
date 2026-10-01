'use client';

import { useCallback, useEffect, useState } from 'react';
import { Check, FileHeart, FileText, Loader2, Plus, Stethoscope } from 'lucide-react';
import { api } from '@/lib/api-client';
import { cn } from '@/lib/utils';
import type { DocumentTypeId } from '@/lib/mock-documents/types';

/**
 * 書類を1タップで出す。
 *
 * これまでは「確認済みにする」→「書類を全部作る」→ カードで選ぶ → 生成、で4手かかっていた。
 * しかも紹介状の宛先はチャットで言うしかなく、病院名・診療科・医師名を毎回打っていた。
 * 1回の診療で要る書類は1〜2枚なので、**書類を押す＝その書類だけ作る**に変える。
 *
 * 宛先は過去に出した紹介先から選ぶ。紹介先はクリニックごとに数件へ収束するので、
 * 2回目以降は「診療情報提供書 → 宛先を選ぶ」の2タップで紙になる。
 */

export type DocumentKind = {
  id: DocumentTypeId;
  label: string;
  note: string;
  icon: typeof FileText;
  /** 宛先を選んでから作る書類か */
  needsRecipient?: boolean;
};

export const DOCUMENT_KINDS: DocumentKind[] = [
  {
    id: 'referral',
    label: '診療情報提供書',
    note: '診断書と2枚で紹介状',
    icon: FileText,
    needsRecipient: true,
  },
  {
    id: 'certificate',
    label: '診断書（検査結果）',
    note: '紹介状に同封する',
    icon: Stethoscope,
  },
  {
    id: 'care-opinion-set',
    label: '主治医意見書①②',
    note: '市町村へ・要介護認定用',
    icon: FileHeart,
  },
];

export type Recipient = { hospital: string; department?: string; doctor?: string };

function recipientLabel(r: Recipient): string {
  return [r.hospital, r.department, r.doctor && `${r.doctor}先生`].filter(Boolean).join(' / ');
}

export function DocumentLauncher({
  consultationId,
  disabled,
  disabledReason,
  madeTypes,
  busyType,
  onGenerate,
  className,
}: {
  consultationId: string;
  disabled?: boolean;
  /** 押せない理由。黙って押せないのが一番わかりにくい */
  disabledReason?: string;
  /** すでに作った書類。作り直しだと分かるように出す */
  madeTypes: DocumentTypeId[];
  busyType?: DocumentTypeId | null;
  onGenerate: (type: DocumentTypeId, recipient?: Recipient) => void;
  className?: string;
}) {
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [openFor, setOpenFor] = useState<DocumentTypeId | null>(null);
  const [manual, setManual] = useState('');
  const [loadingRecipients, setLoadingRecipients] = useState(false);

  const loadRecipients = useCallback(async () => {
    setLoadingRecipients(true);
    try {
      setRecipients(await api.listReferralRecipients(consultationId));
    } catch {
      setRecipients([]);
    } finally {
      setLoadingRecipients(false);
    }
  }, [consultationId]);

  useEffect(() => {
    void loadRecipients();
  }, [loadRecipients]);

  function handleClick(kind: DocumentKind) {
    if (disabled) return;
    if (!kind.needsRecipient) {
      onGenerate(kind.id);
      return;
    }
    setOpenFor((prev) => (prev === kind.id ? null : kind.id));
  }

  function pick(kind: DocumentTypeId, recipient?: Recipient) {
    setOpenFor(null);
    setManual('');
    onGenerate(kind, recipient);
  }

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-baseline justify-between">
        <p className="text-[11px] font-semibold tracking-[0.2em] text-clinic-ink-muted">
          この診察から作る
        </p>
        {disabled && disabledReason ? (
          <p className="text-[11px] text-clinic-ink-muted">{disabledReason}</p>
        ) : null}
      </div>

      {DOCUMENT_KINDS.map((kind) => {
        const Icon = kind.icon;
        const made = madeTypes.includes(kind.id);
        const busy = busyType === kind.id;
        const open = openFor === kind.id;
        return (
          <div
            key={kind.id}
            className={cn(
              'overflow-hidden rounded-2xl border bg-white transition-colors',
              open ? 'border-clinic-ink' : 'border-clinic-line',
              disabled && 'opacity-55',
            )}
          >
            <button
              type="button"
              disabled={disabled || busy}
              onClick={() => handleClick(kind)}
              className={cn(
                'flex w-full items-center gap-3 px-3.5 py-3 text-left transition-colors',
                !disabled && 'hover:bg-clinic-tint',
              )}
            >
              <span
                className={cn(
                  'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl',
                  made ? 'bg-clinic-ink text-clinic-gold' : 'bg-clinic-tint text-clinic-ink',
                )}
              >
                {busy ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : made ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Icon className="h-4 w-4" />
                )}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-clinic-ink">
                  {kind.label}
                </span>
                <span className="block truncate text-[11px] text-clinic-ink-muted">
                  {busy ? '作成中…' : made ? '作成済み — 押すと作り直します' : kind.note}
                </span>
              </span>
              {!busy && !disabled && (
                <span className="shrink-0 rounded-full bg-clinic-ink px-2.5 py-1 text-[11px] font-semibold text-clinic-cream">
                  {made ? '作り直す' : '作る'}
                </span>
              )}
            </button>

            {open && (
              <div className="space-y-2 border-t border-clinic-line bg-clinic-paper px-3.5 py-3">
                <p className="text-[11px] font-medium text-clinic-ink-muted">
                  紹介先を選ぶと、そのまま作ります
                </p>
                {loadingRecipients ? (
                  <p className="text-[11px] text-clinic-ink-muted">読み込み中…</p>
                ) : recipients.length ? (
                  <div className="flex flex-wrap gap-1.5">
                    {recipients.map((r) => (
                      <button
                        key={recipientLabel(r)}
                        type="button"
                        onClick={() => pick(kind.id, r)}
                        className="rounded-full border border-clinic-line bg-white px-3 py-1.5 text-[12px] font-medium text-clinic-ink hover:border-clinic-ink"
                      >
                        {recipientLabel(r)}
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-[11px] text-clinic-ink-muted">
                    まだ履歴がありません。1件作ると、次から選べます。
                  </p>
                )}
                <div className="flex gap-1.5">
                  <input
                    value={manual}
                    onChange={(e) => setManual(e.target.value)}
                    placeholder="例: 長崎医療センター 循環器内科 田中"
                    className="min-w-0 flex-1 rounded-xl border border-clinic-line bg-white px-3 py-2 text-[13px] text-clinic-ink outline-none placeholder:text-clinic-ink-muted focus:border-clinic-ink"
                    onKeyDown={(e) => {
                      if (e.key !== 'Enter' || !manual.trim()) return;
                      e.preventDefault();
                      const [hospital, department, doctor] = manual.trim().split(/\s+/);
                      pick(kind.id, { hospital: hospital ?? '', department, doctor });
                    }}
                  />
                  <button
                    type="button"
                    disabled={!manual.trim()}
                    onClick={() => {
                      const [hospital, department, doctor] = manual.trim().split(/\s+/);
                      pick(kind.id, { hospital: hospital ?? '', department, doctor });
                    }}
                    className="inline-flex shrink-0 items-center gap-1 rounded-xl bg-clinic-ink px-3 py-2 text-[12px] font-semibold text-clinic-cream disabled:opacity-40"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    作る
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => pick(kind.id)}
                  className="text-[11px] font-medium text-clinic-ink-muted underline underline-offset-2"
                >
                  宛先を決めずに作る
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
