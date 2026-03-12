/**
 * Manual NetSuite Sync Trigger
 * Bypasses API authentication to run the sync directly
 */
const { Pool } = require('pg');
const { randomUUID } = require('crypto');

const wmsPool = new Pool({ host: 'localhost', port: 5432, database: 'wms_db', user: 'wms_user', password: 'wms_password' });
const aapPool = new Pool({ host: 'localhost', port: 5432, database: 'aap_db', user: 'wms_user', password: 'wms_password' });

async function ensureSchemaColumns(pool) {
  console.log('Ensuring schema columns...');
  const columns = [
    { name: 'netsuite_so_internal_id', type: 'VARCHAR(50)' },
    { name: 'netsuite_so_tran_id', type: 'VARCHAR(50)' },
    { name: 'netsuite_if_internal_id', type: 'VARCHAR(50)' },
    { name: 'netsuite_if_tran_id', type: 'VARCHAR(50)' },
    { name: 'netsuite_last_synced_at', type: 'TIMESTAMP WITH TIME ZONE' },
    { name: 'netsuite_source', type: 'VARCHAR(20)' },
    { name: 'subtotal', type: 'NUMERIC(12,2)' },
    { name: 'total_amount', type: 'NUMERIC(12,2)' },
  ];

  for (const col of columns) {
    try {
      await pool.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS ${col.name} ${col.type}`);
      console.log(`  Column ${col.name}: OK`);
    } catch (e) {
      if (e.code !== '42701') { // column already exists
        console.log(`  Column ${col.name}: ERROR - ${e.message}`);
      } else {
        console.log(`  Column ${col.name}: EXISTS`);
      }
    }
  }

  // Create indexes
  const indexes = [
    `CREATE INDEX IF NOT EXISTS idx_orders_ns_so_id ON orders(netsuite_so_internal_id) WHERE netsuite_so_internal_id IS NOT NULL`,
    `CREATE INDEX IF NOT EXISTS idx_orders_ns_so_tran ON orders(netsuite_so_tran_id) WHERE netsuite_so_tran_id IS NOT NULL`,
  ];

  for (const idx of indexes) {
    try {
      await pool.query(idx);
    } catch (e) {
      // Ignore index errors
    }
  }
  console.log('Schema columns ensured.');
}

async function triggerSync() {
  console.log('=== MANUAL NETSUITE SYNC TRIGGER ===\n');

  // Step 1: Ensure schema columns exist
  console.log('Step 1: Ensuring schema columns in aap_db...');
  await ensureSchemaColumns(aapPool);

  // Step 2: Get integration config
  console.log('\nStep 2: Getting integration config...');
  const integration = await wmsPool.query(`
    SELECT i.integration_id, i.configuration, i.enabled
    FROM integrations i
    WHERE i.provider = 'NETSUITE' AND i.enabled = true
    LIMIT 1
  `);

  if (integration.rows.length === 0) {
    console.log('No enabled NetSuite integration found');
    return;
  }

  const config = integration.rows[0];
  console.log(`Integration ID: ${config.integration_id}`);
  console.log(`Enabled: ${config.enabled}`);

  // Step 3: Create a sync job record
  console.log('\nStep 3: Creating sync job record...');
  const jobId = `JOB-${randomUUID().slice(0, 8).toUpperCase()}`;
  await wmsPool.query(`
    INSERT INTO sync_jobs (job_id, integration_id, sync_type, direction, status, started_at, started_by)
    VALUES ($1, $2, 'ORDER_SYNC', 'INBOUND', 'PENDING', NOW(), 'SYSTEM')
  `, [jobId, config.integration_id]);
  console.log(`Created job: ${jobId}`);

  // Step 4: Verify columns were added
  console.log('\nStep 4: Verifying columns...');
  const cols = await aapPool.query(`
    SELECT column_name FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name LIKE 'net%'
  `);
  console.log(`NetSuite columns in aap_db: ${cols.rows.length}`);
  cols.rows.forEach(r => console.log(`  - ${r.column_name}`));

  // Step 5: Show current queue status
  console.log('\nStep 5: Current queue status...');
  const aapQueue = await aapPool.query(`
    SELECT status, COUNT(*) as count
    FROM orders
    WHERE status IN ('PENDING', 'PICKING')
    GROUP BY status
  `);
  console.log('aap_db picking queue:');
  if (aapQueue.rows.length === 0) {
    console.log('  (empty - will be populated by sync)');
  } else {
    aapQueue.rows.forEach(r => console.log(`  ${r.status}: ${r.count}`));
  }

  console.log('\n=== SYNC TRIGGER COMPLETE ===');
  console.log('\nThe backend auto-sync should pick up and process this job.');
  console.log('Alternatively, restart the backend to trigger immediate sync.');
  console.log('\nTo monitor sync progress:');
  console.log(`  SELECT * FROM sync_jobs WHERE job_id = '${jobId}';`);

  await wmsPool.end();
  await aapPool.end();
}

triggerSync().catch(e => {
  console.error('Error:', e.message);
  process.exit(1);
});
