import { KnowledgeIndex, layerScore, rankHits } from './knowledge-index';
import { normalizeMedicalText } from './japanese-normalizer';
import {
  AUTO_APPLY_CONFIDENCE,
  AppliedCorrection,
  ExtractedEntity,
  HIGH_RISK_CATEGORIES,
  KnowledgeCorrectionResult,
  RiskLevel,
} from './knowledge-types';

export type PatientContext = {
  medications?: string[];
  diagnoses?: string[];
};

const STRENGTH_RE = /(\d+(?:\.\d+)?)\s*(ミリグラム|マイクログラム|ミリ|mg|ug|μg|g|％|%)/gi;

/**
 * Rule-based Medical Knowledge Layer corrector (RAG dictionary + ranking).
 * Never invents diagnoses/meds/doses. HIGH RISK items prefer needs_review over auto-apply.
 */
export function correctTranscriptWithKnowledge(
  rawText: string,
  index: KnowledgeIndex,
  patientContext?: PatientContext,
): KnowledgeCorrectionResult {
  const entities: ExtractedEntity[] = [];
  const corrections: AppliedCorrection[] = [];

  // 1) Strength / unit normalization (mark high-risk; only auto-normalize safe unit spelling later)
  for (const m of rawText.matchAll(STRENGTH_RE)) {
    const full = m[0];
    const num = m[1]!;
    const unitRaw = m[2]!;
    const start = m.index ?? 0;
    const unitCanon =
      /ミリグラム|^mg$/i.test(unitRaw) || unitRaw === 'ミリ'
        ? 'mg'
        : /マイクロ|^ug$|μg/i.test(unitRaw)
          ? 'μg'
          : /％|%/.test(unitRaw)
            ? '%'
            : unitRaw === 'g'
              ? 'g'
              : null;
    const normalized = unitCanon ? `${num}${unitCanon}` : null;
    const ambiguous = unitRaw === 'ミリ' || !unitCanon;
    entities.push({
      entityType: 'strength',
      rawValue: full,
      normalizedValue: normalized,
      confidence: ambiguous ? 0.7 : 0.95,
      startPosition: start,
      endPosition: start + full.length,
      needsReview: true, // dosages always reviewable
      riskLevel: 'critical',
      candidates: normalized
        ? [{ candidateValue: normalized, score: ambiguous ? 0.7 : 0.95, candidateSource: 'unit_normalizer' }]
        : [],
    });
    if (normalized && unitRaw === 'ミリ') {
      // "5ミリ" → candidate 5mg but do NOT auto-apply (ambiguous: could be mL)
      corrections.push({
        originalTerm: full,
        correctedTerm: normalized,
        category: 'strength',
        confidence: 0.75,
        correctionSource: 'unit_normalizer',
        autoApplied: false,
        needsReview: true,
        riskLevel: 'critical',
        startPosition: start,
        endPosition: start + full.length,
      });
    } else if (normalized && unitCanon === 'mg' && /ミリグラム/i.test(unitRaw)) {
      corrections.push({
        originalTerm: full,
        correctedTerm: normalized,
        category: 'strength',
        confidence: 0.9,
        correctionSource: 'unit_normalizer',
        autoApplied: false,
        needsReview: true,
        riskLevel: 'critical',
        startPosition: start,
        endPosition: start + full.length,
      });
    }
  }

  // 2) Dictionary longest-match corrections (operate on raw offsets)
  const surfaces = index.findSurfacesInText(rawText);
  const replaceOps: Array<{ start: number; end: number; from: string; to: string; corr: AppliedCorrection }> = [];

  for (const hit of surfaces) {
    const ranked = rankHits(hit.hits).map((h) => {
      let score = 0.55 + layerScore(h.layer) / 100 + h.priority / 1000;
      if (patientContext?.medications?.some((m) => normalizeMedicalText(m) === normalizeMedicalText(h.canonicalName))) {
        score += 0.12;
      }
      if (patientContext?.diagnoses?.some((d) => normalizeMedicalText(d) === normalizeMedicalText(h.canonicalName))) {
        score += 0.1;
      }
      if (h.aliasType === 'stt_error') score += 0.2;
      if (h.aliasType === 'brand_name') score += 0.05;
      return { hit: h, score: Math.min(0.99, score) };
    });
    ranked.sort((a, b) => b.score - a.score);
    const best = ranked[0];
    if (!best) continue;

    const isHighRisk =
      HIGH_RISK_CATEGORIES.includes(best.hit.category) ||
      best.hit.riskLevel === 'critical' ||
      best.hit.riskLevel === 'high';

    // Patient context only boosts ranking scores above — never forces auto-apply.
    // High-risk categories never auto-apply; physician must approve.
    const shouldReplace =
      !isHighRisk &&
      best.hit.matchAlias !== best.hit.canonicalName &&
      best.score >= AUTO_APPLY_CONFIDENCE &&
      best.hit.category !== 'negation';

    entities.push({
      entityType: best.hit.category,
      rawValue: hit.surface,
      normalizedValue: best.hit.canonicalName,
      confidence: best.score,
      startPosition: hit.start,
      endPosition: hit.end,
      needsReview: !shouldReplace || isHighRisk,
      riskLevel: best.hit.riskLevel,
      candidates: ranked.slice(0, 5).map((r) => ({
        candidateValue: r.hit.canonicalName,
        score: r.score,
        candidateSource: `${r.hit.layer}:${r.hit.aliasType}`,
      })),
    });

    if (shouldReplace) {
      replaceOps.push({
        start: hit.start,
        end: hit.end,
        from: hit.surface,
        to: best.hit.canonicalName,
        corr: {
          originalTerm: hit.surface,
          correctedTerm: best.hit.canonicalName,
          category: best.hit.category,
          confidence: best.score,
          correctionSource: `${best.hit.layer}:${best.hit.aliasType}`,
          autoApplied: true,
          needsReview: false,
          riskLevel: best.hit.riskLevel,
          startPosition: hit.start,
          endPosition: hit.end,
        },
      });
    } else if (best.hit.matchAlias !== best.hit.canonicalName) {
      corrections.push({
        originalTerm: hit.surface,
        correctedTerm: best.hit.canonicalName,
        category: best.hit.category,
        confidence: best.score,
        correctionSource: `${best.hit.layer}:${best.hit.aliasType}`,
        autoApplied: false,
        needsReview: true,
        riskLevel: best.hit.riskLevel as RiskLevel,
        startPosition: hit.start,
        endPosition: hit.end,
      });
    }
  }

  // Build corrected text from raw using non-overlapping ops (+ safe unit fixes)
  replaceOps.sort((a, b) => a.start - b.start);
  const merged: typeof replaceOps = [];
  let lastEnd = -1;
  for (const op of replaceOps) {
    if (op.start < lastEnd) continue;
    merged.push(op);
    lastEnd = op.end;
  }
  let corrected = '';
  let cursor = 0;
  for (const op of merged) {
    corrected += rawText.slice(cursor, op.start) + op.to;
    corrections.push(op.corr);
    cursor = op.end;
  }
  corrected += rawText.slice(cursor);

  for (const c of corrections) {
    if (c.autoApplied && c.correctionSource === 'unit_normalizer' && c.originalTerm !== c.correctedTerm) {
      corrected = corrected.split(c.originalTerm).join(c.correctedTerm);
    }
  }

  // 3) Negation pairing — attach negation to preceding symptom/finding without flipping
  for (const m of corrected.matchAll(
    /([一-龯ぁ-んァ-ンA-Za-z0-9]+?)(はありません|はない|なし|無い|認めない|陰性|問題なし|異常なし|所見なし|症状なし)/g,
  )) {
    const symptom = m[1]!;
    const neg = m[2]!;
    const start = m.index ?? 0;
    // Drop spurious matches where "あり" is only a substring of "ありません"
    if (neg === 'あり') continue;
    entities.push({
      entityType: 'symptom',
      rawValue: symptom,
      normalizedValue: index.resolveCanonical(symptom) ?? symptom,
      confidence: 0.9,
      startPosition: start,
      endPosition: start + symptom.length,
      needsReview: false,
      riskLevel: 'high',
      candidates: [],
    });
    entities.push({
      entityType: 'negation',
      rawValue: neg,
      normalizedValue: 'なし',
      confidence: 0.99,
      startPosition: start + symptom.length,
      endPosition: start + m[0].length,
      needsReview: true,
      riskLevel: 'critical',
      candidates: [{ candidateValue: 'なし', score: 0.99, candidateSource: 'negation_rule' }],
    });
  }
  // Remove false-positive negation entities that are substrings of ありません
  for (let i = entities.length - 1; i >= 0; i--) {
    const e = entities[i]!;
    if (e.entityType === 'negation' && e.rawValue === 'あり' && /ありません|はない/.test(rawText)) {
      entities.splice(i, 1);
    }
  }

  // 4) Lab value pattern: HbA1c / A1C は 7.2 — the test NAME is an unambiguous synonym so it is
  // auto-normalized in the text for readability; the VALUE stays candidates-only (needsReview) since
  // a mistyped/mis-heard number is a real patient-safety risk.
  for (const m of rawText.matchAll(
    /(HbA1c|HBA1C|A1[cC]|エーワンシー|ヘモグロビンエーワンシー)\s*(は|が)?\s*(\d+(?:\.\d+)?)\s*(%|％)?/gi,
  )) {
    const start = m.index ?? 0;
    entities.push({
      entityType: 'laboratory_test',
      rawValue: m[1]!,
      normalizedValue: 'HbA1c',
      confidence: 0.96,
      startPosition: start,
      endPosition: start + m[1]!.length,
      needsReview: false,
      riskLevel: 'critical',
      candidates: [{ candidateValue: 'HbA1c', score: 0.96, candidateSource: 'lab_pattern' }],
    });
    entities.push({
      entityType: 'laboratory_value',
      rawValue: m[3]!,
      normalizedValue: m[3]!,
      confidence: 0.9,
      startPosition: start + m[0].indexOf(m[3]!),
      endPosition: start + m[0].indexOf(m[3]!) + m[3]!.length,
      needsReview: true,
      riskLevel: 'critical',
      candidates: [],
    });
    if (/エーワンシー|ヘモグロビンエーワンシー|A1[cC]|HBA1C/i.test(m[1]!)) {
      corrections.push({
        originalTerm: m[1]!,
        correctedTerm: 'HbA1c',
        category: 'laboratory_test',
        confidence: 0.96,
        correctionSource: 'lab_pattern',
        autoApplied: true,
        needsReview: false,
        riskLevel: 'critical',
        startPosition: start,
        endPosition: start + m[1]!.length,
      });
    }
  }
  for (const c of corrections) {
    if (c.autoApplied && c.correctionSource === 'lab_pattern' && c.originalTerm !== c.correctedTerm) {
      corrected = corrected.split(c.originalTerm).join(c.correctedTerm);
    }
  }

  const reviewRequiredCount = entities.filter((e) => e.needsReview).length + corrections.filter((c) => c.needsReview && !c.autoApplied).length;
  const automaticCorrectionCount = corrections.filter((c) => c.autoApplied).length;

  return {
    rawText,
    correctedText: corrected,
    entities,
    corrections,
    reviewRequiredCount,
    automaticCorrectionCount,
  };
}
