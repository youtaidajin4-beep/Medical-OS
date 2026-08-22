export type MedicalGlossaryReplacement = {
  wrong: string;
  correct: string;
};

export type MedicalGlossary = {
  drugNames: string[];
  diagnoses: string[];
  customReplacements: MedicalGlossaryReplacement[];
};

import { knowledgePackGlossaryDefaults } from '../../modules/medical-knowledge/data/load-knowledge-pack';

const pack = knowledgePackGlossaryDefaults();

/** Whisper / LLM glossary defaults — driven by 内科ナレッジ v1 pack. */
export const DEFAULT_MEDICAL_GLOSSARY: MedicalGlossary = {
  drugNames: unique([
    ...pack.drugNames.slice(0, 80),
    'ムコソルバン',
    'エンレスト',
    'トラネキサム酸',
    'ベタヒスチン',
    'プレドニン',
    'ツムラ大建中湯',
  ]),
  diagnoses: unique([
    ...pack.diagnoses.slice(0, 80),
    '気管支炎',
    'うつ病',
    '不眠症',
    '副鼻腔炎',
  ]),
  customReplacements: [
    { wrong: '無効団員', correct: 'ムコダイン' },
    { wrong: '調子んでは', correct: '聴診では' },
    { wrong: '最新しましょう', correct: '再診しましょう' },
    { wrong: '期間支援', correct: '気管支炎' },
  ],
};

function unique(terms: string[]): string[] {
  return [...new Set(terms.map((t) => t.trim()).filter(Boolean))];
}

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
