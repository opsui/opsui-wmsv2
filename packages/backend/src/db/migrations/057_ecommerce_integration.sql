-- Migration 057: E-commerce Integration
-- Integration with Shopify, WooCommerce, Magento, and other e-commerce platforms
-- Part of Phase 8: E-commerce Integration (Weeks 23-24)

-- ============================================================================
-- E-COMMERCE CONNECTIONS
-- Store platform connection credentials and configuration
-- ============================================================================

CREATE TABLE IF NOT EXISTS ecommerce_connections (
    connection_id VARCHAR(20) PRIMARY KEY,
    connection_name VARCHAR(255) NOT NULL,
    platform_type VARCHAR(50) NOT NULL, -- SHOPIFY, WOOCOMMERCE, MAGENTO, CUSTOM
    api_endpoint VARCHAR(500) NOT NULL,
    api_key VARCHAR(255) NOT NULL,
    api_secret VARCHAR(255),
    access_token VARCHAR(500),
    store_url VARCHAR(500),
    api_version VARCHAR(50) DEFAULT 'v1',
    webhook_url VARCHAR(500),
    webhook_secret VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE,
    sync_customers BOOLEAN DEFAULT TRUE,
    sync_products BOOLEAN DEFAULT TRUE,
    sync_inventory BOOLEAN DEFAULT TRUE,
    sync_orders BOOLEAN DEFAULT TRUE,
    auto_import_orders BOOLEAN DEFAULT FALSE,
    last_sync_at TIMESTAMP,
    sync_frequency_minutes INTEGER DEFAULT 60,
    connection_settings JSONB, -- Store platform-specific settings
    rate_limit_remaining INTEGER DEFAULT -1,
    rate_limit_reset_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    created_by VARCHAR(50)
);

CREATE INDEX idx_ecommerce_platform ON ecommerce_connections(platform_type);
CREATE INDEX idx_ecommerce_active ON ecommerce_connections(is_active);

-- ============================================================================
-- E-COMMERCE PRODUCT MAPPING
-- Map internal SKUs to external product IDs
-- ============================================================================

CREATE TABLE IF NOT EXISTS ecommerce_product_mapping (
    mapping_id VARCHAR(20) PRIMARY KEY,
    connection_id VARCHAR(20) NOT NULL,
    internal_sku VARCHAR(50) NOT NULL,
    external_product_id VARCHAR(255) NOT NULL,
    external_variant_id VARCHAR(255),
    external_product_title TEXT,
    sync_status VARCHAR(50) DEFAULT 'ACTIVE', -- ACTIVE, UNSYNCED, DISABLED
    last_synced_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE (connection_id, external_product_id),
    FOREIGN KEY (connection_id) REFERENCES ecommerce_connections(connection_id) ON DELETE CASCADE
);

CREATE INDEX idx_prodmap_connection ON ecommerce_product_mapping(connection_id);
CREATE INDEX idx_prodmap_internal_sku ON ecommerce_product_mapping(internal_sku);
CREATE INDEX idx_prodmap_status ON ecommerce_product_mapping(sync_status);

-- ============================================================================
-- E-COMMERCE INVENTORY SYNC
-- Track inventory synchronization status
-- ============================================================================

CREATE TABLE IF NOT EXISTS ecommerce_inventory_sync (
    sync_id VARCHAR(20) PRIMARY KEY,
    connection_id VARCHAR(20) NOT NULL,
    sku VARCHAR(50) NOT NULL,
    sync_type VARCHAR(50) NOT NULL, -- PUSH, PULL, BIDIRECTIONAL
    sync_status VARCHAR(50) DEFAULT 'PENDING', -- PENDING, IN_PROGRESS, COMPLETED, FAILED
    quantity_before INTEGER,
    quantity_after INTEGER,
    external_quantity_before INTEGER,
    external_quantity_after INTEGER,
    variance INTEGER DEFAULT 0,
    error_message TEXT,
    started_at TIMESTAMP DEFAULT NOW(),
    completed_at TIMESTAMP,
    created_by VARCHAR(50),
    FOREIGN KEY (connection_id) REFERENCES ecommerce_connections(connection_id) ON DELETE CASCADE
);

CREATE INDEX idx_invsync_connection ON ecommerce_inventory_sync(connection_id);
CREATE INDEX idx_invsync_sku ON ecommerce_inventory_sync(sku);
CREATE INDEX idx_invsync_status ON ecommerce_inventory_sync(sync_status);
CREATE INDEX idx_invsync_date ON ecommerce_inventory_sync(started_at DESC);

-- ============================================================================
-- E-COMMERCE ORDER SYNC
-- Track order synchronization from e-commerce platforms
-- ============================================================================

CREATE TABLE IF NOT EXISTS ecommerce_order_sync (
    sync_id VARCHAR(20) PRIMARY KEY,
    connection_id VARCHAR(20) NOT NULL,
    external_order_id VARCHAR(255) NOT NULL,
    internal_order_id VARCHAR(20),
    sync_status VARCHAR(50) DEFAULT 'PENDING', -- PENDING, IN_PROGRESS, COMPLETED, FAILED
    sync_type VARCHAR(50) DEFAULT 'IMPORT', -- IMPORT, EXPORT
    order_data JSONB,
    line_items_data JSONB,
    customer_data JSONB,
    error_message TEXT,
    processing_attempts INTEGER DEFAULT 0,
    last_attempt_at TIMESTAMP,
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE (connection_id, external_order_id),
    FOREIGN KEY (connection_id) REFERENCES ecommerce_connections(connection_id) ON DELETE CASCADE
);

CREATE INDEX idx_ordersync_connection ON ecommerce_order_sync(connection_id);
CREATE INDEX idx_ordersync_external ON ecommerce_order_sync(external_order_id);
CREATE INDEX idx_ordersync_status ON ecommerce_order_sync(sync_status);
CREATE INDEX idx_ordersync_date ON ecommerce_order_sync(created_at DESC);

-- ============================================================================
-- E-COMMERCE CUSTOMER SYNC
-- Track customer synchronization
-- ============================================================================

CREATE TABLE IF NOT EXISTS ecommerce_customer_sync (
    sync_id VARCHAR(20) PRIMARY KEY,
    connection_id VARCHAR(20) NOT NULL,
    external_customer_id VARCHAR(255) NOT NULL,
    internal_customer_id VARCHAR(20),
    sync_status VARCHAR(50) DEFAULT 'PENDING',
    customer_data JSONB,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE (connection_id, external_customer_id),
    FOREIGN KEY (connection_id) REFERENCES ecommerce_connections(connection_id) ON DELETE CASCADE
);

CREATE INDEX idx_custsync_connection ON ecommerce_customer_sync(connection_id);
CREATE INDEX idx_custsync_external ON ecommerce_customer_sync(external_customer_id);
CREATE INDEX idx_custsync_internal ON ecommerce_customer_sync(internal_customer_id);

-- ============================================================================
-- E-COMMERCE WEBHOOKS
-- Store webhook events and processing status
-- ============================================================================

CREATE TABLE IF NOT EXISTS ecommerce_webhooks (
    webhook_id VARCHAR(20) PRIMARY KEY,
    connection_id VARCHAR(20) NOT NULL,
    webhook_event VARCHAR(100) NOT NULL,
    external_resource_id VARCHAR(255),
    payload JSONB NOT NULL,
    received_at TIMESTAMP DEFAULT NOW(),
    processed_at TIMESTAMP,
    processing_status VARCHAR(50) DEFAULT 'PENDING', -- PENDING, PROCESSED, FAILED, IGNORED
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    FOREIGN KEY (connection_id) REFERENCES ecommerce_connections(connection_id) ON DELETE CASCADE
);

CREATE INDEX idx_webhook_connection ON ecommerce_webhooks(connection_id);
CREATE INDEX idx_webhook_event ON ecommerce_webhooks(webhook_event);
CREATE INDEX idx_webhook_status ON ecommerce_webhooks(processing_status);
CREATE INDEX idx_webhook_date ON ecommerce_webhooks(received_at DESC);

-- ============================================================================
-- E-COMMERCE SYNC LOGS
-- Audit trail for sync operations
-- ============================================================================

CREATE TABLE IF NOT EXISTS ecommerce_sync_logs (
    log_id VARCHAR(20) PRIMARY KEY,
    connection_id VARCHAR(20) NOT NULL,
    sync_type VARCHAR(50) NOT NULL,
    resource_type VARCHAR(50), -- ORDER, PRODUCT, INVENTORY, CUSTOMER
    resource_count INTEGER DEFAULT 0,
    success_count INTEGER DEFAULT 0,
    failure_count INTEGER DEFAULT 0,
    sync_status VARCHAR(50) DEFAULT 'IN_PROGRESS',
    started_at TIMESTAMP DEFAULT NOW(),
    completed_at TIMESTAMP,
    error_summary TEXT,
    created_by VARCHAR(50),
    FOREIGN KEY (connection_id) REFERENCES ecommerce_connections(connection_id) ON DELETE CASCADE
);

CREATE INDEX idx_synclog_connection ON ecommerce_sync_logs(connection_id);
CREATE INDEX idx_synclog_type ON ecommerce_sync_logs(sync_type);
CREATE INDEX idx_synclog_status ON ecommerce_sync_logs(sync_status);
CREATE INDEX idx_synclog_date ON ecommerce_sync_logs(started_at DESC);

-- ============================================================================
-- PLATFORM-SPECIFIC TABLES
-- ============================================================================

-- Shopify specific settings
CREATE TABLE IF NOT EXISTS shopify_settings (
    connection_id VARCHAR(20) PRIMARY KEY,
    location_id VARCHAR(20), -- Shopify location for inventory tracking
    inventory_tracking_strategy VARCHAR(50) DEFAULT 'shopify', -- shopify, managed
    tax_taxable BOOLEAN DEFAULT FALSE,
    email_customer_notification BOOLEAN DEFAULT TRUE,
    send_receipt BOOLEAN DEFAULT TRUE,
    weight_unit VARCHAR(20) DEFAULT 'grams',
    enable_compare_at_price BOOLEAN DEFAULT FALSE,
    metafield_definitions JSONB,
    FOREIGN KEY (connection_id) REFERENCES ecommerce_connections(connection_id) ON DELETE CASCADE
);

-- WooCommerce specific settings
CREATE TABLE IF NOT EXISTS woocommerce_settings (
    connection_id VARCHAR(20) PRIMARY KEY,
    api_version VARCHAR(10) DEFAULT 'v3',
    wp_ajax_url VARCHAR(500),
    product_identifier VARCHAR(50) DEFAULT 'sku', -- sku, id, slug
    tax_based_on VARCHAR(50) DEFAULT 'shipping',
    calculate_taxes BOOLEAN DEFAULT TRUE,
    round_tax_at_subtotal BOOLEAN DEFAULT FALSE,
    round_tax_at_cart_total BOOLEAN DEFAULT FALSE,
    prices_include_tax BOOLEAN DEFAULT FALSE,
    metafield_definitions JSONB,
    FOREIGN KEY (connection_id) REFERENCES ecommerce_connections(connection_id) ON DELETE CASCADE
);

-- Magento specific settings
CREATE TABLE IF NOT EXISTS magento_settings (
    connection_id VARCHAR(20) PRIMARY KEY,
    api_version VARCHAR(10) DEFAULT 'V1',
    store_view_code VARCHAR(50),
    attribute_set_id VARCHAR(50),
    website_id INTEGER,
    stock_id INTEGER DEFAULT 1,
    notify_customer BOOLEAN DEFAULT TRUE,
    visible_catalog_visible BOOLEAN DEFAULT TRUE,
    metafield_definitions JSONB,
    FOREIGN KEY (connection_id) REFERENCES ecommerce_connections(connection_id) ON DELETE CASCADE
);

-- ============================================================================
-- VIEWS
-- ============================================================================

-- E-commerce Connections Status View
CREATE OR REPLACE VIEW v_ecommerce_connections_status AS
SELECT
    ec.connection_id,
    ec.connection_name,
    ec.platform_type,
    ec.store_url,
    ec.is_active,
    ec.sync_frequency_minutes,
    ec.last_sync_at,
    COUNT(DISTINCT epm.mapping_id) FILTER (WHERE epm.sync_status = 'ACTIVE') AS products_synced,
    COUNT(DISTINCT eis.sync_id) FILTER (WHERE eis.sync_status = 'COMPLETED') AS inventory_syncs_today,
    COUNT(DISTINCT eos.sync_id) FILTER (WHERE eos.sync_status = 'COMPLETED') AS orders_synced_today,
    COUNT(DISTINCT ew.webhook_id) FILTER (WHERE ew.received_at >= CURRENT_DATE) AS webhooks_today,
    ec.created_at,
    ec.updated_at
FROM ecommerce_connections ec
LEFT JOIN ecommerce_product_mapping epm ON ec.connection_id = epm.connection_id
LEFT JOIN ecommerce_inventory_sync eis ON ec.connection_id = eis.connection_id
    AND eis.created_at >= CURRENT_DATE
LEFT JOIN ecommerce_order_sync eos ON ec.connection_id = eos.connection_id
    AND eos.created_at >= CURRENT_DATE
LEFT JOIN ecommerce_webhooks ew ON ec.connection_id = ew.connection_id
    AND ew.received_at >= CURRENT_DATE
GROUP BY ec.connection_id, ec.connection_name, ec.platform_type, ec.store_url, ec.is_active,
         ec.sync_frequency_minutes, ec.last_sync_at, ec.created_at, ec.updated_at;

-- Sync Errors View
CREATE OR REPLACE VIEW v_ecommerce_sync_errors AS
SELECT
    ec.connection_name,
    ec.platform_type,
    eis.sync_type,
    eis.sku,
    eis.error_message,
    eis.completed_at,
    eos.external_order_id,
    eos.error_message AS order_error,
    ec.webhook_url
FROM ecommerce_connections ec
LEFT JOIN ecommerce_inventory_sync eis ON ec.connection_id = eis.connection_id
    AND eis.sync_status = 'FAILED'
LEFT JOIN ecommerce_order_sync eos ON ec.connection_id = eos.connection_id
    AND eos.sync_status = 'FAILED'
WHERE ec.is_active = TRUE
ORDER BY COALESCE(eis.completed_at, eos.completed_at) DESC NULLS LAST;

-- Pending Sync Queue View
CREATE OR REPLACE VIEW v_ecommerce_pending_sync AS
SELECT
    ec.connection_name,
    ec.platform_type,
    COUNT(DISTINCT epm.mapping_id) FILTER (WHERE epm.sync_status = 'PENDING') AS pending_products,
    COUNT(DISTINCT eis.sync_id) FILTER (WHERE eis.sync_status = 'PENDING') AS pending_inventory,
    COUNT(DISTINCT eos.sync_id) FILTER (WHERE eos.sync_status = 'PENDING') AS pending_orders,
    COUNT(DISTINCT ew.webhook_id) FILTER (WHERE ew.processing_status = 'PENDING') AS pending_webhooks
FROM ecommerce_connections ec
LEFT JOIN ecommerce_product_mapping epm ON ec.connection_id = epm.connection_id
    AND epm.sync_status = 'PENDING'
LEFT JOIN ecommerce_inventory_sync eis ON ec.connection_id = eis.connection_id
    AND eis.sync_status = 'PENDING'
LEFT JOIN ecommerce_order_sync eos ON ec.connection_id = eos.connection_id
    AND eos.sync_status = 'PENDING'
LEFT JOIN ecommerce_webhooks ew ON ec.connection_id = ew.connection_id
    AND ew.processing_status = 'PENDING'
WHERE ec.is_active = TRUE
GROUP BY ec.connection_id, ec.connection_name, ec.platform_type;

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Function to log sync activity
CREATE OR REPLACE FUNCTION log_ecommerce_sync(
    p_connection_id VARCHAR,
    p_sync_type VARCHAR,
    p_resource_type VARCHAR,
    p_resource_count INTEGER DEFAULT 0,
    p_success_count INTEGER DEFAULT 0,
    p_failure_count INTEGER DEFAULT 0,
    p_sync_status VARCHAR DEFAULT 'IN_PROGRESS',
    p_error_summary TEXT,
    p_created_by VARCHAR
) RETURNS VARCHAR AS $$
DECLARE
    v_log_id VARCHAR;
BEGIN
    v_log_id := 'ESYNC-' || TO_CHAR(CURRENT_TIMESTAMP, 'YYYYMMDD-HH24MISS-') || substring(md5(random()::text), 1, 6);

    INSERT INTO ecommerce_sync_logs (
        log_id, connection_id, sync_type, resource_type, resource_count,
        success_count, failure_count, sync_status, error_summary, created_by
    ) VALUES (
        v_log_id, p_connection_id, p_sync_type, p_resource_type, p_resource_count,
        p_success_count, p_failure_count, p_sync_status, p_error_summary, p_created_by
    );

    -- Update connection last_sync_at for completed syncs
    IF p_sync_status = 'COMPLETED' THEN
        UPDATE ecommerce_connections
        SET last_sync_at = NOW()
        WHERE connection_id = p_connection_id;
    END IF;

    RETURN v_log_id;
END;
$$ LANGUAGE plpgsql;

-- Function to record product sync
CREATE OR REPLACE FUNCTION record_product_sync(
    p_connection_id VARCHAR,
    p_sku VARCHAR,
    p_sync_type VARCHAR,
    p_quantity_before INTEGER,
    p_quantity_after INTEGER,
    p_external_quantity_before INTEGER,
    p_status VARCHAR DEFAULT 'PENDING'
) RETURNS VARCHAR AS $$
DECLARE
    v_sync_id VARCHAR;
BEGIN
    v_sync_id := 'PRODSYNC-' || TO_CHAR(CURRENT_TIMESTAMP, 'YYYYMMDD-HH24MISS-') || substring(md5(random()::text), 1, 6);

    INSERT INTO ecommerce_inventory_sync (
        sync_id, connection_id, sku, sync_type, sync_status,
        quantity_before, quantity_after, external_quantity_before,
        external_quantity_after, variance
    ) VALUES (
        v_sync_id, p_connection_id, p_sku, p_sync_type, p_status,
        p_quantity_before, p_quantity_after, p_external_quantity_before,
        p_external_quantity_before, p_quantity_after - p_external_quantity_before
    );

    RETURN v_sync_id;
END;
$$ LANGUAGE plpgsql;

-- Function to test connection
CREATE OR REPLACE FUNCTION test_ecommerce_connection(
    p_connection_id VARCHAR
) RETURNS TABLE(
    success BOOLEAN,
    message TEXT,
    response_time_ms INTEGER,
    platform_info JSONB
) AS $$
BEGIN
    -- This function would make an API call to the e-commerce platform
    -- For now, return placeholder data
    RETURN QUERY SELECT
        TRUE::BOOLEAN as success,
        'Connection test not implemented'::TEXT as message,
        0::INTEGER as response_time_ms,
        '{}'::JSONB as platform_info;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Update timestamp on connection changes
CREATE OR REPLACE FUNCTION update_ecommerce_connection_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_ecommerce_connection_timestamp ON ecommerce_connections;
CREATE TRIGGER trg_update_ecommerce_connection_timestamp
    BEFORE UPDATE ON ecommerce_connections
    FOR EACH ROW
    EXECUTE FUNCTION update_ecommerce_connection_timestamp();

-- ============================================================================
-- SEED DATA
-- ============================================================================

-- Insert example connection types
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM ecommerce_connections LIMIT 1) THEN
        -- No seed data needed - connections will be created by users
        NULL;
    END IF;
END $$;

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO opsui_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO opsui_app;
