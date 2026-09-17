import { WarningSeverity } from '@prisma/client';
import { StructuredClinicalDataPayload } from './llm.provider';
import { ClinicalValidationWarning } from './clinical-data-validator';

/**
 * 「録れていないのに所見が書かれる」を止める。
 *
 * SOAPの定型床（`soap-templates.ts`）は谷口先生が指定した「変化がないときの下書き」で、
 * プロンプトは「差分がなければ床を使う」と指示している。この指示は、音声がちゃんと
 * 録れている前提でだけ正しい。
 *
 * 2026-09-05、谷口先生の画面では文字起こしが「読み 読み 読み…」の繰り返しで、
 * 話者は全員「不明」だった。それでもSOAPには
 *   S：体調変わりない。 O：脈拍異常なし。貧血・黄疸なし。心音・呼吸音異常なし。 A：stable
 * が出ていた。**診察で確認していない身体所見がカルテに載っていた。**
 *
 * 床を使ってよいのは、音声から診療の中身が取れているときだけ。取れていないときは
 * 空欄にして、なぜ空欄なのかを医師に伝える。空欄は書き直せるが、
 * 「それらしく書かれた所見」は医師が気づかずに採用してしまう。
 */

/**
 * どれだけ喋れば「録れている」と言えるかは、録音の長さで変わる。
 * 20分の診察で30文字しか出ていないのは異常だが、1分の追加録音なら普通にあり得る。
 * なので固定の文字数ではなく、録音時間あたりの文字数で見る。
 *
 * 日本語の診察会話は、沈黙や所作の間を含めても実測で概ね 250〜400文字/分 出る。
 * ここでは **12文字/分** を下限に置く。実際に出る量の3〜5%で、
 * 「ぽつぽつとしか喋らない再診」でもまず割り込まない一方、
 * 2026-09-05のように20分録って数十文字しか残らない壊れ方は確実に捕まる。
 *
 *   20分 →  240文字未満なら異常
 *   15分 →  180文字未満なら異常
 *    5分 →   60文字未満なら異常
 */
const MIN_CHARS_PER_MINUTE = 12;

/** 録音時間が分からないとき（旧データ等）に使う固定の下限 */
const MIN_TRANSCRIPT_CHARS_FALLBACK = 60;

/** 短すぎる録音でしきい値が0に近づかないよう、常にこれだけは要求する */
const ABSOLUTE_MIN_CHARS = 20;

/** その録音で最低限必要な実質文字数 */
export function requiredTranscriptChars(recordingDurationSec?: number | null): number {
  if (!recordingDurationSec || recordingDurationSec <= 0) {
    return MIN_TRANSCRIPT_CHARS_FALLBACK;
  }
  const byDuration = Math.floor((recordingDurationSec / 60) * MIN_CHARS_PER_MINUTE);
  return Math.max(ABSOLUTE_MIN_CHARS, byDuration);
}

export type SoapEvidence = {
  /** 定型床を使ってSOAPを作ってよいか */
  usable: boolean;
  /** 医師へ見せる、空欄にした理由（usable=true なら undefined） */
  reason?: string;
  /** 実際に取れた実質文字数。しきい値を実データで詰めるために毎回記録する */
  measuredChars: number;
  /** その録音で要求した文字数 */
  requiredChars: number;
};

/** 構造化データに診療の事実が1つでも入っているか */
export function hasClinicalFacts(structured: StructuredClinicalDataPayload): boolean {
  const values = [
    structured.chiefComplaint,
    structured.presentIllness,
    structured.pastHistory,
    structured.vitals,
    structured.physicalExam,
    structured.assessment,
    structured.plan,
  ];
  if (values.some((v) => typeof v === 'string' && v.trim().length > 0)) return true;
  const lists = [structured.medications, structured.allergies];
  return lists.some((list) => Array.isArray(list) && list.some((item) => item.trim().length > 0));
}

/** 「医師: 」「患者: 」「不明: 」の話者ラベルと要確認フラグを除いた、実質の本文の長さ */
export function usableTranscriptLength(transcriptText: string): number {
  return transcriptText
    .split('\n')
    .filter((line) => !line.trim().startsWith('[要確認:'))
    .map((line) => line.replace(/^(医師|患者|不明)\s*[:：]\s*/, '').trim())
    .join('')
    .replace(/\s/g, '').length;
}

export function assessSoapEvidence(args: {
  /** 話者ラベル付きの文字起こし（SOAPの材料そのもの） */
  transcriptText: string;
  structured: StructuredClinicalDataPayload;
  /** 録音の長さ（秒）。しきい値をこの長さに合わせる */
  recordingDurationSec?: number | null;
}): SoapEvidence {
  const actual = usableTranscriptLength(args.transcriptText);
  const required = requiredTranscriptChars(args.recordingDurationSec);
  if (actual < required) {
    const minutes = args.recordingDurationSec
      ? Math.round(args.recordingDurationSec / 60)
      : null;
    const 録音の説明 = minutes ? `${minutes}分の録音に対して` : '';
    return {
      usable: false,
      measuredChars: actual,
      requiredChars: required,
      reason:
        `${録音の説明}文字起こしが${actual}文字しかなく、診療の記録として成立しないため、SOAPを空欄にしました。` +
        'マイクに声が届いていない可能性があります。',
    };
  }

  if (!hasClinicalFacts(args.structured)) {
    return {
      usable: false,
      measuredChars: actual,
      requiredChars: required,
      reason:
        '文字起こしから診療の内容を1つも取り出せなかったため、SOAPを空欄にしました。このまま作ると、診察で確認していない所見が定型文で入ってしまいます。',
    };
  }

  return { usable: true, measuredChars: actual, requiredChars: required };
}

/** 空欄にした理由を、医師の画面の「要確認」へ出す */
export function buildMissingEvidenceWarning(evidence: SoapEvidence): ClinicalValidationWarning[] {
  if (evidence.usable || !evidence.reason) return [];
  return [
    {
      category: 'recording',
      message: `SOAPを作成できませんでした：${evidence.reason}`,
      // 定型文が入っていないこと自体を見落とされると困るので、最上位で出す
      severity: WarningSeverity.CRITICAL,
    },
  ];
}
