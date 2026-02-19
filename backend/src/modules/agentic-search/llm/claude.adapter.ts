import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ILLMAdapter,
  LLMMessage,
  LLMTool,
  LLMResponse,
  LLMChatOptions,
} from './llm-adapter.interface';

const DEFAULT_MODEL = 'claude-sonnet-4-20250514';
const DEFAULT_MAX_TOKENS = 4096;
const REQUEST_TIMEOUT_MS = 30_000;
const MAX_RETRIES = 3;
const RETRYABLE_STATUS_CODES = [429, 500, 502, 503, 504];

@Injectable()
export class ClaudeAdapter implements ILLMAdapter {
  private readonly logger = new Logger(ClaudeAdapter.name);
  private readonly apiKey: string;
  private readonly baseUrl = 'https://api.anthropic.com/v1';

  constructor(private readonly configService: ConfigService) {
    this.apiKey = this.configService.get<string>('llm.anthropicApiKey') || '';
  }

  getProviderName(): string {
    return 'claude';
  }

  async chat(messages: LLMMessage[], tools?: LLMTool[], options?: LLMChatOptions): Promise<LLMResponse> {
    const systemMessage = messages.find((m) => m.role === 'system');
    const nonSystemMessages = messages.filter((m) => m.role !== 'system');

    const model = options?.model || DEFAULT_MODEL;
    const maxTokens = options?.maxTokens || DEFAULT_MAX_TOKENS;

    const body: any = {
      model,
      max_tokens: maxTokens,
      messages: nonSystemMessages.map((m) => {
        if (m.role === 'tool') {
          return {
            role: 'user',
            content: [
              {
                type: 'tool_result',
                tool_use_id: m.toolCallId,
                content: m.content,
              },
            ],
          };
        }
        // Handle assistant messages with tool_use content blocks
        if (m.role === 'assistant') {
          try {
            const parsed = JSON.parse(m.content);
            if (Array.isArray(parsed) && parsed.some((b: any) => b.type === 'tool_use')) {
              return { role: 'assistant', content: parsed };
            }
          } catch {
            // Not JSON, send as plain text
          }
          return { role: 'assistant', content: m.content };
        }
        return { role: m.role, content: m.content };
      }),
    };

    // ─── Prompt Caching: system prompt ────────────────────────────────
    // The system prompt is identical on every request, so we mark it as
    // cacheable. Anthropic caches it for 5 minutes — subsequent requests
    // within that window pay only 10% of the input token cost.
    if (systemMessage) {
      body.system = [
        {
          type: 'text',
          text: systemMessage.content,
          cache_control: { type: 'ephemeral' },
        },
      ];
    }

    // ─── Prompt Caching: tool definitions ─────────────────────────────
    // Tool definitions are also static and repeated every request.
    // Mark the last tool with cache_control to cache the entire tool block.
    if (tools && tools.length > 0) {
      body.tools = tools.map((t, idx) => {
        const toolDef: any = {
          name: t.name,
          description: t.description,
          input_schema: t.parameters,
        };
        // Cache breakpoint on the last tool — caches all tools as a block
        if (idx === tools.length - 1) {
          toolDef.cache_control = { type: 'ephemeral' };
        }
        return toolDef;
      });
    }

    const data = await this.fetchWithRetry(`${this.baseUrl}/messages`, {
      method: 'POST',
      headers: {
        'x-api-key': this.apiKey,
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01',
        'anthropic-beta': 'prompt-caching-2024-07-31',
      },
      body: JSON.stringify(body),
    });

    // Log cache performance for monitoring
    if (data.usage) {
      const cached = data.usage.cache_read_input_tokens || 0;
      const created = data.usage.cache_creation_input_tokens || 0;
      const regular = data.usage.input_tokens || 0;
      if (cached > 0) {
        this.logger.log(
          `Cache HIT: ${cached} tokens cached (saved ~${Math.round(cached * 0.9)} tokens cost), ${regular} regular input, ${data.usage.output_tokens} output`,
        );
      } else if (created > 0) {
        this.logger.log(
          `Cache WRITE: ${created} tokens written to cache, ${regular} regular input, ${data.usage.output_tokens} output`,
        );
      } else {
        this.logger.debug(
          `No cache: ${regular} input, ${data.usage.output_tokens} output`,
        );
      }
    }

    const textBlock = data.content.find((b: any) => b.type === 'text');
    const toolUseBlocks = data.content.filter(
      (b: any) => b.type === 'tool_use',
    );

    return {
      content: textBlock?.text || null,
      toolCalls: toolUseBlocks.map((tc: any) => ({
        id: tc.id,
        name: tc.name,
        arguments: tc.input,
      })),
      finishReason: data.stop_reason,
    };
  }

  // ─── Fetch with timeout + retry + descriptive errors ────────────────
  private async fetchWithRetry(url: string, init: RequestInit): Promise<any> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

      try {
        const response = await fetch(url, { ...init, signal: controller.signal });

        if (response.ok) {
          return await response.json();
        }

        const errorBody = await response.text();
        const descriptive = this.buildDescriptiveError(response.status, errorBody);

        // Retry only on transient errors
        if (RETRYABLE_STATUS_CODES.includes(response.status) && attempt < MAX_RETRIES) {
          const delay = Math.pow(2, attempt) * 1000; // 1s, 2s, 4s
          this.logger.warn(
            `Claude API ${response.status} (attempt ${attempt + 1}/${MAX_RETRIES + 1}): ${descriptive}. Retrying in ${delay}ms...`,
          );
          await new Promise((resolve) => setTimeout(resolve, delay));
          lastError = new Error(descriptive);
          continue;
        }

        this.logger.error(`Claude API error: ${descriptive}`);
        throw new Error(descriptive);
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          const msg = `Claude API timeout after ${REQUEST_TIMEOUT_MS / 1000}s (attempt ${attempt + 1}/${MAX_RETRIES + 1})`;
          if (attempt < MAX_RETRIES) {
            const delay = Math.pow(2, attempt) * 1000;
            this.logger.warn(`${msg}. Retrying in ${delay}ms...`);
            await new Promise((resolve) => setTimeout(resolve, delay));
            lastError = new Error(msg);
            continue;
          }
          throw new Error(msg);
        }
        throw error;
      } finally {
        clearTimeout(timeoutId);
      }
    }

    throw lastError || new Error('Claude API: all retry attempts failed');
  }

  private buildDescriptiveError(status: number, body: string): string {
    switch (status) {
      case 401:
        return 'Chave API da Anthropic inválida ou expirada. Verifique ANTHROPIC_API_KEY no .env';
      case 403:
        return 'Acesso negado pela API da Anthropic. Verifique permissões da chave API';
      case 404:
        return 'Endpoint da API Anthropic não encontrado. Verifique o modelo configurado';
      case 429:
        return 'Rate limit da API Anthropic excedido. Aguardando antes de tentar novamente';
      case 500:
      case 502:
      case 503:
      case 504:
        return `Servidor da API Anthropic indisponível (HTTP ${status}). Erro temporário`;
      default:
        return `Claude API error (HTTP ${status}): ${body.slice(0, 200)}`;
    }
  }
}
