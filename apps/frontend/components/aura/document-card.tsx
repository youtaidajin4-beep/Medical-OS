'use client';

import { cn } from '@/lib/utils';
import type { DocumentKind } from '@/components/consultation/document-launcher';

/** 書類のテンプレートを選ぶカード。大きく、触ると少し浮く */
export function DocumentCard({
  kind,
  selected,
  onSelect,
}: {
  kind: DocumentKind;
  selected?: boolean;
  onSelect: () => void;
}) {
  const Icon = kind.icon;
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={cn(
        'group flex flex-col items-start gap-3 rounded-[1.75rem] border p-5 text-left transition duration-300 ease-out',
        selected
          ? 'border-aura-mint-300 bg-aura-mint-50 shadow-float-lg'
          : 'border-white/80 bg-white/80 shadow-float hover:-translate-y-1 hover:shadow-float-lg',
      )}
    >
      <span
        className={cn(
          'flex h-11 w-11 items-center justify-center rounded-2xl transition duration-300',
          selected
            ? 'bg-aura-teal-500 text-white'
            : 'bg-aura-cyan-100 text-aura-teal-600 group-hover:bg-aura-mint-100',
        )}
      >
        <Icon className="h-5 w-5" />
      </span>
      <span>
        <span className="block text-[16px] font-semibold tracking-tight text-aura-ink">{kind.label}</span>
        <span className="mt-0.5 block text-[12px] text-aura-ink-muted">{kind.note}</span>
      </span>
    </button>
  );
}
