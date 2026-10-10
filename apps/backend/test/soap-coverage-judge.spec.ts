import { keepQuotedClaims, runSoapJudge } from '../src/modules/quality/soap-coverage-judge';
import { emptyJudgement, parseSoapJudgement } from '../src/modules/quality/quality-metrics';

const soap = {
  subjective: '頭痛3日。',
  objective: '血圧152/94mmHg。心音・呼吸音異常なし。',
  assessment: '高血圧。',
  plan: 'アムロジピン継続。',
};

describe('根拠のない記載の絞り込み', () => {
  it('SOAPの文面にある引用だけ残す。SOAPに無い内容を挙げる誤りは捨てる', () => {
    const kept = keepQuotedClaims(
      [
        { text: '血圧152/94mmHg', reason: '会話に無い' },
        { text: '便秘がある', reason: 'SOAPに無い事実（逆向きの誤り）' },
      ],
      soap,
    );
    expect(kept.map((k) => k.text)).toEqual(['血圧152/94mmHg']);
  });

  it('空白・句読点・全角半角の違いは同じ引用とみなす', () => {
    expect(keepQuotedClaims([{ text: '心音・呼吸音 異常なし' }], soap)).toHaveLength(1);
  });

  it('短すぎる引用はどこにでも当たるので採らない', () => {
    expect(keepQuotedClaims([{ text: '高血圧' }], soap)).toHaveLength(0);
  });

  it('配列でない応答は空として扱う', () => {
    expect(keepQuotedClaims(null, soap)).toEqual([]);
    expect(keepQuotedClaims('x', soap)).toEqual([]);
  });
});

describe('3段の判定の流れ', () => {
  it('事実→突き合わせ→根拠の確認の順に呼び、費用を合算して、形をそろえて返す', async () => {
    const calls: string[] = [];
    const chat = async (system: string) => {
      calls.push(system.slice(0, 12));
      if (system.includes('漏れなく挙げて')) return { json: { facts: ['頭痛3日', '血圧152/94', '再診1か月'] }, costJpy: 1 };
      if (system.includes('順番どおり')) {
        return {
          json: { facts: [
            { fact: '頭痛3日', inSoap: true },
            { fact: '血圧152/94', inSoap: true },
            { fact: '再診1か月', inSoap: false },
          ] },
          costJpy: 0.5,
        };
      }
      return { json: { unsupported: [{ text: '心音・呼吸音異常なし', reason: '聴診の会話が無い' }] }, costJpy: 0.5 };
    };
    const result = await runSoapJudge(chat, '会話', soap);
    expect(calls).toHaveLength(3);
    expect(result.costJpy).toBe(2);
    const parsed = parseSoapJudgement(result.json)!;
    expect(parsed.coverage).toBeCloseTo(2 / 3, 5);
    expect(parsed.missedFacts).toEqual(['再診1か月']);
    expect(parsed.unsupported.map((u) => u.text)).toEqual(['心音・呼吸音異常なし']);
  });

  it('事実が1つも挙がらない短い会話は、転記率を出さず、根拠のない記載だけ残す', async () => {
    const chat = async (system: string) =>
      system.includes('漏れなく挙げて')
        ? { json: { facts: [] }, costJpy: 0.2 }
        : { json: { unsupported: [{ text: '血圧152/94mmHg', reason: '会話に無い' }] }, costJpy: 0.2 };
    const result = await runSoapJudge(chat, '短い', soap);
    expect(parseSoapJudgement(result.json)).toBeNull();
    const empty = emptyJudgement(result.json)!;
    expect(empty.factCount).toBe(0);
    expect(empty.coverage).toBeNull();
    expect(empty.unsupported).toHaveLength(1);
  });
});
