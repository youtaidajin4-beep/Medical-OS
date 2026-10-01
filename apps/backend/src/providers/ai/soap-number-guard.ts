import { WarningSeverity } from '@prisma/client';
import { ClinicalValidationWarning } from './clinical-data-validator';

/**
 * SOAPに出てきた数字が、会話に出てきた数字かを確かめる。
 *
 * 2026-09-26、谷口先生の10名分の報告に「江口さんの再診が1か月から半年になっている」が
 * あった。会話では1か月と言っている。間隔を持つ欄が無く文章に埋もれたまま、
 * 書く側が自然な数字を置いた結果だった。
 *
 * 欄は分けた（followUpInterval）が、それだけでは足りない。SOAPを書くモデルには
 * 文字起こしも渡すようになったので、「それらしい数字」を置く余地はむしろ増えている。
 * 日数・間隔・用量は、医師が口に出していなければ**カルテに書いてはいけない数字**なので、
 * プロンプトの約束ではなく、出てきた後に機械で突き合わせる。
 *
 * 消しはしない。消すと正しい数字まで落ちる上、なぜ消えたかが医師に見えない。
 * 「要確認」に出して、先生の目を1秒そこへ向ける。
 */

/** 突き合わせる数字。カルテの意味が変わるものだけを見る */
const NUMERIC_PATTERNS: Array<{ re: RegExp; label: string }> = [
  { re: /(\d+(?:\.\d+)?)\s*(日分|日間|日)/g, label: '日数' },
  { re: /(\d+(?:\.\d+)?)\s*(週間|週)/g, label: '週' },
  { re: /(\d+(?:\.\d+)?)\s*(ヶ月|か月|カ月|箇月|ヵ月|month)/g, label: '月' },
  { re: /(\d+(?:\.\d+)?)\s*(年)/g, label: '年' },
  { re: /(\d+(?:\.\d+)?)\s*(mg|ｍｇ|ミリグラム|g|錠|包|単位|mL|ml)/gi, label: '用量' },
  { re: /(\d+(?:\.\d+)?)\s*(回\/日|回\/分|回)/g, label: '回数' },
];

/** 漢数字を含めて「会話に出ていたか」を見るための正規化表 */
const KANJI_DIGITS: Record<string, string> = {
  〇: '0', 零: '0', 一: '1', 二: '2', 三: '3', 四: '4',
  五: '5', 六: '6', 七: '7', 八: '8', 九: '9',
};

/**
 * 文字起こしの数字は、半角・全角・漢数字が混ざる。
 * 「一週間」「１週間」「1週間」を同じものとして扱えないと、正しい数字まで要確認になる。
 */
export function normalizeNumbers(text: string): string {
  let out = text.replace(/[０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0));
  // 十・百は単独の桁として出るので、よく出る形だけ先に開く（十→10, 二十→20, 十五→15）
  out = out.replace(/([一二三四五六七八九])?十([一二三四五六七八九])?/g, (_m, tens, ones) => {
    const t = tens ? KANJI_DIGITS[tens as string] : '1';
    const o = ones ? KANJI_DIGITS[ones as string] : '0';
    return `${t}${o}`;
  });
  out = out.replace(/[〇零一二三四五六七八九]/g, (c) => KANJI_DIGITS[c] ?? c);
  return out.replace(/\s/g, '');
}

export type UngroundedNumber = {
  /** SOAPのどの欄か */
  field: 'subjective' | 'objective' | 'assessment' | 'plan';
  /** SOAPに出てきた表記そのもの（例「60日分」） */
  text: string;
  label: string;
};

/**
 * SOAPの数字のうち、文字起こしに見当たらないものを挙げる。
 *
 * 単位違いの言い換え（「1週間」と言われたのを「7日分」と書く）は会話に無い数字として
 * 挙がる。これは意図した挙動で、処方日数の言い換えは先生に確認してもらう価値がある。
 */
export function findUngroundedNumbers(
  soap: { subjective: string; objective: string; assessment: string; plan: string },
  transcript: string,
): UngroundedNumber[] {
  const haystack = normalizeNumbers(transcript);
  const found: UngroundedNumber[] = [];
  const seen = new Set<string>();

  for (const field of ['subjective', 'objective', 'assessment', 'plan'] as const) {
    const value = soap[field];
    if (!value) continue;
    for (const { re, label } of NUMERIC_PATTERNS) {
      // 正規表現は使い回すので、毎回先頭から
      re.lastIndex = 0;
      for (const match of value.matchAll(re)) {
        const [raw, digits] = match;
        const needle = normalizeNumbers(`${digits}`);
        // 数値そのものが文字起こしのどこにも出てこないときだけ挙げる。
        // 単位まで一致を求めると「60日分」と言われて「60日」と書いた場合も挙がる
        if (haystack.includes(needle)) continue;
        const key = `${field}:${raw}`;
        if (seen.has(key)) continue;
        seen.add(key);
        found.push({ field, text: raw.trim(), label });
      }
    }
  }
  return found;
}

const FIELD_LABELS: Record<UngroundedNumber['field'], string> = {
  subjective: 'S',
  objective: 'O',
  assessment: 'A',
  plan: 'P',
};

export function buildUngroundedNumberWarnings(
  items: UngroundedNumber[],
): ClinicalValidationWarning[] {
  if (!items.length) return [];
  const list = items
    .slice(0, 8)
    .map((i) => `${FIELD_LABELS[i.field]}「${i.text}」`)
    .join('、');
  return [
    {
      category: 'number',
      message: `要確認：${list} は診察の会話に出てこない数字です。日数・間隔・用量はご確認ください。`,
      severity: WarningSeverity.WARNING,
    },
  ];
}
