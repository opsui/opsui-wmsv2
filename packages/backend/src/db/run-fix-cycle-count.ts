/**
 * Quick migration: Fix cycle_count column lengths for user ID references
 * Updates count_type, count_by, created_by, counted_by, and reviewed_by to VARCHAR(50)
 */

import { getPool, closePool } from './client.js';

async function runMigration() {
  const client = await getPool();

  try {
    console.log('Running migration: Fix cycle_count column lengths...');

    // Check cycle_count_plans columns
    const plansResult = await client.query(`
      SELECT column_name, character_maximum_length
      FROM information_schema.columns
      WHERE table_name = 'cycle_count_plans'
      AND column_name IN ('count_type', 'count_by', 'created_by')
    `);

    console.log('\ncycle_count_plans:');
    for (const row of plansResult.rows) {
      console.log(`  - ${row.column_name}: VARCHAR(${row.character_maximum_length})`);
    }

    // Check cycle_count_entries columns
    const entriesResult = await client.query(`
      SELECT column_name, character_maximum_length
      FROM information_schema.columns
      WHERE table_name = 'cycle_count_entries'
      AND column_name IN ('counted_by', 'reviewed_by')
    `);

    console.log('\ncycle_count_entries:');
    for (const row of entriesResult.rows) {
      console.log(`  - ${row.column_name}: VARCHAR(${row.character_maximum_length})`);
    }

    // Run the migration
    let updates = 0;

    // Fix cycle_count_plans columns
    for (const row of plansResult.rows) {
      if (row.character_maximum_length < 50) {
        await client.query(
          `ALTER TABLE cycle_count_plans ALTER COLUMN ${row.column_name} TYPE VARCHAR(50)`
        );
        console.log(`✓ cycle_count_plans.${row.column_name} updated to VARCHAR(50)`);
        updates++;
      }
    }

    // Fix cycle_count_entries columns
    for (const row of entriesResult.rows) {
      if (row.character_maximum_length < 50) {
        await client.query(
          `ALTER TABLE cycle_count_entries ALTER COLUMN ${row.column_name} TYPE VARCHAR(50)`
        );
        console.log(`✓ cycle_count_entries.${row.column_name} updated to VARCHAR(50)`);
        updates++;
      }
    }

    if (updates === 0) {
      console.log('\n✓ All columns are already VARCHAR(50) or larger. No migration needed.');
    } else {
      console.log(`\n✓ Migration applied successfully! ${updates} column(s) updated.`);
    }
  } catch (error: any) {
    console.error('✗ Migration failed:', error.message);
    throw error;
  } finally {
    await closePool();
  }
}

runMigration()
  .then(() => {
    console.log('\n✓ Migration completed');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n✗ Migration failed:', error);
    process.exit(1);
  });
