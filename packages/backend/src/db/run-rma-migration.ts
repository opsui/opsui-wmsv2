/**
 * Run RMA Migration
 */

import { getPool } from './client';
import { up as migrateUp } from './migrations/050_create_rma_tables';

async function runMigration() {
  const pool = getPool();
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    await migrateUp(client);
    await client.query('COMMIT');
    console.log('RMA migration completed successfully!');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Migration failed:', error);
    throw error;
  } finally {
    client.release();
  }
}

runMigration()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
