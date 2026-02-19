import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ILLMAdapter, LLMMessage, LLMTool, LLMResponse, LLMChatOptions } from './llm-adapter.interface';
import { OpenAIAdapter } from './openai.adapter';
import { ClaudeAdapter } from './claude.adapter';
import { GeminiAdapter } from './gemini.adapter';

/**
 * LLM Factory with automatic fallback chain.
 *
 * If the primary provider fails, it tries the next available provider.
 * Provider order is configurable via LLM_PROVIDER env var, with the others
 * used as fallbacks in order: openai → claude → gemini.
 */
@Injectable()
export class LLMFactory {
  private readonly logger = new Logger(LLMFactory.name);
  private adapters: Map<string, ILLMAdapter> = new Map();
  private fallbackChain: string[] = [];

  constructor(
    private readonly configService: ConfigService,
    private readonly openai: OpenAIAdapter,
    private readonly claude: ClaudeAdapter,
    private readonly gemini: GeminiAdapter,
  ) {
    // Register all adapters
    const allProviders: Array<{ key: string; adapter: ILLMAdapter; envKey: string }> = [
      { key: 'openai', adapter: this.openai, envKey: 'llm.openaiApiKey' },
      { key: 'claude', adapter: this.claude, envKey: 'llm.anthropicApiKey' },
      { key: 'gemini', adapter: this.gemini, envKey: 'llm.googleAiApiKey' },
    ];

    // Only register adapters that have API keys configured
    for (const { key, adapter, envKey } of allProviders) {
      const apiKey = this.configService.get<string>(envKey);
      if (apiKey) {
        this.adapters.set(key, adapter);
      }
    }

    // Build fallback chain: primary first, then others
    const primary = this.configService.get<string>('llm.provider') || 'openai';
    const order = [primary, ...['openai', 'claude', 'gemini'].filter(p => p !== primary)];
    this.fallbackChain = order.filter(p => this.adapters.has(p));

    if (this.fallbackChain.length > 0) {
      this.logger.log(`LLM providers available: ${this.fallbackChain.join(' → ')} (fallback chain)`);
    } else {
      this.logger.warn('No LLM API keys configured — AI features disabled');
    }
  }

  /**
   * Get the primary adapter (no fallback).
   */
  getAdapter(provider?: string): ILLMAdapter | null {
    if (provider) {
      return this.adapters.get(provider) || null;
    }
    const primaryKey = this.fallbackChain[0];
    return primaryKey ? (this.adapters.get(primaryKey) || null) : null;
  }

  /**
   * Chat with automatic fallback across providers.
   * If the primary provider fails, tries the next in the chain.
   */
  async chatWithFallback(
    messages: LLMMessage[],
    tools?: LLMTool[],
    options?: LLMChatOptions,
  ): Promise<LLMResponse & { provider: string }> {
    if (this.fallbackChain.length === 0) {
      throw new Error('No LLM providers configured');
    }

    let lastError: Error | null = null;

    for (const providerKey of this.fallbackChain) {
      const adapter = this.adapters.get(providerKey)!;
      try {
        const response = await adapter.chat(messages, tools, options);
        return { ...response, provider: providerKey };
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        this.logger.warn(
          `LLM provider '${providerKey}' failed: ${lastError.message}. ` +
          `Trying next provider...`,
        );
      }
    }

    throw lastError || new Error('All LLM providers failed');
  }

  getAvailableProviders(): string[] {
    return Array.from(this.adapters.keys());
  }

  getFallbackChain(): string[] {
    return [...this.fallbackChain];
  }
}
