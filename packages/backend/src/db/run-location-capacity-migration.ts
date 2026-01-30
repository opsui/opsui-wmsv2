/**
 * Run location capacity tables migration
 *
 * Creates the location_capacities, capacity_rules, and capacity_alerts tables
 */

import { getPool, closePool } from './client.js';
import { logger } from '../config/logger';

async function runLocationCapacityMigration() {
  const client = await getPool();

  try {
    logger.info('Creating location capacity tables...');

    // Location Capacities table
    await client.query(`
      CREATE TABLE IF NOT EXISTS location_capacities (
        capacity_id VARCHAR(50) PRIMARY KEY,
        bin_location VARCHAR(100) NOT NULL UNIQUE,
        capacity_type VARCHAR(50) NOT NULL,
        maximum_capacity NUMERIC(10, 2) NOT NULL,
        current_utilization NUMERIC(10, 2) NOT NULL DEFAULT 0,
        available_capacity NUMERIC(10, 2) NOT NULL,
        utilization_percent NUMERIC(5, 2) NOT NULL DEFAULT 0,
        capacity_unit VARCHAR(20) NOT NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
        warning_threshold NUMERIC(5, 2) NOT NULL DEFAULT 80,
        exceeded_at TIMESTAMP,
        last_updated TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT chk_capacity_type CHECK (capacity_type IN ('WEIGHT', 'VOLUME', 'QUANTITY')),
        CONSTRAINT chk_capacity_unit CHECK (capacity_unit IN ('LBS', 'KG', 'CUBIC_FT', 'CUBIC_M', 'UNITS', 'PALLET')),
        CONSTRAINT chk_capacity_status CHECK (status IN ('ACTIVE', 'INACTIVE', 'WARNING', 'EXCEEDED'))
      )
    `);
    logger.info('✅ location_capacities table created');

    // Create indexes for location_capacities
    await client.query(
      `CREATE INDEX IF NOT EXISTS idx_location_capacity_bin ON location_capacities(bin_location)`
    );
    await client.query(
      `CREATE INDEX IF NOT EXISTS idx_location_capacity_status ON location_capacities(status)`
    );
    await client.query(
      `CREATE INDEX IF NOT EXISTS idx_location_capacity_type ON location_capacities(capacity_type)`
    );

    // Capacity Rules table
    await client.query(`
      CREATE TABLE IF NOT EXISTS capacity_rules (
        rule_id VARCHAR(50) PRIMARY KEY,
        rule_name VARCHAR(255) NOT NULL,
        description TEXT,
        capacity_type VARCHAR(50) NOT NULL,
        capacity_unit VARCHAR(20) NOT NULL,
        applies_to VARCHAR(50) NOT NULL,
        zone VARCHAR(50),
        location_type VARCHAR(50),
        specific_location VARCHAR(100),
        maximum_capacity NUMERIC(10, 2) NOT NULL,
        warning_threshold NUMERIC(5, 2) NOT NULL DEFAULT 80,
        allow_overfill BOOLEAN DEFAULT false,
        overfill_threshold NUMERIC(5, 2),
        is_active BOOLEAN DEFAULT true,
        priority INT NOT NULL DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT chk_rule_applies_to CHECK (applies_to IN ('ALL', 'ZONE', 'LOCATION_TYPE', 'SPECIFIC_LOCATION')),
        CONSTRAINT chk_rule_capacity_type CHECK (capacity_type IN ('WEIGHT', 'VOLUME', 'QUANTITY')),
        CONSTRAINT chk_rule_capacity_unit CHECK (capacity_unit IN ('LBS', 'KG', 'CUBIC_FT', 'CUBIC_M', 'UNITS', 'PALLET'))
      )
    `);
    logger.info('✅ capacity_rules table created');

    // Create indexes for capacity_rules
    await client.query(
      `CREATE INDEX IF NOT EXISTS idx_capacity_rules_active ON capacity_rules(is_active)`
    );
    await client.query(
      `CREATE INDEX IF NOT EXISTS idx_capacity_rules_priority ON capacity_rules(priority)`
    );

    // Capacity Alerts table
    await client.query(`
      CREATE TABLE IF NOT EXISTS capacity_alerts (
        alert_id VARCHAR(50) PRIMARY KEY,
        bin_location VARCHAR(100) NOT NULL,
        capacity_type VARCHAR(50) NOT NULL,
        current_utilization NUMERIC(10, 2) NOT NULL,
        maximum_capacity NUMERIC(10, 2) NOT NULL,
        utilization_percent NUMERIC(5, 2) NOT NULL,
        alert_type VARCHAR(50) NOT NULL,
        alert_message TEXT NOT NULL,
        acknowledged BOOLEAN DEFAULT false,
        acknowledged_by VARCHAR(50),
        acknowledged_at TIMESTAMP,
        resolved_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT chk_alert_type CHECK (alert_type IN ('WARNING', 'EXCEEDED', 'CRITICAL'))
      )
    `);
    logger.info('✅ capacity_alerts table created');

    // Create indexes for capacity_alerts
    await client.query(
      `CREATE INDEX IF NOT EXISTS idx_capacity_alerts_location ON capacity_alerts(bin_location)`
    );
    await client.query(
      `CREATE INDEX IF NOT EXISTS idx_capacity_alerts_acknowledged ON capacity_alerts(acknowledged)`
    );
    await client.query(
      `CREATE INDEX IF NOT EXISTS idx_capacity_alerts_created ON capacity_alerts(created_at)`
    );

    // Create triggers
    await client.query(`
      CREATE OR REPLACE FUNCTION update_location_capacities_updated_at()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql
    `);

    await client.query(`
      DROP TRIGGER IF EXISTS trigger_update_location_capacities_updated_at ON location_capacities
    `);

    await client.query(`
      CREATE TRIGGER trigger_update_location_capacities_updated_at
      BEFORE UPDATE ON location_capacities
      FOR EACH ROW
      EXECUTE FUNCTION update_location_capacities_updated_at()
    `);

    await client.query(`
      CREATE OR REPLACE FUNCTION update_capacity_rules_updated_at()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql
    `);

    await client.query(`
      DROP TRIGGER IF EXISTS trigger_update_capacity_rules_updated_at ON capacity_rules
    `);

    await client.query(`
      CREATE TRIGGER trigger_update_capacity_rules_updated_at
      BEFORE UPDATE ON capacity_rules
      FOR EACH ROW
      EXECUTE FUNCTION update_capacity_rules_updated_at()
    `);

    logger.info('✅ Triggers created');

    logger.info('🎉 Location capacity migration completed successfully!');
  } catch (error) {
    logger.error('Migration failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  } finally {
    await closePool();
  }
}

// Run if called directly
if (process.argv[1] === new URL(import.meta.url).pathname) {
  runLocationCapacityMigration()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

export { runLocationCapacityMigration };
