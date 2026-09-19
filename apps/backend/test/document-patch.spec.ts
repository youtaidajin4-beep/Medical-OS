import { mergeDocumentPatch } from '../src/modules/chat/document-patch';

/**
 * チャットからの書き換えは「変えるフィールドだけ」。
 * 以前は1欄を直すために書類の全欄を書き直させていて、遅いうえに
 * 書き直しのついでに他の欄が消えることがあった。
 */
describe('チャットの書類パッチ', () => {
  it('変えた欄だけ重ね、触っていない欄は残る', () => {
    const current = {
      diagnosis: '高血圧症',
      purpose: '精査をお願いします。',
      remarks: '',
      currentPrescription: 'アムロジピン錠5mg',
    };
    const merged = mergeDocumentPatch(current, { remarks: '本人へ手渡し' });
    expect(merged).toEqual({
      diagnosis: '高血圧症',
      purpose: '精査をお願いします。',
      remarks: '本人へ手渡し',
      currentPrescription: 'アムロジピン錠5mg',
    });
  });

  it('入れ子の欄は中まで重ねる（意見書の麻痺など）', () => {
    const current = {
      paralysis: {
        checked: false,
        rightUpper: { checked: false, degree: '' },
        leftUpper: { checked: false, degree: '' },
      },
      risks: ['転倒・骨折'],
    };
    const merged = mergeDocumentPatch(current, {
      paralysis: { checked: true, rightUpper: { checked: true, degree: 'moderate' } },
    }) as typeof current;
    expect(merged.paralysis.rightUpper).toEqual({ checked: true, degree: 'moderate' });
    // 触っていない左上肢は残る
    expect(merged.paralysis.leftUpper).toEqual({ checked: false, degree: '' });
    expect(merged.risks).toEqual(['転倒・骨折']);
  });

  it('配列はまるごと差し替える（チェックを外せないと困る）', () => {
    const merged = mergeDocumentPatch({ risks: ['転倒・骨折', '低栄養'] }, { risks: ['低栄養'] });
    expect(merged.risks).toEqual(['低栄養']);
    expect(mergeDocumentPatch({ risks: ['転倒・骨折'] }, { risks: [] }).risks).toEqual([]);
  });

  it('書類がまだ無ければパッチがそのまま新しい書類になる', () => {
    expect(mergeDocumentPatch(null, { diagnosis: '高血圧症' })).toEqual({ diagnosis: '高血圧症' });
  });

});
