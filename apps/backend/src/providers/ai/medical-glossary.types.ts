export type MedicalGlossaryReplacement = {
  wrong: string;
  correct: string;
};

export type MedicalGlossarySessionHit = {
  rawValue: string;
  normalizedValue: string | null;
  entityType: string;
  needsReview: boolean;
};

export type MedicalGlossary = {
  drugNames: string[];
  diagnoses: string[];
  customReplacements: MedicalGlossaryReplacement[];
  /** This consultation's knowledge hits only — never the full pack. */
  sessionHits?: MedicalGlossarySessionHit[];
};

import { knowledgePackGlossaryDefaults } from '../../modules/medical-knowledge/data/load-knowledge-pack';

const pack = knowledgePackGlossaryDefaults();

/** Whisper / LLM glossary defaults — compact hints from 内科ナレッジ v2 (not full pack dump). */
export const DEFAULT_MEDICAL_GLOSSARY: MedicalGlossary = {
  drugNames: unique([
    ...pack.drugNames.slice(0, 40),
    'ムコダイン',
    'ムコソルバン',
    'エンレスト',
  ]),
  diagnoses: unique([
    ...pack.diagnoses.slice(0, 40),
    '気管支炎',
    '高血圧',
    '糖尿病',
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
