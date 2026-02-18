import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ILLMAdapter } from './llm-adapter.interface';
import { OpenAIAdapter } from './openai.adapter';
import { ClaudeAdapter } from './claude.adapter';
import { GeminiAdapter } from './gemini.adapter';

@Injectable()
export class LLMFactory {
  private adapters: Map<string, ILLMAdapter> = new Map();

  constructor(
    private readonly configService: ConfigService,
    private readonly openai: OpenAIAdapter,
    private readonly claude: ClaudeAdapter,
    private readonly gemini: GeminiAdapter,
  ) {
    this.adapters.set('openai', this.openai);
    this.adapters.set('claude', this.claude);
    this.adapters.set('gemini', this.gemini);
  }

  getAdapter(provider?: string): ILLMAdapter {
    const providerName =
      provider || this.configService.get<string>('llm.provider') || 'openai';
    const adapter = this.adapters.get(providerName);

    if (!adapter) {
      throw new Error(`LLM provider '${providerName}' not found`);
    }

    return adapter;
  }

  getAvailableProviders(): string[] {
    return Array.from(this.adapters.keys());
  }
}
