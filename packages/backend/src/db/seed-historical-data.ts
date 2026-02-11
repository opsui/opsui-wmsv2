/**
 * Historical Data Seed
 *
 * Adds historical pick_tasks and additional users for:
 * - Weekly Picker Performance chart
 * - Top 10 SKUs by Scan Frequency chart
 */

import { getPool } from './client';
import * as bcrypt from 'bcrypt';

function getDateDaysAgo(days: number): Date {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

async function seedHistoricalData() {
  const pool = getPool();
  const client = await pool.connect();

  try {
    console.log('🔄 Seeding historical data for charts...');

    // Additional pickers
    const ADDITIONAL_PICKERS = [
      {
        user_id: 'USR-PICK02',
        name: 'Mike Johnson',
        password: 'picker123',
        email: 'mike.johnson@wms.local',
        role: 'PICKER',
      },
      {
        user_id: 'USR-PICK03',
        name: 'Sarah Williams',
        password: 'picker123',
        email: 'sarah.williams@wms.local',
        role: 'PICKER',
      },
      {
        user_id: 'USR-PICK04',
        name: 'David Chen',
        password: 'picker123',
        email: 'david.chen@wms.local',
        role: 'PICKER',
      },
    ];

    // Insert additional pickers
    console.log('👤 Inserting additional pickers...');
    for (const user of ADDITIONAL_PICKERS) {
      const hashedPassword = await bcrypt.hash(user.password, 10);
      try {
        await client.query(
          `INSERT INTO users (user_id, name, email, password_hash, role, active, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, NOW())
           ON CONFLICT (user_id) DO NOTHING`,
          [user.user_id, user.name, user.email, hashedPassword, user.role, true]
        );
      } catch (err: any) {
        // Ignore duplicate errors, continue
        if (err.code !== '23505') {
          console.log(`  ⚠️  Skipped ${user.user_id} (already exists)`);
        }
      }
    }
    console.log(`  ✅ Processed ${ADDITIONAL_PICKERS.length} pickers`);

    // Get existing orders that are PICKED, PACKED, or SHIPPED
    const ordersResult = await client.query(
      `SELECT order_id, updated_at, picker_id
       FROM orders
       WHERE status IN ('PICKED', 'PACKING', 'PACKED', 'SHIPPED')`
    );

    const completedOrders = ordersResult.rows;

    // Pickers to assign tasks to
    const historicalPickers = ['USR-PICK01', 'USR-PICK02', 'USR-PICK03', 'USR-PICK04'];

    console.log(`📦 Creating historical pick tasks for ${completedOrders.length} orders...`);

    let pickTaskCount = 0;
    for (const order of completedOrders) {
      // Get order items for this order
      const itemsResult = await client.query(
        `SELECT order_item_id, order_id, sku, name, quantity, bin_location
         FROM order_items
         WHERE order_id = $1`,
        [order.orderId]
      );

      const orderItems = itemsResult.rows;
      // Always assign a picker for historical data
      const pickerId = order.pickerId || historicalPickers[pickTaskCount % historicalPickers.length];
      const orderDate = order.updatedAt;

      for (const item of orderItems) {
        const pickTaskId =
          'PT-HIST-' +
          order.orderId +
          '-' +
          item.orderItemId.substring(item.orderItemId.lastIndexOf('-') + 1);

        // Random completion time between 2-8 minutes
        const completionMinutes = 2 + Math.floor(Math.random() * 6);
        const startedAt = new Date(orderDate.getTime() - completionMinutes * 60 * 1000);
        const completedAt = orderDate;

        try {
          await client.query(
            `INSERT INTO pick_tasks (pick_task_id, order_id, order_item_id, picker_id, sku, name, target_bin, quantity, picked_quantity, status, started_at, completed_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
             ON CONFLICT (pick_task_id) DO NOTHING`,
            [
              pickTaskId,
              order.orderId,
              item.orderItemId,
              pickerId,
              item.sku,
              item.name,
              item.binLocation,
              item.quantity,
              item.quantity,
              'COMPLETED',
              startedAt,
              completedAt,
            ]
          );
          pickTaskCount++;
        } catch (err: any) {
          if (err.code !== '23505') {
            throw err;
          }
        }
      }
    }

    console.log(`  ✅ Created ${pickTaskCount} historical pick tasks`);
    console.log('\n✅ Historical data seed completed!');
    console.log('\n📊 Summary:');
    console.log(`  Additional Pickers: ${ADDITIONAL_PICKERS.length}`);
    console.log(`  Historical Pick Tasks: ${pickTaskCount}`);
    console.log('\nThis data will populate:');
    console.log('  - Weekly Picker Performance chart');
    console.log('  - Top 10 SKUs by Scan Frequency (Monthly) chart');
  } catch (error) {
    console.error('❌ Error during seed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

seedHistoricalData().catch(console.error);
