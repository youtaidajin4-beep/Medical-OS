/**
 * チャットからの書類の書き換えを「変えるところだけ」にするための道具。
 *
 * 以前は、1欄を直すだけでも**書類の完全なJSONを返させていた**。
 * 主治医意見書は60欄近くあるので、チェックを1つ入れるために全欄を書き直させることになり、
 * 遅いうえに、書き直しのついでに他の欄が消える事故が起きる。
 *
 * 変えるフィールドだけ返してもらい、いまの書類へ重ねる。
 */

/**
 * 変えるところだけのパッチを、いまの書類へ重ねる。
 *
 * - オブジェクトは中まで重ねる（主治医意見書の paralysis.rightUpper など）
 * - 配列はまるごと差し替え（チェックの集合は「消す」も表せないと困る）
 * - 書類そのものが無ければ、パッチをそのまま新しい書類として扱う
 */
export function mergeDocumentPatch(
  current: Record<string, unknown> | null | undefined,
  patch: Record<string, unknown>,
): Record<string, unknown> {
  if (!current) return { ...patch };
  const out: Record<string, unknown> = { ...current };
  for (const [key, value] of Object.entries(patch)) {
    const currentValue = out[key];
    if (
      value &&
      typeof value === 'object' &&
      !Array.isArray(value) &&
      currentValue &&
      typeof currentValue === 'object' &&
      !Array.isArray(currentValue)
    ) {
      out[key] = mergeDocumentPatch(
        currentValue as Record<string, unknown>,
        value as Record<string, unknown>,
      );
      continue;
    }
    out[key] = value;
  }
  return out;
}
