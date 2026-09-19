import {
  dropPatchesForGeneratedTypes,
  resolveGenerateRequest,
  withCareOpinionPair,
} from '../src/modules/chat/chat.service';

/**
 * 「紹介状を作って」と言われたとき、チャットは生成と同時にパッチも返すことがある。
 * パッチは生成のあとに適用されるので、放っておくと丁寧に作った版が毎回上書きされる。
 *
 * 2026-09-19に紹介状で、2026-09-20に主治医意見書で、実際にこれが起きた。
 * 意見書では、生成が「屋外歩行: 介助があればしている」と正しく入れた直後に、
 * パッチが「自立」で塗り替えていた。
 */
describe('チャット：同じ発話で生成した書類をパッチで上書きしない', () => {
  it('生成した種類あてのパッチは落とす', () => {
    const patches = [
      { type: 'care-opinion-2', content: { outdoorWalking: '自立' } },
      { type: 'referral', content: { diagnosis: '高血圧症' } },
    ];
    const remaining = dropPatchesForGeneratedTypes(patches, ['care-opinion-1', 'care-opinion-2']);
    expect(remaining).toEqual([{ type: 'referral', content: { diagnosis: '高血圧症' } }]);
  });

  it('生成していない書類へのパッチはそのまま通す', () => {
    const patches = [{ type: 'referral', content: { remarks: '本人へ手渡し' } }];
    expect(dropPatchesForGeneratedTypes(patches, [])).toEqual(patches);
    expect(dropPatchesForGeneratedTypes(patches, ['certificate'])).toEqual(patches);
  });

  it('パッチが無いときは空', () => {
    expect(dropPatchesForGeneratedTypes(undefined, ['referral'])).toEqual([]);
    expect(dropPatchesForGeneratedTypes([], ['referral'])).toEqual([]);
  });
});

describe('チャット：「作って」はパッチではなく生成に回す', () => {
  it('作ってと言われたのにパッチだけ返ってきたら、その種類を生成する', () => {
    const patches = [{ type: 'care-opinion-1' }, { type: 'care-opinion-2' }];
    expect(resolveGenerateRequest('主治医意見書を作り直して。', undefined, patches)).toEqual([
      'care-opinion-1',
      'care-opinion-2',
    ]);
    expect(resolveGenerateRequest('紹介状を作って。', undefined, [{ type: 'referral' }])).toEqual([
      'referral',
    ]);
  });

  it('欄を直すだけの指示は生成に回さない', () => {
    const patches = [{ type: 'referral' }];
    expect(resolveGenerateRequest('備考に、車で通院できると足して。', undefined, patches)).toBeUndefined();
    expect(resolveGenerateRequest('宛先を市立中央病院に変えて。', undefined, patches)).toBeUndefined();
  });

  it('チャットが既に生成を指示していればそのまま', () => {
    expect(resolveGenerateRequest('全部作って', 'all', [{ type: 'referral' }])).toBe('all');
  });

  it('様式にない書類の種類は無視する', () => {
    expect(
      resolveGenerateRequest('作って', undefined, [{ type: 'unknown-doc' }]),
    ).toBeUndefined();
  });
});

describe('チャット：主治医意見書は①②セットで作る', () => {
  it('片方だけ指定されても両方作る', () => {
    expect(withCareOpinionPair(['care-opinion-1'])).toEqual(['care-opinion-1', 'care-opinion-2']);
    expect(withCareOpinionPair(['care-opinion-2'])).toEqual(['care-opinion-2', 'care-opinion-1']);
  });

  it('意見書が入っていなければ何も足さない', () => {
    expect(withCareOpinionPair(['referral'])).toEqual(['referral']);
  });

  it('両方あるときは増やさない', () => {
    expect(withCareOpinionPair(['care-opinion-1', 'care-opinion-2'])).toEqual([
      'care-opinion-1',
      'care-opinion-2',
    ]);
  });
});
