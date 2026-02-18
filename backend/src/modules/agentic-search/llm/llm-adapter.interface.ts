export interface LLMMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  toolCallId?: string;
  name?: string;
}

export interface LLMTool {
  name: string;
  description: string;
  parameters: Record<string, any>;
}

export interface LLMToolCall {
  id: string;
  name: string;
  arguments: Record<string, any>;
}

export interface LLMResponse {
  content: string | null;
  toolCalls: LLMToolCall[];
  finishReason: string;
}

export interface LLMChatOptions {
  /** Override the default model (e.g. use a smaller/cheaper model) */
  model?: string;
  /** Override max_tokens (default varies by adapter) */
  maxTokens?: number;
}

export interface ILLMAdapter {
  chat(messages: LLMMessage[], tools?: LLMTool[], options?: LLMChatOptions): Promise<LLMResponse>;
  getProviderName(): string;
}
