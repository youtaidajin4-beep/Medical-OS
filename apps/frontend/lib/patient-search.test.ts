import { filterPatients, normalizeForSearch } from './patient-search';

const patients = [
  { name: '木下 千代子', nameKana: 'キノシタ チヨコ', code: 'P-061', phone: '0957-51-1256' },
  { name: '山口 榮子', nameKana: 'ヤマグチ エイコ', code: 'P-062', phone: null },
  { name: '山口 スヱ子', nameKana: null, code: 'P-070', phone: '090-1234-5678' },
  { name: 'Smith John', nameKana: null, code: 'P-100', phone: null },
];

describe('normalizeForSearch', () => {
  it('ひらがな・カタカナ・全角半角・空白の違いをなくす', () => {
    expect(normalizeForSearch('ヤマダ　タロウ')).toBe(normalizeForSearch('やまだ たろう'));
    expect(normalizeForSearch('Ｐ－０６１')).toBe(normalizeForSearch('p-061'));
  });
});

describe('filterPatients', () => {
  it('検索語が空なら全員を返す', () => {
    expect(filterPatients(patients, '  ')).toHaveLength(4);
  });

  it('名前の一部で探せる', () => {
    expect(filterPatients(patients, '山口').map((p) => p.code)).toEqual(['P-062', 'P-070']);
  });

  it('ひらがなで入れても、カタカナのフリガナに当たる', () => {
    expect(filterPatients(patients, 'きのした').map((p) => p.code)).toEqual(['P-061']);
  });

  it('カルテ番号は、数字だけでも当たる', () => {
    expect(filterPatients(patients, '061').map((p) => p.code)).toEqual(['P-061']);
    expect(filterPatients(patients, 'p-070').map((p) => p.code)).toEqual(['P-070']);
  });

  it('電話番号の一部でも当たる（ハイフンの有無を問わない）', () => {
    expect(filterPatients(patients, '09012345678').map((p) => p.code)).toEqual(['P-070']);
    expect(filterPatients(patients, '51-1256').map((p) => p.code)).toEqual(['P-061']);
  });

  it('空白で区切った語は、すべて当たったものだけ残す', () => {
    expect(filterPatients(patients, '山口 榮').map((p) => p.code)).toEqual(['P-062']);
    expect(filterPatients(patients, '山口 木下')).toEqual([]);
  });

  it('英字は大文字小文字を区別しない', () => {
    expect(filterPatients(patients, 'smith').map((p) => p.code)).toEqual(['P-100']);
  });
});
