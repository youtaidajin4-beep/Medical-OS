/**
 * Run knowledge eval against generated-cases.jsonl
 * Usage: npx ts-node scripts/medical-knowledge/run-eval.ts
 */
import * as fs from 'fs';
import * as path from 'path';
import { KnowledgeIndex } from '../../src/modules/medical-knowledge/knowledge-index';
import { INTERNAL_MEDICINE_SEED_TERMS } from '../../src/modules/medical-knowledge/data/internal-medicine-seed';
import { loadCasesFromJsonl, runEval } from './score-case';

const FIXTURE_DIR = path.join(__dirname, '../../test/fixtures/medical-knowledge');
const CASES = path.join(FIXTURE_DIR, 'generated-cases.jsonl');
const REPORT = path.join(FIXTURE_DIR, 'last-report.json');

function main() {
  if (!fs.existsSync(CASES)) {
    console.error(`Missing ${CASES}. Run knowledge:generate first.`);
    process.exit(1);
  }
  const cases = loadCasesFromJsonl(fs.readFileSync(CASES, 'utf8'));
  const index = KnowledgeIndex.fromSeed(INTERNAL_MEDICINE_SEED_TERMS);
  const report = runEval(cases, index);
  fs.mkdirSync(FIXTURE_DIR, { recursive: true });
  fs.writeFileSync(REPORT, JSON.stringify(report, null, 2), 'utf8');

  console.log(
    JSON.stringify(
      {
        total: report.total,
        passed: report.passed,
        failed: report.failed,
        criticalFailed: report.criticalFailed,
        criticalErrorRate: report.criticalErrorRate,
        byCategory: report.byCategory,
        sampleFailures: report.failures.slice(0, 15),
      },
      null,
      2,
    ),
  );
  console.log(`Report → ${REPORT}`);
  if (report.criticalFailed > 0) process.exitCode = 2;
}

main();
