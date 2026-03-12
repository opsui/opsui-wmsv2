const { Pool } = require('pg');
const aapPool = new Pool({ host: 'localhost', port: 5432, database: 'aap_db', user: 'wms_user', password: 'wms_password' });

async function check() {
  console.log('=== SYNC JOBS IN aap_db (FULL DETAILS) ===');
  const jobs = await aapPool.query(`
    SELECT job_id, status, started_at, completed_at,
           records_processed, records_succeeded, records_failed, error_message
    FROM sync_jobs
    ORDER BY started_at DESC
    LIMIT 10
  `);

  jobs.rows.forEach(j => {
    console.log(`\n${j.job_id}: ${j.status}`);
    console.log(`  Started: ${j.started_at?.toISOString() || 'N/A'}`);
    console.log(`  Completed: ${j.completed_at?.toISOString() || 'N/A'}`);
    console.log(`  Processed: ${j.records_processed || 0}`);
    console.log(`  Succeeded: ${j.records_succeeded || 0}`);
    console.log(`  Failed: ${j.records_failed || 0}`);
    if (j.error_message) console.log(`  Error: ${j.error_message}`);
  });

  console.log('\n=== ORDERS TABLE STRUCTURE ===');
  const cols = await aapPool.query(`
    SELECT column_name, data_type
    FROM information_schema.columns
    WHERE table_name = 'orders'
    ORDER BY ordinal_position
  `);
  const nsCols = cols.rows.filter(c => c.column_name.toLowerCase().includes('net'));
  console.log('NetSuite columns:', nsCols.length);
  nsCols.forEach(c => console.log(`  ${c.column_name} (${c.data_type})`));

  console.log('\n=== ORDERS COUNT BY STATUS ===');
  const orders = await aapPool.query(`
    SELECT status, COUNT(*) as count
    FROM orders
    GROUP BY status
    ORDER BY status
  `);
  orders.rows.forEach(r => console.log(`  ${r.status}: ${r.count}`));

  await aapPool.end();
}
check();
