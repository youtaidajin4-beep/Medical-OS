import { correctMedicalTerms } from '../src/providers/ai/medical-term-corrector';
import { DEFAULT_MEDICAL_GLOSSARY } from '../src/providers/ai/medical-glossary.types';

const CASE1_WRONG_TRANSCRIPT = [
  '3日前から咳が出て、少し息苦しいです。',
  '熱はありましたか？',
  '38度くらいありました。',
  '調子んでは wheeze を認めます。期間支援の印象です。',
  '無効団員を処方し、3日後に最新しましょう。',
].join('\n');

describe('Case 1 bronchitis transcript corrections', () => {
  it('corrects all known homophone errors from Case 1', () => {
    const result = correctMedicalTerms(CASE1_WRONG_TRANSCRIPT, DEFAULT_MEDICAL_GLOSSARY);

    expect(result.text).toContain('聴診では');
    expect(result.text).toContain('気管支炎');
    expect(result.text).toContain('ムコダイン');
    expect(result.text).toContain('再診しましょう');
    expect(result.text).not.toContain('調子んでは');
    expect(result.text).not.toContain('期間支援');
    expect(result.text).not.toContain('無効団員');
    expect(result.text).not.toContain('最新しましょう');
    expect(result.replacements.length).toBeGreaterThanOrEqual(4);
  });
});
