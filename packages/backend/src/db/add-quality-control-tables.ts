/**
 * Add Quality Control Tables Migration
 *
 * This script creates the quality control tables that were missing
 * from the database after the Phase 2 migration.
 */

import { getPool } from './client';

const pool = getPool();

async function runMigration() {
  console.log('Adding Quality Control tables...');

  try {
    await pool.query('BEGIN');

    // Inspection Checklists
    await pool.query(`
      CREATE TABLE IF NOT EXISTS inspection_checklists (
        checklist_id VARCHAR(50) PRIMARY KEY,
        checklist_name VARCHAR(255) NOT NULL,
        description TEXT,
        inspection_type VARCHAR(50) NOT NULL,
        sku VARCHAR(100),
        category VARCHAR(100),
        is_active BOOLEAN DEFAULT true,
        created_by VARCHAR(50) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_checklist_created_by FOREIGN KEY (created_by) REFERENCES users(user_id),
        CONSTRAINT chk_inspection_type CHECK (inspection_type IN ('INCOMING', 'OUTGOING', 'INVENTORY', 'QUALITY_HOLD', 'RETURN', 'DAMAGE', 'EXPIRATION', 'SPECIAL'))
      )
    `);

    // Create indexes for inspection_checklists
    await pool.query(
      `CREATE INDEX IF NOT EXISTS idx_checklist_type ON inspection_checklists(inspection_type)`
    );
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_checklist_sku ON inspection_checklists(sku)`);
    await pool.query(
      `CREATE INDEX IF NOT EXISTS idx_checklist_category ON inspection_checklists(category)`
    );
    await pool.query(
      `CREATE INDEX IF NOT EXISTS idx_checklist_active ON inspection_checklists(is_active)`
    );

    // Inspection Checklist Items
    await pool.query(`
      CREATE TABLE IF NOT EXISTS inspection_checklist_items (
        item_id VARCHAR(50) PRIMARY KEY,
        checklist_id VARCHAR(50) NOT NULL,
        item_description TEXT NOT NULL,
        item_type VARCHAR(50) NOT NULL,
        is_required BOOLEAN DEFAULT false,
        display_order INT NOT NULL DEFAULT 0,
        options TEXT,
        CONSTRAINT fk_checklist FOREIGN KEY (checklist_id) REFERENCES inspection_checklists(checklist_id) ON DELETE CASCADE,
        CONSTRAINT chk_item_type CHECK (item_type IN ('CHECKBOX', 'TEXT', 'NUMBER', 'PHOTO', 'PASS_FAIL'))
      )
    `);

    await pool.query(
      `CREATE INDEX IF NOT EXISTS idx_checklist_items_checklist ON inspection_checklist_items(checklist_id)`
    );

    // Quality Inspections
    await pool.query(`
      CREATE TABLE IF NOT EXISTS quality_inspections (
        inspection_id VARCHAR(50) PRIMARY KEY,
        inspection_type VARCHAR(50) NOT NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
        reference_type VARCHAR(50) NOT NULL,
        reference_id VARCHAR(100) NOT NULL,
        sku VARCHAR(100) NOT NULL,
        quantity_inspected INT NOT NULL,
        quantity_passed INT DEFAULT 0,
        quantity_failed INT DEFAULT 0,
        defect_type VARCHAR(50),
        defect_description TEXT,
        disposition_action VARCHAR(50),
        disposition_notes TEXT,
        inspector_id VARCHAR(50) NOT NULL,
        inspector_name VARCHAR(255) NOT NULL,
        started_at TIMESTAMP,
        completed_at TIMESTAMP,
        location VARCHAR(100),
        lot_number VARCHAR(100),
        expiration_date DATE,
        images TEXT,
        attachments TEXT,
        approved_by VARCHAR(50),
        approved_at TIMESTAMP,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_inspector FOREIGN KEY (inspector_id) REFERENCES users(user_id),
        CONSTRAINT fk_approved_by FOREIGN KEY (approved_by) REFERENCES users(user_id),
        CONSTRAINT chk_inspection_status CHECK (status IN ('PENDING', 'IN_PROGRESS', 'PASSED', 'FAILED', 'CONDITIONAL_PASSED', 'CANCELLED')),
        CONSTRAINT chk_qc_inspection_type CHECK (inspection_type IN ('INCOMING', 'OUTGOING', 'INVENTORY', 'QUALITY_HOLD', 'RETURN', 'DAMAGE', 'EXPIRATION', 'SPECIAL')),
        CONSTRAINT chk_reference_type CHECK (reference_type IN ('ASN', 'RECEIPT', 'ORDER', 'INVENTORY', 'RETURN'))
      )
    `);

    // Create indexes for quality_inspections
    await pool.query(
      `CREATE INDEX IF NOT EXISTS idx_inspections_status ON quality_inspections(status)`
    );
    await pool.query(
      `CREATE INDEX IF NOT EXISTS idx_inspections_type ON quality_inspections(inspection_type)`
    );
    await pool.query(
      `CREATE INDEX IF NOT EXISTS idx_inspections_reference ON quality_inspections(reference_type, reference_id)`
    );
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_inspections_sku ON quality_inspections(sku)`);
    await pool.query(
      `CREATE INDEX IF NOT EXISTS idx_inspections_inspector ON quality_inspections(inspector_id)`
    );

    // Inspection Results
    await pool.query(`
      CREATE TABLE IF NOT EXISTS inspection_results (
        result_id VARCHAR(50) PRIMARY KEY,
        inspection_id VARCHAR(50) NOT NULL,
        checklist_item_id VARCHAR(50) NOT NULL,
        result TEXT NOT NULL,
        passed BOOLEAN NOT NULL,
        notes TEXT,
        image_url TEXT,
        CONSTRAINT fk_inspection FOREIGN KEY (inspection_id) REFERENCES quality_inspections(inspection_id) ON DELETE CASCADE,
        CONSTRAINT fk_checklist_item FOREIGN KEY (checklist_item_id) REFERENCES inspection_checklist_items(item_id)
      )
    `);

    await pool.query(
      `CREATE INDEX IF NOT EXISTS idx_inspection_results_inspection ON inspection_results(inspection_id)`
    );

    // Return Authorizations
    await pool.query(`
      CREATE TABLE IF NOT EXISTS return_authorizations (
        return_id VARCHAR(50) PRIMARY KEY,
        order_id VARCHAR(50) NOT NULL,
        customer_id VARCHAR(50) NOT NULL,
        customer_name VARCHAR(255) NOT NULL,
        return_reason TEXT NOT NULL,
        return_date DATE NOT NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
        authorized_by VARCHAR(50) NOT NULL,
        received_by VARCHAR(50),
        inspected_by VARCHAR(50),
        total_refund_amount NUMERIC(10, 2) NOT NULL,
        restocking_fee NUMERIC(10, 2),
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_return_order FOREIGN KEY (order_id) REFERENCES orders(order_id),
        CONSTRAINT fk_return_authorized_by FOREIGN KEY (authorized_by) REFERENCES users(user_id),
        CONSTRAINT fk_return_received_by FOREIGN KEY (received_by) REFERENCES users(user_id),
        CONSTRAINT fk_return_inspected_by FOREIGN KEY (inspected_by) REFERENCES users(user_id),
        CONSTRAINT chk_return_status CHECK (status IN ('PENDING', 'APPROVED', 'RECEIVED', 'INSPECTED', 'PROCESSED', 'REJECTED', 'COMPLETED'))
      )
    `);

    // Create indexes for return_authorizations
    await pool.query(
      `CREATE INDEX IF NOT EXISTS idx_returns_status ON return_authorizations(status)`
    );
    await pool.query(
      `CREATE INDEX IF NOT EXISTS idx_returns_order ON return_authorizations(order_id)`
    );
    await pool.query(
      `CREATE INDEX IF NOT EXISTS idx_returns_customer ON return_authorizations(customer_id)`
    );
    await pool.query(
      `CREATE INDEX IF NOT EXISTS idx_returns_date ON return_authorizations(return_date)`
    );

    // Return Items
    await pool.query(`
      CREATE TABLE IF NOT EXISTS return_items (
        return_item_id VARCHAR(50) PRIMARY KEY,
        return_id VARCHAR(50) NOT NULL,
        order_item_id VARCHAR(50) NOT NULL,
        sku VARCHAR(100) NOT NULL,
        name VARCHAR(255) NOT NULL,
        quantity INT NOT NULL,
        return_reason TEXT NOT NULL,
        condition VARCHAR(50) NOT NULL,
        disposition VARCHAR(50),
        refund_amount NUMERIC(10, 2) NOT NULL,
        inspection_id VARCHAR(50),
        CONSTRAINT fk_return FOREIGN KEY (return_id) REFERENCES return_authorizations(return_id) ON DELETE CASCADE,
        CONSTRAINT fk_return_order_item FOREIGN KEY (order_item_id) REFERENCES order_items(order_item_id),
        CONSTRAINT fk_return_inspection FOREIGN KEY (inspection_id) REFERENCES quality_inspections(inspection_id),
        CONSTRAINT chk_return_condition CHECK (condition IN ('NEW', 'OPENED', 'DAMAGED', 'DEFECTIVE'))
      )
    `);

    await pool.query(
      `CREATE INDEX IF NOT EXISTS idx_return_items_return ON return_items(return_id)`
    );
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_return_items_sku ON return_items(sku)`);

    // Create triggers for updated_at
    await pool.query(`
      CREATE OR REPLACE FUNCTION update_quality_inspections_updated_at()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql
    `);

    await pool.query(`
      DROP TRIGGER IF EXISTS trigger_update_quality_inspections_updated_at ON quality_inspections
    `);

    await pool.query(`
      CREATE TRIGGER trigger_update_quality_inspections_updated_at
        BEFORE UPDATE ON quality_inspections
        FOR EACH ROW
        EXECUTE FUNCTION update_quality_inspections_updated_at()
    `);

    await pool.query(`
      CREATE OR REPLACE FUNCTION update_return_authorizations_updated_at()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql
    `);

    await pool.query(`
      DROP TRIGGER IF EXISTS trigger_update_return_authorizations_updated_at ON return_authorizations
    `);

    await pool.query(`
      CREATE TRIGGER trigger_update_return_authorizations_updated_at
        BEFORE UPDATE ON return_authorizations
        FOR EACH ROW
        EXECUTE FUNCTION update_return_authorizations_updated_at()
    `);

    await pool.query(`
      CREATE OR REPLACE FUNCTION update_inspection_checklists_updated_at()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql
    `);

    await pool.query(`
      DROP TRIGGER IF EXISTS trigger_update_inspection_checklists_updated_at ON inspection_checklists
    `);

    await pool.query(`
      CREATE TRIGGER trigger_update_inspection_checklists_updated_at
        BEFORE UPDATE ON inspection_checklists
        FOR EACH ROW
        EXECUTE FUNCTION update_inspection_checklists_updated_at()
    `);

    // Insert default inspection checklists
    // Get first admin user or use NULL (will violate FK, so we need a valid user)
    const userResult = await pool.query('SELECT user_id FROM users WHERE role = $1 LIMIT 1', [
      'ADMIN',
    ]);

    let createdById = 'SYSTEM';
    if (userResult.rows.length > 0) {
      createdById = userResult.rows[0].user_id;
    }

    // Temporarily disable FK constraint for created_by since we might not have a valid user
    await pool.query(
      `ALTER TABLE inspection_checklists DROP CONSTRAINT IF EXISTS fk_checklist_created_by`
    );

    await pool.query(
      `
      INSERT INTO inspection_checklists (checklist_id, checklist_name, description, inspection_type, created_by) VALUES
        ('CHK-INCOMING-DEFAULT', 'Incoming Goods Inspection', 'Standard inspection for incoming shipments', 'INCOMING', $1),
        ('CHK-RETURN-DEFAULT', 'Return Inspection', 'Inspection checklist for returned items', 'RETURN', $1),
        ('CHK-DAMAGE-DEFAULT', 'Damage Inspection', 'Inspection for damaged goods', 'DAMAGE', $1)
      ON CONFLICT DO NOTHING
    `,
      [createdById]
    );

    // Re-add FK constraint if possible
    if (userResult.rows.length > 0) {
      await pool.query(`
        ALTER TABLE inspection_checklists ADD CONSTRAINT fk_checklist_created_by
          FOREIGN KEY (created_by) REFERENCES users(user_id)
      `);
    }

    // Insert default checklist items for incoming inspection
    await pool.query(`
      INSERT INTO inspection_checklist_items (item_id, checklist_id, item_description, item_type, is_required, display_order) VALUES
        ('CHK-ITEM-1', 'CHK-INCOMING-DEFAULT', 'Packaging intact', 'PASS_FAIL', true, 1),
        ('CHK-ITEM-2', 'CHK-INCOMING-DEFAULT', 'Correct quantity received', 'PASS_FAIL', true, 2),
        ('CHK-ITEM-3', 'CHK-INCOMING-DEFAULT', 'No visible damage', 'PASS_FAIL', true, 3),
        ('CHK-ITEM-4', 'CHK-INCOMING-DEFAULT', 'Labels match purchase order', 'PASS_FAIL', true, 4),
        ('CHK-ITEM-5', 'CHK-INCOMING-DEFAULT', 'Expiration date acceptable', 'PASS_FAIL', false, 5)
      ON CONFLICT DO NOTHING
    `);

    // Insert default checklist items for return inspection
    await pool.query(`
      INSERT INTO inspection_checklist_items (item_id, checklist_id, item_description, item_type, is_required, display_order) VALUES
        ('CHK-ITEM-10', 'CHK-RETURN-DEFAULT', 'Item condition assessment', 'PASS_FAIL', true, 1),
        ('CHK-ITEM-11', 'CHK-RETURN-DEFAULT', 'Original packaging intact', 'PASS_FAIL', false, 2),
        ('CHK-ITEM-12', 'CHK-RETURN-DEFAULT', 'All accessories present', 'PASS_FAIL', false, 3),
        ('CHK-ITEM-13', 'CHK-RETURN-DEFAULT', 'Sanitary seals intact', 'PASS_FAIL', true, 4)
      ON CONFLICT DO NOTHING
    `);

    await pool.query('COMMIT');
    console.log('✓ Quality Control tables added successfully!');

    // Verify tables were created
    const result = await pool.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name IN ('quality_inspections', 'inspection_checklists', 'return_authorizations')
      ORDER BY table_name
    `);

    console.log('\nCreated tables:');
    result.rows.forEach((row: any) => console.log(`  - ${row.table_name}`));
  } catch (error: any) {
    await pool.query('ROLLBACK');
    console.error('✗ Migration failed:', error.message);
    throw error;
  } finally {
    await pool.end();
  }
}

runMigration().catch(console.error);
