import * as fs from 'fs';
import * as path from 'path';
import { KnowledgeIndex } from '../src/modules/medical-knowledge/knowledge-index';
import { INTERNAL_MEDICINE_SEED_TERMS } from '../src/modules/medical-knowledge/data/internal-medicine-seed';
import { loadCasesFromJsonl, runEval } from '../scripts/medical-knowledge/score-case';

const CASES_PATH = path.join(__dirname, 'fixtures/medical-knowledge/generated-cases.jsonl');

describe('Medical knowledge eval farm (regression gate)', () => {
  it('has generated-cases.jsonl with ~3000 cases', () => {
    expect(fs.existsSync(CASES_PATH)).toBe(true);
    const cases = loadCasesFromJsonl(fs.readFileSync(CASES_PATH, 'utf8'));
    expect(cases.length).toBeGreaterThanOrEqual(2500);
    expect(cases.length).toBeLessThanOrEqual(4000);
  });

  it('Critical Medical Error Rate is 0 across all generated cases', () => {
    const cases = loadCasesFromJsonl(fs.readFileSync(CASES_PATH, 'utf8'));
    const index = KnowledgeIndex.fromSeed(INTERNAL_MEDICINE_SEED_TERMS);
    const report = runEval(cases, index);
    if (report.criticalFailed > 0) {
      // Helpful failure output (first 20)
      // eslint-disable-next-line no-console
      console.error(
        JSON.stringify(
          {
            criticalFailed: report.criticalFailed,
            sample: report.failures.filter((f) => f.critical).slice(0, 20),
          },
          null,
          2,
        ),
      );
    }
    expect(report.criticalFailed).toBe(0);
    expect(report.criticalErrorRate).toBe(0);
  });
});
