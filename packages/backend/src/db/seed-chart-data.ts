/**
 * Chart Data Seed
 *
 * Seeds order_items and pick_tasks for existing orders
 */

import { getPool, query } from './client';

function getDateDaysAgo(days: number): Date {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

async function seedChartData() {
  try {
    console.log('🔄 Seeding chart data (order_items and pick_tasks)...');

    // Get existing orders - only those with valid order_id
    const ordersResult = await query(
      `SELECT order_id, status FROM orders WHERE order_id IS NOT NULL LIMIT 50`
    );

    const orders = ordersResult.rows;
    console.log(`Found ${orders.length} orders`);

    // First, ensure SKUs exist
    const SKUS = [
      { sku: 'WIDGET-A-001', name: 'Widget A Type 1', bin: 'A-01-01', category: 'Widgets' },
      { sku: 'GADGET-B-002', name: 'Gadget B Type 2', bin: 'B-05-03', category: 'Gadgets' },
      { sku: 'TOOL-C-003', name: 'Tool C Type 3', bin: 'C-10-05', category: 'Tools' },
      { sku: 'PART-D-004', name: 'Part D Type 4', bin: 'D-02-01', category: 'Parts' },
      { sku: 'COMP-E-005', name: 'Component E Type 5', bin: 'E-08-02', category: 'Components' },
      { sku: 'MATERIAL-F-006', name: 'Material F Type 6', bin: 'F-12-03', category: 'Materials' },
    ];

    console.log('📦 Inserting SKUs...');
    for (const sku of SKUS) {
      await query(
        `INSERT INTO skus (sku, name, category, active, created_at, updated_at)
         VALUES ($1, $2, $3, $4, NOW(), NOW())
         ON CONFLICT (sku) DO NOTHING`,
        [sku.sku, sku.name, sku.category, true]
      );
    }
    console.log(`  ✅ Inserted ${SKUS.length} SKUs`);

    // Ensure bin locations exist
    const BIN_LOCATIONS = [
      { bin: 'A-01-01', zone: 'A', aisle: '01', shelf: '01' },
      { bin: 'B-05-03', zone: 'B', aisle: '05', shelf: '03' },
      { bin: 'C-10-05', zone: 'C', aisle: '10', shelf: '05' },
      { bin: 'D-02-01', zone: 'D', aisle: '02', shelf: '01' },
      { bin: 'E-08-02', zone: 'E', aisle: '08', shelf: '02' },
      { bin: 'F-12-03', zone: 'F', aisle: '12', shelf: '03' },
    ];

    console.log('📍 Inserting bin locations...');
    for (const loc of BIN_LOCATIONS) {
      await query(
        `INSERT INTO bin_locations (bin_id, zone, aisle, shelf, type, active)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (bin_id) DO NOTHING`,
        [loc.bin, loc.zone, loc.aisle, loc.shelf, 'SHELF', true]
      );
    }
    console.log(`  ✅ Inserted ${BIN_LOCATIONS.length} bin locations`);

    const historicalPickers = ['USR-PICK01', 'USR-PICK02', 'USR-PICK03', 'USR-PICK04'];

    let orderItemsCount = 0;
    let pickTasksCount = 0;
    let orderItemCount = 0;

    // Process in smaller batches
    for (const order of orders.slice(0, 25)) {
      if (!order.orderId || !order.status) {
        continue;
      }

      // Generate 2-3 items per order
      const itemCount = 2 + Math.floor(Math.random() * 2);

      for (let i = 0; i < itemCount; i++) {
        const skuData = SKUS[Math.floor(Math.random() * SKUS.length)];
        const quantity = 1 + Math.floor(Math.random() * 3);
        // Generate shorter order_item_id (max 20 chars)
        // Extract just numbers from order ID: ORD-20260112-0001 -> 2026011200011
        const orderNum = order.orderId.replace(/[^0-9]/g, '').substring(0, 10);
        const orderItemId = `OI${orderNum}${i}`;

        // Insert order item
        try {
          await query(
            `INSERT INTO order_items (order_item_id, order_id, sku, name, quantity, picked_quantity, bin_location, status)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
             ON CONFLICT (order_item_id) DO NOTHING`,
            [
              orderItemId,
              order.orderId,
              skuData.sku,
              skuData.name,
              quantity,
              quantity, // picked_quantity equals quantity for completed orders
              skuData.bin,
              'FULLY_PICKED',
            ]
          );
          orderItemsCount++;
        } catch (err: any) {
          if (err.code !== '23505') {
            console.log('Warning: order item insert failed', err.message);
          }
        }

        // Create pick task for picked/shipped orders
        if (['PICKED', 'PACKING', 'PACKED', 'SHIPPED'].includes(order.status)) {
          const pickerId = historicalPickers[pickTasksCount % historicalPickers.length];
          // Generate shorter pick_task_id (max 20 chars)
          const ptNum = orderNum + i;
          const pickTaskId = `PT${ptNum}`;

          // Calculate timestamps (within last 30 days for charts)
          const daysAgo = Math.floor(Math.random() * 28) + 1; // 1-29 days ago
          const completedAt = getDateDaysAgo(daysAgo);
          const durationMinutes = 2 + Math.floor(Math.random() * 6);
          const startedAt = new Date(completedAt.getTime() - durationMinutes * 60 * 1000);

          try {
            await query(
              `INSERT INTO pick_tasks (pick_task_id, order_id, order_item_id, picker_id, sku, name, target_bin, quantity, picked_quantity, status, started_at, completed_at)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
               ON CONFLICT (pick_task_id) DO NOTHING`,
              [
                pickTaskId,
                order.orderId,
                orderItemId,
                pickerId,
                skuData.sku,
                skuData.name,
                skuData.bin,
                quantity,
                quantity,
                'COMPLETED',
                startedAt,
                completedAt,
              ]
            );
            pickTasksCount++;
          } catch (err: any) {
            if (err.code !== '23505') {
              console.log('Warning: pick task insert failed', err.message);
            }
          }
        }
      }
      orderItemCount += itemCount;
    }

    console.log(`  ✅ Inserted ${orderItemsCount} order items`);
    console.log(`  ✅ Created ${pickTasksCount} pick tasks`);
    console.log('\n✅ Chart data seed completed!');
    console.log('\n📊 Summary:');
    console.log(`  SKUs inserted: 6`);
    console.log(`  Bin locations inserted: 6`);
    console.log(`  Orders processed: ${Math.min(25, orders.length)}`);
    console.log(`  Order items created: ${orderItemsCount}`);
    console.log(`  Pick tasks created: ${pickTasksCount}`);
    console.log('\nThis data will populate:');
    console.log('  - Weekly Picker Performance chart');
    console.log('  - Top 10 SKUs by Scan Frequency (Monthly) chart');

    const pool = getPool();
    await pool.end();
  } catch (error) {
    console.error('❌ Error during seed:', error);
    throw error;
  }
}

seedChartData().catch(console.error);
