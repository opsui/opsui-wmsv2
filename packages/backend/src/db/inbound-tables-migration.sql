-- Migration: Inbound Receiving Tables
-- Creates tables for license plates, staging locations, and receiving exceptions

-- ============================================================================
-- LICENSE PLATES
-- ============================================================================

CREATE TABLE IF NOT EXISTS license_plates (
    id SERIAL PRIMARY KEY,
    license_plate_id VARCHAR(50) UNIQUE NOT NULL,
    barcode VARCHAR(100) UNIQUE NOT NULL,
    sku VARCHAR(100) NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 0,
    quantity_putaway INTEGER NOT NULL DEFAULT 0,
    lot_number VARCHAR(100),
    serial_number VARCHAR(100),
    status VARCHAR(50) NOT NULL DEFAULT 'OPEN',
    staging_location_id VARCHAR(50),
    receipt_line_id VARCHAR(50),
    created_by VARCHAR(50) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_license_plates_barcode ON license_plates(barcode);
CREATE INDEX IF NOT EXISTS idx_license_plates_sku ON license_plates(sku);
CREATE INDEX IF NOT EXISTS idx_license_plates_status ON license_plates(status);

-- ============================================================================
-- STAGING LOCATIONS
-- ============================================================================

CREATE TABLE IF NOT EXISTS staging_locations (
    id SERIAL PRIMARY KEY,
    staging_location_id VARCHAR(50) UNIQUE NOT NULL,
    location_code VARCHAR(100) UNIQUE NOT NULL,
    zone VARCHAR(50),
    aisle VARCHAR(50),
    bay VARCHAR(50),
    level VARCHAR(50),
    position VARCHAR(50),
    status VARCHAR(50) NOT NULL DEFAULT 'AVAILABLE',
    capacity INTEGER DEFAULT 100,
    current_utilization INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_staging_locations_code ON staging_locations(location_code);
CREATE INDEX IF NOT EXISTS idx_staging_locations_status ON staging_locations(status);
CREATE INDEX IF NOT EXISTS idx_staging_locations_zone ON staging_locations(zone);

-- ============================================================================
-- RECEIVING EXCEPTIONS
-- ============================================================================

CREATE TABLE IF NOT EXISTS receiving_exceptions (
    id SERIAL PRIMARY KEY,
    exception_id VARCHAR(50) UNIQUE NOT NULL,
    receipt_id VARCHAR(50),
    sku VARCHAR(100) NOT NULL,
    exception_type VARCHAR(100) NOT NULL,
    expected_quantity INTEGER NOT NULL,
    actual_quantity INTEGER NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'OPEN',
    resolution TEXT,
    resolution_notes TEXT,
    created_by VARCHAR(50) NOT NULL,
    resolved_by VARCHAR(50),
    resolved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_receiving_exceptions_id ON receiving_exceptions(exception_id);
CREATE INDEX IF NOT EXISTS idx_receiving_exceptions_status ON receiving_exceptions(status);
CREATE INDEX IF NOT EXISTS idx_receiving_exceptions_type ON receiving_exceptions(exception_type);

-- ============================================================================
-- SEED DEFAULT STAGING LOCATIONS
-- ============================================================================

INSERT INTO staging_locations (staging_location_id, location_code, zone, status, capacity)
VALUES 
    ('STAGE-001', 'STAGING-A1', 'RECEIVING', 'AVAILABLE', 100),
    ('STAGE-002', 'STAGING-A2', 'RECEIVING', 'AVAILABLE', 100),
    ('STAGE-003', 'STAGING-B1', 'RECEIVING', 'AVAILABLE', 100),
    ('STAGE-004', 'STAGING-B2', 'RECEIVING', 'AVAILABLE', 100),
    ('STAGE-005', 'STAGING-C1', 'QC', 'AVAILABLE', 50)
ON CONFLICT (staging_location_id) DO NOTHING;

-- ============================================================================
-- SEED DEFAULT BIN LOCATIONS (for putaway tasks FK)
-- ============================================================================

INSERT INTO bin_locations (bin_location_id, location_code, zone, aisle, bay, level, position, status, capacity)
SELECT 
    'BIN-DEFAULT-' || i,
    'DEFAULT-' || i,
    'STORAGE',
    'A',
    i::text,
    '1',
    '1',
    'AVAILABLE',
    1000
FROM generate_series(1, 10) i
ON CONFLICT (bin_location_id) DO NOTHING;

-- Add a default staging bin if not exists
INSERT INTO bin_locations (bin_location_id, location_code, zone, aisle, bay, level, position, status, capacity)
VALUES ('BIN-STAGING', 'STAGING', 'STAGING', 'S', '0', '0', '0', 'AVAILABLE', 10000)
ON CONFLICT (bin_location_id) DO NOTHING;