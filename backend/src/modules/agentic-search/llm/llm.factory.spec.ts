import { ConfigService } from '@nestjs/config';
import { LLMFactory } from './llm.factory';
import { ILLMAdapter, LLMResponse } from './llm-adapter.interface';

// ─── Mock adapters ─────────────────────────────────────────────────────────────

function createMockAdapter(name: string, shouldFail = false): ILLMAdapter {
  return {
    getProviderName: () => name,
    chat: jest.fn().mockImplementation(async () => {
      if (shouldFail) throw new Error(`${name} failed`);
      return {
        content: `Response from ${name}`,
        toolCalls: [],
        finishReason: 'stop',
      } as LLMResponse;
    }),
  };
}

function createConfigService(overrides: Record<string, any> = {}): ConfigService {
  const defaults: Record<string, any> = {
    'llm.openaiApiKey': undefined,
    'llm.anthropicApiKey': undefined,
    'llm.googleAiApiKey': undefined,
    'llm.provider': 'openai',
  };
  const merged = { ...defaults, ...overrides };
  return { get: jest.fn((key: string) => merged[key]) } as unknown as ConfigService;
}

// ─── Tests ─────────────────────────────────────────────────────────────────────

describe('LLMFactory', () => {
  describe('constructor — adapter registration', () => {
    it('should register only adapters with API keys', () => {
      const openai = createMockAdapter('openai');
      const claude = createMockAdapter('claude');
      const gemini = createMockAdapter('gemini');
      const config = createConfigService({
        'llm.openaiApiKey': 'sk-test',
        // claude and gemini have no keys
      });

      const factory = new LLMFactory(config, openai as any, claude as any, gemini as any);

      expect(factory.getAvailableProviders()).toEqual(['openai']);
      expect(factory.getFallbackChain()).toEqual(['openai']);
    });

    it('should register all adapters when all keys are present', () => {
      const openai = createMockAdapter('openai');
      const claude = createMockAdapter('claude');
      const gemini = createMockAdapter('gemini');
      const config = createConfigService({
        'llm.openaiApiKey': 'sk-test',
        'llm.anthropicApiKey': 'sk-ant-test',
        'llm.googleAiApiKey': 'ai-test',
      });

      const factory = new LLMFactory(config, openai as any, claude as any, gemini as any);

      expect(factory.getAvailableProviders()).toEqual(['openai', 'claude', 'gemini']);
    });

    it('should have empty chain when no keys are configured', () => {
      const openai = createMockAdapter('openai');
      const claude = createMockAdapter('claude');
      const gemini = createMockAdapter('gemini');
      const config = createConfigService();

      const factory = new LLMFactory(config, openai as any, claude as any, gemini as any);

      expect(factory.getAvailableProviders()).toEqual([]);
      expect(factory.getFallbackChain()).toEqual([]);
    });
  });

  describe('constructor — fallback chain ordering', () => {
    it('should put primary provider first in fallback chain', () => {
      const openai = createMockAdapter('openai');
      const claude = createMockAdapter('claude');
      const gemini = createMockAdapter('gemini');
      const config = createConfigService({
        'llm.openaiApiKey': 'sk-test',
        'llm.anthropicApiKey': 'sk-ant-test',
        'llm.googleAiApiKey': 'ai-test',
        'llm.provider': 'claude',
      });

      const factory = new LLMFactory(config, openai as any, claude as any, gemini as any);

      expect(factory.getFallbackChain()).toEqual(['claude', 'openai', 'gemini']);
    });

    it('should skip unavailable providers in chain', () => {
      const openai = createMockAdapter('openai');
      const claude = createMockAdapter('claude');
      const gemini = createMockAdapter('gemini');
      const config = createConfigService({
        'llm.anthropicApiKey': 'sk-ant-test',
        'llm.googleAiApiKey': 'ai-test',
        'llm.provider': 'openai', // primary has no key
      });

      const factory = new LLMFactory(config, openai as any, claude as any, gemini as any);

      // openai skipped (no key), claude and gemini available
      expect(factory.getFallbackChain()).toEqual(['claude', 'gemini']);
    });

    it('should default to openai as primary when no provider configured', () => {
      const openai = createMockAdapter('openai');
      const claude = createMockAdapter('claude');
      const gemini = createMockAdapter('gemini');
      const config = createConfigService({
        'llm.openaiApiKey': 'sk-test',
        'llm.anthropicApiKey': 'sk-ant-test',
        'llm.provider': undefined,
      });

      const factory = new LLMFactory(config, openai as any, claude as any, gemini as any);

      expect(factory.getFallbackChain()[0]).toBe('openai');
    });
  });

  describe('getAdapter', () => {
    let factory: LLMFactory;
    let openai: ILLMAdapter;
    let claude: ILLMAdapter;

    beforeEach(() => {
      openai = createMockAdapter('openai');
      claude = createMockAdapter('claude');
      const gemini = createMockAdapter('gemini');
      const config = createConfigService({
        'llm.openaiApiKey': 'sk-test',
        'llm.anthropicApiKey': 'sk-ant-test',
      });
      factory = new LLMFactory(config, openai as any, claude as any, gemini as any);
    });

    it('should return primary adapter when no provider specified', () => {
      expect(factory.getAdapter()).toBe(openai);
    });

    it('should return specific adapter by provider name', () => {
      expect(factory.getAdapter('claude')).toBe(claude);
    });

    it('should return null for unavailable provider', () => {
      expect(factory.getAdapter('gemini')).toBeNull();
    });

    it('should return null when no providers configured', () => {
      const config = createConfigService();
      const emptyFactory = new LLMFactory(
        config,
        createMockAdapter('openai') as any,
        createMockAdapter('claude') as any,
        createMockAdapter('gemini') as any,
      );
      expect(emptyFactory.getAdapter()).toBeNull();
    });
  });

  describe('chatWithFallback', () => {
    it('should return response from primary provider on success', async () => {
      const openai = createMockAdapter('openai');
      const claude = createMockAdapter('claude');
      const gemini = createMockAdapter('gemini');
      const config = createConfigService({
        'llm.openaiApiKey': 'sk-test',
        'llm.anthropicApiKey': 'sk-ant-test',
      });
      const factory = new LLMFactory(config, openai as any, claude as any, gemini as any);

      const result = await factory.chatWithFallback([{ role: 'user', content: 'test' }]);

      expect(result.content).toBe('Response from openai');
      expect(result.provider).toBe('openai');
      expect(openai.chat).toHaveBeenCalledTimes(1);
      expect(claude.chat).not.toHaveBeenCalled();
    });

    it('should fallback to next provider when primary fails', async () => {
      const openai = createMockAdapter('openai', true); // fails
      const claude = createMockAdapter('claude');
      const gemini = createMockAdapter('gemini');
      const config = createConfigService({
        'llm.openaiApiKey': 'sk-test',
        'llm.anthropicApiKey': 'sk-ant-test',
      });
      const factory = new LLMFactory(config, openai as any, claude as any, gemini as any);

      const result = await factory.chatWithFallback([{ role: 'user', content: 'test' }]);

      expect(result.content).toBe('Response from claude');
      expect(result.provider).toBe('claude');
      expect(openai.chat).toHaveBeenCalledTimes(1);
      expect(claude.chat).toHaveBeenCalledTimes(1);
    });

    it('should try all providers before throwing', async () => {
      const openai = createMockAdapter('openai', true);
      const claude = createMockAdapter('claude', true);
      const gemini = createMockAdapter('gemini', true);
      const config = createConfigService({
        'llm.openaiApiKey': 'sk-test',
        'llm.anthropicApiKey': 'sk-ant-test',
        'llm.googleAiApiKey': 'ai-test',
      });
      const factory = new LLMFactory(config, openai as any, claude as any, gemini as any);

      await expect(
        factory.chatWithFallback([{ role: 'user', content: 'test' }]),
      ).rejects.toThrow('gemini failed');

      expect(openai.chat).toHaveBeenCalledTimes(1);
      expect(claude.chat).toHaveBeenCalledTimes(1);
      expect(gemini.chat).toHaveBeenCalledTimes(1);
    });

    it('should throw when no providers configured', async () => {
      const config = createConfigService();
      const factory = new LLMFactory(
        config,
        createMockAdapter('openai') as any,
        createMockAdapter('claude') as any,
        createMockAdapter('gemini') as any,
      );

      await expect(
        factory.chatWithFallback([{ role: 'user', content: 'test' }]),
      ).rejects.toThrow('No LLM providers configured');
    });

    it('should pass tools and options to adapter', async () => {
      const openai = createMockAdapter('openai');
      const config = createConfigService({ 'llm.openaiApiKey': 'sk-test' });
      const factory = new LLMFactory(
        config,
        openai as any,
        createMockAdapter('claude') as any,
        createMockAdapter('gemini') as any,
      );

      const tools = [{ name: 'test_tool', description: 'Test', parameters: {} }];
      const options = { model: 'gpt-4o', maxTokens: 500 };

      await factory.chatWithFallback(
        [{ role: 'user', content: 'test' }],
        tools,
        options,
      );

      expect(openai.chat).toHaveBeenCalledWith(
        [{ role: 'user', content: 'test' }],
        tools,
        options,
      );
    });
  });
});
