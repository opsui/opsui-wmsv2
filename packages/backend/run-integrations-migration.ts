import { getPool, closePool } from './src/db/client.ts';

async function runMigration() {
  const pool = getPool();
  const client = await pool.connect();

  try {
    // Check if carrier_accounts table exists and has integration_id column
    const checkColumn = await client.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'carrier_accounts' AND column_name = 'integration_id'
    `);

    if (checkColumn.rows.length === 0) {
      console.log('Adding integration_id column to carrier_accounts table...');

      // Add the integration_id column if it doesn't exist
      await client.query(`
        ALTER TABLE carrier_accounts
        ADD COLUMN IF NOT EXISTS integration_id VARCHAR(50) REFERENCES integrations(integration_id) ON DELETE SET NULL
      `);

      console.log('✅ Added integration_id column to carrier_accounts');
    } else {
      console.log('✅ integration_id column already exists in carrier_accounts');
    }

    // Create the integrations table if it doesn't exist
    const checkTable = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_name = 'integrations'
    `);

    if (checkTable.rows.length === 0) {
      console.log('Creating integrations table...');
      await client.query(`
        CREATE TABLE IF NOT EXISTS integrations (
          integration_id VARCHAR(50) PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          description TEXT,
          type VARCHAR(50) NOT NULL CHECK (type IN ('ERP', 'ECOMMERCE', 'CARRIER', 'MARKETPLACE', 'ACCOUNTING', 'CUSTOM')),
          provider VARCHAR(100) NOT NULL,
          status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE', 'PENDING', 'ERROR')),
          configuration JSONB NOT NULL DEFAULT '{}',
          sync_settings JSONB,
          webhook_settings JSONB,
          enabled BOOLEAN DEFAULT TRUE,
          created_by VARCHAR(50) NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_by VARCHAR(50),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          last_sync_at TIMESTAMP WITH TIME ZONE,
          last_sync_status VARCHAR(50),
          last_error TEXT
        )
      `);
      console.log('✅ Created integrations table');
    } else {
      console.log('✅ integrations table already exists');
    }

    // Create sync_jobs table if it doesn't exist
    const checkSyncJobs = await client.query(`
      SELECT table_name FROM information_schema.tables WHERE table_name = 'sync_jobs'
    `);

    if (checkSyncJobs.rows.length === 0) {
      console.log('Creating sync_jobs table...');
      await client.query(`
        CREATE TABLE IF NOT EXISTS sync_jobs (
          job_id VARCHAR(50) PRIMARY KEY,
          integration_id VARCHAR(50) NOT NULL REFERENCES integrations(integration_id) ON DELETE CASCADE,
          sync_type VARCHAR(50) NOT NULL CHECK (sync_type IN ('FULL_SYNC', 'INCREMENTAL_SYNC', 'PRODUCT_SYNC', 'ORDER_SYNC', 'INVENTORY_SYNC', 'SHIPMENT_SYNC')),
          direction VARCHAR(20) NOT NULL CHECK (direction IN ('INBOUND', 'OUTBOUND', 'BIDIRECTIONAL')),
          status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED')),
          started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          completed_at TIMESTAMP WITH TIME ZONE,
          started_by VARCHAR(50),
          records_processed INTEGER DEFAULT 0,
          records_succeeded INTEGER DEFAULT 0,
          records_failed INTEGER DEFAULT 0,
          error_message TEXT
        )
      `);
      console.log('✅ Created sync_jobs table');
    }

    // Create indexes
    console.log('Creating indexes...');
    await client.query(
      `CREATE INDEX IF NOT EXISTS idx_carrier_accounts_integration_id ON carrier_accounts(integration_id)`
    );
    await client.query(`CREATE INDEX IF NOT EXISTS idx_integrations_type ON integrations(type)`);
    await client.query(
      `CREATE INDEX IF NOT EXISTS idx_integrations_provider ON integrations(provider)`
    );
    await client.query(
      `CREATE INDEX IF NOT EXISTS idx_integrations_status ON integrations(status)`
    );
    console.log('✅ Created indexes');

    console.log('\n✅ Integrations migration completed successfully!');
  } finally {
    await client.release();
    await closePool();
  }
}

runMigration()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });
