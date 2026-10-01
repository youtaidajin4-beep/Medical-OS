import { applyRoutineFloor } from '../src/providers/ai/soap-floor-gate';
import { SOAP_TEMPLATE_FLOORS } from '../src/providers/ai/soap-templates';

const floor = SOAP_TEMPLATE_FLOORS.ROUTINE;
const 空 = { subjective: '', objective: '', assessment: '', plan: '' };

/**
 * 2026-10-01、9/30の実診療3症例で実測した結果の固定。
 *
 * 床をプロンプトに入れて「差分があれば上書きして」と頼むと、モデルは材料の足りない欄を
 * 必ず床で埋める。食生活の相談だけで聴診をしていない症例で、O に
 * 「脈拍異常なし。貧血・黄疸なし。心音・呼吸音異常なし。」が出た。
 * 転記が乏しいのと、していない所見が載るのは同じ原因だった。
 */
describe('定型床は、空いた欄に、会話が裏づけるときだけ入れる', () => {
  const 聴診した会話 = ['医師: 背中失礼します。深呼吸してください。', '患者: はい。'].join('\n');
  const 聴診していない会話 = [
    '医師: 麺類と揚げ物が同じ日に重なっていますね。',
    '患者: そうですね。',
    '医師: どっちか一食だけにして、分散させましょう。',
  ].join('\n');

  it('聴診していない診察に「脈拍異常なし」を入れない', () => {
    const { soap, withheld } = applyRoutineFloor(空, floor, 聴診していない会話);
    expect(soap.objective).toBe('');
    expect(withheld).toContain('objective');
  });

  it('モデルが勝手に書いた床の身体所見も、聴診していなければ取り除く', () => {
    const { soap, removed } = applyRoutineFloor(
      { ...空, objective: floor.objective },
      floor,
      聴診していない会話,
    );
    expect(soap.objective).toBe('');
    expect(removed).toHaveLength(1);
  });

  it('聴診した会話があれば、空のOに床を入れる', () => {
    const { soap, filled } = applyRoutineFloor(空, floor, 聴診した会話);
    expect(soap.objective).toBe(floor.objective);
    expect(filled).toContain('objective');
  });

  it('会話から拾った所見は、床で上書きしない', () => {
    const { soap } = applyRoutineFloor(
      { ...空, objective: '右下肺に wheeze' },
      floor,
      聴診した会話,
    );
    expect(soap.objective).toBe('右下肺に wheeze');
  });

  it('同じ行に会話の事実が混ざっていれば、床の文があっても残す', () => {
    const { soap } = applyRoutineFloor(
      { ...空, objective: '脈拍異常なし。右下肺に wheeze' },
      floor,
      聴診していない会話,
    );
    expect(soap.objective).toContain('wheeze');
  });

  it('薬を続ける話が出ていなければ、Pに「定時薬を継続する」を入れない', () => {
    const { soap, withheld } = applyRoutineFloor(空, floor, 聴診していない会話);
    expect(soap.plan).toBe('');
    expect(withheld).toContain('plan');
  });

  it('著変なしの再診では、4欄とも床が入って先生の手打ちが要らない', () => {
    const 変わりない再診 = [
      '医師: 変わりないですか。',
      '患者: はい。',
      '医師: 背中失礼します。',
      '医師: では、お薬を1か月分継続しておきますね。',
    ].join('\n');
    const { soap } = applyRoutineFloor(空, floor, 変わりない再診);
    expect(soap).toEqual(floor);
  });
});
