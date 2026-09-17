import { WarningSeverity } from '@prisma/client';
import { ClinicalValidationWarning } from './clinical-data-validator';

export type TranscriptQuality = {
  /** ループ・ハルシネーションとして落としたセグメント数 */
  droppedLoopSegments: number;
  /** 話者分離が見つけた話者の数（0 or 1 なら分離できていない） */
  diarizationSpeakers: number;
};

/**
 * 録音そのものの問題を医師に見せる警告へ変換する。
 *
 * 2026-09-05、谷口先生の画面は話者が全部「不明」で、文字起こしは同じ語の繰り返しだった。
 * どちらも「患者さんの声がマイクに届いていない」という同じ原因を指していたが、
 * 画面には何も出ず、先生は自分で気づくしかなかった。
 */
export function buildTranscriptQualityWarnings(
  quality: TranscriptQuality | undefined,
): ClinicalValidationWarning[] {
  if (!quality) return [];
  const warnings: ClinicalValidationWarning[] = [];

  if (quality.diarizationSpeakers <= 1) {
    warnings.push({
      category: 'recording',
      message:
        '要確認：医師と患者を聞き分けられませんでした（話者がすべて「不明」）。患者さんの声がマイクに届いていない可能性があります。マイクの位置と入力デバイスを確認してください。',
      severity: WarningSeverity.WARNING,
    });
  }

  if (quality.droppedLoopSegments > 0) {
    warnings.push({
      category: 'recording',
      message: `要確認：文字起こしの${quality.droppedLoopSegments}箇所が同じ言葉の繰り返しだったため除外しました。音量が小さいか、無音が続いたときに起きます。`,
      severity: WarningSeverity.WARNING,
    });
  }

  return warnings;
}
