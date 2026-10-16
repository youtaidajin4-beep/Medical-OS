/**
 * 合成音声 → 診察中のリアルタイム経路（実際のSOAPの材料になる経路）→ 本番と同じ補正 → SOAP の通し測定。
 *
 *   OPENAI_API_KEY=... npx ts-node eval/realistic/run-live.ts [試行回数] [--retranscribe]
 *
 * 画面（frontend/lib/live-pcm.ts）と同じ規則で声の切れ目ごとに区間へ切り、1区間ずつ
 * gpt-4o-mini-transcribe ＋ 語彙ヒントで文字にする。語彙ヒント・ゴミ除去・同音補正・音の近い語の補正・
 * 話者の判別は本番のコードをそのまま呼ぶ。そのあと ai-pipeline.service.ts と同じ順で
 * 辞書の同音補正 → 医療知識層 → LLM校正 → 検査名の捏造ガード を通し、SOAPの的で採点する。
 *
 * 再診の2本は、通院中の患者として、カルテの薬（定時薬）を語彙ヒントの最優先に入れる（本番のカルテ連動と同じ）。
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { formatSpeakerPrefixedTranscript, numberTranscriptLines, redistributeCorrectedLines } from '../../src/providers/ai/speaker-role-mapper';
import { resolveMedicalGlossary } from '../../src/providers/ai/medical-glossary';
import { correctMedicalTerms } from '../../src/providers/ai/medical-term-corrector';
import { correctTranscriptWithKnowledge } from '../../src/modules/medical-knowledge/transcript-knowledge-corrector';
import { KnowledgeIndex } from '../../src/modules/medical-knowledge/knowledge-index';
import { rejectInventedExams } from '../../src/modules/medical-knowledge/invented-exam-guard';
import { OpenAiLlmProvider } from '../../src/providers/ai/openai-llm.provider';
import { OpenAiSttProvider } from '../../src/providers/ai/openai-stt.provider';
import { knowledgePackBroadPool } from '../../src/modules/medical-knowledge/data/load-knowledge-pack';
import { buildVocabularyPrompt, composeVocabulary } from '../../src/modules/medical-knowledge/vocabulary-composer';
import { getDefaultPhoneticMatcher } from '../../src/modules/medical-knowledge/phonetic-lexicon';
import { capSentences, cleanLiveText, isPromptEcho, mergeLiveRows, splitSentences } from '../../src/modules/ai/live-text';

const HERE = __dirname;
const ROOT = join(HERE, '..', '..', '..', '..');
const AUDIO = join(ROOT, '.local', 'verification-audio', 'realistic');
const CACHE = join(AUDIO, 'live');
const KEY = process.env.OPENAI_API_KEY;
if (!KEY) { console.error('OPENAI_API_KEY が要ります'); process.exit(1); }
const TRIALS = process.argv.find((a) => /^\d+$/.test(a)) ?? '3';
mkdirSync(CACHE, { recursive: true });

const cases = JSON.parse(execFileSync('python3', [join(HERE, 'scripts.py'), 'cases'], { encoding: 'utf8' }));
const terms: Record<string, string[]> = JSON.parse(execFileSync('python3', [join(HERE, 'scripts.py'), 'terms'], { encoding: 'utf8' }));
/** 再診の患者のカルテにある薬（通院中。初診は空） */
const CHART: Record<string, string[]> = {
  'r1-first-visit': [],
  'r2-care-opinion': ['アムロジピン', 'フロセミド', 'ドネペジル'],
  'r3-routine': ['メトホルミン', 'アムロジピン'],
};

// ── 画面と同じ切り方（frontend/lib/live-pcm.ts の DEFAULT_CUTTER） ──
const CUT = { minMs: 1500, maxMs: 6000, silenceMs: 400, speechRms: 0.012, preRollMs: 300, minSpeechMs: 240, minSpeechRatio: 0.12 };
const SR = 16000, FRAME = 320; // 20ms

function pcmOf(path: string): Int16Array {
  const buf = execFileSync(process.env.HOME + '/.local/bin/ffmpeg', ['-v', 'error', '-i', path, '-f', 's16le', '-ac', '1', '-ar', String(SR), '-'], { maxBuffer: 1 << 29 });
  return new Int16Array(buf.buffer, buf.byteOffset, buf.byteLength / 2);
}
function cut(pcm: Int16Array): Array<{ startMs: number; endMs: number; pcm: Int16Array }> {
  const out: Array<{ startMs: number; endMs: number; pcm: Int16Array }> = [];
  let segStart = -1, hasSpeech = false, silenceRun = 0, speechFrames = 0, frames = 0;
  const nFrames = Math.floor(pcm.length / FRAME);
  const flush = (endFrame: number) => {
    const ms = frames * 20;
    if (segStart >= 0 && speechFrames * 20 >= CUT.minSpeechMs && speechFrames / Math.max(1, frames) >= CUT.minSpeechRatio) {
      const pre = Math.max(0, segStart - CUT.preRollMs / 20);
      out.push({ startMs: pre * 20, endMs: endFrame * 20, pcm: pcm.slice(pre * FRAME, endFrame * FRAME) });
    }
    void ms; segStart = -1; hasSpeech = false; silenceRun = 0; speechFrames = 0; frames = 0;
  };
  for (let f = 0; f < nFrames; f++) {
    let s = 0;
    for (let i = f * FRAME; i < (f + 1) * FRAME; i++) { const v = (pcm[i] as number) / 32768; s += v * v; }
    const rms = Math.sqrt(s / FRAME);
    const speech = rms >= CUT.speechRms;
    if (segStart < 0) { if (!speech) continue; segStart = f; }
    frames++;
    if (speech) { hasSpeech = true; silenceRun = 0; speechFrames++; } else silenceRun += 20;
    const ms = frames * 20;
    if ((ms >= CUT.minMs && hasSpeech && silenceRun >= CUT.silenceMs) || ms >= CUT.maxMs) flush(f + 1);
  }
  if (segStart >= 0) flush(nFrames);
  return out;
}
function wav(p: Int16Array): Buffer {
  const data = Buffer.from(p.buffer, p.byteOffset, p.byteLength);
  const h = Buffer.alloc(44);
  h.write('RIFF', 0); h.writeUInt32LE(36 + data.length, 4); h.write('WAVEfmt ', 8); h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(1, 22);
  h.writeUInt32LE(SR, 24); h.writeUInt32LE(SR * 2, 28); h.writeUInt16LE(2, 32); h.writeUInt16LE(16, 34); h.write('data', 36); h.writeUInt32LE(data.length, 40);
  return Buffer.concat([h, data]);
}

const norm = (s: string) => s.replace(/[\s、。，．・]/g, '');
const hit = (text: string, accept: string[]) => accept.some((a) => norm(text).includes(norm(a)));

(async () => {
  const stt = new OpenAiSttProvider({ apiKey: KEY, conversationModel: process.env.OPENAI_LIVE_STT_MODEL ?? 'gpt-4o-mini-transcribe' } as never);
  const llm = new OpenAiLlmProvider({ apiKey: KEY, model: 'gpt-4o-mini' } as never);
  const glossary = resolveMedicalGlossary();
  const index = KnowledgeIndex.fromSeed();
  const base = knowledgePackBroadPool();
  const phon = getDefaultPhoneticMatcher();
  const stat: Record<string, { raw: number; fin: number; total: number; lost: string[]; segs: number }> = {};

  async function liveRows(id: string) {
    const cache = join(CACHE, `${id}.json`);
    if (existsSync(cache) && !process.argv.includes('--retranscribe')) return JSON.parse(readFileSync(cache, 'utf8')) as Array<{ text: string; speaker: string; startMs: number; endMs: number }>;
    const segs = cut(pcmOf(join(AUDIO, `${id}.mp3`)));
    const rows: Array<{ text: string; speaker: string; startMs: number; endMs: number }> = [];
    const recent: string[] = [];
    for (const seg of segs) {
      const mentioned = (() => {
        const t = recent.slice(-8).join('\n');
        if (!t.trim()) return [] as string[];
        const out: string[] = [];
        for (const h of index.findSurfacesInText(t)) {
          const best = h.hits.find((x) => ['medication', 'diagnosis', 'laboratory_test', 'imaging', 'procedure'].includes(x.category));
          if (best) out.push(h.surface === best.canonicalName ? h.surface : best.canonicalName, h.surface);
        }
        return out;
      })();
      const vocab = composeVocabulary({ patientMedications: CHART[id], mentioned, base });
      const prompt = buildVocabularyPrompt(vocab);
      const preferred = [...(CHART[id] ?? []), ...mentioned];
      let cleaned = cleanLiveText(await stt.transcribeConversation(wav(seg.pcm), { vocabularyPrompt: prompt }));
      if (cleaned.keep && isPromptEcho(cleaned.text, prompt)) {
        cleaned = cleanLiveText(await stt.transcribeConversation(wav(seg.pcm), {}));
        if (cleaned.keep && isPromptEcho(cleaned.text, prompt)) cleaned = { keep: false, reason: 'prompt-echo' };
      }
      if (!cleaned.keep) continue;
      const homophone = correctMedicalTerms(cleaned.text, glossary).text;
      const text = phon.correct(homophone, preferred).text;
      const sentences = capSentences(splitSentences(text));
      const labels = await llm.labelSpeakers(sentences, recent.slice(-6));
      sentences.forEach((s, i) => {
        const sp = labels[i] ?? 'unknown';
        rows.push({ text: s, speaker: sp, startMs: seg.startMs, endMs: seg.endMs });
        recent.push(`${sp === 'physician' ? '医師' : sp === 'patient' ? '患者' : '不明'}: ${s}`);
      });
    }
    writeFileSync(cache, JSON.stringify(rows));
    return rows;
  }

  const results = await Promise.all(cases.map(async (c: { id: string; transcript?: string; baselineZoomGpt?: string }) => ({ c, rows: await liveRows(c.id) })));
  for (const { c, rows } of results) {
    const turns = mergeLiveRows(rows.map((r: { text: string; speaker: string; startMs: number; endMs: number }) => ({ text: r.text, speaker: r.speaker, startMs: r.startMs, endMs: r.endMs })));
    let texts = turns.map((t) => t.text);
    const speakers: string[] = turns.map((t) => String(t.speaker));
    const rawJoined = texts.join('\n');
    const dict = correctMedicalTerms(texts.join('\n'), glossary);
    texts = redistributeCorrectedLines(texts, dict.text);
    const know = correctTranscriptWithKnowledge(texts.join('\n'), index, { medications: glossary.drugNames ?? [], diagnoses: glossary.diagnoses ?? [] });
    texts = redistributeCorrectedLines(texts, know.correctedText);
    const before = texts;
    const llmOut = await llm.correctTranscript(numberTranscriptLines(texts), glossary as never, c.id);
    const guarded = rejectInventedExams(before, redistributeCorrectedLines(before, llmOut), index);
    texts = guarded.texts;
    const finalJoined = texts.join('\n');

    const list = terms[c.id] ?? [];
    const s = (stat[c.id] = { raw: 0, fin: 0, total: list.length, lost: [] as string[], segs: rows.length });
    for (const t of list) {
      const accept = t.split('|');
      if (hit(rawJoined, accept)) s.raw++;
      if (hit(finalJoined, accept)) s.fin++; else s.lost.push(accept[0] ?? t);
    }
    c.transcript = formatSpeakerPrefixedTranscript(turns.map((t, i) => ({ text: texts[i] ?? t.text, speaker: speakers[i] })));
    c.baselineZoomGpt = '';
  }

  console.log('── 診察中の経路：薬名・病名・数字の聞き取り（台本の語が文字に残った数 / 全体）');
  for (const [id, s] of Object.entries(stat)) {
    console.log(`   ${id}: 生 ${s.raw}/${s.total} → 補正後（本番の最終）${s.fin}/${s.total}  文${s.segs}  最終で無い語: ${s.lost.join('、') || '—'}`);
  }
  const out = join(HERE, '..', 'soap-corpus', 'cases-realistic-live.json');
  writeFileSync(out, JSON.stringify({ source: '合成音声→診察中の経路→本番と同じ補正（run-live.ts）', cases }, null, 1));
  console.log('\n── SOAP（診察中の経路の文字から）');
  const r = spawnSync('node', [join(HERE, '..', 'run-soap-coverage-eval.mjs'), TRIALS, '--only', 'after'], { env: { ...process.env, EVAL_CORPUS: out }, stdio: 'inherit' });
  process.exit(r.status ?? 0);
})();
