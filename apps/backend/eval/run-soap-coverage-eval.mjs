/**
 * 「会話したボリュームに対して転記が乏しい」を、数字で確かめる。
 *
 * 2026-09-30、谷口先生が同じ日にアプリとZoomを使って比較され、
 * 「zoomの文字起こしもアプリと大差ない。文字起こしを要約に持ってくる際の精度の違い」
 * と書かれた。文字起こしが同等なら、**文字起こしを入力に固定して要約以降だけを比べれば**、
 * どこでどれだけ落ちているかがそのまま出る。この道具はそれを測る。
 *
 * 測るもの:
 *   転記率 … 会話に出てきた事実のうち、SOAPに現れた割合。高いほど良い
 *   捏造   … 言われていないのに書かれたもの（血圧値・していない所見）。0であるべき
 *
 * 並べる条件:
 *   before    … 9/30時点の作り（9項目の短句だけを渡し、SOAPを書く側に原文を見せない）
 *   after     … 今の作り（欄を増やし、SOAPを書く側にも文字起こしを渡す）
 *   zoom+gpt  … 先生がZoom要約をGPTでSOAPにしたもの（満足度50〜60%と評価されたもの）
 *               APIを呼ばずに採点できるので、常に基準線として出る
 *
 * 使い方:
 *   OPENAI_API_KEY=... node eval/run-soap-coverage-eval.mjs [試行回数] [--only after]
 *
 * 読み方:
 *   ばらつきが条件差より大きいときは、その差を根拠にしない。
 *   「zoom+gpt を超えたか」が、先生に出してよいかどうかの最低線。
 */
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const CORPUS = join(HERE, 'soap-corpus', 'cases.json');

if (!existsSync(CORPUS)) {
  console.error(
    `${CORPUS} がありません。eval/soap-corpus/README.md のとおりに用意してください（実診療の記録なのでリポジトリには入っていません）。`,
  );
  process.exit(1);
}

const TRIALS = Number(process.argv.find((a) => /^\d+$/.test(a)) ?? 3);
const onlyIdx = process.argv.indexOf('--only');
const ONLY = onlyIdx >= 0 ? process.argv[onlyIdx + 1] : null;

const KEY = process.env.OPENAI_API_KEY;
const corpus = JSON.parse(readFileSync(CORPUS, 'utf8'));

/** 出荷しているプロンプトをそのまま測る。ここをコピーすると、直したのに古い文を測ることになる */
const SRC = readFileSync(
  join(HERE, '..', 'src', 'providers', 'ai', 'openai-llm.provider.ts'),
  'utf8',
);
/** バッククォートで囲まれた定数の中身を、ソースからそのまま切り出す */
function pluck(name) {
  const marker = `const ${name} = \``;
  const from = SRC.indexOf(marker);
  if (from < 0) throw new Error(`${name} を openai-llm.provider.ts から取り出せませんでした`);
  const start = from + marker.length;
  const end = SRC.indexOf('`;', start);
  if (end < 0) throw new Error(`${name} の終わりが見つかりませんでした`);
  return SRC.slice(start, end);
}
const EXTRACTION_SYSTEM = pluck('EXTRACTION_SYSTEM');
const EXTRACTION_SCHEMA = pluck('EXTRACTION_SCHEMA');
const SOAP_SYSTEM = pluck('SOAP_SYSTEM');

/**
 * 9/30 時点の作り。直す前の数字を出すためだけに残す。
 * 本番のソースから消えた文なので、ここに貼ってある以上は「当時こうだった」という記録でもある。
 */
const BEFORE_EXTRACTION_SYSTEM = `あなたは日本のクリニック向け医療情報抽出アシスタントです。
文字起こしに明示されている事実のみを抽出してください。
推測・診断の追加・処方の創作・検査値の捏造は禁止です。
各フィールドは短い事実句のみ（例: 「発熱38.0℃」「咳3日」「右下肺 wheeze」）。
「認めます」「疑いです」「考えます」などの説明文・診断作文は書かない。
不明な項目は省略するか、薬剤名に「（要確認）」を付けてください。
出力は有効なJSONのみとします。`;
const BEFORE_EXTRACTION_SCHEMA = `{
  "chiefComplaint": "string (optional) — 短い事実のみ",
  "presentIllness": "string (optional) — 期間・症状の事実列挙",
  "pastHistory": "string (optional)",
  "medications": ["string"] (optional),
  "allergies": ["string"] (optional),
  "vitals": "string (optional) — 例: BP 128/78, 体温38.0℃",
  "physicalExam": "string (optional) — 所見の短句列挙",
  "assessment": "string (optional) — 医師が述べた病名/印象の短句のみ。散文・疑い作文禁止",
  "plan": "string (optional) — 処方名・方針の短句のみ"
}`;
const BEFORE_SOAP_SYSTEM = `あなたは日本のクリニック向けSOAP作成アシスタントです。
検証済みの構造化診療データと、指定された定型床（テンプレート）のみからSOAPを作成します。

厳守:
- 事実の最小抽出のみ。説明文・診断作文は禁止（「認めます」「疑いです」「考えます」「印象です」等を使わない）
- 各欄は短い事実句（例: 「発熱38.0℃」「咳3日」「右下肺 wheeze」「ムコダイン継続」）。1行1事実を基本とする
- データにない情報・検査・診断を追加しない
- 定型床は「変化がないときの下書き」。構造化データに具体事実があれば床を上書きする
- 通常診察(ROUTINE)で差分がなければ assessment=stable / plan=定時薬を継続する。 を使う
- 出力は次の4キーのみ。各値は必ずプレーンテキストの文字列（ネストしたオブジェクト不可）:
subjective, objective, assessment, plan`;

/** 本番と同じ床（soap-templates.ts）。ずれると条件が変わるので、こちらも読み出す */
const TEMPLATES_SRC = readFileSync(
  join(HERE, '..', 'src', 'providers', 'ai', 'soap-templates.ts'),
  'utf8',
);
const ROUTINE_FLOOR = {
  subjective: '体調変わりない。',
  objective: '脈拍異常なし。貧血・黄疸なし。心音・呼吸音異常なし。',
  assessment: 'stable',
  plan: '定時薬を継続する。',
};
if (!TEMPLATES_SRC.includes(ROUTINE_FLOOR.plan)) {
  console.warn('⚠ soap-templates.ts の床が変わっています。eval の床も合わせてください。');
}

/**
 * 2026-10-01 時点の単価（USD / 1Mトークン）。
 * 精度を上げる案は、必ず「いくら上がるか」と一緒に出す。
 */
const PRICE = {
  'gpt-4o': { in: 2.5, out: 10 },
  'gpt-4o-mini': { in: 0.15, out: 0.6 },
};
const JPY_PER_USD = 155;
let costUsd = 0;
let callCount = 0;

/**
 * 抽出に使うモデル。既定は**本番と同じ** gpt-4o。
 * EVAL_EXTRACT_MODEL=gpt-4o-mini で下げて比べられる（転記率と値段の差を見るため）。
 * ここが本番とずれていると、測った数字が出荷物の数字でなくなる。
 */
const EXTRACT_MODEL = process.env.EVAL_EXTRACT_MODEL ?? 'gpt-4o';

async function chat(model, system, user, maxTokens) {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      temperature: 0.1,
      max_tokens: maxTokens,
      response_format: { type: 'json_object' },
    }),
  });
  if (!res.ok) throw new Error(`OpenAI ${res.status}: ${await res.text()}`);
  const data = await res.json();
  const price = PRICE[model];
  if (price && data.usage) {
    costUsd +=
      (data.usage.prompt_tokens / 1e6) * price.in + (data.usage.completion_tokens / 1e6) * price.out;
    callCount += 1;
  }
  return JSON.parse(data.choices[0].message.content);
}

function flatten(soap) {
  return [soap.subjective, soap.objective, soap.assessment, soap.plan]
    .map((v) => (typeof v === 'string' ? v : JSON.stringify(v ?? '')))
    .join('\n');
}

/** 「1 ヶ月」「１か月」を同じものとして当てるための正規化 */
function normalize(text) {
  return text
    .replace(/[０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0))
    .replace(/\s/g, '');
}

function score(soapText, kase) {
  const hay = normalize(soapText);
  const hit = [];
  const miss = [];
  for (const t of kase.targets) {
    (t.accept.some((a) => hay.includes(normalize(a))) ? hit : miss).push(t.name);
  }
  const fabricated = kase.forbidden
    .filter((f) => new RegExp(f.pattern, 'm').test(soapText))
    .map((f) => f.name);
  return { hit, miss, fabricated };
}

async function runPipeline(kase, variant) {
  const before = variant === 'before';
  const structured = await chat(
    before ? 'gpt-4o-mini' : EXTRACT_MODEL,
    before ? BEFORE_EXTRACTION_SYSTEM : EXTRACTION_SYSTEM,
    `文字起こし:\n${kase.transcript}\n\n次のスキーマに従い構造化データをJSONで抽出:\n${
      before ? BEFORE_EXTRACTION_SCHEMA : EXTRACTION_SCHEMA
    }`,
    1200,
  );
  // after は床をモデルに渡さず、空いた欄に後から入れる（soap-floor-gate.ts と同じ）。
  // before は当時のまま、床を必ず渡す
  const styleBlock = `visitType: ${kase.visitType}${
    before ? `\n定型床（差分がなければこれをベースに）:\n${JSON.stringify(ROUTINE_FLOOR, null, 2)}` : ''
  }`;
  // after だけが文字起こしを見る。これが今回いちばん効くはずの差
  const transcriptBlock = before
    ? ''
    : `\n診察の文字起こし（肉付けの出典。ここに無いことは書かない）:\n${kase.transcript}\n`;
  const soap = await chat(
    'gpt-4o',
    before ? BEFORE_SOAP_SYSTEM : SOAP_SYSTEM,
    `構造化データ${before ? '' : '（骨組み。ここにある事実は必ずSOAPに出す）'}:\n${JSON.stringify(
      structured,
      null,
      2,
    )}\n\n${styleBlock}\n${transcriptBlock}\nkeys: subjective, objective, assessment, plan のSOAPをJSONで生成。`,
    1500,
  );
  return before ? flatten(soap) : flatten(applyFloor(soap, kase.transcript));
}

/** soap-floor-gate.ts の applyRoutineFloor と同じ後処理 */
const AUSCULTATION_CUES =
  /聴診|胸の音|心音|呼吸音|背中|背部|深呼吸|息を吸|息を吐|脈を|脈拍|血圧を測|お腹を診|腹部を診/;
const CONTINUATION_CUES =
  /継続|続け|そのまま|いつもの(薬|お薬)|同じ(薬|お薬)|(薬|お薬)を?[^。\n]{0,8}出しておき/;
const isBlank = (v) => String(v ?? '').replace(/[\s。、．，]/g, '').length === 0;

function applyFloor(soap, transcript) {
  const out = {
    subjective: String(soap.subjective ?? ''),
    objective: String(soap.objective ?? ''),
    assessment: String(soap.assessment ?? ''),
    plan: String(soap.plan ?? ''),
  };
  const examined = AUSCULTATION_CUES.test(transcript);
  const continued = CONTINUATION_CUES.test(transcript);
  const allow = { subjective: true, objective: examined, assessment: true, plan: continued };
  for (const field of Object.keys(out)) {
    if (!isBlank(out[field])) continue;
    if (allow[field]) out[field] = ROUTINE_FLOOR[field];
  }
  if (!examined) {
    const sentences = ROUTINE_FLOOR.objective
      .split(/[。\n]/)
      .map((x) => x.trim())
      .filter((x) => x.length >= 3);
    out.objective = out.objective
      .split('\n')
      .filter((line) => !(line.trim() && isBlank(sentences.reduce((a, x) => a.split(x).join(''), line))))
      .join('\n')
      .trim();
  }
  return out;
}


function pct(n, d) {
  return d === 0 ? '—' : `${Math.round((n / d) * 100)}%`;
}

const variants = ONLY ? [ONLY] : ['before', 'after'];
if (!KEY && !ONLY) {
  console.log('OPENAI_API_KEY が無いので、zoom+gpt の基準線だけを出します。\n');
}

console.log(`出典: ${corpus.source}`);
console.log(`症例 ${corpus.cases.length} 件 / 的 ${corpus.cases.reduce((a, c) => a + c.targets.length, 0)} 個 / 試行 ${TRIALS} 回\n`);

const summary = {};

for (const kase of corpus.cases) {
  console.log(`── ${kase.label}  （的 ${kase.targets.length} 個）`);

  const base = score(kase.baselineZoomGpt, kase);
  console.log(
    `   zoom+gpt   転記 ${pct(base.hit.length, kase.targets.length).padStart(4)}  捏造 ${base.fabricated.length}`,
  );
  (summary['zoom+gpt'] ??= { hit: 0, total: 0, fab: 0 });
  summary['zoom+gpt'].hit += base.hit.length;
  summary['zoom+gpt'].total += kase.targets.length;
  summary['zoom+gpt'].fab += base.fabricated.length;
  if (base.miss.length) console.log(`              落ち: ${base.miss.join('、')}`);

  if (!KEY) {
    console.log('');
    continue;
  }

  for (const variant of variants) {
    const runs = [];
    for (let i = 0; i < TRIALS; i++) {
      try {
        runs.push(score(await runPipeline(kase, variant), kase));
      } catch (e) {
        console.error(`   ${variant} 失敗: ${e.message}`);
      }
    }
    if (!runs.length) continue;
    const hit = runs.reduce((a, r) => a + r.hit.length, 0) / runs.length;
    const fab = runs.reduce((a, r) => a + r.fabricated.length, 0) / runs.length;
    const lo = Math.min(...runs.map((r) => r.hit.length));
    const hi = Math.max(...runs.map((r) => r.hit.length));
    console.log(
      `   ${variant.padEnd(10)} 転記 ${pct(hit, kase.targets.length).padStart(4)}  捏造 ${fab.toFixed(1)}  （${lo}〜${hi}/${kase.targets.length}）`,
    );
    // 毎回落ちた的だけを出す。たまたま落ちたものは次の手がかりにならない
    const alwaysMissed = runs[0].miss.filter((m) => runs.every((r) => r.miss.includes(m)));
    if (alwaysMissed.length) console.log(`              毎回落ち: ${alwaysMissed.join('、')}`);
    const fabNames = [...new Set(runs.flatMap((r) => r.fabricated))];
    if (fabNames.length) console.log(`              ⚠ 捏造: ${fabNames.join('、')}`);

    (summary[variant] ??= { hit: 0, total: 0, fab: 0 });
    summary[variant].hit += hit;
    summary[variant].total += kase.targets.length;
    summary[variant].fab += fab;
  }
  console.log('');
}

console.log('── 合計');
for (const [name, s] of Object.entries(summary)) {
  console.log(`   ${name.padEnd(10)} 転記 ${pct(s.hit, s.total).padStart(4)}  捏造 ${s.fab.toFixed(1)}`);
}
console.log('\n※ 転記＝会話に出てきた事実のうちSOAPに現れた割合。捏造＝言われていないのに書かれたもの（0であるべき）');
if (callCount) {
  // 1診察ぶんの値段に直す。この評価では 1診察 = 抽出1回 + SOAP1回
  const perConsultation = (costUsd / (callCount / 2)) * JPY_PER_USD;
  console.log(
    `※ 抽出モデル ${EXTRACT_MODEL} / API ${callCount}回 / 1診察あたり約 ${perConsultation.toFixed(1)}円（抽出＋SOAPのみ。文字起こしは別）`,
  );
}
