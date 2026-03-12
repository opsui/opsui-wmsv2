/**
 * Database Clients - Barrel Export
 *
 * This file provides a single import point for all database clients.
 * Import from here to ensure consistent database access across the codebase.
 *
 * @example
 * import { wmsDB, aapDB, WMS_DB_INFO, AAP_DB_INFO } from './db';
 */

// Database Clients
export { wmsDB, wmsPool, WMS_DB_INFO } from './wms_db';
export { aapDB, aapPool, AAP_DB_INFO } from './aap_db';

// Type exports for database results
export type { Pool, PoolClient, QueryResult } from 'pg';

/**
 * Database Connection Verification
 *
 * Call this at application startup to verify all database connections.
 */
export async function verifyDatabaseConnections(): Promise<{
  wms: boolean;
  aap: boolean;
  errors: string[];
}> {
  const errors: string[] = [];
  let wms = false;
  let aap = false;

  try {
    await wmsDB.query('SELECT 1');
    wms = true;
  } catch (error) {
    errors.push(`WMS DB: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  try {
    await aapDB.query('SELECT 1');
    aap = true;
  } catch (error) {
    errors.push(`AAP DB: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  return { wms, aap, errors };
}

/**
 * Graceful Shutdown
 *
 * Call this during application shutdown to close all database connections.
 */
export async function closeAllDatabaseConnections(): Promise<void> {
  console.log('[DB] Closing all database connections...');

  try {
    await wmsDB.end();
    console.log('[DB] WMS database connections closed');
  } catch (error) {
    console.error('[DB] Error closing WMS connections:', error);
  }

  try {
    await aapDB.end();
    console.log('[DB] AAP database connections closed');
  } catch (error) {
    console.error('[DB] Error closing AAP connections:', error);
  }
}
