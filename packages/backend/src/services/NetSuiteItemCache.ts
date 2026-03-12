/**
 * NetSuite Item Cache Service
 *
 * Caches item lookups to reduce redundant API calls to NetSuite.
 * Uses database persistence for multi-process support.
 */

import { Pool } from 'pg';
import { logger } from '../config/logger';

export interface CachedNetSuiteItem {
  id: string;
  itemId: string;
  displayName: string;
  upcCode: string;
  binNumber: string;
  description: string;
  cachedAt: Date;
}

export interface NetSuiteItemCacheStats {
  hits: number;
  misses: number;
  hitRate: number;
  totalItems: number;
}

/**
 * NetSuite Item Cache
 *
 * Caches item data to avoid repeated API calls.
 * TTL is 24 hours by default.
 */
export class NetSuiteItemCache {
  private readonly TTL_HOURS: number;
  private hits = 0;
  private misses = 0;

  constructor(
    private pool: Pool,
    options: { ttlHours?: number } = {}
  ) {
    this.TTL_HOURS = options.ttlHours ?? 24;
  }

  /**
   * Get an item from cache by NetSuite internal ID
   */
  async get(id: string): Promise<CachedNetSuiteItem | null> {
    try {
      const result = await this.pool.query(
        `SELECT
          id,
          item_id AS "itemId",
          display_name AS "displayName",
          upc_code AS "upcCode",
          bin_number AS "binNumber",
          description,
          cached_at AS "cachedAt"
        FROM netsuite_item_cache
        WHERE id = $1 AND cached_at > NOW() - INTERVAL '${this.TTL_HOURS} hours'`,
        [id]
      );

      if (result.rows.length > 0) {
        this.hits++;
        logger.debug('Item cache hit', { id, itemId: result.rows[0].itemId });
        return result.rows[0];
      }

      this.misses++;
      return null;
    } catch (error: any) {
      logger.warn('Failed to get item from cache', { id, error: error.message });
      this.misses++;
      return null;
    }
  }

  /**
   * Get an item by UPC code
   */
  async getByUPC(upcCode: string): Promise<CachedNetSuiteItem | null> {
    try {
      const result = await this.pool.query(
        `SELECT
          id,
          item_id AS "itemId",
          display_name AS "displayName",
          upc_code AS "upcCode",
          bin_number AS "binNumber",
          description,
          cached_at AS "cachedAt"
        FROM netsuite_item_cache
        WHERE upc_code = $1 AND cached_at > NOW() - INTERVAL '${this.TTL_HOURS} hours'`,
        [upcCode]
      );

      if (result.rows.length > 0) {
        this.hits++;
        return result.rows[0];
      }

      this.misses++;
      return null;
    } catch (error: any) {
      logger.warn('Failed to get item by UPC from cache', { upcCode, error: error.message });
      this.misses++;
      return null;
    }
  }

  /**
   * Store an item in cache
   */
  async set(item: Omit<CachedNetSuiteItem, 'cachedAt'>): Promise<void> {
    try {
      await this.pool.query(
        `INSERT INTO netsuite_item_cache (
          id, item_id, display_name, upc_code, bin_number, description, cached_at
        ) VALUES ($1, $2, $3, $4, $5, $6, NOW())
        ON CONFLICT (id) DO UPDATE SET
          item_id = EXCLUDED.item_id,
          display_name = EXCLUDED.display_name,
          upc_code = EXCLUDED.upc_code,
          bin_number = EXCLUDED.bin_number,
          description = EXCLUDED.description,
          cached_at = NOW()`,
        [item.id, item.itemId, item.displayName, item.upcCode, item.binNumber, item.description]
      );

      logger.debug('Item cached', { id: item.id, itemId: item.itemId });
    } catch (error: any) {
      logger.warn('Failed to cache item', { id: item.id, error: error.message });
    }
  }

  /**
   * Store multiple items in cache (batch operation)
   */
  async setBatch(items: Array<Omit<CachedNetSuiteItem, 'cachedAt'>>): Promise<void> {
    if (items.length === 0) return;

    try {
      const client = await this.pool.connect();

      try {
        await client.query('BEGIN');

        for (const item of items) {
          await client.query(
            `INSERT INTO netsuite_item_cache (
              id, item_id, display_name, upc_code, bin_number, description, cached_at
            ) VALUES ($1, $2, $3, $4, $5, $6, NOW())
            ON CONFLICT (id) DO UPDATE SET
              item_id = EXCLUDED.item_id,
              display_name = EXCLUDED.display_name,
              upc_code = EXCLUDED.upc_code,
              bin_number = EXCLUDED.bin_number,
              description = EXCLUDED.description,
              cached_at = NOW()`,
            [item.id, item.itemId, item.displayName, item.upcCode, item.binNumber, item.description]
          );
        }

        await client.query('COMMIT');
        logger.debug('Batch cached items', { count: items.length });
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    } catch (error: any) {
      logger.warn('Failed to batch cache items', { count: items.length, error: error.message });
    }
  }

  /**
   * Get or fetch an item (with fetcher fallback)
   */
  async getOrFetch(
    id: string,
    fetcher: () => Promise<Omit<CachedNetSuiteItem, 'cachedAt'>>
  ): Promise<CachedNetSuiteItem> {
    const cached = await this.get(id);
    if (cached) return cached;

    // Fetch from NetSuite
    const item = await fetcher();

    // Cache for future use
    await this.set(item);

    return {
      ...item,
      cachedAt: new Date(),
    };
  }

  /**
   * Invalidate a specific item
   */
  async invalidate(id: string): Promise<void> {
    try {
      await this.pool.query('DELETE FROM netsuite_item_cache WHERE id = $1', [id]);
      logger.debug('Item cache invalidated', { id });
    } catch (error: any) {
      logger.warn('Failed to invalidate item cache', { id, error: error.message });
    }
  }

  /**
   * Clear all expired items
   */
  async clearExpired(): Promise<number> {
    try {
      const result = await this.pool.query(
        `DELETE FROM netsuite_item_cache
         WHERE cached_at < NOW() - INTERVAL '${this.TTL_HOURS} hours'`
      );

      const deleted = result.rowCount || 0;
      if (deleted > 0) {
        logger.info('Cleared expired cache items', { count: deleted });
      }

      return deleted;
    } catch (error: any) {
      logger.warn('Failed to clear expired cache items', { error: error.message });
      return 0;
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): NetSuiteItemCacheStats {
    const total = this.hits + this.misses;
    return {
      hits: this.hits,
      misses: this.misses,
      hitRate: total > 0 ? this.hits / total : 0,
      totalItems: 0, // Would need async query to get actual count
    };
  }

  /**
   * Reset statistics
   */
  resetStats(): void {
    this.hits = 0;
    this.misses = 0;
  }

  /**
   * Get total items in cache
   */
  async getTotalItems(): Promise<number> {
    try {
      const result = await this.pool.query('SELECT COUNT(*) as count FROM netsuite_item_cache');
      return parseInt(result.rows[0]?.count || '0');
    } catch {
      return 0;
    }
  }
}

// Cache instances per pool
const cacheInstances = new WeakMap<Pool, NetSuiteItemCache>();

/**
 * Get or create a cache instance for a pool
 */
export function getNetSuiteItemCache(pool: Pool): NetSuiteItemCache {
  let cache = cacheInstances.get(pool);
  if (!cache) {
    cache = new NetSuiteItemCache(pool);
    cacheInstances.set(pool, cache);
  }
  return cache;
}
