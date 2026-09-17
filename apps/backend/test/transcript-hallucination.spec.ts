import { isLoopedText, stripLoopedSegments } from '../src/providers/ai/transcript-hallucination';
import { buildTranscriptQualityWarnings } from '../src/providers/ai/transcript-quality-warnings';

/** 2026-09-05、谷口先生の画面に実際に出ていた形 */
const OBSERVED_LOOP = '読み 読み 読み 読み 読み 読み 読み 読み 読み 読み';

describe('ループ・ハルシネーションの除去', () => {
  it('画面に出ていた「読み 読み 読み…」をループと判定する', () => {
    expect(isLoopedText(OBSERVED_LOOP)).toBe(true);
  });

  it('空白なしで繰り返される形も判定する', () => {
    expect(isLoopedText('読み読み読み読み読み読み読み読み')).toBe(true);
  });

  it('ふつうの診療会話はループと判定しない', () => {
    expect(isLoopedText('体調は変わりないです。血圧の薬は朝に飲んでいます。')).toBe(false);
    expect(
      isLoopedText('アレルギーが時々出るので、切りたいなと思うんですけどどうでしょうか。'),
    ).toBe(false);
  });

  it('短い相槌は落とさない（「はい、はい、はい」は自然な発話）', () => {
    expect(isLoopedText('はい、はい、はい')).toBe(false);
    expect(isLoopedText('ええ、ええ')).toBe(false);
  });

  it('ループしたセグメントだけ落として、残りは順番どおり残す', () => {
    const { kept, dropped } = stripLoopedSegments([
      { text: '体調は変わりないです。' },
      { text: OBSERVED_LOOP },
      { text: '脈は問題ありませんね。' },
    ]);
    expect(kept.map((k) => k.text)).toEqual(['体調は変わりないです。', '脈は問題ありませんね。']);
    expect(dropped).toHaveLength(1);
  });

  it('全部がループ判定なら、判定のほうを疑って元を残す', () => {
    const segments = [{ text: OBSERVED_LOOP }, { text: OBSERVED_LOOP }];
    const { kept, dropped } = stripLoopedSegments(segments);
    expect(kept).toHaveLength(2);
    expect(dropped).toHaveLength(0);
  });
});

describe('録音品質の警告', () => {
  it('話者を聞き分けられなかったら、マイクを確認する警告を出す', () => {
    const warnings = buildTranscriptQualityWarnings({
      droppedLoopSegments: 0,
      diarizationSpeakers: 1,
    });
    expect(warnings).toHaveLength(1);
    expect(warnings[0]!.category).toBe('recording');
    expect(warnings[0]!.message).toContain('マイク');
  });

  it('落とした繰り返しの件数を医師に伝える（黙って消さない）', () => {
    const warnings = buildTranscriptQualityWarnings({
      droppedLoopSegments: 3,
      diarizationSpeakers: 2,
    });
    expect(warnings).toHaveLength(1);
    expect(warnings[0]!.message).toContain('3箇所');
  });

  it('どちらも正常なら警告を出さない', () => {
    expect(
      buildTranscriptQualityWarnings({ droppedLoopSegments: 0, diarizationSpeakers: 2 }),
    ).toHaveLength(0);
  });
});
