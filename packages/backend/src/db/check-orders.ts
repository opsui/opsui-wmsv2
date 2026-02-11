import { getPool } from './client';

async function checkOrders() {
  const pool = getPool();

  const result = await pool.query(
    `SELECT order_id, status, picker_id, updated_at
     FROM orders
     WHERE status IN ('PICKED', 'PACKING', 'PACKED', 'SHIPPED')
     LIMIT 10`
  );
  console.log('Sample orders:', JSON.stringify(result.rows, null, 2));

  await pool.end();
}

checkOrders().catch(console.error);
