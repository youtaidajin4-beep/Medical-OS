'use client';

import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export type TabItem<T extends string = string> = {
  id: T;
  label: string;
  icon?: ReactNode;
};

export function Tabs<T extends string>({
  items,
  value,
  onChange,
  className,
}: {
  items: Array<TabItem<T>>;
  value: T;
  onChange: (id: T) => void;
  className?: string;
}) {
  return (
    <div className={cn('flex gap-1 border-b border-slate-200', className)} role="tablist">
      {items.map((item) => {
        const active = item.id === value;
        return (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(item.id)}
            className={cn(
              '-mb-px inline-flex items-center gap-1.5 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors',
              active
                ? 'border-brand-600 text-brand-700'
                : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700',
            )}
          >
            {item.icon && <span className="[&>svg]:h-4 [&>svg]:w-4">{item.icon}</span>}
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
