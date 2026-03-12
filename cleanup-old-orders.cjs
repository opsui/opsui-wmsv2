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

    // First, show what will be deleted
    const preview = await client.query(`
      SELECT status, COUNT(*) as count
      FROM orders
      WHERE EXTRACT(YEAR FROM created_at) = 2025
        AND status NOT IN ('SHIPPED', 'CANCELLED')
      GROUP BY status
    `);
    console.log('Orders from 2025 to be deleted (non-final statuses):');
    preview.rows.forEach(r => console.log(`  ${r.status}: ${r.count}`));

    const totalPreview = await client.query(`
      SELECT COUNT(*) as count
      FROM orders
      WHERE EXTRACT(YEAR FROM created_at) = 2025
        AND status NOT IN ('SHIPPED', 'CANCELLED')
    `);
    console.log(`\nTotal to delete: ${totalPreview.rows[0].count}`);

    // Delete the orders
    const result = await client.query(`
      DELETE FROM orders
      WHERE EXTRACT(YEAR FROM created_at) = 2025
        AND status NOT IN ('SHIPPED', 'CANCELLED')
      RETURNING order_id
    `);
    console.log(`\nDeleted ${result.rowCount} old test orders from 2025`);

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
    console.log('\nQueue counts after cleanup:');
    console.log(`  Picking queue: ${queueCounts.rows[0].picking_queue}`);
    console.log(`  Packing queue: ${queueCounts.rows[0].packing_queue}`);

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
