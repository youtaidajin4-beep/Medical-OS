import { SttTranscriptSegment } from './stt.provider';

export type SpeakerRole = 'physician' | 'patient' | 'other' | 'unknown';

const PHYSICIAN_HINTS =
  /処方|聴診|再診|印象|診断|所見|ウィーズ|wheeze|ましょう|お願いします|紹介|レントゲン|血液|検査|内服|mg|ミリ|錠|継続|中止|開始|増量|減量|御高診|経過観察|気管支|ムコダイン|アムロジピン/;

const PATIENT_HINTS =
  /痛い|痛み|苦しい|息苦|咳|痰|熱|眠れ|不安|心配|ですよね|なんですが|なんか|ちょっと/;

function scoreCluster(texts: string[]): { physician: number; patient: number } {
  const joined = texts.join('\n');
  const questionMarks = (joined.match(/[？?]/g) ?? []).length;
  const physicianHits = (joined.match(new RegExp(PHYSICIAN_HINTS.source, 'g')) ?? []).length;
  const patientHits = (joined.match(new RegExp(PATIENT_HINTS.source, 'g')) ?? []).length;
  return {
    physician: physicianHits * 2 + questionMarks,
    patient: patientHits * 2 + Math.max(0, texts.length - questionMarks),
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

  if (aPhysicianMargin > bPhysicianMargin + 1) {
    physicianLabel = labelA;
  } else if (bPhysicianMargin > aPhysicianMargin + 1) {
    physicianLabel = labelB;
  } else if (options?.resolvePhysicianLabel) {
    const sampleA = textsA.slice(0, 6).join(' / ').slice(0, 400);
    const sampleB = textsB.slice(0, 6).join(' / ').slice(0, 400);
    const pick = await options.resolvePhysicianLabel(labelA, labelB, sampleA, sampleB);
    if (pick === 'A') physicianLabel = labelA;
    if (pick === 'B') physicianLabel = labelB;
  } else {
    // Tie-break: more questions + medical verbs → physician
    physicianLabel =
      scoreA.physician + aPhysicianMargin >= scoreB.physician + bPhysicianMargin
        ? labelA
        : labelB;
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
export function redistributeCorrectedLines(
  originalTexts: string[],
  corrected: string,
): string[] {
  const lines = corrected
    .split('\n')
    .map((l) => l.replace(/^(医師|患者|不明)[:：]\s*/, '').trim())
    .filter((l) => l.length > 0);
  if (lines.length === originalTexts.length) {
    return lines;
  }
  return originalTexts;
}
