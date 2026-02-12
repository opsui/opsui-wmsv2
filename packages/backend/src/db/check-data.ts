import { getPool } from './client';

async function checkData() {
  const pool = getPool();

  const result = await pool.query(
    `SELECT COUNT(*) as count, MIN(started_at) as earliest, MAX(started_at) as latest
     FROM pick_tasks`
  );
  console.log('Pick tasks in database:', result.rows[0]);

  const orders = await pool.query(`SELECT status, COUNT(*) as count FROM orders GROUP BY status`);
  console.log('\nOrders by status:', orders.rows);

  const pickers = await pool.query(`SELECT user_id, name FROM users WHERE role = 'PICKER'`);
  console.log('\nPickers:', pickers.rows);

  await pool.end();
}

checkData().catch(console.error);
