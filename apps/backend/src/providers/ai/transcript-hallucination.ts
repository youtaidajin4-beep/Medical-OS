/**
 * Whisper系のループ・ハルシネーション（同じ語の繰り返し）を落とす。
 *
 * 2026-09-05、谷口先生の画面に「読み 読み 読み 読み 読み…」が並んだ。
 * 低音量・無音区間が続くと STT は同じ語を延々と吐く。既存の
 * WHISPER_HALLUCINATION_PATTERNS は「ご視聴ありがとうございました」等の定番フレーズ専用で、
 * しかも 50KB 未満の短い音声のときしか見ていないため、20分の診療では一度も発動しない。
 */

/** 判定に使う先頭文字数（長文全体を総当たりしない） */
const SCAN_CHARS = 400;
/** これ未満の短い発話は判定しない（「はい、はい、はい」は自然な相槌） */
const MIN_CHARS = 12;
/** 繰り返しが本文のこの割合以上を占めたらループとみなす */
const LOOP_FRACTION = 0.6;
/** 語のユニーク率がこれ以下ならループとみなす */
const UNIQUE_TOKEN_RATIO = 0.34;
/** 繰り返しと認める最小の連数 */
const MIN_REPEATS = 3;

/**
 * 同一の文字パターンが連続して繰り返される区間が、本文の何割を占めるかを返す。
 * 「読み読み読み読み」→ ほぼ 1.0
 */
export function repeatedFraction(text: string): number {
  const s = text.replace(/[\s、。，．,.!?！？]/g, '').slice(0, SCAN_CHARS);
  if (s.length < MIN_CHARS) return 0;

  let best = 0;
  for (let unitLength = 1; unitLength <= 10; unitLength++) {
    for (let start = 0; start + unitLength * MIN_REPEATS <= s.length; start++) {
      const unit = s.slice(start, start + unitLength);
      let repeats = 1;
      while (s.slice(start + repeats * unitLength, start + (repeats + 1) * unitLength) === unit) {
        repeats++;
      }
      if (repeats >= MIN_REPEATS) {
        best = Math.max(best, (repeats * unitLength) / s.length);
      }
    }
  }
  return best;
}

/** 語のユニーク率（低いほど同じ語ばかり） */
export function uniqueTokenRatio(text: string): number {
  const tokens = text.trim().split(/[\s、。，．,.!?！？]+/).filter(Boolean);
  if (tokens.length < 6) return 1;
  return new Set(tokens).size / tokens.length;
}

export function isLoopedText(text: string): boolean {
  if (!text || text.replace(/\s/g, '').length < MIN_CHARS) return false;
  if (repeatedFraction(text) >= LOOP_FRACTION) return true;
  return uniqueTokenRatio(text) <= UNIQUE_TOKEN_RATIO;
}

/**
 * ループしているセグメントを落とす。落とした分は dropped で返し、
 * 医師に「何件落としたか」を伝えられるようにする（黙って消さない）。
 */
export function stripLoopedSegments<T extends { text: string }>(
  segments: T[],
): { kept: T[]; dropped: T[] } {
  const kept: T[] = [];
  const dropped: T[] = [];
  for (const segment of segments) {
    if (isLoopedText(segment.text)) dropped.push(segment);
    else kept.push(segment);
  }
  // 全部がループ判定なら、判定のほうを疑って元を残す（医師が自分で見て消せる）
  if (kept.length === 0 && dropped.length > 0) return { kept: segments, dropped: [] };
  return { kept, dropped };
}
