/**
 * Migration Runner: Add cycle count variance support to order_exceptions table
 *
 * Run with: npx tsx src/db/migrations/run-cycle-count-variance-migration.ts
 */

const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME || 'wms_db',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
});

async function runCycleCountVarianceMigration() {
  const client = await pool.connect();

  try {
    console.log('Starting cycle count variance migration...');

    // Add CYCLE_COUNT_VARIANCE to the exception type constraint
    console.log('Updating exception type constraint...');
    await client.query(`
      ALTER TABLE order_exceptions DROP CONSTRAINT IF EXISTS check_exception_type
    `);

    await client.query(`
      ALTER TABLE order_exceptions
      ADD CONSTRAINT check_exception_type
      CHECK (type IN ('SHORT_PICK', 'SHORT_PICK_BACKORDER', 'DAMAGE', 'DEFECTIVE',
                       'WRONG_ITEM', 'SUBSTITUTION', 'OUT_OF_STOCK', 'BIN_MISMATCH',
                       'BARCODE_MISMATCH', 'EXPIRED', 'CYCLE_COUNT_VARIANCE', 'OTHER'))
    `);
    console.log('✅ Exception type constraint updated');

    // Make order_id and order_item_id nullable
    console.log('Making order_id and order_item_id nullable...');
    await client.query(`
      ALTER TABLE order_exceptions ALTER COLUMN order_id DROP NOT NULL
    `);
    await client.query(`
      ALTER TABLE order_exceptions ALTER COLUMN order_item_id DROP NOT NULL
    `);
    console.log('✅ Columns made nullable');

    // Add cycle count variance specific columns
    console.log('Adding cycle count variance columns...');
    await client.query(`
      ALTER TABLE order_exceptions
      ADD COLUMN IF NOT EXISTS cycle_count_entry_id VARCHAR(50)
    `);
    await client.query(`
      ALTER TABLE order_exceptions
      ADD COLUMN IF NOT EXISTS cycle_count_plan_id VARCHAR(50)
    `);
    await client.query(`
      ALTER TABLE order_exceptions
      ADD COLUMN IF NOT EXISTS bin_location VARCHAR(100)
    `);
    await client.query(`
      ALTER TABLE order_exceptions
      ADD COLUMN IF NOT EXISTS system_quantity NUMERIC(10, 2)
    `);
    await client.query(`
      ALTER TABLE order_exceptions
      ADD COLUMN IF NOT EXISTS counted_quantity NUMERIC(10, 2)
    `);
    await client.query(`
      ALTER TABLE order_exceptions
      ADD COLUMN IF NOT EXISTS variance_percent NUMERIC(5, 2)
    `);
    await client.query(`
      ALTER TABLE order_exceptions
      ADD COLUMN IF NOT EXISTS variance_reason_code VARCHAR(50)
    `);
    console.log('✅ Cycle count variance columns added');

    // Add foreign key to cycle count entries
    console.log('Adding foreign key constraints...');
    await client.query(`
      ALTER TABLE order_exceptions
      DROP CONSTRAINT IF EXISTS order_exceptions_cycle_count_entry_id_fkey
    `);
    await client.query(`
      ALTER TABLE order_exceptions
      ADD CONSTRAINT order_exceptions_cycle_count_entry_id_fkey
      FOREIGN KEY (cycle_count_entry_id) REFERENCES cycle_count_entries(entry_id) ON DELETE SET NULL
    `);
    console.log('✅ Foreign key constraints added');

    // Add indexes
    console.log('Adding indexes...');
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_order_exceptions_cycle_count_entry_id
      ON order_exceptions(cycle_count_entry_id)
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_order_exceptions_cycle_count_plan_id
      ON order_exceptions(cycle_count_plan_id)
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_order_exceptions_bin_location
      ON order_exceptions(bin_location)
    `);
    console.log('✅ Indexes created');

    console.log('🎉 Cycle count variance migration completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error instanceof Error ? error.message : String(error));
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run if called directly
if (require.main === module) {
  runCycleCountVarianceMigration()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = { runCycleCountVarianceMigration };
