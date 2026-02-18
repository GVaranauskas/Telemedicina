---
name: llm-integration-robustness
description: Build reliable LLM integrations with proper JSON parsing, retry logic, and error handling. Use when integrating with OpenAI, Claude, Gemini, or any LLM API. Prevents silent failures from malformed responses.
---

# LLM Integration Robustness

LLM responses are unpredictable. Build defensive code that handles failures gracefully.

## The Problem

```typescript
// WRONG: Assumes LLM returns valid JSON
const response = await llm.chat([...]);
const data = JSON.parse(response.content); // Crashes if not valid JSON!

// WRONG: No retry on transient failures
const result = await callLLM(); // Single point of failure
```

LLMs can return:
- Markdown code blocks (```json ... ```)
- Text before/after JSON
- Trailing commas
- Single quotes instead of double quotes
- Nothing at all (null content)

## Safe JSON Parsing

### Robust Parser Pattern

```typescript
function safeParseJsonFromLLM<T = unknown>(content: string | null | undefined): T | null {
  if (!content) return null;

  const trimmed = content.trim();

  // Try direct parse first
  try {
    return JSON.parse(trimmed);
  } catch {}

  // Remove markdown code blocks
  const codeBlockMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch) {
    try {
      return JSON.parse(codeBlockMatch[1].trim());
    } catch {}
  }

  // Extract outermost JSON object
  const jsonMatch = trimmed.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[0]);
    } catch {
      // Try to fix common issues
      const fixed = jsonMatch[0]
        .replace(/,\s*([}\]])/g, '$1') // Remove trailing commas
        .replace(/'/g, '"'); // Single to double quotes
      try {
        return JSON.parse(fixed);
      } catch {}
    }
  }

  return null;
}
```

### Usage

```typescript
const response = await llm.chat([...]);
const data = safeParseJsonFromLLM<MyDataType>(response.content);

if (!data) {
  // Handle parse failure gracefully
  return { error: 'Could not parse LLM response' };
}
```

## Retry Logic

### With Exponential Backoff

```typescript
async function withRetry<T>(
  fn: () => Promise<T>,
  options: { maxRetries?: number; delayMs?: number; backoff?: number } = {},
): Promise<T> {
  const maxRetries = options.maxRetries ?? 2;
  const baseDelay = options.delayMs ?? 1000;
  const backoff = options.backoff ?? 2;

  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt < maxRetries) {
        const delay = baseDelay * Math.pow(backoff, attempt);
        console.warn(`LLM call failed, retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
}
```

### Usage

```typescript
const response = await withRetry(
  () => llm.chat(messages, tools, options),
  { maxRetries: 1, delayMs: 500 },
);
```

## Prompt Design for JSON Output

### Request JSON Explicitly

```typescript
const prompt = `
You are a helpful assistant.

Analyze the following data and respond ONLY with valid JSON.
Do not include markdown code blocks.
Do not include any text before or after the JSON.

Response format:
{
  "field1": "value1",
  "field2": ["item1", "item2"]
}

Data to analyze:
${JSON.stringify(data, null, 2)}
`;
```

### System Prompt Pattern

```typescript
const systemPrompt = `
You are an AI assistant that returns ONLY valid JSON.
No markdown, no explanation, just the JSON object.
Always include all required fields.
Use double quotes for all strings.
Do not use trailing commas.
`;
```

## Error Handling Patterns

### Graceful Degradation

```typescript
async function getAIInsights(data: unknown): Promise<Insights | null> {
  try {
    const response = await withRetry(() =>
      llm.chat([
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: generatePrompt(data) },
      ])
    );

    return safeParseJsonFromLLM(response.content);
  } catch (error) {
    logger.error('LLM insights failed', error);
    return null; // Return null, let caller decide
  }
}
```

### Fallback to Non-LLM

```typescript
async function analyze(data: Data): Promise<Analysis> {
  try {
    const llmResult = await getAIInsights(data);
    if (llmResult) return llmResult;
  } catch {
    // LLM failed, use rule-based fallback
  }

  return ruleBasedAnalysis(data);
}
```

## Checklist

Before submitting LLM integration code:
- [ ] JSON parsing handles markdown code blocks
- [ ] JSON parsing handles text around JSON
- [ ] Retry logic with backoff implemented
- [ ] Null/undefined response.content handled
- [ ] Errors logged but don't crash app
- [ ] Fallback behavior defined when LLM fails
- [ ] Prompts explicitly request JSON format
