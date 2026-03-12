const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'wms_db',
  user: 'wms_user',
  password: 'wms_password',
  ssl: false
});

async function check() {
  const client = await pool.connect();
  try {
    // Check PENDING orders by date
    const pending = await client.query(`
      SELECT DATE(created_at) as date, COUNT(*) as count
      FROM orders
      WHERE status = 'PENDING'
      GROUP BY date
      ORDER BY date DESC
      LIMIT 20
    `);
    console.log('PENDING orders by date (most recent 20):');
    pending.rows.forEach(r => console.log(`  ${r.date}: ${r.count}`));

    // Check PICKING orders by date
    const picking = await client.query(`
      SELECT DATE(created_at) as date, COUNT(*) as count
      FROM orders
      WHERE status = 'PICKING'
      GROUP BY date
      ORDER BY date DESC
    `);
    console.log('\nPICKING orders by date:');
    picking.rows.forEach(r => console.log(`  ${r.date}: ${r.count}`));

    // Check recent orders (last 7 days)
    const recent = await client.query(`
      SELECT status, COUNT(*) as count
      FROM orders
      WHERE created_at > NOW() - INTERVAL '7 days'
      GROUP BY status
      ORDER BY status
    `);
    console.log('\nOrders created in last 7 days:');
    recent.rows.forEach(r => console.log(`  ${r.status}: ${r.count}`));

    // Total recent count
    const recentTotal = await client.query(`
      SELECT COUNT(*) as count
      FROM orders
      WHERE created_at > NOW() - INTERVAL '7 days'
    `);
    console.log(`\nTotal orders created in last 7 days: ${recentTotal.rows[0].count}`);

  } finally {
    client.release();
    await pool.end();
  }
}

check().catch(e => {
  console.error('Error:', e.message);
  process.exit(1);
});
