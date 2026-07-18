'use client';

import { cn } from '@/lib/utils';

export function EditableInput({
  value,
  onChange,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}) {
  return (
    <input
      type="text"
      className={cn('doc-edit-field doc-edit-inline', className)}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

export function EditableText({
  value,
  onChange,
  rows = 3,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  rows?: number;
  className?: string;
}) {
  return (
    <textarea
      className={cn('doc-edit-field', className)}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      rows={rows}
    />
  );
}
