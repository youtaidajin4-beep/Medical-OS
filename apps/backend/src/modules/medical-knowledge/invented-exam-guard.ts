import { KnowledgeIndex } from './knowledge-index';
import { normalizeMedicalText } from './japanese-normalizer';

/**
 * 校正が「やっていない検査」を書き足すのを止める。
 *
 * 2026-09-21 に実測した事故。聞き取れなかった「ほら強烈で」（実際は「洞調律で」）を、
 * 校正が **「ホルター心電図で」** に置き換えた。前後に「心電図を撮りましょう」が
 * あるので、モデルには自然な補完に見える。だが紙の上では、していない検査が
 * カルテに載る。誤変換より重い。
 *
 * プロンプトでは止まらなかった。「ホルター心電図は禁止」と名指しで書いた上で
 * 4回試し、4回とも同じ置換をした。だから機械的に止める。
 *
 * 止める範囲は**検査と画像の名前だけ**にする。
 * - 病名（強心症→狭心症）は直させたい。ここを止めると校正の価値が消える
 * - 薬剤名（無効団員→ムコダイン）も直させたい。用量は別に要確認の関門がある
 * - 「継続」「中止」のような語は日常語なので、増えたかどうかで判断できない
 */

/** 検査名がまるごと入れ替わったか、聞き違いの範囲かを見る境目 */
const SIMILARITY_THRESHOLD = 0.5;

const GUARDED_CATEGORIES = new Set(['imaging', 'procedure', 'laboratory_test']);

export type InventedExam = {
  line: number;
  term: string;
  original: string;
  proposed: string;
};

/**
 * 元の行と見比べて、その検査名が「聞き違いを直した」範囲かを測る。
 *
 * 「運動負荷診伝図」→「心電図」は、元の行に 心 と 図 があるので直したと分かる。
 * 「ほら強烈で」→「ホルター心電図」は ホ しか無い。別の語を持ってきている。
 */
function looksLikeSameWord(term: string, originalLine: string): boolean {
  const line = normalizeMedicalText(originalLine);
  const chars = [...normalizeMedicalText(term)];
  if (chars.length === 0) return true;
  const shared = chars.filter((c) => line.includes(c)).length;
  return shared / chars.length >= SIMILARITY_THRESHOLD;
}

/**
 * 校正後の各行から、元の行に無かった検査名が増えていないか調べる。
 * 増えていた行は**校正を捨てて元の行を残す**。聞こえたままが残るほうが、
 * それらしい検査名が入るより安全で、先生が見れば直せる。
 */
export function rejectInventedExams(
  before: string[],
  after: string[],
  index: KnowledgeIndex,
): { texts: string[]; rejected: InventedExam[] } {
  const texts: string[] = [];
  const rejected: InventedExam[] = [];

  for (let i = 0; i < before.length; i++) {
    const original = before[i] ?? '';
    const proposed = after[i] ?? original;
    if (proposed === original) {
      texts.push(original);
      continue;
    }

    const invented = index
      .findSurfacesInText(proposed)
      .flatMap((s) => s.hits)
      .filter((hit) => GUARDED_CATEGORIES.has(hit.category))
      .map((hit) => hit.canonicalName)
      .find(
        (name) =>
          !normalizeMedicalText(original).includes(normalizeMedicalText(name)) &&
          !looksLikeSameWord(name, original),
      );

    if (invented) {
      rejected.push({ line: i + 1, term: invented, original, proposed });
      texts.push(original);
      continue;
    }
    texts.push(proposed);
  }

  return { texts, rejected };
}
