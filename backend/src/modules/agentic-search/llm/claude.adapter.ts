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

    const response = await fetch(`${this.baseUrl}/messages`, {
      method: 'POST',
      headers: {
        'x-api-key': this.apiKey,
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01',
        'anthropic-beta': 'prompt-caching-2024-07-31',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.text();
      this.logger.error(`Claude API error: ${error}`);
      throw new Error(`Claude API error: ${response.status}`);
    }

    const data = await response.json();

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
}
