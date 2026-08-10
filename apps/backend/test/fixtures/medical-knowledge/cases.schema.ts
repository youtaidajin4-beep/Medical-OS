export type EvalCategory =
  | 'medication'
  | 'brand'
  | 'stt_error'
  | 'negation'
  | 'lab'
  | 'dosage'
  | 'action'
  | 'vital'
  | 'abbreviation'
  | 'multi'
  | 'spoken';

export type EvalExpect = {
  /** Corrected text must include all of these */
  mustContain?: string[];
  /** Corrected text must not include any of these */
  mustNotContain?: string[];
  /** Entity normalizedValue expectations */
  entityNormalized?: Array<{ entityType: string; value: string }>;
  /** If true, at least one strength/dosage entity must needsReview=true */
  dosageNeedsReview?: boolean;
  /** Forbidden: negation flipped to positive */
  forbidNegationFlip?: boolean;
  /** Expected canonical medication if input was a known STT error / brand */
  expectedCanonical?: string;
  /** Surface form that should map toward expectedCanonical (for patching) */
  surfaceForm?: string;
};

export type EvalCase = {
  id: string;
  category: EvalCategory;
  input: string;
  expect: EvalExpect;
  critical: boolean;
};

export type CaseFailure = {
  id: string;
  category: EvalCategory;
  critical: boolean;
  input: string;
  correctedText: string;
  reasons: string[];
  patchHint?: { surfaceForm: string; expectedCanonical: string };
};

export type EvalReport = {
  generatedAt: string;
  total: number;
  passed: number;
  failed: number;
  criticalFailed: number;
  criticalErrorRate: number;
  byCategory: Record<string, { total: number; failed: number; criticalFailed: number }>;
  failures: CaseFailure[];
};
