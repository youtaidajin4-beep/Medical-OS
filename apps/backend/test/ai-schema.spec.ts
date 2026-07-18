import { StructuredClinicalDataSchema } from '../src/providers/ai/llm.provider';

describe('StructuredClinicalDataSchema', () => {
  it('validates mock extraction payload', () => {
    const result = StructuredClinicalDataSchema.safeParse({
      chiefComplaint: '咳',
      presentIllness: '3日前から',
      assessment: '気管支炎の印象',
      plan: '経過観察',
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid types', () => {
    const result = StructuredClinicalDataSchema.safeParse({
      medications: 'not-an-array',
    });
    expect(result.success).toBe(false);
  });
});
