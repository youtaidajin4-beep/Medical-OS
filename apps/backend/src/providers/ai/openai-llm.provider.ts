import {
  LlmProvider,
  StructuredClinicalDataPayload,
  StructuredClinicalDataSchema,
} from './llm.provider';
import { GeneratedDocumentType } from '@prisma/client';
import { MedicalGlossary } from './medical-glossary.types';
import { glossaryToLlmHint } from './medical-glossary';
import {
  isAbortError,
  isRetryableHttpStatus,
  localizeOpenAiError,
  sleep,
} from './openai-retry.util';
import { truncateForLlm } from './llm-text.util';

/** Per chat-completion call. Long STT is handled separately. */
const LLM_FETCH_TIMEOUT_MS = 3 * 60 * 1000;
/** 直す行だけ返すので、全文を返していた頃のような大きな上限は要らない */
const CORRECTION_MAX_TOKENS = 1500;
const EXTRACT_MAX_TOKENS = 1200;
const SOAP_MAX_TOKENS = 1500;
const NOTE_MAX_TOKENS = 2000;
const DOCUMENT_MAX_TOKENS = 2500;

export interface OpenAiLlmConfig {
  apiKey: string;
  model?: string;
  correctionModel?: string;
  /** 書類生成用モデル。誤字脱字と転記精度を優先して既定は gpt-4o。 */
  documentModel?: string;
  /**
   * 構造化抽出用モデル。既定は gpt-4o。
   *
   * 実測（2026-10-01、9/30の実診療3症例）: 抽出だけ gpt-4o-mini から gpt-4o に替えると、
   * 会話の事実がSOAPに現れる割合が 50% → 65%（さらに問診欄を足して73%）。
   * 落ちていたのは年齢・月経・鉄の追加チェック・冷え性・肩こり・便秘といった、
   * 医師が鑑別や漢方の選択に使っている事実だった。SOAPを書く側に文字起こしを渡しても、
   * 骨組みに無い事実は拾い直されない。ここが最後の関門になる。
   *
   * 値段は1診察あたり約1.0円→約2.0円（抽出＋SOAP、2026-10-01の単価）。
   * 1日30人で1日あたり約30円。
   */
  extractModel?: string;
  /**
   * SOAP生成用モデル。既定は gpt-4o。
   *
   * 実測（2026-09-21）: gpt-4o-mini は「定型床は差分があれば上書きする」という指示に
   * 従えず、労作時胸痛で狭心症を疑う新規症例でも assessment=stable / plan=定時薬を
   * 継続する、を返した（3回とも再現）。同じ入力を gpt-4o に渡すと正しく上書きされ、
   * 逆に本当に安定した症例では正しく stable のままだった。
   * SOAPは診療の判断そのものが載る欄なので、ここだけは精度を優先する。
   */
  soapModel?: string;
}

export type ChatResult = {
  content: string;
  inputTokens?: number;
  outputTokens?: number;
};

/**
 * 2つの禁止を混同しない。
 *
 *  (1) 言われていないことを書く  … 絶対禁止。カルテに嘘が載る
 *  (2) 言われたことを長く書く    … 禁止ではない。先生が後で削れる
 *
 * もとのプロンプトは両方を同じ強さで禁じていた（「短い事実句のみ」）。
 * その結果 (2) を避けるために (1) ではないものまで削られ、
 * 近藤さんの「自己中止後に血圧が再上昇」のような経過が丸ごと落ちた。
 * ここでは (1) だけを禁じ、(2) は「会話に出たことは落とさない」に反転させる。
 */
const EXTRACTION_SYSTEM = `あなたは日本のクリニック向け医療情報抽出アシスタントです。
診察の会話から、カルテに残すべき事実を**漏らさず**拾ってください。

絶対禁止（カルテに嘘が載ります）:
- 会話に出ていない症状・所見・検査・診断・薬剤・数値を書く
- 医師が実施していない診察や検査を書く
- 言われていない日数・間隔・用量を補う（「おそらく1か月後」等の推測を書かない）

必ず拾うもの（会話に出ていれば、短くまとめず事実として残す）:
- 症状の経過と変化（いつから、何をきっかけに、良くなったか悪くなったか）
- 服薬の状況（飲めている／飲み忘れ／自己中止とその後どうなったか）
- 院内で実施した検査・処置（採血・点滴・心電図・レントゲン・処置）
- 出した検査オーダーと、その項目
- 医師が口に出した鑑別（「〜も考えられる」「〜は考えにくい」も含む）
- 説明・生活指導した内容
- 処方日数・再診間隔は、医師が言った表現のまま（言っていなければ空）
- 本人の訴えと、家族・付き添いが話した内容は別の欄に分ける
- 主訴以外に医師が確認した症状（冷え・肩こり・頭痛・便秘・睡眠・食欲など）。
  漢方を選ぶための問診なので、一言ずつでも全部拾う
- 薬は、会話で言われた呼び方をそのまま残す。「アレルギーの薬」「咳止め」「漢方」も薬として拾い、
  飲むタイミング（寝る前など）が言われていれば一緒に残す

書き方:
- 各項目は事実の列挙。「認めます」「考えます」のような作文はしない
- ただし経過・指導は、筋道が分かる長さで書いてよい（一文に潰さない）
- 聞き取れず意味の通らない箇所は、それらしい医療用語に置き換えず省く
- 薬剤名が確定できないときは「（要確認）」を付ける
出力は有効なJSONのみとします。`;

const EXTRACTION_SCHEMA = `{
  "chiefComplaint": "string (optional) — 今日の主な訴え",
  "presentIllness": "string (optional) — いつから・どんな症状か。期間と症状を落とさない",
  "course": "string (optional) — 前回以降の変化。きっかけ・増悪/改善の筋道をそのまま残す",
  "pastHistory": "string (optional) — 既往・基礎疾患",
  "medications": ["string"] (optional) — 現在の処方・今日出した薬,
  "adherence": "string (optional) — 服薬できているか。飲み忘れ・自己中止があればその後どうなったかも",
  "allergies": ["string"] (optional),
  "vitals": "string (optional) — 会話に出た値のみ。例: BP 128/78, 体温38.0℃",
  "physicalExam": "string (optional) — 医師が実際に行った診察とその所見。行っていない診察は書かない",
  "inClinicTests": ["string"] (optional) — 今日院内で実施した検査・処置。例: 採血施行, 点滴施行,
  "orderedTests": ["string"] (optional) — 出した検査と項目。例: 採血（肝機能・腎機能・甲状腺・貧血）,
  "differentials": ["string"] (optional) — 医師が口に出した鑑別。否定したものは「〜は考えにくい」と残す,
  "assessment": "string (optional) — 医師が述べた病名・印象",
  "plan": "string (optional) — 治療方針・処方の方針",
  "guidance": "string (optional) — 説明・生活指導した内容",
  "prescriptionDays": "string (optional) — 言われた処方日数のみ。例: 1週間分。言われていなければ省く",
  "followUpInterval": "string (optional) — 言われた再診間隔のみ。例: 1週間以内。言われていなければ省く",
  "reviewOfSystems": ["string"] (optional) — 主訴以外に確認した症状。例: 冷え性あり, 便秘あり, 睡眠障害なし,
  "familyReport": "string (optional) — 家族・付き添いが話した内容"
}`;

/**
 * SOAPを書く側にも、会話そのものを見せる。
 *
 * 以前はここに構造化データしか渡していなかった。構造化は9項目の短句なので、
 * 10分の会話がそこで潰れ、SOAPを書くモデルは潰れた後しか見ていなかった。
 * 谷口先生の「会話したボリュームに対して転記が乏しい」は、この一点から出ていた。
 *
 * 原文を渡すと、今度は「患者が言っただけのこと」を所見に書く危険が増える。
 * そこを止めるのが「出典」の指定：S/O/A/P のどこに何を書いてよいかを、
 * 誰が言ったかで分ける。
 */
const SOAP_SYSTEM = `あなたは日本のクリニック向けSOAP作成アシスタントです。
材料は3つあります。

1. 構造化診療データ … SOAPの骨組み。ここにある事実は必ずSOAPのどこかに出す
2. 診察の文字起こし … 肉付けの出典。構造化で落ちた事実をここから拾い直す
3. 定型床（テンプレート） … 変化がないときの下書き

厳守（カルテに嘘が載ります）:
- 文字起こしに出てこない症状・所見・検査・診断・薬剤・数値を書かない
- Oには、**医師が実際に行った診察とその所見、院内で実施した検査**だけを書く。
  患者が話しただけの内容はSに書く。家族の話は「家族より」と明示してSに書く
- 日数・間隔・用量は、文字起こしに出てきた数字のみ。出てこなければ書かない。
  「次回は1か月後」は、医師がそう言っていない限り書かない
- 医師が否定した鑑別は、否定のまま書く（「更年期は考えにくい」）。肯定に反転させない

転記（ここが評価される点です）:
- 会話で扱われた事実を落とさない。短くまとめるより、拾うことを優先する
- 経過は筋道ごと残す（「自己中止後に血圧が再上昇」を「血圧上昇」に潰さない）
- 医師が出した検査オーダー、説明・生活指導した内容、処方日数、再診間隔はPに必ず載せる
- 医師が口に出した鑑別はAに載せる（確定診断にはしない。「〜も鑑別」と書く）
- 医師が鑑別の根拠にした患者背景は落とさない。年齢・月経の有無・生活背景などを
  理由に挙げて鑑別を否定・肯定していたら、その根拠もSかOに残す
  （例「41歳、月経は継続しており更年期は考えにくい」）
- 症状の出方（夜間に増悪する、労作時に出る、食後に出る）は症状とセットで残す

書き方:
- 1行1事実。「認めます」「考えます」のような作文はしない
- **定型床が渡されていないときは、床の言い回しを自分で書かない。**
  「体調変わりない」「脈拍異常なし」「貧血・黄疸なし」「心音・呼吸音異常なし」「stable」
  「定時薬を継続する」は、渡されたときだけ使える。渡されていないのにこれらを書くと、
  していない診察がカルテに載る。**その欄に書くことが無ければ空文字にしてよい。**
  空欄は、会話を裏づけとして後工程が埋める。無理に埋めないこと
- 定型床が渡されたときは、上書きする事実が無い欄に床をそのまま入れる
- 通常診察(ROUTINE)で床が渡され、かつ差分がなければ assessment=stable / plan=定時薬を継続する。 を使う
- 健診(CHECKUP)で差分がなければ床の S/O を使い、A/P は根拠がなければ空文字
- 健診(CHECKUP)では、O に必ず身体所見の行に続けて CXR： と ECG： の行を入れる。
  会話に胸部レントゲン・心電図が出てきたらその内容を、出てこなければ床の文言を使う。
  （谷口先生の健診カルテの書式。この2行が無いと先生が毎回打ち足すことになる）
- 出力は次の4キーのみ。各値は必ずプレーンテキストの文字列（ネストしたオブジェクト不可）:
subjective, objective, assessment, plan`;

function normalizeSoapField(value: unknown): string {
  if (value == null) return '';
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) {
    return value.map((item) => normalizeSoapField(item)).filter(Boolean).join('\n');
  }
  if (typeof value === 'object') {
    return Object.entries(value as Record<string, unknown>)
      .map(([key, val]) => {
        const text = normalizeSoapField(val);
        return text ? `${key}: ${text}` : '';
      })
      .filter(Boolean)
      .join('\n');
  }
  return '';
}

const NOTE_SYSTEM = `あなたは日本のクリニック向け診療記録作成アシスタントです。
構造化データを骨組みに、文字起こしに出てくる事実で肉付けし、
【主訴】【現病歴】【経過】【所見】【評価】【方針】【指導】などの見出しを適宜使用してください。
文字起こしに出てこない症状・所見・検査・診断・薬剤・数値を書くことは禁止です。
所見は医師が実際に行った診察のみ。患者が話しただけの内容は現病歴に書いてください。
日数・間隔・用量は、会話に出てきた数字のみを書いてください。`;

/**
 * 文字起こしの校正は「直す行だけ」返させる。
 *
 * 以前は校正後の全文を返させていた。20分の診察だと出力が数千トークンになり、
 * **この1回で10秒以上かかっていた**（実測: 120行の文字起こしで10.8秒／出力1953トークン）。
 * 直す行だけにすると同じ誤変換を拾って0.98秒・出力85トークン。速度11倍、コスト1/4。
 *
 * 直さない行はモデルに触らせないので、無関係な行が書き換わる事故も無くなる。
 */
const TRANSCRIPT_CORRECTION_SYSTEM = `あなたは日本の内科クリニック向け文字起こし校正アシスタントです。
音声認識の同音異義誤りを、診察文脈と内科ナレッジから探します。

**直す必要がある行だけ**を返してください。直さない行は返さないこと。

ルール:
- 意味を追加・削除しない
- 医師が言っていない診断・薬剤を創作しない
- 明らかな同音異義のみ修正（例: 期間支援→気管支炎、無効団員→ムコダイン、調子んでは→聴診では）
- 薬剤名・用量・単位・アレルギー・検査値・左右・陽性陰性・中止/継続は慎重に扱い、数値の桁違いは補正しない
- 否定表現を反転させない
- 商品名と一般名は双方向に正しく正規化してよい（例: カロナール→アセトアミノフェン、またはその逆で文脈に合わせる）
- 迷ったら直さない（その行を返さない）
- **聞き取れなかった箇所は直さない。**意味の通らない語を、それらしい医療用語に置き換えない
- 検査・処置・画像の名前を推測で補わない。元の行に無い検査名を新しく足さない
  （「ほら強烈で」→「ホルター心電図」のような置換は、していない検査をカルテに載せる）
- text にはその行の**本文全体**を入れる（直した部分だけではない）
- 直す行が無ければ {"corrections": []} を返す

出力（JSONのみ）: {"corrections":[{"line": 行番号, "text": "修正後の本文全体"}]}`;

export class OpenAiLlmProvider implements LlmProvider {
  readonly name = 'openai';
  private readonly apiKey: string;
  private readonly model: string;
  private readonly correctionModel: string;
  private readonly documentModel: string;
  private readonly soapModel: string;
  private readonly extractModel: string;

  constructor(config: OpenAiLlmConfig) {
    this.apiKey = config.apiKey;
    this.model = config.model ?? 'gpt-4o-mini';
    this.correctionModel = config.correctionModel ?? 'gpt-4o';
    this.documentModel = config.documentModel ?? 'gpt-4o';
    this.soapModel = config.soapModel ?? 'gpt-4o';
    this.extractModel = config.extractModel ?? 'gpt-4o';
  }

  async correctTranscript(transcript: string, glossary?: MedicalGlossary, _consultationId?: string) {
    const hint = glossary
      ? `\n\nクリニック語彙:\n${glossaryToLlmHint(glossary, glossary.sessionHits)}`
      : '';
    const clipped = truncateForLlm(transcript);
    try {
      const result = await this.chatJsonWithModel(
        this.correctionModel,
        TRANSCRIPT_CORRECTION_SYSTEM,
        `文字起こし（「番号: 本文」）:\n${clipped}${hint}`,
        CORRECTION_MAX_TOKENS,
      );
      const parsed = JSON.parse(result.content) as {
        corrections?: Array<{ line?: unknown; text?: unknown }>;
      };
      // 呼び出し側（redistributeCorrectedLines）は「番号: 本文」の行を拾う。
      // 返ってこなかった行は元のまま残るので、直す行だけ並べれば足りる。
      return (parsed.corrections ?? [])
        .filter((c) => Number.isFinite(Number(c.line)) && typeof c.text === 'string')
        .map((c) => `${Number(c.line)}: ${String(c.text).trim()}`)
        .join('\n');
    } catch {
      // 校正できなくても診療は続く。辞書による補正は既に当たっている
      return '';
    }
  }

  async extractStructured(transcript: string, _consultationId?: string) {
    const clipped = truncateForLlm(transcript);
    const result = await this.chatJsonWithModel(
      this.extractModel,
      EXTRACTION_SYSTEM,
      `文字起こし:\n${clipped}\n\n次のスキーマに従い構造化データをJSONで抽出:\n${EXTRACTION_SCHEMA}`,
      EXTRACT_MAX_TOKENS,
    );
    const parsed = JSON.parse(result.content) as StructuredClinicalDataPayload;
    return StructuredClinicalDataSchema.parse(parsed);
  }

  async generateSoap(
    data: StructuredClinicalDataPayload,
    _consultationId?: string,
    styleHints?: import('./llm.provider').SoapStyleHints,
  ) {
    const styleBlock = [
      styleHints?.greeting ? `挨拶・定型の参考: ${styleHints.greeting}` : '',
      styleHints?.closing ? `締めの参考: ${styleHints.closing}` : '',
      styleHints?.revisionExamples
        ? `医師の過去の修正例（文体を合わせること）:\n${styleHints.revisionExamples}`
        : '',
      styleHints?.visitType ? `visitType: ${styleHints.visitType}` : '',
      styleHints?.templateFloor
        ? `定型床（差分がなければこれをベースに）:\n${JSON.stringify(styleHints.templateFloor, null, 2)}`
        : '',
    ]
      .filter(Boolean)
      .join('\n');
    // 原文は後ろに置く。前に置くと、構造化データ（骨組み）より原文の末尾の雑談に
    // 引きずられる。長い診察でも頭から切られないよう truncateForLlm を通す。
    const transcriptBlock = styleHints?.transcript
      ? `\n診察の文字起こし（肉付けの出典。ここに無いことは書かない）:\n${truncateForLlm(styleHints.transcript)}\n`
      : '';
    const result = await this.chatJsonWithModel(
      this.soapModel,
      SOAP_SYSTEM,
      `構造化データ（骨組み。ここにある事実は必ずSOAPに出す）:\n${JSON.stringify(data, null, 2)}\n${styleBlock ? `\n${styleBlock}\n` : ''}${transcriptBlock}\nkeys: subjective, objective, assessment, plan のSOAPをJSONで生成。各値は1行1事実のプレーンテキスト。会話で扱われた事実を落とさないこと。`,
      SOAP_MAX_TOKENS,
    );
    const parsed = JSON.parse(result.content) as Record<string, unknown>;
    return {
      subjective: normalizeSoapField(parsed.subjective),
      objective: normalizeSoapField(parsed.objective),
      assessment: normalizeSoapField(parsed.assessment),
      plan: normalizeSoapField(parsed.plan),
    };
  }

  async consultChat(
    system: string,
    messages: Array<{ role: 'user' | 'assistant'; content: string }>,
  ): Promise<string> {
    const lastUser = [...messages].reverse().find((m) => m.role === 'user')?.content ?? '';
    const history = messages
      .slice(0, -1)
      .map((m) => `${m.role === 'user' ? '医師' : 'AI'}: ${m.content}`)
      .join('\n');
    const result = await this.chat(
      system,
      `${history ? `これまでの会話:\n${history}\n\n` : ''}医師の入力:\n${lastUser}`,
      false,
    );
    return result.content;
  }

  async subkarteChat(
    system: string,
    messages: Array<{ role: 'user' | 'assistant'; content: string }>,
    context: {
      soap: { subjective: string; objective: string; assessment: string; plan: string };
      note: string;
      documents: Record<string, unknown>;
      patientSummary?: string;
      structured?: unknown;
    },
  ) {
    const lastUser = [...messages].reverse().find((m) => m.role === 'user')?.content ?? '';
    const history = messages
      .slice(0, -1)
      .map((m) => `${m.role === 'user' ? '医師' : 'AI'}: ${m.content}`)
      .join('\n');
    const result = await this.chatJson(
      system,
      `${history ? `これまでの会話:\n${history}\n\n` : ''}${context.patientSummary ? `患者: ${context.patientSummary}\n` : ''}現在のSOAP:\n${JSON.stringify(context.soap, null, 2)}
通常診療記録:\n${context.note || '（なし）'}
${context.structured ? `構造化診療データ:\n${JSON.stringify(context.structured, null, 2)}\n` : ''}既存書類:\n${JSON.stringify(context.documents, null, 2)}

医師の入力:\n${lastUser}`,
      DOCUMENT_MAX_TOKENS,
    );
    try {
      return JSON.parse(result.content) as {
        reply: string;
        soapPatch?: { subjective?: string; objective?: string; assessment?: string; plan?: string };
        notePatch?: string;
        documentPatches?: Array<{ type: string; content: Record<string, unknown> }>;
        generateDocuments?:
          | 'all'
          | Array<
              | 'referral'
              | 'prescription'
              | 'certificate'
              | 'care-opinion-1'
              | 'care-opinion-2'
              | 'info-combined'
            >;
      };
    } catch {
      return { reply: result.content || '記録しました。' };
    }
  }

  async generateClinicalNote(
    data: StructuredClinicalDataPayload,
    _consultationId?: string,
    transcript?: string,
  ) {
    const result = await this.chatWithModel(
      this.model,
      NOTE_SYSTEM,
      `構造化データ:\n${JSON.stringify(data, null, 2)}${
        transcript
          ? `\n\n診察の文字起こし（出典。ここに無いことは書かない）:\n${truncateForLlm(transcript)}`
          : ''
      }`,
      false,
      NOTE_MAX_TOKENS,
    );
    return result.content;
  }

  async generateDocument(
    type: GeneratedDocumentType,
    system: string,
    user: string,
  ): Promise<Record<string, unknown>> {
    const result = await this.chatJsonWithModel(
      this.documentModel,
      system,
      user,
      DOCUMENT_MAX_TOKENS,
    );
    return JSON.parse(result.content) as Record<string, unknown>;
  }

  getLastUsage(): { inputTokens?: number; outputTokens?: number } | undefined {
    return this.lastUsage;
  }

  private lastUsage?: { inputTokens?: number; outputTokens?: number };

  private async chatJson(
    system: string,
    user: string,
    maxTokens?: number,
  ): Promise<ChatResult> {
    return this.chatJsonWithModel(this.model, system, user, maxTokens);
  }

  private async chatJsonWithModel(
    model: string,
    system: string,
    user: string,
    maxTokens?: number,
  ): Promise<ChatResult> {
    try {
      return await this.chatWithModel(model, system, user, true, maxTokens);
    } catch (error) {
      // Retry only malformed JSON — never retry timeouts / aborts / HTTP failures.
      if (isAbortError(error)) throw error;
      const message = error instanceof Error ? error.message : String(error);
      if (/timed out/i.test(message)) throw error;
      const isJsonParse =
        error instanceof SyntaxError ||
        /invalid JSON|Unexpected token|is not valid JSON/i.test(message);
      if (!isJsonParse) throw error;
      return await this.chatWithModel(
        model,
        '有効なJSONのみを返してください。構文エラーを修正してください。',
        `次の内容を有効なJSONとして再生成:\n${user}`,
        true,
        maxTokens,
      );
    }
  }

  private assertApiKey() {
    if (!this.apiKey) {
      throw new Error('OPENAI_API_KEY is required when LLM_PROVIDER=openai');
    }
  }

  private async chat(system: string, user: string, jsonMode: boolean): Promise<ChatResult> {
    return this.chatWithModel(this.model, system, user, jsonMode);
  }

  private async chatWithModel(
    model: string,
    system: string,
    user: string,
    jsonMode: boolean,
    maxTokens?: number,
  ): Promise<ChatResult> {
    this.assertApiKey();
    const response = await this.requestChat(model, system, user, jsonMode, 0, maxTokens);
    const content = response.content.trim();
    if (!content) {
      throw new Error('OpenAI LLM returned empty response');
    }
    this.lastUsage = {
      inputTokens: response.inputTokens,
      outputTokens: response.outputTokens,
    };
    if (jsonMode) {
      try {
        JSON.parse(content);
      } catch (error) {
        const detail = error instanceof Error ? error.message : String(error);
        throw new SyntaxError(`OpenAI LLM returned invalid JSON: ${detail}`);
      }
    }
    return response;
  }

  private async requestChat(
    model: string,
    system: string,
    user: string,
    jsonMode: boolean,
    attempt = 0,
    maxTokens?: number,
  ): Promise<ChatResult> {
    const maxAttempts = 3;
    let response: Response;
    try {
      response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(LLM_FETCH_TIMEOUT_MS),
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: system },
            { role: 'user', content: user },
          ],
          temperature: 0.1,
          ...(typeof maxTokens === 'number' ? { max_tokens: maxTokens } : {}),
          ...(jsonMode ? { response_format: { type: 'json_object' } } : {}),
        }),
      });
    } catch (error) {
      if (isAbortError(error)) {
        throw new Error('OpenAI LLM timed out');
      }
      throw error;
    }

    if (!response.ok) {
      const errorBody = await response.text();
      if (isRetryableHttpStatus(response.status) && attempt < maxAttempts - 1) {
        await sleep(1000 * Math.pow(2, attempt));
        return this.requestChat(model, system, user, jsonMode, attempt + 1, maxTokens);
      }
      throw new Error(
        localizeOpenAiError(`OpenAI LLM failed (${response.status}): ${errorBody}`),
      );
    }

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
      usage?: { prompt_tokens?: number; completion_tokens?: number };
    };
    const content = data.choices?.[0]?.message?.content ?? '';
    return {
      content,
      inputTokens: data.usage?.prompt_tokens,
      outputTokens: data.usage?.completion_tokens,
    };
  }
}
