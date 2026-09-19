'use client';

/**
 * 紙の様式にある「□」をそのまま押せるようにするための部品。
 *
 * 主治医意見書はほとんどがチェック欄で、先生は紙の上で□を潰していく。
 * 画面でも同じように、□そのものを押したら入る／もう一度押したら外れる。
 * 印刷したときは、チェックが入った□が塗られた状態で出る。
 */
import { cn } from '@/lib/utils';

/** 単独のチェック。ラベルごと押せる */
export function Check({
  checked,
  onChange,
  label,
  className,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label?: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cn('doc-check', className)}
    >
      <span className={cn('doc-check-box', checked && 'is-checked')} aria-hidden="true" />
      {label && <span className="doc-check-label">{label}</span>}
    </button>
  );
}

/** どれか1つだけ選ぶ並び（安定／不安定／不明 など）。押し直すと解除できる */
export function ChoiceGroup<T extends string>({
  value,
  options,
  onChange,
  className,
}: {
  value: T | '';
  options: ReadonlyArray<{ value: T; label: string }> | ReadonlyArray<T>;
  onChange: (next: T | '') => void;
  className?: string;
}) {
  const items = options.map((o) =>
    typeof o === 'string' ? { value: o as T, label: o as string } : o,
  );
  return (
    <span className={cn('doc-check-row', className)}>
      {items.map((o) => (
        <Check
          key={o.value}
          checked={value === o.value}
          label={o.label}
          onChange={(next) => onChange(next ? o.value : '')}
        />
      ))}
    </span>
  );
}

/** 当てはまるものを全部選ぶ並び（処置内容・周辺症状 など） */
export function MultiCheckGroup({
  values,
  options,
  onChange,
  className,
}: {
  values: string[];
  options: ReadonlyArray<string>;
  onChange: (next: string[]) => void;
  className?: string;
}) {
  return (
    <span className={cn('doc-check-row', className)}>
      {options.map((label) => (
        <Check
          key={label}
          label={label}
          checked={values.includes(label)}
          onChange={(next) =>
            onChange(next ? [...values, label] : values.filter((v) => v !== label))
          }
        />
      ))}
    </span>
  );
}

/** 「程度: □軽 □中 □重」 */
export function DegreeChoice({
  value,
  onChange,
}: {
  value: '' | 'mild' | 'moderate' | 'severe';
  onChange: (next: '' | 'mild' | 'moderate' | 'severe') => void;
}) {
  return (
    <span className="doc-check-row">
      <span className="doc-inline-label">程度:</span>
      <ChoiceGroup
        value={value}
        onChange={onChange}
        options={[
          { value: 'mild', label: '軽' },
          { value: 'moderate', label: '中' },
          { value: 'severe', label: '重' },
        ]}
      />
    </span>
  );
}
