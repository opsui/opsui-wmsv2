/**
 * Migration: Create picking_exceptions table
 *
 * This table stores manual overrides and exceptions during picking
 * that affect inventory accuracy and require audit trailing.
 */

import { query } from '../client';

export async function createPickingExceptionsTable(): Promise<void> {
  console.log('Creating picking_exceptions table...');

  await query(`
    -- Create picking_exceptions table
    CREATE TABLE IF NOT EXISTS picking_exceptions (
      exception_id VARCHAR(50) PRIMARY KEY,
      order_id VARCHAR(30) NOT NULL REFERENCES orders(order_id) ON DELETE CASCADE,
      order_item_id VARCHAR(20) REFERENCES order_items(order_item_id) ON DELETE SET NULL,
      pick_task_id VARCHAR(20) REFERENCES pick_tasks(pick_task_id) ON DELETE SET NULL,
      user_id VARCHAR(20) NOT NULL REFERENCES users(user_id) ON DELETE RESTRICT,
      sku VARCHAR(50) NOT NULL REFERENCES skus(sku) ON DELETE RESTRICT,
      exception_type VARCHAR(50) NOT NULL,
      original_qty INTEGER NOT NULL,
      new_qty INTEGER NOT NULL,
      previous_picked_qty INTEGER NOT NULL DEFAULT 0,
      reason TEXT NOT NULL,
      notes TEXT,
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
      resolved_at TIMESTAMP WITH TIME ZONE,
      resolved_by VARCHAR(20) REFERENCES users(user_id) ON DELETE SET NULL,
      resolution_notes TEXT
    );

    -- Create indexes for efficient queries
    CREATE INDEX IF NOT EXISTS idx_picking_exceptions_order_id ON picking_exceptions(order_id);
    CREATE INDEX IF NOT EXISTS idx_picking_exceptions_user_id ON picking_exceptions(user_id);
    CREATE INDEX IF NOT EXISTS idx_picking_exceptions_sku ON picking_exceptions(sku);
    CREATE INDEX IF NOT EXISTS idx_picking_exceptions_created_at ON picking_exceptions(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_picking_exceptions_type ON picking_exceptions(exception_type);

    -- Add comment to table
    COMMENT ON TABLE picking_exceptions IS 'Tracks manual overrides and exceptions during picking that affect inventory accuracy';
  `);

  console.log('picking_exceptions table created successfully');
}

// Export for running directly
if (require.main === module) {
  createPickingExceptionsTable()
    .then(() => {
      console.log('Migration completed');
      process.exit(0);
    })
    .catch(err => {
      console.error('Migration failed:', err);
      process.exit(1);
    });
}
