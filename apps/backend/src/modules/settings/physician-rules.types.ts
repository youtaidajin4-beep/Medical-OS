import {
  DEFAULT_MEDICAL_GLOSSARY,
  MedicalGlossary,
  MedicalGlossaryReplacement,
} from '../../providers/ai/medical-glossary.types';

export type ReferralRule = {
  trigger: string;
  mustInclude: string[];
};

export type PhysicianRules = {
  referralRules: ReferralRule[];
  fixedPhrases: {
    closing?: string;
    greeting?: string;
  };
  medicalGlossary?: MedicalGlossary;
};

export type { MedicalGlossary, MedicalGlossaryReplacement };

export const DEFAULT_PHYSICIAN_RULES: PhysicianRules = {
  referralRules: [
    {
      trigger: '脳梗塞疑い',
      mustInclude: ['紹介理由', '依頼事項', '経過'],
    },
  ],
  fixedPhrases: {
    closing: 'ご高診のほどよろしくお願い申し上げます。',
    greeting: 'いつも大変お世話になっております。御多忙中誠に恐縮ですが、ご高診・ご加療を宜しくお願いいたします。',
  },
  medicalGlossary: DEFAULT_MEDICAL_GLOSSARY,
};

function parseMedicalGlossary(raw: unknown): MedicalGlossary | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const data = raw as Partial<MedicalGlossary>;
  return {
    drugNames: Array.isArray(data.drugNames)
      ? data.drugNames.filter((v): v is string => typeof v === 'string')
      : [],
    diagnoses: Array.isArray(data.diagnoses)
      ? data.diagnoses.filter((v): v is string => typeof v === 'string')
      : [],
    customReplacements: Array.isArray(data.customReplacements)
      ? data.customReplacements.filter(
          (r): r is MedicalGlossaryReplacement =>
            !!r &&
            typeof r === 'object' &&
            typeof (r as MedicalGlossaryReplacement).wrong === 'string' &&
            typeof (r as MedicalGlossaryReplacement).correct === 'string',
        )
      : [],
  };
}

export function parsePhysicianRules(raw: unknown): PhysicianRules {
  if (!raw || typeof raw !== 'object') return DEFAULT_PHYSICIAN_RULES;
  const data = raw as Partial<PhysicianRules>;
  const medicalGlossary = parseMedicalGlossary(data.medicalGlossary);
  return {
    referralRules: Array.isArray(data.referralRules) ? data.referralRules : DEFAULT_PHYSICIAN_RULES.referralRules,
    fixedPhrases: {
      ...DEFAULT_PHYSICIAN_RULES.fixedPhrases,
      ...(data.fixedPhrases ?? {}),
    },
    ...(medicalGlossary ? { medicalGlossary } : {}),
  };
}

export function rulesToPromptSection(rules: PhysicianRules): string {
  const lines: string[] = [];
  if (rules.fixedPhrases.greeting) {
    lines.push(`挨拶文の例: ${rules.fixedPhrases.greeting}`);
  }
  if (rules.fixedPhrases.closing) {
    lines.push(`結びの定型文: ${rules.fixedPhrases.closing}`);
  }
  for (const rule of rules.referralRules) {
    lines.push(
      `「${rule.trigger}」が含まれる場合は必ず次を記載: ${rule.mustInclude.join('、')}`,
    );
  }
  return lines.length ? `\n\n医師独自ルール:\n${lines.join('\n')}` : '';
}
