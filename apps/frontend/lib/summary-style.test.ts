import { CUSTOM_PRESET_ID, findPreset, presetIdFor, SUMMARY_PRESETS } from './summary-style';

describe('summary-style', () => {
  it('見本は、標準以外すべて指示の文を持つ', () => {
    for (const p of SUMMARY_PRESETS) {
      if (p.id === 'standard') expect(p.instruction).toBe('');
      else expect(p.instruction.length).toBeGreaterThan(10);
    }
  });

  it('指示が空なら標準', () => {
    expect(presetIdFor('')).toBe('standard');
    expect(presetIdFor('   ')).toBe('standard');
  });

  it('見本と同じ文なら、その見本が選ばれる', () => {
    const concise = findPreset('concise')!;
    expect(presetIdFor(concise.instruction, 'concise')).toBe('concise');
    expect(presetIdFor(concise.instruction)).toBe('concise');
  });

  it('見本と違う文は「自分の指示」', () => {
    expect(presetIdFor('体言止めで、Pは番号つきで', 'concise')).toBe(CUSTOM_PRESET_ID);
  });
});
