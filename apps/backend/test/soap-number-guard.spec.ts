import { WarningSeverity } from '@prisma/client';
import {
  buildUngroundedNumberWarnings,
  findUngroundedNumbers,
  normalizeNumbers,
} from '../src/providers/ai/soap-number-guard';

const 空のSOAP = { subjective: '', objective: '', assessment: '', plan: '' };

/**
 * 2026-09-26 谷口先生の報告：江口さんの再診が、会話では1か月なのにSOAPでは半年になっていた。
 * 原文をSOAP生成に渡すようにした分、それらしい数字を置く余地はむしろ増えるので、
 * 「言われていない数字」は出た後に機械で突き合わせる。
 */
describe('会話に出てこない数字を拾う', () => {
  const 文字起こし = [
    '医師: じゃあ、お薬は一か月分出しておきますね。',
    '患者: はい。',
    '医師: 次は一か月後に来てください。',
  ].join('\n');

  it('会話では1か月なのにSOAPが半年になっていたら挙げる', () => {
    const found = findUngroundedNumbers(
      { ...空のSOAP, plan: '定時薬を継続する。\n次回再診：6か月後' },
      文字起こし,
    );
    expect(found).toHaveLength(1);
    expect(found[0]).toMatchObject({ field: 'plan', text: '6か月' });
  });

  it('漢数字で言われた数字を算用数字で書いても挙げない', () => {
    const found = findUngroundedNumbers(
      { ...空のSOAP, plan: '定時薬を1か月分継続する。次回再診：1か月後' },
      文字起こし,
    );
    expect(found).toEqual([]);
  });

  it('言われていない用量は挙げる', () => {
    const found = findUngroundedNumbers(
      { ...空のSOAP, plan: 'アムロジピン5mg 1錠' },
      '医師: アムロジピンを続けましょう。',
    );
    expect(found.map((f) => f.text)).toContain('5mg');
  });

  it('数字を一切書いていないSOAPでは何も挙げない', () => {
    expect(findUngroundedNumbers({ ...空のSOAP, plan: '定時薬を継続する。' }, 文字起こし)).toEqual(
      [],
    );
  });

  it('同じ数字が会話のどこかに出ていれば、欄が違っても挙げない', () => {
    const found = findUngroundedNumbers(
      { ...空のSOAP, subjective: '3日前から咳' },
      '患者: 三日くらい前から咳が出ています。',
    );
    expect(found).toEqual([]);
  });

  it('警告は1件にまとめ、先生の確認を促す文言で出す', () => {
    const warnings = buildUngroundedNumberWarnings([
      { field: 'plan', text: '6か月', label: '月' },
      { field: 'plan', text: '60日分', label: '日数' },
    ]);
    expect(warnings).toHaveLength(1);
    const warning = warnings[0]!;
    expect(warning.severity).toBe(WarningSeverity.WARNING);
    expect(warning.message).toContain('6か月');
    expect(warning.message).toContain('60日分');
  });
});

describe('数字の正規化', () => {
  it('全角・漢数字・十の位をそろえる', () => {
    expect(normalizeNumbers('１週間')).toContain('1週間');
    expect(normalizeNumbers('六十日分')).toContain('60日分');
    expect(normalizeNumbers('十五日')).toContain('15日');
    expect(normalizeNumbers('二週間')).toContain('2週間');
  });
});
