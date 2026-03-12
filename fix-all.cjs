const { Pool } = require('pg');
const { randomUUID } = require('crypto');

const wmsPool = new Pool({ host: 'localhost', port: 5432, database: 'wms_db', user: 'wms_user', password: 'wms_password' });
const aapPool = new Pool({ host: 'localhost', port: 5432, database: 'aap_db', user: 'wms_user', password: 'wms_password' });

function generateId(prefix) {
  return `${prefix}-${randomUUID().slice(0, 8).toUpperCase()}`;
}

async function fix() {
  console.log('=== STEP 1: Fix Stuck Sync Jobs ===');
  const fixJobs = await wmsPool.query(`
    UPDATE sync_jobs
    SET status = 'FAILED',
        completed_at = NOW(),
        error_message = 'Job timed out - marked as failed by cleanup script'
    WHERE status = 'RUNNING'
    RETURNING job_id
  `);
  console.log(`Marked ${fixJobs.rows.length} stuck jobs as FAILED`);

  console.log('\n=== STEP 2: Check/Create NetSuite Schema Columns in aap_db ===');
  // Check if columns exist
  const existingCols = await aapPool.query(`
    SELECT column_name FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name LIKE 'net%'
  `);

  if (existingCols.rows.length === 0) {
    console.log('NetSuite columns do not exist. Will be created when sync runs.');
    console.log('The sync service has ensureSchemaColumns() that adds these columns.');
  } else {
    console.log(`Found ${existingCols.rows.length} NetSuite columns`);
    existingCols.rows.forEach(r => console.log(`  - ${r.column_name}`));
  }

  console.log('\n=== STEP 3: Fix User Organization Mapping ===');
  const orgResult = await wmsPool.query(`SELECT organization_id FROM organizations WHERE slug = 'aap'`);
  const aapOrgId = orgResult.rows[0]?.organization_id;

  if (aapOrgId) {
    console.log(`AAP organization ID: ${aapOrgId}`);

    const userResult = await wmsPool.query(`SELECT user_id FROM users WHERE email = 'oli@aap.co.nz'`);
    if (userResult.rows.length > 0) {
      const userId = userResult.rows[0].user_id;
      console.log(`User ID: ${userId}`);

      const existing = await wmsPool.query(`
        SELECT * FROM organization_users WHERE user_id = $1 AND organization_id = $2
      `, [userId, aapOrgId]);

      if (existing.rows.length === 0) {
        const orgUserId = generateId('ORGUSER');
        await wmsPool.query(`
          INSERT INTO organization_users (organization_user_id, user_id, organization_id, role, is_primary, is_active, joined_at)
          VALUES ($1, $2, $3, 'ORG_ADMIN', true, true, NOW())
        `, [orgUserId, userId, aapOrgId]);
        console.log(`  Added oli@aap.co.nz to aap organization as ORG_ADMIN`);
      } else {
        await wmsPool.query(`
          UPDATE organization_users SET is_primary = true, is_active = true WHERE user_id = $1 AND organization_id = $2
        `, [userId, aapOrgId]);
        console.log(`  Updated oli@aap.co.nz organization membership`);
      }
    }
  }

  console.log('\n=== STEP 4: Update old orders to cancel status instead of delete ===');
  // Instead of deleting, update to CANCELLED
  const cleanup = await wmsPool.query(`
    UPDATE orders
    SET status = 'CANCELLED',
        cancelled_at = NOW(),
        updated_at = NOW()
    WHERE organization_id IS NULL
      AND status IN ('PENDING', 'PICKING')
      AND order_id NOT IN (SELECT DISTINCT order_id FROM quotes WHERE order_id IS NOT NULL)
    RETURNING order_id
  `);
  console.log(`Cancelled ${cleanup.rows.length} old test orders without organization`);

  console.log('\n=== VERIFICATION ===');

  // Verify user mapping
  const verifyUser = await wmsPool.query(`
    SELECT u.email, o.slug, o.database_name
    FROM users u
    JOIN organization_users ou ON ou.user_id = u.user_id
    JOIN organizations o ON o.organization_id = ou.organization_id
    WHERE u.email LIKE '%aap%'
  `);
  console.log('AAP user mappings:');
  verifyUser.rows.forEach(r => console.log(`  ${r.email} -> ${r.slug} (${r.database_name})`));

  // Check orders in wms_db picking queue
  const wmsQueue = await wmsPool.query(`
    SELECT status, COUNT(*) as count
    FROM orders
    WHERE status IN ('PENDING', 'PICKING')
    GROUP BY status
  `);
  console.log('\nwms_db picking queue:');
  wmsQueue.rows.forEach(r => console.log(`  ${r.status}: ${r.count}`));

  // Check orders in aap_db picking queue
  const aapQueue = await aapPool.query(`
    SELECT status, COUNT(*) as count
    FROM orders
    WHERE status IN ('PENDING', 'PICKING')
    GROUP BY status
  `);
  console.log('\naap_db picking queue:');
  if (aapQueue.rows.length === 0) {
    console.log('  (empty)');
  } else {
    aapQueue.rows.forEach(r => console.log(`  ${r.status}: ${r.count}`));
  }

  // Check sync jobs
  const syncJobs = await wmsPool.query(`
    SELECT job_id, status FROM sync_jobs
    WHERE integration_id IN (SELECT integration_id FROM integrations WHERE provider = 'NETSUITE')
    ORDER BY started_at DESC LIMIT 5
  `);
  console.log('\nSync job status:');
  syncJobs.rows.forEach(r => console.log(`  ${r.job_id.slice(0,12)}: ${r.status}`));

  await wmsPool.end();
  await aapPool.end();

  console.log('\n=== DONE ===');
  console.log('\nNEXT STEPS:');
  console.log('1. Restart the backend to trigger a new sync');
  console.log('2. Or manually trigger sync via: POST /api/v1/integrations/INT-0A5F4933/sync');
  console.log('3. Login as stores@aap.co.nz or oli@aap.co.nz to see aap orders');
}
fix();
