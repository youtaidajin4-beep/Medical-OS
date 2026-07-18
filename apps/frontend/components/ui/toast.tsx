'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { CheckCircle2, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export type ToastState = {
  message: string;
  variant: 'success' | 'error';
} | null;

export function useToast(duration = 2600) {
  const [toast, setToast] = useState<ToastState>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const show = useCallback(
    (message: string, variant: 'success' | 'error' = 'success') => {
      if (timer.current) clearTimeout(timer.current);
      setToast({ message, variant });
      timer.current = setTimeout(() => setToast(null), duration);
    },
    [duration],
  );

  useEffect(() => () => timer.current && clearTimeout(timer.current), []);

  return { toast, show };
}

export function Toast({ toast }: { toast: ToastState }) {
  if (!toast) return null;
  return (
    <div className="no-print pointer-events-none fixed bottom-6 right-6 z-50 animate-toast-in">
      <div
        className={cn(
          'flex items-center gap-2.5 rounded-lg border bg-white px-4 py-3 text-sm font-medium shadow-lg',
          toast.variant === 'success'
            ? 'border-emerald-200 text-emerald-800'
            : 'border-red-200 text-red-800',
        )}
      >
        {toast.variant === 'success' ? (
          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
        ) : (
          <XCircle className="h-4 w-4 text-red-600" />
        )}
        {toast.message}
      </div>
    </div>
  );
}
