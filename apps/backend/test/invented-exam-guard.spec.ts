import { rejectInventedExams } from '../src/modules/medical-knowledge/invented-exam-guard';
import { KnowledgeIndex } from '../src/modules/medical-knowledge/knowledge-index';
import { loadInternalMedicineKnowledgePack } from '../src/modules/medical-knowledge/data/load-knowledge-pack';

/**
 * 実測した事故（2026-09-21）。聞き取れなかった「ほら強烈で」（実際は「洞調律で」）を
 * 校正が「ホルター心電図で」に置き換えた。していない検査がカルテに載る。
 * プロンプトで名指しに禁止しても4回とも同じ置換をしたので、機械的に止める。
 */
describe('していない検査を書き足させない', () => {
  const index = KnowledgeIndex.fromSeed(loadInternalMedicineKnowledgePack());

  it('元の行に無い検査名が増えたら、校正を捨てて元の行を残す', () => {
    const before = ['ホラ強烈で、明らかなST変化はありません。'];
    const after = ['ホルター心電図で、明らかなST変化はありません。'];
    const { texts, rejected } = rejectInventedExams(before, after, index);
    expect(texts[0]).toBe(before[0]);
    expect(rejected).toHaveLength(1);
    expect(rejected[0]?.term).toBe('ホルター心電図');
  });

  it('聞き違いを直した範囲の検査名は通す', () => {
    const before = ['循環器へ紹介して運動負荷診伝図と心エコーを受けてもらいましょう。'];
    const after = ['循環器へ紹介して運動負荷心電図と心エコーを受けてもらいましょう。'];
    const { texts, rejected } = rejectInventedExams(before, after, index);
    expect(texts[0]).toBe(after[0]);
    expect(rejected).toHaveLength(0);
  });

  it('病名の直しは止めない（ここを止めると校正の意味が無くなる）', () => {
    const before = ['労作時の共通なので、強心症の可能性があります。'];
    const after = ['労作時の胸痛なので、狭心症の可能性があります。'];
    const { texts, rejected } = rejectInventedExams(before, after, index);
    expect(texts[0]).toBe(after[0]);
    expect(rejected).toHaveLength(0);
  });

  it('薬剤名の直しは止めない（用量は別の関門で確認する）', () => {
    const before = ['無効団員を出しておきます。'];
    const after = ['ムコダインを出しておきます。'];
    const { texts } = rejectInventedExams(before, after, index);
    expect(texts[0]).toBe(after[0]);
  });

  it('直していない行はそのまま', () => {
    const before = ['心電図を撮りましょう。', '血圧は152の88です。'];
    const { texts, rejected } = rejectInventedExams(before, [...before], index);
    expect(texts).toEqual(before);
    expect(rejected).toHaveLength(0);
  });
});
