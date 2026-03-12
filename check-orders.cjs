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
    // Check orders by status
    const statusResult = await client.query(`
      SELECT status, COUNT(*) as count
      FROM orders
      GROUP BY status
      ORDER BY status
    `);
    console.log('Orders by status:');
    statusResult.rows.forEach(r => console.log(`  ${r.status}: ${r.count}`));

    // Check orders by year
    const yearResult = await client.query(`
      SELECT EXTRACT(YEAR FROM created_at) as year, COUNT(*) as count
      FROM orders
      GROUP BY year
      ORDER BY year DESC
    `);
    console.log('\nOrders by year:');
    yearResult.rows.forEach(r => console.log(`  ${r.year}: ${r.count}`));

    // Packing queue eligible (PICKED + PACKING)
    const packingResult = await client.query(`
      SELECT status, EXTRACT(YEAR FROM created_at) as year, COUNT(*) as count
      FROM orders
      WHERE status IN ('PICKED', 'PACKING')
      GROUP BY status, year
      ORDER BY year DESC, status
    `);
    console.log('\nPacking queue orders (PICKED/PACKING) by year:');
    packingResult.rows.forEach(r => console.log(`  ${r.year} - ${r.status}: ${r.count}`));

    // Total in packing queue
    const totalPacking = await client.query(`
      SELECT COUNT(*) as count FROM orders WHERE status IN ('PICKED', 'PACKING')
    `);
    console.log(`\nTotal in packing queue: ${totalPacking.rows[0].count}`);

    // Picking queue eligible (PENDING + PICKING)
    const pickingResult = await client.query(`
      SELECT COUNT(*) as count FROM orders WHERE status IN ('PENDING', 'PICKING')
    `);
    console.log(`Total in picking queue: ${pickingResult.rows[0].count}`);

  } finally {
    client.release();
    await pool.end();
  }
}

check().catch(e => {
  console.error('Error:', e.message);
  process.exit(1);
});
