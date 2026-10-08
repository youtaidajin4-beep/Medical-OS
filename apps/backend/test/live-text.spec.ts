import {
  capSentences,
  cleanLiveText,
  mergeLiveRows,
  splitSentences,
} from '../src/modules/ai/live-text';

describe('cleanLiveText', () => {
  it('診察の言葉はそのまま残す', () => {
    expect(cleanLiveText(' 今日は どうされましたか ')).toEqual({
      keep: true,
      text: '今日は どうされましたか',
    });
    // 「ありがとうございました」は診察の終わりに普通に言う。単独でも消さない
    expect(cleanLiveText('ありがとうございました。')).toEqual({
      keep: true,
      text: 'ありがとうございました。',
    });
  });

  it('空の区間は落とす', () => {
    expect(cleanLiveText('  ')).toEqual({ keep: false, reason: 'empty' });
  });

  it('無音で出る定型句だけの区間は落とす', () => {
    expect(cleanLiveText('ご視聴ありがとうございました。')).toEqual({
      keep: false,
      reason: 'stock-phrase',
    });
    expect(cleanLiveText('ご清聴ありがとうございました')).toEqual({
      keep: false,
      reason: 'stock-phrase',
    });
  });

  it('日本語を含まない短い外国語は落とす', () => {
    expect(cleanLiveText('Thank you.')).toEqual({ keep: false, reason: 'foreign-filler' });
    expect(cleanLiveText('Gracias.')).toEqual({ keep: false, reason: 'foreign-filler' });
  });

  it('日本語に英数字が混じるものは残す（薬剤名・数値）', () => {
    expect(cleanLiveText('HbA1cは7.2です')).toEqual({ keep: true, text: 'HbA1cは7.2です' });
    expect(cleanLiveText('アムロジピン5mg')).toEqual({ keep: true, text: 'アムロジピン5mg' });
  });

  it('同じ語の繰り返しは落とす', () => {
    expect(cleanLiveText('読み読み読み読み読み読み読み読み読み読み読み読み')).toEqual({
      keep: false,
      reason: 'loop',
    });
  });
});

describe('splitSentences', () => {
  it('文の終わりで分ける', () => {
    expect(splitSentences('今日はどうされましたか。胸が苦しいです。そうですか')).toEqual([
      '今日はどうされましたか。',
      '胸が苦しいです。',
      'そうですか',
    ]);
  });

  it('3文字に満たない断片は、前の文へつなぐ', () => {
    expect(splitSentences('血圧は140です。はい。')).toEqual(['血圧は140です。はい。']);
  });

  it('句点が無ければ、そのまま1文', () => {
    expect(splitSentences('アムロジピン5mgを朝食後に')).toEqual(['アムロジピン5mgを朝食後に']);
  });
});

describe('capSentences', () => {
  it('上限を超えた分は、最後の行へまとめる', () => {
    const ten = Array.from({ length: 10 }, (_, i) => `文${i}。`);
    const out = capSentences(ten);
    expect(out).toHaveLength(8);
    expect(out[7]).toBe('文7。文8。文9。');
  });
});

describe('mergeLiveRows', () => {
  const row = (text: string, speaker: string, startMs: number, endMs: number) => ({
    text,
    speaker,
    startMs,
    endMs,
  });

  it('同じ話者の文が続いたら、1つの発話にまとめる', () => {
    const out = mergeLiveRows([
      row('お変わりないですか。', 'D', 0, 3000),
      row('血圧は測りましたか。', 'D', 3000, 6000),
      row('140くらいです。', 'P', 6000, 9000),
      row('そうですか。', 'D', 9000, 12000),
    ]);
    expect(out).toEqual([
      { text: 'お変わりないですか。血圧は測りましたか。', speaker: 'D', startMs: 0, endMs: 6000 },
      { text: '140くらいです。', speaker: 'P', startMs: 6000, endMs: 9000 },
      { text: 'そうですか。', speaker: 'D', startMs: 9000, endMs: 12000 },
    ]);
  });

  it('空の行は捨てる', () => {
    expect(mergeLiveRows([row('  ', 'D', 0, 1), row('はい。', 'P', 1, 2)])).toHaveLength(1);
  });

  it('入力を書き換えない', () => {
    const input = [row('あ。', 'D', 0, 1), row('い。', 'D', 1, 2)];
    mergeLiveRows(input);
    expect(input[0]!.text).toBe('あ。');
  });
});
