export type EntityType =
  | 'diagnosis'
  | 'symptom'
  | 'finding'
  | 'medication'
  | 'dosage'
  | 'strength'
  | 'unit'
  | 'route'
  | 'frequency'
  | 'duration'
  | 'laboratory_test'
  | 'laboratory_value'
  | 'vital_sign'
  | 'imaging'
  | 'procedure'
  | 'allergy'
  | 'body_part'
  | 'body_side'
  | 'negation'
  | 'treatment_action'
  | 'hospital_name'
  | 'doctor_name'
  | 'date'
  | 'time'
  | 'abbreviation'
  | 'other';

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

export type AliasType =
  | 'spoken'
  | 'abbreviation'
  | 'brand_name'
  | 'generic_name'
  | 'common_misspelling'
  | 'stt_error'
  | 'legacy'
  | 'english';

export type KnowledgeLayer = 'patient' | 'physician' | 'clinic' | 'specialty' | 'national';

export type SeedTerm = {
  canonicalName: string;
  reading?: string;
  category: EntityType;
  subcategory?: string;
  englishName?: string;
  abbreviation?: string;
  priority?: number;
  riskLevel?: RiskLevel;
  aliases?: Array<{ alias: string; aliasType: AliasType; aliasReading?: string }>;
};

export type ExtractedEntity = {
  entityType: EntityType;
  rawValue: string;
  normalizedValue: string | null;
  confidence: number;
  startPosition: number;
  endPosition: number;
  needsReview: boolean;
  riskLevel: RiskLevel;
  candidates: Array<{ candidateValue: string; score: number; candidateSource: string }>;
};

export type AppliedCorrection = {
  originalTerm: string;
  correctedTerm: string;
  category: EntityType | null;
  confidence: number;
  correctionSource: string;
  autoApplied: boolean;
  needsReview: boolean;
  riskLevel: RiskLevel;
  startPosition: number;
  endPosition: number;
};

export type KnowledgeCorrectionResult = {
  rawText: string;
  correctedText: string;
  entities: ExtractedEntity[];
  corrections: AppliedCorrection[];
  reviewRequiredCount: number;
  automaticCorrectionCount: number;
};

export const HIGH_RISK_CATEGORIES: EntityType[] = [
  'medication',
  'dosage',
  'strength',
  'allergy',
  'laboratory_value',
  'laboratory_test',
  'vital_sign',
  'unit',
  'negation',
  'treatment_action',
  'body_side',
];

/** Only low/medium risk terms may auto-apply. High/critical always need physician review. */
export const AUTO_APPLY_CONFIDENCE = 0.92;
