import { getPool, closePool } from './src/db/client.ts';

async function seedProductionData() {
  const pool = getPool();
  const client = await pool.connect();

  try {
    console.log('Seeding production data...');

    // First, ensure we have some SKUs to reference
    const productSkuResult = await client.query(
      `SELECT sku FROM skus WHERE sku LIKE 'PROD-%' LIMIT 1`
    );
    const materialSkuResult = await client.query(
      `SELECT sku FROM skus WHERE sku LIKE 'MAT-%' LIMIT 1`
    );

    if (productSkuResult.rows.length === 0) {
      console.log('Creating sample product SKUs...');
      await client.query(`
        INSERT INTO skus (sku, name, description, category) VALUES
        ('PROD-001', 'Premium Widget A', 'High-quality widget for industrial use', 'Widgets'),
        ('PROD-002', 'Standard Gadget B', 'Standard gadget for everyday use', 'Gadgets'),
        ('PROD-003', 'Advanced Device C', 'Advanced device with premium features', 'Devices')
        ON CONFLICT (sku) DO NOTHING
      `);
      console.log('✅ Created sample product SKUs');
    }

    if (materialSkuResult.rows.length === 0) {
      console.log('Creating sample material SKUs...');
      await client.query(`
        INSERT INTO skus (sku, name, description, category) VALUES
        ('MAT-001', 'Steel Sheet', 'Raw steel sheet material', 'Raw Materials'),
        ('MAT-002', 'Aluminum Rod', 'Raw aluminum rod', 'Raw Materials'),
        ('MAT-003', 'Plastic Granules', 'Raw plastic material', 'Raw Materials'),
        ('MAT-004', 'Copper Wire', 'Copper wire for electronics', 'Raw Materials'),
        ('MAT-005', 'PVC Casing', 'PVC casing material', 'Components'),
        ('MAT-006', 'Screws', 'Assorted screws', 'Components'),
        ('MAT-007', 'Circuit Board', 'PCB for electronics', 'Components'),
        ('MAT-008', 'Battery Pack', 'Rechargeable battery pack', 'Components'),
        ('MAT-009', 'Display Panel', 'LCD display panel', 'Components')
        ON CONFLICT (sku) DO NOTHING
      `);
      console.log('✅ Created sample material SKUs');
    }

    const today = new Date();
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
    const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
    const dayAfter = new Date(today.getTime() + 2 * 24 * 60 * 60 * 1000);
    const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);

    // Create BOMs
    console.log('Creating Bills of Materials...');
    await client.query(`
      INSERT INTO bill_of_materials (bom_id, name, description, product_id, version, status, total_quantity, unit_of_measure, created_by, created_at) VALUES
        (
          'BOM-001',
          'Widget A - BOM',
          'Bill of materials for Premium Widget A',
          'PROD-001',
          '1.0',
          'ACTIVE',
          100,
          'PCS',
          'USR-ADMIN01',
          NOW()
        ),
        (
          'BOM-002',
          'Gadget B - BOM',
          'Bill of materials for Standard Gadget B',
          'PROD-002',
          '1.0',
          'ACTIVE',
          100,
          'PCS',
          'USR-ADMIN01',
          NOW()
        ),
        (
          'BOM-003',
          'Device C - BOM',
          'Bill of materials for Advanced Device C',
          'PROD-003',
          '2.0',
          'ACTIVE',
          50,
          'PCS',
          'USR-ADMIN01',
          NOW()
        )
      ON CONFLICT (bom_id) DO NOTHING
    `);
    console.log('✅ Created Bills of Materials');

    // Create BOM Components
    console.log('Creating BOM Components...');
    await client.query(`
      INSERT INTO bom_components (component_id, bom_id, sku, quantity, unit_of_measure, notes) VALUES
        ('BC-001', 'BOM-001', 'MAT-001', 5.0, 'KG', 'Steel Sheet for Widget A'),
        ('BC-002', 'BOM-001', 'MAT-002', 2.0, 'M', 'Aluminum Rod for Widget A'),
        ('BC-003', 'BOM-001', 'MAT-003', 3.0, 'KG', 'Plastic Granules for Widget A'),
        ('BC-004', 'BOM-002', 'MAT-004', 10.0, 'M', 'Copper Wire for Gadget B'),
        ('BC-005', 'BOM-002', 'MAT-005', 1.0, 'PCS', 'PVC Casing for Gadget B'),
        ('BC-006', 'BOM-002', 'MAT-006', 20.0, 'PCS', 'Screws for Gadget B'),
        ('BC-007', 'BOM-003', 'MAT-007', 2.0, 'PCS', 'Circuit Board for Device C'),
        ('BC-008', 'BOM-003', 'MAT-008', 1.0, 'PCS', 'Battery Pack for Device C'),
        ('BC-009', 'BOM-003', 'MAT-009', 1.0, 'PCS', 'Display Panel for Device C')
      ON CONFLICT (component_id) DO NOTHING
    `);
    console.log('✅ Created BOM Components');

    // Create Production Orders
    console.log('Creating Production Orders...');

    // Helper function to format date for PostgreSQL
    const formatDate = (date: Date) => date.toISOString();

    await client.query(
      `
      INSERT INTO production_orders (
        order_id, order_number, product_id, product_name, bom_id, status,
        priority, quantity_to_produce, quantity_completed, unit_of_measure,
        scheduled_start_date, scheduled_end_date,
        actual_start_date, actual_end_date,
        work_center, assigned_to, notes, created_by, created_at
      ) VALUES
        (
          'PO-2025-001',
          'PO-2025-001',
          'PROD-001',
          'Premium Widget A',
          'BOM-001',
          'DRAFT',
          'MEDIUM',
          500,
          0,
          'PCS',
          $1,
          $2,
          NULL,
          NULL,
          'WC-001',
          'USR-ADMIN01',
          'Initial production run for Widget A',
          'USR-ADMIN01',
          NOW()
        ),
        (
          'PO-2025-002',
          'PO-2025-002',
          'PROD-002',
          'Standard Gadget B',
          'BOM-002',
          'PLANNED',
          'HIGH',
          1000,
          0,
          'PCS',
          NOW(),
          NOW() + interval '24 hours',
          NULL,
          NULL,
          'WC-002',
          'USR-ADMIN01',
          'High priority rush order for customer',
          'USR-ADMIN01',
          NOW()
        ),
        (
          'PO-2025-003',
          'PO-2025-003',
          'PROD-003',
          'Advanced Device C',
          'BOM-003',
          'IN_PROGRESS',
          'HIGH',
          200,
          50,
          'PCS',
          NOW() - interval '1 day',
          NOW(),
          NOW() - interval '1 day',
          NULL,
          'WC-003',
          'USR-ADMIN01',
          'Already in production, due today',
          'USR-ADMIN01',
          NOW() - interval '1 day'
        ),
        (
          'PO-2025-004',
          'PO-2025-004',
          'PROD-001',
          'Premium Widget A',
          'BOM-001',
          'RELEASED',
          'MEDIUM',
          300,
          0,
          'PCS',
          NOW(),
          NOW() + interval '2 days',
          NULL,
          NULL,
          'WC-001',
          'USR-ADMIN01',
          'Standard production run',
          'USR-ADMIN01',
          NOW() - interval '2 hours'
        ),
        (
          'PO-2025-005',
          'PO-2025-005',
          'PROD-002',
          'Standard Gadget B',
          'BOM-002',
          'ON_HOLD',
          'LOW',
          1500,
          0,
          'PCS',
          NOW() + interval '2 days',
          NOW() + interval '7 days',
          NULL,
          NULL,
          'WC-002',
          'USR-ADMIN01',
          'On hold pending materials',
          'USR-ADMIN01',
          NOW() - interval '1 day'
        ),
        (
          'PO-2025-006',
          'PO-2025-006',
          'PROD-003',
          'Advanced Device C',
          'BOM-003',
          'COMPLETED',
          'MEDIUM',
          100,
          100,
          'PCS',
          NOW() - interval '2 days',
          NOW() - interval '1 day',
          NOW() - interval '3 days',
          NOW() - interval '1 day',
          'WC-003',
          'USR-ADMIN01',
          'Completed successfully',
          'USR-ADMIN01',
          NOW() - interval '3 days'
        ),
        (
          'PO-2025-007',
          'PO-2025-007',
          'PROD-001',
          'Premium Widget A',
          'BOM-001',
          'PLANNED',
          'HIGH',
          750,
          0,
          'PCS',
          NOW() + interval '7 days',
          NOW() + interval '10 days',
          NULL,
          NULL,
          'WC-001',
          'USR-ADMIN01',
          'Large batch order for next week',
          'USR-ADMIN01',
          NOW()
        ),
        (
          'PO-2025-008',
          'PO-2025-008',
          'PROD-002',
          'Standard Gadget B',
          'BOM-002',
          'DRAFT',
          'MEDIUM',
          500,
          0,
          'PCS',
          NOW() + interval '7 days',
          NOW() + interval '10 days',
          NULL,
          NULL,
          'WC-002',
          'USR-ADMIN01',
          'Draft order for planning',
          'USR-ADMIN01',
          NOW()
        )
      ON CONFLICT (order_id) DO NOTHING
    `,
      [tomorrow, dayAfter]
    );
    console.log('✅ Created Production Orders');

    // Verify the data
    const orders = await client.query('SELECT COUNT(*) as count FROM production_orders');
    const boms = await client.query('SELECT COUNT(*) as count FROM bill_of_materials');
    const bomComponents = await client.query('SELECT COUNT(*) as count FROM bom_components');

    console.log('\n✅ Production data seeded successfully!');
    console.log(`   - Production Orders: ${orders.rows[0].count}`);
    console.log(`   - Bills of Materials: ${boms.rows[0].count}`);
    console.log(`   - BOM Components: ${bomComponents.rows[0].count}`);

    // Show order breakdown by status
    const statusBreakdown = await client.query(`
      SELECT status, COUNT(*) as count
      FROM production_orders
      GROUP BY status
      ORDER BY status
    `);
    console.log('\n   Orders by status:');
    statusBreakdown.rows.forEach((row: any) => {
      console.log(`   - ${row.status}: ${row.count}`);
    });
  } finally {
    await client.release();
    await closePool();
  }
}

seedProductionData()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });
