-- ============================================================================
-- RMA (Return Merchandise Authorization) Module Migration
--
-- This migration creates the database schema for handling customer returns,
-- warranty claims, refurbishments, and exchanges.
-- ============================================================================

-- Main RMA requests table
CREATE TABLE IF NOT EXISTS rma_requests (
    rma_id VARCHAR(255) PRIMARY KEY,
    rma_number VARCHAR(100) UNIQUE NOT NULL,
    order_id VARCHAR(255) NOT NULL,
    order_item_id VARCHAR(255) NOT NULL,
    customer_id VARCHAR(255),
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
    replacement_order_id VARCHAR(255),

    -- Request timeline
    requested_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    approved_at TIMESTAMP WITH TIME ZONE,
    approved_by VARCHAR(255),
    received_at TIMESTAMP WITH TIME ZONE,
    received_by VARCHAR(255),
    inspected_at TIMESTAMP WITH TIME ZONE,
    inspected_by VARCHAR(255),
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolved_by VARCHAR(255),
    closed_at TIMESTAMP WITH TIME ZONE,
    closed_by VARCHAR(255),

    -- Shipping information for returns
    tracking_number VARCHAR(255),
    carrier VARCHAR(100),
    return_label_url TEXT,

    -- Notes and communications
    customer_notes TEXT,
    internal_notes TEXT,
    resolution_notes TEXT,
    rejection_reason TEXT,

    -- Refund details
    refund_method VARCHAR(50),
    refund_processed_at TIMESTAMP WITH TIME ZONE,

    -- Replacement details
    replacement_shipped_at TIMESTAMP WITH TIME ZONE,

    -- Images and attachments (JSON arrays of URLs)
    images JSONB,
    attachments JSONB,

    -- Audit
    created_by VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE,
    updated_by VARCHAR(255)
);

-- RMA inspection records table
CREATE TABLE IF NOT EXISTS rma_inspections (
    inspection_id VARCHAR(255) PRIMARY KEY,
    rma_id VARCHAR(255) NOT NULL,
    inspected_by VARCHAR(255) NOT NULL,
    inspected_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    condition VARCHAR(50) NOT NULL,
    disposition VARCHAR(50) NOT NULL,
    findings TEXT NOT NULL,
    recommended_resolution VARCHAR(50) NOT NULL,
    estimated_refund DECIMAL(10, 2),
    repair_cost DECIMAL(10, 2),
    refurbishment_cost DECIMAL(10, 2),
    notes TEXT,
    images JSONB,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_rma_inspection_rma
        FOREIGN KEY (rma_id)
        REFERENCES rma_requests(rma_id)
        ON DELETE CASCADE
);

-- RMA activity log table
CREATE TABLE IF NOT EXISTS rma_activity (
    activity_id VARCHAR(255) PRIMARY KEY,
    rma_id VARCHAR(255) NOT NULL,
    activity_type VARCHAR(50) NOT NULL,
    description TEXT NOT NULL,
    old_status VARCHAR(50),
    new_status VARCHAR(50),
    user_id VARCHAR(255) NOT NULL,
    user_name VARCHAR(255) NOT NULL,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_rma_activity_rma
        FOREIGN KEY (rma_id)
        REFERENCES rma_requests(rma_id)
        ON DELETE CASCADE
);

-- RMA communications table
CREATE TABLE IF NOT EXISTS rma_communications (
    communication_id VARCHAR(255) PRIMARY KEY,
    rma_id VARCHAR(255) NOT NULL,
    type VARCHAR(20) NOT NULL,
    direction VARCHAR(20) NOT NULL,
    subject VARCHAR(500),
    content TEXT NOT NULL,
    sent_by VARCHAR(255),
    sent_at TIMESTAMP WITH TIME ZONE,
    attachments JSONB,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_rma_communication_rma
        FOREIGN KEY (rma_id)
        REFERENCES rma_requests(rma_id)
        ON DELETE CASCADE
);

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_rma_requests_order_id ON rma_requests(order_id);
CREATE INDEX IF NOT EXISTS idx_rma_requests_customer_id ON rma_requests(customer_id);
CREATE INDEX IF NOT EXISTS idx_rma_requests_customer_name ON rma_requests(customer_name);
CREATE INDEX IF NOT EXISTS idx_rma_requests_status ON rma_requests(status);
CREATE INDEX IF NOT EXISTS idx_rma_requests_priority ON rma_requests(priority);
CREATE INDEX IF NOT EXISTS idx_rma_requests_reason ON rma_requests(reason);
CREATE INDEX IF NOT EXISTS idx_rma_requests_created_at ON rma_requests(created_at);
CREATE INDEX IF NOT EXISTS idx_rma_requests_requested_date ON rma_requests(requested_date);

CREATE INDEX IF NOT EXISTS idx_rma_activity_rma_id ON rma_activity(rma_id);
CREATE INDEX IF NOT EXISTS idx_rma_activity_created_at ON rma_activity(created_at);

CREATE INDEX IF NOT EXISTS idx_rma_inspections_rma_id ON rma_inspections(rma_id);

CREATE INDEX IF NOT EXISTS idx_rma_communications_rma_id ON rma_communications(rma_id);

-- Add comments for documentation
COMMENT ON TABLE rma_requests IS 'Return Merchandise Authorization requests';
COMMENT ON TABLE rma_inspections IS 'RMA inspection records and findings';
COMMENT ON TABLE rma_activity IS 'Activity log for RMA requests';
COMMENT ON TABLE rma_communications IS 'Communication history for RMA requests';

COMMENT ON COLUMN rma_requests.status IS 'Current status of the RMA request';
COMMENT ON COLUMN rma_requests.reason IS 'Reason for the return request';
COMMENT ON COLUMN rma_requests.resolution_type IS 'How the return was resolved (refund, replacement, repair, etc.)';
COMMENT ON COLUMN rma_requests.disposition IS 'What happened to the returned item (resale, refurbish, repair, dispose, etc.)';
COMMENT ON COLUMN rma_requests.refund_method IS 'How the refund was processed (original payment method, store credit, etc.)';
