/**
 * Rate Limiter - Token Bucket Implementation
 *
 * Protects against API rate limits by controlling request throughput.
 * Supports both per-second and per-minute rate limiting.
 */

import { logger } from '../config/logger';

export interface RateLimiterOptions {
  /** Maximum tokens in bucket (default: 10) */
  maxTokens?: number;
  /** Tokens added per second (default: 2) */
  refillRate?: number;
  /** Name for logging (default: 'default') */
  name?: string;
  /** Enable debug logging */
  debug?: boolean;
}

/**
 * Token Bucket Rate Limiter
 *
 * Allows bursts up to maxTokens, then refills at refillRate per second.
 *
 * @example
 * ```typescript
 * const limiter = new RateLimiter({ maxTokens: 10, refillRate: 2 });
 *
 * // Before each API call
 * await limiter.acquire();
 * await makeApiCall();
 * ```
 */
export class RateLimiter {
  private tokens: number;
  private lastRefill: number;
  private readonly maxTokens: number;
  private readonly refillRate: number;
  private readonly name: string;
  private readonly debug: boolean;
  private waitQueue: Array<() => void> = [];

  constructor(options: RateLimiterOptions = {}) {
    this.maxTokens = options.maxTokens ?? 10;
    this.refillRate = options.refillRate ?? 2;
    this.name = options.name ?? 'default';
    this.debug = options.debug ?? false;

    // Start with full bucket
    this.tokens = this.maxTokens;
    this.lastRefill = Date.now();
  }

  /**
   * Acquire a token, waiting if necessary
   */
  async acquire(): Promise<void> {
    this.refill();

    if (this.tokens >= 1) {
      this.tokens--;
      this.logDebug(`Token acquired, ${this.tokens.toFixed(2)} remaining`);
      return;
    }

    // Need to wait for a token
    const waitMs = this.getTimeUntilNextToken();

    if (this.debug) {
      logger.debug(`Rate limiter '${this.name}' waiting for token`, {
        waitMs,
        queueLength: this.waitQueue.length,
      });
    }

    return new Promise<void>(resolve => {
      this.waitQueue.push(resolve);

      // Schedule token availability check
      setTimeout(() => this.processQueue(), waitMs);
    });
  }

  /**
   * Try to acquire a token without waiting
   * @returns true if token was acquired, false if rate limited
   */
  tryAcquire(): boolean {
    this.refill();

    if (this.tokens >= 1) {
      this.tokens--;
      return true;
    }

    return false;
  }

  /**
   * Get current number of available tokens
   */
  getAvailableTokens(): number {
    this.refill();
    return this.tokens;
  }

  /**
   * Get time in ms until next token is available
   */
  getTimeUntilNextToken(): number {
    this.refill();

    if (this.tokens >= 1) return 0;

    const tokensNeeded = 1 - this.tokens;
    return Math.ceil((tokensNeeded / this.refillRate) * 1000);
  }

  /**
   * Reset the rate limiter to full capacity
   */
  reset(): void {
    this.tokens = this.maxTokens;
    this.lastRefill = Date.now();
    this.processQueue();
  }

  /**
   * Refill tokens based on elapsed time
   */
  private refill(): void {
    const now = Date.now();
    const elapsed = (now - this.lastRefill) / 1000;

    if (elapsed > 0) {
      const tokensToAdd = elapsed * this.refillRate;
      this.tokens = Math.min(this.maxTokens, this.tokens + tokensToAdd);
      this.lastRefill = now;
    }
  }

  /**
   * Process waiting queue when tokens become available
   */
  private processQueue(): void {
    this.refill();

    while (this.waitQueue.length > 0 && this.tokens >= 1) {
      const resolve = this.waitQueue.shift();
      if (resolve) {
        this.tokens--;
        resolve();
      }
    }

    // If still have waiters, schedule next check
    if (this.waitQueue.length > 0) {
      const waitMs = this.getTimeUntilNextToken();
      setTimeout(() => this.processQueue(), waitMs);
    }
  }

  private logDebug(message: string): void {
    if (this.debug) {
      logger.debug(`Rate limiter '${this.name}': ${message}`);
    }
  }
}

/**
 * Multi-tier Rate Limiter
 *
 * Supports both per-second AND per-minute limits simultaneously.
 * Use for APIs with multiple rate limit tiers.
 *
 * @example
 * ```typescript
 * // NetSuite has both 10/second and 1000/minute limits
 * const limiter = new MultiTierRateLimiter([
 *   { maxTokens: 8, refillRate: 8 },   // 8/second (leave buffer)
 *   { maxTokens: 900, refillRate: 15 } // ~900/minute (leave buffer)
 * ]);
 * ```
 */
export class MultiTierRateLimiter {
  private limiters: RateLimiter[];

  constructor(options: RateLimiterOptions[]) {
    this.limiters = options.map(
      (opt, i) =>
        new RateLimiter({
          ...opt,
          name: opt.name || `tier-${i}`,
        })
    );
  }

  /**
   * Acquire tokens from all tiers
   */
  async acquire(): Promise<void> {
    // Must acquire from ALL limiters
    for (const limiter of this.limiters) {
      await limiter.acquire();
    }
  }

  /**
   * Try to acquire from all tiers
   */
  tryAcquire(): boolean {
    // Check if all limiters have tokens
    const allAvailable = this.limiters.every(l => l.getAvailableTokens() >= 1);

    if (!allAvailable) return false;

    // Acquire from all
    for (const limiter of this.limiters) {
      limiter.tryAcquire();
    }

    return true;
  }

  /**
   * Get the most restrictive wait time
   */
  getTimeUntilNextToken(): number {
    return Math.max(...this.limiters.map(l => l.getTimeUntilNextToken()));
  }

  /**
   * Reset all limiters
   */
  reset(): void {
    for (const limiter of this.limiters) {
      limiter.reset();
    }
  }
}

/**
 * Concurrency Limiter
 *
 * Limits the number of concurrent operations (not rate per se).
 * Use together with RateLimiter for comprehensive protection.
 *
 * @example
 * ```typescript
 * const limiter = new ConcurrencyLimiter(5); // Max 5 concurrent
 *
 * await limiter.run(() => makeApiCall());
 * ```
 */
export class ConcurrencyLimiter {
  private running = 0;
  private queue: Array<() => void> = [];

  constructor(private readonly maxConcurrent: number) {}

  /**
   * Run a function with concurrency limiting
   */
  async run<T>(fn: () => Promise<T>): Promise<T> {
    await this.acquire();

    try {
      return await fn();
    } finally {
      this.release();
    }
  }

  private async acquire(): Promise<void> {
    if (this.running < this.maxConcurrent) {
      this.running++;
      return;
    }

    return new Promise<void>(resolve => {
      this.queue.push(resolve);
    });
  }

  private release(): void {
    const next = this.queue.shift();
    if (next) {
      next();
    } else {
      this.running--;
    }
  }

  /**
   * Get current number of running operations
   */
  getRunning(): number {
    return this.running;
  }

  /**
   * Get number of operations waiting
   */
  getQueued(): number {
    return this.queue.length;
  }
}

// Singleton instances for NetSuite API
let netSuiteRateLimiter: RateLimiter | null = null;
let netSuiteConcurrencyLimiter: ConcurrencyLimiter | null = null;

/**
 * Get the shared NetSuite rate limiter
 */
export function getNetSuiteRateLimiter(): RateLimiter {
  if (!netSuiteRateLimiter) {
    // NetSuite limits: ~10 requests/second for TBA
    // Use conservative limits to avoid 429 errors
    netSuiteRateLimiter = new RateLimiter({
      maxTokens: 8,
      refillRate: 6, // 6 per second (conservative)
      name: 'netsuite-api',
    });
  }
  return netSuiteRateLimiter;
}

/**
 * Get the shared NetSuite concurrency limiter
 */
export function getNetSuiteConcurrencyLimiter(): ConcurrencyLimiter {
  if (!netSuiteConcurrencyLimiter) {
    // Limit concurrent SOAP requests to prevent connection exhaustion
    netSuiteConcurrencyLimiter = new ConcurrencyLimiter(5);
  }
  return netSuiteConcurrencyLimiter;
}
