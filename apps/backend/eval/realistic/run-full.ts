/**
 * 合成音声 → 本番と同じ全段 → SOAP の通し測定。
 *
 *   OPENAI_API_KEY=... npx ts-node eval/realistic/run-full.ts [試行回数] [--retranscribe]
 *
 * 本番の録音全体の経路（ai-pipeline.service.ts）と同じ順で通す:
 *   話者分離つき文字起こし → 話者の役割づけ(mapSpeakerRoles) → 辞書の同音補正(correctMedicalTerms)
 *   → 医療知識層(correctTranscriptWithKnowledge) → LLM校正(番号つき) → 検査名の捏造ガード → SOAP
 *
 * run-e2e.mjs は補正の段を飛ばすので、薬名の聞き違いを実際より重く数える。ここでは段ごとに、
 * 台本の薬名・病名が「聞き取れたか／補正で戻ったか」も数える（的は scripts.py の TERMS）。
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { mapSpeakerRoles, formatSpeakerPrefixedTranscript, numberTranscriptLines, redistributeCorrectedLines } from '../../src/providers/ai/speaker-role-mapper';
import { resolveMedicalGlossary } from '../../src/providers/ai/medical-glossary';
import { correctMedicalTerms } from '../../src/providers/ai/medical-term-corrector';
import { correctTranscriptWithKnowledge } from '../../src/modules/medical-knowledge/transcript-knowledge-corrector';
import { KnowledgeIndex } from '../../src/modules/medical-knowledge/knowledge-index';
import { rejectInventedExams } from '../../src/modules/medical-knowledge/invented-exam-guard';
import { OpenAiLlmProvider } from '../../src/providers/ai/openai-llm.provider';

const HERE = __dirname;
const ROOT = join(HERE, '..', '..', '..', '..');
const AUDIO = join(ROOT, '.local', 'verification-audio', 'realistic');
const CACHE = join(AUDIO, 'transcripts');
const KEY = process.env.OPENAI_API_KEY;
if (!KEY) { console.error('OPENAI_API_KEY が要ります'); process.exit(1); }
const TRIALS = process.argv.find((a) => /^\d+$/.test(a)) ?? '3';
mkdirSync(CACHE, { recursive: true });

const cases = JSON.parse(execFileSync('python3', [join(HERE, 'scripts.py'), 'cases'], { encoding: 'utf8' }));
const terms: Record<string, string[]> = JSON.parse(execFileSync('python3', [join(HERE, 'scripts.py'), 'terms'], { encoding: 'utf8' }));

async function diarize(id: string) {
  const cache = join(CACHE, `${id}.json`);
  if (existsSync(cache) && !process.argv.includes('--retranscribe')) return JSON.parse(readFileSync(cache, 'utf8'));
  const form = new FormData();
  form.append('model', 'gpt-4o-transcribe-diarize');
  form.append('response_format', 'diarized_json');
  form.append('chunking_strategy', 'auto');
  form.append('file', new Blob([readFileSync(join(AUDIO, `${id}.mp3`))], { type: 'audio/mpeg' }), `${id}.mp3`);
  const res = await fetch('https://api.openai.com/v1/audio/transcriptions', { method: 'POST', headers: { Authorization: `Bearer ${KEY}` }, body: form });
  if (!res.ok) throw new Error(`${id} ${res.status} ${await res.text()}`);
  const j = await res.json();
  writeFileSync(cache, JSON.stringify(j));
  return j;
}

const norm = (s: string) => s.replace(/[\s、。，．・]/g, '');
const hit = (text: string, accept: string[]) => accept.some((a) => norm(text).includes(norm(a)));

(async () => {
  const llm = new OpenAiLlmProvider({ apiKey: KEY, model: 'gpt-4o-mini' } as never);
  const glossary = resolveMedicalGlossary();
  const index = KnowledgeIndex.fromSeed();
  const stat: Record<string, { raw: number; dict: number; know: number; llm: number; total: number; lost: string[] }> = {};

  for (const c of cases) {
    const j = await diarize(c.id);
    const raw = (j.segments ?? []).map((s: { text: string; speaker?: string; start?: number; end?: number }) => ({
      text: (s.text ?? '').trim(), speaker: 'unknown' as const, diarizationLabel: (s.speaker ?? '').trim() || undefined,
      startMs: Math.round((s.start ?? 0) * 1000), endMs: Math.round((s.end ?? 0) * 1000),
    })).filter((s: { text: string }) => s.text);
    const withRoles = await mapSpeakerRoles(raw);
    let texts: string[] = withRoles.map((s) => s.text);
    const rawJoined = texts.join('\n');

    const dict = correctMedicalTerms(texts.join('\n'), glossary);
    texts = redistributeCorrectedLines(texts, dict.text);
    const afterDict = texts.join('\n');

    const know = correctTranscriptWithKnowledge(texts.join('\n'), index, { medications: glossary.drugNames ?? [], diagnoses: glossary.diagnoses ?? [] });
    texts = redistributeCorrectedLines(texts, know.correctedText);
    const afterKnow = texts.join('\n');

    const before = texts;
    const llmOut = await llm.correctTranscript(numberTranscriptLines(texts), glossary as never, c.id);
    const redis = redistributeCorrectedLines(before, llmOut);
    const guarded = rejectInventedExams(before, redis, index);
    texts = guarded.texts;
    const afterLlm = texts.join('\n');

    const list = terms[c.id] ?? [];
    const s = (stat[c.id] = { raw: 0, dict: 0, know: 0, llm: 0, total: list.length, lost: [] as string[] });
    for (const t of list) {
      const accept = t.split('|');
      if (hit(rawJoined, accept)) s.raw++;
      if (hit(afterDict, accept)) s.dict++;
      if (hit(afterKnow, accept)) s.know++;
      if (hit(afterLlm, accept)) s.llm++; else s.lost.push(accept[0] ?? t);
    }
    const spk = [...new Set(withRoles.map((x) => x.speaker))].join('/');
    console.log(`${c.id}: 話者=${spk} 行=${texts.length} 辞書補正${dict.replacements.length}件 知識層${know.automaticCorrectionCount}件`);
    c.transcript = formatSpeakerPrefixedTranscript(withRoles.map((x, i) => ({ text: texts[i] ?? x.text, speaker: x.speaker })));
    c.baselineZoomGpt = '';
  }

  console.log('\n── 薬名・病名・数字の聞き取り（台本の語が文字に残った数 / 全体）');
  console.log('   段:  生の文字起こし → 辞書補正 → 知識層 → LLM校正（本番の最終）');
  for (const [id, s] of Object.entries(stat)) {
    console.log(`   ${id}: ${s.raw}/${s.total} → ${s.dict} → ${s.know} → ${s.llm}   最終で無い語: ${s.lost.join('、') || '—'}`);
  }

  const out = join(HERE, '..', 'soap-corpus', 'cases-realistic-full.json');
  writeFileSync(out, JSON.stringify({ source: '合成音声→本番と同じ全段（run-full.ts）', cases }, null, 1));
  console.log('\n── SOAP（本番の全段を通した文字起こしから）');
  const r = spawnSync('node', [join(HERE, '..', 'run-soap-coverage-eval.mjs'), TRIALS, '--only', 'after'], { env: { ...process.env, EVAL_CORPUS: out }, stdio: 'inherit' });
  process.exit(r.status ?? 0);
})();
