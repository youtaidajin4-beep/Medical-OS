/**
 * 「会話に出た診療上の事実が、SOAPに書かれているか」を、LLMに判定させる。
 *
 * eval/run-soap-coverage-eval.mjs は、人が的（正解の語）を決めた症例で測る。本番の診察には
 * 的が無いので、同じ問いを、会話からの事実の抜き出し＋SOAPとの突き合わせでやる。
 *
 * **3段に分ける。** 最初の版は、会話とSOAPを一度に見せて事実を挙げさせた。すると、SOAPにある事実
 * しか挙がらず、人が的を付けた症例（転記65%）を100%と判定し、SOAPを半分に削っても100%のままだった
 * （2026-10-10 の較正）。事実の抜き出しはSOAPを見せずに行い、突き合わせは別の呼び出しにする。
 *
 * 「根拠のない記載」は、突き合わせと同じ呼び出しで頼むと、SOAPに無い事実まで挙げた（逆向きの誤り）。
 * そこで専用の段にし、SOAPの文面からの引用だけを採る。
 *
 * 判定はLLMなので数ポイントは動く。**月の合算で、動きを見る**（1診察の数字を根拠にしない）。
 */

export const JUDGE_VERSION = 'soap-coverage-judge-v3';

/** 段1：会話だけを見て、診療上の事実を挙げる。SOAPは渡さない */
export const FACT_EXTRACT_SYSTEM = `あなたは診療録の査読者です。診察の会話から、「診療に必要な事実」を漏れなく挙げてください。

数えるもの:
- 症状・訴え・経過・期間・増悪/改善（患者の言葉も含む）
- 服薬状況（飲み忘れ・自己中止を含む）
- バイタル・検査値・所見・画像や検査の結果
- 病名・医師の評価・鑑別
- 処方（薬剤名・用量・日数）・検査オーダー・処置
- 指導した内容・再診の間隔
- 家族・付き添いが話した内容
数えないもの: あいさつ、雑談、待ち時間の話、診療と無関係な話題

ルール:
- 1つの事実は1行。複数の事実を1つにまとめない。数値・薬剤名・日数は会話のとおりに書く
- 会話に無いことは書かない。推測で補わない
- 同じ事実は1度だけ
- 上限40件。多いときは診療上の重要度が高い順

出力は有効なJSONのみ: {"facts":["短い事実の記述", "..."]}`;

/** 段2：挙げた事実がSOAPに書かれているか */
export const COVERAGE_SYSTEM = `あなたは診療録の査読者です。会話から抜き出した「事実の一覧」と、SOAPが渡されます。
一覧の事実を、順番どおり1件ずつ、SOAPに書かれているか判定してください。

- SOAPに書かれていれば inSoap=true、書かれていなければ false
- 意味が同じならよい。言い回し・表記（「5ミリ」と「5mg」）・順序の違いは問わない
- 数値・薬剤名・日数が違うときは false（その事実は書かれていない）
- 一覧にない事実は足さない。一覧の件数と facts の件数は同じにする

出力は有効なJSONのみ:
{"facts":[{"fact":"一覧の事実をそのまま","inSoap":true}]}`;

/** 段3：SOAPの記載のうち、会話に根拠がないもの。事実の一覧は渡さない（SOAPの側から確かめる） */
export const UNSUPPORTED_SYSTEM = `あなたは診療録の査読者です。診察の会話と、そこから作られたSOAPが渡されます。
SOAPの記載を1つずつ読み、**会話のどこにも根拠がないもの**だけを挙げてください。

- 対象は、SOAPに書かれている記載だけ。SOAPに書かれていない内容は、会話にあっても挙げない
- 会話に無い数値・所見・検査・薬・診断・日数を挙げる。表現を整えただけのもの、会話の内容から素直に言えることは含めない
- 「異常なし」「変化なし」のような所見は、その診察や確認をした会話が無ければ根拠なしとする
- text にはSOAPの文面をそのまま引用する（言い換えない）。reason には、何が会話に無いかを具体的に一言で書く
- 根拠のない記載が無ければ空の配列

出力は有効なJSONのみ:
{"unsupported":[{"text":"SOAPの文面からの引用","reason":"具体的な理由"}]}`;

/** 長い診察でも収まるよう、判定に渡す会話の上限（字）。超えたときは先頭を残す */
export const MAX_JUDGE_TRANSCRIPT_CHARS = 14_000;

type Soap = { subjective: string; objective: string; assessment: string; plan: string };

function clip(transcript: string): string {
  return transcript.length > MAX_JUDGE_TRANSCRIPT_CHARS
    ? `${transcript.slice(0, MAX_JUDGE_TRANSCRIPT_CHARS)}\n（以下省略）`
    : transcript;
}

export function buildFactExtractUser(transcript: string): string {
  return `【診察の会話】\n${clip(transcript)}\n\n上の指示どおり、JSONで事実を挙げてください。`;
}

function soapBlock(soap: Soap): string {
  return `S: ${soap.subjective}\nO: ${soap.objective}\nA: ${soap.assessment}\nP: ${soap.plan}`;
}

export function buildCoverageUser(facts: string[], soap: Soap): string {
  const list = facts.map((f, i) => `${i + 1}. ${f}`).join('\n');
  return `【事実の一覧】\n${list}\n\n【SOAP】\n${soapBlock(soap)}\n\n上の指示どおり、JSONで判定してください。`;
}

export function buildUnsupportedUser(transcript: string, soap: Soap): string {
  return `【診察の会話】\n${clip(transcript)}\n\n【SOAP】\n${soapBlock(soap)}\n\n上の指示どおり、JSONで挙げてください。`;
}

/** 引用の照合用。空白・句読点・全角半角を除く */
function squash(text: string): string {
  return text.normalize('NFKC').replace(/[\s。、．，,.「」『』（）()・:：;；\-ー~〜]/g, '');
}

/** LLMが挙げた「根拠なし」のうち、SOAPの文面に実際にあるものだけを残す（SOAPに無い内容を挙げる誤りを除く） */
export function keepQuotedClaims(
  claims: unknown,
  soap: Soap,
): Array<{ text: string; reason?: string }> {
  if (!Array.isArray(claims)) return [];
  const hay = squash(`${soap.subjective}${soap.objective}${soap.assessment}${soap.plan}`);
  const out: Array<{ text: string; reason?: string }> = [];
  for (const c of claims) {
    if (!c || typeof c !== 'object') continue;
    const { text, reason } = c as { text?: unknown; reason?: unknown };
    if (typeof text !== 'string') continue;
    const needle = squash(text);
    // 短すぎる引用（「あり」など）は、どこにでも当たるので採らない
    if (needle.length < 4 || !hay.includes(needle)) continue;
    out.push({ text: text.trim(), reason: typeof reason === 'string' ? reason.trim() : undefined });
  }
  return out;
}

export type JudgeChat = (system: string, user: string) => Promise<{ json: unknown; costJpy: number }>;

/** 事実の一覧を取り出す。文字列の配列でも、{fact} の配列でも受ける */
function readFacts(json: unknown): string[] {
  const raw = (json as { facts?: unknown })?.facts;
  if (!Array.isArray(raw)) return [];
  return raw
    .map((f) => (typeof f === 'string' ? f : typeof (f as { fact?: unknown })?.fact === 'string' ? (f as { fact: string }).fact : ''))
    .map((f) => f.trim())
    .filter(Boolean)
    .slice(0, 40);
}

/** 3段の判定。chat は、システム文とユーザー文を渡してJSONを返す関数（本番はOpenAI、較正も同じ関数を使う） */
export async function runSoapJudge(
  chat: JudgeChat,
  transcript: string,
  soap: Soap,
): Promise<{ json: unknown; costJpy: number }> {
  let step1 = await chat(FACT_EXTRACT_SYSTEM, buildFactExtractUser(transcript));
  let cost = step1.costJpy;
  let facts = readFacts(step1.json);
  if (facts.length === 0) {
    // 形が崩れた応答は1回だけやり直す
    step1 = await chat(FACT_EXTRACT_SYSTEM, buildFactExtractUser(transcript));
    cost += step1.costJpy;
    facts = readFacts(step1.json);
  }
  // 事実が1つも挙がらない短い会話は、転記率の分母が無い。根拠のない記載だけは確かめる
  const [step2, step3] = await Promise.all([
    facts.length ? chat(COVERAGE_SYSTEM, buildCoverageUser(facts, soap)) : Promise.resolve({ json: { facts: [] }, costJpy: 0 }),
    chat(UNSUPPORTED_SYSTEM, buildUnsupportedUser(transcript, soap)),
  ]);
  cost += step2.costJpy + step3.costJpy;
  return {
    json: {
      facts: (step2.json as { facts?: unknown })?.facts,
      unsupported: keepQuotedClaims((step3.json as { unsupported?: unknown })?.unsupported, soap),
    },
    costJpy: cost,
  };
}
