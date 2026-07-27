import { MedicalGlossary } from './medical-glossary.types';

export type HomophoneRule = {
  wrong: string;
  correct: string;
  contextKeywords?: string[];
};

export type CorrectionResult = {
  text: string;
  replacements: Array<{ wrong: string; correct: string }>;
};

const DEFAULT_HOMOPHONE_RULES: HomophoneRule[] = [
  {
    wrong: '期間支援',
    correct: '気管支炎',
    contextKeywords: ['咳', 'wheeze', '息苦', 'ラ音', '痰', '呼吸'],
  },
  { wrong: '無効団員', correct: 'ムコダイン' },
  { wrong: '無効だいん', correct: 'ムコダイン' },
  { wrong: '調子んでは', correct: '聴診では' },
  { wrong: '調子では', correct: '聴診では' },
  { wrong: '最新しましょう', correct: '再診しましょう' },
  {
    wrong: '最新',
    correct: '再診',
    contextKeywords: ['日後', '再来', '次回', '診', '後に'],
  },
];

function hasContext(text: string, keywords?: string[]): boolean {
  if (!keywords?.length) return true;
  return keywords.some((kw) => text.includes(kw));
}

function applyReplacements(
  text: string,
  rules: HomophoneRule[],
): CorrectionResult {
  const replacements: Array<{ wrong: string; correct: string }> = [];
  let result = text;

  for (const rule of rules) {
    if (!result.includes(rule.wrong)) continue;
    if (!hasContext(result, rule.contextKeywords)) continue;
    result = result.split(rule.wrong).join(rule.correct);
    replacements.push({ wrong: rule.wrong, correct: rule.correct });
  }

  return { text: result, replacements };
}

export function correctMedicalTerms(
  text: string,
  glossary?: MedicalGlossary,
): CorrectionResult {
  const customRules: HomophoneRule[] = (glossary?.customReplacements ?? []).map(
    (r) => ({ wrong: r.wrong, correct: r.correct }),
  );
  const rules = [...DEFAULT_HOMOPHONE_RULES, ...customRules];
  return applyReplacements(text, rules);
}
