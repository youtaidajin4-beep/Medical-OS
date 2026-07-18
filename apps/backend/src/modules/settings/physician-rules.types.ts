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
};

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
};

export function parsePhysicianRules(raw: unknown): PhysicianRules {
  if (!raw || typeof raw !== 'object') return DEFAULT_PHYSICIAN_RULES;
  const data = raw as Partial<PhysicianRules>;
  return {
    referralRules: Array.isArray(data.referralRules) ? data.referralRules : DEFAULT_PHYSICIAN_RULES.referralRules,
    fixedPhrases: {
      ...DEFAULT_PHYSICIAN_RULES.fixedPhrases,
      ...(data.fixedPhrases ?? {}),
    },
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
