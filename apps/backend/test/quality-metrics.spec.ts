import {
  aggregateMonth,
  extractCanonicalTerms,
  MeasurementRow,
  monthKeyJst,
  monthRangeJst,
  normalizeForCompare,
  parseSoapJudgement,
  termOverlap,
  textOverlap,
} from '../src/modules/quality/quality-metrics';

const LONG_REF =
  '今日はどうされましたか。血圧が高くて頭が痛いんです。いつからですか。三日前からです。アムロジピンを朝一錠飲んでいますか。はい飲んでいます。';

describe('文字の正規化', () => {
  it('話者ラベル・空白・句読点・全角半角の違いで差が出ない', () => {
    expect(normalizeForCompare('医師：血圧は１２８／７８です。')).toBe(
      normalizeForCompare('血圧は128/78です'),
    );
  });
});

describe('発話の再現率', () => {
  it('同じ文なら再現率も一致率も1', () => {
    const r = textOverlap(LONG_REF, LONG_REF);
    expect(r.recall).toBe(1);
    expect(r.precision).toBe(1);
  });

  it('半分を落とすと再現率は約半分、落としたぶん一致率は下がらない', () => {
    const half = LONG_REF.slice(0, Math.floor(LONG_REF.length / 2));
    const r = textOverlap(LONG_REF, half);
    expect(r.recall!).toBeGreaterThan(0.4);
    expect(r.recall!).toBeLessThan(0.6);
    expect(r.precision!).toBeGreaterThan(0.95);
  });

  it('話者の並びや文の区切りが変わっても、中身が同じなら大きく崩れない', () => {
    const reordered = LONG_REF.split('。').reverse().join('。');
    expect(textOverlap(LONG_REF, reordered).recall!).toBeGreaterThan(0.9);
  });

  it('基準が短すぎるときは割合を出さない（ぶれるため）', () => {
    expect(textOverlap('はい。', 'はい。').recall).toBeNull();
  });

  it('仮説が空なら再現率0、一致率は出さない', () => {
    const r = textOverlap(LONG_REF, '');
    expect(r.recall).toBe(0);
    expect(r.precision).toBeNull();
  });
});

describe('用語の回収率', () => {
  it('基準にあって仮説に無い語を、落ちた語として返す', () => {
    const r = termOverlap(['高血圧症', 'アムロジピン', '頭痛', 'MRI'], ['高血圧症', '頭痛']);
    expect(r.refCount).toBe(4);
    expect(r.hitCount).toBe(2);
    expect(r.recall).toBe(0.5);
    expect(r.missed.sort()).toEqual(['MRI', 'アムロジピン'].sort());
  });

  it('基準の語が3つ未満なら割合を出さない', () => {
    expect(termOverlap(['頭痛', '発熱'], ['頭痛']).recall).toBeNull();
  });

  it('辞書の語を正規名の集合にする。数える種類だけ・同じ語は1つ', () => {
    const index = {
      findSurfacesInText: () => [
        { surface: '血圧の薬', hits: [{ canonicalName: '降圧薬', category: 'medication' }] },
        { surface: 'ひゃく', hits: [{ canonicalName: '100', category: 'laboratory_value' }] },
        { surface: '降圧剤', hits: [{ canonicalName: '降圧薬', category: 'medication' }] },
      ],
    };
    expect([...extractCanonicalTerms(index, 'x')]).toEqual(['降圧薬']);
  });
});

describe('SOAPの転記率の判定結果', () => {
  it('入っていた事実と落ちた事実を数える', () => {
    const r = parseSoapJudgement({
      facts: [
        { fact: '頭痛3日', inSoap: true },
        { fact: 'アムロジピン継続', inSoap: true },
        { fact: '血圧128/78', inSoap: false },
        { fact: '再診1か月', inSoap: true },
      ],
      unsupported: [{ text: '心音異常なし', reason: '聴診の会話なし' }],
    });
    expect(r?.coverage).toBe(0.75);
    expect(r?.missedFacts).toEqual(['血圧128/78']);
    expect(r?.unsupported).toHaveLength(1);
  });

  it('形が崩れた応答は null（0%として積まない）', () => {
    expect(parseSoapJudgement(null)).toBeNull();
    expect(parseSoapJudgement({ facts: 'x' })).toBeNull();
    expect(parseSoapJudgement({ facts: [{ fact: '', inSoap: true }] })).toBeNull();
    expect(parseSoapJudgement({ facts: [{ fact: 'a' }] })).toBeNull();
  });

  it('事実が3つ未満の診察は割合を出さない', () => {
    const r = parseSoapJudgement({ facts: [{ fact: '変わりなし', inSoap: true }] });
    expect(r?.coverage).toBeNull();
    expect(r?.factCount).toBe(1);
  });
});

describe('月の集計', () => {
  const row = (over: Partial<MeasurementRow>): MeasurementRow => ({
    refChars: null,
    utteranceRecall: null,
    utterancePrecision: null,
    termRefCount: null,
    termHitCount: null,
    termRawHitCount: null,
    factCount: null,
    factHitCount: null,
    unsupportedCount: null,
    ...over,
  });

  it('割合は診察ごとの平均ではなく合算。長い診察の重みが大きい', () => {
    const a = aggregateMonth([
      row({ refChars: 1000, utteranceRecall: 0.5, utterancePrecision: 0.9 }),
      row({ refChars: 100, utteranceRecall: 1, utterancePrecision: 1 }),
    ]);
    // (0.5*1000 + 1*100) / 1100
    expect(a.utteranceRecall).toBeCloseTo(600 / 1100, 5);
    expect(a.counts.stt).toBe(2);
  });

  it('用語は語数で合算し、補正前後を並べて出す', () => {
    const a = aggregateMonth([
      row({ termRefCount: 10, termHitCount: 8, termRawHitCount: 6 }),
      row({ termRefCount: 10, termHitCount: 9, termRawHitCount: 9 }),
    ]);
    expect(a.termRecall).toBeCloseTo(17 / 20, 5);
    expect(a.termRecallRaw).toBeCloseTo(15 / 20, 5);
  });

  it('SOAPは事実数で合算し、根拠のない記載は1診察あたりで出す', () => {
    const a = aggregateMonth([
      row({ factCount: 10, factHitCount: 8, unsupportedCount: 1 }),
      row({ factCount: 10, factHitCount: 6, unsupportedCount: 0 }),
    ]);
    expect(a.soapCoverage).toBeCloseTo(14 / 20, 5);
    expect(a.unsupportedPerVisit).toBe(0.5);
  });

  it('何も測れていない月は null（0%と書かない）', () => {
    const a = aggregateMonth([row({})]);
    expect(a.measuredVisits).toBe(0);
    expect(a.utteranceRecall).toBeNull();
    expect(a.termRecall).toBeNull();
    expect(a.soapCoverage).toBeNull();
  });
});

describe('月の境界は日本時間', () => {
  it('UTCでは9月末でも、日本時間では10月1日の診察は10月', () => {
    expect(monthKeyJst(new Date('2026-09-30T15:30:00Z'))).toBe('2026-10');
    expect(monthKeyJst(new Date('2026-09-30T14:59:00Z'))).toBe('2026-09');
  });

  it('月の範囲は日本時間の月初から翌月初', () => {
    const r = monthRangeJst('2026-10')!;
    expect(r.from.toISOString()).toBe('2026-09-30T15:00:00.000Z');
    expect(r.to.toISOString()).toBe('2026-10-31T15:00:00.000Z');
    expect(monthRangeJst('2026-13')).toBeNull();
  });
});
