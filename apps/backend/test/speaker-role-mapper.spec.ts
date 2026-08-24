import {
  formatSpeakerPrefixedTranscript,
  mapSpeakerRoles,
  redistributeCorrectedLines,
} from '../src/providers/ai/speaker-role-mapper';
import { SttTranscriptSegment } from '../src/providers/ai/stt.provider';

describe('mapSpeakerRoles', () => {
  it('maps two diarization labels to physician and patient (Case1-style)', async () => {
    const segments: SttTranscriptSegment[] = [
      {
        text: '3日前から咳が出て、少し息苦しいです。',
        diarizationLabel: 'speaker_0',
        confidence: 0.9,
      },
      {
        text: '熱はありましたか？',
        diarizationLabel: 'speaker_1',
        confidence: 0.9,
      },
      {
        text: '37度半くらいでした。',
        diarizationLabel: 'speaker_0',
        confidence: 0.9,
      },
      {
        text: '聴診では wheeze を認めます。気管支炎の印象です。ムコダインを処方し、3日後に再診しましょう。',
        diarizationLabel: 'speaker_1',
        confidence: 0.9,
      },
    ];

    const mapped = await mapSpeakerRoles(segments);
    expect(mapped.map((s) => s.speaker)).toEqual([
      'patient',
      'physician',
      'patient',
      'physician',
    ]);
  });

  it('leaves unknown when only one speaker label exists', async () => {
    const mapped = await mapSpeakerRoles([
      { text: 'こんにちは', diarizationLabel: 'speaker_0', confidence: 0.9 },
      { text: '続きです', diarizationLabel: 'speaker_0', confidence: 0.9 },
    ]);
    expect(mapped.every((s) => s.speaker === 'unknown')).toBe(true);
  });

  it('uses LLM callback when heuristic scores are close', async () => {
    const resolvePhysicianLabel = jest.fn().mockResolvedValue('B');
    const mapped = await mapSpeakerRoles(
      [
        { text: 'あいうえお', diarizationLabel: 'A', confidence: 0.9 },
        { text: 'かきくけこ', diarizationLabel: 'B', confidence: 0.9 },
      ],
      { resolvePhysicianLabel },
    );
    expect(resolvePhysicianLabel).toHaveBeenCalled();
    expect(mapped[0]?.speaker).toBe('patient');
    expect(mapped[1]?.speaker).toBe('physician');
  });
});

describe('formatSpeakerPrefixedTranscript', () => {
  it('prefixes physician/patient labels in Japanese', () => {
    const text = formatSpeakerPrefixedTranscript([
      { text: '咳が出ます', speaker: 'patient' },
      { text: '聴診します', speaker: 'PHYSICIAN' },
    ]);
    expect(text).toBe('患者: 咳が出ます\n医師: 聴診します');
  });
});

describe('redistributeCorrectedLines', () => {
  it('splits corrected blob when line count matches', () => {
    expect(redistributeCorrectedLines(['a', 'b'], 'A\nB')).toEqual(['A', 'B']);
  });

  it('keeps originals when line count mismatches', () => {
    expect(redistributeCorrectedLines(['a', 'b'], 'all in one')).toEqual(['a', 'b']);
  });
});
