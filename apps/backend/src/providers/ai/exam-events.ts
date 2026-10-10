/**
 * 診察の会話から、「医師が何を診察したか」を部位ごとに、発話の引用つきで拾う。
 *
 * ## なぜ作るか
 * 通常診察のOの定型（脈拍・貧血黄疸・心音・呼吸音）は、会話に聴診などの語が1つでもあるかを
 * 正規表現（soap-floor-gate.ts の AUSCULTATION_CUES）で見て、入れるか空にするかを決めていた。
 * 本番の実データ（2026-10-10、66診察中Oが空欄22件）では、10/2以降の空欄12件はすべてこの判定で
 * 定型が入らなかったもの。「心臓の音、聞いてみますね」「胸を診ますね」のように、決まった語を
 * 使わない言い回しは拾えない。逆に、患者の「背中が痛い」は拾ってしまう。
 *
 * ## 守ること
 * していない診察をカルテに載せない（9/19・10/1に止めた事故）。そのため、LLMの判定をそのまま
 * 信じず、**引用が実際に医師の発話にあるか**を機械で確かめ、確かめられなかった判定は捨てる。
 *   - 診察の動作を示す引用が、患者以外の発話に実在する
 *   - 「異常なし」の結果の引用も実在し、診察の動作より後ろの近くにある
 * 結果の発話が無いものは「未確認」にして、定型を入れても医師の確認を求める。
 *
 * 拾うのは定型のOが主張している4部位だけ。口腔・腹部・下腿などは、これまでどおりSOAPを書く
 * モデルが会話から書く。
 */

export const EXAM_SYSTEMS = ['pulse', 'anemia_jaundice', 'heart', 'lung'] as const;
export type ExamSystem = (typeof EXAM_SYSTEMS)[number];

export type ExamResult = 'normal' | 'abnormal' | 'unstated';

export type ExamEvent = {
  system: ExamSystem;
  result: ExamResult;
  /** 診察の動作を示す、医師の発話の引用 */
  evidence: string;
  /** 結果を述べた、医師の発話の引用（normal / abnormal のとき） */
  resultEvidence?: string;
  /** abnormal のとき、医師が述べた所見 */
  finding?: string;
};

export const EXAM_EVENTS_VERSION = 'exam-events-v1';

export const EXAM_EVENTS_SYSTEM = `あなたは診療録の査読者です。診察の会話から、医師がこの診察の中で**実際に行った身体診察**を、次の4つの部位だけ拾います。

部位:
- pulse … 脈を触れる・脈拍や脈の整かどうかを確認する
- anemia_jaundice … 目の下（眼瞼結膜）や白目（眼球結膜）を見て、貧血・黄疸を確認する
- heart … 心臓の聴診（心音）
- lung … 肺の聴診（呼吸音）。背中の聴診・深呼吸をさせての聴診を含む
- 「胸の音」「聴診」だけで部位が分からないときは heart と lung の両方。「心臓の音」「心音」だけなら heart のみ。「肺の音」「呼吸の音」「背中の音」だけなら lung のみ

実際に行ったとみなすのは、医師の発話に、**この診察の中で診察を行う・行っている・行った動作**があるとき:
聞く・聞かせてもらう・聴診器を当てる・診る・見せてもらう・触る・測る・深呼吸をさせる・服を上げてもらう・「聴診しました」 など。
（「聴診しました。心音も呼吸音も問題ないですね」のように、動作と結果が1つの発話にあるものも拾う。
「聞いていきます」「診ていきます」のような進行形も動作。「一通り聞きましたけど特に問題ないですね」のように、診察のあとで振り返って結果を述べるものも、この診察のことなら拾う）
部位の名前が出ていなくても、動作から部位が分かるときは拾う:
服を上げてもらう・シャツの下から聴診器・聴診器を当てる・「ちょっと聞きますね」＝胸の聴診（heart と lung）、
目を開けてもらう・下まぶたの裏を見る＝anemia_jaundice、手首に触れる＝pulse。
行ったとみなさないもの:
- 過去の診察の話（「前回聴診したときは」）、患者が他院で受けた診察の話
- していない・しない、という話。別の日にする話
- 検査のオーダー（心エコー・心電図・レントゲン・採血）。診察ではなく検査
- 症状の問診（「息は苦しいですか」「脈が速くなりますか」）、患者の訴え（「背中が痛い」「胸が苦しい」）
- 病気の一般的な話（「心臓の病気は心配ないですね」）、自宅での測定の話

結果（result）:
- normal … 医師が、その診察の直後に、異常がないことを述べた（きれい・大丈夫・問題ない・異常ない・整・雑音ない・心配ない・いいですね など）。
  「大丈夫ですね」は、**直前に診察の動作があるときだけ**。薬や症状の話の「大丈夫」は含めない
- abnormal … 医師が異常・雑音・ラ音などの所見を述べた。finding にその内容を会話のとおりに書く
- unstated … 診察の動作はあるが、結果を述べた発話が無い

引用:
- evidence … 診察の動作を示す**医師の発話**を、会話の文字列のまま短く引用する（言い換え禁止。患者の発話は引用しない）
- resultEvidence … normal / abnormal のとき、結果を述べた**医師の発話**を、会話の文字列のまま引用する
- 引用は会話に実在する文字列でなければならない。引用できないものは出力しない

同じ部位は1件。診察が会話に無ければ空の配列。
出力は有効なJSONのみ:
{"events":[{"system":"heart","result":"normal","evidence":"心臓の音、聞いてみますね","resultEvidence":"きれいな音ですね","finding":""}]}`;

const MAX_TRANSCRIPT_CHARS = 14_000;

export function buildExamEventsUser(transcript: string): string {
  const clipped =
    transcript.length > MAX_TRANSCRIPT_CHARS ? transcript.slice(0, MAX_TRANSCRIPT_CHARS) : transcript;
  return `【診察の会話】\n${clipped}\n\n上の指示どおり、JSONで出力してください。`;
}

// ---- 引用の検証 ----

const SPEAKER_LINE = /^(医師|患者|その他|不明)\s*[:：]\s*(.*)$/;

/** 引用の照合用。空白・句読点・記号・全角半角を揃える */
function squash(text: string): string {
  return text
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[\s\u3000。、．，,.!?！？「」『』（）()[\]【】…・~〜\-ー_/:：;；"'“”‘’]/g, '');
}

type Line = { speaker: string; body: string; squashed: string };

function parseLines(transcript: string): Line[] {
  return transcript
    .split('\n')
    .map((raw) => {
      const m = SPEAKER_LINE.exec(raw.trim());
      const body = m ? m[2]! : raw.trim();
      return { speaker: m ? m[1]! : '不明', body, squashed: squash(body) };
    })
    .filter((l) => l.squashed.length > 0);
}

/** 引用が、患者以外の発話に実在する行の番号（先頭）。見つからなければ -1 */
function findDoctorLine(lines: Line[], quote: string, from = 0): number {
  const needle = squash(quote);
  // 短すぎる引用は、どこにでも当たる
  if (needle.length < 3) return -1;
  for (let i = from; i < lines.length; i++) {
    const l = lines[i]!;
    if (l.speaker === '患者') continue;
    if (l.squashed.includes(needle)) return i;
  }
  return -1;
}

/** 結果の発話は、診察の動作の発話から、これだけ後ろまでの行にあるものだけ採る */
export const MAX_RESULT_GAP_LINES = 6;

function asString(v: unknown): string {
  return typeof v === 'string' ? v.trim() : '';
}

/**
 * LLMの返したJSONを、会話に照らして検算する。
 * - 診察の動作の引用が医師の発話に無ければ、その部位は捨てる（していない診察を載せない）
 * - 結果の引用が実在しない・動作より前・遠すぎるときは、結果を unstated に下げる
 */
export function verifyExamEvents(raw: unknown, transcript: string): ExamEvent[] {
  const list = (raw as { events?: unknown } | null)?.events;
  if (!Array.isArray(list)) return [];
  const lines = parseLines(transcript);
  const out = new Map<ExamSystem, ExamEvent>();

  for (const item of list) {
    if (!item || typeof item !== 'object') continue;
    const e = item as Record<string, unknown>;
    const system = e.system as ExamSystem;
    if (!EXAM_SYSTEMS.includes(system)) continue;
    const evidence = asString(e.evidence);
    const at = findDoctorLine(lines, evidence);
    if (at < 0) continue;

    let result: ExamResult = 'unstated';
    let resultEvidence: string | undefined;
    let finding: string | undefined;
    const claimed = e.result === 'normal' || e.result === 'abnormal' ? e.result : 'unstated';
    if (claimed !== 'unstated') {
      const rQuote = asString(e.resultEvidence);
      const rAt = findDoctorLine(lines, rQuote, at);
      if (rAt >= at && rAt - at <= MAX_RESULT_GAP_LINES) {
        result = claimed;
        resultEvidence = rQuote;
        if (claimed === 'abnormal') finding = asString(e.finding) || rQuote;
      }
    }

    const event: ExamEvent = { system, result, evidence, resultEvidence, finding };
    const prev = out.get(system);
    // 同じ部位が複数あれば、より確かなもの（normal > abnormal > unstated）を残す
    const rank = (r: ExamResult) => (r === 'normal' ? 2 : r === 'abnormal' ? 1 : 0);
    if (!prev || rank(event.result) > rank(prev.result)) out.set(system, event);
  }
  return [...out.values()];
}

export type JsonChat = (system: string, user: string) => Promise<unknown>;

/** 会話から診察の出来事を拾う。chat は本番ではOpenAI、評価でも同じ関数を使う */
export async function runExamEvents(chat: JsonChat, transcript: string): Promise<ExamEvent[]> {
  if (!transcript.trim()) return [];
  const raw = await chat(EXAM_EVENTS_SYSTEM, buildExamEventsUser(transcript));
  return verifyExamEvents(raw, transcript);
}

// ---- Oの文への変換 ----

export type ExamResolution = {
  /** 診察の動作も「異常なし」の発話も確かめられた部位 */
  normal: ExamSystem[];
  /** 診察の動作は確かめられたが、結果の発話が無い部位 */
  unconfirmed: ExamSystem[];
  /** 医師が異常を述べた部位。定型は入れず、会話から書く */
  abnormal: ExamSystem[];
  /** 医師の画面に出す、部位ごとの根拠の引用 */
  evidence: Partial<Record<ExamSystem, { action: string; result?: string }>>;
};

export function resolveExam(events: ExamEvent[]): ExamResolution {
  const res: ExamResolution = { normal: [], unconfirmed: [], abnormal: [], evidence: {} };
  for (const e of events) {
    res.evidence[e.system] = { action: e.evidence, result: e.resultEvidence };
    if (e.result === 'normal') res.normal.push(e.system);
    else if (e.result === 'abnormal') res.abnormal.push(e.system);
    else res.unconfirmed.push(e.system);
  }
  return res;
}

const SYSTEM_LABEL: Record<ExamSystem, string> = {
  pulse: '脈',
  anemia_jaundice: '眼瞼・眼球結膜',
  heart: '心音',
  lung: '呼吸音',
};

export function examSystemLabel(system: ExamSystem): string {
  return SYSTEM_LABEL[system];
}

/** 谷口先生の通常診察の定型（soap-templates.ts）と同じ言い回しで、部位ごとの「異常なし」を並べる */
export function normalSentences(systems: ExamSystem[]): string[] {
  const has = new Set(systems);
  const out: string[] = [];
  if (has.has('pulse')) out.push('脈拍異常なし。');
  if (has.has('anemia_jaundice')) out.push('貧血・黄疸なし。');
  if (has.has('heart') && has.has('lung')) out.push('心音・呼吸音異常なし。');
  else if (has.has('heart')) out.push('心音異常なし。');
  else if (has.has('lung')) out.push('呼吸音異常なし。');
  return out;
}
