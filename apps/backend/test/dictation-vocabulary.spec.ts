import { glossaryToVocabularyPrompt } from '../src/modules/chat/dictation-vocabulary';

/**
 * 医師の口述は、出てくる語を先に渡すかどうかで結果が変わる。
 * 実測（2026-09-21・同じ音声）:
 *   渡さない → 「症状名は高血圧症と乳糖尿病、老削皮の共通の疑い…アムロビピンドミリオ一日会」
 *   渡す     → 「傷病名は高血圧症と2型糖尿病、あと労作時の胸痛の疑い…アムロジピン5mg 1日1回朝食後」
 */
describe('口述に渡す語彙ヒント', () => {
  it('クリニックの薬剤名・病名を並べる', () => {
    const prompt = glossaryToVocabularyPrompt({
      drugNames: ['アムロジピン', 'メトホルミン'],
      diagnoses: ['狭心症'],
      customReplacements: [{ wrong: '胸心症', correct: '狭心症' }],
    });
    expect(prompt).toContain('アムロジピン');
    expect(prompt).toContain('メトホルミン');
    expect(prompt).toContain('狭心症');
  });

  it('語彙が空でも、書類の言い回しだけは渡す', () => {
    const prompt = glossaryToVocabularyPrompt(undefined);
    expect(prompt).toContain('診療情報提供書');
    expect(prompt).toContain('朝食後');
  });

  it('同じ語を二度並べない', () => {
    const prompt = glossaryToVocabularyPrompt({
      drugNames: ['アムロジピン', 'アムロジピン'],
      diagnoses: [],
      customReplacements: [],
    });
    expect(prompt.match(/アムロジピン/g)).toHaveLength(1);
  });

  it('長くなりすぎない（長いprompt は効きが鈍る）', () => {
    const many = Array.from({ length: 300 }, (_, i) => `薬剤${i}`);
    const prompt = glossaryToVocabularyPrompt({
      drugNames: many,
      diagnoses: [],
      customReplacements: [],
    });
    expect(prompt.split('、').length).toBeLessThanOrEqual(60);
  });
});
