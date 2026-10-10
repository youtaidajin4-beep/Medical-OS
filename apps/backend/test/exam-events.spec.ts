import {
  normalSentences,
  resolveExam,
  verifyExamEvents,
} from '../src/providers/ai/exam-events';
import { applyRoutineFloor } from '../src/providers/ai/soap-floor-gate';
import { SOAP_TEMPLATE_FLOORS } from '../src/providers/ai/soap-templates';

const floor = SOAP_TEMPLATE_FLOORS.ROUTINE;
const 空 = { subjective: '', objective: '', assessment: '', plan: '' };
const t = (...lines: string[]) => lines.join('\n');

describe('診察の判定の検算（LLMの引用を、会話に照らす）', () => {
  const 会話 = t(
    '医師: 今日はちょっと心臓の音、聞いてみますね。',
    '患者: お願いします。',
    '医師: はい、きれいな音ですね。',
  );

  it('動作と結果の引用が医師の発話にあれば、異常なしとして採る', () => {
    const [e] = verifyExamEvents(
      { events: [{ system: 'heart', result: 'normal', evidence: '心臓の音、聞いてみますね', resultEvidence: 'きれいな音ですね' }] },
      会話,
    );
    expect(e).toMatchObject({ system: 'heart', result: 'normal' });
  });

  it('動作の引用が会話に無ければ、その部位ごと捨てる（していない診察を載せない）', () => {
    const events = verifyExamEvents(
      { events: [{ system: 'heart', result: 'normal', evidence: '聴診器を当てますね', resultEvidence: 'きれいな音ですね' }] },
      会話,
    );
    expect(events).toEqual([]);
  });

  it('患者の発話の引用は採らない（患者の訴えを診察にしない）', () => {
    const events = verifyExamEvents(
      { events: [{ system: 'lung', result: 'unstated', evidence: '背中が痛いんです' }] },
      t('患者: 背中が痛いんです。', '医師: いつからですか。'),
    );
    expect(events).toEqual([]);
  });

  it('結果の引用が会話に無ければ、未確認に下げる', () => {
    const [e] = verifyExamEvents(
      { events: [{ system: 'heart', result: 'normal', evidence: '心臓の音、聞いてみますね', resultEvidence: '全く問題ないですね' }] },
      会話,
    );
    expect(e!.result).toBe('unstated');
  });

  it('結果の発話が、診察の動作より前にあれば採らない', () => {
    const [e] = verifyExamEvents(
      { events: [{ system: 'heart', result: 'normal', evidence: '心臓の音を聞きますね', resultEvidence: '大丈夫ですね' }] },
      t('医師: お薬は大丈夫ですね。', '医師: では心臓の音を聞きますね。', '患者: はい。'),
    );
    expect(e!.result).toBe('unstated');
  });

  it('結果の発話が、動作から離れすぎていれば採らない', () => {
    const far = t(
      '医師: 心臓の音を聞きますね。',
      ...Array.from({ length: 8 }, (_, i) => `患者: 雑談${i}です。`),
      '医師: 大丈夫ですね。',
    );
    const [e] = verifyExamEvents(
      { events: [{ system: 'heart', result: 'normal', evidence: '心臓の音を聞きますね', resultEvidence: '大丈夫ですね' }] },
      far,
    );
    expect(e!.result).toBe('unstated');
  });

  it('短すぎる引用はどこにでも当たるので採らない', () => {
    expect(
      verifyExamEvents({ events: [{ system: 'pulse', result: 'unstated', evidence: '脈' }] }, '医師: 脈をとりますね。'),
    ).toEqual([]);
  });

  it('異常を述べたときは、所見をそのまま残す', () => {
    const [e] = verifyExamEvents(
      { events: [{ system: 'heart', result: 'abnormal', evidence: '心音聞きますね', resultEvidence: '少し雑音がありますね', finding: '雑音あり' }] },
      t('医師: 心音聞きますね。', '医師: 少し雑音がありますね。'),
    );
    expect(e).toMatchObject({ result: 'abnormal', finding: '雑音あり' });
  });

  it('形が崩れた応答・知らない部位は空として扱う', () => {
    expect(verifyExamEvents(null, 会話)).toEqual([]);
    expect(verifyExamEvents({ events: 'x' }, 会話)).toEqual([]);
    expect(verifyExamEvents({ events: [{ system: 'knee', result: 'normal', evidence: '膝を診ますね' }] }, '医師: 膝を診ますね。')).toEqual([]);
  });
});

describe('Oの文', () => {
  it('4部位とも異常なしなら、先生の定型そのままの文になる', () => {
    expect(normalSentences(['pulse', 'anemia_jaundice', 'heart', 'lung']).join('')).toBe(floor.objective);
  });
  it('心臓だけ・肺だけ・両方で、言い回しを分ける', () => {
    expect(normalSentences(['heart'])).toEqual(['心音異常なし。']);
    expect(normalSentences(['lung'])).toEqual(['呼吸音異常なし。']);
    expect(normalSentences(['heart', 'lung'])).toEqual(['心音・呼吸音異常なし。']);
  });
});

describe('Oの定型を、診察の判定で決める', () => {
  const ev = (system: 'heart' | 'lung' | 'pulse' | 'anemia_jaundice', result: 'normal' | 'unstated' | 'abnormal') => ({
    system,
    result,
    evidence: `${system}の動作`,
    resultEvidence: result === 'unstated' ? undefined : `${system}の結果`,
  });
  const 会話 = '医師: 心臓の音を聞きますね。\n医師: きれいですね。';

  it('心臓だけ異常なしと確かめられたら、心音だけを入れる。脈などは入れない', () => {
    const { soap, unconfirmedExam } = applyRoutineFloor(空, floor, 会話, resolveExam([ev('heart', 'normal')]));
    expect(soap.objective).toBe('心音異常なし。');
    expect(unconfirmedExam).toEqual([]);
  });

  it('結果の発話が無い部位は入れるが、未確認として返す（呼び出し側が要確認に出す）', () => {
    const { soap, unconfirmedExam } = applyRoutineFloor(空, floor, 会話, resolveExam([ev('heart', 'unstated')]));
    expect(soap.objective).toBe('心音異常なし。');
    expect(unconfirmedExam).toEqual(['heart']);
  });

  it('異常を述べた部位には定型を入れない', () => {
    const { soap, withheld } = applyRoutineFloor(空, floor, 会話, resolveExam([ev('heart', 'abnormal')]));
    expect(soap.objective).toBe('');
    expect(withheld).toContain('objective');
  });

  it('4部位とも確かめられたら、先生の定型（床）そのものを入れる', () => {
    const exam = resolveExam([ev('pulse', 'normal'), ev('anemia_jaundice', 'normal'), ev('heart', 'normal'), ev('lung', 'normal')]);
    expect(applyRoutineFloor(空, floor, 会話, exam).soap.objective).toBe(floor.objective);
  });

  it('部位が拾えず、聴診などの語だけある会話は、確認なしでは入れず、未確認として入れる', () => {
    const { soap, unconfirmedExam } = applyRoutineFloor(空, floor, '患者: 背中が痛いです。', resolveExam([]));
    expect(unconfirmedExam).toHaveLength(4);
    expect(soap.objective).toBe(floor.objective);
  });

  it('診察の発話が何も無い会話は、空のまま', () => {
    const { soap, withheld } = applyRoutineFloor(空, floor, '医師: 食事を分散させましょう。', resolveExam([]));
    expect(soap.objective).toBe('');
    expect(withheld).toContain('objective');
  });

  it('判定が使えないとき（null）は、従来どおり語の有無で決める', () => {
    expect(applyRoutineFloor(空, floor, '医師: 聴診しますね。', null).soap.objective).toBe(floor.objective);
    expect(applyRoutineFloor(空, floor, '医師: 食事を分散させましょう。', null).soap.objective).toBe('');
  });

  it('モデルがすでにOを書いていれば、定型は足さない（未確認も入れていない）', () => {
    const { soap, unconfirmedExam } = applyRoutineFloor({ ...空, objective: '右下肺に wheeze' }, floor, 会話, resolveExam([ev('heart', 'unstated')]));
    expect(soap.objective).toBe('右下肺に wheeze');
    expect(unconfirmedExam).toEqual([]);
  });
});
