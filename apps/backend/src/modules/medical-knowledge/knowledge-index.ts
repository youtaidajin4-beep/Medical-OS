import { expandLookupKeys, normalizeMedicalText } from './japanese-normalizer';
import {
  AliasType,
  EntityType,
  KnowledgeLayer,
  RiskLevel,
  SeedTerm,
} from './knowledge-types';
import { INTERNAL_MEDICINE_SEED_TERMS } from './data/internal-medicine-seed';

export type IndexedTerm = {
  canonicalName: string;
  category: EntityType;
  riskLevel: RiskLevel;
  priority: number;
  layer: KnowledgeLayer;
  matchAlias: string;
  aliasType: AliasType | 'canonical';
  sourceCode: string | null;
};

/**
 * In-memory RAG index for medical terms.
 * Official master codes are never invented — sourceCode stays null for seed data.
 */
export class KnowledgeIndex {
  private byKey = new Map<string, IndexedTerm[]>();
  private aliasToCanonical = new Map<string, string>();

  static fromSeed(terms: SeedTerm[] = INTERNAL_MEDICINE_SEED_TERMS): KnowledgeIndex {
    const idx = new KnowledgeIndex();
    for (const t of terms) {
      idx.addTerm(t, 'specialty');
    }
    return idx;
  }

  addTerm(term: SeedTerm, layer: KnowledgeLayer, sourceCode: string | null = null) {
    const base: Omit<IndexedTerm, 'matchAlias' | 'aliasType'> = {
      canonicalName: term.canonicalName,
      category: term.category,
      riskLevel: term.riskLevel ?? 'medium',
      priority: term.priority ?? 100,
      layer,
      sourceCode,
    };
    this.register(term.canonicalName, { ...base, matchAlias: term.canonicalName, aliasType: 'canonical' });
    for (const a of term.aliases ?? []) {
      this.register(a.alias, { ...base, matchAlias: a.alias, aliasType: a.aliasType });
      this.aliasToCanonical.set(normalizeMedicalText(a.alias), term.canonicalName);
    }
  }

  addClinicAlias(wrong: string, correct: string, category: EntityType = 'other') {
    this.register(wrong, {
      canonicalName: correct,
      category,
      riskLevel: 'medium',
      priority: 200,
      layer: 'clinic',
      matchAlias: wrong,
      aliasType: 'stt_error',
      sourceCode: null,
    });
  }

  addPhysicianSpoken(spoken: string, preferred: string) {
    this.register(spoken, {
      canonicalName: preferred,
      category: 'other',
      riskLevel: 'low',
      priority: 300,
      layer: 'physician',
      matchAlias: spoken,
      aliasType: 'spoken',
      sourceCode: null,
    });
  }

  private register(surface: string, entry: IndexedTerm) {
    for (const key of expandLookupKeys(surface)) {
      const list = this.byKey.get(key) ?? [];
      list.push(entry);
      this.byKey.set(key, list);
    }
  }

  lookup(surface: string): IndexedTerm[] {
    const keys = expandLookupKeys(surface);
    const out: IndexedTerm[] = [];
    const seen = new Set<string>();
    for (const key of keys) {
      for (const hit of this.byKey.get(key) ?? []) {
        const id = `${hit.layer}:${hit.canonicalName}:${hit.matchAlias}`;
        if (seen.has(id)) continue;
        seen.add(id);
        out.push(hit);
      }
    }
    return out;
  }

  resolveCanonical(surface: string): string | null {
    const hits = this.lookup(surface);
    if (!hits.length) return this.aliasToCanonical.get(normalizeMedicalText(surface)) ?? null;
    return rankHits(hits)[0]?.canonicalName ?? null;
  }

  /** Longest-match scan over text for dictionary surfaces */
  findSurfacesInText(text: string): Array<{ surface: string; start: number; end: number; hits: IndexedTerm[] }> {
    const results: Array<{ surface: string; start: number; end: number; hits: IndexedTerm[] }> = [];
    // Prefer longer aliases: collect all registered surfaces
    const surfaces = new Set<string>();
    for (const list of this.byKey.values()) {
      for (const h of list) surfaces.add(h.matchAlias);
    }
    const sorted = [...surfaces].sort((a, b) => b.length - a.length);
    const occupied = new Array(text.length).fill(false);

    for (const surface of sorted) {
      if (surface.length < 2 && !/^[A-Za-z0-9%]+$/.test(surface)) continue;
      let from = 0;
      while (from < text.length) {
        const idx = text.indexOf(surface, from);
        if (idx < 0) break;
        const end = idx + surface.length;
        const overlap = occupied.slice(idx, end).some(Boolean);
        if (!overlap) {
          const hits = this.lookup(surface);
          if (hits.length) {
            results.push({ surface, start: idx, end, hits });
            for (let i = idx; i < end; i++) occupied[i] = true;
          }
        }
        from = idx + 1;
      }
    }
    return results.sort((a, b) => a.start - b.start);
  }
}

const LAYER_WEIGHT: Record<KnowledgeLayer, number> = {
  patient: 50,
  physician: 40,
  clinic: 30,
  specialty: 20,
  national: 10,
};

export function rankHits(hits: IndexedTerm[]): IndexedTerm[] {
  return [...hits].sort((a, b) => {
    const scoreA = LAYER_WEIGHT[a.layer] + a.priority / 100;
    const scoreB = LAYER_WEIGHT[b.layer] + b.priority / 100;
    return scoreB - scoreA;
  });
}

export function layerScore(layer: KnowledgeLayer): number {
  return LAYER_WEIGHT[layer];
}
