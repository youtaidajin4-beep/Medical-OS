import { validateStructuredData } from '../src/providers/ai/clinical-data-validator';
import { DEFAULT_MEDICAL_GLOSSARY } from '../src/providers/ai/medical-glossary.types';

describe('validateStructuredData', () => {
  it('warns on unregistered medication', () => {
    const warnings = validateStructuredData(
      { medications: ['未知の薬剤XYZ'] },
      DEFAULT_MEDICAL_GLOSSARY,
    );
    expect(warnings.some((w) => w.message.includes('辞書未登録'))).toBe(true);
  });

  it('passes known medication', () => {
    const warnings = validateStructuredData(
      { medications: ['ムコダイン'] },
      DEFAULT_MEDICAL_GLOSSARY,
    );
    expect(warnings.filter((w) => w.category === 'medication')).toHaveLength(0);
  });

  it('warns on assessment not matching glossary', () => {
    const warnings = validateStructuredData(
      { assessment: '完全に未知の病名' },
      DEFAULT_MEDICAL_GLOSSARY,
    );
    expect(warnings.some((w) => w.category === 'assessment')).toBe(true);
  });
});
