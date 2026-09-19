/**
 * デモ用の主治医意見書の中身。紙の様式にある選択肢の語をそのまま入れる。
 * 本番の値はバックエンド（care-opinion-template.ts）が作る。
 */
import type { CareOpinion1Data, CareOpinion2Data } from './types';

type CareOpinion1Mock = Partial<CareOpinion1Data>;
type CareOpinion2Mock = Partial<CareOpinion2Data>;

const HYPERTENSION_CO1: CareOpinion1Mock = {
  stability: 'stable',
  adlLevel: '自立',
  dementiaLevel: '自立',
  shortTermMemory: '問題なし',
  decisionCapacity: '自立',
  communicationAbility: '伝えられる',
  peripheralPresence: 'none',
  psychSymptomPresence: 'none',
  opinionCount: 'first',
  consent: 'agree',
};

const HYPERTENSION_CO2: CareOpinion2Mock = {
  dominantHand: 'right',
  height: '158',
  weight: '62',
  weightChange: 'maintain',
  outdoorWalking: '自立',
  wheelchair: '用いていない',
  eating: '自立ないし何とか自分で食べられる',
  nutritionState: '良好',
  risks: ['転倒・骨折'],
  serviceOutlook: 'expected',
  medicalManagement: [],
  infection: { state: 'none', detail: '' },
};

const BRONCHITIS_CO1: CareOpinion1Mock = {
  ...HYPERTENSION_CO1,
  stability: 'unstable',
};

const BRONCHITIS_CO2: CareOpinion2Mock = {
  ...HYPERTENSION_CO2,
  height: '172',
  weight: '68',
  risks: ['易感染症'],
};

export function getCareOpinion1Mock(caseCode: string): CareOpinion1Mock {
  if (caseCode === 'P-001') return BRONCHITIS_CO1;
  return HYPERTENSION_CO1;
}

export function getCareOpinion2Mock(caseCode: string): CareOpinion2Mock {
  if (caseCode === 'P-001') return BRONCHITIS_CO2;
  return HYPERTENSION_CO2;
}
