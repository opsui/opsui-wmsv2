/**
 * Run cycle count tables migration
 *
 * Creates the cycle_count_plans, cycle_count_entries, and cycle_count_tolerances tables
 */

import { getPool, closePool } from './client.js';

async function runCycleCountMigration() {
  const client = await getPool();

  try {
    console.log('Creating cycle count tables...');

    // Cycle Count Plans table
    await client.query(`
      CREATE TABLE IF NOT EXISTS cycle_count_plans (
        plan_id VARCHAR(50) PRIMARY KEY,
        plan_name VARCHAR(255) NOT NULL,
        count_type VARCHAR(50) NOT NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
        scheduled_date TIMESTAMP WITH TIME ZONE NOT NULL,
        started_at TIMESTAMP WITH TIME ZONE,
        completed_at TIMESTAMP WITH TIME ZONE,
        reconciled_at TIMESTAMP WITH TIME ZONE,
        location VARCHAR(100),
        sku VARCHAR(50),
        count_by VARCHAR(50) NOT NULL,
        created_by VARCHAR(50) NOT NULL,
        notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        CONSTRAINT chk_count_type CHECK (count_type IN ('ABC', 'BLANKET', 'SPOT_CHECK', 'RECEIVING', 'SHIPPING', 'AD_HOC')),
        CONSTRAINT chk_plan_status CHECK (status IN ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'RECONCILED', 'CANCELLED'))
      )
    `);
    console.log('✅ cycle_count_plans table created');

    // Create indexes for cycle_count_plans
    await client.query(
      `CREATE INDEX IF NOT EXISTS idx_cycle_count_plans_status ON cycle_count_plans(status)`
    );
    await client.query(
      `CREATE INDEX IF NOT EXISTS idx_cycle_count_plans_type ON cycle_count_plans(count_type)`
    );
    await client.query(
      `CREATE INDEX IF NOT EXISTS idx_cycle_count_plans_scheduled ON cycle_count_plans(scheduled_date DESC)`
    );
    await client.query(
      `CREATE INDEX IF NOT EXISTS idx_cycle_count_plans_count_by ON cycle_count_plans(count_by)`
    );

    // Cycle Count Entries table
    await client.query(`
      CREATE TABLE IF NOT EXISTS cycle_count_entries (
        entry_id VARCHAR(50) PRIMARY KEY,
        plan_id VARCHAR(50) NOT NULL,
        sku VARCHAR(50) NOT NULL,
        bin_location VARCHAR(100) NOT NULL,
        system_quantity NUMERIC(10, 2) NOT NULL,
        counted_quantity NUMERIC(10, 2) NOT NULL,
        variance NUMERIC(10, 2) NOT NULL,
        variance_percent NUMERIC(5, 2),
        variance_status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
        counted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        counted_by VARCHAR(50) NOT NULL,
        reviewed_by VARCHAR(50),
        reviewed_at TIMESTAMP WITH TIME ZONE,
        adjustment_transaction_id VARCHAR(50),
        notes TEXT,
        CONSTRAINT fk_cycle_count_entries_plan FOREIGN KEY (plan_id) REFERENCES cycle_count_plans(plan_id) ON DELETE CASCADE,
        CONSTRAINT chk_variance_status CHECK (variance_status IN ('PENDING', 'APPROVED', 'REJECTED', 'AUTO_ADJUSTED'))
      )
    `);
    console.log('✅ cycle_count_entries table created');

    // Create indexes for cycle_count_entries
    await client.query(
      `CREATE INDEX IF NOT EXISTS idx_cycle_count_entries_plan ON cycle_count_entries(plan_id)`
    );
    await client.query(
      `CREATE INDEX IF NOT EXISTS idx_cycle_count_entries_sku ON cycle_count_entries(sku)`
    );
    await client.query(
      `CREATE INDEX IF NOT EXISTS idx_cycle_count_entries_location ON cycle_count_entries(bin_location)`
    );
    await client.query(
      `CREATE INDEX IF NOT EXISTS idx_cycle_count_entries_variance_status ON cycle_count_entries(variance_status)`
    );
    await client.query(
      `CREATE INDEX IF NOT EXISTS idx_cycle_count_entries_counted_at ON cycle_count_entries(counted_at DESC)`
    );

    // Cycle Count Tolerances table
    await client.query(`
      CREATE TABLE IF NOT EXISTS cycle_count_tolerances (
        tolerance_id VARCHAR(50) PRIMARY KEY,
        tolerance_name VARCHAR(255) NOT NULL,
        sku VARCHAR(50),
        abc_category VARCHAR(10),
        location_zone VARCHAR(50),
        allowable_variance_percent NUMERIC(5, 2) NOT NULL,
        allowable_variance_amount NUMERIC(10, 2) NOT NULL,
        auto_adjust_threshold NUMERIC(5, 2) NOT NULL DEFAULT 2.0,
        requires_approval_threshold NUMERIC(5, 2) NOT NULL DEFAULT 5.0,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        CONSTRAINT chk_abc_category CHECK (abc_category IN ('A', 'B', 'C', 'D'))
      )
    `);
    console.log('✅ cycle_count_tolerances table created');

    // Create indexes for cycle_count_tolerances
    await client.query(
      `CREATE INDEX IF NOT EXISTS idx_cycle_count_tolerances_active ON cycle_count_tolerances(is_active)`
    );
    await client.query(
      `CREATE INDEX IF NOT EXISTS idx_cycle_count_tolerances_sku ON cycle_count_tolerances(sku)`
    );
    await client.query(
      `CREATE INDEX IF NOT EXISTS idx_cycle_count_tolerances_abc ON cycle_count_tolerances(abc_category)`
    );

    // Create triggers for updated_at
    await client.query(`
      CREATE OR REPLACE FUNCTION update_cycle_count_plans_updated_at()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql
    `);

    await client.query(`
      DROP TRIGGER IF EXISTS trigger_update_cycle_count_plans_updated_at ON cycle_count_plans
    `);

    await client.query(`
      CREATE TRIGGER trigger_update_cycle_count_plans_updated_at
      BEFORE UPDATE ON cycle_count_plans
      FOR EACH ROW
      EXECUTE FUNCTION update_cycle_count_plans_updated_at()
    `);

    await client.query(`
      CREATE OR REPLACE FUNCTION update_cycle_count_tolerances_updated_at()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql
    `);

    await client.query(`
      DROP TRIGGER IF EXISTS trigger_update_cycle_count_tolerances_updated_at ON cycle_count_tolerances
    `);

    await client.query(`
      CREATE TRIGGER trigger_update_cycle_count_tolerances_updated_at
      BEFORE UPDATE ON cycle_count_tolerances
      FOR EACH ROW
      EXECUTE FUNCTION update_cycle_count_tolerances_updated_at()
    `);

    console.log('✅ Triggers created');

    // Insert default tolerance
    await client.query(`
      INSERT INTO cycle_count_tolerances
        (tolerance_id, tolerance_name, abc_category, allowable_variance_percent,
         allowable_variance_amount, auto_adjust_threshold, requires_approval_threshold)
      VALUES
        ('TOL-DEFAULT', 'Default Tolerance', NULL, 5.0, 10.0, 2.0, 5.0)
      ON CONFLICT (tolerance_id) DO NOTHING
    `);
    console.log('✅ Default tolerance inserted');

    console.log('🎉 Cycle count migration completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error instanceof Error ? error.message : String(error));
    throw error;
  } finally {
    await closePool();
  }
}

// Run if called directly
if (process.argv[1] === new URL(import.meta.url).pathname) {
  runCycleCountMigration()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

export { runCycleCountMigration };
