const { Pool } = require('pg');

async function main() {
  const pool = new Pool({
    host: 'localhost',
    port: 5433,
    database: 'wms_db',
    user: 'wms_user',
    password: 'wms_password',
  });

  try {
    const timestamp = Date.now();
    const orderId = `ORD-TEST-${timestamp}`;
    
    // Create a test order
    await pool.query(
      `INSERT INTO orders (order_id, status, priority, created_at)
       VALUES ($1, 'PENDING', 'STANDARD', NOW())`,
      [orderId]
    );
    
    console.log('Created test order:', orderId);
    
    // Create order items
    await pool.query(
      `INSERT INTO order_items (order_id, sku, quantity, picked_quantity)
       VALUES ($1, 'SKU-001', 5, 0)`,
      [orderId]
    );
    
    await pool.query(
      `INSERT INTO order_items (order_id, sku, quantity, picked_quantity)
       VALUES ($1, 'SKU-002', 3, 0)`,
      [orderId]
    );
    
    console.log('Added order items');
    console.log('\nTest order created successfully!');
    console.log('Order ID:', orderId);
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

main();