/**
 * Run simple accounting tables migration
 * Creates minimal tables needed for accounting functionality
 */

import { query, closePool } from './client';

async function runMigration() {
  await query('BEGIN');
  try {
    console.log('Running simple accounting tables migration...');

    // 1. Add pricing columns to SKUs
    await query(`
      ALTER TABLE skus ADD COLUMN IF NOT EXISTS unit_cost DECIMAL(10, 2) DEFAULT 0.00;
      ALTER TABLE skus ADD COLUMN IF NOT EXISTS selling_price DECIMAL(10, 2) DEFAULT 0.00;
      ALTER TABLE skus ADD COLUMN IF NOT EXISTS valuation_method VARCHAR(20) DEFAULT 'FIFO';
    `);
    console.log('✓ Added pricing columns to skus');

    // 2. Add unit_cost to inventory_units
    await query(`
      ALTER TABLE inventory_units ADD COLUMN IF NOT EXISTS unit_cost DECIMAL(10, 2) DEFAULT 0.00;
    `);
    console.log('✓ Added unit_cost to inventory_units');

    // 3. Add total_amount to orders
    await query(`
      ALTER TABLE orders ADD COLUMN IF NOT EXISTS total_amount DECIMAL(12, 2) DEFAULT 0.00;
      ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_cost DECIMAL(10, 2) DEFAULT 0.00;
    `);
    console.log('✓ Added amount columns to orders');

    // 4. Create financial_transaction_type enum
    await query(`
      DO $$ BEGIN
        CREATE TYPE financial_transaction_type AS ENUM (
          'REVENUE', 'EXPENSE', 'PAYMENT', 'REFUND', 'ADJUSTMENT', 'TRANSFER'
        );
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);
    console.log('✓ Created financial_transaction_type enum');

    // 5. Create financial_transactions table
    await query(`
      CREATE TABLE IF NOT EXISTS financial_transactions (
        transaction_id VARCHAR(255) PRIMARY KEY,
        transaction_type financial_transaction_type NOT NULL,
        amount DECIMAL(12, 2) NOT NULL,
        currency VARCHAR(3) DEFAULT 'USD',
        reference_type VARCHAR(50) NOT NULL,
        reference_id VARCHAR(255),
        description TEXT NOT NULL,
        customer_id VARCHAR(100),
        vendor_id VARCHAR(100),
        account VARCHAR(50) NOT NULL,
        status VARCHAR(50) DEFAULT 'PENDING',
        created_by VARCHAR(20),
        notes TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_financial_txns_type ON financial_transactions(transaction_type);
      CREATE INDEX IF NOT EXISTS idx_financial_txns_account ON financial_transactions(account);
      CREATE INDEX IF NOT EXISTS idx_financial_txns_status ON financial_transactions(status);
    `);
    console.log('✓ Created financial_transactions table');

    // 6. Create accounting_suppliers table (to avoid conflict)
    await query(`
      DROP TABLE IF EXISTS accounting_suppliers CASCADE;
      CREATE TABLE accounting_suppliers (
        supplier_id VARCHAR(100) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        contact_person VARCHAR(255),
        email VARCHAR(255),
        phone VARCHAR(50),
        payment_terms VARCHAR(50) DEFAULT 'NET_30',
        active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);
    console.log('✓ Created accounting_suppliers table');

    // 7. Create accounting_customers table (to avoid conflict)
    await query(`
      DROP TABLE IF EXISTS accounting_customers CASCADE;
      CREATE TABLE accounting_customers (
        customer_id VARCHAR(100) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255),
        phone VARCHAR(50),
        city VARCHAR(100),
        state VARCHAR(100),
        credit_limit DECIMAL(12, 2) DEFAULT 0.00,
        active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);
    console.log('✓ Created accounting_customers table');

    // 8. Create accounts_receivable table
    await query(`
      DROP TABLE IF EXISTS accounts_receivable CASCADE;
      CREATE TABLE accounts_receivable (
        receivable_id VARCHAR(255) PRIMARY KEY,
        customer_id VARCHAR(100) NOT NULL,
        customer_name VARCHAR(255) NOT NULL,
        invoice_number VARCHAR(100) UNIQUE NOT NULL,
        invoice_date DATE NOT NULL,
        due_date DATE NOT NULL,
        amount DECIMAL(12, 2) NOT NULL,
        balance DECIMAL(12, 2) NOT NULL,
        status VARCHAR(50) DEFAULT 'OPEN',
        order_id VARCHAR(30),
        notes TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );

      CREATE INDEX idx_ar_customer ON accounts_receivable(customer_id);
      CREATE INDEX idx_ar_status ON accounts_receivable(status);
      CREATE INDEX idx_ar_due_date ON accounts_receivable(due_date);
    `);
    console.log('✓ Created accounts_receivable table');

    // 9. Create accounts_payable table
    await query(`
      DROP TABLE IF EXISTS accounts_payable CASCADE;
      CREATE TABLE accounts_payable (
        payable_id VARCHAR(255) PRIMARY KEY,
        vendor_id VARCHAR(100) NOT NULL,
        vendor_name VARCHAR(255) NOT NULL,
        invoice_number VARCHAR(100) UNIQUE NOT NULL,
        invoice_date DATE NOT NULL,
        due_date DATE NOT NULL,
        amount DECIMAL(12, 2) NOT NULL,
        balance DECIMAL(12, 2) NOT NULL,
        status VARCHAR(50) DEFAULT 'OPEN',
        notes TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );

      CREATE INDEX idx_ap_vendor ON accounts_payable(vendor_id);
      CREATE INDEX idx_ap_status ON accounts_payable(status);
      CREATE INDEX idx_ap_due_date ON accounts_payable(due_date);
    `);
    console.log('✓ Created accounts_payable table');

    // 10. Insert sample data
    await query(`
      INSERT INTO accounting_suppliers (supplier_id, name, contact_person, email, phone, payment_terms) VALUES
        ('SUP-001', 'Acme Corp', 'John Smith', 'john@acme.com', '555-0100', 'NET_30'),
        ('SUP-002', 'Global Imports Inc', 'Jane Doe', 'jane@globalimports.com', '555-0200', 'NET_45'),
        ('SUP-003', 'Pacific Supplies', 'Bob Johnson', 'bob@pacific.com', '555-0300', 'NET_15')
      ON CONFLICT (supplier_id) DO NOTHING;
    `);
    console.log('✓ Inserted sample suppliers');

    await query(`
      INSERT INTO accounting_customers (customer_id, name, email, phone, city, state, credit_limit) VALUES
        ('CUST-001', 'Tech Retailers LLC', 'orders@techretailers.com', '555-1000', 'San Francisco', 'CA', 50000.00),
        ('CUST-002', 'Global Electronics', 'purchasing@globalelec.com', '555-2000', 'New York', 'NY', 100000.00),
        ('CUST-003', 'QuickMart Stores', 'merchandise@quickmart.com', '555-3000', 'Chicago', 'IL', 25000.00)
      ON CONFLICT (customer_id) DO NOTHING;
    `);
    console.log('✓ Inserted sample customers');

    // Update SKUs with pricing
    await query(`
      INSERT INTO skus (sku, name, description, category, unit_cost, selling_price) VALUES
        ('SKU10001', 'Wireless Mouse', 'Ergonomic wireless mouse', 'Electronics', 15.00, 29.99),
        ('SKU10002', 'Mechanical Keyboard', 'RGB mechanical keyboard', 'Electronics', 45.00, 89.99),
        ('SKU10003', 'Office Chair', 'Ergonomic office chair', 'Furniture', 120.00, 249.99),
        ('SKU10004', 'Desk Lamp LED', 'Adjustable LED desk lamp', 'Office Supplies', 18.00, 34.99),
        ('SKU10005', 'Notebook A5', 'Lined notebook A5', 'Office Supplies', 2.50, 5.99)
      ON CONFLICT (sku) DO UPDATE SET
        unit_cost = COALESCE(EXCLUDED.unit_cost, skus.unit_cost),
        selling_price = COALESCE(EXCLUDED.selling_price, skus.selling_price);
    `);
    console.log('✓ Inserted sample SKUs with pricing');

    // Insert sample financial transactions
    await query(`
      INSERT INTO financial_transactions (transaction_id, transaction_type, amount, reference_type, reference_id, description, account, status) VALUES
        ('TXN-001', 'REVENUE', 1250.00, 'ORDER', 'ORD-001', 'Order ORD-001 - Shipment', 'RECEIVABLES', 'POSTED'),
        ('TXN-002', 'EXPENSE', 450.00, 'RECEIPT', 'RCP-001', 'Inventory - SKU10001', 'PAYABLES', 'POSTED'),
        ('TXN-003', 'PAYMENT', 2800.00, 'GENERAL', 'PAY-001', 'Vendor Payment - Acme Corp', 'PAYABLES', 'CLEARED'),
        ('TXN-004', 'REVENUE', 3200.00, 'ORDER', 'ORD-002', 'Order ORD-002 - Shipment', 'RECEIVABLES', 'POSTED'),
        ('TXN-005', 'REVENUE', 450.00, 'ORDER', 'ORD-003', 'Order ORD-003 - Shipment', 'RECEIVABLES', 'POSTED'),
        ('TXN-006', 'EXPENSE', 2800.00, 'RECEIPT', 'RCP-002', 'Inventory - SKU10002', 'PAYABLES', 'POSTED'),
        ('TXN-007', 'EXPENSE', 6000.00, 'RECEIPT', 'RCP-003', 'Inventory - SKU10003', 'PAYABLES', 'POSTED')
      ON CONFLICT (transaction_id) DO NOTHING;
    `);
    console.log('✓ Inserted sample financial transactions');

    // Insert sample accounts receivable
    await query(`
      INSERT INTO accounts_receivable (receivable_id, customer_id, customer_name, invoice_number, invoice_date, due_date, amount, balance, status, order_id) VALUES
        ('AR-001', 'CUST-001', 'Tech Retailers LLC', 'INV-2024-001', '2024-01-10', '2024-02-10', 1250.00, 1250.00, 'OPEN', 'ORD-001'),
        ('AR-002', 'CUST-002', 'Global Electronics', 'INV-2024-002', '2024-01-15', '2024-03-01', 3200.00, 3200.00, 'OPEN', 'ORD-002'),
        ('AR-003', 'CUST-003', 'QuickMart Stores', 'INV-2024-003', '2024-01-20', '2024-02-05', 450.00, 450.00, 'OPEN', 'ORD-003')
      ON CONFLICT (invoice_number) DO NOTHING;
    `);
    console.log('✓ Inserted sample accounts receivable');

    // Insert sample accounts payable
    await query(`
      INSERT INTO accounts_payable (payable_id, vendor_id, vendor_name, invoice_number, invoice_date, due_date, amount, balance, status) VALUES
        ('AP-001', 'SUP-001', 'Acme Corp', 'VENDOR-INV-001', '2024-01-15', '2024-02-15', 7500.00, 7500.00, 'OPEN'),
        ('AP-002', 'SUP-002', 'Global Imports Inc', 'VENDOR-INV-002', '2024-01-20', '2024-03-05', 9000.00, 9000.00, 'OPEN'),
        ('AP-003', 'SUP-003', 'Pacific Supplies', 'VENDOR-INV-003', '2024-01-25', '2024-02-10', 6000.00, 6000.00, 'OPEN')
      ON CONFLICT (invoice_number) DO NOTHING;
    `);
    console.log('✓ Inserted sample accounts payable');

    // Update some orders with amounts
    await query(`
      UPDATE orders SET total_amount = 1250.00 WHERE order_id = 'ORD-001' AND (total_amount IS NULL OR total_amount = 0);
      UPDATE orders SET total_amount = 3200.00 WHERE order_id = 'ORD-002' AND (total_amount IS NULL OR total_amount = 0);
      UPDATE orders SET total_amount = 450.00 WHERE order_id = 'ORD-003' AND (total_amount IS NULL OR total_amount = 0);
    `);
    console.log('✓ Updated orders with amounts');

    // Update inventory_units with unit costs
    await query(`
      UPDATE inventory_units SET unit_cost = 15.00 WHERE sku = 'SKU10001' AND (unit_cost IS NULL OR unit_cost = 0);
      UPDATE inventory_units SET unit_cost = 45.00 WHERE sku = 'SKU10002' AND (unit_cost IS NULL OR unit_cost = 0);
      UPDATE inventory_units SET unit_cost = 120.00 WHERE sku = 'SKU10003' AND (unit_cost IS NULL OR unit_cost = 0);
      UPDATE inventory_units SET unit_cost = 18.00 WHERE sku = 'SKU10004' AND (unit_cost IS NULL OR unit_cost = 0);
      UPDATE inventory_units SET unit_cost = 2.50 WHERE sku = 'SKU10005' AND (unit_cost IS NULL OR unit_cost = 0);
    `);
    console.log('✓ Updated inventory_units with unit costs');

    await query('COMMIT');
    console.log('\n✅ Simple accounting tables migration completed successfully!');

    await closePool();
    process.exit(0);
  } catch (error) {
    await query('ROLLBACK');
    console.error('Migration failed:', error);
    await closePool();
    process.exit(1);
  }
}

runMigration();
