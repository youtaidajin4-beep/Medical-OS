import { HTMLAttributes } from 'react';
import { AlertCircle, AlertTriangle, CheckCircle2, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

type AlertProps = HTMLAttributes<HTMLDivElement> & {
  variant?: 'info' | 'warning' | 'error' | 'success';
  hideIcon?: boolean;
};

const ICONS = {
  info: Info,
  warning: AlertTriangle,
  error: AlertCircle,
  success: CheckCircle2,
} as const;

export function Alert({ className, variant = 'info', hideIcon, children, ...props }: AlertProps) {
  const Icon = ICONS[variant];
  return (
    <div
      className={cn(
        'flex items-start gap-2.5 rounded-lg border px-4 py-3 text-sm',
        variant === 'info' && 'border-brand-200 bg-brand-50 text-brand-900',
        variant === 'warning' && 'border-amber-200 bg-amber-50 text-amber-900',
        variant === 'error' && 'border-red-200 bg-red-50 text-red-900',
        variant === 'success' && 'border-emerald-200 bg-emerald-50 text-emerald-900',
        className,
      )}
      {...props}
    >
      {!hideIcon && <Icon className="mt-0.5 h-4 w-4 shrink-0" />}
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
