/**
 * 患者の検索。
 *
 * 診察室で探すときは「やまだ」「ヤマダ」「山田」「P-061」「061」「0957…」のどれで引くか分からない。
 * 全角半角・ひらがなカタカナ・空白の違いを吸収して、名前・フリガナ・カルテ番号・電話の
 * どれかに当たればヒットにする。空白で区切った語は、すべてに当たったものだけを残す（AND）。
 */

export type SearchablePatient = {
  name: string;
  nameKana?: string | null;
  code: string;
  phone?: string | null;
};

/** 比べやすい形にそろえる：全角→半角（NFKC）、大文字→小文字、カタカナ→ひらがな、空白を除く */
export function normalizeForSearch(text: string): string {
  return text
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[ァ-ヶ]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0x60))
    .replace(/[\s　]+/g, '')
    .replace(/[-‐‑–—ー]/g, (ch) => (ch === 'ー' ? 'ー' : ''));
}

function haystack(p: SearchablePatient): string {
  return [p.name, p.nameKana ?? '', p.code, p.phone ?? ''].map(normalizeForSearch).join('|');
}

export function filterPatients<T extends SearchablePatient>(patients: T[], query: string): T[] {
  const tokens = query
    .normalize('NFKC')
    .split(/[\s　]+/)
    .map(normalizeForSearch)
    .filter(Boolean);
  if (tokens.length === 0) return patients;
  return patients.filter((p) => {
    const text = haystack(p);
    return tokens.every((t) => text.includes(t));
  });
}
