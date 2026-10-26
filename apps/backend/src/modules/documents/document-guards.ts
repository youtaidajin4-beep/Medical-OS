/**
 * 書類に「言っていないこと」が入らないようにする、機械の確かめ。
 *
 * 2026-10-27 の通しで、主治医意見書に次が出た：
 *   - 障害高齢者の自立度「J1」・認知症高齢者の自立度「Ⅱa」（誰も述べていない判定）
 *   - 「3年前に診断」を「平成30年頃」と書く（計算の間違い）
 *   - 診断書（検査結果）に、AIが付けた判定「E」（医師が述べていない）
 * プロンプトに「根拠が無ければ空文字」と書いてあっても、「歩けている・話せているなら選んでよい」の一文から
 * モデルが推測した。判定・自立度・発症年は、診療の事実ではなく**医師の判断**なので、
 * 述べられた記録（サブカルテ・SOAP・会話・問診票）に根拠が無ければ空欄にする。
 */

/** 障害高齢者の日常生活自立度（J1〜C2）を、誰かが述べたか */
export function adlLevelStated(text: string): boolean {
  return (
    /障害高齢者|寝たきり度/.test(text) ||
    /(?<![A-Za-z0-9])[JABC]\s?[12](?![0-9A-Za-z])/.test(text)
  );
}

/** 認知症高齢者の日常生活自立度（Ⅰ〜M）を、誰かが述べたか */
export function dementiaLevelStated(text: string): boolean {
  return (
    /認知症高齢者|認知症.{0,8}自立度/.test(text) ||
    /自立度.{0,12}[ⅠⅡⅢⅣ]/.test(text) ||
    /ランク\s*[ⅠⅡⅢⅣ]/.test(text) ||
    /[ⅡⅢ][ab]/.test(text)
  );
}

/** 検査の判定（A〜G）や総合判定を、医師が述べたか */
export function judgementStated(text: string): boolean {
  return /判定|総合判定/.test(text);
}

const KANJI_DIGIT: Record<string, number> = {
  一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9, 十: 10,
};

function toNumber(raw: string): number | null {
  if (/^\d+$/.test(raw)) return Number(raw);
  if (raw.length === 1) return KANJI_DIGIT[raw] ?? null;
  if (/^十[一二三四五六七八九]$/.test(raw)) return 10 + (KANJI_DIGIT[raw[1]!] ?? 0);
  if (/^[二三四五六七八九]十$/.test(raw)) return (KANJI_DIGIT[raw[0]!] ?? 0) * 10;
  return null;
}

/** 西暦の年から和暦（年だけ）。「令和5年」「平成30年」 */
export function eraYearLabel(year: number): string {
  if (year >= 2019) {
    const n = year - 2018;
    return `令和${n === 1 ? '元' : n}年`;
  }
  if (year >= 1989) return `平成${year - 1988}年`;
  if (year >= 1926) return `昭和${year - 1925}年`;
  return `${year}年`;
}

function westernYearOf(label: string): number | null {
  const era = label.match(/(令和|平成|昭和)\s*(元|\d+)/);
  if (era) {
    const n = era[2] === '元' ? 1 : Number(era[2]);
    const base = era[1] === '令和' ? 2018 : era[1] === '平成' ? 1988 : 1925;
    return base + n;
  }
  const w = label.match(/(?:19|20)\d{2}/);
  return w ? Number(w[0]) : null;
}

function jstYear(date: Date): number {
  return Number(new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Tokyo', year: 'numeric' }).format(date));
}

/** 「アルツハイマー型の認知症と診断したのが三年前」のように、その病名の文にある「N年前」を探す */
function yearsAgoFor(diagnosisName: string, text: string): number | null {
  const key = diagnosisName.replace(/[型の症病]/g, '').slice(0, 4) || diagnosisName.slice(0, 3);
  for (const sentence of text.split(/[。\n]/)) {
    if (!sentence.includes(key) && !sentence.includes(diagnosisName.slice(0, 3))) continue;
    const m = sentence.match(/(\d+|[一二三四五六七八九十]+)\s*年前/);
    const n = m ? toNumber(m[1]!) : null;
    if (n && n > 0 && n < 80) return n;
  }
  return null;
}

/**
 * 発症年月日。AIが書いた年は、述べられた記録に根拠があるときだけ残す。
 * 根拠が無ければ、記録にある「N年前」から数え直す。それも無ければ空欄。
 */
export function cleanOnsetDate(
  onset: string,
  diagnosisName: string,
  sourceText: string,
  issuedAt: Date,
): string {
  const thisYear = jstYear(issuedAt);
  const ago = yearsAgoFor(diagnosisName, sourceText);
  const derived = ago ? `${eraYearLabel(thisYear - ago)}頃` : '';
  if (!onset.trim()) return derived;
  const year = westernYearOf(onset);
  if (year == null) return onset; // 「数年前」のような言い回しは、そのまま
  if (sourceText.includes(onset.replace(/頃$/, ''))) return onset; // 記録にそのまま出ている
  if (ago && Math.abs(thisYear - ago - year) <= 1) return onset; // 「N年前」から数えて合っている
  return derived; // 根拠が無い年は書かない
}
