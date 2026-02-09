import { getPool, closePool } from './src/db/client.ts';

async function updateOrdersForPacking() {
  const pool = getPool();
  const client = await pool.connect();

  try {
    // Get some PENDING orders and update them to PICKED
    const result = await client.query(
      `SELECT order_id, customer_name, status
       FROM orders
       WHERE status = 'PENDING'
       ORDER BY order_id
       LIMIT 5`
    );

    if (result.rows.length === 0) {
      console.log('No PENDING orders found. Let me check all orders...');
      const allOrders = await client.query(
        `SELECT order_id, customer_name, status FROM orders ORDER BY order_id LIMIT 10`
      );
      console.log('Current orders:');
      allOrders.rows.forEach(row => {
        console.log(`  - ${row.order_id} - ${row.customer_name} [${row.status}]`);
      });
      return;
    }

    console.log(`Found ${result.rows.length} PENDING orders to update to PICKED:`);

    for (const row of result.rows) {
      await client.query(
        `UPDATE orders
         SET status = 'PICKED',
             picked_at = NOW()
         WHERE order_id = $1`,
        [row.order_id]
      );
      console.log(`  ✓ ${row.order_id} - ${row.customer_name}`);
    }

    // Verify the orders are now PICKED
    const verifyResult = await client.query(
      `SELECT order_id, customer_name, status
       FROM orders
       WHERE status = 'PICKED'
       ORDER BY order_id
       LIMIT 10`
    );

    console.log(`\n✅ You now have ${verifyResult.rows.length} orders ready for packing:`);
    verifyResult.rows.forEach(row => {
      console.log(`  - ${row.order_id} - ${row.customer_name}`);
    });
  } finally {
    await client.release();
    await closePool();
  }
}

updateOrdersForPacking()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });
