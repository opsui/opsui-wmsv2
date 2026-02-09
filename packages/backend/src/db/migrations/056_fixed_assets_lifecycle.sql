-- Migration 056: Fixed Assets Lifecycle
-- Enhanced fixed asset management with maintenance, transfers, disposal, and audit tracking
-- Part of Phase 7: Fixed Assets Lifecycle

-- ============================================================================
-- FIXED ASSETS TABLE ENHANCEMENTS
-- Add additional fields for comprehensive asset tracking
-- ============================================================================

-- Check if fixed_assets table exists, add missing columns if needed
DO $$
BEGIN
    -- Add location tracking
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'fixed_assets' AND column_name = 'location_id'
    ) THEN
        ALTER TABLE fixed_assets ADD COLUMN location_id VARCHAR(20);
        ALTER TABLE fixed_assets ADD COLUMN location_details TEXT;
    END IF;

    -- Add custodian tracking
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'fixed_assets' AND column_name = 'custodian_id'
    ) THEN
        ALTER TABLE fixed_assets ADD COLUMN custodian_id VARCHAR(20);
        ALTER TABLE fixed_assets ADD COLUMN custodian_name VARCHAR(255);
    END IF;

    -- Add warranty and insurance
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'fixed_assets' AND column_name = 'warranty_expiry'
    ) THEN
        ALTER TABLE fixed_assets ADD COLUMN warranty_provider VARCHAR(255);
        ALTER TABLE fixed_assets ADD COLUMN warranty_expiry DATE;
        ALTER TABLE fixed_assets ADD COLUMN insurance_policy_number VARCHAR(100);
        ALTER TABLE fixed_assets ADD COLUMN insurance_expiry DATE;
        ALTER TABLE fixed_assets ADD COLUMN insurance_value DECIMAL(12,2);
    END IF;

    -- Add physical tracking
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'fixed_assets' AND column_name = 'tag_number'
    ) THEN
        ALTER TABLE fixed_assets ADD COLUMN tag_number VARCHAR(100) UNIQUE;
        ALTER TABLE fixed_assets ADD COLUMN barcode VARCHAR(100);
        ALTER TABLE fixed_assets ADD COLUMN qr_code VARCHAR(255);
    END IF;

    -- Add condition and status
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'fixed_assets' AND column_name = 'physical_condition'
    ) THEN
        ALTER TABLE fixed_assets ADD COLUMN physical_condition VARCHAR(50) DEFAULT 'GOOD';
        ALTER TABLE fixed_assets ADD COLUMN last_inspection_date DATE;
        ALTER TABLE fixed_assets ADD COLUMN next_inspection_date DATE;
    END IF;

    -- Add parent asset for component tracking
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'fixed_assets' AND column_name = 'parent_asset_id'
    ) THEN
        ALTER TABLE fixed_assets ADD COLUMN parent_asset_id VARCHAR(20) REFERENCES fixed_assets(asset_id);
    END IF;

    -- Add lease/loan tracking
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'fixed_assets' AND column_name = 'is_leased'
    ) THEN
        ALTER TABLE fixed_assets ADD COLUMN is_leased BOOLEAN DEFAULT FALSE;
        ALTER TABLE fixed_assets ADD COLUMN lease_provider VARCHAR(255);
        ALTER TABLE fixed_assets ADD COLUMN lease_start_date DATE;
        ALTER TABLE fixed_assets ADD COLUMN lease_end_date DATE;
        ALTER TABLE fixed_assets ADD COLUMN lease_monthly_payment DECIMAL(12,2);
    END IF;
END $$;

-- ============================================================================
-- ASSET MAINTENANCE
-- Track scheduled and performed maintenance
-- ============================================================================

CREATE TABLE IF NOT EXISTS asset_maintenance (
    maintenance_id VARCHAR(20) PRIMARY KEY,
    asset_id VARCHAR(20) NOT NULL,
    maintenance_type VARCHAR(50) NOT NULL, -- PREVENTIVE, CORRECTIVE, EMERGENCY, UPGRADE
    description TEXT NOT NULL,
    scheduled_date DATE,
    performed_date DATE,
    performed_by VARCHAR(50),
    cost DECIMAL(12,2),
    vendor_id VARCHAR(20),
    work_order_number VARCHAR(50),
    status VARCHAR(50) DEFAULT 'SCHEDULED', -- SCHEDULED, IN_PROGRESS, COMPLETED, CANCELLED
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    created_by VARCHAR(50),
    FOREIGN KEY (asset_id) REFERENCES fixed_assets(asset_id) ON DELETE CASCADE
);

CREATE INDEX idx_maintenance_asset ON asset_maintenance(asset_id);
CREATE INDEX idx_maintenance_status ON asset_maintenance(status);
CREATE INDEX idx_maintenance_scheduled ON asset_maintenance(scheduled_date) WHERE status = 'SCHEDULED';
CREATE INDEX idx_maintenance_type ON asset_maintenance(maintenance_type);

-- ============================================================================
-- ASSET TRANSFERS
-- Track asset location and ownership transfers
-- ============================================================================

CREATE TABLE IF NOT EXISTS asset_transfers (
    transfer_id VARCHAR(20) PRIMARY KEY,
    asset_id VARCHAR(20) NOT NULL,
    transfer_type VARCHAR(50) NOT NULL, -- LOCATION, CUSTODIAN, DEPARTMENT, ENTITY
    from_location_id VARCHAR(20),
    to_location_id VARCHAR(20),
    from_custodian_id VARCHAR(20),
    to_custodian_id VARCHAR(20),
    from_department VARCHAR(100),
    to_department VARCHAR(100),
    from_entity_id VARCHAR(20),
    to_entity_id VARCHAR(20),
    transfer_date DATE NOT NULL DEFAULT CURRENT_DATE,
    reason TEXT,
    status VARCHAR(50) DEFAULT 'PENDING', -- PENDING, APPROVED, COMPLETED, CANCELLED
    requested_by VARCHAR(50),
    approved_by VARCHAR(50),
    approved_date TIMESTAMP,
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    FOREIGN KEY (asset_id) REFERENCES fixed_assets(asset_id) ON DELETE CASCADE
);

CREATE INDEX idx_transfer_asset ON asset_transfers(asset_id);
CREATE INDEX idx_transfer_status ON asset_transfers(status);
CREATE INDEX idx_transfer_date ON asset_transfers(transfer_date DESC);

-- ============================================================================
-- ASSET DISPOSALS
-- Track asset disposal and retirement
-- ============================================================================

CREATE TABLE IF NOT EXISTS asset_disposals (
    disposal_id VARCHAR(20) PRIMARY KEY,
    asset_id VARCHAR(20) NOT NULL,
    disposal_type VARCHAR(50) NOT NULL, -- SOLD, SCRAPPED, DONATED, LOST, STOLEN, TRADED_IN
    disposal_date DATE NOT NULL,
    disposal_reason TEXT NOT NULL,
    sale_price DECIMAL(12,2),
    sale_buyer VARCHAR(255),
    sale_date DATE,
    scrap_value DECIMAL(12,2),
    donation_recipient VARCHAR(255),
    loss_report_number VARCHAR(50),
    police_report_number VARCHAR(50),
    trade_in_for_asset_id VARCHAR(20),
    net_book_value_at_disposal DECIMAL(12,2),
    gain_loss_amount DECIMAL(12,2),
    status VARCHAR(50) DEFAULT 'PENDING', -- PENDING, APPROVED, COMPLETED
    approved_by VARCHAR(50),
    approved_date TIMESTAMP,
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    created_by VARCHAR(50),
    FOREIGN KEY (asset_id) REFERENCES fixed_assets(asset_id) ON DELETE CASCADE
);

CREATE INDEX idx_disposal_asset ON asset_disposals(asset_id);
CREATE INDEX idx_disposal_date ON asset_disposals(disposal_date DESC);
CREATE INDEX idx_disposal_status ON asset_disposals(status);
CREATE INDEX idx_disposal_type ON asset_disposals(disposal_type);

-- ============================================================================
-- ASSET INSURANCE
-- Detailed insurance tracking for assets
-- ============================================================================

CREATE TABLE IF NOT EXISTS asset_insurance (
    insurance_id VARCHAR(20) PRIMARY KEY,
    asset_id VARCHAR(20) NOT NULL,
    policy_number VARCHAR(100) NOT NULL,
    insurance_provider VARCHAR(255) NOT NULL,
    policy_type VARCHAR(50), -- PROPERTY, LIABILITY, COMPREHENSIVE
    coverage_amount DECIMAL(12,2) NOT NULL,
    premium_amount DECIMAL(12,2),
    premium_frequency VARCHAR(20), -- MONTHLY, QUARTERLY, ANNUALLY
    policy_start_date DATE NOT NULL,
    policy_end_date DATE NOT NULL,
    is_renewable BOOLEAN DEFAULT TRUE,
    deductible_amount DECIMAL(12,2),
    contact_person VARCHAR(255),
    contact_phone VARCHAR(50),
    contact_email VARCHAR(255),
    status VARCHAR(50) DEFAULT 'ACTIVE', -- ACTIVE, EXPIRED, CANCELLED, CLAIM_PENDING
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    FOREIGN KEY (asset_id) REFERENCES fixed_assets(asset_id) ON DELETE CASCADE
);

CREATE INDEX idx_insurance_asset ON asset_insurance(asset_id);
CREATE INDEX idx_insurance_status ON asset_insurance(status);
CREATE INDEX idx_insurance_expiry ON asset_insurance(policy_end_date) WHERE status = 'ACTIVE';

-- ============================================================================
-- DEPRECIATION SCHEDULE ENHANCEMENTS
-- Track depreciation runs and historical data
-- ============================================================================

CREATE TABLE IF NOT EXISTS depreciation_run (
    run_id VARCHAR(20) PRIMARY KEY,
    run_date DATE NOT NULL,
    run_type VARCHAR(50) DEFAULT 'SCHEDULED', -- SCHEDULED, MANUAL, CATCH_UP, REVALUATION
    fiscal_year INTEGER NOT NULL,
    fiscal_period INTEGER,
    status VARCHAR(50) DEFAULT 'PENDING', -- PENDING, IN_PROGRESS, COMPLETED, FAILED
    total_assets_processed INTEGER DEFAULT 0,
    total_depreciation_expense DECIMAL(12,2) DEFAULT 0,
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    error_message TEXT,
    created_by VARCHAR(50),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_depreciation_run_date ON depreciation_run(run_date DESC);
CREATE INDEX idx_depreciation_run_status ON depreciation_run(status);

CREATE TABLE IF NOT EXISTS depreciation_run_details (
    detail_id VARCHAR(20) PRIMARY KEY,
    run_id VARCHAR(20) NOT NULL,
    asset_id VARCHAR(20) NOT NULL,
    depreciation_amount DECIMAL(12,2) NOT NULL,
    accumulated_depreciation_before DECIMAL(12,2),
    accumulated_depreciation_after DECIMAL(12,2),
    net_book_value_before DECIMAL(12,2),
    net_book_value_after DECIMAL(12,2),
    depreciation_method VARCHAR(50),
    useful_life_remaining DECIMAL(5,2),
    created_at TIMESTAMP DEFAULT NOW(),
    FOREIGN KEY (run_id) REFERENCES depreciation_run(run_id) ON DELETE CASCADE,
    FOREIGN KEY (asset_id) REFERENCES fixed_assets(asset_id) ON DELETE CASCADE
);

CREATE INDEX idx_depr_detail_run ON depreciation_run_details(run_id);
CREATE INDEX idx_depr_detail_asset ON depreciation_run_details(asset_id);

-- ============================================================================
-- ASSET AUDITS
-- Track physical asset audits and verifications
-- ============================================================================

CREATE TABLE IF NOT EXISTS asset_audits (
    audit_id VARCHAR(20) PRIMARY KEY,
    audit_name VARCHAR(255) NOT NULL,
    audit_type VARCHAR(50) NOT NULL, -- PHYSICAL, CYCLE_COUNT, FULL, SPOT_CHECK
    scheduled_date DATE NOT NULL,
    completed_date DATE,
    status VARCHAR(50) DEFAULT 'PLANNED', -- PLANNED, IN_PROGRESS, COMPLETED, CANCELLED
    audited_by VARCHAR(50),
    total_assets_to_audit INTEGER DEFAULT 0,
    total_assets_verified INTEGER DEFAULT 0,
    assets_found INTEGER DEFAULT 0,
    assets_not_found INTEGER DEFAULT 0,
    assets_condition_good INTEGER DEFAULT 0,
    assets_condition_fair INTEGER DEFAULT 0,
    assets_condition_poor INTEGER DEFAULT 0,
    discrepancies_found INTEGER DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    created_by VARCHAR(50)
);

CREATE INDEX idx_audit_date ON asset_audits(scheduled_date DESC);
CREATE INDEX idx_audit_status ON asset_audits(status);

CREATE TABLE IF NOT EXISTS asset_audit_details (
    audit_detail_id VARCHAR(20) PRIMARY KEY,
    audit_id VARCHAR(20) NOT NULL,
    asset_id VARCHAR(20) NOT NULL,
    expected_location_id VARCHAR(20),
    expected_custodian_id VARCHAR(20),
    actual_location_id VARCHAR(20),
    actual_custodian_id VARCHAR(20),
    found BOOLEAN,
    physical_condition VARCHAR(50),
    notes TEXT,
    verified_by VARCHAR(50),
    verified_at TIMESTAMP,
    photo_urls TEXT[], -- Array of photo URLs
    FOREIGN KEY (audit_id) REFERENCES asset_audits(audit_id) ON DELETE CASCADE,
    FOREIGN KEY (asset_id) REFERENCES fixed_assets(asset_id) ON DELETE CASCADE
);

CREATE INDEX idx_audit_detail_audit ON asset_audit_details(audit_id);
CREATE INDEX idx_audit_detail_asset ON asset_audit_details(asset_id);

-- ============================================================================
-- VIEWS
-- ============================================================================

-- Assets Requiring Maintenance View
CREATE OR REPLACE VIEW v_assets_requiring_maintenance AS
SELECT
    fa.asset_id,
    fa.asset_code,
    fa.asset_name,
    fa.asset_type,
    fa.location_id,
    fa.physical_condition,
    am.maintenance_id,
    am.maintenance_type,
    am.scheduled_date,
    am.status AS maintenance_status,
    EXTRACT(DAY FROM (am.scheduled_date - CURRENT_DATE)) AS days_until_due,
    CASE
        WHEN am.scheduled_date < CURRENT_DATE THEN 'OVERDUE'
        WHEN am.scheduled_date <= CURRENT_DATE + INTERVAL '7 days' THEN 'URGENT'
        WHEN am.scheduled_date <= CURRENT_DATE + INTERVAL '30 days' THEN 'UPCOMING'
        ELSE 'SCHEDULED'
    END AS urgency
FROM fixed_assets fa
JOIN asset_maintenance am ON fa.asset_id = am.asset_id
WHERE am.status IN ('SCHEDULED', 'OVERDUE')
ORDER BY am.scheduled_date ASC;

-- Assets Due for Inspection View
CREATE OR REPLACE VIEW v_assets_due_inspection AS
SELECT
    asset_id,
    asset_code,
    asset_name,
    asset_type,
    location_id,
    last_inspection_date,
    next_inspection_date,
    EXTRACT(DAY FROM (next_inspection_date - CURRENT_DATE)) AS days_until_inspection,
    physical_condition
FROM fixed_assets
WHERE next_inspection_date IS NOT NULL
  AND next_inspection_date <= CURRENT_DATE + INTERVAL '30 days'
ORDER BY next_inspection_date ASC;

-- Asset Warranty Expiry View
CREATE OR REPLACE VIEW v_warranty_expiry_alerts AS
SELECT
    asset_id,
    asset_code,
    asset_name,
    warranty_provider,
    warranty_expiry,
    EXTRACT(DAY FROM (warranty_expiry - CURRENT_DATE)) AS days_until_expiry,
    CASE
        WHEN warranty_expiry < CURRENT_DATE THEN 'EXPIRED'
        WHEN warranty_expiry <= CURRENT_DATE + INTERVAL '30 days' THEN 'EXPIRING_SOON'
        ELSE 'ACTIVE'
    END AS warranty_status
FROM fixed_assets
WHERE warranty_expiry IS NOT NULL
ORDER BY warranty_expiry ASC;

-- Asset Insurance Expiry View
CREATE OR REPLACE VIEW v_insurance_expiry_alerts AS
SELECT
    ai.insurance_id,
    fa.asset_id,
    fa.asset_code,
    fa.asset_name,
    ai.policy_number,
    ai.insurance_provider,
    ai.policy_end_date,
    ai.coverage_amount,
    EXTRACT(DAY FROM (ai.policy_end_date - CURRENT_DATE)) AS days_until_expiry,
    CASE
        WHEN ai.policy_end_date < CURRENT_DATE THEN 'EXPIRED'
        WHEN ai.policy_end_date <= CURRENT_DATE + INTERVAL '30 days' THEN 'EXPIRING_SOON'
        ELSE 'ACTIVE'
    END AS insurance_status
FROM asset_insurance ai
JOIN fixed_assets fa ON ai.asset_id = fa.asset_id
WHERE ai.status = 'ACTIVE'
ORDER BY ai.policy_end_date ASC;

-- Asset Transfer Summary View
CREATE OR REPLACE VIEW v_asset_transfer_summary AS
SELECT
    fa.asset_id,
    fa.asset_code,
    fa.asset_name,
    fa.asset_type,
    COUNT(at.transfer_id) AS total_transfers,
    MAX(at.transfer_date) AS last_transfer_date,
    at.to_location_id AS current_location,
    at.to_custodian_id AS current_custodian,
    at.to_department AS current_department
FROM fixed_assets fa
LEFT JOIN asset_transfers at ON fa.asset_id = at.asset_id AND at.status = 'COMPLETED'
GROUP BY fa.asset_id, fa.asset_code, fa.asset_name, fa.asset_type, at.to_location_id, at.to_custodian_id, at.to_department;

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Function to calculate net book value
CREATE OR REPLACE FUNCTION calculate_net_book_value(p_asset_id VARCHAR)
RETURNS DECIMAL AS $$
DECLARE
    v_cost DECIMAL;
    v_salvage_value DECIMAL;
    v_accumulated_depreciation DECIMAL;
    v_net_book_value DECIMAL;
BEGIN
    SELECT cost, salvage_value INTO v_cost, v_salvage_value
    FROM fixed_assets
    WHERE asset_id = p_asset_id;

    SELECT COALESCE(SUM(depreciation_amount), 0) INTO v_accumulated_depreciation
    FROM depreciation_run_details
    WHERE asset_id = p_asset_id;

    v_net_book_value := v_cost - v_salvage_value - v_accumulated_depreciation;

    RETURN v_net_book_value;
END;
$$ LANGUAGE plpgsql;

-- Function to schedule next maintenance
CREATE OR REPLACE FUNCTION schedule_next_maintenance(
    p_asset_id VARCHAR,
    p_maintenance_type VARCHAR,
    p_interval_days INTEGER,
    p_description TEXT
) RETURNS VARCHAR AS $$
DECLARE
    v_last_maintenance_date DATE;
    v_next_maintenance_date DATE;
    v_maintenance_id VARCHAR;
BEGIN
    -- Get last maintenance date
    SELECT MAX(performed_date) INTO v_last_maintenance_date
    FROM asset_maintenance
    WHERE asset_id = p_asset_id AND performed_date IS NOT NULL;

    -- If no previous maintenance, use asset purchase date
    IF v_last_maintenance_date IS NULL THEN
        SELECT purchase_date INTO v_last_maintenance_date
        FROM fixed_assets
        WHERE asset_id = p_asset_id;
    END IF;

    -- Calculate next maintenance date
    v_next_maintenance_date := v_last_maintenance_date + (p_interval_days || ' days')::INTERVAL;

    -- Create maintenance record
    v_maintenance_id := 'MAINT-' || TO_CHAR(CURRENT_TIMESTAMP, 'YYYYMMDD-HH24MISS-') || substring(md5(random()::text), 1, 6);

    INSERT INTO asset_maintenance (
        maintenance_id, asset_id, maintenance_type, description,
        scheduled_date, status, created_at
    ) VALUES (
        v_maintenance_id, p_asset_id, p_maintenance_type, p_description,
        v_next_maintenance_date, 'SCHEDULED', NOW()
    );

    -- Update asset next inspection date if preventive maintenance
    IF p_maintenance_type = 'PREVENTIVE' THEN
        UPDATE fixed_assets
        SET next_inspection_date = v_next_maintenance_date
        WHERE asset_id = p_asset_id;
    END IF;

    RETURN v_maintenance_id;
END;
$$ LANGUAGE plpgsql;

-- Function to process asset transfer
CREATE OR REPLACE FUNCTION process_asset_transfer(p_transfer_id VARCHAR)
RETURNS BOOLEAN AS $$
DECLARE
    v_transfer RECORD;
BEGIN
    -- Get transfer details
    SELECT * INTO v_transfer
    FROM asset_transfers
    WHERE transfer_id = p_transfer_id AND status = 'APPROVED';

    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;

    -- Update asset with new location/custodian
    UPDATE fixed_assets
    SET
        location_id = v_transfer.to_location_id,
        custodian_id = v_transfer.to_custodian_id
    WHERE asset_id = v_transfer.asset_id;

    -- Mark transfer as completed
    UPDATE asset_transfers
    SET status = 'COMPLETED'
    WHERE transfer_id = p_transfer_id;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Function to get asset depreciation summary
CREATE OR REPLACE FUNCTION get_asset_depreciation_summary(p_asset_id VARCHAR)
RETURNS TABLE (
    cost DECIMAL,
    salvage_value DECIMAL,
    accumulated_depreciation DECIMAL,
    net_book_value DECIMAL,
    depreciation_to_date DECIMAL,
    depreciation_this_year DECIMAL,
    remaining_life DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        fa.cost,
        fa.salvage_value,
        COALESCE(SUM(drd.accumulated_depreciation_after), 0) AS accumulated_depreciation,
        fa.cost - fa.salvage_value - COALESCE(SUM(drd.accumulated_depreciation_after), 0) AS net_book_value,
        COALESCE(SUM(CASE WHEN dr.fiscal_year = EXTRACT(YEAR FROM CURRENT_DATE)
                       THEN drd.depreciation_amount ELSE 0 END), 0) AS depreciation_this_year,
        fa.useful_life - EXTRACT(YEAR FROM AGE(CURRENT_DATE, fa.purchase_date)) AS remaining_life
    FROM fixed_assets fa
    LEFT JOIN depreciation_run dr ON fa.asset_id = dr.asset_id AND dr.status = 'COMPLETED'
    LEFT JOIN depreciation_run_details drd ON dr.run_id = drd.run_id AND drd.asset_id = fa.asset_id
    WHERE fa.asset_id = p_asset_id
    GROUP BY fa.asset_id, fa.cost, fa.salvage_value, fa.purchase_date, fa.useful_life;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Trigger to update asset status on disposal
CREATE OR REPLACE FUNCTION update_asset_status_on_disposal()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'COMPLETED' THEN
        UPDATE fixed_assets
        SET asset_status = 'DISPOSED',
            disposal_date = NEW.disposal_date
        WHERE asset_id = NEW.asset_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_asset_status_on_disposal ON asset_disposals;
CREATE TRIGGER trg_update_asset_status_on_disposal
    AFTER UPDATE ON asset_disposals
    FOR EACH ROW
    WHEN (OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'COMPLETED')
    EXECUTE FUNCTION update_asset_status_on_disposal();

-- Trigger to update asset location on transfer completion
CREATE OR REPLACE FUNCTION update_asset_location_on_transfer()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'COMPLETED' THEN
        UPDATE fixed_assets
        SET location_id = NEW.to_location_id,
            custodian_id = NEW.to_custodian_id
        WHERE asset_id = NEW.asset_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_asset_location_on_transfer ON asset_transfers;
CREATE TRIGGER trg_update_asset_location_on_transfer
    AFTER UPDATE ON asset_transfers
    FOR EACH ROW
    WHEN (OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'COMPLETED')
    EXECUTE FUNCTION update_asset_location_on_transfer();

-- ============================================================================
-- SEED DATA
-- ============================================================================

-- Insert example maintenance types
INSERT INTO asset_maintenance (maintenance_id, asset_id, maintenance_type, description, scheduled_date, status)
SELECT
    'MAINT-' || TO_CHAR(i, 'FM0000') || '-SEED',
    (SELECT asset_id FROM fixed_assets LIMIT 1),
    'PREVENTIVE',
    'Scheduled preventive maintenance',
    CURRENT_DATE + INTERVAL '30 days',
    'SCHEDULED'
FROM generate_series(1, 5) i
WHERE EXISTS (SELECT 1 FROM fixed_assets)
ON CONFLICT DO NOTHING;

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA public TO opsui_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO opsui_app;
