-- Migration 058: Advanced Inventory
-- Landed cost, ABC analysis, demand planning, and inventory optimization
-- Part of Phase 9: Advanced Inventory (Weeks 25-26)

-- ============================================================================
-- LANDED COST COMPONENTS
-- Track additional costs that make up the total landed cost of inventory
-- ============================================================================

CREATE TABLE IF NOT EXISTS landed_cost_components (
    component_id VARCHAR(20) PRIMARY KEY,
    receipt_line_id VARCHAR(20),
    component_type VARCHAR(50) NOT NULL, -- FREIGHT, DUTY, INSURANCE, HANDLING, OTHER
    amount DECIMAL(12,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    description TEXT,
    vendor_id VARCHAR(20),
    allocation_method VARCHAR(50) DEFAULT 'PROPORTIONAL', -- PROPORTIONAL, EQUAL, WEIGHT, VOLUME
    reference_document_id VARCHAR(50), -- PO, Invoice, Bill of Lading
    reference_document_number VARCHAR(100),
    created_at TIMESTAMP DEFAULT NOW(),
    created_by VARCHAR(50),
    FOREIGN KEY (receipt_line_id) REFERENCES receipt_lines(receipt_line_id) ON DELETE CASCADE
);

CREATE INDEX idx_landedcost_receipt ON landed_cost_components(receipt_line_id);
CREATE INDEX idx_landedcost_type ON landed_cost_components(component_type);

-- ============================================================================
-- INVENTORY LAYERS
-- Track inventory layers for FIFO/LIFO valuation
-- ============================================================================

CREATE TABLE IF NOT EXISTS inventory_layers (
    layer_id VARCHAR(20) PRIMARY KEY,
    sku VARCHAR(50) NOT NULL,
    receipt_line_id VARCHAR(20),
    transaction_type VARCHAR(50) NOT NULL, -- RECEIPT, TRANSFER, ADJUSTMENT, RETURN
    quantity DECIMAL(10,2) NOT NULL,
    unit_cost DECIMAL(12,2) NOT NULL,
    landed_cost DECIMAL(12,2) DEFAULT 0,
    total_cost DECIMAL(12,2) GENERATED ALWAYS AS (quantity * (unit_cost + landed_cost)) STORED,
    layer_date DATE NOT NULL DEFAULT CURRENT_DATE,
    is_exhausted BOOLEAN DEFAULT FALSE,
    remaining_quantity DECIMAL(10,2) GENERATED ALWAYS AS (
        CASE WHEN is_exhausted THEN 0
        ELSE quantity - COALESCE(
            (SELECT COALESCE(SUM(d.quantity), 0)
             FROM inventory_layer_depletions d
             WHERE d.layer_id = inventory_layers.layer_id), 0
        )
        END
    ) STORED,
    warehouse_location VARCHAR(20),
    reference_document VARCHAR(50),
    reference_type VARCHAR(50), -- PO, TO, ADJUSTMENT
    created_at TIMESTAMP DEFAULT NOW(),
    FOREIGN KEY (sku) REFERENCES products(sku) ON DELETE CASCADE
);

CREATE INDEX idx_invlayer_sku ON inventory_layers(sku);
CREATE INDEX idx_invlayer_date ON inventory_layers(layer_date DESC);
CREATE INDEX idx_invlayer_exhausted ON inventory_layers(is_exhausted) WHERE is_exhausted = FALSE;

-- Track layer depletions for COGS calculation
CREATE TABLE IF NOT EXISTS inventory_layer_depletions (
    depletion_id VARCHAR(20) PRIMARY KEY,
    layer_id VARCHAR(20) NOT NULL,
    sku VARCHAR(50) NOT NULL,
    quantity DECIMAL(10,2) NOT NULL,
    unit_cost DECIMAL(12,2) NOT NULL,
    landed_cost DECIMAL(12,2) DEFAULT 0,
    depletion_date DATE NOT NULL DEFAULT CURRENT_DATE,
    transaction_type VARCHAR(50), -- SHIPMENT, TRANSFER_OUT, ADJUSTMENT, DAMAGE
    reference_document VARCHAR(50),
    created_at TIMESTAMP DEFAULT NOW(),
    FOREIGN KEY (layer_id) REFERENCES inventory_layers(layer_id) ON DELETE CASCADE,
    FOREIGN KEY (sku) REFERENCES products(sku) ON DELETE CASCADE
);

CREATE INDEX idx_depletion_layer ON inventory_layer_depletions(layer_id);
CREATE INDEX idx_depletion_sku ON inventory_layer_depletions(sku);
CREATE INDEX idx_depletion_date ON inventory_layer_depletions(depletion_date DESC);

-- ============================================================================
-- ABC ANALYSIS
-- Pareto analysis for inventory classification and management
-- ============================================================================

CREATE TABLE IF NOT EXISTS abc_analysis (
    analysis_id VARCHAR(20) PRIMARY KEY,
    analysis_name VARCHAR(255) NOT NULL,
    analysis_date DATE NOT NULL DEFAULT CURRENT_DATE,
    period_start_date DATE NOT NULL,
    period_end_date DATE NOT NULL,
    classification_method VARCHAR(50) DEFAULT 'ANNUAL_USAGE', -- ANNUAL_USAGE, TURNOVER, MARGIN
    a_threshold DECIMAL(5,2) DEFAULT 80.00, -- Cumulative % for A items
    b_threshold DECIMAL(5,2) DEFAULT 95.00, -- Cumulative % for B items
    total_skus_analyzed INTEGER DEFAULT 0,
    total_usage_value DECIMAL(15,2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    created_by VARCHAR(50)
);

CREATE TABLE IF NOT EXISTS abc_analysis_details (
    detail_id VARCHAR(20) PRIMARY KEY,
    analysis_id VARCHAR(20) NOT NULL,
    sku VARCHAR(50) NOT NULL,
    abc_class VARCHAR(1) NOT NULL, -- A, B, C, D (Dead)
    annual_usage_quantity DECIMAL(10,2),
    annual_usage_value DECIMAL(12,2),
    unit_cost DECIMAL(12,2),
    cumulative_percentage DECIMAL(5,2),
    contribution_to_total DECIMAL(5,2),
    turnover_ratio DECIMAL(10,2),
    days_inventory_outstanding INTEGER,
    previous_class VARCHAR(1),
    class_change VARCHAR(20), -- UPGRADED, DOWNGRADED, SAME, NEW
    FOREIGN KEY (analysis_id) REFERENCES abc_analysis(analysis_id) ON DELETE CASCADE,
    FOREIGN KEY (sku) REFERENCES products(sku) ON DELETE CASCADE
);

CREATE INDEX idx_abcdetail_analysis ON abc_analysis_details(analysis_id);
CREATE INDEX idx_bcetail_sku ON abc_analysis_details(sku);
CREATE INDEX idx_abcdetail_class ON abc_analysis_details(abc_class);

-- ============================================================================
-- DEMAND FORECASTING
-- Historical data and forecasted demand
-- ============================================================================

CREATE TABLE IF NOT EXISTS demand_forecasts (
    forecast_id VARCHAR(20) PRIMARY KEY,
    forecast_name VARCHAR(255) NOT NULL,
    forecast_type VARCHAR(50) NOT NULL, -- SKU, LOCATION, CATEGORY, CUSTOMER
    forecast_method VARCHAR(50) DEFAULT 'MOVING_AVERAGE', -- MOVING_AVERAGE, EXPONENTIAL_SMOOTHING, TREND, SEASONAL, ML
    period_type VARCHAR(20) DEFAULT 'WEEKLY', -- DAILY, WEEKLY, MONTHLY, QUARTERLY
    forecast_horizon_weeks INTEGER DEFAULT 12,
    historical_periods_used INTEGER DEFAULT 12,
    confidence_level DECIMAL(5,2) DEFAULT 0.95,
    created_at TIMESTAMP DEFAULT NOW(),
    created_by VARCHAR(50)
);

CREATE TABLE IF NOT EXISTS demand_forecast_details (
    detail_id VARCHAR(20) PRIMARY KEY,
    forecast_id VARCHAR(20) NOT NULL,
    sku VARCHAR(50) NOT NULL,
    location_id VARCHAR(20),
    forecast_period_start DATE NOT NULL,
    forecast_period_end DATE NOT NULL,
    forecast_quantity DECIMAL(10,2) NOT NULL,
    lower_bound_quantity DECIMAL(10,2), -- Based on confidence level
    upper_bound_quantity DECIMAL(10,2),
    actual_quantity DECIMAL(10,2), -- Filled in after period ends
    forecast_accuracy DECIMAL(5,2), -- Calculated after actuals are known
    seasonality_factor DECIMAL(5,2),
    trend_factor DECIMAL(5,2),
    foreign_sku_id VARCHAR(50), -- For related products
    created_at TIMESTAMP DEFAULT NOW(),
    FOREIGN KEY (forecast_id) REFERENCES demand_forecasts(forecast_id) ON DELETE CASCADE,
    FOREIGN KEY (sku) REFERENCES products(sku) ON DELETE CASCADE
);

CREATE INDEX idx_forecastdetail_id ON demand_forecast_details(forecast_id);
CREATE INDEX idx_forecastdetail_sku ON demand_forecast_details(sku);
CREATE INDEX idx_forecastdetail_period ON demand_forecast_details(forecast_period_start);

-- Historical demand data for forecasting
CREATE TABLE IF NOT EXISTS demand_history (
    history_id VARCHAR(20) PRIMARY KEY,
    sku VARCHAR(50) NOT NULL,
    location_id VARCHAR(20),
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    period_type VARCHAR(20) NOT NULL, -- DAILY, WEEKLY, MONTHLY
    quantity_demanded DECIMAL(10,2) NOT NULL,
    quantity_shipped DECIMAL(10,2),
    quantity_backordered DECIMAL(10,2),
    revenue DECIMAL(12,2),
    unique_orders INTEGER DEFAULT 0,
    average_order_quantity DECIMAL(10,2),
    seasonality_factor DECIMAL(5,2),
    created_at TIMESTAMP DEFAULT NOW(),
    FOREIGN KEY (sku) REFERENCES products(sku) ON DELETE CASCADE,
    UNIQUE (sku, location_id, period_start, period_type)
);

CREATE INDEX idx_demandhist_sku ON demand_history(sku);
CREATE INDEX idx_demandhist_period ON demand_history(period_start DESC);

-- ============================================================================
-- CYCLE COUNT OPTIMIZATION
-- Optimized cycle count scheduling based on ABC and velocity
-- ============================================================================

CREATE TABLE IF NOT EXISTS cycle_count_optimization (
    optimization_id VARCHAR(20) PRIMARY KEY,
    optimization_name VARCHAR(255) NOT NULL,
    optimization_date DATE NOT NULL DEFAULT CURRENT_DATE,
    optimization_strategy VARCHAR(50) DEFAULT 'ABC_BASED', -- ABC_BASED, RANDOM, VELOCITY, LOCATION, ZONE
    count_frequency_a INTEGER DEFAULT 30, -- Days between counts for A items
    count_frequency_b INTEGER DEFAULT 60, -- Days between counts for B items
    count_frequency_c INTEGER DEFAULT 90, -- Days between counts for C items
    total_items_to_count INTEGER DEFAULT 0,
    estimated_hours DECIMAL(8,2),
    target_accuracy DECIMAL(5,2) DEFAULT 0.98,
    resource_constraints JSONB, -- Available counters, hours, etc
    created_at TIMESTAMP DEFAULT NOW(),
    created_by VARCHAR(50)
);

CREATE TABLE IF NOT EXISTS cycle_count_schedule (
    schedule_id VARCHAR(20) PRIMARY KEY,
    optimization_id VARCHAR(20),
    sku VARCHAR(50) NOT NULL,
    location_id VARCHAR(20),
    priority VARCHAR(20) NOT NULL, -- HIGH, MEDIUM, LOW
    planned_count_date DATE NOT NULL,
    estimated_minutes INTEGER,
    last_count_date DATE,
    days_since_last_count INTEGER,
    count_frequency_days INTEGER,
    velocity_impact DECIMAL(5,2), -- Higher = faster moving
    accuracy_impact DECIMAL(5,2), -- Higher = more valuable to count
    abc_class VARCHAR(1),
    status VARCHAR(20) DEFAULT 'PENDING', -- PENDING, ASSIGNED, IN_PROGRESS, COMPLETED, SKIPPED
    assigned_to VARCHAR(50),
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    FOREIGN KEY (optimization_id) REFERENCES cycle_count_optimization(optimization_id) ON DELETE CASCADE,
    FOREIGN KEY (sku) REFERENCES products(sku) ON DELETE CASCADE
);

CREATE INDEX idx_cyclesched_opt ON cycle_count_schedule(optimization_id);
CREATE INDEX idx_cyclesched_date ON cycle_count_schedule(planned_count_date);
CREATE INDEX idx_cyclesched_status ON cycle_count_schedule(status);
CREATE INDEX idx_cyclesched_priority ON cycle_count_schedule(priority);

-- ============================================================================
-- SAFETY STOCK CALCULATION
-- Calculate and maintain optimal safety stock levels
-- ============================================================================

CREATE TABLE IF NOT EXISTS safety_stock_levels (
    safety_stock_id VARCHAR(20) PRIMARY KEY,
    sku VARCHAR(50) NOT NULL,
    location_id VARCHAR(20),
    calculation_method VARCHAR(50) DEFAULT 'SERVICE_LEVEL', -- SERVICE_LEVEL, FIXED_PERIOD, MIN_MAX
    lead_time_days DECIMAL(8,2) NOT NULL,
    demand_standard_deviation DECIMAL(12,2),
    lead_time_standard_deviation DECIMAL(8,2),
    service_level_target DECIMAL(5,2) DEFAULT 0.95,
    safety_stock_quantity DECIMAL(10,2) NOT NULL,
    reorder_point DECIMAL(12,2), -- Safety stock + (daily demand * lead time)
    min_order_quantity DECIMAL(10,2),
    max_order_quantity DECIMAL(10,2),
    order_quantity_multiple DECIMAL(10,2),
    last_calculated_at TIMESTAMP DEFAULT NOW(),
    calculated_by VARCHAR(50), -- SYSTEM or user ID
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    FOREIGN KEY (sku) REFERENCES products(sku) ON DELETE CASCADE
);

CREATE INDEX idx_safetystock_sku ON safety_stock_levels(sku);
CREATE INDEX idx_safetystock_location ON safety_stock_levels(location_id);

-- ============================================================================
-- REORDER POINT CALCULATION LOG
-- Track recalculations and changes to reorder points
-- ============================================================================

CREATE TABLE IF NOT EXISTS reorder_point_history (
    history_id VARCHAR(20) PRIMARY KEY,
    sku VARCHAR(50) NOT NULL,
    location_id VARCHAR(20),
    old_reorder_point DECIMAL(12,2),
    new_reorder_point DECIMAL(12,2),
    old_safety_stock DECIMAL(10,2),
    new_safety_stock DECIMAL(10,2),
    change_reason VARCHAR(100),
    calculation_method VARCHAR(50),
    changed_by VARCHAR(50),
    changed_at TIMESTAMP DEFAULT NOW(),
    FOREIGN KEY (sku) REFERENCES products(sku) ON DELETE CASCADE
);

CREATE INDEX idx_reorderhist_sku ON reorder_point_history(sku);
CREATE INDEX idx_reorderhist_date ON reorder_point_history(changed_at DESC);

-- ============================================================================
-- INVESTMENT ANALYSIS
-- Track inventory investment and performance metrics
-- ============================================================================

CREATE TABLE IF NOT EXISTS inventory_investment (
    analysis_id VARCHAR(20) PRIMARY KEY,
    analysis_date DATE NOT NULL DEFAULT CURRENT_DATE,
    period_type VARCHAR(20) DEFAULT 'MONTHLY',
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    total_investment DECIMAL(15,2) NOT NULL,
    fast_moving_investment DECIMAL(15,2),
    slow_moving_investment DECIMAL(15,2),
    obsolete_investment DECIMAL(15,2),
    total_skus INTEGER DEFAULT 0,
    fast_moving_skus INTEGER DEFAULT 0,
    slow_moving_skus INTEGER DEFAULT 0,
    obsolete_skus INTEGER DEFAULT 0,
    investment_turnover DECIMAL(10,2),
    gmri DECIMAL(10,2), -- Gross Margin Return on Investment
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS inventory_investment_details (
    detail_id VARCHAR(20) PRIMARY KEY,
    analysis_id VARCHAR(20) NOT NULL,
    sku VARCHAR(50) NOT NULL,
    inventory_value DECIMAL(12,2) NOT NULL,
    quantity_on_hand DECIMAL(10,2),
    unit_cost DECIMAL(12,2),
    days_since_last_movement INTEGER,
    velocity_category VARCHAR(20), -- FAST, SLOW, OBSOLETE, DEAD
    turnover_ratio DECIMAL(10,2),
    gmri DECIMAL(10,2),
    carrying_cost_annual DECIMAL(12,2),
    opportunity_cost DECIMAL(12,2),
    FOREIGN KEY (analysis_id) REFERENCES inventory_investment(analysis_id) ON DELETE CASCADE,
    FOREIGN KEY (sku) REFERENCES products(sku) ON DELETE CASCADE
);

CREATE INDEX idx_investdetail_analysis ON inventory_investment_details(analysis_id);
CREATE INDEX idx_investdetail_sku ON inventory_investment_details(sku);

-- ============================================================================
-- VIEWS
-- ============================================================================

-- Inventory Layers Summary View
CREATE OR REPLACE VIEW v_inventory_layers_summary AS
SELECT
    sku,
    COUNT(*) as total_layers,
    SUM(CASE WHEN NOT is_exhausted THEN remaining_quantity ELSE 0 END) as available_quantity,
    SUM(total_cost) as total_layer_cost,
    AVG(unit_cost + landed_cost) as weighted_avg_cost,
    MIN(layer_date) as oldest_layer_date,
    MAX(layer_date) as newest_layer_date
FROM inventory_layers
GROUP BY sku;

-- ABC Analysis Summary View
CREATE OR REPLACE VIEW v_abc_analysis_summary AS
SELECT
    analysis_id,
    analysis_date,
    COUNT(DISTINCT CASE WHEN abc_class = 'A' THEN sku END) as count_a,
    COUNT(DISTINCT CASE WHEN abc_class = 'B' THEN sku END) as count_b,
    COUNT(DISTINCT CASE WHEN abc_class = 'C' THEN sku END) as count_c,
    COUNT(DISTINCT CASE WHEN abc_class = 'D' THEN sku END) as count_d,
    SUM(CASE WHEN abc_class = 'A' THEN annual_usage_value ELSE 0 END) as value_a,
    SUM(CASE WHEN abc_class = 'B' THEN annual_usage_value ELSE 0 END) as value_b,
    SUM(CASE WHEN abc_class = 'C' THEN annual_usage_value ELSE 0 END) as value_c,
    total_usage_value
FROM abc_analysis_details
GROUP BY analysis_id, analysis_date, total_usage_value;

-- Slow Moving Inventory View
CREATE OR REPLACE VIEW v_slow_moving_inventory AS
SELECT
    i.sku,
    p.product_name,
    i.quantity,
    i.bin_location,
    COALESCE(il.weighted_avg_cost, p.unit_cost) as unit_cost,
    (i.quantity * COALESCE(il.weighted_avg_cost, p.unit_cost)) as inventory_value,
    COALESCE(dh.days_since_last_movement, 365) as days_since_movement,
    CASE
        WHEN COALESCE(dh.days_since_last_movement, 365) > 180 THEN 'OBSOLETE'
        WHEN COALESCE(dh.days_since_last_movement, 365) > 90 THEN 'SLOW'
        ELSE 'ACTIVE'
    END as velocity_status
FROM inventory i
JOIN products p ON i.sku = p.sku
LEFT JOIN v_inventory_layers_summary il ON i.sku = il.sku
LEFT JOIN LATERAL (
    SELECT EXTRACT(DAY FROM AGE(CURRENT_DATE, MAX(shipped_date))) as days_since_last_movement
    FROM (
        SELECT shipped.shipped_date
        FROM shipments s
        JOIN shipment_lines sl ON s.shipment_id = sl.shipment_id
        WHERE sl.sku = i.sku
        ORDER BY s.shipped_date DESC
        LIMIT 1
    ) shipped
) dh ON true
WHERE i.quantity > 0
ORDER BY days_since_movement DESC;

-- Safety Stock Alert View
CREATE OR REPLACE VIEW v_safety_stock_alerts AS
SELECT
    i.sku,
    p.product_name,
    i.quantity as current_quantity,
    ss.safety_stock_quantity as safety_stock,
    ss.reorder_point,
    i.quantity - ss.safety_stock_quantity as variance,
    CASE
        WHEN i.quantity <= ss.reorder_point THEN 'CRITICAL'
        WHEN i.quantity <= ss.safety_stock_quantity THEN 'WARNING'
        ELSE 'OK'
    END as alert_status
FROM inventory i
JOIN products p ON i.sku = p.sku
LEFT JOIN safety_stock_levels ss ON i.sku = ss.sku
WHERE i.quantity > 0
ORDER BY
    CASE
        WHEN i.quantity <= ss.reorder_point THEN 1
        WHEN i.quantity <= ss.safety_stock_quantity THEN 2
        ELSE 3
    END,
    (i.quantity - ss.safety_stock_quantity) ASC;

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Function to calculate landed cost for a receipt line
CREATE OR REPLACE FUNCTION calculate_landed_cost(
    p_receipt_line_id VARCHAR
) RETURNS TABLE (
    receipt_line_id VARCHAR,
    base_cost DECIMAL,
    landed_cost DECIMAL,
    total_cost DECIMAL
) AS $$
DECLARE
    v_base_cost DECIMAL;
    v_landed_cost DECIMAL;
BEGIN
    -- Get base cost from receipt line
    SELECT unit_cost INTO v_base_cost
    FROM receipt_lines
    WHERE receipt_line_id = p_receipt_line_id;

    -- Sum all landed cost components
    SELECT COALESCE(SUM(amount), 0) INTO v_landed_cost
    FROM landed_cost_components
    WHERE receipt_line_id = p_receipt_line_id;

    RETURN QUERY
    SELECT
        p_receipt_line_id,
        v_base_cost,
        v_landed_cost,
        v_base_cost + v_landed_cost as total_cost;
END;
$$ LANGUAGE plpgsql;

-- Function to create ABC analysis
CREATE OR REPLACE FUNCTION run_abc_analysis(
    p_analysis_name VARCHAR,
    p_period_start DATE,
    p_period_end DATE,
    p_a_threshold DECIMAL DEFAULT 80,
    p_b_threshold DECIMAL DEFAULT 95,
    p_created_by VARCHAR
) RETURNS VARCHAR AS $$
DECLARE
    v_analysis_id VARCHAR;
    v_total_value DECIMAL;
    v_cumulative_value DECIMAL := 0;
    v_sku_count INTEGER := 0;
BEGIN
    v_analysis_id := 'ABC-' || TO_CHAR(CURRENT_TIMESTAMP, 'YYYYMMDD-HH24MISS-') || substring(md5(random()::text), 1, 6);

    -- Create analysis header
    INSERT INTO abc_analysis (
        analysis_id, analysis_name, period_start_date, period_end_date,
        a_threshold, b_threshold, created_by
    ) VALUES (
        v_analysis_id, p_analysis_name, p_period_start, p_period_end,
        p_a_threshold, p_b_threshold, p_created_by
    );

    -- Get total usage value for all SKUs
    SELECT COALESCE(SUM(quantity * COALESCE(il.unit_cost + il.landed_cost, p.unit_cost)), 0)
    INTO v_total_value
    FROM demand_history dh
    JOIN products p ON dh.sku = p.sku
    LEFT JOIN inventory_layers il ON dh.sku = il.sku AND il.layer_date <= dh.period_end
    WHERE dh.period_start >= p_period_start AND dh.period_end <= p_period_end;

    -- Create analysis details with ABC classification
    INSERT INTO abc_analysis_details (
        detail_id, analysis_id, sku, abc_class, annual_usage_value,
        cumulative_percentage, contribution_to_total
    )
    SELECT
        'ABCD-' || TO_CHAR(CURRENT_TIMESTAMP, 'YYYYMMDD-HH24MISS-') || row_number() OVER () as detail_id,
        v_analysis_id,
        sku_usage.sku,
        CASE
            WHEN (cumulative_value / v_total_value * 100) <= p_a_threshold THEN 'A'
            WHEN (cumulative_value / v_total_value * 100) <= p_b_threshold THEN 'B'
            WHEN annual_usage_value > 0 THEN 'C'
            ELSE 'D'
        END as abc_class,
        annual_usage_value,
        (cumulative_value / v_total_value * 100) as cumulative_percentage,
        (annual_usage_value / v_total_value * 100) as contribution_to_total
    FROM (
        SELECT
            sku_usage.*,
            SUM(annual_usage_value) OVER (ORDER BY annual_usage_value DESC) as cumulative_value
        FROM (
            SELECT
                dh.sku,
                SUM(dh.quantity_demanded * COALESCE(il.unit_cost + il.landed_cost, p.unit_cost)) as annual_usage_value
            FROM demand_history dh
            JOIN products p ON dh.sku = p.sku
            LEFT JOIN inventory_layers il ON dh.sku = il.sku AND il.layer_date <= dh.period_end
            WHERE dh.period_start >= p_period_start AND dh.period_end <= p_period_end
            GROUP BY dh.sku
        ) sku_usage
    ) sku_usage;

    -- Update analysis header
    UPDATE abc_analysis
    SET total_skus_analyzed = (SELECT COUNT(*) FROM abc_analysis_details WHERE analysis_id = v_analysis_id),
        total_usage_value = v_total_value
    WHERE analysis_id = v_analysis_id;

    RETURN v_analysis_id;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate safety stock
CREATE OR REPLACE FUNCTION calculate_safety_stock(
    p_sku VARCHAR,
    p_service_level DECIMAL DEFAULT 0.95,
    p_lead_time_days DECIMAL,
    p_demand_std_dev DECIMAL,
    p_lead_time_std_dev DECIMAL
) RETURNS DECIMAL AS $$
DECLARE
    v_z_score DECIMAL;
    v_safety_stock DECIMAL;
BEGIN
    -- Get Z-score for service level (simplified approximation)
    -- For 95% service level, z ≈ 1.645
    v_z_score := CASE
        WHEN p_service_level >= 0.99 THEN 2.33
        WHEN p_service_level >= 0.95 THEN 1.645
        WHEN p_service_level >= 0.90 THEN 1.28
        WHEN p_service_level >= 0.85 THEN 1.04
        ELSE 0.84
    END;

    -- Safety stock = Z * sqrt((LT * σd²) + (D² * σLT²))
    -- Simplified: safety_stock = Z * demand_std_dev * sqrt(lead_time)
    v_safety_stock := v_z_score * p_demand_std_dev * SQRT(p_lead_time_days);

    RETURN v_safety_stock;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Trigger to update inventory layer when depleted
CREATE OR REPLACE FUNCTION update_layer_exhaustion()
RETURNS TRIGGER AS $$
BEGIN
    -- Check if layer is now exhausted
    IF EXISTS (
        SELECT 1 FROM inventory_layers il
        WHERE il.layer_id = NEW.layer_id
          AND il.remaining_quantity <= 0
    ) THEN
        UPDATE inventory_layers
        SET is_exhausted = TRUE
        WHERE layer_id = NEW.layer_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_layer_exhaustion ON inventory_layer_depletions;
CREATE TRIGGER trg_update_layer_exhaustion
    AFTER INSERT ON inventory_layer_depletions
    FOR EACH ROW
    EXECUTE FUNCTION update_layer_exhaustion();

-- Trigger to update safety stock updated timestamp
CREATE OR REPLACE FUNCTION update_safety_stock_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_safety_stock_timestamp ON safety_stock_levels;
CREATE TRIGGER trg_update_safety_stock_timestamp
    BEFORE UPDATE ON safety_stock_levels
    FOR EACH ROW
    EXECUTE FUNCTION update_safety_stock_timestamp();

-- ============================================================================
-- SEED DATA
-- ============================================================================

-- Insert sample ABC analysis if none exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM abc_analysis LIMIT 1) THEN
        INSERT INTO abc_analysis (
            analysis_id, analysis_name, analysis_date,
            period_start_date, period_end_date, a_threshold, b_threshold
        ) VALUES (
            'ABC-SEED-001', 'Initial ABC Analysis', CURRENT_DATE,
            CURRENT_DATE - INTERVAL '12 months', CURRENT_DATE, 80, 95
        );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM cycle_count_optimization LIMIT 1) THEN
        INSERT INTO cycle_count_optimization (
            optimization_id, optimization_name, optimization_date,
            count_frequency_a, count_frequency_b, count_frequency_c
        ) VALUES (
            'CCOPT-SEED-001', 'Initial Cycle Count Plan', CURRENT_DATE,
            30, 60, 90
        );
    END IF;
END $$;

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO opsui_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO opsui_app;
