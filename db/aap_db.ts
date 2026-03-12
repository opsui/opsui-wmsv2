/**
 * AAP Database Client
 *
 * Database: aap_db
 * Environment: CUSTOMER / PRODUCTION
 * Purpose: Application + Integration Platform
 *
 * CONTENTS:
 * - Users (authentication)
 * - Organizations
 * - Permissions
 * - Integrations
 * - NetSuite synchronization
 * - Integration logs
 *
 * 🔴 CRITICAL WARNING: This is a PRODUCTION/CUSTOMER database.
 *
 * • DO NOT modify schema without explicit user approval
 * • DO NOT create tables without explicit user approval
 * • DO NOT seed or modify data without explicit user approval
 * • DO NOT write integration tests against this database
 *
 * @see /DATABASE_BOUNDARIES.md for separation rules
 * @see /ai_context.ts for database configuration
 */

import { Pool, PoolClient, QueryResult } from 'pg';

// Database configuration from environment variables
const AAP_DB_CONFIG = {
  host: process.env.AAP_DB_HOST || process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.AAP_DB_PORT || process.env.DB_PORT || '5433', 10),
  database: process.env.AAP_DB_NAME || 'aap_db',
  user: process.env.AAP_DB_USER || process.env.DB_USER || 'aap_user',
  password: process.env.AAP_DB_PASSWORD || process.env.DB_PASSWORD || '',

  // Connection pool settings
  min: 2,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
};

// Create connection pool
const aapPool = new Pool(AAP_DB_CONFIG);

// Handle pool errors
aapPool.on('error', err => {
  console.error('[aap_db] Unexpected error on idle client:', err);
});

/**
 * AAP Database Client
 *
 * 🔴 PRODUCTION DATABASE - Use with caution!
 *
 * Use this client for:
 * - User authentication
 * - Organization management
 * - Integration configurations
 * - NetSuite sync
 * - Integration logs
 *
 * ⚠️ WMS data must be accessed via API, NOT direct database queries
 *
 * @example
 * import { aapDB } from './db/aap_db';
 *
 * // Authentication
 * const user = await aapDB.query('SELECT * FROM users WHERE email = $1', [email]);
 *
 * // Integration config
 * const integrations = await aapDB.query('SELECT * FROM integrations WHERE active = true');
 */
export const aapDB = {
  /**
   * Execute a query
   *
   * ⚠️ REMINDER: This is a production database. Be careful!
   */
  async query<T = any>(sql: string, params?: any[]): Promise<QueryResult<T>> {
    const start = Date.now();
    const result = await aapPool.query<T>(sql, params);
    const duration = Date.now() - start;

    if (process.env.NODE_ENV === 'development') {
      console.log(`[aap_db] Query executed in ${duration}ms: ${sql.substring(0, 100)}...`);
    }

    return result;
  },

  /**
   * Get a client from the pool for transactions
   */
  async connect(): Promise<PoolClient> {
    return aapPool.connect();
  },

  /**
   * Execute a transaction
   */
  async transaction<T>(callback: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await aapPool.connect();
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  },

  /**
   * Get pool statistics
   */
  getPoolStats() {
    return {
      totalCount: aapPool.totalCount,
      idleCount: aapPool.idleCount,
      waitingCount: aapPool.waitingCount,
    };
  },

  /**
   * Close all connections in the pool
   */
  async end(): Promise<void> {
    await aapPool.end();
  },
};

// Export pool for advanced usage
export { aapPool };

// Export configuration for reference
export const AAP_DB_INFO = {
  name: 'aap_db',
  type: 'customer' as const, // 🔴 PRODUCTION
  purpose: 'Application + Integration Platform',
  tables: [
    'users', // Application users (authentication)
    'organizations', // Multi-tenant organizations
    'roles', // User roles
    'permissions', // Access control
    'integrations', // External system connections
    'integration_logs', // Sync job history
    'feature_flags', // Feature toggles
    'integration_queue', // Async job queue (documented, not created)
  ],

  /**
   * 🔴 IMPORTANT: Integration services MUST access WMS data via API,
   * NOT direct database queries to wms_db.
   *
   * @see /INTEGRATIONS.md for integration boundaries
   */
  wmsAccess: 'API_ONLY' as const,
};

export default aapDB;
