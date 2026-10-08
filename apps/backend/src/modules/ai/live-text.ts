import { isLoopedText } from '../../providers/ai/transcript-hallucination';

/**
 * リアルタイム書き起こしの1区間ぶんの文字を、画面とカルテの材料に出してよい形に整える。
 *
 * 短い区間は、声が小さい・間が空いたときに、モデルが無関係な定型句を吐きやすい
 * （2026-10-05・10-06の実診察に「Thank you.」「ご清聴ありがとうございました」「Gracias.」が出ていた）。
 * 診察で実際に言われた語を消さないよう、**定型句だけの区間**に絞って落とす。
 */

const STOCK_PHRASES = [
  /^ご視聴(ありがとうございました|ありがとうございます)[。.!！]*$/,
  /^ご清聴(ありがとうございました|ありがとうございます)[。.!！]*$/,
  /^チャンネル登録/,
  /^字幕/,
  /^(おやすみなさい|おつかれさまでした)[。.!！]*$/,
];

/** 日本語を1文字も含まない短い文（Thank you. / Gracias. など）。診察室の会話としては出ない */
function isForeignFiller(text: string): boolean {
  if (/[぀-ヿ㐀-鿿]/.test(text)) return false;
  return text.replace(/\s/g, '').length <= 60;
}

const normalizeForEcho = (text: string) =>
  text.normalize('NFKC').replace(/[\s、。，．,.!?！？:：「」()（）]/g, '').toLowerCase();

function charGrams(text: string, n: number): Set<string> {
  const out = new Set<string>();
  for (let i = 0; i + n <= text.length; i++) out.add(text.slice(i, i + n));
  return out;
}

/**
 * 出力が、こちらから渡したヒント（語彙のリスト）の写しになっていないか。
 *
 * 小さいモデルは、**無音や雑音の区間で、渡されたヒントをそのまま書き出す**（実測 2026-10-09：
 * どんなヒントでも、無音・雑音・ハム音の4種すべてで100%）。ヒントなしなら空で返る。
 * 実診察の画面にも「内科診察の会話。主訴、現病歴…診断:高血圧、本態性高血圧症…」が流れた。
 *
 * 見分ける条件（どれか）:
 * - ヒントの先頭をそのまま書いている
 * - ヒントの一部分だけ（語彙の一語・一節）で、文になっていない
 * - 長い出力の大半の文字列が、ヒントの中にある
 * 医師が薬剤名を一言だけ言ったときも、前の条件に当たる。そのときは「ヒントなしで聞き直す」ので、
 * 実際に言っていれば残り、無音なら空になる。
 */
export function isPromptEcho(text: string, prompt: string | undefined): boolean {
  if (!prompt) return false;
  const t = normalizeForEcho(text);
  const p = normalizeForEcho(prompt);
  if (t.length < 3 || p.length < 3) return false;
  if (p.includes(t)) return true;
  if (t.startsWith(p.slice(0, Math.min(10, p.length)))) return true;
  if (t.length >= 12) {
    const grams = charGrams(t, 4);
    const inPrompt = charGrams(p, 4);
    let hit = 0;
    for (const g of grams) if (inPrompt.has(g)) hit++;
    if (grams.size > 0 && hit / grams.size >= 0.7) return true;
  }
  return false;
}

export type LiveTextResult =
  | { keep: true; text: string }
  | { keep: false; reason: 'empty' | 'stock-phrase' | 'foreign-filler' | 'loop' | 'prompt-echo' };

export function cleanLiveText(raw: string): LiveTextResult {
  const text = raw.replace(/\s+/g, ' ').trim();
  if (!text) return { keep: false, reason: 'empty' };
  if (STOCK_PHRASES.some((p) => p.test(text))) return { keep: false, reason: 'stock-phrase' };
  if (isForeignFiller(text)) return { keep: false, reason: 'foreign-filler' };
  if (isLoopedText(text)) return { keep: false, reason: 'loop' };
  return { keep: true, text };
}

/**
 * 1区間の文字を、文ごとに分ける。
 *
 * 1区間（数秒〜9秒）には、医師の問いと患者の返事が一緒に入ることがある。話者の判別は文の単位でする。
 * 3文字に満たない断片（「はい」の前後の切れ端など）は、前の文へつなぐ。
 */
export function splitSentences(text: string): string[] {
  const parts = text.match(/[^。！？!?]+[。！？!?]*/g) ?? [text];
  const out: string[] = [];
  for (const raw of parts) {
    const piece = raw.trim();
    if (!piece) continue;
    const bare = piece.replace(/[。！？!?\s]/g, '');
    if (out.length > 0 && bare.length < 3) out[out.length - 1] += piece;
    else out.push(piece);
  }
  return out;
}

/** 1区間から作る行の上限。超えた分は最後の行へまとめる（行番号を区間の開始時刻から作るため） */
export const MAX_SENTENCES_PER_SEGMENT = 8;

export function capSentences(sentences: string[]): string[] {
  if (sentences.length <= MAX_SENTENCES_PER_SEGMENT) return sentences;
  const head = sentences.slice(0, MAX_SENTENCES_PER_SEGMENT - 1);
  return [...head, sentences.slice(MAX_SENTENCES_PER_SEGMENT - 1).join('')];
}

export type LiveRow<S> = { text: string; speaker: S; startMs: number | null; endMs: number | null };

/**
 * 同じ話者の文が続いたところを、1つの発話にまとめる（診察記録の文字起こしの1行にする）。
 * 空の行は捨てる。入力は時刻順であること。
 */
export function mergeLiveRows<S>(rows: Array<LiveRow<S>>): Array<LiveRow<S>> {
  const turns: Array<LiveRow<S>> = [];
  for (const row of rows) {
    const text = row.text.trim();
    if (!text) continue;
    const last = turns[turns.length - 1];
    if (last && last.speaker === row.speaker) {
      last.text += text;
      last.endMs = row.endMs;
    } else {
      turns.push({ text, speaker: row.speaker, startMs: row.startMs, endMs: row.endMs });
    }
  }
  return turns;
}
