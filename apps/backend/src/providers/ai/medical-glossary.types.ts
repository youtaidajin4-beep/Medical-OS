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
  ],
  customReplacements: [],
};
