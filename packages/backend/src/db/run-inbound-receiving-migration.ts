/**
 * Run the inbound receiving migration
 */

import { getPool, closePool } from './client';

async function runMigration() {
  const client = await getPool();
  try {
    console.log('Running inbound receiving migration...');

    // Drop existing tables if they exist (clean migration)
    await client.query(`DROP TABLE IF EXISTS putaway_tasks CASCADE`);
    await client.query(`DROP TABLE IF EXISTS receipt_line_items CASCADE`);
    await client.query(`DROP TABLE IF EXISTS receipts CASCADE`);
    await client.query(`DROP TABLE IF EXISTS asn_line_items CASCADE`);
    await client.query(`DROP TABLE IF EXISTS advance_shipping_notices CASCADE`);
    await client.query(`DROP FUNCTION IF EXISTS update_asn_status CASCADE`);
    await client.query(`DROP FUNCTION IF EXISTS update_receipt_status CASCADE`);

    console.log('Dropped existing inbound receiving tables (if any)');

    // Now create the tables
    // ============================================================================
    // ADVANCE SHIPPING NOTICE (ASN)
    // ============================================================================

    await client.query(`
      CREATE TABLE advance_shipping_notices (
        asn_id VARCHAR(50) PRIMARY KEY,
        supplier_id VARCHAR(50) NOT NULL,
        purchase_order_number VARCHAR(100) NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'IN_TRANSIT', 'RECEIVED', 'PARTIALLY_RECEIVED', 'CANCELLED')),
        expected_arrival_date DATE NOT NULL,
        actual_arrival_date DATE,
        carrier VARCHAR(100),
        tracking_number VARCHAR(100),
        shipment_notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        received_at TIMESTAMP WITH TIME ZONE,
        created_by VARCHAR(20) NOT NULL REFERENCES users(user_id) ON DELETE RESTRICT,
        CONSTRAINT asn_unique_po UNIQUE (supplier_id, purchase_order_number)
      )
    `);

    await client.query(`CREATE INDEX idx_asn_supplier ON advance_shipping_notices(supplier_id)`);
    await client.query(`CREATE INDEX idx_asn_status ON advance_shipping_notices(status)`);
    await client.query(
      `CREATE INDEX idx_asn_expected_arrival ON advance_shipping_notices(expected_arrival_date)`
    );
    await client.query(
      `CREATE INDEX idx_asn_po_number ON advance_shipping_notices(purchase_order_number)`
    );

    // ============================================================================
    // ASN LINE ITEMS
    // ============================================================================

    await client.query(`
      CREATE TABLE asn_line_items (
        line_item_id VARCHAR(50) PRIMARY KEY,
        asn_id VARCHAR(50) NOT NULL REFERENCES advance_shipping_notices(asn_id) ON DELETE CASCADE,
        sku VARCHAR(50) NOT NULL REFERENCES skus(sku) ON DELETE RESTRICT,
        expected_quantity INTEGER NOT NULL CHECK (expected_quantity > 0),
        received_quantity INTEGER NOT NULL DEFAULT 0 CHECK (received_quantity >= 0),
        unit_cost DECIMAL(10, 2) NOT NULL CHECK (unit_cost >= 0),
        lot_number VARCHAR(100),
        expiration_date DATE,
        receiving_status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (receiving_status IN ('PENDING', 'PARTIALLY_RECEIVED', 'FULLY_RECEIVED', 'CANCELLED')),
        line_notes TEXT,
        CONSTRAINT asn_line_unique UNIQUE (asn_id, sku)
      )
    `);

    await client.query(`CREATE INDEX idx_asn_line_asn ON asn_line_items(asn_id)`);
    await client.query(`CREATE INDEX idx_asn_line_sku ON asn_line_items(sku)`);
    await client.query(`CREATE INDEX idx_asn_line_status ON asn_line_items(receiving_status)`);

    // ============================================================================
    // RECEIPTS
    // ============================================================================

    await client.query(`
      CREATE TABLE receipts (
        receipt_id VARCHAR(50) PRIMARY KEY,
        asn_id VARCHAR(50) REFERENCES advance_shipping_notices(asn_id) ON DELETE SET NULL,
        receipt_date DATE NOT NULL DEFAULT CURRENT_DATE,
        receipt_type VARCHAR(20) NOT NULL DEFAULT 'PO' CHECK (receipt_type IN ('PO', 'RETURN', 'TRANSFER', 'ADJUSTMENT')),
        status VARCHAR(20) NOT NULL DEFAULT 'RECEIVING' CHECK (status IN ('RECEIVING', 'COMPLETED', 'CANCELLED')),
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        completed_at TIMESTAMP WITH TIME ZONE,
        received_by VARCHAR(20) NOT NULL REFERENCES users(user_id) ON DELETE RESTRICT
      )
    `);

    await client.query(`CREATE INDEX idx_receipt_asn ON receipts(asn_id)`);
    await client.query(`CREATE INDEX idx_receipt_date ON receipts(receipt_date)`);
    await client.query(`CREATE INDEX idx_receipt_status ON receipts(status)`);
    await client.query(`CREATE INDEX idx_receipt_type ON receipts(receipt_type)`);

    // ============================================================================
    // RECEIPT LINE ITEMS
    // ============================================================================

    await client.query(`
      CREATE TABLE receipt_line_items (
        receipt_line_id VARCHAR(50) PRIMARY KEY,
        receipt_id VARCHAR(50) NOT NULL REFERENCES receipts(receipt_id) ON DELETE CASCADE,
        asn_line_item_id VARCHAR(50) REFERENCES asn_line_items(line_item_id) ON DELETE SET NULL,
        sku VARCHAR(50) NOT NULL REFERENCES skus(sku) ON DELETE RESTRICT,
        quantity_ordered INTEGER NOT NULL,
        quantity_received INTEGER NOT NULL CHECK (quantity_received > 0),
        quantity_damaged INTEGER NOT NULL DEFAULT 0 CHECK (quantity_damaged >= 0),
        quality_status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (quality_status IN ('PENDING', 'PASSED', 'FAILED', 'PARTIAL')),
        putaway_status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (putaway_status IN ('PENDING', 'IN_PROGRESS', 'COMPLETED')),
        unit_cost DECIMAL(10, 2),
        total_cost DECIMAL(12, 2) GENERATED ALWAYS AS (quantity_received * unit_cost) STORED,
        lot_number VARCHAR(100),
        expiration_date DATE,
        notes TEXT,
        CONSTRAINT receipt_line_unique UNIQUE (receipt_id, sku)
      )
    `);

    await client.query(`CREATE INDEX idx_receipt_line_receipt ON receipt_line_items(receipt_id)`);
    await client.query(`CREATE INDEX idx_receipt_line_sku ON receipt_line_items(sku)`);
    await client.query(
      `CREATE INDEX idx_receipt_line_quality ON receipt_line_items(quality_status)`
    );
    await client.query(
      `CREATE INDEX idx_receipt_line_putaway ON receipt_line_items(putaway_status)`
    );

    // ============================================================================
    // PUTAWAY TASKS
    // ============================================================================

    await client.query(`
      CREATE TABLE putaway_tasks (
        putaway_task_id VARCHAR(50) PRIMARY KEY,
        receipt_line_id VARCHAR(50) NOT NULL REFERENCES receipt_line_items(receipt_line_id) ON DELETE CASCADE,
        sku VARCHAR(50) NOT NULL REFERENCES skus(sku) ON DELETE RESTRICT,
        quantity_to_putaway INTEGER NOT NULL CHECK (quantity_to_putaway > 0),
        quantity_putaway INTEGER NOT NULL DEFAULT 0 CHECK (quantity_putaway >= 0),
        target_bin_location VARCHAR(50) NOT NULL REFERENCES bin_locations(bin_id) ON DELETE RESTRICT,
        status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED')),
        assigned_to VARCHAR(20) REFERENCES users(user_id) ON DELETE SET NULL,
        assigned_at TIMESTAMP WITH TIME ZONE,
        completed_at TIMESTAMP WITH TIME ZONE,
        completed_by VARCHAR(20) REFERENCES users(user_id) ON DELETE SET NULL,
        priority VARCHAR(20) NOT NULL DEFAULT 'NORMAL' CHECK (priority IN ('LOW', 'NORMAL', 'HIGH', 'URGENT')),
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        notes TEXT
      )
    `);

    await client.query(`CREATE INDEX idx_putaway_receipt_line ON putaway_tasks(receipt_line_id)`);
    await client.query(`CREATE INDEX idx_putaway_sku ON putaway_tasks(sku)`);
    await client.query(`CREATE INDEX idx_putaway_status ON putaway_tasks(status)`);
    await client.query(`CREATE INDEX idx_putaway_assigned ON putaway_tasks(assigned_to)`);
    await client.query(`CREATE INDEX idx_putaway_target_bin ON putaway_tasks(target_bin_location)`);
    await client.query(`CREATE INDEX idx_putaway_priority ON putaway_tasks(priority)`);

    // ============================================================================
    // TRIGGER: UPDATE ASN STATUS
    // ============================================================================

    await client.query(`
      CREATE OR REPLACE FUNCTION update_asn_status()
      RETURNS TRIGGER AS $$
      BEGIN
        IF TG_OP = 'INSERT' THEN
          UPDATE asn_line_items
          SET received_quantity = received_quantity + NEW.quantity_received,
              receiving_status = CASE
                WHEN received_quantity + NEW.quantity_received >= expected_quantity THEN 'FULLY_RECEIVED'
                ELSE 'PARTIALLY_RECEIVED'
              END
          WHERE line_item_id = NEW.asn_line_item_id;

          UPDATE advance_shipping_notices
          SET status = CASE
            WHEN NOT EXISTS (
              SELECT 1 FROM asn_line_items WHERE asn_id = (
                SELECT asn_id FROM asn_line_items WHERE line_item_id = NEW.asn_line_item_id
              ) AND receiving_status IN ('PENDING', 'PARTIALLY_RECEIVED')
            ) THEN 'RECEIVED'
            ELSE 'PARTIALLY_RECEIVED'
          END
          WHERE asn_id = (SELECT asn_id FROM asn_line_items WHERE line_item_id = NEW.asn_line_item_id);
        END IF;

        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql
    `);

    await client.query(`
      CREATE TRIGGER trigger_update_asn_status
      AFTER INSERT ON receipt_line_items
      FOR EACH ROW
      WHEN (NEW.asn_line_item_id IS NOT NULL)
      EXECUTE FUNCTION update_asn_status()
    `);

    // ============================================================================
    // TRIGGER: UPDATE RECEIPT STATUS
    // ============================================================================

    await client.query(`
      CREATE OR REPLACE FUNCTION update_receipt_status()
      RETURNS TRIGGER AS $$
      BEGIN
        UPDATE receipts
        SET status = CASE
          WHEN NOT EXISTS (
            SELECT 1 FROM receipt_line_items
            WHERE receipt_id = NEW.receipt_id
            AND putaway_status IN ('PENDING', 'IN_PROGRESS')
          ) THEN 'COMPLETED'
          ELSE 'RECEIVING'
        END
        WHERE receipt_id = NEW.receipt_id;

        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql
    `);

    await client.query(`
      CREATE TRIGGER trigger_update_receipt_status
      AFTER UPDATE OF putaway_status ON receipt_line_items
      FOR EACH ROW
      EXECUTE FUNCTION update_receipt_status()
    `);

    console.log('Inbound receiving migration completed successfully!');
    await closePool();
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    await closePool();
    process.exit(1);
  }
}

runMigration();
