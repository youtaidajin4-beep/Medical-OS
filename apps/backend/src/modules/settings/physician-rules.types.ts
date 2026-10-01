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
    /** 診療情報提供書【検査結果】の固定文。院ごとに違う */
    referralExamResults?: string;
    /** 診療情報提供書【治療経過】の固定文（挨拶）。院ごとに違う */
    referralClinicalCourse?: string;
    /** 診療情報提供書【紹介目的】の既定文（先生が何も言わなかったとき） */
    referralPurpose?: string;
  };
  medicalGlossary?: MedicalGlossary;
  /**
   * 話し言葉を先生の書き方へ言い換える表（「いつもの薬を出す」→「定時薬を継続する」）。
   * SOAP の A/P にだけ当たる。既定は soap-phrasing.ts の DEFAULT_PHRASE_REWRITES
   */
  phraseRewrites?: Array<{ from: string; to: string }>;
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
    greeting:
      'いつも大変お世話になっております。御多忙中誠に恐縮ですが、ご高診・ご加療を宜しくお願いいたします。',
    // 紙の様式に印字されている文（くしま内科の値）
    referralExamResults: '別紙を同封しております。',
    referralClinicalCourse:
      'いつも大変お世話になっております。\n御多忙中誠に恐縮ですが、ご高診・ご加療を宜しくお願いいたします。',
    referralPurpose: '上記疾患につきまして、ご高診・ご加療のほどよろしくお願い申し上げます。',
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
    phraseRewrites: Array.isArray(data.phraseRewrites)
      ? data.phraseRewrites.filter(
          (r): r is { from: string; to: string } =>
            !!r && typeof r === 'object' && typeof r.from === 'string' && typeof r.to === 'string',
        )
      : undefined,
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
