import { KnowledgeIndex } from '../../src/modules/medical-knowledge/knowledge-index';
import { correctTranscriptWithKnowledge } from '../../src/modules/medical-knowledge/transcript-knowledge-corrector';
import { CaseFailure, EvalCase, EvalReport } from '../../test/fixtures/medical-knowledge/cases.schema';

const NEGATIVE_MARKERS = /なし|ありません|ないです|認めない|陰性|問題なし|異常なし|所見なし|症状なし/;

export function scoreCase(c: EvalCase, index: KnowledgeIndex): CaseFailure | null {
  const result = correctTranscriptWithKnowledge(c.input, index);
  const reasons: string[] = [];
  const corrected = result.correctedText;

  for (const s of c.expect.mustContain ?? []) {
    if (!corrected.includes(s)) {
      reasons.push(`mustContain missing: ${s}`);
    }
  }
  for (const s of c.expect.mustNotContain ?? []) {
    // Avoid false positive: 「胸痛あり」 is a prefix of 「胸痛ありません」
    if (s.endsWith('あり') && (corrected.includes(`${s}ません`) || corrected.includes(`${s}ませんでした`))) {
      continue;
    }
    if (corrected.includes(s)) {
      reasons.push(`mustNotContain present: ${s}`);
    }
  }

  if (c.expect.forbidNegationFlip && NEGATIVE_MARKERS.test(c.input)) {
    const flipped =
      // e.g. 胸痛なし → 胸痛あり (exact positive, not ありません)
      /(なし|ありません|はない|認めない|陰性)/.test(c.input) &&
      !NEGATIVE_MARKERS.test(corrected) &&
      /(^|[^\u3040-\u30ff\u4e00-\u9fff])あり([^\u3040-\u30ff\u4e00-\u9fff]|$)/.test(corrected);
    const explicitFlip = /(.+?)(なし|はありません)/.test(c.input) && /(.+?)あり(?!ません)/.test(corrected) && !NEGATIVE_MARKERS.test(corrected);
    if (flipped || explicitFlip) {
      reasons.push('negation flipped to positive');
    }
  }

  if (c.expect.dosageNeedsReview) {
    const strength = result.entities.find((e) => e.entityType === 'strength' || e.entityType === 'dosage');
    const corr = result.corrections.find(
      (x) => x.category === 'strength' && x.originalTerm.includes('ミリ') && x.autoApplied && !x.needsReview,
    );
    if (corr) {
      reasons.push('ambiguous ミリ auto-applied without review');
    }
    // "5ミリ" must not disappear into confirmed 5mg without needsReview trail
    if (/ミリ/.test(c.input) && /mg/.test(corrected) && !/ミリ/.test(corrected)) {
      const reviewed =
        result.corrections.some((x) => x.needsReview && x.originalTerm.includes('ミリ')) ||
        strength?.needsReview;
      if (!reviewed) {
        reasons.push('ミリ normalized to mg without needsReview');
      }
    }
  }

  for (const ent of c.expect.entityNormalized ?? []) {
    const hit = result.entities.some(
      (e) =>
        e.entityType === ent.entityType &&
        (e.normalizedValue === ent.value || e.rawValue === ent.value || e.candidates.some((cand) => cand.candidateValue === ent.value)),
    );
    if (!hit && !corrected.includes(ent.value)) {
      reasons.push(`entity missing: ${ent.entityType}=${ent.value}`);
    }
  }

  if (c.expect.expectedCanonical) {
    const canon = c.expect.expectedCanonical;
    const ok =
      corrected.includes(canon) ||
      result.entities.some(
        (e) =>
          e.normalizedValue === canon ||
          e.candidates.some((cand) => cand.candidateValue === canon),
      ) ||
      result.corrections.some((x) => x.correctedTerm === canon);
    if (!ok) {
      reasons.push(`expectedCanonical not found: ${canon}`);
    }
  }

  if (!reasons.length) return null;

  return {
    id: c.id,
    category: c.category,
    critical: c.critical,
    input: c.input,
    correctedText: corrected,
    reasons,
    patchHint:
      c.expect.surfaceForm && c.expect.expectedCanonical
        ? { surfaceForm: c.expect.surfaceForm, expectedCanonical: c.expect.expectedCanonical }
        : undefined,
  };
}

export function runEval(cases: EvalCase[], index: KnowledgeIndex): EvalReport {
  const failures: CaseFailure[] = [];
  const byCategory: EvalReport['byCategory'] = {};

  for (const c of cases) {
    const bucket = byCategory[c.category] ?? { total: 0, failed: 0, criticalFailed: 0 };
    bucket.total += 1;
    const fail = scoreCase(c, index);
    if (fail) {
      failures.push(fail);
      bucket.failed += 1;
      if (c.critical) bucket.criticalFailed += 1;
    }
    byCategory[c.category] = bucket;
  }

  const criticalFailed = failures.filter((f) => f.critical).length;
  return {
    generatedAt: new Date().toISOString(),
    total: cases.length,
    passed: cases.length - failures.length,
    failed: failures.length,
    criticalFailed,
    criticalErrorRate: cases.length ? criticalFailed / cases.length : 0,
    byCategory,
    failures,
  };
}

export function loadCasesFromJsonl(text: string): EvalCase[] {
  return text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => JSON.parse(l) as EvalCase);
}
