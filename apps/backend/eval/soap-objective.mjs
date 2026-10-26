/**
 * SOAPの客観評価。同じ会話から、いまの本番と同じ段（抽出・診察の判定・SOAP・床・再診の補い）でSOAPを作り、
 * 3つの物差しで測る。
 *   1. 的の転記率   … 人が決めた的（eval/soap-corpus）に当たったか。捏造（言っていないこと）の数も数える
 *   2. 独立判定     … 本番の品質計測と同じ3段のLLM判定（会話から事実を挙げ、SOAPにあるかを見る）。
 *                     人の的とは物差しが違い、判定のほうが低く出る。**比べるのは同じ物差しの中**
 *   3. 分量と密度   … 欄ごとの文字数・行数、1000字あたりに載った事実の数
 *
 * 使い方（apps/backend で。先に nest build）:
 *   OPENAI_API_KEY=... node eval/soap-objective.mjs [試行回数=2]
 */
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { OpenAiLlmProvider } from '../dist/providers/ai/openai-llm.provider.js';
import { runSoapJudge } from '../dist/modules/quality/soap-coverage-judge.js';
import { applyRoutineFloor } from '../dist/providers/ai/soap-floor-gate.js';
import { resolveExam } from '../dist/providers/ai/exam-events.js';
import { SOAP_TEMPLATE_FLOORS } from '../dist/providers/ai/soap-templates.js';
import { ensureFollowUp, ensurePrescriptionDays } from '../dist/providers/ai/soap-followup.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const KEY = process.env.OPENAI_API_KEY;
if (!KEY) { console.error('OPENAI_API_KEY が要ります'); process.exit(1); }
const TRIALS = Number(process.argv.find((a) => /^\d+$/.test(a)) ?? 2);

const CORPORA = [
  ['実診療3症例（調整に使った）', 'cases.json'],
  ['合成3症例（調整に使っていない）', 'cases-heldout.json'],
  ['実診察に寄せた3台本（音声→文字起こし）', 'cases-realistic.json'],
];

const llm = new OpenAiLlmProvider({ apiKey: KEY, model: 'gpt-4o-mini', correctionModel: 'gpt-4o', extractModel: 'gpt-4o', documentModel: 'gpt-4o', soapModel: 'gpt-4o' });

async function judgeChat(system, user) {
  const r = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST', headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'gpt-4o', temperature: 0, response_format: { type: 'json_object' }, messages: [{ role: 'system', content: system }, { role: 'user', content: user }] }),
  });
  if (!r.ok) throw new Error(`judge ${r.status}`);
  const j = await r.json();
  return { json: JSON.parse(j.choices[0].message.content), costJpy: 0 };
}

/** 本番の SOAP の段と同じ */
async function produce(kase) {
  const visitType = kase.visitType ?? 'ROUTINE';
  const transcript = kase.transcript;
  const [structured, examEvents, soap] = await Promise.all([
    llm.extractStructured(transcript, 'eval'),
    llm.extractExamEvents(transcript, 'eval').catch(() => []),
    llm.generateSoap({}, 'eval', { transcript, visitType, transcriptOnly: true }),
  ]);
  const floor = applyRoutineFloor(soap, SOAP_TEMPLATE_FLOORS[visitType], transcript, resolveExam(examEvents));
  const base = floor?.soap ?? soap;
  return { ...base, plan: ensurePrescriptionDays(ensureFollowUp(base.plan, structured.followUpInterval), structured.prescriptionDays) };
}

const norm = (t) => t.replace(/[０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0)).replace(/\s/g, '');
const flat = (s) => [s.subjective, s.objective, s.assessment, s.plan].join('\n');
function target(soap, kase) {
  const hay = norm(flat(soap));
  const hit = kase.targets.filter((t) => t.accept.some((a) => hay.includes(norm(a)))).length;
  const fab = (kase.forbidden ?? []).filter((f) => new RegExp(f.pattern, 'm').test(flat(soap))).length;
  return { hit, total: kase.targets.length, fab };
}
function volume(soap) {
  // 欄は1段落で返ることが多いので、行ではなく「文」の数で分量を見る
  const lines = (t) => String(t).split(/[。\n]/).map((x) => x.trim()).filter((x) => x.length >= 2).length;
  return {
    chars: flat(soap).replace(/\s/g, '').length,
    S: String(soap.subjective).length, O: String(soap.objective).length, A: String(soap.assessment).length, P: String(soap.plan).length,
    lines: lines(soap.subjective) + lines(soap.objective) + lines(soap.assessment) + lines(soap.plan),
  };
}
async function judge(kase, soap) {
  const { json } = await runSoapJudge(judgeChat, kase.transcript, soap);
  const facts = Array.isArray(json.facts) ? json.facts : [];
  const hit = facts.filter((f) => f?.inSoap === true).length;
  return { facts: facts.length, hit, unsupported: (json.unsupported ?? []).length };
}

const agg = { current: [], zoom: [] };
for (const [label, file] of CORPORA) {
  const path = join(HERE, 'soap-corpus', file);
  if (!existsSync(path)) { console.log(`（${file} がありません）`); continue; }
  const corpus = JSON.parse(readFileSync(path, 'utf8'));
  console.log(`\n■ ${label}`);
  for (const kase of corpus.cases) {
    const runs = [];
    for (let i = 0; i < TRIALS; i++) {
      try {
        const soap = await produce(kase);
        runs.push({ soap, ...target(soap, kase), v: volume(soap), j: await judge(kase, soap) });
      } catch (e) { console.log(`   失敗: ${e.message}`); }
    }
    if (!runs.length) continue;
    const mean = (f) => runs.reduce((a, r) => a + f(r), 0) / runs.length;
    const row = {
      case: kase.label, corpus: label,
      targetPct: (100 * mean((r) => r.hit)) / kase.targets.length, fab: mean((r) => r.fab),
      judgePct: (100 * mean((r) => r.j.hit)) / Math.max(1, mean((r) => r.j.facts)), facts: mean((r) => r.j.facts), judgeHit: mean((r) => r.j.hit), unsupported: mean((r) => r.j.unsupported),
      chars: mean((r) => r.v.chars), lines: mean((r) => r.v.lines), S: mean((r) => r.v.S), O: mean((r) => r.v.O), A: mean((r) => r.v.A), P: mean((r) => r.v.P),
      hitPer1000: mean((r) => r.j.hit) / Math.max(1, mean((r) => r.v.chars)) * 1000,
    };
    agg.current.push(row);
    console.log(`  ${kase.label.slice(0, 22).padEnd(24)} 的 ${row.targetPct.toFixed(0)}%  独立判定 ${row.judgePct.toFixed(0)}%(${row.facts.toFixed(0)}事実)  根拠なし ${row.unsupported.toFixed(1)}  捏造 ${row.fab.toFixed(1)}  ${row.chars.toFixed(0)}字/${row.lines.toFixed(0)}行`);
    if (kase.baselineZoomGpt) {
      const z = { subjective: kase.baselineZoomGpt, objective: '', assessment: '', plan: '' };
      const j = await judge(kase, z);
      const t = target(z, kase);
      agg.zoom.push({ targetPct: (100 * t.hit) / kase.targets.length, judgePct: (100 * j.hit) / Math.max(1, j.facts), unsupported: j.unsupported, chars: kase.baselineZoomGpt.replace(/\s/g, '').length, lines: kase.baselineZoomGpt.split('\n').filter((x) => x.trim()).length, hitPer1000: (j.hit / Math.max(1, kase.baselineZoomGpt.replace(/\s/g, '').length)) * 1000 });
    }
  }
}
const wavg = (rows) => (100 * rows.reduce((a, r) => a + r.judgeHit, 0)) / Math.max(1, rows.reduce((a, r) => a + r.facts, 0));
console.log('\n── 症例の組ごと（独立判定は事実の数で重みづけ）');
for (const [label] of CORPORA) {
  const rows = agg.current.filter((r) => r.corpus === label);
  if (!rows.length) continue;
  const a = (f) => rows.reduce((x, r) => x + f(r), 0) / rows.length;
  console.log(`  ${label}\n     的 ${a((r) => r.targetPct).toFixed(0)}% / 独立判定 ${wavg(rows).toFixed(0)}% / 根拠なし ${a((r) => r.unsupported).toFixed(1)}件 / ${a((r) => r.chars).toFixed(0)}字・${a((r) => r.lines).toFixed(0)}文（S ${a((r) => r.S).toFixed(0)}・O ${a((r) => r.O).toFixed(0)}・A ${a((r) => r.A).toFixed(0)}・P ${a((r) => r.P).toFixed(0)}字）`);
}
const avg = (rows, f) => rows.reduce((a, r) => a + f(r), 0) / Math.max(1, rows.length);
console.log('\n══ 合計（9症例）');
console.log(`  いまの本番  的 ${avg(agg.current, (r) => r.targetPct).toFixed(0)}% / 独立判定 ${wavg(agg.current).toFixed(0)}%（事実の数で重みづけ） / 根拠なし ${avg(agg.current, (r) => r.unsupported).toFixed(1)}件/診察 / 捏造 ${avg(agg.current, (r) => r.fab).toFixed(1)}`);
console.log(`  分量        ${avg(agg.current, (r) => r.chars).toFixed(0)}字 / ${avg(agg.current, (r) => r.lines).toFixed(0)}文（S ${avg(agg.current, (r) => r.S).toFixed(0)}・O ${avg(agg.current, (r) => r.O).toFixed(0)}・A ${avg(agg.current, (r) => r.A).toFixed(0)}・P ${avg(agg.current, (r) => r.P).toFixed(0)}字）  密度 ${avg(agg.current, (r) => r.hitPer1000).toFixed(1)}事実/1000字`);
if (agg.zoom.length) console.log(`  Zoom+GPT（実診療3症例）  的 ${avg(agg.zoom, (r) => r.targetPct).toFixed(0)}% / 独立判定 ${avg(agg.zoom, (r) => r.judgePct).toFixed(0)}% / 根拠なし ${avg(agg.zoom, (r) => r.unsupported).toFixed(1)}件 / ${avg(agg.zoom, (r) => r.chars).toFixed(0)}字・${avg(agg.zoom, (r) => r.lines).toFixed(0)}行 / 密度 ${avg(agg.zoom, (r) => r.hitPer1000).toFixed(1)}事実/1000字`);
const real = agg.current.filter((r) => r.corpus.startsWith('実診療'));
if (real.length) console.log(`  いまの本番（同じ実診療3症例）  的 ${avg(real, (r) => r.targetPct).toFixed(0)}% / 独立判定 ${avg(real, (r) => r.judgePct).toFixed(0)}% / ${avg(real, (r) => r.chars).toFixed(0)}字・${avg(real, (r) => r.lines).toFixed(0)}行 / 密度 ${avg(real, (r) => r.hitPer1000).toFixed(1)}事実/1000字`);
