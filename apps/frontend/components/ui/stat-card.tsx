import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export function StatCard({
  icon,
  label,
  value,
  sub,
  className,
}: {
  icon?: ReactNode;
  label: string;
  value: ReactNode;
  sub?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'rounded-xl border border-slate-200 bg-white p-5 shadow-card',
        className,
      )}
    >
      <div className="flex items-center gap-3">
        {icon && (
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600 [&>svg]:h-5 [&>svg]:w-5">
            {icon}
          </div>
        )}
        <div className="min-w-0">
          <p className="text-sm text-slate-500">{label}</p>
          <p className="text-2xl font-bold tracking-tight text-slate-900">{value}</p>
          {sub && <p className="text-xs text-slate-400">{sub}</p>}
        </div>
      </div>
    </div>
  );
}
