// 無音・雑音のとき、ヒントを書き写す幻覚が出ないか。本番と同じ判定（isPromptEcho・cleanLiveText）を通す
import { readFileSync } from 'node:fs';
import { composeVocabulary, buildVocabularyPrompt } from '../../dist/modules/medical-knowledge/vocabulary-composer.js';
import { knowledgePackBroadPool } from '../../dist/modules/medical-knowledge/data/load-knowledge-pack.js';
import { cleanLiveText, isPromptEcho } from '../../dist/modules/ai/live-text.js';
const KEY = process.env.OPENAI_API_KEY;
const prompt = buildVocabularyPrompt(composeVocabulary({ patientMedications: ['エンレスト', 'ビソプロロール'], base: knowledgePackBroadPool() }));
console.log('ヒントの長さ', prompt.length, '字');
for (const n of ['silence', 'noise_low', 'noise_mid', 'hum']) {
  let echoed = 0, kept = 0, runs = 5;
  for (let i = 0; i < runs; i++) {
    const form = new FormData();
    form.append('file', new Blob([readFileSync(new URL(`./hall/${n}.wav`, import.meta.url))], { type: 'audio/wav' }), 'a.wav');
    form.append('model', 'gpt-4o-mini-transcribe'); form.append('language', 'ja'); form.append('response_format', 'json'); form.append('prompt', prompt);
    const j = await (await fetch('https://api.openai.com/v1/audio/transcriptions', { method: 'POST', headers: { Authorization: `Bearer ${KEY}` }, body: form })).json();
    const text = (j.text ?? '').trim();
    const c = cleanLiveText(text);
    const raw = text && text.length > 0 && prompt.includes(text.slice(0, 12));
    if (raw) echoed++;
    if (c.keep && !isPromptEcho(c.text, prompt)) kept++;
  }
  console.log(`${n.padEnd(10)} 写し(生) ${echoed}/${runs}  画面に残った ${kept}/${runs}`);
}
