-- Migration 055: Sales Order Workflow
-- Enhanced sales order management with workflow, backorders, commissions, and territories
-- Part of Phase 6: Sales Order Management

-- ============================================================================
-- SALES ORDERS ENHANCEMENTS
-- Add workflow and status tracking to sales orders
-- ============================================================================

-- Check if sales_orders table exists, if not create minimal version
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'sales_orders') THEN
        CREATE TABLE sales_orders (
            order_id VARCHAR(20) PRIMARY KEY,
            entity_id VARCHAR(20),
            customer_id VARCHAR(20) NOT NULL,
            order_number VARCHAR(50) UNIQUE NOT NULL,
            order_date DATE NOT NULL DEFAULT CURRENT_DATE,
            order_status VARCHAR(50) NOT NULL DEFAULT 'DRAFT',
            warehouse_id VARCHAR(20),
            shipping_method_id VARCHAR(20),
            payment_terms VARCHAR(50) DEFAULT 'NET30',
            currency VARCHAR(3) DEFAULT 'NZD',
            exchange_rate DECIMAL(12,6) DEFAULT 1.0,
            subtotal DECIMAL(12,2) DEFAULT 0,
            discount_amount DECIMAL(12,2) DEFAULT 0,
            discount_percent DECIMAL(5,2) DEFAULT 0,
            tax_amount DECIMAL(12,2) DEFAULT 0,
            shipping_amount DECIMAL(12,2) DEFAULT 0,
            total_amount DECIMAL(12,2) DEFAULT 0,
            customer_po_number VARCHAR(50),
            requested_date DATE,
            promised_date DATE,
            ship_date DATE,
            tracking_number VARCHAR(100),
            notes TEXT,
            internal_notes TEXT,
            created_at TIMESTAMP DEFAULT NOW(),
            created_by VARCHAR(50),
            updated_at TIMESTAMP DEFAULT NOW(),
            FOREIGN KEY (entity_id) REFERENCES entities(entity_id),
            FOREIGN KEY (customer_id) REFERENCES customers(customer_id),
            FOREIGN KEY (warehouse_id) REFERENCES warehouses(warehouse_id)
        );
    END IF;
END $$;

-- Add workflow columns if they don't exist
DO $$
BEGIN
    -- Add sales person
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'sales_orders' AND column_name = 'sales_person_id'
    ) THEN
        ALTER TABLE sales_orders ADD COLUMN sales_person_id VARCHAR(20);
        ALTER TABLE sales_orders ADD CONSTRAINT fk_sales_person
            FOREIGN KEY (sales_person_id) REFERENCES employees(employee_id);
    END IF;

    -- Add territory
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'sales_orders' AND column_name = 'territory_id'
    ) THEN
        ALTER TABLE sales_orders ADD COLUMN territory_id VARCHAR(20);
    END IF;

    -- Add commission fields
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'sales_orders' AND column_name = 'commission_rate'
    ) THEN
        ALTER TABLE sales_orders ADD COLUMN commission_rate DECIMAL(5,2) DEFAULT 0;
        ALTER TABLE sales_orders ADD COLUMN commission_amount DECIMAL(12,2) DEFAULT 0;
        ALTER TABLE sales_orders ADD COLUMN commission_paid BOOLEAN DEFAULT FALSE;
    END IF;

    -- Add approval fields
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'sales_orders' AND column_name = 'requires_approval'
    ) THEN
        ALTER TABLE sales_orders ADD COLUMN requires_approval BOOLEAN DEFAULT FALSE;
        ALTER TABLE sales_orders ADD COLUMN approval_status VARCHAR(50) DEFAULT 'PENDING';
        ALTER TABLE sales_orders ADD COLUMN approved_by VARCHAR(50);
        ALTER TABLE sales_orders ADD COLUMN approved_date TIMESTAMP;
        ALTER TABLE sales_orders ADD COLUMN approval_notes TEXT;
    END IF;

    -- Add source channel
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'sales_orders' AND column_name = 'source_channel'
    ) THEN
        ALTER TABLE sales_orders ADD COLUMN source_channel VARCHAR(50);
        ALTER TABLE sales_orders ADD COLUMN ecommerce_order_id VARCHAR(50);
    END IF;

    -- Add backorder reference
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'sales_orders' AND column_name = 'original_order_id'
    ) THEN
        ALTER TABLE sales_orders ADD COLUMN original_order_id VARCHAR(20);
        ALTER TABLE sales_orders ADD COLUMN is_backorder BOOLEAN DEFAULT FALSE;
    END IF;
END $$;

-- ============================================================================
-- SALES ORDER LINES
-- Line items for sales orders
-- ============================================================================

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'sales_order_lines') THEN
        CREATE TABLE sales_order_lines (
            line_id VARCHAR(20) PRIMARY KEY,
            order_id VARCHAR(20) NOT NULL,
            line_number INTEGER NOT NULL,
            sku VARCHAR(50) NOT NULL,
            description TEXT,
            quantity DECIMAL(10,2) NOT NULL,
            unit_price DECIMAL(12,2) NOT NULL,
            discount_percent DECIMAL(5,2) DEFAULT 0,
            discount_amount DECIMAL(12,2) DEFAULT 0,
            tax_code VARCHAR(20),
            tax_rate DECIMAL(5,2) DEFAULT 0,
            tax_amount DECIMAL(12,2) DEFAULT 0,
            line_total DECIMAL(12,2) NOT NULL,
            quantity_picked DECIMAL(10,2) DEFAULT 0,
            quantity_shipped DECIMAL(10,2) DEFAULT 0,
            quantity_invoiced DECIMAL(10,2) DEFAULT 0,
            quantity_backordered DECIMAL(10,2) DEFAULT 0,
            status VARCHAR(50) DEFAULT 'PENDING',
            notes TEXT,
            created_at TIMESTAMP DEFAULT NOW(),
            FOREIGN KEY (order_id) REFERENCES sales_orders(order_id) ON DELETE CASCADE,
            UNIQUE (order_id, line_number)
        );

        CREATE INDEX idx_sol_order ON sales_order_lines(order_id);
        CREATE INDEX idx_sol_sku ON sales_order_lines(sku);
        CREATE INDEX idx_sol_status ON sales_order_lines(status);
    END IF;
END $$;

-- ============================================================================
-- BACKORDERS
-- Track backordered items and their fulfillment
-- ============================================================================

CREATE TABLE IF NOT EXISTS backorders (
    backorder_id VARCHAR(20) PRIMARY KEY,
    original_order_id VARCHAR(20) NOT NULL,
    original_line_id VARCHAR(20),
    order_id VARCHAR(20) NOT NULL,
    sku VARCHAR(50) NOT NULL,
    description TEXT,
    quantity_original DECIMAL(10,2) NOT NULL,
    quantity_outstanding DECIMAL(10,2) NOT NULL,
    quantity_fulfilled DECIMAL(10,2) DEFAULT 0,
    promised_date DATE,
    customer_id VARCHAR(20) NOT NULL,
    status VARCHAR(50) DEFAULT 'OPEN',
    priority INTEGER DEFAULT 5,
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    fulfilled_date TIMESTAMP,
    FOREIGN KEY (original_order_id) REFERENCES sales_orders(order_id),
    FOREIGN KEY (order_id) REFERENCES sales_orders(order_id),
    FOREIGN KEY (customer_id) REFERENCES customers(customer_id)
);

CREATE INDEX idx_backorder_customer ON backorders(customer_id);
CREATE INDEX idx_backorder_status ON backorders(status);
CREATE INDEX idx_backorder_sku ON backorders(sku);
CREATE INDEX idx_backorder_promised ON backorders(promised_date) WHERE status = 'OPEN';

-- ============================================================================
-- SALES COMMISSIONS
-- Track sales commissions for sales people
-- ============================================================================

CREATE TABLE IF NOT EXISTS sales_commissions (
    commission_id VARCHAR(20) PRIMARY KEY,
    order_id VARCHAR(20) NOT NULL,
    line_id VARCHAR(20),
    sales_person_id VARCHAR(20) NOT NULL,
    commission_date DATE NOT NULL,
    transaction_type VARCHAR(50) NOT NULL,
    base_amount DECIMAL(12,2) NOT NULL,
    commission_rate DECIMAL(5,2) NOT NULL,
    commission_amount DECIMAL(12,2) NOT NULL,
    status VARCHAR(50) DEFAULT 'EARNED',
    paid_date DATE,
    payment_id VARCHAR(20),
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    FOREIGN KEY (order_id) REFERENCES sales_orders(order_id),
    FOREIGN KEY (sales_person_id) REFERENCES employees(employee_id)
);

CREATE INDEX idx_commission_salesperson ON sales_commissions(sales_person_id);
CREATE INDEX idx_commission_date ON sales_commissions(commission_date);
CREATE INDEX idx_commission_status ON sales_commissions(status);
CREATE INDEX idx_commission_paid ON sales_commissions(paid_date) WHERE status = 'PAID';

-- ============================================================================
-- SALES TERRITORIES
-- Define sales territories and assignments
-- ============================================================================

CREATE TABLE IF NOT EXISTS sales_territories (
    territory_id VARCHAR(20) PRIMARY KEY,
    territory_code VARCHAR(20) UNIQUE NOT NULL,
    territory_name VARCHAR(255) NOT NULL,
    description TEXT,
    manager_id VARCHAR(20),
    territory_type VARCHAR(50) DEFAULT 'REGION',
    parent_territory_id VARCHAR(20),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    FOREIGN KEY (manager_id) REFERENCES employees(employee_id),
    FOREIGN KEY (parent_territory_id) REFERENCES sales_territories(territory_id)
);

CREATE TABLE IF NOT EXISTS sales_territory_customers (
    territory_customer_id VARCHAR(20) PRIMARY KEY,
    territory_id VARCHAR(20) NOT NULL,
    customer_id VARCHAR(20) NOT NULL,
    assigned_date DATE NOT NULL DEFAULT CURRENT_DATE,
    assigned_by VARCHAR(50),
    is_primary BOOLEAN DEFAULT TRUE,
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    FOREIGN KEY (territory_id) REFERENCES sales_territories(territory_id) ON DELETE CASCADE,
    FOREIGN KEY (customer_id) REFERENCES customers(customer_id) ON DELETE CASCADE,
    UNIQUE (territory_id, customer_id)
);

CREATE TABLE IF NOT EXISTS sales_territory_quotas (
    quota_id VARCHAR(20) PRIMARY KEY,
    territory_id VARCHAR(20) NOT NULL,
    quota_year INTEGER NOT NULL,
    quota_month INTEGER,
    quota_amount DECIMAL(12,2) NOT NULL,
    quota_type VARCHAR(50) DEFAULT 'REVENUE',
    actual_amount DECIMAL(12,2) DEFAULT 0,
    variance_percent DECIMAL(5,2),
    status VARCHAR(50) DEFAULT 'ACTIVE',
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    FOREIGN KEY (territory_id) REFERENCES sales_territories(territory_id) ON DELETE CASCADE,
    UNIQUE (territory_id, quota_year, COALESCE(quota_month, 0))
);

CREATE INDEX idx_territory_manager ON sales_territories(manager_id);
CREATE INDEX idx_territory_quota ON sales_territory_quotas(territory_id, quota_year);

-- ============================================================================
-- SALES ORDER APPROVALS
-- Track approval workflow for sales orders
-- ============================================================================

CREATE TABLE IF NOT EXISTS sales_order_approvals (
    approval_id VARCHAR(20) PRIMARY KEY,
    order_id VARCHAR(20) NOT NULL,
    approval_level INTEGER NOT NULL,
    approver_id VARCHAR(50) NOT NULL,
    approval_status VARCHAR(50) DEFAULT 'PENDING',
    requested_date TIMESTAMP DEFAULT NOW(),
    approved_date TIMESTAMP,
    rejection_reason TEXT,
    notes TEXT,
    FOREIGN KEY (order_id) REFERENCES sales_orders(order_id) ON DELETE CASCADE
);

CREATE INDEX idx_approval_order ON sales_order_approvals(order_id);
CREATE INDEX idx_approval_approver ON sales_order_approvals(approver_id);

-- ============================================================================
-- SALES ORDER ACTIVITY LOG
-- Track all changes and activities on sales orders
-- ============================================================================

CREATE TABLE IF NOT EXISTS sales_order_activity (
    activity_id VARCHAR(20) PRIMARY KEY,
    order_id VARCHAR(20) NOT NULL,
    activity_type VARCHAR(50) NOT NULL,
    activity_date TIMESTAMP DEFAULT NOW(),
    user_id VARCHAR(50) NOT NULL,
    field_name VARCHAR(100),
    old_value TEXT,
    new_value TEXT,
    notes TEXT,
    FOREIGN KEY (order_id) REFERENCES sales_orders(order_id) ON DELETE CASCADE
);

CREATE INDEX idx_activity_order ON sales_order_activity(order_id);
CREATE INDEX idx_activity_date ON sales_order_activity(activity_date DESC);

-- ============================================================================
-- VIEWS
-- ============================================================================

-- Open Sales Orders View
CREATE OR REPLACE VIEW v_open_sales_orders AS
SELECT
    so.order_id,
    so.order_number,
    so.order_date,
    so.customer_id,
    c.customer_name,
    c billing_city,
    so.order_status,
    so.payment_terms,
    so.total_amount,
    so.promised_date,
    e.first_name || ' ' || e.last_name AS sales_person,
    st.territory_name,
    COUNT(DISTINCT sol.line_id) AS line_count,
    SUM(sol.quantity) AS total_quantity,
    SUM(sol.quantity_shipped) AS total_shipped,
    SUM(sol.quantity_backordered) AS total_backordered
FROM sales_orders so
JOIN customers c ON so.customer_id = c.customer_id
LEFT JOIN employees e ON so.sales_person_id = e.employee_id
LEFT JOIN sales_territories st ON so.territory_id = st.territory_id
LEFT JOIN sales_order_lines sol ON so.order_id = sol.order_id
WHERE so.order_status IN ('PENDING', 'CONFIRMED', 'PICKING', 'PICKED', 'PARTIAL')
GROUP BY so.order_id, so.order_number, so.order_date, so.customer_id, c.customer_name,
         c.city, so.order_status, so.payment_terms, so.total_amount, so.promised_date,
         e.first_name, e.last_name, st.territory_name;

-- Backorders Pending Fulfillment View
CREATE OR REPLACE VIEW v_pending_backorders AS
SELECT
    bo.backorder_id,
    bo.original_order_id,
    bo.order_id,
    so.order_number,
    bo.sku,
    bo.description,
    bo.quantity_outstanding,
    bo.promised_date,
    bo.status,
    bo.priority,
    c.customer_name,
    c.customer_code,
    i.quantity_available AS stock_available
FROM backorders bo
JOIN sales_orders so ON bo.order_id = so.order_id
JOIN customers c ON bo.customer_id = c.customer_id
LEFT JOIN inventory i ON bo.sku = i.sku
WHERE bo.status = 'OPEN'
ORDER BY bo.promised_date ASC, bo.priority ASC, bo.created_at ASC;

-- Commission Summary View
CREATE OR REPLACE VIEW v_commission_summary AS
SELECT
    sc.sales_person_id,
    e.first_name || ' ' || e.last_name AS sales_person_name,
    sc.commission_date,
    COUNT(*) AS transaction_count,
    SUM(sc.base_amount) AS total_base_amount,
    AVG(sc.commission_rate) AS avg_commission_rate,
    SUM(sc.commission_amount) AS total_commission,
    SUM(CASE WHEN sc.status = 'PAID' THEN sc.commission_amount ELSE 0 END) AS paid_commission,
    SUM(CASE WHEN sc.status = 'EARNED' THEN sc.commission_amount ELSE 0 END) AS pending_commission
FROM sales_commissions sc
JOIN employees e ON sc.sales_person_id = e.employee_id
GROUP BY sc.sales_person_id, e.first_name, e.last_name, sc.commission_date;

-- Territory Performance View
CREATE OR REPLACE VIEW v_territory_performance AS
SELECT
    st.territory_id,
    st.territory_code,
    st.territory_name,
    e.first_name || ' ' || e.last_name AS manager_name,
    COUNT(DISTINCT stc.customer_id) AS customer_count,
    COUNT(DISTINCT so.order_id) AS order_count,
    COALESCE(SUM(so.total_amount), 0) AS total_sales,
    COALESCE(SUM(CASE WHEN so.order_date >= CURRENT_DATE - INTERVAL '30 days' THEN so.total_amount ELSE 0 END), 0) AS sales_30_days,
    COALESCE(SUM(CASE WHEN so.order_date >= DATE_TRUNC('year', CURRENT_DATE) THEN so.total_amount ELSE 0 END), 0) AS sales_ytd,
    COALESCE(stq.quota_amount, 0) AS current_quota,
    CASE
        WHEN stq.quota_amount > 0 THEN
            (COALESCE(SUM(CASE WHEN so.order_date >= DATE_TRUNC('year', CURRENT_DATE) THEN so.total_amount ELSE 0 END), 0) / stq.quota_amount) * 100
        ELSE 0
    END AS quota_percent_achieved
FROM sales_territories st
LEFT JOIN employees e ON st.manager_id = e.employee_id
LEFT JOIN sales_territory_customers stc ON st.territory_id = stc.territory_id
LEFT JOIN sales_orders so ON st.territory_id = so.territory_id
LEFT JOIN LATERAL (
    SELECT quota_amount
    FROM sales_territory_quotas
    WHERE territory_id = st.territory_id
    AND quota_year = EXTRACT(YEAR FROM CURRENT_DATE)
    AND quota_month IS NULL
    LIMIT 1
) stq ON true
WHERE st.is_active = TRUE
GROUP BY st.territory_id, st.territory_code, st.territory_name, e.first_name, e.last_name, stq.quota_amount;

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Function to update order totals
CREATE OR REPLACE FUNCTION update_sales_order_totals(p_order_id VARCHAR)
RETURNS VOID AS $$
DECLARE
    v_subtotal DECIMAL(12,2);
    v_tax_amount DECIMAL(12,2);
    v_total DECIMAL(12,2);
BEGIN
    -- Calculate line totals
    UPDATE sales_order_lines
    SET line_total = (quantity * unit_price) * (1 - discount_percent/100) + tax_amount
    WHERE order_id = p_order_id;

    -- Sum up totals
    SELECT
        COALESCE(SUM(line_total), 0)
    INTO v_subtotal
    FROM sales_order_lines
    WHERE order_id = p_order_id;

    SELECT
        COALESCE(SUM(tax_amount), 0)
    INTO v_tax_amount
    FROM sales_order_lines
    WHERE order_id = p_order_id;

    v_total := v_subtotal + v_tax_amount;

    -- Update order header
    UPDATE sales_orders
    SET
        subtotal = v_subtotal,
        tax_amount = v_tax_amount,
        total_amount = v_total + shipping_amount - discount_amount
    WHERE order_id = p_order_id;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate commission
CREATE OR REPLACE FUNCTION calculate_sales_commission(p_order_id VARCHAR)
RETURNS DECIMAL(12,2) AS $$
DECLARE
    v_total_commission DECIMAL(12,2) := 0;
    v_commission_rate DECIMAL(5,2);
    so_record RECORD;
BEGIN
    SELECT * INTO so_record
    FROM sales_orders
    WHERE order_id = p_order_id;

    IF so_record.sales_person_id IS NULL OR so_record.commission_rate = 0 THEN
        RETURN 0;
    END IF;

    v_commission_rate := so_record.commission_rate;
    v_total_commission := (so_record.total_amount - so_record.tax_amount) * (v_commission_rate / 100);

    -- Update order with commission amount
    UPDATE sales_orders
    SET commission_amount = v_total_commission
    WHERE order_id = p_order_id;

    -- Create commission records
    INSERT INTO sales_commissions (commission_id, order_id, sales_person_id, commission_date,
                                   transaction_type, base_amount, commission_rate, commission_amount)
    VALUES (
        'COM-' || TO_CHAR(CURRENT_TIMESTAMP, 'YYYYMMDD-HH24MISS-') || substring(md5(random()::text), 1, 6),
        p_order_id,
        so_record.sales_person_id,
        so_record.order_date,
        'SALE',
        so_record.total_amount - so_record.tax_amount,
        v_commission_rate,
        v_total_commission
    );

    RETURN v_total_commission;
END;
$$ LANGUAGE plpgsql;

-- Function to create backorder from line
CREATE OR REPLACE FUNCTION create_backorder_from_line(
    p_line_id VARCHAR,
    p_backorder_quantity DECIMAL
) RETURNS VARCHAR AS $$
DECLARE
    v_line_record RECORD;
    v_order_record RECORD;
    v_backorder_id VARCHAR;
    v_new_order_id VARCHAR;
BEGIN
    -- Get line details
    SELECT * INTO v_line_record
    FROM sales_order_lines
    WHERE line_id = p_line_id;

    -- Get order details
    SELECT * INTO v_order_record
    FROM sales_orders
    WHERE order_id = v_line_record.order_id;

    -- Generate IDs
    v_backorder_id := 'BO-' || TO_CHAR(CURRENT_TIMESTAMP, 'YYYYMMDD-HH24MISS-') || substring(md5(random()::text), 1, 6);
    v_new_order_id := 'SO-' || TO_CHAR(CURRENT_TIMESTAMP, 'YYYYMMDD-HH24MISS-') || substring(md5(random()::text), 1, 6);

    -- Create backorder record
    INSERT INTO backorders (
        backorder_id, original_order_id, original_line_id, order_id,
        sku, description, quantity_original, quantity_outstanding,
        customer_id, status, priority
    ) VALUES (
        v_backorder_id,
        v_line_record.order_id,
        v_line_id,
        v_new_order_id,
        v_line_record.sku,
        v_line_record.description,
        v_line_record.quantity,
        p_backorder_quantity,
        v_order_record.customer_id,
        'OPEN',
        5
    );

    -- Create new sales order for backorder
    INSERT INTO sales_orders (
        order_id, customer_id, order_number, order_date, order_status,
        is_backorder, original_order_id, sales_person_id, territory_id
    ) VALUES (
        v_new_order_id,
        v_order_record.customer_id,
        'BO-' || v_order_record.order_number || '-' || substring(md5(random()::text), 1, 4),
        CURRENT_DATE,
        'PENDING',
        TRUE,
        v_order_record.order_id,
        v_order_record.sales_person_id,
        v_order_record.territory_id
    );

    -- Update original line
    UPDATE sales_order_lines
    SET
        quantity_backordered = p_backorder_quantity,
        quantity = quantity - p_backorder_quantity,
        status = CASE
            WHEN quantity - p_backorder_quantity <= 0 THEN 'BACKORDERED'
            WHEN quantity_picked > 0 THEN 'PARTIAL'
            ELSE 'PENDING'
        END
    WHERE line_id = p_line_id;

    RETURN v_backorder_id;
END;
$$ LANGUAGE plpgsql;

-- Function to get next order number
CREATE OR REPLACE FUNCTION get_next_sales_order_number() VARCHAR AS $$
DECLARE
    v_prefix VARCHAR := 'SO';
    v_sequence_num INTEGER;
    v_order_number VARCHAR;
BEGIN
    -- Get last order number
    SELECT COALESCE(MAX(CAST(substring(order_number FROM 3 FOR 10) AS INTEGER)), 0) + 1
    INTO v_sequence_num
    FROM sales_orders
    WHERE order_number ~ '^SO-[0-9]+$';

    v_order_number := v_prefix || '-' || LPAD(v_sequence_num::TEXT, 6, '0');
    RETURN v_order_number;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Trigger to update timestamp on sales_orders
CREATE OR REPLACE FUNCTION update_sales_orders_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_sales_orders_timestamp ON sales_orders;
CREATE TRIGGER trg_update_sales_orders_timestamp
    BEFORE UPDATE ON sales_orders
    FOR EACH ROW
    EXECUTE FUNCTION update_sales_orders_timestamp();

-- Trigger to log order changes
CREATE OR REPLACE FUNCTION log_sales_order_changes()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'UPDATE' THEN
        IF OLD.order_status != NEW.order_status THEN
            INSERT INTO sales_order_activity (activity_id, order_id, activity_type, user_id, field_name, old_value, new_value)
            VALUES (
                'ACT-' || TO_CHAR(CURRENT_TIMESTAMP, 'YYYYMMDD-HH24MISS-') || substring(md5(random()::text), 1, 6),
                NEW.order_id,
                'STATUS_CHANGE',
                COALESCE(NEW.updated_by, CURRENT_USER),
                'order_status',
                OLD.order_status,
                NEW.order_status
            );
        END IF;
        IF OLD.total_amount != NEW.total_amount THEN
            INSERT INTO sales_order_activity (activity_id, order_id, activity_type, user_id, field_name, old_value, new_value)
            VALUES (
                'ACT-' || TO_CHAR(CURRENT_TIMESTAMP, 'YYYYMMDD-HH24MISS-') || substring(md5(random()::text), 1, 6),
                NEW.order_id,
                'AMOUNT_CHANGE',
                COALESCE(NEW.updated_by, CURRENT_USER),
                'total_amount',
                OLD.total_amount::TEXT,
                NEW.total_amount::TEXT
            );
        END IF;
    ELSIF TG_OP = 'INSERT' THEN
        INSERT INTO sales_order_activity (activity_id, order_id, activity_type, user_id, new_value)
        VALUES (
            'ACT-' || TO_CHAR(CURRENT_TIMESTAMP, 'YYYYMMDD-HH24MISS-') || substring(md5(random()::text), 1, 6),
            NEW.order_id,
            'ORDER_CREATED',
            COALESCE(NEW.created_by, CURRENT_USER),
            'Order created'
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_log_sales_order_changes ON sales_orders;
CREATE TRIGGER trg_log_sales_order_changes
    AFTER INSERT OR UPDATE ON sales_orders
    FOR EACH ROW
    EXECUTE FUNCTION log_sales_order_changes();

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_sales_orders_customer ON sales_orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_sales_orders_status ON sales_orders(order_status);
CREATE INDEX IF NOT EXISTS idx_sales_orders_date ON sales_orders(order_date DESC);
CREATE INDEX IF NOT EXISTS idx_sales_orders_salesperson ON sales_orders(sales_person_id) WHERE sales_person_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_sales_orders_territory ON sales_orders(territory_id) WHERE territory_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_sales_orders_backorder ON sales_orders(original_order_id) WHERE is_backorder = TRUE;

-- ============================================================================
-- SEED DATA
-- ============================================================================

-- Insert default territories
INSERT INTO sales_territories (territory_id, territory_code, territory_name, territory_type, description)
VALUES
    ('TERR-001', 'NORTH', 'Northern Region', 'REGION', 'Northern sales territory'),
    ('TERR-002', 'SOUTH', 'Southern Region', 'REGION', 'Southern sales territory'),
    ('TERR-003', 'EAST', 'Eastern Region', 'REGION', 'Eastern sales territory'),
    ('TERR-004', 'WEST', 'Western Region', 'REGION', 'Western sales territory'),
    ('TERR-005', 'CENTRAL', 'Central Region', 'REGION', 'Central sales territory')
ON CONFLICT (territory_code) DO NOTHING;

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA public TO opsui_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO opsui_app;
