/**
 * WMS Database Client
 *
 * Database: wms_db
 * Environment: TEST / DEVELOPMENT
 * Purpose: Warehouse Management System operations
 *
 * CONTENTS:
 * - Orders
 * - Pick tasks
 * - Inventory
 * - Bin locations
 * - SKUs
 * - Packing workflows
 * - Fulfillment records
 *
 * ⚠️ WARNING: This is the TEST database for warehouse operations.
 * Do NOT store user authentication, integrations, or NetSuite sync data here.
 *
 * @see /DATABASE_BOUNDARIES.md for separation rules
 * @see /ai_context.ts for database configuration
 */

import { Pool, PoolClient, QueryResult } from 'pg';

// Database configuration from environment variables
const WMS_DB_CONFIG = {
  host: process.env.WMS_DB_HOST || process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.WMS_DB_PORT || process.env.DB_PORT || '5433', 10),
  database: process.env.WMS_DB_NAME || process.env.DB_NAME || 'wms_db',
  user: process.env.WMS_DB_USER || process.env.DB_USER || 'wms_user',
  password: process.env.WMS_DB_PASSWORD || process.env.DB_PASSWORD || '',

  // Connection pool settings
  min: 2,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
};

// Create connection pool
const wmsPool = new Pool(WMS_DB_CONFIG);

// Handle pool errors
wmsPool.on('error', err => {
  console.error('[wms_db] Unexpected error on idle client:', err);
});

/**
 * WMS Database Client
 *
 * Use this client for all warehouse-related operations:
 * - Orders
 * - Picking
 * - Inventory
 * - Packing
 * - Shipping
 *
 * @example
 * import { wmsDB } from './db/wms_db';
 *
 * const orders = await wmsDB.query('SELECT * FROM orders WHERE status = $1', ['PENDING']);
 */
export const wmsDB = {
  /**
   * Execute a query
   */
  async query<T = any>(sql: string, params?: any[]): Promise<QueryResult<T>> {
    const start = Date.now();
    const result = await wmsPool.query<T>(sql, params);
    const duration = Date.now() - start;

    if (process.env.NODE_ENV === 'development') {
      console.log(`[wms_db] Query executed in ${duration}ms: ${sql.substring(0, 100)}...`);
    }

    return result;
  },

  /**
   * Get a client from the pool for transactions
   */
  async connect(): Promise<PoolClient> {
    return wmsPool.connect();
  },

  /**
   * Execute a transaction
   */
  async transaction<T>(callback: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await wmsPool.connect();
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
      totalCount: wmsPool.totalCount,
      idleCount: wmsPool.idleCount,
      waitingCount: wmsPool.waitingCount,
    };
  },

  /**
   * Close all connections in the pool
   */
  async end(): Promise<void> {
    await wmsPool.end();
  },
};

// Export pool for advanced usage
export { wmsPool };

// Export configuration for reference
export const WMS_DB_INFO = {
  name: 'wms_db',
  type: 'test' as const,
  purpose: 'Warehouse Management System operations',
  tables: [
    'users', // Warehouse staff (pickers, packers)
    'orders', // Sales orders
    'order_items', // Order line items
    'pick_tasks', // Pick assignments
    'inventory_units', // Inventory by bin location
    'bin_locations', // Warehouse storage locations
    'skus', // Product catalog
    'inventory_transactions', // Inventory audit log
    'order_state_changes', // Order status history
  ],
};

export default wmsDB;
