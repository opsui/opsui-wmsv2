import { getPool } from './client';

async function checkOrderItems() {
  const pool = getPool();

  const result = await pool.query(
    `SELECT order_item_id, order_id, sku, quantity
     FROM order_items
     LIMIT 5`
  );
  console.log('Sample order items:', JSON.stringify(result.rows, null, 2));

  // Check if pick_tasks already exist for these orders
  const existingTasks = await pool.query(
    `SELECT pick_task_id FROM pick_tasks LIMIT 5`
  );
  console.log('\nExisting pick tasks:', JSON.stringify(existingTasks.rows, null, 2));

  await pool.end();
}

checkOrderItems().catch(console.error);
