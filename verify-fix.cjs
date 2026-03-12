#!/usr/bin/env node
/**
 * Verify order status counts after stale order cleanup
 */

const { Pool } = require('pg');
require('dotenv').config();

async function main() {
  const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'opsui_dev',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
  });

  console.log('=== ORDER STATUS VERIFICATION ===\n');

  try {
    // Get status breakdown
    const result = await pool.query(`
      SELECT status, COUNT(*) as count
      FROM orders
      GROUP BY status
      ORDER BY count DESC
    `);

    console.log('Current Order Status Distribution:');
    console.table(result.rows);

    // Count PICKED orders specifically
    const picked = await pool.query(`
      SELECT COUNT(*) as picked_count FROM orders WHERE status = 'PICKED'
    `);

    // Count stale orders (PICKED > 48h without fulfillment)
    const stale = await pool.query(`
      SELECT COUNT(*) as stale_count
      FROM orders
      WHERE status = 'PICKED'
        AND netsuite_source = 'NETSUITE'
        AND netsuite_if_internal_id IS NULL
        AND updated_at < NOW() - INTERVAL '48 hours'
    `);

    console.log('\n=== SUMMARY ===');
    console.log(`Total PICKED orders: ${picked.rows[0].picked_count}`);
    console.log(`Stale PICKED orders (>48h, no fulfillment): ${stale.rows[0].stale_count}`);
    console.log(`\nExpected NetSuite packing queue: ~2 orders`);

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

main();
