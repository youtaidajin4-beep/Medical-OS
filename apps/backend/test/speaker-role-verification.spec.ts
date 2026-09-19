import {
  mapSpeakerRoles,
  numberTranscriptLines,
  redistributeCorrectedLines,
} from '../src/providers/ai/speaker-role-mapper';
import { SttTranscriptSegment } from '../src/providers/ai/stt.provider';

/**
 * 2026-09-19、合成した診察音声3本で検証したときに出た壊れ方を固定する。
 */

function seg(text: string, label: string): SttTranscriptSegment {
  return { text, speaker: 'unknown', diarizationLabel: label, confidence: 0.9 };
}

describe('話者の割り当て', () => {
  // 健診の台本。12発言中10が医師で、ほとんどが平叙文の所見
  const 健診 = [
    seg('今日は健診ですね。体調で気になるところはありますか？', 'A'),
    seg('特にないです。元気にしています。', 'B'),
    seg('お薬は何か飲んでいますか？', 'A'),
    seg('今は何も飲んでいません。', 'B'),
    seg('では診察します。脈を診ますね。脈拍に異常はありません。', 'A'),
    seg('目と口を見せてください。貧血なし、黄疸もなしです。', 'A'),
    seg('胸の音を聴きます。心音、呼吸音ともに異常ありません。', 'A'),
    seg('お腹を診ます。肝臓や脾臓の腫れはありません。', 'A'),
    seg('足を見ますね。下腿の浮腫もありません。', 'A'),
    seg('胸のレントゲンは、有意な異常はありませんでした。', 'A'),
    seg('心電図も、有意な異常はありません。', 'A'),
    seg('特に問題ないですね。結果はまた郵送します。', 'A'),
  ];

  it('よく喋る医師が「患者」にされない（発言数で患者と判定していた）', async () => {
    // LLMが使えない状況でも、言い回しだけで正しく振り分けられること
    const mapped = await mapSpeakerRoles(健診);
    const 医師の発言 = mapped.filter((s) => s.diarizationLabel === 'A');
    expect(医師の発言.every((s) => s.speaker === 'physician')).toBe(true);
    const 患者の発言 = mapped.filter((s) => s.diarizationLabel === 'B');
    expect(患者の発言.every((s) => s.speaker === 'patient')).toBe(true);
  });

  it('LLMが判断できるときは、必ずLLMに聞く（言い回しの当てっこに任せない）', async () => {
    const resolve = jest.fn().mockResolvedValue('A');
    await mapSpeakerRoles(健診, { resolvePhysicianLabel: resolve });
    expect(resolve).toHaveBeenCalledTimes(1);
  });

  it('LLMの答えが優先される', async () => {
    // わざと逆（Bが医師）と答えさせる
    const mapped = await mapSpeakerRoles(健診, {
      resolvePhysicianLabel: async () => 'B',
    });
    expect(mapped.find((s) => s.diarizationLabel === 'B')?.speaker).toBe('physician');
    expect(mapped.find((s) => s.diarizationLabel === 'A')?.speaker).toBe('patient');
  });

  it('LLMが答えられなければ、言い回しで決める', async () => {
    const mapped = await mapSpeakerRoles(健診, {
      resolvePhysicianLabel: async () => null,
    });
    expect(mapped.find((s) => s.diarizationLabel === 'A')?.speaker).toBe('physician');
  });
});

describe('文字起こしの校正を取り込む', () => {
  const original = [
    '心房狭窄が出ている可能性があります。',
    'アムロジックインは続けてください。',
    '下体に腫瘍がありますね。',
  ];

  it('番号を付けて渡す', () => {
    expect(numberTranscriptLines(original)).toBe(
      '1: 心房狭窄が出ている可能性があります。\n' +
        '2: アムロジックインは続けてください。\n' +
        '3: 下体に腫瘍がありますね。',
    );
  });

  it('番号が付いて返れば、行数がずれても1行ずつ差し替わる', () => {
    // LLMが空行を挟んだり順番を入れ替えたりしても崩れない
    const corrected = [
      '',
      '2: アムロジピンは続けてください。',
      '1: 心房細動が出ている可能性があります。',
      '',
      '3: 下腿に浮腫がありますね。',
    ].join('\n');
    expect(redistributeCorrectedLines(original, corrected)).toEqual([
      '心房細動が出ている可能性があります。',
      'アムロジピンは続けてください。',
      '下腿に浮腫がありますね。',
    ]);
  });

  it('一部の番号しか返ってこなくても、返ってきた行だけ直る', () => {
    const corrected = '1: 心房細動が出ている可能性があります。';
    expect(redistributeCorrectedLines(original, corrected)).toEqual([
      '心房細動が出ている可能性があります。',
      'アムロジックインは続けてください。',
      '下体に腫瘍がありますね。',
    ]);
  });

  it('番号が無くても、行数が合えば従来どおり採用する', () => {
    const corrected = ['心房細動。', 'アムロジピン。', '下腿に浮腫。'].join('\n');
    expect(redistributeCorrectedLines(original, corrected)).toEqual([
      '心房細動。',
      'アムロジピン。',
      '下腿に浮腫。',
    ]);
  });

  it('番号も無く行数も違えば、元のまま（話者の対応を壊さない）', () => {
    expect(redistributeCorrectedLines(original, '全然ちがう一行')).toEqual(original);
  });
});
