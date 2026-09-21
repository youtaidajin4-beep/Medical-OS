import {
  knowledgePackV2Counts,
  knowledgePackSafetyRules,
  loadInternalMedicineKnowledgePack,
} from '../src/modules/medical-knowledge/data/load-knowledge-pack';
import { KnowledgeIndex } from '../src/modules/medical-knowledge/knowledge-index';
import { correctTranscriptWithKnowledge } from '../src/modules/medical-knowledge/transcript-knowledge-corrector';
import { INTERNAL_MEDICINE_SEED_TERMS } from '../src/modules/medical-knowledge/data/internal-medicine-seed';
import { glossaryToLlmHint } from '../src/providers/ai/medical-glossary';
import { DEFAULT_MEDICAL_GLOSSARY } from '../src/providers/ai/medical-glossary.types';

describe('knowledge pack v2 loader', () => {
  it('meets v2 inventory counts', () => {
    const counts = knowledgePackV2Counts();
    expect(counts.terms).toBeGreaterThanOrEqual(1055);
    expect(counts.brandGeneric).toBeGreaterThanOrEqual(106);
    expect(counts.abbreviations).toBeGreaterThanOrEqual(60);
    expect(counts.spokenForms).toBeGreaterThanOrEqual(32);
    expect(counts.sttErrors).toBeGreaterThanOrEqual(7);
  });

  it('exposes safety rules from pack', () => {
    const rules = knowledgePackSafetyRules();
    expect(rules.some((r) => r.includes('RAW'))).toBe(true);
    expect(rules.some((r) => r.includes('needs_review') || r.includes('needs_review=true') || r.includes('needs_review'))).toBe(
      true,
    );
  });

  it('loads seed terms from v2', () => {
    const terms = loadInternalMedicineKnowledgePack();
    expect(terms.length).toBeGreaterThanOrEqual(1000);
    expect(INTERNAL_MEDICINE_SEED_TERMS.length).toBeGreaterThanOrEqual(terms.length);
  });
});

describe('scoped clinic/physician dictionaries', () => {
  it('does not leak clinic A aliases into a seed-only index used for clinic B', () => {
    const seedOnly = KnowledgeIndex.fromSeed();
    const withClinicA = KnowledgeIndex.fromSeed();
    withClinicA.addClinicAlias('期間支援X', '気管支炎', 'diagnosis');

    const hitA = withClinicA.lookup('期間支援X');
    expect(hitA.some((h) => h.canonicalName === '気管支炎')).toBe(true);

    const hitB = seedOnly.lookup('期間支援X');
    expect(hitB.length).toBe(0);
  });
});

/**
 * ヒントの中身は、実際の誤変換で測って決めた（eval/run-correction-eval.mjs）。
 *
 * 各20語 → 内科ぜんぶ で回復率 12% → 17%（各5回・ばらつき0・改悪0）。
 * ただし**読みを足すと下がる**。同じ語数で読みを付けるとヒントが2.4倍になり、
 * 回復率は 11/12 → 9/12 に落ちた。読みは索引の鍵として持ち、ヒントには出さない。
 */
describe('校正へ渡すクリニック語彙', () => {
  it('内科の語をひととおり渡す（各20語では足りない）', () => {
    const hint = glossaryToLlmHint(DEFAULT_MEDICAL_GLOSSARY, [
      {
        rawValue: 'アムロジビン',
        normalizedValue: 'アムロジピン',
        entityType: 'medication',
        needsReview: true,
      },
    ]);
    expect(hint.includes('アムロジビン→アムロジピン')).toBe(true);
    // 循環器以外の領域が入っていること（以前は五十音順の先頭20語しか渡せていなかった）
    expect(hint).toContain('逆流性食道炎');
    expect(hint).toContain('気管支喘息');
    expect(hint).toContain('咳嗽');
    // 際限なく伸ばさない。長いほど効きが鈍る
    expect(hint.length).toBeLessThan(8000);
  });

  it('読みはヒントに入れない（長くなって回復率が下がる）', () => {
    const hint = glossaryToLlmHint(DEFAULT_MEDICAL_GLOSSARY);
    expect(hint).not.toContain('きょうしんしょう');
    expect(hint).not.toContain('（こうけつあつ）');
  });
});

describe('RAW immutability of correction result', () => {
  it('returns the same rawText reference content as input', () => {
    const raw = 'アムロジビン5ミリ継続';
    const r = correctTranscriptWithKnowledge(raw, KnowledgeIndex.fromSeed(INTERNAL_MEDICINE_SEED_TERMS));
    expect(r.rawText).toBe(raw);
  });
});
