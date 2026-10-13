// 語彙ヒントの選び方。dialogue-run.mjs が使う。
import { readFileSync } from 'node:fs';
import { composeVocabulary, buildVocabularyPrompt, cleanChartTerm } from '../../dist/modules/medical-knowledge/vocabulary-composer.js';
import { knowledgePackBroadPool } from '../../dist/modules/medical-knowledge/data/load-knowledge-pack.js';
import { getDefaultPhoneticMatcher } from '../../dist/modules/medical-knowledge/phonetic-lexicon.js';
import { KnowledgeIndex } from '../../dist/modules/medical-knowledge/knowledge-index.js';
import { buildWhisperPrompt, resolveMedicalGlossary } from '../../dist/providers/ai/medical-glossary.js';

const DATA = new URL('../../src/modules/medical-knowledge/data/', import.meta.url);
const pack = JSON.parse(readFileSync(new URL('medical_os_internal_medicine_knowledge_v2.json', DATA), 'utf8'));
const cur = JSON.parse(readFileSync(new URL('curated-lexicon-v1.json', DATA), 'utf8'));
const BASE = '内科診察の会話。';
const KEY = process.env.OPENAI_API_KEY;

const allNames = new Set([
  ...pack.terms.map((t) => t.canonical_name), ...cur.terms.map((t) => t.canonical_name),
  ...pack.medication_brand_generic.flatMap((b) => [b.brand_name, b.generic_name]),
  ...cur.medication_brand_generic.flatMap((b) => [b.brand_name, b.generic_name]),
]);
const normKey = (s) => s.normalize('NFKC').toLowerCase().replace(/\s/g, '');
const lexKey = new Map([...allNames].map((n) => [normKey(n), n]));

// 広めの固定リスト：標準辞書で優先度が高い薬・病名・検査を広く（特定の台本に合わせていない）
const broadPool = [
  ...pack.terms.filter((t) => t.priority === 'high' && ['medications_generic'].includes(t.category)).map((t) => t.canonical_name),
  ...pack.medication_brand_generic.slice(0, 60).map((b) => b.brand_name),
  ...pack.terms.filter((t) => t.priority === 'high' && t.category === 'diagnoses').map((t) => t.canonical_name),
  ...pack.terms.filter((t) => t.priority === 'high' && t.category === 'laboratory_tests').map((t) => t.canonical_name),
];

function compose({ chart, extra = [], budget = 120 }) {
  const seen = new Set();
  const out = [];
  for (const t of [...(chart?.meds ?? []), ...(chart?.dx ?? []), ...extra, ...broadPool]) {
    const k = normKey(t);
    if (!t || seen.has(k)) continue;
    seen.add(k); out.push(t);
    if (out.length >= budget) break;
  }
  return `${BASE}${out.join('、')}`;
}

async function predictTerms({ chart, heard }) {
  const context = heard.slice(-4).join('\n');
  const sys = '日本の内科外来の診察を聞いている。これまでの会話とカルテから、次の発話で出てきそうな薬の名前（一般名または代表的な商品名）、病名、検査名を最大40個、確度の高い順にJSON配列で返す。説明は書かない。実在する正式な名称だけを書く。';
  const user = `カルテ: 通院中の薬=${(chart.meds ?? []).join('、') || 'なし'} / 病名=${(chart.dx ?? []).join('、') || 'なし'}\nこれまでの会話:\n${context || '（まだ始まったところ）'}`;
  const r = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST', headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'gpt-4o-mini', temperature: 0, response_format: { type: 'json_object' },
      messages: [{ role: 'system', content: sys + ' 出力は {"terms":[...]} の形。' }, { role: 'user', content: user }] }),
  });
  const j = await r.json();
  try { return JSON.parse(j.choices[0].message.content).terms ?? []; } catch { return []; }
}
// 辞書にある語だけ残す（LLMの綴りの間違い・存在しない語を除く）
const inLexicon = (terms) => terms.map((t) => lexKey.get(normKey(String(t)))).filter(Boolean);

export const DIALOGUE_STRATEGIES = [
  { id: 'S0', name: 'ヒントなし', prompt: null },
  { id: 'S1', name: '現行（固定・約40語）', prompt: () => buildWhisperPrompt(resolveMedicalGlossary()) },
  { id: 'S2', name: '広い固定リスト120語', prompt: () => compose({ chart: null }) },
  { id: 'S3', name: 'カルテ＋広い固定リスト120語', prompt: ({ dialogue }) => compose({ chart: dialogue.chart }) },
  {
    id: 'S4', name: 'カルテ＋会話の流れの予測＋固定120語',
    prompt: async ({ dialogue, heard }) => {
      const predicted = inLexicon(await predictTerms({ chart: dialogue.chart, heard }));
      return compose({ chart: dialogue.chart, extra: predicted });
    },
  },
];

// 本番と同じ部品（dist）で組み立てた方式：カルテ＋会話に出た語＋固定リスト、聞き取り後に音の近い語を補正
const idx = KnowledgeIndex.fromSeed();
const broad = knowledgePackBroadPool();
const mentionedIn = (text) => idx.findSurfacesInText(text).flatMap((h) => {
  const b = h.hits.find((x) => ['medication', 'diagnosis', 'laboratory_test'].includes(x.category));
  return b ? [b.canonicalName, h.surface] : [];
});
const prodPrompt = ({ dialogue, heard }) => buildVocabularyPrompt(composeVocabulary({
  patientMedications: dialogue.chart.meds.map(cleanChartTerm).filter(Boolean),
  patientDiagnoses: dialogue.chart.dx,
  mentioned: mentionedIn(heard.slice(-8).join('\n')),
  base: broad,
}));
const prodPost = (text, { dialogue, heard }) => getDefaultPhoneticMatcher().correct(text, [...dialogue.chart.meds, ...mentionedIn(heard.join('\n'))]).text;
DIALOGUE_STRATEGIES.push(
  { id: 'P1', name: '本番方式（ヒントのみ）', prompt: prodPrompt },
  { id: 'P2', name: '本番方式＋音の近い語の補正', prompt: prodPrompt, post: prodPost },
);
