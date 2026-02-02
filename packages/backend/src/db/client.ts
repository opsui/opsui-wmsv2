/**
 * Database client configuration
 *
 * Handles PostgreSQL connection pooling and provides
 * a singleton connection pool for the application.
 */

import { Pool, PoolClient, QueryResult, types } from 'pg';
import { logger } from '../config/logger';

// ============================================================================
// ENUM TYPE PARSERS
// ============================================================================

// Set all unknown types (like enums) to be parsed as text
for (const key of Object.keys(types)) {
  const oid = (types as any)[key];
  if (typeof oid === 'number' && oid > 10000) {
    types.setTypeParser(oid, value => value);
  }
}

// ============================================================================
// CONFIGURATION
// ============================================================================

const poolConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME || 'wms_db',
  user: process.env.DB_USER || 'wms_user',
  password: process.env.DB_PASSWORD || 'wms_password',
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  min: parseInt(process.env.DB_POOL_MIN || '2', 10),
  max: parseInt(process.env.DB_POOL_MAX || '10', 10),
  idleTimeoutMillis: 300000, // 5 minutes (was 30 seconds)
  connectionTimeoutMillis: 30000, // 30 seconds (was 10 seconds)
};

// ============================================================================
// CONNECTION POOL
// ============================================================================

let pool: Pool | null = null;

/**
 * Get or create the database connection pool
 */
export function getPool(): Pool {
  if (!pool) {
    pool = new Pool(poolConfig);

    pool.on('error', err => {
      logger.error('Unexpected database pool error (will attempt recovery)', {
        error: err.message,
        stack: err.stack,
      });
      // Don't crash - pool will automatically attempt to reconnect
    });

    pool.on('connect', () => {
      logger.debug('New database client connected');
    });

    pool.on('remove', () => {
      logger.debug('Database client removed from pool');
    });

    logger.info('Database connection pool created', {
      host: poolConfig.host,
      port: poolConfig.port,
      database: poolConfig.database,
      min: poolConfig.min,
      max: poolConfig.max,
    });
  }

  return pool;
}

/**
 * Close the database connection pool
 */
export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
    logger.info('Database connection pool closed');
  }
}

/**
 * Test database connection
 */
export async function testConnection(): Promise<boolean> {
  try {
    const client = await getPool().connect();
    const result = await client.query('SELECT NOW()');
    client.release();
    logger.info('Database connection test successful', {
      timestamp: result.rows[0].now,
    });
    return true;
  } catch (error) {
    logger.error('Database connection test failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    return false;
  }
}

// ============================================================================
// QUERY HELPERS
// ============================================================================

/**
 * Convert snake_case to camelCase
 */
function toCamelCase(str: string): string {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

/**
 * Convert all keys in an object from snake_case to camelCase recursively
 */
function mapKeysToCamelCase<T>(obj: any): T {
  if (!obj || typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => mapKeysToCamelCase<T>(item)) as any;
  }

  const result: any = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const camelKey = toCamelCase(key);
      result[camelKey] = obj[key];
    }
  }
  return result;
}

/**
 * Execute a query with parameters
 */
export async function query<T extends Record<string, any> = Record<string, any>>(
  text: string,
  params?: any[]
): Promise<QueryResult<T>> {
  const start = Date.now();
  try {
    const result = await getPool().query<any>(text, params);
    const duration = Date.now() - start;

    // Map column names from snake_case to camelCase
    const rows = result.rows || [];
    const mappedRows = rows.map(row => mapKeysToCamelCase<T>(row));

    logger.debug('Query executed', {
      duration: `${duration}ms`,
      rows: result.rowCount,
      sql: text.substring(0, 100),
    });

    return {
      ...result,
      rows: mappedRows,
    };
  } catch (error) {
    logger.error('Query failed', {
      error: error instanceof Error ? error.message : String(error),
      sql: text.substring(0, 100),
    });
    throw error;
  }
}

/**
 * Execute a query within a transaction
 */
export async function transaction<T>(callback: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    logger.debug('Transaction started');

    const result = await callback(client);

    await client.query('COMMIT');
    logger.debug('Transaction committed');

    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Transaction rolled back', {
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Get a client from the pool for manual transaction management
 */
export async function getClient(): Promise<PoolClient> {
  return await getPool().connect();
}

// ============================================================================
// HEALTH CHECK
// ============================================================================

/**
 * Get database health status
 */
export async function getHealthStatus(): Promise<{
  healthy: boolean;
  connections: number;
  waiting: number;
  max: number;
}> {
  try {
    const pool = getPool();
    const totalCount = pool.totalCount;
    const idleCount = pool.idleCount;
    const waitingCount = pool.waitingCount;

    // Test connection
    const isConnected = await testConnection();

    return {
      healthy: isConnected,
      connections: totalCount - idleCount,
      waiting: waitingCount,
      max: poolConfig.max,
    };
  } catch (error) {
    return {
      healthy: false,
      connections: 0,
      waiting: 0,
      max: poolConfig.max,
    };
  }
}

// ============================================================================
// GRACEFUL SHUTDOWN
// ============================================================================

/**
 * Setup graceful shutdown handlers
 */
export function setupShutdownHandlers(): void {
  const shutdown = async (signal: string): Promise<void> => {
    logger.info(`Received ${signal}, closing database connections...`);
    await closePool();
    process.exit(0);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}
