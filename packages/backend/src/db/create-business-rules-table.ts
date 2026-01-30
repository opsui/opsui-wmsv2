/**
 * Create business_rules table
 */

import { query } from './client';

async function createBusinessRulesTables() {
  console.log('Creating business_rules tables...');

  try {
    // Main business_rules table
    await query(`
      CREATE TABLE IF NOT EXISTS business_rules (
        rule_id VARCHAR(50) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        rule_type VARCHAR(50) NOT NULL CHECK (rule_type IN ('ALLOCATION', 'PICKING', 'SHIPPING', 'INVENTORY', 'VALIDATION', 'NOTIFICATION')),
        status VARCHAR(20) NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('ACTIVE', 'INACTIVE', 'DRAFT')),
        priority INTEGER DEFAULT 5 CHECK (priority BETWEEN 1 AND 10),
        start_date TIMESTAMP WITH TIME ZONE,
        end_date TIMESTAMP WITH TIME ZONE,
        created_by VARCHAR(50) NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_by VARCHAR(50),
        version INTEGER DEFAULT 1,
        execution_count INTEGER DEFAULT 0,
        last_executed_at TIMESTAMP WITH TIME ZONE
      )
    `);
    console.log('✓ Created business_rules table');

    // Indexes
    await query(`CREATE INDEX IF NOT EXISTS idx_business_rules_status ON business_rules(status)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_business_rules_type ON business_rules(rule_type)`);
    console.log('✓ Created indexes');

    console.log('Migration completed successfully!');
  } catch (error: any) {
    console.error('✗ Migration failed:', error.message);
    throw error;
  }
}

createBusinessRulesTables()
  .then(() => {
    console.log('Done! Exiting...');
    process.exit(0);
  })
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
