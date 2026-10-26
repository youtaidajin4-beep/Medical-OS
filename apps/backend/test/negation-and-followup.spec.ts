import { findNegationInversions, negatedPhrases } from '../src/providers/ai/soap-negation-guard';
import { ensureFollowUp } from '../src/providers/ai/soap-followup';
import { KnowledgeIndex } from '../src/modules/medical-knowledge/knowledge-index';
import { correctTranscriptWithKnowledge } from '../src/modules/medical-knowledge/transcript-knowledge-corrector';

const empty = { subjective: '', objective: '', assessment: '', plan: '' };

describe('否定の反転を拾う', () => {
  const transcript = '[娘] 夜はちゃんと寝ています。夜中に起きて歩き回ることもないです。';
  it('否定された出来事を会話から拾う', () => {
    expect(negatedPhrases(transcript)).toContain('歩き回る');
  });
  it('「歩き回ることがある」と書かれたら要確認', () => {
    const hits = findNegationInversions({ ...empty, subjective: '夜中に起きて歩き回ることがある。' }, transcript);
    expect(hits.map((h) => h.phrase)).toContain('歩き回る');
  });
  it('「歩き回ることはない」なら出さない', () => {
    expect(findNegationInversions({ ...empty, subjective: '夜間の徘徊なし。夜中に歩き回ることはない。' }, transcript)).toEqual([]);
  });
  it('会話で実際にあった話なら、反転とは言わない', () => {
    const t = '[娘] 昨日は夜中に歩き回ることがありました。普段は歩き回ることもないです。';
    expect(findNegationInversions({ ...empty, subjective: '昨日は夜中に歩き回ることがあった。' }, t)).toEqual([]);
  });
});

describe('再診の時期を残す', () => {
  it('Pに無ければ末尾に足す', () => {
    expect(ensureFollowUp('お薬は今のまま続ける。', '一か月後')).toBe('お薬は今のまま続ける。\n再診：一か月後');
  });
  it('すでにあれば足さない', () => {
    expect(ensureFollowUp('1か月後に再診。', '一か月後')).toBe('1か月後に再診。');
  });
  it('言われていなければ何もしない', () => {
    expect(ensureFollowUp('継続', '')).toBe('継続');
  });
});

describe('単位は確認に積まない', () => {
  const r = correctTranscriptWithKnowledge('アムロジピン2.5mgを朝に、ドネペジル5ミリを朝に。フロセミドは20mg。', KnowledgeIndex.fromSeed());
  it('「mg」「20mg」は確認が要らない', () => {
    const review = r.entities.filter((e) => e.needsReview).map((e) => e.rawValue);
    expect(review).not.toContain('mg');
    expect(review).not.toContain('20mg');
    expect(review).not.toContain('2.5mg');
  });
  it('「5ミリ」は単位が決まらないので確認する', () => {
    expect(r.entities.some((e) => e.rawValue.includes('5ミリ') && e.needsReview)).toBe(true);
  });
});
