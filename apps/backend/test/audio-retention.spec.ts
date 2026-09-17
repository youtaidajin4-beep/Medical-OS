import {
  DEFAULT_AUDIO_RETENTION_MINUTES,
  deletesImmediately,
  resolveRetentionMinutes,
  retentionCutoff,
} from '../src/modules/recording/audio-retention';

/**
 * 2026-09-05、桑原さん・立川さんは「処理は通ったが中身が使えない」状態だった。
 * パイプライン成功の直後に音声を消していたため、作り直す手段がなく、
 * 「もう一度処理する」は『再処理できる録音がありません』で弾かれた。
 */
describe('音声の保持期間', () => {
  it('既定は24時間。当日中に気づいて作り直せる幅', () => {
    expect(DEFAULT_AUDIO_RETENTION_MINUTES).toBe(1440);
    expect(resolveRetentionMinutes({})).toBe(1440);
  });

  it('AUDIO_RETENTION_MINUTES で変えられる（方針どおり「設定可能」）', () => {
    expect(resolveRetentionMinutes({ AUDIO_RETENTION_MINUTES: '180' })).toBe(180);
  });

  it('0 を指定すれば、従来どおりパイプライン直後に消す', () => {
    const minutes = resolveRetentionMinutes({ AUDIO_RETENTION_MINUTES: '0' });
    expect(minutes).toBe(0);
    expect(deletesImmediately(minutes)).toBe(true);
  });

  it('保持するときは、直後に消さない', () => {
    expect(deletesImmediately(DEFAULT_AUDIO_RETENTION_MINUTES)).toBe(false);
  });

  it('壊れた値は既定へ倒す。設定ミスで音声が消えなくなるより、既定で消えるほうが安全', () => {
    expect(resolveRetentionMinutes({ AUDIO_RETENTION_MINUTES: 'いつまでも' })).toBe(1440);
    expect(resolveRetentionMinutes({ AUDIO_RETENTION_MINUTES: '-5' })).toBe(1440);
    expect(resolveRetentionMinutes({ AUDIO_RETENTION_MINUTES: '' })).toBe(1440);
  });

  it('基準時刻より古い音声が掃除の対象になる', () => {
    const now = new Date('2026-09-17T12:00:00Z');
    expect(retentionCutoff(now, 1440).toISOString()).toBe('2026-09-16T12:00:00.000Z');
    expect(retentionCutoff(now, 0).toISOString()).toBe(now.toISOString());
  });
});
