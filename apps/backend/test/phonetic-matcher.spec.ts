import { getDefaultPhoneticMatcher } from '../src/modules/medical-knowledge/phonetic-lexicon';
import { phoneticDistance, phoneticSkeleton } from '../src/modules/medical-knowledge/phonetic-matcher';
import { composeVocabulary, cleanChartTerm } from '../src/modules/medical-knowledge/vocabulary-composer';
import { KnowledgeIndex } from '../src/modules/medical-knowledge/knowledge-index';
import { correctTranscriptWithKnowledge } from '../src/modules/medical-knowledge/transcript-knowledge-corrector';

describe('音の近い語の補正', () => {
  const m = getDefaultPhoneticMatcher();

  it.each([
    ['キスロマックを3日間出します', 'ジスロマックを3日間出します'],
    ['ジャリアンスを追加します', 'ジャディアンスを追加します'],
    ['ミラテックスが効きます', 'ミラペックスが効きます'],
    ['モノプラザンを出します', 'ボノプラザンを出します'],
    ['アムロヒピンを継続', 'アムロジピンを継続'],
  ])('崩れた薬名を直す: %s', (input, expected) => {
    expect(m.correct(input).text).toBe(expected);
  });

  it.each(['ストレスで眠れません', 'コーヒーを一日三杯', 'ヤマダさんが来ました', 'ロキソニンを飲んでいます', 'インスリンを打っています', 'パソコンを使いすぎ'])(
    '触らない: %s',
    (input) => {
      expect(m.correct(input).text).toBe(input);
    },
  );

  it('少し遠いものは直さず候補に回す', () => {
    const r = m.correct('カミフルは5日間飲んでください');
    expect(r.text).toContain('カミフル');
    expect(r.candidates.map((c) => c.surface)).toContain('タミフル');
  });

  it('距離は長音と小さい母音を無視する', () => {
    expect(phoneticSkeleton('ジャディアンス')).toBe(phoneticSkeleton('ジャデアンス'));
    expect(phoneticDistance('タミフル', 'タミフル')).toBe(0);
  });
});

describe('語彙ヒントの組み立て', () => {
  it('カルテの薬を先に詰め、予算で切る', () => {
    const terms = composeVocabulary(
      { patientMedications: ['エンレスト'], patientDiagnoses: ['心不全'], base: ['アムロジピン', 'エンレスト', 'メトホルミン'] },
      3,
    );
    expect(terms).toEqual(['エンレスト', '心不全', 'アムロジピン']);
  });

  it('カルテの記載から薬名だけ取り出す', () => {
    expect(cleanChartTerm('アムロジピン5mg 1錠')).toBe('アムロジピン');
    expect(cleanChartTerm('ムコダイン（要確認）')).toBe('ムコダイン');
    expect(cleanChartTerm('いつもの薬')).toBeNull();
    expect(cleanChartTerm('咳の薬')).toBeNull();
  });
});

describe('商品名で言われた薬', () => {
  it('正しく認識できているので、確認に積まない', () => {
    const r = correctTranscriptWithKnowledge('ロキソニンを出します', KnowledgeIndex.fromSeed());
    const e = r.entities.find((x) => x.rawValue === 'ロキソニン');
    expect(e?.needsReview).toBe(false);
    expect(r.correctedText).toContain('ロキソニン');
  });
});
