import { mineTermEdits } from '../src/modules/medical-knowledge/term-edit-miner';

describe('先生の直しから、語の直しを拾う', () => {
  it('崩れた薬名を辞書の語に直したものを拾う', () => {
    const r = mineTermEdits('お薬はジャリアンスを追加する。', 'お薬はジャディアンスを追加する。');
    expect(r).toEqual([{ wrong: 'ジャリアンス', correct: 'ジャディアンス', category: 'medication' }]);
  });
  it('文章の書き直しは語の直しとして拾わない', () => {
    expect(
      mineTermEdits('血圧が高い。', '血圧が高く、家庭血圧も朝は130台で、ふらつきはなく、薬は継続の方針とした。'),
    ).toEqual([]);
  });
  it('辞書に無い語への直しは拾わない', () => {
    expect(mineTermEdits('山田さんが来院。', '山本さんが来院。')).toEqual([]);
  });
  it('変更が無ければ空', () => {
    expect(mineTermEdits('同じ', '同じ')).toEqual([]);
  });
});
