import { isTranscriptionRefusal } from '../src/modules/attachments/attachments.service';

/**
 * 問診票の読み取りをモデルが断ることがある。
 * その断り文は【問診票】として患者のSOAPへ貼られる経路にあるので、
 * 読み取り結果と取り違えてはいけない。
 */
describe('紙の読み取り：断り文を読み取り結果と取り違えない', () => {
  it('断り文は読み取り結果として扱わない', () => {
    expect(
      isTranscriptionRefusal(
        '申し訳ありませんが、その画像の内容を直接テキスト化することはできません。画像の内容についてお手伝いできることがあればお知らせください。',
      ),
    ).toBe(true);
    expect(isTranscriptionRefusal("I'm sorry, but I can't assist with that.")).toBe(true);
  });

  it('本物の読み取り結果は通す', () => {
    const ocr = [
      'ふりがな　まつもと はなこ',
      'お名前　松本 花子',
      '生年月日　昭和33年3月4日',
      '住所　〒856-0831 長崎県大村市東本町12-5',
      '電話番号　0957-52-3344',
      '1. 今日はどうされましたか',
      '・2か月前から朝起きたときに手がこわばる。',
    ].join('\n');
    expect(isTranscriptionRefusal(ocr)).toBe(false);
  });

  it('「できません」を含む患者の記述で誤判定しない', () => {
    const ocr = [
      'ふりがな　やまだ たろう',
      'お名前　山田 太郎',
      '1. 今日はどうされましたか',
      '・膝が痛くて階段を上ることができません。正座もできません。',
      '2. これまでにかかった病気',
      '・高血圧、脂質異常症、2015年 虫垂炎の手術',
      '3. 現在飲んでいるお薬',
      '・アムロジピン5mg 朝1錠',
    ].join('\n');
    expect(isTranscriptionRefusal(ocr)).toBe(false);
  });
});
