import {
  boostedLevel,
  GAIN_CHOICES,
  MAX_GAIN,
  resolveGain,
  suggestGain,
} from './audio-gain';

/**
 * 2026-09-17、診察室向けにブラウザの自動ゲインを切ったところ、
 * 「音が小さすぎます」が出やすくなった。切ったこと自体は正しい（医師が近くで
 * 喋ると患者の声が下がるため）ので、代わりにこちらで持ち上げる。
 */
describe('入力の増幅', () => {
  it('小さい入力ほど大きく持ち上げる', () => {
    // 遠くの患者の声。素のピークが 0.05 しかない
    expect(suggestGain(0.05)).toBe(7);
    // 少し小さい程度
    expect(suggestGain(0.175)).toBe(2);
  });

  it('もともと十分大きい入力は、絞らない（1を下回らない）', () => {
    expect(suggestGain(0.8)).toBe(1);
    expect(suggestGain(0.35)).toBe(1);
  });

  it('上げすぎない。空調音まで持ち上げても意味がない', () => {
    expect(suggestGain(0.001)).toBeLessThanOrEqual(MAX_GAIN);
    expect(suggestGain(0.0001)).toBe(1); // ほぼ無音は増幅の計算に使わない
  });

  it('手で選んだ増幅率は、観測値に関係なくそのまま使う', () => {
    for (const choice of GAIN_CHOICES) {
      expect(resolveGain(choice, 0.05)).toBe(choice);
      expect(resolveGain(choice, 0.9)).toBe(choice);
    }
  });

  it('自動のときだけ、観測したピークから決める', () => {
    expect(resolveGain('auto', 0.05)).toBe(7);
  });

  it('表示レベルは増幅を掛けた値。ただし振り切れない', () => {
    expect(boostedLevel(0.05, 4)).toBeCloseTo(0.2);
    expect(boostedLevel(0.5, 4)).toBe(1);
  });

  it('増幅したあと、声ありの判定を越えられる', () => {
    // 素のままだと 0.05 で「小さすぎます」。自動で持ち上げると越える
    const raw = 0.05;
    expect(boostedLevel(raw, 1)).toBeLessThan(0.08);
    expect(boostedLevel(raw, resolveGain('auto', raw))).toBeGreaterThan(0.08);
  });
});
