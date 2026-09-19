import {
  normalizeBirthDate,
  normalizePostalCode,
  normalizeQuestionnaireProfile,
  patientFieldsToFill,
  toKatakana,
} from '../src/modules/attachments/questionnaire-profile';

/**
 * 紹介状の患者欄（氏名・カナ・住所・電話・生年月日・職業）は、問診票が唯一の転記元。
 * ここを推測で埋めると、別人の住所が印刷されたまま病院へ出てしまう。
 */
describe('問診票からの患者属性の取り込み', () => {
  it('和暦の生年月日を西暦へ直す', () => {
    expect(normalizeBirthDate('昭和33年3月4日')).toBe('1958-03-04');
    expect(normalizeBirthDate('平成2年12月31日')).toBe('1990-12-31');
    expect(normalizeBirthDate('令和1年5月1日')).toBe('2019-05-01');
    expect(normalizeBirthDate('1958/3/4')).toBe('1958-03-04');
    expect(normalizeBirthDate('２００７年１月１日')).toBe('2007-01-01');
    expect(normalizeBirthDate('要確認')).toBeUndefined();
  });

  it('郵便番号の表記ゆれを 123-4567 に揃える', () => {
    expect(normalizePostalCode('〒8560832')).toBe('856-0832');
    expect(normalizePostalCode('856-0832')).toBe('856-0832');
    expect(normalizePostalCode('856')).toBeUndefined();
  });

  it('ふりがなはカタカナに直す', () => {
    expect(toKatakana('おおつ ゆうた')).toBe('オオツ ユウタ');
  });

  it('住所に混ざった郵便番号を切り出す', () => {
    const profile = normalizeQuestionnaireProfile({
      name: 'テスト 次郎',
      nameKana: 'てすと じろう',
      sex: '男性',
      dateOfBirth: '平成19年1月1日',
      address: '〒856-0832 長崎県大村市本町436-16',
      phone: '0957-51-1256',
      occupation: '会社員',
    });
    expect(profile).toEqual({
      name: 'テスト 次郎',
      nameKana: 'テスト ジロウ',
      sex: 'M',
      dateOfBirth: '2007-01-01',
      postalCode: '856-0832',
      address: '長崎県大村市本町436-16',
      phone: '0957-51-1256',
      occupation: '会社員',
    });
  });

  it('読めなかった項目はキーごと落とす（空文字で既存の値を潰さない）', () => {
    const profile = normalizeQuestionnaireProfile({
      name: 'テスト 次郎',
      nameKana: null,
      sex: '要確認',
      dateOfBirth: '',
      address: '不明',
      phone: null,
      occupation: '記載なし',
    });
    expect(profile).toEqual({ name: 'テスト 次郎' });
  });

  it('患者情報に既に入っている値は上書きしない（受付が直した値を戻さない）', () => {
    const fill = patientFieldsToFill(
      {
        nameKana: 'テスト ジロウ',
        postalCode: '856-0832',
        address: '長崎県大村市本町436-16',
        phone: '0957-51-1256',
        occupation: '会社員',
        dateOfBirth: '2007-01-01',
        sex: 'M',
      },
      {
        nameKana: null,
        postalCode: '',
        address: '長崎県大村市（受付が修正した住所）',
        phone: '090-0000-0000',
        occupation: null,
        dateOfBirth: new Date('2007-01-01'),
        sex: 'M',
      },
    );
    expect(fill).toEqual({
      nameKana: 'テスト ジロウ',
      postalCode: '856-0832',
      occupation: '会社員',
    });
  });
});
