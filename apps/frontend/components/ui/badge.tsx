import { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  variant?: 'default' | 'warning' | 'critical' | 'info' | 'success' | 'brand';
};

export function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset',
        variant === 'default' && 'bg-slate-100 text-slate-700 ring-slate-200',
        variant === 'warning' && 'bg-amber-50 text-amber-800 ring-amber-200',
        variant === 'critical' && 'bg-red-50 text-red-800 ring-red-200',
        variant === 'info' && 'bg-blue-50 text-blue-800 ring-blue-200',
        variant === 'success' && 'bg-emerald-50 text-emerald-800 ring-emerald-200',
        variant === 'brand' && 'bg-brand-50 text-brand-800 ring-brand-200',
        className,
      )}
      {...props}
    />
  );
}
