/**
 * Tenant Database Context
 *
 * Uses AsyncLocalStorage to transparently route database queries
 * to the correct tenant database based on organization context.
 *
 * The default pool (wms_db) is used for system-level queries
 * (auth, organization lookups). Tenant-specific pools are used
 * for all operational queries within an organization's context.
 */

import { AsyncLocalStorage } from 'async_hooks';
import { Pool, types } from 'pg';
import { logger } from '../config/logger';

// ============================================================================
// ASYNC LOCAL STORAGE FOR TENANT CONTEXT
// ============================================================================

const tenantStorage = new AsyncLocalStorage<Pool>();

/**
 * Run a function with a specific tenant database pool.
 * All database queries within the function will use this pool.
 */
export function runWithTenantPool<T>(pool: Pool, fn: () => T): T {
  return tenantStorage.run(pool, fn);
}

/**
 * Get the current tenant pool from async context.
 * Returns undefined if no tenant context is set (uses default pool).
 */
export function getCurrentTenantPool(): Pool | undefined {
  return tenantStorage.getStore();
}

// ============================================================================
// REQUEST-SCOPED TENANT CONTEXT
// ============================================================================

/**
 * Directly set the tenant pool in the current async context using enterWith().
 * Unlike run(), enterWith() persists the context for ALL subsequent async operations
 * in the current execution context, including Express next() calls.
 */
export function enterTenantPool(pool: Pool): void {
  tenantStorage.enterWith(pool);
}

// Keep these for backward compatibility but they're no longer used by the middleware
export function setRequestTenantPool(_pool: Pool): void {
  // No-op - use enterTenantPool instead
}

export function getRequestTenantPool(): Pool | undefined {
  return undefined;
}

// ============================================================================
// TENANT POOL MANAGER
// ============================================================================

interface TenantPoolConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  ssl?: any;
  min?: number;
  max?: number;
}

class TenantPoolManager {
  private pools: Map<string, Pool> = new Map();
  private baseConfig: Omit<TenantPoolConfig, 'database'>;

  constructor() {
    this.baseConfig = {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432', 10),
      user: process.env.DB_USER || 'wms_user',
      password: process.env.DB_PASSWORD || 'wms_password',
      ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
      min: 1,
      max: 5,
    };
  }

  /**
   * Get or create a connection pool for a tenant database.
   */
  getPool(databaseName: string): Pool {
    const existing = this.pools.get(databaseName);
    if (existing) return existing;

    // Set enum type parsers (same as main client.ts)
    for (const key of Object.keys(types)) {
      const oid = (types as any)[key];
      if (typeof oid === 'number' && oid > 10000) {
        types.setTypeParser(oid, value => value);
      }
    }

    const pool = new Pool({
      ...this.baseConfig,
      database: databaseName,
    });

    pool.on('error', err => {
      logger.error('Tenant database pool error', {
        database: databaseName,
        error: err.message,
      });
    });

    pool.on('connect', () => {
      logger.debug('Tenant database client connected', { database: databaseName });
    });

    this.pools.set(databaseName, pool);
    logger.info('Tenant database pool created', { database: databaseName });

    return pool;
  }

  /**
   * Close all tenant pools (for graceful shutdown).
   */
  async closeAll(): Promise<void> {
    for (const [name, pool] of this.pools) {
      await pool.end();
      logger.info('Tenant database pool closed', { database: name });
    }
    this.pools.clear();
  }

  /**
   * Close a specific tenant pool.
   */
  async closePool(databaseName: string): Promise<void> {
    const pool = this.pools.get(databaseName);
    if (pool) {
      await pool.end();
      this.pools.delete(databaseName);
      logger.info('Tenant database pool closed', { database: databaseName });
    }
  }
}

// Singleton instance
export const tenantPoolManager = new TenantPoolManager();
