/**
 * Response Caching Middleware
 *
 * Provides simple in-memory response caching for GET requests
 * to reduce database load and improve response times
 */

import { Request, Response, NextFunction } from 'express';
import { logger } from '../config/logger';

// ============================================================================
// TYPES
// ============================================================================

interface CacheEntry {
  data: any;
  timestamp: number;
  etag: string;
}

interface CacheOptions {
  ttl?: number; // Time to live in milliseconds (default: 5 minutes)
  varyBy?: string[]; // Request properties to vary cache by
}

// ============================================================================
// IN-MEMORY CACHE
// ============================================================================

const cacheStore = new Map<string, CacheEntry>();

/**
 * Generate cache key from request
 */
function generateCacheKey(req: Request, varyBy: string[] = []): string {
  const basePath = req.baseUrl + req.path;
  if (varyBy.length === 0) {
    return basePath;
  }

  const varyingValues = varyBy
    .map(prop => {
      if (prop === 'headers') {
        return JSON.stringify(req.headers);
      }
      if (prop === 'query') {
        return JSON.stringify(req.query);
      }
      return String((req as any)[prop] || '');
    })
    .join('|');

  return `${basePath}:${varyingValues}`;
}

/**
 * Generate ETag for cache entry
 */
function generateETag(data: any): string {
  return require('crypto').createHash('md5').update(JSON.stringify(data)).digest('hex');
}

/**
 * Clean up expired cache entries
 */
function cleanupExpiredEntries(): void {
  const now = Date.now();
  let cleaned = 0;

  for (const [key, entry] of cacheStore.entries()) {
    if (now - entry.timestamp > 5 * 60 * 1000) {
      // 5 minutes
      cacheStore.delete(key);
      cleaned++;
    }
  }

  if (cleaned > 0) {
    logger.debug(`Cleaned up ${cleaned} expired cache entries`);
  }
}

// Run cleanup every minute
// Skip in test environment to prevent hanging intervals
if (process.env.NODE_ENV !== 'test') {
  setInterval(cleanupExpiredEntries, 60 * 1000);
}

// Export interval ID for cleanup (not used in test mode)
export let cacheCleanupInterval = null;

// ============================================================================
// CACHE MIDDLEWARE
// ============================================================================

/**
 * Cache middleware factory
 *
 * @param options - Cache configuration options
 * @returns Express middleware function
 *
 * @example
 * ```ts
 * app.get('/api/orders', cache({ ttl: 60000 }), getOrders);
 * ```
 */
export function cache(
  options: CacheOptions = {}
): (req: Request, res: Response, next: NextFunction) => void {
  const ttl = options.ttl || 5 * 60 * 1000; // Default 5 minutes
  const varyBy = options.varyBy || ['query'];

  return (req: Request, res: Response, next: NextFunction) => {
    // Only cache GET requests
    if (req.method !== 'GET') {
      return next();
    }

    const cacheKey = generateCacheKey(req, varyBy);
    const cacheEntry = cacheStore.get(cacheKey);
    const now = Date.now();

    // Check If-None-Match header for conditional requests
    const ifNoneMatch = req.get('if-none-match');

    // Return cached response if available and not expired
    if (cacheEntry && now - cacheEntry.timestamp < ttl) {
      logger.debug('Cache hit', { cacheKey, age: now - cacheEntry.timestamp });

      // Check ETag for conditional request
      if (ifNoneMatch === cacheEntry.etag) {
        return res.status(304).end();
      }

      res.setHeader('X-Cache', 'HIT');
      res.setHeader('ETag', cacheEntry.etag);
      res.setHeader('Cache-Control', `max-age=${Math.floor(ttl / 1000)}`);
      return res.json(cacheEntry.data);
    }

    // Cache miss or expired - store original json method
    const originalJson = res.json.bind(res);

    // Override res.json to cache the response
    res.json = function (data: any): Response {
      logger.debug('Caching response', { cacheKey });

      const etag = generateETag(data);

      // Store in cache
      cacheStore.set(cacheKey, {
        data,
        timestamp: Date.now(),
        etag,
      });

      // Set cache headers
      res.setHeader('X-Cache', 'MISS');
      res.setHeader('ETag', etag);
      res.setHeader('Cache-Control', `max-age=${Math.floor(ttl / 1000)}`);

      // Call original json method
      return originalJson(data);
    };

    next();
  };
}

// ============================================================================
// CACHE INVALIDATION
// ============================================================================

/**
 * Invalidate cache entries by pattern
 *
 * @param pattern - Cache key pattern to match (supports simple string matching)
 */
export function invalidateCache(pattern: string): void {
  let invalidated = 0;

  for (const key of cacheStore.keys()) {
    if (key.includes(pattern)) {
      cacheStore.delete(key);
      invalidated++;
    }
  }

  if (invalidated > 0) {
    logger.info(`Invalidated ${invalidated} cache entries matching pattern: ${pattern}`);
  }
}

/**
 * Clear all cache entries
 */
export function clearCache(): void {
  const count = cacheStore.size;
  cacheStore.clear();
  logger.info(`Cleared all cache entries (${count})`);
}

/**
 * Get cache statistics
 */
export function getCacheStats(): {
  size: number;
  keys: string[];
} {
  return {
    size: cacheStore.size,
    keys: Array.from(cacheStore.keys()),
  };
}

// ============================================================================
// EXPRESS ROUTE DECORATOR
// ============================================================================

/**
 * Decorator to mark a route for caching
 *
 * @example
 * ```ts
 * router.get('/orders', cacheResponse({ ttl: 60000 }), async (req, res) => {
 *   const orders = await getOrders();
 *   res.json(orders);
 * });
 * ```
 */
export function cacheResponse(options: CacheOptions = {}) {
  return cache(options);
}
