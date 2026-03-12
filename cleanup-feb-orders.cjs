const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'wms_db',
  user: 'wms_user',
  password: 'wms_password',
  ssl: false
});

async function cleanup() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Delete old Feb 13-14 orders that are still pending/picking
    const result = await client.query(`
      DELETE FROM orders
      WHERE DATE(created_at) IN ('2026-02-13', '2026-02-14')
        AND status IN ('PENDING', 'PICKING')
      RETURNING order_id
    `);
    console.log(`Deleted ${result.rowCount} old orders from Feb 13-14 that were stuck in PENDING/PICKING`);

    await client.query('COMMIT');

    // Show remaining counts
    const remaining = await client.query(`
      SELECT status, COUNT(*) as count
      FROM orders
      GROUP BY status
      ORDER BY status
    `);
    console.log('\nRemaining orders by status:');
    remaining.rows.forEach(r => console.log(`  ${r.status}: ${r.count}`));

    const queueCounts = await client.query(`
      SELECT
        (SELECT COUNT(*) FROM orders WHERE status IN ('PENDING', 'PICKING')) as picking_queue,
        (SELECT COUNT(*) FROM orders WHERE status IN ('PICKED', 'PACKING')) as packing_queue
    `);
    console.log('\nFinal queue counts:');
    console.log(`  Picking queue: ${queueCounts.rows[0].picking_queue}`);
    console.log(`  Packing queue: ${queueCounts.rows[0].packing_queue}`);

    // Show what's left in picking queue by date
    const pickingDates = await client.query(`
      SELECT DATE(created_at) as date, status, COUNT(*) as count
      FROM orders
      WHERE status IN ('PENDING', 'PICKING')
      GROUP BY date, status
      ORDER BY date DESC
    `);
    console.log('\nRemaining picking queue orders by date:');
    pickingDates.rows.forEach(r => console.log(`  ${r.date}: ${r.status} - ${r.count}`));

  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
    await pool.end();
  }
}

cleanup().catch(e => {
  console.error('Error:', e.message);
  process.exit(1);
});
