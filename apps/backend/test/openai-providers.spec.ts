import { OpenAiLlmProvider } from '../src/providers/ai/openai-llm.provider';
import { OpenAiSttProvider } from '../src/providers/ai/openai-stt.provider';

const originalFetch = global.fetch;

describe('OpenAiLlmProvider', () => {
  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it('extracts structured data from chat completion', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: JSON.stringify({ chiefComplaint: '頭痛' }) } }],
        usage: { prompt_tokens: 10, completion_tokens: 5 },
      }),
    });

    const provider = new OpenAiLlmProvider({ apiKey: 'test-key' });
    const result = await provider.extractStructured('頭が痛いです');
    expect(result.chiefComplaint).toBe('頭痛');
    expect(provider.getLastUsage()?.inputTokens).toBe(10);
  });

  it('retries on 429', async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 429,
        text: async () => 'rate limited',
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: JSON.stringify({ plan: '経過観察' }) } }],
        }),
      });

    const provider = new OpenAiLlmProvider({ apiKey: 'test-key' });
    const soap = await provider.generateSoap({ plan: '経過観察' });
    expect(soap.plan).toBe('経過観察');
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });
});

describe('OpenAiSttProvider', () => {
  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it('rejects audio that is too short', async () => {
    const provider = new OpenAiSttProvider({ apiKey: 'test-key' });
    await expect(provider.transcribeFinal(Buffer.alloc(64))).rejects.toThrow('短すぎ');
  });

  it('returns segments from whisper verbose_json', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        segments: [{ id: 0, start: 0, end: 1.5, text: ' こんにちは ' }],
      }),
    });

    const provider = new OpenAiSttProvider({ apiKey: 'test-key' });
    const segments = await provider.transcribeFinal(Buffer.alloc(2048));
    expect(segments[0]?.text).toBe('こんにちは');
  });

  it('does not transcribe stream chunks', async () => {
    const provider = new OpenAiSttProvider({ apiKey: 'test-key' });
    const result = await provider.transcribeStream(Buffer.alloc(2048), 0);
    expect(result).toBeNull();
  });
});
