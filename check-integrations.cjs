const { Pool } = require('pg');
const wmsPool = new Pool({ host: 'localhost', port: 5432, database: 'wms_db', user: 'wms_user', password: 'wms_password' });

async function check() {
  // Get recent sync job logs
  console.log('=== RECENT SYNC JOB LOGS (wms_db) ===');
  try {
    const logs = await wmsPool.query(`
      SELECT level, message, timestamp, details
      FROM sync_job_logs
      WHERE job_id IN (
        SELECT job_id FROM sync_jobs
        WHERE integration_id IN (SELECT integration_id FROM integrations WHERE provider = 'NETSUITE')
        ORDER BY started_at DESC
        LIMIT 3
      )
      ORDER BY timestamp DESC
      LIMIT 50
    `);
    logs.rows.forEach(l => {
      const time = l.timestamp.toISOString().slice(11, 19);
      console.log(`[${time}] ${l.level}: ${l.message.slice(0, 100)}`);
    });
  } catch (e) {
    console.log('Error:', e.message);
  }

  // Check all sync jobs with their details
  console.log('\n=== ALL SYNC JOBS (wms_db) ===');
  try {
    const jobs = await wmsPool.query(`
      SELECT job_id, status, started_at, completed_at, records_processed, records_succeeded, records_failed, error_message
      FROM sync_jobs
      WHERE integration_id IN (SELECT integration_id FROM integrations WHERE provider = 'NETSUITE')
      ORDER BY started_at DESC
      LIMIT 10
    `);
    jobs.rows.forEach(j => {
      const start = j.started_at.toISOString().slice(0, 19).replace('T', ' ');
      const end = j.completed_at ? j.completed_at.toISOString().slice(11, 19) : 'RUNNING';
      console.log(`${j.job_id.slice(0, 12)} | ${j.status} | ${start} | ${end} | processed: ${j.records_processed || 0} | succeeded: ${j.records_succeeded || 0} | failed: ${j.records_failed || 0}`);
      if (j.error_message) console.log(`  Error: ${j.error_message.slice(0, 100)}`);
    });
  } catch (e) {
    console.log('Error:', e.message);
  }

  await wmsPool.end();
}
check();
