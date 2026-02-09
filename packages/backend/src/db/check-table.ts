import { getPool } from './client';

async function checkTable() {
  const pool = getPool();
  try {
    const result = await pool.query(
      "SELECT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'order_state_changes')"
    );
    console.log('order_state_changes table exists:', result.rows[0].exists);
  } catch (error: any) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkTable();
