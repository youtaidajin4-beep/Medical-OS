export type MedicalGlossaryReplacement = {
  wrong: string;
  correct: string;
};

export type MedicalGlossary = {
  drugNames: string[];
  diagnoses: string[];
  customReplacements: MedicalGlossaryReplacement[];
};

export const DEFAULT_MEDICAL_GLOSSARY: MedicalGlossary = {
  drugNames: [
    'ムコダイン',
    'ムコソルバン',
    'アムロジピン',
    'メトホルミン',
    'ロスバスタチン',
    'ラベプラゾール',
    'アセトアミノフェン',
    'ロキソプロフェン',
    'アンブロキソール',
    'カルベジロール',
    'エンレスト',
    'フォシーガ',
    'ランソプラゾール',
    'トラネキサム酸',
    'ベタヒスチン',
    'モンテルカスト',
    'クラリスロマイシン',
    'レボセチリジン',
    'プレドニン',
    'ツムラ大建中湯',
  ],
  diagnoses: [
    '気管支炎',
    '高血圧症',
    '2型糖尿病',
    '胃食道逆流症',
    '脂質異常症',
    'うつ病',
    '不眠症',
    '慢性腎臓病',
    'インフルエンザ',
    '副鼻腔炎',
  ],
  customReplacements: [
    { wrong: '無効団員', correct: 'ムコダイン' },
    { wrong: '調子んでは', correct: '聴診では' },
    { wrong: '最新しましょう', correct: '再診しましょう' },
  ],
};

export function mergeMedicalGlossary(
  existing: MedicalGlossary | undefined,
  defaults: MedicalGlossary = DEFAULT_MEDICAL_GLOSSARY,
): MedicalGlossary {
  const drugNames = [...new Set([...defaults.drugNames, ...(existing?.drugNames ?? [])])];
  const diagnoses = [...new Set([...defaults.diagnoses, ...(existing?.diagnoses ?? [])])];
  const replacementMap = new Map<string, string>();
  for (const r of defaults.customReplacements) {
    replacementMap.set(r.wrong, r.correct);
  }
  for (const r of existing?.customReplacements ?? []) {
    replacementMap.set(r.wrong, r.correct);
  }
  return {
    drugNames,
    diagnoses,
    customReplacements: Array.from(replacementMap.entries()).map(([wrong, correct]) => ({
      wrong,
      correct,
    })),
  };
}
