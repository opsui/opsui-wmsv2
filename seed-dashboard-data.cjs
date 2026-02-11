const { Pool } = require('pg');

let orderCounter = 0;
function generateOrderId() {
  orderCounter++;
  const date = new Date();
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
  // Format: ORD-YYYYMMDD-XXX (3 digits) to match validation pattern
  // Use a combination of random and counter to ensure uniqueness within same day
  const suffix = (orderCounter % 1000).toString().padStart(3, '0');
  return `ORD-${dateStr}-${suffix}`;
}

function getRandomDate(daysBack) {
  const now = new Date();
  const past = new Date(now.getTime() - daysBack * 24 * 60 * 60 * 1000);
  return new Date(past.getTime() + Math.random() * (now.getTime() - past.getTime()));
}

function addHours(baseDate, hours) {
  return new Date(baseDate.getTime() + hours * 60 * 60 * 1000);
}

async function seedData() {
  const pool = new Pool({
    host: 'localhost',
    port: 5433,
    database: 'wms_db',
    user: 'wms_user',
    password: 'wms_password'
  });

  const client = await pool.connect();
  try {
    const customers = ['Acme Corp', 'Globex Inc', 'Soylent Corp', 'Initech', 'Umbrella Corp', 'Stark Industries', 'Wayne Enterprises', 'Cyberdyne Systems'];
    const priorities = ['LOW', 'NORMAL', 'HIGH', 'URGENT'];
    const pickers = ['USR-PICK01', 'USR-PICK02'];
    const packers = ['USR-PACK01'];

    // Get existing SKUs
    const skuResult = await client.query('SELECT sku, name, barcode FROM skus LIMIT 10');
    const skus = skuResult.rows;
    console.log(`Found ${skus.length} SKUs`);

    if (skus.length === 0) {
      console.log('No SKUs found. Creating sample SKUs...');
      const sampleSKUs = [
        { sku: 'WIDGET-A', name: 'Standard Widget A', barcode: '0796548106754' },
        { sku: 'WIDGET-B', name: 'Premium Widget B', barcode: '0796548106761' },
        { sku: 'GADGET-X', name: 'Gadget Model X', barcode: '0796548106778' },
        { sku: 'TOOL-001', name: 'Basic Tool Set', barcode: '0796548106792' },
        { sku: 'PART-123', name: 'Replacement Part 123', barcode: '0796548106815' },
      ];

      for (const sku of sampleSKUs) {
        await client.query(
          `INSERT INTO skus (sku, name, description, category, barcode)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (sku) DO NOTHING`,
          [sku.sku, sku.name, `${sku.name} description`, 'General', sku.barcode]
        );
      }
      skus.push(...sampleSKUs);
    }

    // Create orders distributed across the last 90 days
    const ordersConfig = [
      // Recent shipped orders (last 7 days)
      ...Array.from({ length: 20 }, () => ({
        daysAgo: Math.random() * 7,
        status: 'SHIPPED',
        priority: 'NORMAL'
      })),
      // Recently picked/packed orders
      ...Array.from({ length: 10 }, () => ({
        daysAgo: Math.random() * 3,
        status: 'PACKED',
        priority: 'NORMAL'
      })),
      ...Array.from({ length: 8 }, () => ({
        daysAgo: Math.random() * 2,
        status: 'PICKED',
        priority: 'NORMAL'
      })),
      // Currently being processed
      ...Array.from({ length: 10 }, () => ({
        daysAgo: Math.random() * 1,
        status: 'PICKING',
        priority: 'HIGH'
      })),
      ...Array.from({ length: 5 }, () => ({
        daysAgo: Math.random() * 1,
        status: 'PACKING',
        priority: 'NORMAL'
      })),
      // Pending orders in queue
      ...Array.from({ length: 15 }, () => ({
        daysAgo: Math.random() * 0.5,
        status: 'PENDING',
        priority: priorities[Math.floor(Math.random() * priorities.length)]
      })),
      // Historical shipped orders (for monthly/yearly graphs)
      ...Array.from({ length: 50 }, () => ({
        daysAgo: 7 + Math.random() * 83, // 7-90 days ago
        status: 'SHIPPED',
        priority: 'NORMAL'
      })),
      // Some cancelled orders
      ...Array.from({ length: 5 }, () => ({
        daysAgo: Math.random() * 30,
        status: 'CANCELLED',
        priority: 'LOW'
      })),
    ];

    console.log(`Creating ${ordersConfig.length} orders...`);

    for (const config of ordersConfig) {
      const orderId = generateOrderId();
      const customer = customers[Math.floor(Math.random() * customers.length)];
      const createdAt = getRandomDate(config.daysAgo);
      const status = config.status;
      const priority = config.priority;

      let pickerId = null;
      let packerId = null;
      let shippedAt = null;
      let progress = 0;

      if (['PICKING', 'PICKED', 'PACKING', 'PACKED', 'SHIPPED'].includes(status)) {
        pickerId = pickers[Math.floor(Math.random() * pickers.length)];
        progress = status === 'PICKING' ? 50 : 100;
      }

      if (['PACKING', 'PACKED', 'SHIPPED'].includes(status)) {
        packerId = packers[Math.floor(Math.random() * packers.length)];
        progress = status === 'PACKING' ? 75 : 100;
      }

      if (status === 'SHIPPED') {
        shippedAt = addHours(createdAt, 24 + Math.random() * 48);
        progress = 100;
      }

      await client.query(
        `INSERT INTO orders (order_id, customer_id, customer_name, priority, status, picker_id, packer_id, shipped_at, created_at, updated_at, progress)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [
          orderId,
          `CUST-${Math.floor(Math.random() * 10000)}`,
          customer,
          priority,
          status,
          pickerId,
          packerId,
          shippedAt,
          createdAt,
          status === 'SHIPPED' ? shippedAt : createdAt,
          progress
        ]
      );

      // Add items to each order
      const itemCount = Math.floor(Math.random() * 4) + 1;
      const usedSKUs = new Set();

      for (let j = 0; j < itemCount; j++) {
        const sku = skus[Math.floor(Math.random() * skus.length)];
        if (usedSKUs.has(sku.sku)) continue;
        usedSKUs.add(sku.sku);

        const quantity = Math.floor(Math.random() * 5) + 1;
        const binLocation = `A-${String(Math.floor(Math.random() * 10) + 1).padStart(2, '0')}-${String(Math.floor(Math.random() * 20) + 1).padStart(2, '0')}`;

        const orderItemId = `OI${orderId.slice(-3)}${Date.now().toString().slice(-6)}${j}`;

        let pickedQuantity = 0;
        let itemStatus = 'PENDING';

        if (status === 'PICKING') {
          pickedQuantity = Math.floor(Math.random() * quantity);
          itemStatus = pickedQuantity > 0 ? 'PARTIAL_PICKED' : 'PENDING';
        } else if (['PICKED', 'PACKING', 'PACKED', 'SHIPPED'].includes(status)) {
          pickedQuantity = quantity;
          itemStatus = 'FULLY_PICKED';
        }

        await client.query(
          `INSERT INTO order_items (order_item_id, order_id, sku, name, quantity, picked_quantity, bin_location, status)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [orderItemId, orderId, sku.sku, sku.name, quantity, pickedQuantity, binLocation, itemStatus]
        );

        // Create pick_tasks for picked orders
        if (pickerId && ['PICKING', 'PICKED', 'PACKING', 'PACKED', 'SHIPPED'].includes(status)) {
          const pickTaskId = `PT-${orderId.slice(-6)}${j}`;
          const startedAt = addHours(createdAt, 1 + Math.random() * 4);

          let taskStatus = 'COMPLETED';
          let completedAt = addHours(startedAt, 0.5 + Math.random() * 2);

          if (status === 'PICKING' && Math.random() > 0.7) {
            taskStatus = 'IN_PROGRESS';
            completedAt = null;
          }

          const actualPickedQuantity = taskStatus === 'COMPLETED' ? quantity : pickedQuantity;

          await client.query(
            `INSERT INTO pick_tasks (pick_task_id, order_id, order_item_id, sku, name, target_bin, quantity, picked_quantity, status, picker_id, started_at, completed_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
            [pickTaskId, orderId, orderItemId, sku.sku, sku.name, binLocation, quantity, actualPickedQuantity, taskStatus, pickerId, startedAt, completedAt]
          );
        }
      }
    }

    console.log('\n=== Seed data created successfully ===');

    // Verify data
    const ordersByStatus = await client.query("SELECT COUNT(*) as count, status FROM orders GROUP BY status ORDER BY status");
    console.log('\n=== Orders by status ===');
    ordersByStatus.rows.forEach(r => console.log(`  ${r.status}: ${r.count}`));

    const totalOrders = await client.query('SELECT COUNT(*) as count FROM orders');
    console.log(`\n=== Total orders: ${totalOrders.rows[0].count} ===`);

    const pickTasks = await client.query('SELECT COUNT(*) as count FROM pick_tasks');
    console.log(`=== Total pick_tasks: ${pickTasks.rows[0].count} ===`);

    const throughput = await client.query(
      `SELECT COUNT(*) FILTER (WHERE status = 'SHIPPED') as shipped
       FROM orders
       WHERE updated_at >= NOW() - INTERVAL '7 days'`
    );
    console.log(`=== Shipped in last 7 days: ${throughput.rows[0].shipped} ===`);

  } finally {
    client.release();
    await pool.end();
  }
}

seedData().catch(console.error);
