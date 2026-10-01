import {
  applyPhrasingToSoap,
  resolvePhraseRewrites,
  rewritePhrases,
} from '../src/providers/ai/soap-phrasing';
import { DEFAULT_PHYSICIAN_RULES } from '../src/modules/settings/physician-rules.types';

/**
 * 2026-09-26、谷口先生の10名分の報告を受けて挙げた直す順の4番目。
 * 「いつもの薬を出す」→「定時薬継続」など、先生の書き方への言い換え表。
 */
describe('話し言葉を先生の書き方へ言い換える', () => {
  const rewrites = resolvePhraseRewrites(DEFAULT_PHYSICIAN_RULES);

  it('「いつもの薬を出す」を「定時薬を継続する」にする', () => {
    expect(rewritePhrases('いつもの薬を出す。', rewrites)).toBe('定時薬を継続する。');
  });

  it('長い言い回しから先に当てる', () => {
    // 「薬はそのまま」より「いつもの薬を継続」が先。短いほうから当てると崩れる
    expect(rewritePhrases('いつもの薬を継続します', rewrites)).toContain('定時薬を継続する');
  });

  it('S と O には当てない。患者さんの言葉を医師の言い回しに直さない', () => {
    const out = applyPhrasingToSoap(
      {
        subjective: '患者本人より「いつもの薬を出す」と希望',
        objective: '様子を見る',
        assessment: '',
        plan: 'いつもの薬を出す',
      },
      DEFAULT_PHYSICIAN_RULES,
    );
    expect(out.subjective).toContain('いつもの薬を出す');
    expect(out.objective).toBe('様子を見る');
    expect(out.plan).toBe('定時薬を継続する');
  });

  it('先生が設定した表が、既定より優先される', () => {
    const custom = resolvePhraseRewrites({
      ...DEFAULT_PHYSICIAN_RULES,
      phraseRewrites: [{ from: '様子を見る', to: 'フォローアップ' }],
    });
    expect(rewritePhrases('様子を見る', custom)).toBe('フォローアップ');
  });

  it('表に無い言い回しは触らない', () => {
    expect(rewritePhrases('減塩を指導した。', rewrites)).toBe('減塩を指導した。');
  });
});
