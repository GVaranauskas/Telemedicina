import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ILLMAdapter,
  LLMMessage,
  LLMTool,
  LLMResponse,
  LLMChatOptions,
} from './llm-adapter.interface';

@Injectable()
export class GeminiAdapter implements ILLMAdapter {
  private readonly logger = new Logger(GeminiAdapter.name);
  private readonly apiKey: string;

  constructor(private readonly configService: ConfigService) {
    this.apiKey = this.configService.get<string>('llm.googleAiApiKey') || '';
  }

  getProviderName(): string {
    return 'gemini';
  }

  async chat(messages: LLMMessage[], tools?: LLMTool[], options?: LLMChatOptions): Promise<LLMResponse> {
    const systemInstruction = messages.find((m) => m.role === 'system');
    const nonSystemMessages = messages.filter((m) => m.role !== 'system');

    const contents = nonSystemMessages.map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

    const body: any = { contents };

    if (systemInstruction) {
      body.systemInstruction = { parts: [{ text: systemInstruction.content }] };
    }

    if (tools && tools.length > 0) {
      body.tools = [
        {
          functionDeclarations: tools.map((t) => ({
            name: t.name,
            description: t.description,
            parameters: t.parameters,
          })),
        },
      ];
    }

    const model = 'gemini-2.0-flash';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${this.apiKey}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.text();
      this.logger.error(`Gemini API error: ${error}`);
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    const candidate = data.candidates?.[0];
    const parts = candidate?.content?.parts || [];

    const textPart = parts.find((p: any) => p.text);
    const functionCalls = parts.filter((p: any) => p.functionCall);

    return {
      content: textPart?.text || null,
      toolCalls: functionCalls.map((fc: any, i: number) => ({
        id: `gemini-call-${i}`,
        name: fc.functionCall.name,
        arguments: fc.functionCall.args,
      })),
      finishReason: candidate?.finishReason || 'STOP',
    };
  }
}
