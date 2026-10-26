'use client';

import { useEffect, useRef, useState } from 'react';
import { Check, ClipboardCopy, Pencil } from 'lucide-react';
import { cn } from '@/lib/utils';

const TONE: Record<string, string> = {
  S: 'from-aura-cyan-200 to-aura-mint-200',
  O: 'from-aura-mint-200 to-aura-mint-300',
  A: 'from-aura-cyan-100 to-aura-cyan-300',
  P: 'from-aura-mint-100 to-aura-teal-400/60',
};

/**
 * SOAPの1枚のカード。ふだんは読みやすく、押すとその場で書き直せる。
 *
 * 巨大なテキスト欄を1つ置くのでなく、S・O・A・P を4枚に分ける。
 * AIが書いたままか、先生が直したかが、右上の小さな印で分かる。
 */
export function SOAPCard({
  letter,
  english,
  name,
  value,
  edited,
  templated,
  copied,
  onChange,
  onCopy,
}: {
  letter: 'S' | 'O' | 'A' | 'P';
  english: string;
  name: string;
  value: string;
  /** 先生が直した（AIの下書きから変わっている） */
  edited?: boolean;
  /** 定型文を入れた欄 */
  templated?: boolean;
  copied?: boolean;
  onChange: (value: string) => void;
  onCopy: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const ref = useRef<HTMLTextAreaElement>(null);
  const empty = !value.trim();

  useEffect(() => {
    if (!editing) return;
    const el = ref.current;
    if (!el) return;
    el.focus();
    el.setSelectionRange(el.value.length, el.value.length);
  }, [editing]);
  useEffect(() => {
    const el = ref.current;
    if (!editing || !el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight + 2}px`;
  }, [value, editing]);

  return (
    <section
      className={cn(
        'group relative rounded-[1.75rem] border bg-white/90 p-5 transition duration-300 ease-out min-[480px]:p-6',
        editing
          ? 'border-aura-mint-300 shadow-float-lg ring-4 ring-aura-mint-100/70'
          : 'border-white/80 shadow-float hover:-translate-y-px hover:shadow-float-lg',
      )}
    >
      <div className="flex items-center gap-3">
        <span
          className={cn(
            'flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br text-[16px] font-bold text-aura-teal-700',
            TONE[letter],
          )}
        >
          {letter}
        </span>
        <div className="leading-tight">
          <p className="text-[14px] font-semibold text-aura-ink">{english}</p>
          <p className="text-[11px] text-aura-ink-muted">{name}</p>
        </div>

        <div className="ml-auto flex items-center gap-1.5">
          {templated && (
            <span className="rounded-full bg-aura-cloud px-2.5 py-0.5 text-[10px] font-semibold text-aura-ink-soft">定型文</span>
          )}
          {empty ? (
            <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[10px] font-semibold text-amber-800">空欄</span>
          ) : edited ? (
            <span className="rounded-full bg-aura-mint-100 px-2.5 py-0.5 text-[10px] font-semibold text-aura-teal-700">
              医師が編集
            </span>
          ) : (
            <span className="rounded-full bg-aura-cyan-100 px-2.5 py-0.5 text-[10px] font-semibold text-aura-teal-600">
              AI下書き
            </span>
          )}
          <button
            type="button"
            onClick={onCopy}
            className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium text-aura-ink-muted opacity-0 transition hover:bg-aura-mist hover:text-aura-ink focus:opacity-100 group-hover:opacity-100"
          >
            {copied ? <Check className="h-3 w-3 text-aura-teal-500" /> : <ClipboardCopy className="h-3 w-3" />}
            {copied ? 'コピー済み' : 'この欄だけコピー'}
          </button>
        </div>
      </div>

      {editing ? (
        <textarea
          ref={ref}
          value={value}
          rows={3}
          onChange={(e) => onChange(e.target.value)}
          onBlur={() => setEditing(false)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') setEditing(false);
          }}
          aria-label={`${english}を編集`}
          className="mt-4 block w-full resize-none overflow-hidden rounded-2xl bg-aura-paper px-4 py-3 text-[15px] leading-[1.9] text-aura-ink outline-none"
        />
      ) : (
        <button
          type="button"
          onClick={() => setEditing(true)}
          aria-label={`${english}を編集する`}
          className={cn(
            'relative mt-4 block w-full rounded-2xl px-1 py-1 text-left text-[15px] leading-[1.9] transition-colors hover:bg-aura-paper/80',
            empty ? 'text-aura-ink-muted/70' : templated ? 'text-aura-ink-soft' : 'text-aura-ink',
          )}
        >
          <span className="whitespace-pre-wrap">{empty ? 'ここをクリックして書く' : value}</span>
          <Pencil className="absolute right-2 top-2 h-3.5 w-3.5 text-aura-ink-muted/0 transition group-hover:text-aura-ink-muted/60" />
        </button>
      )}
    </section>
  );
}
