import {
  LlmProvider,
  StructuredClinicalDataPayload,
  StructuredClinicalDataSchema,
} from './llm.provider';
import { GeneratedDocumentType } from '@prisma/client';
import { MedicalGlossary } from './medical-glossary.types';
import { glossaryToLlmHint } from './medical-glossary';
import {
  isRetryableHttpStatus,
  localizeOpenAiError,
  sleep,
} from './openai-retry.util';

export interface OpenAiLlmConfig {
  apiKey: string;
  model?: string;
  correctionModel?: string;
  /** 書類生成用モデル。誤字脱字と転記精度を優先して既定は gpt-4o。 */
  documentModel?: string;
}

export type ChatResult = {
  content: string;
  inputTokens?: number;
  outputTokens?: number;
};

const EXTRACTION_SYSTEM = `あなたは日本のクリニック向け医療情報抽出アシスタントです。
文字起こしに明示されている事実のみを抽出してください。
推測・診断の追加・処方の創作・検査値の捏造は禁止です。
各フィールドは短い事実句のみ（例: 「発熱38.0℃」「咳3日」「右下肺 wheeze」）。
「認めます」「疑いです」「考えます」などの説明文・診断作文は書かない。
不明な項目は省略するか、薬剤名に「（要確認）」を付けてください。
出力は有効なJSONのみとします。`;

const EXTRACTION_SCHEMA = `{
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

const SOAP_SYSTEM = `あなたは日本のクリニック向けSOAP作成アシスタントです。
検証済みの構造化診療データと、指定された定型床（テンプレート）のみからSOAPを作成します。

厳守:
- 事実の最小抽出のみ。説明文・診断作文は禁止（「認めます」「疑いです」「考えます」「印象です」等を使わない）
- 各欄は短い事実句（例: 「発熱38.0℃」「咳3日」「右下肺 wheeze」「ムコダイン継続」）。1行1事実を基本とする
- データにない情報・検査・診断を追加しない
- 定型床は「変化がないときの下書き」。構造化データに具体事実があれば床を上書きする
- 通常診察(ROUTINE)で差分がなければ assessment=stable / plan=定時薬を継続する。 を使う
- 健診(CHECKUP)で差分がなければ床の S/O を使い、A/P は根拠がなければ空文字
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
構造化データに存在する情報のみを使用し、【主訴】【現病歴】【所見】【評価】【方針】などの見出しを適宜使用してください。
推測や追加情報は禁止です。`;

const TRANSCRIPT_CORRECTION_SYSTEM = `あなたは日本の内科クリニック向け文字起こし校正アシスタントです。
音声認識の同音異義誤りを、診察文脈と内科ナレッジから修正してください。

ルール:
- 意味を追加・削除しない
- 医師が言っていない診断・薬剤を創作しない
- 明らかな同音異義のみ修正（例: 期間支援→気管支炎、無効団員→ムコダイン、調子んでは→聴診では）
- 薬剤名・用量・単位・アレルギー・検査値・左右・陽性陰性・中止/継続は慎重に扱い、数値の桁違いは補正しない
- 否定表現を反転させない
- 商品名と一般名は双方向に正しく正規化してよい（例: カロナール→アセトアミノフェン、またはその逆で文脈に合わせる）
- 不明な場合は原文維持 + （要確認）を付ける
- 出力は校正後の文字起こしテキストのみ`;

export class OpenAiLlmProvider implements LlmProvider {
  readonly name = 'openai';
  private readonly apiKey: string;
  private readonly model: string;
  private readonly correctionModel: string;
  private readonly documentModel: string;

  constructor(config: OpenAiLlmConfig) {
    this.apiKey = config.apiKey;
    this.model = config.model ?? 'gpt-4o-mini';
    this.correctionModel = config.correctionModel ?? 'gpt-4o';
    this.documentModel = config.documentModel ?? 'gpt-4o';
  }

  async correctTranscript(transcript: string, glossary?: MedicalGlossary, _consultationId?: string) {
    const hint = glossary
      ? `\n\nクリニック語彙:\n${glossaryToLlmHint(glossary, glossary.sessionHits)}`
      : '';
    const result = await this.chatWithModel(
      this.correctionModel,
      TRANSCRIPT_CORRECTION_SYSTEM,
      `文字起こし:\n${transcript}${hint}`,
      false,
    );
    return result.content.trim() || transcript;
  }

  async extractStructured(transcript: string, _consultationId?: string) {
    const result = await this.chatJson(
      EXTRACTION_SYSTEM,
      `文字起こし:\n${transcript}\n\n次のスキーマに従い構造化データをJSONで抽出:\n${EXTRACTION_SCHEMA}`,
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
    const result = await this.chatJson(
      SOAP_SYSTEM,
      `構造化データ:\n${JSON.stringify(data, null, 2)}\n${styleBlock ? `\n${styleBlock}\n` : ''}\nkeys: subjective, objective, assessment, plan のSOAPをJSONで生成。各値は事実の短句のみ（文字列）。散文禁止。`,
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
      documents: Record<string, Record<string, unknown>>;
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

  async generateClinicalNote(data: StructuredClinicalDataPayload, _consultationId?: string) {
    const result = await this.chat(
      NOTE_SYSTEM,
      `構造化データ:\n${JSON.stringify(data, null, 2)}`,
      false,
    );
    return result.content;
  }

  async generateDocument(
    type: GeneratedDocumentType,
    system: string,
    user: string,
  ): Promise<Record<string, unknown>> {
    const result = await this.chatJsonWithModel(this.documentModel, system, user);
    return JSON.parse(result.content) as Record<string, unknown>;
  }

  getLastUsage(): { inputTokens?: number; outputTokens?: number } | undefined {
    return this.lastUsage;
  }

  private lastUsage?: { inputTokens?: number; outputTokens?: number };

  private async chatJson(system: string, user: string): Promise<ChatResult> {
    return this.chatJsonWithModel(this.model, system, user);
  }

  private async chatJsonWithModel(
    model: string,
    system: string,
    user: string,
  ): Promise<ChatResult> {
    try {
      const result = await this.chatWithModel(model, system, user, true);
      return result;
    } catch (error) {
      const fix = await this.chatWithModel(
        model,
        '有効なJSONのみを返してください。構文エラーを修正してください。',
        `次の内容を有効なJSONとして再生成:\n${user}`,
        true,
      );
      return fix;
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
  ): Promise<ChatResult> {
    this.assertApiKey();
    const response = await this.requestChat(model, system, user, jsonMode);
    const content = response.content.trim();
    if (!content) {
      throw new Error('OpenAI LLM returned empty response');
    }
    this.lastUsage = {
      inputTokens: response.inputTokens,
      outputTokens: response.outputTokens,
    };
    if (jsonMode) {
      JSON.parse(content);
    }
    return response;
  }

  private async requestChat(
    model: string,
    system: string,
    user: string,
    jsonMode: boolean,
    attempt = 0,
  ): Promise<ChatResult> {
    const maxAttempts = 3;
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
        temperature: 0.1,
        ...(jsonMode ? { response_format: { type: 'json_object' } } : {}),
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      if (isRetryableHttpStatus(response.status) && attempt < maxAttempts - 1) {
        await sleep(1000 * Math.pow(2, attempt));
        return this.requestChat(model, system, user, jsonMode, attempt + 1);
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
