import { loadInternalMedicineKnowledgePack } from '../src/modules/medical-knowledge/data/load-knowledge-pack';
import { KnowledgeIndex } from '../src/modules/medical-knowledge/knowledge-index';

/**
 * 辞書は長いあいだ漢字の表記だけを持っていた（1,055語すべて読みなし）。
 * 表記が一致しないと当たらないので、音声認識がかなのまま出した語を拾えない。
 * 2026-09-21 に読みを付与した。
 */
describe('医療辞書の読み', () => {
  const terms = loadInternalMedicineKnowledgePack();

  it('大半の語に読みが付いている（英字略語を除く）', () => {
    const kanjiTerms = terms.filter((t) => /[一-鿿]/.test(t.canonicalName));
    const withReading = kanjiTerms.filter((t) => t.reading);
    expect(kanjiTerms.length).toBeGreaterThan(500);
    expect(withReading.length / kanjiTerms.length).toBeGreaterThan(0.95);
  });

  it('読みはひらがなだけ', () => {
    for (const t of terms) {
      if (t.reading) expect(t.reading).toMatch(/^[ぁ-ゖー]+$/);
    }
  });

  it('医療特有の読みを取り違えていない', () => {
    const reading = (name: string) => terms.find((t) => t.canonicalName === name)?.reading;
    expect(reading('狭心症')).toBe('きょうしんしょう');
    // 「えんかしょうがい」ではない
    expect(reading('嚥下障害')).toBe('えんげしょうがい');
    expect(reading('咳嗽')).toBe('がいそう');
    expect(reading('喘鳴')).toBe('ぜんめい');
  });

  it('英字略語には読みを持たせない', () => {
    const hba1c = terms.find((t) => t.canonicalName === 'HbA1c');
    expect(hba1c?.reading ?? '').toBe('');
  });

  it('かなで書かれていても辞書に当たる', () => {
    const index = KnowledgeIndex.fromSeed(terms);
    const hits = index.findSurfacesInText('きょうしんしょうの疑い');
    expect(hits.some((h) => h.hits.some((x) => x.canonicalName === '狭心症'))).toBe(true);
  });
});
