/**
 * Reset ALL Tables in the Database
 *
 * This script clears ALL data from ALL tables in the database
 */

import { getPool } from './client';

async function resetAllTables() {
  const pool = getPool();
  const client = await pool.connect();

  try {
    console.log('🔄 Starting complete database reset...');

    // Get all table names
    const tablesResult = await client.query(`
      SELECT tablename
      FROM pg_tables
      WHERE schemaname = 'public'
      ORDER BY tablename;
    `);

    const tables = tablesResult.rows.map(row => row.tablename);
    console.log(`📋 Found ${tables.length} tables to clear:`);
    tables.forEach(t => console.log(`  - ${t}`));

    // Begin transaction
    await client.query('BEGIN');
    console.log('🗑️  Clearing all tables...');

    // Disable all foreign key constraints temporarily
    await client.query('SET CONSTRAINTS ALL DEFERRED;');

    // Truncate all tables
    for (const table of tables) {
      await client.query(`TRUNCATE TABLE ${table} CASCADE;`);
      console.log(`  ✅ Cleared ${table}`);
    }

    // Re-enable constraints
    await client.query('SET CONSTRAINTS ALL IMMEDIATE;');

    // Commit transaction
    await client.query('COMMIT');
    console.log('✅ All tables cleared successfully!');

    console.log(`\n📊 Summary: ${tables.length} tables truncated`);
  } catch (error) {
    // Rollback on error
    await client.query('ROLLBACK');
    console.error('❌ Error during database reset:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the reset
resetAllTables().catch(console.error);
