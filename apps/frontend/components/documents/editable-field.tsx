'use client';

import { cn } from '@/lib/utils';

/**
 * 書類の中身はサーバーから来たJSON。数値やnullがそのまま渡ることがあるので、
 * 必ず文字列に均してから使う（以前ここで画面ごと落ちた）。
 */
function asText(value: unknown): string {
  if (value == null) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return '';
}

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
  value: unknown;
  onChange: (value: string) => void;
  className?: string;
  placeholder?: string;
  /** 空のときの幅（半角文字数） */
  minSize?: number;
}) {
  const text = asText(value);
  // input は中身に合わせて伸びない。住所や病院名が切れて印刷されるので、
  // 文字数から size を出して幅を合わせる。
  const size = Math.max(visualLength(text) + 1, visualLength(placeholder ?? ''), minSize);

  return (
    <input
      type="text"
      className={cn('doc-edit-field doc-edit-inline', className)}
      value={text}
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
  value: unknown;
  onChange: (value: string) => void;
  rows?: number;
  className?: string;
  placeholder?: string;
}) {
  return (
    <textarea
      className={cn('doc-edit-field', className)}
      value={asText(value)}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      rows={rows}
    />
  );
}
