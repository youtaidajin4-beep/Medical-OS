/**
 * Japanese / medical-token normalization for knowledge lookup.
 * Does not invent clinical content — search preprocessing only.
 */

const KATA_TO_HIRA: Record<string, string> = {};
for (let i = 0; i < 86; i++) {
  const kata = String.fromCharCode(0x30a1 + i);
  const hira = String.fromCharCode(0x3041 + i);
  KATA_TO_HIRA[kata] = hira;
}

export function toHiragana(input: string): string {
  return [...input].map((ch) => KATA_TO_HIRA[ch] ?? ch).join('');
}

export function normalizeMedicalText(input: string): string {
  let s = input.normalize('NFKC');
  s = s.replace(/[μµ]/g, 'u');
  s = s.replace(/[γΓ]/gi, 'ガンマ');
  s = s.replace(/[αΑ]/gi, 'アルファ');
  s = s.replace(/[βΒ]/gi, 'ベータ');
  s = s.replace(/[‐‑‒–—―ー−-]+/g, '-');
  s = s.replace(/\s+/g, '');
  s = s.toLowerCase();
  s = toHiragana(s);
  return s;
}

/** Variants useful for HbA1c-style lab matching */
export function expandLookupKeys(term: string): string[] {
  const base = normalizeMedicalText(term);
  const keys = new Set<string>([base, term, term.toLowerCase(), normalizeMedicalText(term.replace(/%/g, ''))]);
  const compact = base.replace(/[-_]/g, '');
  keys.add(compact);
  return [...keys].filter(Boolean);
}
