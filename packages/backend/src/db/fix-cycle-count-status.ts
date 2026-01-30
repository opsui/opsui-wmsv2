/**
 * Fix Cycle Count Status Default
 *
 * Fixes the mismatch between database default (PENDING) and enum (SCHEDULED)
 */

import { getPool } from './client';

async function fixCycleCountStatus() {
  const pool = getPool();
  const client = await pool.connect();

  try {
    console.log('🔧 Fixing cycle count status values...');

    await client.query('BEGIN');

    // Check current status values
    const checkResult = await client.query('SELECT status, COUNT(*) as count FROM cycle_count_plans GROUP BY status');
    console.log('\n📊 Current statuses in database:');
    checkResult.rows.forEach(row => {
      console.log(`  ${row.status}: ${row.count}`);
    });

    // Update any PENDING to SCHEDULED
    const updateResult = await client.query("UPDATE cycle_count_plans SET status = 'SCHEDULED' WHERE status = 'PENDING'");
    console.log(`\n✅ Updated ${updateResult.rowCount} rows from PENDING to SCHEDULED`);

    // Fix the default for future inserts
    await client.query("ALTER TABLE cycle_count_plans ALTER COLUMN status SET DEFAULT 'SCHEDULED'");
    console.log('✅ Default status updated to SCHEDULED');

    await client.query('COMMIT');

    // Verify the fix
    const verifyResult = await client.query(
      "SELECT column_default FROM information_schema.columns WHERE table_name = 'cycle_count_plans' AND column_name = 'status'"
    );
    console.log(`\n✅ New default value: ${verifyResult.rows[0].column_default}`);

    console.log('\n✨ Fix completed successfully!');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error fixing cycle count status:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the fix
fixCycleCountStatus().catch(console.error);
