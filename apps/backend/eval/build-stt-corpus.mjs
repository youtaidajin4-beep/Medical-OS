/**
 * 音声認識の誤変換を、正解つきで集める。
 *
 * **作り直すと前の結果と比べられなくなる。** 音声認識は同じ音声でも毎回わずかに
 * 違う結果を返すので、走らせるたびに問題が入れ替わる。実際、辞書の効果を測っている
 * 途中で作り直してしまい、「回復率 33%→42%」という差が次の回では消えた（2026-09-21）。
 * cases.json は**一度作ったら固定**して、条件の比較はその上で行う。
 * 作り直すときは --rebuild を明示的に付ける。
 *
 * 校正の精度を「良くなった」と言うには、正解のある問題が要る。手で誤変換を
 * 考えて作ると、直しやすい問題ばかりになって当てにならない。ここでは
 * **台本を読み上げさせて、本番と同じ文字起こしにかけ、台本と食い違ったところ**
 * を問題にする。正解は台本そのもの。
 *
 * 限界は corpus の limits に書いてある。合成音声なので実際の診察室の音とは違う。
 * 谷口先生の実音声が手に入ったら、そちらへ差し替える。
 *
 * 使い方:
 *   OPENAI_API_KEY=... node eval/build-stt-corpus.mjs
 *   → eval/stt-corpus/cases.json を書き出す
 */
import { execFile } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { KnowledgeIndex } from '../dist/modules/medical-knowledge/knowledge-index.js';

const run = promisify(execFile);
const HERE = dirname(fileURLToPath(import.meta.url));
const CORPUS = join(HERE, 'stt-corpus');
const AUDIO = join(CORPUS, 'audio');

const VOICES = {
  doctor: 'Rocko (日本語（日本）)',
  patient: 'Grandpa (日本語（日本）)',
};

const KEY = process.env.OPENAI_API_KEY;
if (!KEY) {
  console.error('OPENAI_API_KEY が要ります');
  process.exit(1);
}

/** 本番と同じ文字起こし。語彙ヒントは渡さない（渡すと誤変換が減って問題が集まらない） */
async function transcribe(path) {
  const form = new FormData();
  form.append('file', new Blob([readFileSync(path)], { type: 'audio/mpeg' }), 'a.mp3');
  form.append('model', 'gpt-4o-transcribe');
  form.append('language', 'ja');
  form.append('response_format', 'json');
  const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${KEY}` },
    body: form,
  });
  const json = await res.json();
  if (json.error) throw new Error(json.error.message);
  return (json.text ?? '').trim();
}

/** 句点で割って、台本の文と文字起こしの文を並べる */
function splitSentences(text) {
  return text
    .split(/(?<=。)/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * 採点の的を決める。
 *
 * 行がまるごと一致するかで採点すると、**直す必要のない違いまで減点してしまう**。
 * 「五ミリグラム」→「5mg」や「つらい」→「辛い」は音声認識が正しく書いただけで、
 * 校正に戻させてはいけない。最初にそれで数えたら、26件中6件が誤って採点対象に
 * 入っていた（2026-09-21）。
 *
 * そこで的を**失われた医療用語**に置く。台本には出てくるのに認識結果から消えている
 * 辞書の語を探し、その語が校正後に戻っているかだけを見る。表記の違いは的から外れる。
 *
 * 辞書に無い語（溶連菌迅速検査など）は的にできない。それは**辞書の穴**であって、
 * 見つかったら辞書に足す。ここで黙って捨てると穴が見えなくなるので、
 * untargetable として書き出す。
 */
/** 表記の問題でしかない種類は的にしない（単位・用量・数値・日付など） */
const NOT_A_TARGET = new Set([
  'unit', 'dosage', 'strength', 'frequency', 'duration', 'route',
  'date', 'negation', 'treatment_action', 'laboratory_value',
]);

/** 数字・単位・英字の書き方だけの違いか */
const NOTATION_CHARS = /[0-9０-９〇一二三四五六七八九十百千万点\.．%％、]/g;
const NOTATION_WORDS = /ミリグラム|ミリ|グラム|パーセント|ケ月|ヶ月|か月|プラス|[a-zA-Zα-ωΑ-Ω-]/g;
const KANA_KANJI_PAIRS = [['つらい', '辛い'], ['胸やけ', '胸焼け']];

function stripNotation(text) {
  let out = text;
  for (const [a, b] of KANA_KANJI_PAIRS) out = out.split(a).join(b);
  return out.replace(NOTATION_WORDS, '').replace(NOTATION_CHARS, '');
}

/**
 * その文に出てくる辞書の語を、別名も正規名に寄せて集める。
 * 正規名とその別名の両方を返す（回復したかを別名でも判定できるように）
 */
function termsIn(text, index) {
  const map = new Map();
  for (const surface of index.findSurfacesInText(text)) {
    for (const hit of surface.hits) {
      if (NOT_A_TARGET.has(hit.category)) continue;
      const forms = map.get(hit.canonicalName) ?? new Set([hit.canonicalName]);
      forms.add(surface.surface);
      forms.add(hit.matchAlias);
      map.set(hit.canonicalName, forms);
    }
  }
  return map;
}

/**
 * 台本にあって認識結果から消えた医療用語。
 *
 * **両側とも別名を正規名に寄せてから比べる。** 寄せずに文字で比べると、
 * 「エリキュース」を認識できているのに正規名「アピキサバン」が無いだけで
 * 失われた扱いになり、直しようのない問題を採点に入れてしまう（実際に入った）。
 *
 * 戻ったかの判定に使うため、**その語のどの書き方でも可**とする別名一覧も返す。
 * 「ムコダイン」と「カルボシステイン」は同じ薬なので、どちらかが戻れば回復。
 */
function findLostTerms(expected, heard, index) {
  const want = termsIn(expected, index);
  const got = termsIn(heard, index);
  const lost = [];
  for (const [canonical, forms] of want) {
    if (got.has(canonical)) continue;
    // 別名のどれかが認識結果に出ていれば失われていない
    if ([...forms].some((f) => heard.includes(f))) continue;
    lost.push({ canonical, accept: [...forms] });
  }
  return lost;
}

/**
 * 問題の種類を決める。
 *
 * - scorable       … 失われた医療用語がある。校正で戻せるはずのもの
 * - notation       … 数字・単位・かな漢字の書き方だけが違う。**直させてはいけない**
 *                    ので、変えないことを確かめる対照に使う
 * - dictionary-gap … 本物の誤変換なのに辞書に語が無くて的にできない。
 *                    対照には使わない（直すのが正しいので、変えても改悪ではない）。
 *                    **辞書へ足すべき語の一覧として使う**
 */
function classify(lost, expected, heard) {
  if (lost.length) return 'scorable';
  return stripNotation(expected) === stripNotation(heard) ? 'notation' : 'dictionary-gap';
}

async function main() {
  const casesPath = join(CORPUS, 'cases.json');
  if (existsSync(casesPath) && !process.argv.includes('--rebuild')) {
    const existing = JSON.parse(readFileSync(casesPath, 'utf8'));
    console.log(
      `cases.json は既にあります（${existing.cases.length}件・${existing.generated}）。\n` +
        '作り直すと前の測定と比べられなくなります。作り直すなら --rebuild を付けてください。',
    );
    return;
  }
  mkdirSync(AUDIO, { recursive: true });
  const { scripts, ...meta } = JSON.parse(
    readFileSync(join(CORPUS, 'scripts.json'), 'utf8'),
  );

  const index = KnowledgeIndex.fromSeed();
  const cases = [];
  for (const script of scripts) {
    const aiff = join(AUDIO, `${script.id}.aiff`);
    const mp3 = join(AUDIO, `${script.id}.mp3`);
    if (!existsSync(mp3)) {
      await run('say', ['-v', VOICES[script.voice] ?? VOICES.doctor, '-o', aiff, script.text]);
      await run('ffmpeg', [
        '-loglevel', 'error', '-y', '-i', aiff,
        '-ar', '16000', '-ac', '1', '-c:a', 'libmp3lame', '-b:a', '64k', mp3,
      ]);
    }
    const heard = await transcribe(mp3);
    const expected = splitSentences(script.text);
    const got = splitSentences(heard);

    // 文の数が合うときだけ問題にする。ずれた台本は数え方が変わるので捨てる
    if (expected.length !== got.length) {
      console.warn(`× ${script.id}: 文の数が合わない（台本${expected.length} / 認識${got.length}）ため除外`);
      continue;
    }
    expected.forEach((want, i) => {
      const heardLine = got[i];
      if (heardLine === want) return;
      const lost = findLostTerms(want, heardLine, index);
      cases.push({
        id: `${script.id}-${i + 1}`,
        area: script.area,
        voice: script.voice,
        kind: classify(lost, want, heardLine),
        targets: lost,
        heard: heardLine,
        expected: want,
      });
    });
    console.log(`○ ${script.id}: ${expected.filter((w, i) => w !== got[i]).length}/${expected.length} 文が食い違い`);
  }

  const out = {
    ...meta,
    generated: new Date().toISOString().slice(0, 10),
    sttModel: 'gpt-4o-transcribe',
    note: '正解は台本そのもの。heard は語彙ヒント無しで文字起こしした結果。',
    cases,
  };
  writeFileSync(join(CORPUS, 'cases.json'), JSON.stringify(out, null, 2) + '\n');
  const count = (kind) => cases.filter((c) => c.kind === kind).length;
  const targets = cases.flatMap((c) => c.targets.map((t) => t.canonical));
  console.log(
    `\n食い違い ${cases.length} 件 … 採点対象 ${count('scorable')} / 対照(表記ゆれ) ${count('notation')} / 辞書の穴 ${count('dictionary-gap')}`,
  );
  console.log(`失われた医療用語 ${targets.length} 件: ${[...new Set(targets)].join('、')}`);
  const gaps = cases.filter((c) => c.kind === 'dictionary-gap');
  if (gaps.length) {
    console.log('\n辞書に無いために的にできなかった誤変換:');
    for (const g of gaps) console.log(`  ${g.heard}\n  ← ${g.expected}`);
  }
  console.log('eval/stt-corpus/cases.json に書き出しました');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
