import {
  LlmProvider,
  StructuredClinicalDataPayload,
  StructuredClinicalDataSchema,
} from './llm.provider';
import { GeneratedDocumentType } from '@prisma/client';

export interface OpenAiLlmConfig {
  apiKey: string;
  model?: string;
}

export type ChatResult = {
  content: string;
  inputTokens?: number;
  outputTokens?: number;
};

const EXTRACTION_SYSTEM = `あなたは日本のクリニック向け医療情報抽出アシスタントです。
文字起こしに明示されている事実のみを抽出してください。
推測・診断の追加・処方の創作・検査値の捏造は禁止です。
不明な項目は省略するか、薬剤名に「（要確認）」を付けてください。
出力は有効なJSONのみとします。`;

const EXTRACTION_SCHEMA = `{
  "chiefComplaint": "string (optional)",
  "presentIllness": "string (optional)",
  "pastHistory": "string (optional)",
  "medications": ["string"] (optional),
  "allergies": ["string"] (optional),
  "vitals": "string (optional)",
  "physicalExam": "string (optional)",
  "assessment": "string (optional) — 医師が述べた印象のみ。AIの診断は不可",
  "plan": "string (optional)"
}`;

const SOAP_SYSTEM = `あなたは日本のクリニック向けSOAP作成アシスタントです。
検証済みの構造化診療データのみからSOAPを作成します。
会話調ではなくカルテ調の日本語で記載してください。
データにない情報は追加しないでください。
出力は次の4キーのみ。各値は必ずプレーンテキストの文字列（ネストしたオブジェクト不可）:
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

export class OpenAiLlmProvider implements LlmProvider {
  readonly name = 'openai';
  private readonly apiKey: string;
  private readonly model: string;

  constructor(config: OpenAiLlmConfig) {
    this.apiKey = config.apiKey;
    this.model = config.model ?? 'gpt-4o-mini';
  }

  async extractStructured(transcript: string, _consultationId?: string) {
    const result = await this.chatJson(
      EXTRACTION_SYSTEM,
      `文字起こし:\n${transcript}\n\n次のスキーマに従い構造化データをJSONで抽出:\n${EXTRACTION_SCHEMA}`,
    );
    const parsed = JSON.parse(result.content) as StructuredClinicalDataPayload;
    return StructuredClinicalDataSchema.parse(parsed);
  }

  async generateSoap(data: StructuredClinicalDataPayload, _consultationId?: string) {
    const result = await this.chatJson(
      SOAP_SYSTEM,
      `構造化データ:\n${JSON.stringify(data, null, 2)}\n\nkeys: subjective, objective, assessment, plan のSOAPをJSONで生成。各値は文字列のみ。`,
    );
    const parsed = JSON.parse(result.content) as Record<string, unknown>;
    return {
      subjective: normalizeSoapField(parsed.subjective),
      objective: normalizeSoapField(parsed.objective),
      assessment: normalizeSoapField(parsed.assessment),
      plan: normalizeSoapField(parsed.plan),
    };
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
    const result = await this.chatJson(system, user);
    return JSON.parse(result.content) as Record<string, unknown>;
  }

  getLastUsage(): { inputTokens?: number; outputTokens?: number } | undefined {
    return this.lastUsage;
  }

  private lastUsage?: { inputTokens?: number; outputTokens?: number };

  private async chatJson(system: string, user: string): Promise<ChatResult> {
    try {
      const result = await this.chat(system, user, true);
      return result;
    } catch (error) {
      const fix = await this.chat(
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
    this.assertApiKey();
    const response = await this.requestChat(system, user, jsonMode);
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
    system: string,
    user: string,
    jsonMode: boolean,
    attempt = 0,
  ): Promise<ChatResult> {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.model,
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
      if ((response.status === 429 || response.status >= 500) && attempt < 1) {
        await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
        return this.requestChat(system, user, jsonMode, attempt + 1);
      }
      throw new Error(`OpenAI LLM failed (${response.status}): ${errorBody}`);
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
