import {
  formatRoutineApCombined,
  resolveSoapVisitType,
  SOAP_TEMPLATE_FLOORS,
} from '../src/providers/ai/soap-templates';
import { MockLlmProvider } from '../src/providers/ai/llm.provider';

describe('soap-templates', () => {
  it('resolves visit types', () => {
    expect(resolveSoapVisitType('CHECKUP')).toBe('CHECKUP');
    expect(resolveSoapVisitType('ROUTINE')).toBe('ROUTINE');
    expect(resolveSoapVisitType(undefined)).toBe('ROUTINE');
  });

  it('has kushima routine and checkup floors', () => {
    expect(SOAP_TEMPLATE_FLOORS.ROUTINE.assessment).toBe('stable');
    expect(SOAP_TEMPLATE_FLOORS.ROUTINE.plan).toBe('定時薬を継続する。');
    expect(SOAP_TEMPLATE_FLOORS.CHECKUP.subjective).toBe('健診で受診。');
    expect(SOAP_TEMPLATE_FLOORS.CHECKUP.objective).toContain('CXR：');
    expect(SOAP_TEMPLATE_FLOORS.CHECKUP.objective).toContain('ECG：');
  });

  it('formats routine A/P combined for chart paste', () => {
    expect(formatRoutineApCombined('stable', '定時薬を継続する。')).toBe(
      'A/P：stable。定時薬を継続する。',
    );
  });
});

describe('MockLlmProvider.generateSoap with visit templates', () => {
  const provider = new MockLlmProvider();

  it('uses routine floor when structured data is empty', async () => {
    const soap = await provider.generateSoap(
      {},
      undefined,
      {
        visitType: 'ROUTINE',
        templateFloor: SOAP_TEMPLATE_FLOORS.ROUTINE,
      },
    );
    expect(soap.subjective).toBe('体調変わりない。');
    expect(soap.objective).toContain('心音・呼吸音異常なし');
    expect(soap.assessment).toBe('stable');
    expect(soap.plan).toBe('定時薬を継続する。');
  });

  it('overrides floor with concrete facts', async () => {
    const soap = await provider.generateSoap(
      {
        chiefComplaint: '発熱38.0℃',
        physicalExam: '右下肺 wheeze',
        assessment: '気管支炎',
        plan: 'ムコダイン',
      },
      undefined,
      {
        visitType: 'ROUTINE',
        templateFloor: SOAP_TEMPLATE_FLOORS.ROUTINE,
      },
    );
    expect(soap.subjective).toContain('発熱38.0℃');
    expect(soap.objective).toContain('右下肺 wheeze');
    expect(soap.assessment).toBe('気管支炎');
    expect(soap.plan).toBe('ムコダイン');
  });

  it('uses checkup floor and keeps empty A/P without facts', async () => {
    const soap = await provider.generateSoap(
      {},
      undefined,
      {
        visitType: 'CHECKUP',
        templateFloor: SOAP_TEMPLATE_FLOORS.CHECKUP,
      },
    );
    expect(soap.subjective).toBe('健診で受診。');
    expect(soap.objective).toContain('CXR：有意な異常なし。');
    expect(soap.assessment).toBe('');
    expect(soap.plan).toBe('');
  });
});
