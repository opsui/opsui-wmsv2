import { getPool, closePool } from './src/db/client.ts';

async function fixCarrierAccountsTable() {
  const pool = getPool();
  const client = await pool.connect();

  try {
    // First, check what columns exist in carrier_accounts
    const columns = await client.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'carrier_accounts'
      ORDER BY ordinal_position
    `);

    console.log('Current carrier_accounts columns:');
    columns.rows.forEach(row => {
      console.log(`  - ${row.column_name}: ${row.data_type}`);
    });

    // Check if the table needs to be recreated
    const hasRequiredColumns = columns.rows.some(r => r.column_name === 'carrier_account_id');

    if (!hasRequiredColumns) {
      console.log('\nRecreating carrier_accounts table with correct schema...');

      // Drop the old table
      await client.query(`DROP TABLE IF EXISTS carrier_accounts CASCADE`);

      // Create with correct schema
      await client.query(`
        CREATE TABLE carrier_accounts (
          carrier_account_id VARCHAR(50) PRIMARY KEY,
          integration_id VARCHAR(50) REFERENCES integrations(integration_id) ON DELETE SET NULL,
          carrier VARCHAR(100) NOT NULL,
          account_number VARCHAR(255) NOT NULL,
          account_name VARCHAR(255),
          is_active BOOLEAN DEFAULT TRUE,
          services JSONB DEFAULT '[]',
          configured_services JSONB DEFAULT '{}',
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
      `);

      // Create indexes
      await client.query(
        `CREATE INDEX IF NOT EXISTS idx_carrier_accounts_integration_id ON carrier_accounts(integration_id)`
      );
      await client.query(
        `CREATE INDEX IF NOT EXISTS idx_carrier_accounts_carrier ON carrier_accounts(carrier)`
      );

      console.log('✅ Recreated carrier_accounts table with correct schema');
    } else {
      console.log('✅ carrier_accounts table already has correct structure');
    }
  } finally {
    await client.release();
    await closePool();
  }
}

fixCarrierAccountsTable()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });
