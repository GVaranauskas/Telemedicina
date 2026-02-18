import { Logger } from '@nestjs/common';

const logger = new Logger('LLMHelpers');

/**
 * Safely extracts and parses JSON from LLM response content.
 * Handles cases where:
 * - content is wrapped in markdown code blocks (```json ... ```)
 * - content has extra text before/after JSON
 * - JSON is malformed (returns null instead of throwing)
 */
export function safeParseJsonFromLLM<T = any>(content: string | null | undefined): T | null {
  if (!content) return null;

  const trimmed = content.trim();

  // Try direct parse first (best case: pure JSON)
  try {
    return JSON.parse(trimmed);
  } catch {
    // Not pure JSON, try to extract
  }

  // Remove markdown code blocks if present
  const codeBlockMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch) {
    try {
      return JSON.parse(codeBlockMatch[1].trim());
    } catch {
      // Continue to generic extraction
    }
  }

  // Extract the outermost JSON object
  const jsonMatch = trimmed.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[0]);
    } catch {
      // Try to fix common issues: trailing commas
      const fixed = jsonMatch[0]
        .replace(/,\s*([}\]])/g, '$1') // Remove trailing commas
        .replace(/'/g, '"'); // Replace single quotes with double
      try {
        return JSON.parse(fixed);
      } catch {
        logger.warn('Failed to parse JSON from LLM response even after fix attempts');
      }
    }
  }

  return null;
}

/**
 * Executes an async function with retry logic.
 * Useful for LLM API calls that may fail transiently.
 */
export async function withRetry<T>(
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
        logger.warn(`LLM call failed (attempt ${attempt + 1}/${maxRetries + 1}), retrying in ${delay}ms: ${lastError.message}`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
}
