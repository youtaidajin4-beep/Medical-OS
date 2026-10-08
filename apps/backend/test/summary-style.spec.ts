import {
  MAX_SUMMARY_INSTRUCTION_CHARS,
  parsePhysicianRules,
  parseSummaryStyle,
} from '../src/modules/settings/physician-rules.types';

describe('parseSummaryStyle', () => {
  it('指示を前後の空白を除いて受ける', () => {
    expect(parseSummaryStyle({ instruction: '  箇条書きにする  ', presetId: 'concise' })).toEqual({
      instruction: '箇条書きにする',
      presetId: 'concise',
    });
  });

  it('空の指示は無いものとして扱う', () => {
    expect(parseSummaryStyle({ instruction: '   ' })).toBeUndefined();
    expect(parseSummaryStyle(undefined)).toBeUndefined();
    expect(parseSummaryStyle('文字列')).toBeUndefined();
  });

  it('長すぎる指示は、上限で切る', () => {
    const out = parseSummaryStyle({ instruction: 'あ'.repeat(MAX_SUMMARY_INSTRUCTION_CHARS + 50) });
    expect(out?.instruction).toHaveLength(MAX_SUMMARY_INSTRUCTION_CHARS);
  });

  it('presetId が無くても受ける', () => {
    expect(parseSummaryStyle({ instruction: '体言止めで' })).toEqual({ instruction: '体言止めで' });
  });
});

describe('parsePhysicianRules と summaryStyle', () => {
  it('保存された書き方の指定を読み戻す', () => {
    const rules = parsePhysicianRules({
      referralRules: [],
      fixedPhrases: {},
      summaryStyle: { instruction: '簡潔に', presetId: 'concise' },
    });
    expect(rules.summaryStyle).toEqual({ instruction: '簡潔に', presetId: 'concise' });
  });

  it('指定が無ければ、項目ごと無い', () => {
    expect(parsePhysicianRules({ referralRules: [], fixedPhrases: {} }).summaryStyle).toBeUndefined();
  });
});
