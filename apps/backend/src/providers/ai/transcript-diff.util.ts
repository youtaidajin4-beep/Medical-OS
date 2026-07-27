import { MedicalGlossaryReplacement } from './medical-glossary.types';

function tokenize(text: string): string[] {
  return text
    .split(/(\s+|[、。．，,.!?！？])/)
    .map((part) => part.trim())
    .filter(Boolean);
}

export function extractReplacementCandidates(
  beforeText: string,
  afterText: string,
): MedicalGlossaryReplacement[] {
  if (beforeText === afterText) return [];

  const beforeParts = beforeText.split('\n');
  const afterParts = afterText.split('\n');
  const candidates: MedicalGlossaryReplacement[] = [];
  const seen = new Set<string>();

  const lineCount = Math.max(beforeParts.length, afterParts.length);
  for (let i = 0; i < lineCount; i++) {
    const beforeLine = beforeParts[i] ?? '';
    const afterLine = afterParts[i] ?? '';
    if (beforeLine === afterLine) continue;

    const beforeTokens = tokenize(beforeLine);
    const afterTokens = tokenize(afterLine);
    const max = Math.max(beforeTokens.length, afterTokens.length);
    for (let j = 0; j < max; j++) {
      const wrong = beforeTokens[j];
      const correct = afterTokens[j];
      if (!wrong || !correct || wrong === correct) continue;
      if (wrong.length < 2 || correct.length < 2) continue;
      const key = `${wrong}→${correct}`;
      if (seen.has(key)) continue;
      seen.add(key);
      candidates.push({ wrong, correct });
    }
  }

  return candidates;
}

export function mergeReplacements(
  existing: MedicalGlossaryReplacement[],
  incoming: MedicalGlossaryReplacement[],
  limit = 3,
): MedicalGlossaryReplacement[] {
  const map = new Map(existing.map((r) => [r.wrong, r.correct]));
  for (const r of incoming) {
    if (!map.has(r.wrong)) map.set(r.wrong, r.correct);
  }
  return Array.from(map.entries())
    .map(([wrong, correct]) => ({ wrong, correct }))
    .slice(0, limit);
}
