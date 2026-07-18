import { AiConfigService } from '../src/providers/ai/ai-config.service';

describe('AiConfigService', () => {
  it('throws when openai provider is set without API key', () => {
    const config = {
      get: (key: string, defaultValue?: string) => {
        const map: Record<string, string> = {
          STT_PROVIDER: 'openai',
          LLM_PROVIDER: 'mock',
          OPENAI_API_KEY: '',
        };
        return map[key] ?? defaultValue ?? '';
      },
    };

    const service = new AiConfigService(config as never);
    expect(() => service['validateProviders']()).toThrow('OPENAI_API_KEY');
  });

  it('reports snapshot with provider names', () => {
    const config = {
      get: (key: string, defaultValue?: string) => {
        const map: Record<string, string> = {
          STT_PROVIDER: 'mock',
          LLM_PROVIDER: 'mock',
          OPENAI_API_KEY: '',
        };
        return map[key] ?? defaultValue ?? '';
      },
    };

    const service = new AiConfigService(config as never);
    service['validateProviders']();
    const snapshot = service.getSnapshot();
    expect(snapshot.sttProvider).toBe('mock');
    expect(snapshot.apiKeyConfigured).toBe(false);
  });
});
