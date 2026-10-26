import { KnowledgeIndex } from '../src/modules/medical-knowledge/knowledge-index';
import { correctTranscriptWithKnowledge } from '../src/modules/medical-knowledge/transcript-knowledge-corrector';

describe('否定表現は確認に積まない', () => {
  it('「冷や汗はない」の「はない→なし」は、医師が確かめることではない', () => {
    const r = correctTranscriptWithKnowledge('冷や汗はないです。咳は出てないです。熱もなし。', KnowledgeIndex.fromSeed());
    const negations = r.entities.filter((e) => e.entityType === 'negation');
    expect(negations.length).toBeGreaterThan(0);
    expect(negations.every((e) => e.needsReview === false)).toBe(true);
  });
});
