import { formatRoutineApCombined, formatSoapForChartCopy } from './soap-visit';

describe('formatRoutineApCombined', () => {
  it('combines assessment and plan into a single A/P line (谷口先生の通常診察カルテ準拠)', () => {
    expect(formatRoutineApCombined('stable', '定時薬を継続する。')).toBe(
      'A/P：stable。定時薬を継続する。',
    );
  });

  it('does not duplicate a trailing 句点', () => {
    expect(formatRoutineApCombined('stable。', '定時薬を継続する。')).toBe(
      'A/P：stable。定時薬を継続する。',
    );
  });

  it('falls back to whichever half is present', () => {
    expect(formatRoutineApCombined('stable', '')).toBe('A/P：stable');
    expect(formatRoutineApCombined('', '定時薬を継続する。')).toBe('A/P：定時薬を継続する。');
    expect(formatRoutineApCombined('', '')).toBe('');
  });
});

describe('formatSoapForChartCopy', () => {
  const soap = {
    subjective: '体調変わりない。',
    objective: '脈拍異常なし。貧血・黄疸なし。心音・呼吸音異常なし。',
    assessment: 'stable',
    plan: '定時薬を継続する。',
  };

  it('ROUTINE: copies A and P as one combined A/P line, not two lines', () => {
    const text = formatSoapForChartCopy(soap, 'ROUTINE');
    expect(text).toBe(
      ['S：体調変わりない。', 'O：脈拍異常なし。貧血・黄疸なし。心音・呼吸音異常なし。', 'A/P：stable。定時薬を継続する。'].join(
        '\n',
      ),
    );
    expect(text).not.toMatch(/^A：/m);
    expect(text).not.toMatch(/^P：/m);
  });

  it('CHECKUP: keeps A and P as separate lines and preserves CXR/ECG in O', () => {
    const checkupSoap = {
      subjective: '健診で受診。',
      objective: [
        '脈拍異常なし。貧血・黄疸なし。心音・呼吸音異常なし。肝脾腫なし。下腿浮腫なし。',
        'CXR：有意な異常なし。',
        'ECG：有意な異常なし。',
      ].join('\n'),
      assessment: '',
      plan: '',
    };
    const text = formatSoapForChartCopy(checkupSoap, 'CHECKUP');
    expect(text).toContain('CXR：有意な異常なし。');
    expect(text).toContain('ECG：有意な異常なし。');
    expect(text).not.toContain('A/P：');
  });

  it('CHECKUP: shows A and P separately when present', () => {
    const text = formatSoapForChartCopy(
      { subjective: 'S', objective: 'O', assessment: 'A所見', plan: 'P方針' },
      'CHECKUP',
    );
    expect(text).toContain('A：A所見');
    expect(text).toContain('P：P方針');
  });
});
