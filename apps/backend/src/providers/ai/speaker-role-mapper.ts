import { SttTranscriptSegment } from './stt.provider';

export type SpeakerRole = 'physician' | 'patient' | 'other' | 'unknown';

/**
 * 医師らしい言い回し。所見を述べる語と、診察の指示・手技を含める。
 * 2026-09-19の検証で、健診の台本（12発言中10が医師の平叙文の所見）が
 * まるごと「患者」と判定された。所見語がここに無かったのが一因。
 */
const PHYSICIAN_HINTS =
  /処方|聴診|再診|印象|診断|所見|ウィーズ|wheeze|ましょう|お願いします|紹介|レントゲン|血液|検査|内服|mg|ミリ|錠|継続|中止|開始|増量|減量|御高診|経過観察|気管支|ムコダイン|アムロジピン|脈拍|貧血|黄疸|心音|呼吸音|肝脾腫|肝臓|脾臓|浮腫|下腿|心電図|採血|診察|健診|異常(は)?(あり|な)|見せてください|してください|しますね|診ます|聴きます|測り|郵送|次回|来てください/;

/** 患者らしい言い回し。自分の体調の訴えと、応答に寄せる */
const PATIENT_HINTS =
  /痛い|痛み|苦しい|息苦|咳|痰|眠れ|不安|心配|ですよね|なんですが|なんか|しんどく|気がして|と思います|特にないです|わかりました|ありがとうござ/;

/**
 * クラスタの「医師らしさ／患者らしさ」を **1発言あたり** で出す。
 *
 * 以前は patient 側に `texts.length - questionMarks`（＝質問でない発言の数）を
 * そのまま足していた。発言数が多いほど患者らしいことになり、
 * **よく喋る医師が患者と判定される**。2026-09-19の健診の台本がこれで反転した。
 * 件数ではなく割合で見る。
 */
function scoreCluster(texts: string[]): { physician: number; patient: number } {
  const count = Math.max(1, texts.length);
  const joined = texts.join('\n');
  const questionMarks = (joined.match(/[？?]/g) ?? []).length;
  const physicianHits = (joined.match(new RegExp(PHYSICIAN_HINTS.source, 'g')) ?? []).length;
  const patientHits = (joined.match(new RegExp(PATIENT_HINTS.source, 'g')) ?? []).length;
  return {
    // 質問は医師の signal（問診する側）。どちらも1発言あたりに正規化する
    physician: (physicianHits * 2 + questionMarks) / count,
    patient: (patientHits * 2) / count,
  };
}

/**
 * Map anonymous diarization labels (speaker_0 / A / …) onto physician/patient.
 * Uses lexical heuristics; optional LLM callback when the two clusters score closely.
 */
export async function mapSpeakerRoles(
  segments: SttTranscriptSegment[],
  options?: {
    resolvePhysicianLabel?: (labelA: string, labelB: string, sampleA: string, sampleB: string) => Promise<'A' | 'B' | null>;
  },
): Promise<SttTranscriptSegment[]> {
  const labels = [
    ...new Set(
      segments
        .map((s) => s.diarizationLabel?.trim())
        .filter((v): v is string => Boolean(v)),
    ),
  ];

  if (labels.length === 0) {
    return segments.map((s) => ({ ...s, speaker: s.speaker ?? 'unknown' }));
  }

  if (labels.length === 1) {
    const only = labels[0]!;
    // Single detected speaker: leave unknown so clinician can fix manually
    return segments.map((s) => ({
      ...s,
      speaker: s.diarizationLabel === only ? 'unknown' : s.speaker ?? 'unknown',
    }));
  }

  // Prefer the two largest clusters (typical doctor–patient consult)
  const byLabel = new Map<string, string[]>();
  for (const seg of segments) {
    const label = seg.diarizationLabel?.trim();
    if (!label) continue;
    const list = byLabel.get(label) ?? [];
    list.push(seg.text);
    byLabel.set(label, list);
  }

  const ranked = [...byLabel.entries()].sort((a, b) => b[1].length - a[1].length);
  const [labelA, textsA] = ranked[0]!;
  const [labelB, textsB] = ranked[1]!;
  const scoreA = scoreCluster(textsA);
  const scoreB = scoreCluster(textsB);

  const aPhysicianMargin = scoreA.physician - scoreA.patient;
  const bPhysicianMargin = scoreB.physician - scoreB.patient;

  let physicianLabel: string | null = null;

  // 言い回しの当てっこより、実際の会話を読ませたほうが確実。判定が割れたときだけ
  // 聞くようにしていたが、2026-09-19の検証で**誤った判定に自信を持ったまま
  // LLMに一度も聞かず**、健診の台本が丸ごと反転した。呼べるなら必ず聞く。
  if (options?.resolvePhysicianLabel) {
    const sampleA = textsA.slice(0, 6).join(' / ').slice(0, 400);
    const sampleB = textsB.slice(0, 6).join(' / ').slice(0, 400);
    const pick = await options.resolvePhysicianLabel(labelA, labelB, sampleA, sampleB);
    if (pick === 'A') physicianLabel = labelA;
    if (pick === 'B') physicianLabel = labelB;
  }

  // LLMが使えない・答えられなかったときだけ、言い回しで決める
  if (!physicianLabel) {
    if (aPhysicianMargin > bPhysicianMargin) {
      physicianLabel = labelA;
    } else if (bPhysicianMargin > aPhysicianMargin) {
      physicianLabel = labelB;
    } else {
      // 完全に互角。質問の多いほうを医師とみなす
      physicianLabel = scoreA.physician >= scoreB.physician ? labelA : labelB;
    }
  }

  if (!physicianLabel) {
    return segments.map((s) => ({ ...s, speaker: 'unknown' as const }));
  }

  const patientLabel = physicianLabel === labelA ? labelB : labelA;
  const roleByLabel = new Map<string, SpeakerRole>([
    [physicianLabel, 'physician'],
    [patientLabel, 'patient'],
  ]);

  return segments.map((s) => {
    const label = s.diarizationLabel?.trim();
    if (!label) return { ...s, speaker: 'unknown' as const };
    const role = roleByLabel.get(label);
    if (role) return { ...s, speaker: role };
    return { ...s, speaker: 'other' as const };
  });
}

/** Build SOAP-friendly transcript with speaker prefixes. */
export function formatSpeakerPrefixedTranscript(
  segments: Array<{ text: string; speaker?: string | null }>,
): string {
  return segments
    .map((s) => {
      const text = (s.text ?? '').trim();
      if (!text) return '';
      const role =
        s.speaker === 'PHYSICIAN' || s.speaker === 'physician'
          ? '医師'
          : s.speaker === 'PATIENT' || s.speaker === 'patient'
            ? '患者'
            : '不明';
      return `${role}: ${text}`;
    })
    .filter((line) => line.length > 0)
    .join('\n');
}

/** Redistribute a corrected blob onto the original segment texts when line counts match. */
/** 校正へ渡すとき、行に番号を振る。戻ってきた番号で元の行へ確実に対応づけるため */
export function numberTranscriptLines(texts: string[]): string {
  return texts.map((t, i) => `${i + 1}: ${t}`).join('\n');
}

/**
 * 校正結果を元の行へ戻す。
 *
 * 以前は「行数が一致したときだけ採用、違えば全部捨てる」だった。話者の対応を
 * 壊さないための安全策だが、LLMが1行を2行に割ったり空行を足したりするだけで
 * **校正がまるごと消える**。2026-09-19の検証では、心房細動→心房狭窄、
 * アムロジピン→アムロジックイン がどちらも直らず、自動補正0件だった。
 *
 * 番号が付いて返ってきていれば、その番号で1行ずつ差し替える。番号が無い行や
 * 欠けた番号は元のまま残すので、対応が崩れることはない。
 */
export function redistributeCorrectedLines(
  originalTexts: string[],
  corrected: string,
): string[] {
  const stripSpeaker = (l: string) => l.replace(/^(医師|患者|不明)[:：]\s*/, '').trim();

  // 番号付きで返ってきた場合（こちらが本命）
  const numbered = new Map<number, string>();
  for (const rawLine of corrected.split('\n')) {
    const m = rawLine.match(/^\s*(\d+)\s*[:：.]\s*(.*)$/);
    if (!m) continue;
    const index = Number(m[1]) - 1;
    const text = stripSpeaker(m[2] ?? '');
    if (index >= 0 && index < originalTexts.length && text) {
      numbered.set(index, text);
    }
  }
  if (numbered.size > 0) {
    return originalTexts.map((original, i) => numbered.get(i) ?? original);
  }

  // 番号が無いときは、従来どおり行数が一致した場合のみ採用する
  const lines = corrected.split('\n').map(stripSpeaker).filter((l) => l.length > 0);
  if (lines.length === originalTexts.length) {
    return lines;
  }
  return originalTexts;
}
