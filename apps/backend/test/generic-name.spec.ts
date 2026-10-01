import { withGenericNames, applyGenericNamesToDocument } from '../src/modules/documents/generic-name';

/**
 * 2026-09-28、谷口先生と切り分けを決めた。
 *
 * > 一般名への変換は、SOAPは言われたままの商品名、書類のところで一般名に直す、
 * > という切り分けでよろしいでしょうか。 ➡︎ はい、ひとまずその方針でOKです。
 *
 * プロンプトに「可能なら一般名も併記してよい」と書くだけでは出たり出なかったりするので、
 * 医院の辞書の対応表で機械的に当てる。
 */
describe('書類の薬剤名を一般名で書く', () => {
  it('商品名を「一般名（商品名）」にする', () => {
    expect(withGenericNames('カロナール 500mg 1錠')).toBe(
      'アセトアミノフェン（カロナール） 500mg 1錠',
    );
  });

  it('複数の薬が並んでいても、それぞれ当てる', () => {
    const out = withGenericNames('ロキソニン、タケキャブを継続');
    expect(out).toContain('ロキソプロフェン（ロキソニン）');
    expect(out).toContain('ボノプラザン（タケキャブ）');
  });

  it('すでに一般名が添えてあれば、二重に付けない', () => {
    const once = withGenericNames('アセトアミノフェン（カロナール）');
    expect(once).toBe('アセトアミノフェン（カロナール）');
  });

  it('剤形が続いていても商品名を見つけて当てる', () => {
    expect(withGenericNames('ムコダイン錠')).toBe('カルボシステイン（ムコダイン）錠');
  });

  it('対応表に無い薬はそのまま残す（一般名を勝手に作らない）', () => {
    expect(withGenericNames('院内製剤の軟膏を継続')).toBe('院内製剤の軟膏を継続');
  });

  it('紹介状の【現在の処方】に当たる', () => {
    const out = applyGenericNamesToDocument({
      recipientHospital: '長崎医療センター',
      currentPrescription: 'カロナール 500mg\nロキソニン 60mg',
    });
    expect(out.currentPrescription).toContain('アセトアミノフェン（カロナール）');
    expect(out.currentPrescription).toContain('ロキソプロフェン（ロキソニン）');
    // 薬剤名以外の欄は触らない
    expect(out.recipientHospital).toBe('長崎医療センター');
  });

  it('処方一覧の各行にも当たる', () => {
    const out = applyGenericNamesToDocument({
      items: [{ index: 1, name: 'カロナール', days: '7' }],
    });
    expect((out.items as Array<{ name: string }>)[0]!.name).toContain('アセトアミノフェン');
  });
});
