const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'wms_db',
  user: 'wms_user',
  password: 'wms_password'
});

(async () => {
  console.log('Seeding comprehensive mock data...');

  // 1. Create more SKUs (20 total)
  const skus = [
    ['SKU-001', 'Wireless Mouse', 'Electronics'],
    ['SKU-002', 'Mechanical Keyboard', 'Electronics'],
    ['SKU-003', 'USB-C Hub', 'Electronics'],
    ['SKU-004', 'Webcam HD', 'Electronics'],
    ['SKU-005', 'Monitor Stand', 'Accessories'],
    ['SKU-006', 'Laptop Sleeve', 'Accessories'],
    ['SKU-007', 'Desk Lamp LED', 'Office'],
    ['SKU-008', 'Office Chair', 'Furniture'],
    ['SKU-009', 'File Cabinet', 'Furniture'],
    ['SKU-010', 'Whiteboard', 'Office'],
    ['SKU-011', 'Notebook A5', 'Stationery'],
    ['SKU-012', 'Pen Set', 'Stationery'],
    ['SKU-013', 'Stapler', 'Stationery'],
    ['SKU-014', 'Paper Clips', 'Stationery'],
    ['SKU-015', 'Highlighters', 'Stationery'],
    ['SKU-016', 'Desk Organizer', 'Accessories'],
    ['SKU-017', 'Cable Management', 'Accessories'],
    ['SKU-018', 'Power Strip', 'Electronics'],
    ['SKU-019', 'HDMI Cable 2m', 'Cables'],
    ['SKU-020', 'Ethernet Cable 5m', 'Cables']
  ];

  for (const [sku, name, category] of skus) {
    await pool.query(
      'INSERT INTO skus (sku, name, category, active) VALUES ($1, $2, $3, true) ON CONFLICT (sku) DO NOTHING',
      [sku, name, category]
    );
  }
  console.log('Created', skus.length, 'SKUs');

  // 2. Create bin locations (17 total across zones A-D)
  const bins = [
    ['A-01-01', 'A', '01', '01'],
    ['A-01-02', 'A', '01', '02'],
    ['A-02-01', 'A', '02', '01'],
    ['A-02-02', 'A', '02', '02'],
    ['A-03-01', 'A', '03', '01'],
    ['B-01-01', 'B', '01', '01'],
    ['B-01-02', 'B', '01', '02'],
    ['B-02-01', 'B', '02', '01'],
    ['B-02-02', 'B', '02', '02'],
    ['B-03-01', 'B', '03', '01'],
    ['C-01-01', 'C', '01', '01'],
    ['C-01-02', 'C', '01', '02'],
    ['C-02-01', 'C', '02', '01'],
    ['D-01-01', 'D', '01', '01'],
    ['D-01-02', 'D', '01', '02'],
    ['D-02-01', 'D', '02', '01'],
    ['D-02-02', 'D', '02', '02']
  ];

  for (const [binId, zone, aisle, shelf] of bins) {
    await pool.query(
      'INSERT INTO bin_locations (bin_id, zone, aisle, shelf, type, active) VALUES ($1, $2, $3, $4, $5, true) ON CONFLICT (bin_id) DO NOTHING',
      [binId, zone, aisle, shelf, 'SHELF']
    );
  }
  console.log('Created', bins.length, 'bin locations');

  // 3. Create inventory units
  const inventory = [
    ['A-01-01', 'SKU-001', 100],
    ['A-01-01', 'SKU-002', 50],
    ['A-01-02', 'SKU-003', 75],
    ['A-01-02', 'SKU-004', 60],
    ['A-02-01', 'SKU-005', 40],
    ['A-02-01', 'SKU-006', 80],
    ['A-02-02', 'SKU-007', 120],
    ['A-02-02', 'SKU-008', 30],
    ['A-03-01', 'SKU-009', 25],
    ['A-03-01', 'SKU-010', 55],
    ['B-01-01', 'SKU-011', 200],
    ['B-01-01', 'SKU-012', 150],
    ['B-01-02', 'SKU-013', 180],
    ['B-01-02', 'SKU-014', 250],
    ['B-02-01', 'SKU-015', 90],
    ['B-02-01', 'SKU-016', 70],
    ['B-02-02', 'SKU-017', 45],
    ['B-02-02', 'SKU-018', 65],
    ['B-03-01', 'SKU-019', 110],
    ['B-03-01', 'SKU-020', 95],
    ['C-01-01', 'SKU-001', 50],
    ['C-01-02', 'SKU-002', 40]
  ];

  let invCount = 0;
  for (const [bin, sku, qty] of inventory) {
    const unitId = `IU-${String(invCount + 1).padStart(3, '0')}-${sku}`;
    await pool.query(
      'INSERT INTO inventory_units (unit_id, sku, bin_location, quantity, reserved) VALUES ($1, $2, $3, $4, 0) ON CONFLICT (unit_id) DO NOTHING',
      [unitId, sku, bin, qty]
    );
    invCount++;
  }
  console.log('Created', invCount, 'inventory units');

  // 4. Create example orders
  const orders = [
    ['ORD-2025-001', 'CUST-001', 'John Smith', 'PENDING', 'NORMAL', '2025-01-15'],
    ['ORD-2025-002', 'CUST-002', 'Jane Doe', 'PICKING', 'HIGH', '2025-01-16'],
    ['ORD-2025-003', 'CUST-003', 'Bob Johnson', 'PICKED', 'NORMAL', '2025-01-16'],
    ['ORD-2025-004', 'CUST-004', 'Alice Williams', 'SHIPPED', 'NORMAL', '2025-01-14'],
    ['ORD-2025-005', 'CUST-005', 'Charlie Brown', 'SHIPPED', 'NORMAL', '2025-01-10'],
    ['ORD-2025-006', 'CUST-006', 'Diana Ross', 'PENDING', 'LOW', '2025-01-17'],
    ['ORD-2025-007', 'CUST-007', 'Edward King', 'PICKING', 'HIGH', '2025-01-17'],
    ['ORD-2025-008', 'CUST-008', 'Fiona Green', 'PICKED', 'NORMAL', '2025-01-15'],
    ['ORD-2025-009', 'CUST-009', 'George Hall', 'CANCELLED', 'LOW', '2025-01-12'],
    ['ORD-2025-010', 'CUST-010', 'Hannah White', 'PENDING', 'NORMAL', '2025-01-18'],
    ['ORD-2025-011', 'CUST-011', 'Ian Black', 'PICKING', 'HIGH', '2025-01-18'],
    ['ORD-2025-012', 'CUST-012', 'Julia Gray', 'SHIPPED', 'NORMAL', '2025-01-16'],
    ['ORD-2025-013', 'CUST-013', 'Kevin Blue', 'SHIPPED', 'NORMAL', '2025-01-13'],
    ['ORD-2025-014', 'CUST-014', 'Laura Red', 'PENDING', 'LOW', '2025-01-19'],
    ['ORD-2025-015', 'CUST-015', 'Mike Gold', 'PICKED', 'HIGH', '2025-01-17']
  ];

  for (const [orderId, custId, customer, status, priority, created] of orders) {
    await pool.query(
      `INSERT INTO orders (order_id, customer_id, customer_name, status, priority, created_at)
      VALUES ($1, $2, $3, $4::order_status, $5::order_priority, $6::timestamp)
      ON CONFLICT (order_id) DO NOTHING`,
      [orderId, custId, customer, status, priority, created]
    );
  }
  console.log('Created', orders.length, 'orders');

  // 5. Create order items
  const skuNames = {
    'SKU-001': 'Wireless Mouse',
    'SKU-002': 'Mechanical Keyboard',
    'SKU-003': 'USB-C Hub',
    'SKU-004': 'Webcam HD',
    'SKU-005': 'Monitor Stand',
    'SKU-006': 'Laptop Sleeve',
    'SKU-007': 'Desk Lamp LED',
    'SKU-008': 'Office Chair',
    'SKU-009': 'File Cabinet',
    'SKU-010': 'Whiteboard',
    'SKU-011': 'Notebook A5',
    'SKU-012': 'Pen Set',
    'SKU-013': 'Stapler',
    'SKU-014': 'Paper Clips',
    'SKU-015': 'Highlighters',
    'SKU-016': 'Desk Organizer',
    'SKU-017': 'Cable Management',
    'SKU-018': 'Power Strip',
    'SKU-019': 'HDMI Cable 2m',
    'SKU-020': 'Ethernet Cable 5m'
  };

  const skuBins = {
    'SKU-001': 'A-01-01',
    'SKU-002': 'A-01-01',
    'SKU-003': 'A-01-02',
    'SKU-004': 'A-01-02',
    'SKU-005': 'A-02-01',
    'SKU-006': 'A-02-01',
    'SKU-007': 'A-02-02',
    'SKU-008': 'A-02-02',
    'SKU-009': 'A-03-01',
    'SKU-010': 'A-03-01',
    'SKU-011': 'B-01-01',
    'SKU-012': 'B-01-01',
    'SKU-013': 'B-01-02',
    'SKU-014': 'B-01-02',
    'SKU-015': 'B-02-01',
    'SKU-016': 'B-02-01',
    'SKU-017': 'B-02-02',
    'SKU-018': 'B-02-02',
    'SKU-019': 'B-03-01',
    'SKU-020': 'B-03-01'
  };

  const orderItems = [
    ['ORD-2025-001', 'SKU-001', 2],
    ['ORD-2025-001', 'SKU-005', 1],
    ['ORD-2025-002', 'SKU-002', 1],
    ['ORD-2025-002', 'SKU-003', 2],
    ['ORD-2025-002', 'SKU-007', 1],
    ['ORD-2025-003', 'SKU-004', 1],
    ['ORD-2025-003', 'SKU-006', 3],
    ['ORD-2025-004', 'SKU-008', 1],
    ['ORD-2025-004', 'SKU-009', 2],
    ['ORD-2025-005', 'SKU-010', 1],
    ['ORD-2025-005', 'SKU-011', 5],
    ['ORD-2025-006', 'SKU-012', 2],
    ['ORD-2025-006', 'SKU-013', 1],
    ['ORD-2025-007', 'SKU-014', 3],
    ['ORD-2025-007', 'SKU-015', 2],
    ['ORD-2025-007', 'SKU-016', 1],
    ['ORD-2025-008', 'SKU-017', 2],
    ['ORD-2025-008', 'SKU-018', 1],
    ['ORD-2025-010', 'SKU-019', 2],
    ['ORD-2025-010', 'SKU-020', 1],
    ['ORD-2025-011', 'SKU-001', 3],
    ['ORD-2025-011', 'SKU-002', 1],
    ['ORD-2025-011', 'SKU-004', 2],
    ['ORD-2025-012', 'SKU-005', 1],
    ['ORD-2025-012', 'SKU-006', 2],
    ['ORD-2025-013', 'SKU-003', 1],
    ['ORD-2025-013', 'SKU-007', 4],
    ['ORD-2025-014', 'SKU-008', 2],
    ['ORD-2025-014', 'SKU-009', 1],
    ['ORD-2025-015', 'SKU-010', 3]
  ];

  let itemCount = 0;
  for (const [orderId, sku, qty] of orderItems) {
    const itemId = `OI-${String(itemCount + 1).padStart(3, '0')}`;
    await pool.query(
      'INSERT INTO order_items (order_item_id, order_id, sku, name, quantity, bin_location, status) VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT DO NOTHING',
      [itemId, orderId, sku, skuNames[sku], qty, skuBins[sku], 'PENDING']
    );
    itemCount++;
  }
  console.log('Created', itemCount, 'order items');

  // 6. Create picker users (before pick tasks for foreign key constraint)
  const bcrypt = require('bcrypt');
  const pickerHash = await bcrypt.hash('password123', 10);

  const pickers = [
    ['PICKER-001', 'James Wilson', 'picker1@wms.local'],
    ['PICKER-002', 'Mary Chen', 'picker2@wms.local'],
    ['PICKER-003', 'Tom Davis', 'picker3@wms.local']
  ];

  for (const [userId, name, email] of pickers) {
    await pool.query(
      'INSERT INTO users (user_id, name, email, password_hash, role, active) VALUES ($1, $2, $3, $4, $5, true) ON CONFLICT (user_id) DO NOTHING',
      [userId, name, email, pickerHash, 'PICKER']
    );
  }
  console.log('Created', pickers.length, 'picker users');

  // 7. Create pick tasks
  const pickTasks = [
    ['PT-001', 'ORD-2025-002', 'OI-002', 'SKU-002', 1, 'A-01-01', 'PICKER-001', 'IN_PROGRESS'],
    ['PT-002', 'ORD-2025-002', 'OI-003', 'SKU-003', 2, 'A-01-02', 'PICKER-001', 'PENDING'],
    ['PT-003', 'ORD-2025-002', 'OI-004', 'SKU-007', 1, 'A-02-02', 'PICKER-002', 'PENDING'],
    ['PT-004', 'ORD-2025-007', 'OI-012', 'SKU-014', 3, 'B-01-02', 'PICKER-002', 'COMPLETED'],
    ['PT-005', 'ORD-2025-007', 'OI-013', 'SKU-015', 2, 'B-02-01', 'PICKER-001', 'IN_PROGRESS'],
    ['PT-006', 'ORD-2025-011', 'OI-025', 'SKU-001', 3, 'A-01-01', 'PICKER-003', 'PENDING'],
    ['PT-007', 'ORD-2025-011', 'OI-026', 'SKU-002', 1, 'A-01-01', 'PICKER-003', 'PENDING'],
    ['PT-008', 'ORD-2025-011', 'OI-027', 'SKU-004', 2, 'A-01-02', 'PICKER-003', 'PENDING']
  ];

  for (const [taskId, orderId, orderItemId, sku, qty, bin, picker, status] of pickTasks) {
    await pool.query(
      `INSERT INTO pick_tasks (pick_task_id, order_id, order_item_id, sku, name, target_bin, quantity, picker_id, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::task_status) ON CONFLICT (pick_task_id) DO NOTHING`,
      [taskId, orderId, orderItemId, sku, skuNames[sku], bin, qty, picker, status]
    );
  }
  console.log('Created', pickTasks.length, 'pick tasks');

  // 8. Create inventory transactions
  const transactions = [
    ['SKU-001', 'A-01-01', 'RECEIPT', 100, 'Initial stock'],
    ['SKU-002', 'A-01-01', 'RECEIPT', 50, 'Initial stock'],
    ['SKU-003', 'A-01-02', 'RECEIPT', 75, 'Initial stock'],
    ['SKU-005', 'A-02-01', 'RECEIPT', 40, 'Initial stock'],
    ['SKU-014', 'B-01-02', 'RECEIPT', 250, 'Initial stock']
  ];

  let txnCount = 0;
  for (const [sku, bin, type, qty, notes] of transactions) {
    const txnId = `TXN-${String(txnCount + 1).padStart(6, '0')}`;
    await pool.query(
      `INSERT INTO inventory_transactions (transaction_id, type, sku, quantity, reason, bin_location) VALUES ($1, $2::transaction_type, $3, $4, $5, $6)`,
      [txnId, type, sku, qty, notes, bin]
    );
    txnCount++;
  }
  console.log('Created', txnCount, 'inventory transactions');

  await pool.end();
  console.log('\n✅ Mock data seeding complete!');
  console.log('   - 20 SKUs across 5 categories');
  console.log('   - 17 bin locations across zones A-D');
  console.log('   - 23 inventory units');
  console.log('   - 15 orders with various statuses');
  console.log('   - 32 order items');
  console.log('   - 8 pick tasks');
  console.log('   - 3 picker users (password: password123)');
})();
