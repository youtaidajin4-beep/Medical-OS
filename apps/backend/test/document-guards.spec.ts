import {
  adlLevelStated,
  cleanOnsetDate,
  dementiaLevelStated,
  eraYearLabel,
  judgementStated,
} from '../src/modules/documents/document-guards';
import { finalizeCareOpinion1 } from '../src/modules/documents/care-opinion-template';
import { finalizeCertificate } from '../src/modules/documents/certificate-template';
import { findAffirmedButNegated } from '../src/providers/ai/soap-negation-guard';

const patient = { patientName: '山田 花子', sex: '女', age: 82 };
const today = new Date('2026-10-27T03:00:00Z'); // 日本時間 12:00

describe('自立度は、述べられたときだけ', () => {
  it('述べられていなければ空欄にする（AIがJ1・Ⅱaを選んでも）', () => {
    const r = finalizeCareOpinion1({ adlLevel: 'J1', dementiaLevel: 'Ⅱa' }, patient, today, undefined, '歩けている。話せている。');
    expect(r.adlLevel).toBe('');
    expect(r.dementiaLevel).toBe('');
  });
  it('医師が述べたときは通す', () => {
    const text = '障害高齢者の日常生活自立度はA1、認知症高齢者の日常生活自立度はⅡaです。';
    expect(adlLevelStated(text)).toBe(true);
    expect(dementiaLevelStated(text)).toBe(true);
    const r = finalizeCareOpinion1({ adlLevel: 'A1', dementiaLevel: 'Ⅱa' }, patient, today, undefined, text);
    expect(r.adlLevel).toBe('A1');
    expect(r.dementiaLevel).toBe('Ⅱa');
  });
  it('チャットの直しを保存する経路（記録を渡さない）は、そのまま通す', () => {
    expect(finalizeCareOpinion1({ adlLevel: 'B1' }, patient, today).adlLevel).toBe('B1');
  });
  it('ビタミンB12 の「B1」を自立度と取り違えない', () => {
    expect(adlLevelStated('ビタミンB12を測る')).toBe(false);
  });
});

describe('発症年は、根拠のあるものだけ', () => {
  const source = 'アルツハイマー型の認知症と診断したのが三年前でしたね。';
  it('「3年前」と言っているのに「平成30年頃」と書かれたら、数え直す', () => {
    expect(cleanOnsetDate('平成30年頃', 'アルツハイマー型認知症', source, today)).toBe('令和5年頃');
  });
  it('合っている年は残す', () => {
    expect(cleanOnsetDate('令和5年頃', 'アルツハイマー型認知症', source, today)).toBe('令和5年頃');
  });
  it('根拠が無い年は空欄', () => {
    expect(cleanOnsetDate('平成30年頃', 'アルツハイマー型認知症', '物忘れがある。', today)).toBe('');
  });
  it('和暦の表記', () => {
    expect(eraYearLabel(2023)).toBe('令和5年');
    expect(eraYearLabel(2019)).toBe('令和元年');
  });
});

describe('診断書の判定は、述べられたときだけ', () => {
  const ai = { bloodPressure: { systolic: '152', diastolic: '94', judgement: 'E' }, overallJudgement: 'E', ecg: { abnormality: 'none', judgement: 'A' } };
  it('述べられていなければ、判定は空欄。診察日は今日', () => {
    const r = finalizeCertificate(ai, patient, today, undefined, '血圧は152/94でした。') as Record<string, any>;
    expect(r.bloodPressure.judgement).toBe('');
    expect(r.ecg.judgement).toBe('');
    expect(r.overallJudgement).toBe('');
    expect(r.bloodPressure.systolic).toBe('152');
    expect(r.examDate).toContain('令和8年10月27日');
  });
  it('医師が判定を述べたときは通す', () => {
    expect(judgementStated('総合判定はEにして')).toBe(true);
    const r = finalizeCertificate(ai, patient, today, undefined, '総合判定はEにして') as Record<string, any>;
    expect(r.overallJudgement).toBe('E');
  });
  it('測っていなければ、診察日も空欄のまま', () => {
    expect((finalizeCertificate({}, patient, today, undefined, '') as Record<string, any>).examDate).toBe('');
  });
});

describe('書類で、ある が なし の並びに入っていない', () => {
  it('左肩の重さが「なし」の並びに入っていたら拾う', () => {
    const soap = '左の肩が重い感じがする時がある。冷や汗や気持ち悪さはなし。';
    const doc = '3週間前から胸が締め付けられる。左肩の重さや冷汗、吐き気はなし。';
    expect(findAffirmedButNegated(doc, soap).map((h) => h.item)).toContain('左肩の重さ');
  });
  it('正しく書かれていれば出さない', () => {
    const soap = '左の肩が重い感じがする時がある。冷や汗や気持ち悪さはなし。';
    const doc = '左肩の重さあり。冷汗、吐き気はなし。';
    expect(findAffirmedButNegated(doc, soap)).toEqual([]);
  });
});
