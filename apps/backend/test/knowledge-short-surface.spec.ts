import { isAmbiguousShortSurface, KnowledgeIndex } from '../src/modules/medical-knowledge/knowledge-index';

describe('短い話し言葉の別名（普通の日本語に当たりすぎる）', () => {
  const idx = KnowledgeIndex.fromSeed();

  it('「ない」「どう」「もの」「さん」「える」「おー」を、医療の語として拾わない', () => {
    const text = 'お薬は変わりないですか。どうですか。この薬のものです。田中さん、おーきいですね。えるだけ。昨日来たんです。';
    const found = idx.findSurfacesInText(text).map((s) => s.surface);
    for (const bad of ['ない', 'どう', 'もの', 'さん', 'える', 'おー', 'たん']) {
      expect(found).not.toContain(bad);
    }
  });

  it('医療の語として使う少数は残す（下痢・麻痺・咳）', () => {
    const found = idx.findSurfacesInText('げりもあります。まひはありません。せきも少し。').map((s) => s.surface);
    expect(found).toEqual(expect.arrayContaining(['げり', 'まひ', 'せき']));
  });

  it('漢字・長い語は、これまでどおり拾う', () => {
    const found = idx.findSurfacesInText('高血圧と浮腫、採血をします。').map((s) => s.surface);
    expect(found).toEqual(expect.arrayContaining(['高血圧', '浮腫', '採血']));
  });

  it('先生が登録した短い語は、そのまま効く', () => {
    const own = KnowledgeIndex.fromSeed();
    own.addPhysicianSpoken('いつもの', '定時薬を継続');
    const found = own.findSurfacesInText('いつものでお願いします').map((s) => s.surface);
    expect(found).toContain('いつもの');
    // 3文字以上なので元から対象外だが、2文字の登録語も効くこと
    own.addPhysicianSpoken('いつ', '定時');
    expect(own.findSurfacesInText('いつ').map((s) => s.surface)).toContain('いつ');
  });

  it('判定そのもの', () => {
    const std = [{ layer: 'specialty' }] as never[];
    const own = [{ layer: 'physician' }] as never[];
    expect(isAmbiguousShortSurface('ない', std)).toBe(true);
    expect(isAmbiguousShortSurface('ない', own)).toBe(false);
    expect(isAmbiguousShortSurface('たん', std)).toBe(true); // 「来たんです」の中に当たる
    expect(isAmbiguousShortSurface('げり', std)).toBe(false);
    expect(isAmbiguousShortSurface('高血圧', std)).toBe(false);
    expect(isAmbiguousShortSurface('アムロジピン', std)).toBe(false);
  });
});
