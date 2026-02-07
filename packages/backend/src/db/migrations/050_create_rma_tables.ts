/**
 * Migration 050: Create RMA (Return Merchandise Authorization) Tables
 *
 * Creates tables for managing customer returns, warranty claims, and refurbishments
 */

import { PoolClient } from 'pg';
import { logger } from '../../config/logger';

export async function up(pgClient: PoolClient): Promise<void> {
  // ==============================================================================
  // RMA REQUESTS TABLE
  // ==============================================================================
  await pgClient.query(`
    CREATE TABLE IF NOT EXISTS rma_requests (
      rma_id VARCHAR(50) PRIMARY KEY,
      rma_number VARCHAR(50) UNIQUE NOT NULL,
      order_id VARCHAR(50) NOT NULL,
      order_item_id VARCHAR(50) NOT NULL,
      customer_id VARCHAR(50),
      customer_name VARCHAR(255) NOT NULL,
      customer_email VARCHAR(255),
      customer_phone VARCHAR(50),
      sku VARCHAR(100) NOT NULL,
      product_name VARCHAR(500) NOT NULL,
      quantity INTEGER NOT NULL CHECK (quantity > 0),
      reason VARCHAR(50) NOT NULL,
      reason_description TEXT,
      status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
      priority VARCHAR(20) NOT NULL DEFAULT 'NORMAL',
      condition VARCHAR(50),
      resolution_type VARCHAR(50),
      disposition VARCHAR(50),
      refund_amount DECIMAL(10, 2),
      replacement_order_id VARCHAR(50),

      -- Request tracking
      requested_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
      approved_at TIMESTAMP WITH TIME ZONE,
      approved_by VARCHAR(50),
      received_at TIMESTAMP WITH TIME ZONE,
      received_by VARCHAR(50),
      inspected_at TIMESTAMP WITH TIME ZONE,
      inspected_by VARCHAR(50),
      resolved_at TIMESTAMP WITH TIME ZONE,
      resolved_by VARCHAR(50),
      closed_at TIMESTAMP WITH TIME ZONE,
      closed_by VARCHAR(50),

      -- Shipping tracking
      tracking_number VARCHAR(100),
      carrier VARCHAR(100),
      return_label_url TEXT,

      -- Notes and communication
      customer_notes TEXT,
      internal_notes TEXT,
      resolution_notes TEXT,
      rejection_reason TEXT,

      -- Refund/Replacement details
      refund_method VARCHAR(50),
      refund_processed_at TIMESTAMP WITH TIME ZONE,
      replacement_shipped_at TIMESTAMP WITH TIME ZONE,

      -- Audit
      created_by VARCHAR(50) NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE,
      updated_by VARCHAR(50),

      -- Attachments
      images JSONB DEFAULT '[]'::jsonb,
      attachments JSONB DEFAULT '[]'::jsonb
    );
  `);

  // Create indexes for RMA requests
  await pgClient.query(`
    CREATE INDEX IF NOT EXISTS idx_rma_requests_order_id ON rma_requests(order_id);
  `);
  await pgClient.query(`
    CREATE INDEX IF NOT EXISTS idx_rma_requests_customer_id ON rma_requests(customer_id);
  `);
  await pgClient.query(`
    CREATE INDEX IF NOT EXISTS idx_rma_requests_status ON rma_requests(status);
  `);
  await pgClient.query(`
    CREATE INDEX IF NOT EXISTS idx_rma_requests_priority ON rma_requests(priority);
  `);
  await pgClient.query(`
    CREATE INDEX IF NOT EXISTS idx_rma_requests_reason ON rma_requests(reason);
  `);
  await pgClient.query(`
    CREATE INDEX IF NOT EXISTS idx_rma_requests_requested_date ON rma_requests(requested_date DESC);
  `);

  // ==============================================================================
  // RMA INSPECTIONS TABLE
  // ==============================================================================
  await pgClient.query(`
    CREATE TABLE IF NOT EXISTS rma_inspections (
      inspection_id VARCHAR(50) PRIMARY KEY,
      rma_id VARCHAR(50) NOT NULL REFERENCES rma_requests(rma_id) ON DELETE CASCADE,
      inspected_by VARCHAR(50) NOT NULL,
      inspected_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
      condition VARCHAR(50) NOT NULL,
      disposition VARCHAR(50) NOT NULL,
      findings TEXT NOT NULL,
      recommended_resolution VARCHAR(50) NOT NULL,
      estimated_refund DECIMAL(10, 2),
      repair_cost DECIMAL(10, 2),
      refurbishment_cost DECIMAL(10, 2),
      notes TEXT,
      images JSONB DEFAULT '[]'::jsonb,
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
    );
  `);

  // ==============================================================================
  // RMA ACTIVITY LOG TABLE
  // ==============================================================================
  await pgClient.query(`
    CREATE TABLE IF NOT EXISTS rma_activity_log (
      activity_id VARCHAR(50) PRIMARY KEY,
      rma_id VARCHAR(50) NOT NULL REFERENCES rma_requests(rma_id) ON DELETE CASCADE,
      activity_type VARCHAR(50) NOT NULL,
      description TEXT NOT NULL,
      old_status VARCHAR(50),
      new_status VARCHAR(50),
      user_id VARCHAR(50) NOT NULL,
      user_name VARCHAR(255) NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
      metadata JSONB DEFAULT '{}'::jsonb
    );
  `);

  await pgClient.query(`
    CREATE INDEX IF NOT EXISTS idx_rma_activity_log_rma_id ON rma_activity_log(rma_id);
  `);
  await pgClient.query(`
    CREATE INDEX IF NOT EXISTS idx_rma_activity_log_created_at ON rma_activity_log(created_at DESC);
  `);

  // ==============================================================================
  // RMA COMMUNICATIONS TABLE
  // ==============================================================================
  await pgClient.query(`
    CREATE TABLE IF NOT EXISTS rma_communications (
      communication_id VARCHAR(50) PRIMARY KEY,
      rma_id VARCHAR(50) NOT NULL REFERENCES rma_requests(rma_id) ON DELETE CASCADE,
      type VARCHAR(20) NOT NULL,
      direction VARCHAR(20) NOT NULL,
      subject VARCHAR(500),
      content TEXT NOT NULL,
      sent_by VARCHAR(50),
      sent_at TIMESTAMP WITH TIME ZONE,
      attachments JSONB DEFAULT '[]'::jsonb,
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
    );
  `);

  await pgClient.query(`
    CREATE INDEX IF NOT EXISTS idx_rma_communications_rma_id ON rma_communications(rma_id);
  `);

  logger.info('Migration 050: RMA tables created successfully');
}

export async function down(pgClient: PoolClient): Promise<void> {
  // Drop in reverse order of creation
  await pgClient.query(`DROP TABLE IF EXISTS rma_communications CASCADE;`);
  await pgClient.query(`DROP TABLE IF EXISTS rma_activity_log CASCADE;`);
  await pgClient.query(`DROP TABLE IF EXISTS rma_inspections CASCADE;`);
  await pgClient.query(`DROP TABLE IF EXISTS rma_requests CASCADE;`);

  logger.info('Migration 050: RMA tables dropped successfully');
}

export const description = 'Create RMA (Return Merchandise Authorization) tables';
export const version = 50;
