import {
  knowledgePackDrugSurfaces,
  knowledgePackLexiconTerms,
} from './data/load-knowledge-pack';
import { PhoneticMatcher, PhoneticTerm } from './phonetic-matcher';

let instance: PhoneticMatcher | null = null;

/**
 * 辞書全体（標準＋追加語彙）から作る、音の近い語の照合器。
 * 薬（一般名・商品名）に加えて、カタカナの検査名・病名・症状も対象にする
 * （クレアチニン、ヘモグロビン、ネフローゼ など）。
 */
export function getDefaultPhoneticMatcher(): PhoneticMatcher {
  if (instance) return instance;
  const terms: PhoneticTerm[] = [];
  const known: string[] = [];
  for (const d of knowledgePackDrugSurfaces()) {
    terms.push({ surface: d.surface, canonical: d.canonical });
  }
  for (const t of knowledgePackLexiconTerms()) {
    known.push(t.name);
    if (t.category !== 'medications_generic') terms.push({ surface: t.name, canonical: t.name });
  }
  instance = new PhoneticMatcher(terms, { knownSurfaces: known });
  return instance;
}
