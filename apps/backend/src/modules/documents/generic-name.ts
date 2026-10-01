import { knowledgePackBrandGeneric } from '../medical-knowledge/data/load-knowledge-pack';

/**
 * 書類の薬剤名を一般名で書く。
 *
 * 2026-09-25、谷口先生から「薬剤名を正式名称で表現したい」。9/28に切り分けが決まった。
 *
 * > 一般名への変換は、SOAPは言われたままの商品名、書類のところで一般名に直す、
 * > という切り分けでよろしいでしょうか。 ➡︎ はい、ひとまずその方針でOKです。
 *
 * SOAPは診察で言われたままにしておきたい（先生が聞き取りを確かめる場所なので）。
 * 紹介先の医師が読む書類だけ、一般名を主にする。
 *
 * プロンプトには「可能なら一般名も併記してよい」と書いてあったが、
 * 「可能なら」で済ませると出たり出なかったりする。医院の辞書に106組の対応表が
 * あるので、生成のあとで機械的に置き換える。
 *
 * 商品名は消さず「一般名（商品名）」にする。紹介先がどちらの呼び方でも通じ、
 * 先生が「自分が出した薬はこれだ」と確かめられる。
 */

// 長い商品名から当てる。「タケキャブ」と「タケプロン」のように頭が同じ薬があるため
const PAIRS = knowledgePackBrandGeneric().sort((a, b) => b.brand.length - a.brand.length);

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const BRAND_PATTERN = PAIRS.length
  ? new RegExp(`(${PAIRS.map((p) => escapeRegExp(p.brand)).join('|')})`, 'g')
  : null;

const GENERIC_BY_BRAND = new Map(PAIRS.map((p) => [p.brand, p.generic]));

/**
 * 文中の商品名を「一般名（商品名）」にする。
 *
 * すでに一般名が添えられている箇所は触らない（二重に付けない）。
 */
export function withGenericNames(text: string): string {
  if (!text || !BRAND_PATTERN) return text;
  BRAND_PATTERN.lastIndex = 0;
  return text.replace(BRAND_PATTERN, (brand, _g, offset: number) => {
    const generic = GENERIC_BY_BRAND.get(brand);
    if (!generic) return brand;
    // 直前に一般名が書かれている（「アセトアミノフェン（カロナール」）なら足さない
    const before = text.slice(Math.max(0, offset - generic.length - 2), offset);
    if (before.includes(generic)) return brand;
    // 直後に一般名が書かれている場合も足さない
    const after = text.slice(offset + brand.length, offset + brand.length + generic.length + 2);
    if (after.includes(generic)) return brand;
    return `${generic}（${brand}）`;
  });
}

/** 書類の中で、薬剤名が載る欄だけを一般名に寄せる */
const DRUG_FIELDS = ['currentPrescription', 'remarks', 'name'] as const;

export function applyGenericNamesToDocument(
  content: Record<string, unknown>,
): Record<string, unknown> {
  const out: Record<string, unknown> = { ...content };
  for (const field of DRUG_FIELDS) {
    const value = out[field];
    if (typeof value === 'string') out[field] = withGenericNames(value);
  }
  // 処方一覧は items の配列
  if (Array.isArray(out.items)) {
    out.items = out.items.map((item) =>
      item && typeof item === 'object'
        ? {
            ...(item as Record<string, unknown>),
            name:
              typeof (item as Record<string, unknown>).name === 'string'
                ? withGenericNames((item as Record<string, unknown>).name as string)
                : (item as Record<string, unknown>).name,
          }
        : item,
    );
  }
  return out;
}
