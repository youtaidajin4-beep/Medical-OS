import { correctMedicalTerms } from '../src/providers/ai/medical-term-corrector';

describe('correctMedicalTerms', () => {
  it('fixes bronchitis homophone in cough context', () => {
    const result = correctMedicalTerms(
      '聴診では wheeze を認めます。期間支援の印象です。',
    );
    expect(result.text).toContain('気管支炎');
    expect(result.replacements).toContainEqual({
      wrong: '期間支援',
      correct: '気管支炎',
    });
  });

  it('fixes 調子んでは to 聴診では', () => {
    const result = correctMedicalTerms('調子んではラ音があります。');
    expect(result.text).toBe('聴診ではラ音があります。');
  });

  it('fixes 無効団員 to ムコダイン', () => {
    const result = correctMedicalTerms('無効団員を処方します。');
    expect(result.text).toBe('ムコダインを処方します。');
  });

  it('fixes 最新 to 再診 in follow-up context', () => {
    const result = correctMedicalTerms('3日後に最新しましょう。');
    expect(result.text).toBe('3日後に再診しましょう。');
  });

  it('applies clinic custom replacements', () => {
    const result = correctMedicalTerms('テスト誤字を修正', {
      drugNames: [],
      diagnoses: [],
      customReplacements: [{ wrong: 'テスト誤字', correct: 'テスト正字' }],
    });
    expect(result.text).toBe('テスト正字を修正');
  });

  it('does not replace 期間支援 without respiratory context', () => {
    const result = correctMedicalTerms('期間支援の申請について');
    expect(result.text).toBe('期間支援の申請について');
    expect(result.replacements).toHaveLength(0);
  });
});
