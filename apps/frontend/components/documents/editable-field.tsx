'use client';

import { cn } from '@/lib/utils';

/** 全角を2、半角を1で数えた見た目の長さ。input の size に使う */
function visualLength(value: string): number {
  let width = 0;
  for (const char of value) {
    width += /[\x20-\x7e｡-ﾟ]/.test(char) ? 1 : 2;
  }
  return width;
}

export function EditableInput({
  value,
  onChange,
  className,
  placeholder,
  minSize = 6,
}: {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  placeholder?: string;
  /** 空のときの幅（半角文字数） */
  minSize?: number;
}) {
  // input は中身に合わせて伸びない。住所や病院名が切れて印刷されるので、
  // 文字数から size を出して幅を合わせる。
  const size = Math.max(visualLength(value) + 1, visualLength(placeholder ?? ''), minSize);

  return (
    <input
      type="text"
      className={cn('doc-edit-field doc-edit-inline', className)}
      value={value}
      size={size}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

export function EditableText({
  value,
  onChange,
  rows = 3,
  className,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  rows?: number;
  className?: string;
  placeholder?: string;
}) {
  return (
    <textarea
      className={cn('doc-edit-field', className)}
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      rows={rows}
    />
  );
}
