/**
 * Retry Utility with Exponential Backoff
 *
 * Provides robust retry logic for network operations and API calls.
 * Uses exponential backoff to avoid overwhelming failing services.
 */

import { logger } from '../config/logger';

export interface RetryOptions {
  /** Maximum number of retry attempts (default: 3) */
  maxRetries?: number;
  /** Initial delay in milliseconds (default: 1000) */
  baseDelayMs?: number;
  /** Maximum delay cap in milliseconds (default: 30000) */
  maxDelayMs?: number;
  /** Jitter factor to add randomness (0-1, default: 0.1) */
  jitterFactor?: number;
  /** Custom function to determine if error is retryable */
  isRetryable?: (error: Error, attempt: number) => boolean;
  /** Callback before each retry */
  onRetry?: (error: Error, attempt: number, delayMs: number) => void;
  /** Operation name for logging */
  operationName?: string;
}

/**
 * Non-retryable error types (client errors)
 */
const NON_RETRYABLE_PATTERNS = [
  /invalid credentials/i,
  /authentication failed/i,
  /unauthorized/i,
  /forbidden/i,
  /not found/i,
  /invalid request/i,
  /validation error/i,
  /duplicate/i,
  /already exists/i,
];

/**
 * Check if an error should trigger a retry
 */
function defaultIsRetryable(error: Error): boolean {
  const message = error.message || '';

  // Don't retry client errors
  for (const pattern of NON_RETRYABLE_PATTERNS) {
    if (pattern.test(message)) {
      return false;
    }
  }

  // Retry network/timeout errors
  if (
    message.includes('timeout') ||
    message.includes('ECONNRESET') ||
    message.includes('ENOTFOUND') ||
    message.includes('ECONNREFUSED') ||
    message.includes('ETIMEDOUT') ||
    message.includes('network') ||
    message.includes('rate limit') ||
    message.includes('too many requests') ||
    message.includes('service unavailable') ||
    message.includes('internal error')
  ) {
    return true;
  }

  // Default to retrying for unknown errors
  return true;
}

/**
 * Calculate delay with exponential backoff and jitter
 */
function calculateDelay(
  attempt: number,
  baseDelayMs: number,
  maxDelayMs: number,
  jitterFactor: number
): number {
  // Exponential backoff: baseDelay * 2^attempt
  const exponentialDelay = baseDelayMs * Math.pow(2, attempt);

  // Cap at max delay
  const cappedDelay = Math.min(exponentialDelay, maxDelayMs);

  // Add jitter to prevent thundering herd
  const jitter = cappedDelay * jitterFactor * Math.random();

  return Math.floor(cappedDelay + jitter);
}

/**
 * Sleep for a specified duration
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Execute a function with automatic retry on failure
 *
 * @example
 * ```typescript
 * const result = await withRetry(
 *   () => netsuiteClient.getSalesOrder(id),
 *   { maxRetries: 3, baseDelayMs: 1000 }
 * );
 * ```
 */
export async function withRetry<T>(fn: () => Promise<T>, options: RetryOptions = {}): Promise<T> {
  const {
    maxRetries = 3,
    baseDelayMs = 1000,
    maxDelayMs = 30000,
    jitterFactor = 0.1,
    isRetryable = defaultIsRetryable,
    onRetry,
    operationName = 'operation',
  } = options;

  let lastError: Error | undefined;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const result = await fn();
      return result;
    } catch (error: any) {
      lastError = error;

      const isLastAttempt = attempt === maxRetries - 1;
      const shouldRetry = !isLastAttempt && isRetryable(error, attempt);

      if (!shouldRetry) {
        // Log final failure
        logger.error(`${operationName} failed after ${attempt + 1} attempts`, {
          error: error.message,
          attempt: attempt + 1,
          maxRetries,
        });
        throw error;
      }

      const delayMs = calculateDelay(attempt, baseDelayMs, maxDelayMs, jitterFactor);

      logger.warn(`${operationName} failed, retrying`, {
        error: error.message,
        attempt: attempt + 1,
        maxRetries,
        delayMs,
        nextAttemptIn: `${Math.round(delayMs / 1000)}s`,
      });

      // Call custom retry callback
      if (onRetry) {
        onRetry(error, attempt + 1, delayMs);
      }

      await sleep(delayMs);
    }
  }

  // This should never be reached, but TypeScript needs it
  throw lastError || new Error(`${operationName} failed`);
}

/**
 * Create a retry wrapper for a function
 *
 * @example
 * ```typescript
 * const fetchWithRetry = createRetryWrapper(
 *   (id: string) => client.getSalesOrder(id),
 *   { maxRetries: 3, operationName: 'fetchSalesOrder' }
 * );
 *
 * const order = await fetchWithRetry('123');
 * ```
 */
export function createRetryWrapper<TArgs extends any[], TResult>(
  fn: (...args: TArgs) => Promise<TResult>,
  options: RetryOptions = {}
): (...args: TArgs) => Promise<TResult> {
  return (...args: TArgs) => withRetry(() => fn(...args), options);
}

/**
 * Batch retry - process items in batches with individual retry
 *
 * @example
 * ```typescript
 * const results = await batchRetry(
 *   orderIds,
 *   (id) => client.getSalesOrder(id),
 *   { batchSize: 10, maxRetries: 2 }
 * );
 * ```
 */
export async function batchRetry<TItem, TResult>(
  items: TItem[],
  processor: (item: TItem) => Promise<TResult>,
  options: RetryOptions & { batchSize?: number } = {}
): Promise<Array<{ item: TItem; result?: TResult; error?: Error }>> {
  const { batchSize = 10, ...retryOptions } = options;
  const results: Array<{ item: TItem; result?: TResult; error?: Error }> = [];

  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);

    const batchResults = await Promise.all(
      batch.map(async item => {
        try {
          const result = await withRetry(() => processor(item), retryOptions);
          return { item, result };
        } catch (error: any) {
          return { item, error };
        }
      })
    );

    results.push(...batchResults);
  }

  return results;
}
