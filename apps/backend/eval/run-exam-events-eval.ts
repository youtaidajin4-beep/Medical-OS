/**
 * Oの定型を入れてよいかの判定（exam-events.ts）を測る。現行の正規表現と並べる。
 *
 *   cd apps/backend && OPENAI_API_KEY=... npx ts-node eval/run-exam-events-eval.ts [試行回数=2]
 *
 * 見る数字（部位ごとの正解は eval/exam-events/cases.ts）:
 *   偽の定型   … 正解が「診察していない／結果の発話なし／異常あり」なのに、「異常なし」の定型が入った数。**0であるべき**
 *   偽の診察   … 正解が「診察していない」なのに、診察したと判定した数。**0であるべき**
 *   定型が入った … 正解が「異常なし」の部位のうち、定型が入った割合
 *   診察を拾えた … 診察した部位のうち、診察したと判定した割合（未確認を含む）
 *   段が合った … 診察した部位のうち、正解の段（異常なし／未確認／異常あり）まで合った割合
 * 合成の会話なので、絶対値ではなく、現行の正規表現との差と、偽の定型・偽の診察が0かを見る。
 */
import { readFileSync } from 'node:fs';
import { runExamEvents, EXAM_SYSTEMS, ExamSystem, resolveExam } from '../src/providers/ai/exam-events';
import { FRESH, FRESH_NEGATIVE, HELDOUT, HELDOUT_NEGATIVE, NEGATIVE, POSITIVE, ExamCase } from './exam-events/cases';

const KEY = process.env.OPENAI_API_KEY ?? (readFileSync('.env', 'utf8').match(/^OPENAI_API_KEY=(.*)$/m) ?? [])[1]?.trim();
if (!KEY) throw new Error('OPENAI_API_KEY がありません');
const MODEL = process.env.EVAL_MODEL ?? 'gpt-4o';
const TRIALS = Number(process.argv.find((a) => /^\d+$/.test(a)) ?? 2);

// soap-floor-gate.ts の AUSCULTATION_CUES と同じ（現行の判定）
const LEGACY = /聴診|胸の音|心音|呼吸音|背中|背部|深呼吸|息を吸|息を吐|脈を|脈拍|血圧を測|お腹を診|腹部を診/;

async function chat(system: string, user: string): Promise<unknown> {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: MODEL,
      temperature: 0,
      max_tokens: 1500,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
    }),
  });
  if (!res.ok) throw new Error(`OpenAI ${res.status}`);
  const d = (await res.json()) as { choices: Array<{ message: { content: string } }> };
  return JSON.parse(d.choices[0]!.message.content);
}

type Tier = 'none' | 'normal' | 'unstated' | 'abnormal';

function predict(events: Awaited<ReturnType<typeof runExamEvents>>): Record<ExamSystem, Tier> {
  const r = resolveExam(events);
  const out = {} as Record<ExamSystem, Tier>;
  for (const s of EXAM_SYSTEMS) {
    out[s] = r.normal.includes(s) ? 'normal' : r.abnormal.includes(s) ? 'abnormal' : r.unconfirmed.includes(s) ? 'unstated' : 'none';
  }
  return out;
}

// --heldout: プロンプトを直し終えたあとに足した未見の会話だけで測る（直さずに1回）
const HELD = process.argv.includes('--heldout');
const FRESH_SET = process.argv.includes('--fresh');
const cases: ExamCase[] = FRESH_SET
  ? [...FRESH, ...FRESH_NEGATIVE]
  : HELD
    ? [...HELDOUT, ...HELDOUT_NEGATIVE]
    : [...POSITIVE, ...NEGATIVE];

(async () => {
  const stat = { falseNormal: 0, falsePerformed: 0, normalExp: 0, normalGot: 0, doneExp: 0, doneGot: 0, tierOk: 0 };
  const wrong: string[] = [];
  const legacy = { falseInsert: 0, negCases: 0, normalCases: 0, normalGot: 0, doneCases: 0, doneGot: 0 };

  for (const c of cases) {
    const cue = LEGACY.test(c.transcript);
    const anyExpected = EXAM_SYSTEMS.some((s) => c.expect[s]);
    const anyNormal = EXAM_SYSTEMS.some((s) => c.expect[s] === 'normal');
    if (!anyExpected) {
      legacy.negCases++;
      if (cue) legacy.falseInsert++;
    } else {
      legacy.doneCases++;
      if (cue) legacy.doneGot++;
      if (anyNormal) {
        legacy.normalCases++;
        if (cue) legacy.normalGot++;
      }
    }

    for (let trial = 0; trial < TRIALS; trial++) {
      const got = predict(await runExamEvents(chat, c.transcript));
      for (const s of EXAM_SYSTEMS) {
        const exp: Tier = c.expect[s] ?? 'none';
        const g = got[s];
        if (g === 'normal' && exp !== 'normal') {
          stat.falseNormal++;
          wrong.push(`偽の定型 ${c.id} ${c.label} [${s}] 正解=${exp} 判定=${g}`);
        }
        if (exp === 'none' && g !== 'none') {
          stat.falsePerformed++;
          if (g !== 'normal') wrong.push(`偽の診察 ${c.id} ${c.label} [${s}] 判定=${g}`);
        }
        if (exp === 'normal') {
          stat.normalExp++;
          if (g === 'normal') stat.normalGot++;
        }
        if (exp !== 'none') {
          stat.doneExp++;
          if (g !== 'none') stat.doneGot++;
          if (g === exp) stat.tierOk++;
          else if (g !== 'normal' || exp !== 'normal') wrong.push(`段が違う ${c.id} ${c.label} [${s}] 正解=${exp} 判定=${g}`);
        }
      }
    }
  }

  const pct = (a: number, b: number) => (b === 0 ? '—' : `${((a / b) * 100).toFixed(0)}%`);
  console.log(`会話 ${cases.length} 件（${FRESH_SET ? '調整後に足した未見の組' : HELD ? '一度見た組（HELDOUT）' : '調整に使った組'}。診察あり ${cases.filter((c) => Object.keys(c.expect).length).length} / なし ${cases.filter((c) => !Object.keys(c.expect).length).length}）× ${TRIALS} 回 / モデル ${MODEL}\n`);
  console.log('現行の正規表現（会話に聴診などの語があれば、4部位すべての定型を入れる）');
  console.log(`  診察なしの会話に定型が入った: ${legacy.falseInsert}/${legacy.negCases} 件`);
  console.log(`  診察ありの会話で定型が入った: ${legacy.doneGot}/${legacy.doneCases} 件（うち、異常なしの会話 ${legacy.normalGot}/${legacy.normalCases}）\n`);
  console.log('LLM判定（引用の検算つき）');
  console.log(`  偽の定型: ${stat.falseNormal} 件（部位×試行）  ← 0であるべき`);
  console.log(`  偽の診察: ${stat.falsePerformed} 件  ← 0であるべき`);
  console.log(`  異常なしの部位に定型が入った: ${stat.normalGot}/${stat.normalExp} = ${pct(stat.normalGot, stat.normalExp)}`);
  console.log(`  診察した部位を拾えた:       ${stat.doneGot}/${stat.doneExp} = ${pct(stat.doneGot, stat.doneExp)}`);
  console.log(`  診察した部位で段まで合った: ${stat.tierOk}/${stat.doneExp} = ${pct(stat.tierOk, stat.doneExp)}`);
  if (wrong.length) {
    console.log('\n外れた判定');
    for (const w of [...new Set(wrong)]) console.log(`  ${w}`);
  }
})();
