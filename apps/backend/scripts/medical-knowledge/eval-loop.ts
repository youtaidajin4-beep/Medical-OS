/**
 * generate → eval → patch loop until Critical=0 (max rounds).
 * Usage: npx ts-node scripts/medical-knowledge/eval-loop.ts
 */
import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { EvalReport } from '../../test/fixtures/medical-knowledge/cases.schema';

const ROOT = path.join(__dirname, '../..');
const REPORT = path.join(ROOT, 'test/fixtures/medical-knowledge/last-report.json');
const MAX_ROUNDS = 8;

function run(script: string) {
  const tsNode = path.join(ROOT, 'node_modules/.bin/ts-node');
  const r = spawnSync(tsNode, [`scripts/medical-knowledge/${script}`], {
    cwd: ROOT,
    encoding: 'utf8',
  });
  if (r.stdout) process.stdout.write(r.stdout);
  if (r.stderr) process.stderr.write(r.stderr);
  return r.status ?? 1;
}

function main() {
  console.log('=== knowledge:generate ===');
  if (run('generate-cases.ts') !== 0) process.exit(1);

  for (let round = 1; round <= MAX_ROUNDS; round++) {
    console.log(`\n=== eval round ${round} ===`);
    run('run-eval.ts'); // exit 2 on critical fails is OK
    if (!fs.existsSync(REPORT)) {
      console.error('No report written');
      process.exit(1);
    }
    const report = JSON.parse(fs.readFileSync(REPORT, 'utf8')) as EvalReport;
    console.log(`criticalFailed=${report.criticalFailed} failed=${report.failed} total=${report.total}`);
    if (report.criticalFailed === 0) {
      console.log('Critical Medical Error Rate = 0. Done.');
      process.exit(0);
    }
    console.log('=== patch-from-failures ===');
    if (run('patch-from-failures.ts') !== 0) process.exit(1);
  }
  console.error(`Still have critical failures after ${MAX_ROUNDS} rounds`);
  process.exit(2);
}

main();
