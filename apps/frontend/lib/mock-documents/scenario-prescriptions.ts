import type { PrescriptionLine } from './types';

const PRESCRIBED = '2026/01/17(土)';

const HYPERTENSION_RX: PrescriptionLine[] = [
  { index: 1, name: 'カルベジロール錠【２．５ｍｇ】(アーチスト)', dosePerTake: '1 錠', dailyDose: '1回 1錠 (1日 1錠)', days: '7 日分', frequency: '分1 夕食後', prescribedDate: PRESCRIBED },
  { index: 2, name: 'ランソプラゾールOD錠【１５ｍｇ】(タケプロン)', dosePerTake: '1 錠', dailyDose: '1回 1錠 (1日 1錠)', days: '7 日分', frequency: '分1 夕食後', prescribedDate: PRESCRIBED },
  { index: 3, name: 'ブロチゾラム錠０．２５ｍｇ(レンドルミン)', dosePerTake: '1 錠', dailyDose: '1回 1錠 (1日 1錠)', days: '7 日分', frequency: '分1 ねる前', prescribedDate: PRESCRIBED },
  { index: 4, name: 'テラムロ配合錠AP(ミカムロ)', dosePerTake: '1 錠', dailyDose: '1回 1錠 (1日 1錠)', days: '7 日分', frequency: '分1 夕食後', prescribedDate: PRESCRIBED },
  { index: 5, name: 'マグミット３３０ｍｇ錠', dosePerTake: '3 錠', dailyDose: '1回 1錠 (1日 3錠)', days: '7 日分', frequency: '分3 朝昼夕食後', note: '排便状況に応じて、適宜調整可', prescribedDate: PRESCRIBED },
  { index: 6, name: 'アトルバスタチンOD錠【５ｍｇ】(リピトール)', dosePerTake: '1 錠', dailyDose: '1回 1錠 (1日 1錠)', days: '7 日分', frequency: '分1 朝食後', prescribedDate: PRESCRIBED },
  { index: 7, name: 'フェブキソスタット錠２０ｍｇ(フェブリク)', dosePerTake: '0.5 錠', dailyDose: '1回 0.5錠 (1日 0.5錠)', days: '7 日分', frequency: '分1 朝食後', prescribedDate: PRESCRIBED },
  { index: 8, name: 'リクシアナ【OD錠３０ｍｇ】', dosePerTake: '1 錠', dailyDose: '1回 1錠 (1日 1錠)', days: '7 日分', frequency: '分1 朝食後', prescribedDate: PRESCRIBED },
];

const BRONCHITIS_RX: PrescriptionLine[] = [
  { index: 1, name: 'ムコダイン錠２５０ｍｇ', dosePerTake: '2 錠', dailyDose: '1回 2錠 (1日 6錠)', days: '5 日分', frequency: '分3 毎食後', prescribedDate: PRESCRIBED },
  { index: 2, name: 'アセトアミノフェン錠２００ｍｇ', dosePerTake: '1 錠', dailyDose: '1回 1錠 (1日 3錠)', days: '3 日分', frequency: '分3 発熱時', prescribedDate: PRESCRIBED },
  { index: 3, name: 'ムコソルバンシロップ０．０５％', dosePerTake: '10 ml', dailyDose: '1回 10ml (1日 30ml)', days: '5 日分', frequency: '分3 毎食後', prescribedDate: PRESCRIBED },
];

const HEADACHE_RX: PrescriptionLine[] = [
  { index: 1, name: 'ロキソニン錠６０ｍｇ', dosePerTake: '1 錠', dailyDose: '1回 1錠 (1日 2錠)', days: '5 日分', frequency: '分2 疼痛時', note: '食後服用', prescribedDate: PRESCRIBED },
  { index: 2, name: 'ミドリン配合錠', dosePerTake: '1 錠', dailyDose: '1回 1錠 (1日 2錠)', days: '5 日分', frequency: '分2 頭痛時', prescribedDate: PRESCRIBED },
];

export const SCENARIO_PRESCRIPTIONS: Record<string, PrescriptionLine[]> = {
  'P-001': BRONCHITIS_RX,
  'P-002': HYPERTENSION_RX,
  'P-003': HEADACHE_RX,
  'ANON-001': HEADACHE_RX,
};

export function getPrescriptionsForCase(caseCode: string): PrescriptionLine[] {
  return SCENARIO_PRESCRIPTIONS[caseCode] ?? HYPERTENSION_RX;
}
