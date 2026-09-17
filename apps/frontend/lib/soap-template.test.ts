import fs from 'fs';
import path from 'path';
import { SOAP_TEMPLATE_TEXT, templateTargets } from './soap-visit';

/**
 * 定型文は谷口先生が2026-08-10にカルテの画面写真で指定したもの。
 * ここを勝手に変えると、先生のカルテの書式が静かにずれる。
 */
describe('谷口先生の定型文', () => {
  it('通常診察は、指定どおりの4欄', () => {
    expect(SOAP_TEMPLATE_TEXT.ROUTINE).toEqual({
      subjective: '体調変わりない。',
      objective: '脈拍異常なし。貧血・黄疸なし。心音・呼吸音異常なし。',
      assessment: 'stable',
      plan: '定時薬を継続する。',
    });
  });

  it('健診は、CXRとECGの行が入る。A/Pは根拠がないので空のまま', () => {
    expect(SOAP_TEMPLATE_TEXT.CHECKUP.subjective).toBe('健診で受診。');
    expect(SOAP_TEMPLATE_TEXT.CHECKUP.objective).toBe(
      [
        '脈拍異常なし。貧血・黄疸なし。心音・呼吸音異常なし。肝脾腫なし。下腿浮腫なし。',
        'CXR：有意な異常なし。',
        'ECG：有意な異常なし。',
      ].join('\n'),
    );
    expect(SOAP_TEMPLATE_TEXT.CHECKUP.assessment).toBe('');
    expect(SOAP_TEMPLATE_TEXT.CHECKUP.plan).toBe('');
  });

  it('通常診察は A/P だけ差せる（先生が一番使うのがここ）', () => {
    const targets = templateTargets('ROUTINE');
    expect(targets[0]).toEqual({ label: 'A/P に定型文', fields: ['assessment', 'plan'] });
  });

  it('健診で差せるのは S/O だけ（A/Pの定型文が無いため）', () => {
    expect(templateTargets('CHECKUP')).toHaveLength(1);
    expect(templateTargets('CHECKUP')[0]!.fields).toEqual(['subjective', 'objective']);
  });

  /**
   * 同じ文面をサーバー（soap-templates.ts）も持っている。片方だけ直すと、
   * AIが書く下書きと、医師がボタンで入れる定型文がずれる。
   */
  it('サーバー側の定型床と、一字一句そろっている', () => {
    const serverSource = fs.readFileSync(
      path.join(__dirname, '../../backend/src/providers/ai/soap-templates.ts'),
      'utf8',
    );
    for (const visitType of ['ROUTINE', 'CHECKUP'] as const) {
      for (const value of Object.values(SOAP_TEMPLATE_TEXT[visitType])) {
        for (const line of value.split('\n')) {
          if (!line) continue;
          expect(serverSource).toContain(line);
        }
      }
    }
  });
});
