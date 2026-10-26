'use client';

import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export type PatientLike = {
  id: string;
  name: string;
  nameKana?: string | null;
  code: string;
  age: number | null;
  sex: string | null;
  lastVisit?: string | null;
  visitCount?: number;
};

export function sexLabel(sex: string | null | undefined) {
  if (sex === 'M') return '男性';
  if (sex === 'F') return '女性';
  return '';
}

/** 頭文字のアバター。氏名ごとに色相をずらして、同じ並びでも見分けやすくする */
export function PatientAvatar({ name, size = 'md' }: { name: string; size?: 'md' | 'lg' }) {
  const hue = [...name].reduce((n, c) => n + c.charCodeAt(0), 0) % 3;
  const tone = [
    'from-aura-cyan-200 to-aura-mint-200 text-aura-teal-700',
    'from-aura-mint-100 to-aura-cyan-200 text-aura-teal-600',
    'from-aura-mint-200 to-aura-cyan-100 text-aura-teal-700',
  ][hue];
  return (
    <span
      className={cn(
        'flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br font-semibold',
        size === 'lg' ? 'h-14 w-14 text-xl' : 'h-11 w-11 text-[15px]',
        tone,
      )}
    >
      {name.slice(0, 1)}
    </span>
  );
}

export function PatientCard({
  patient,
  selected,
  highlighted,
  onSelect,
  index,
}: {
  patient: PatientLike;
  selected?: boolean;
  /** キーボードの矢印で指している行 */
  highlighted?: boolean;
  onSelect: () => void;
  index?: number;
}) {
  const meta = [patient.age != null ? `${patient.age}歳` : '', sexLabel(patient.sex), `ID ${patient.code}`]
    .filter(Boolean)
    .join(' / ');
  return (
    <button
      type="button"
      data-index={index}
      onClick={onSelect}
      className={cn(
        'group flex w-full items-center gap-4 rounded-3xl border px-4 py-3 text-left transition duration-200 ease-out',
        selected
          ? 'border-aura-mint-300 bg-aura-mint-50 shadow-float'
          : highlighted
            ? 'border-aura-mint-200 bg-white shadow-float'
            : 'border-transparent hover:-translate-y-px hover:border-aura-line hover:bg-white hover:shadow-float',
      )}
    >
      <PatientAvatar name={patient.name} />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[15px] font-semibold text-aura-ink">{patient.name}</span>
        <span className="block truncate text-[12px] text-aura-ink-muted">
          {patient.nameKana ? `${patient.nameKana} · ` : ''}
          {meta}
        </span>
      </span>
      {patient.lastVisit && (
        <span className="hidden text-right text-[11px] text-aura-ink-muted min-[640px]:block">
          最終診察
          <br />
          {patient.lastVisit}
        </span>
      )}
      <ChevronRight className="h-4 w-4 shrink-0 text-aura-ink-muted/50 transition group-hover:translate-x-0.5 group-hover:text-aura-teal-500" />
    </button>
  );
}
