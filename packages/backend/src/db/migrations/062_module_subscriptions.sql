-- ============================================================================
-- MODULE SUBSCRIPTIONS
-- Enables modular ERP pricing with per-entity module enablement
-- ============================================================================

-- ============================================================================
-- 1. BILLING CYCLE ENUM
-- ============================================================================

DO $$ BEGIN
  CREATE TYPE billing_cycle AS ENUM ('MONTHLY', 'ANNUAL', 'TRIAL', 'CUSTOM');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- ============================================================================
-- 2. MODULE SUBSCRIPTION STATUS ENUM
-- ============================================================================

DO $$ BEGIN
  CREATE TYPE subscription_status AS ENUM (
    'ACTIVE',
    'SUSPENDED',
    'CANCELLED',
    'EXPIRED',
    'TRIAL',
    'PENDING_PAYMENT'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- ============================================================================
-- 3. MODULE SUBSCRIPTIONS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS module_subscriptions (
  subscription_id VARCHAR(20) PRIMARY KEY,
  entity_id VARCHAR(20) NOT NULL REFERENCES entities(entity_id) ON DELETE CASCADE,
  module_id VARCHAR(50) NOT NULL, -- Matches ModuleId from shared types

  -- Pricing
  billing_cycle billing_cycle NOT NULL DEFAULT 'MONTHLY',
  price_per_period DECIMAL(10, 2) NOT NULL, -- Actual price (may differ from list)
  currency CHAR(3) NOT NULL DEFAULT 'USD',
  discount_percentage DECIMAL(5, 2) DEFAULT 0.00,

  -- Status
  subscription_status subscription_status NOT NULL DEFAULT 'ACTIVE',

  -- Dates
  subscription_start DATE NOT NULL DEFAULT CURRENT_DATE,
  subscription_end DATE, -- NULL = ongoing subscription
  trial_ends_at TIMESTAMP,

  -- Billing
  last_billing_date DATE,
  next_billing_date DATE,
  billing_day_of_month INTEGER DEFAULT 1, -- For monthly billing
  auto_renew BOOLEAN DEFAULT true,

  -- Usage tracking
  user_count_at_billing INTEGER DEFAULT 0,

  -- Metadata
  notes TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  created_by VARCHAR(50) REFERENCES users(user_id) ON DELETE SET NULL,

  -- Ensure one subscription per module per entity
  UNIQUE(entity_id, module_id)
);

-- Indexes for module subscriptions
CREATE INDEX IF NOT EXISTS idx_ms_entity ON module_subscriptions(entity_id);
CREATE INDEX IF NOT EXISTS idx_ms_module ON module_subscriptions(module_id);
CREATE INDEX IF NOT EXISTS idx_ms_status ON module_subscriptions(subscription_status);
CREATE INDEX IF NOT EXISTS idx_ms_billing_cycle ON module_subscriptions(billing_cycle);
CREATE INDEX IF NOT EXISTS idx_ms_next_billing ON module_subscriptions(next_billing_date);
CREATE INDEX IF NOT EXISTS idx_ms_active ON module_subscriptions(subscription_status)
  WHERE subscription_status = 'ACTIVE';

COMMENT ON TABLE module_subscriptions IS 'Module subscriptions per entity for modular pricing';
COMMENT ON COLUMN module_subscriptions.module_id IS 'Module identifier matching ModuleId from shared types';
COMMENT ON COLUMN module_subscriptions.price_per_period IS 'Actual price charged (may include discounts)';

-- ============================================================================
-- 4. ENTITY USER TIERS
-- ============================================================================

DO $$ BEGIN
  CREATE TYPE user_tier_id AS ENUM (
    'tier-1-5',
    'tier-6-15',
    'tier-16-50',
    'tier-51-100',
    'tier-unlimited'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS entity_user_tiers (
  tier_assignment_id VARCHAR(20) PRIMARY KEY,
  entity_id VARCHAR(20) NOT NULL REFERENCES entities(entity_id) ON DELETE CASCADE,
  tier_id user_tier_id NOT NULL DEFAULT 'tier-1-5',

  -- Pricing
  monthly_fee DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  currency CHAR(3) NOT NULL DEFAULT 'USD',

  -- Dates
  effective_date DATE NOT NULL DEFAULT CURRENT_DATE,
  expiry_date DATE,

  -- Usage
  current_user_count INTEGER DEFAULT 0,
  max_user_count INTEGER, -- NULL for unlimited

  -- Billing
  last_billing_date DATE,
  next_billing_date DATE,

  -- Metadata
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),

  UNIQUE(entity_id) -- One tier per entity
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_eut_entity ON entity_user_tiers(entity_id);
CREATE INDEX IF NOT EXISTS idx_eut_tier ON entity_user_tiers(tier_id);

COMMENT ON TABLE entity_user_tiers IS 'User tier assignments for pricing based on user count';

-- ============================================================================
-- 5. ADD-ON SERVICES SUBSCRIPTIONS
-- ============================================================================

CREATE TABLE IF NOT EXISTS addon_subscriptions (
  addon_subscription_id VARCHAR(20) PRIMARY KEY,
  entity_id VARCHAR(20) NOT NULL REFERENCES entities(entity_id) ON DELETE CASCADE,
  addon_id VARCHAR(50) NOT NULL, -- Matches AddOnService.id from shared types

  -- Pricing
  one_time_fee DECIMAL(10, 2) DEFAULT 0.00,
  monthly_fee DECIMAL(10, 2) DEFAULT 0.00,
  currency CHAR(3) NOT NULL DEFAULT 'USD',

  -- Status
  is_active BOOLEAN NOT NULL DEFAULT true,

  -- Dates
  subscription_start DATE NOT NULL DEFAULT CURRENT_DATE,
  subscription_end DATE,

  -- Metadata
  notes TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  created_by VARCHAR(50) REFERENCES users(user_id) ON DELETE SET NULL,

  UNIQUE(entity_id, addon_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_as_entity ON addon_subscriptions(entity_id);
CREATE INDEX IF NOT EXISTS idx_as_addon ON addon_subscriptions(addon_id);
CREATE INDEX IF NOT EXISTS idx_as_active ON addon_subscriptions(is_active) WHERE is_active = true;

COMMENT ON TABLE addon_subscriptions IS 'Add-on service subscriptions per entity';

-- ============================================================================
-- 6. BILLING HISTORY
-- ============================================================================

DO $$ BEGIN
  CREATE TYPE billing_item_type AS ENUM (
    'MODULE_MONTHLY',
    'MODULE_ANNUAL',
    'USER_TIER',
    'ADDON_ONETIME',
    'ADDON_MONTHLY',
    'DISCOUNT',
    'CREDIT',
    'REFUND',
    'ADJUSTMENT'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE payment_status AS ENUM (
    'PENDING',
    'PAID',
    'FAILED',
    'REFUNDED',
    'PARTIALLY_REFUNDED',
    'WAIVED'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS billing_invoices (
  invoice_id VARCHAR(20) PRIMARY KEY,
  entity_id VARCHAR(20) NOT NULL REFERENCES entities(entity_id) ON DELETE CASCADE,
  invoice_number VARCHAR(50) UNIQUE NOT NULL,

  -- Billing period
  billing_period_start DATE NOT NULL,
  billing_period_end DATE NOT NULL,

  -- Amounts
  subtotal DECIMAL(12, 2) NOT NULL,
  discount_amount DECIMAL(12, 2) DEFAULT 0.00,
  tax_amount DECIMAL(12, 2) DEFAULT 0.00,
  total_amount DECIMAL(12, 2) NOT NULL,
  currency CHAR(3) NOT NULL DEFAULT 'USD',

  -- Status
  payment_status payment_status NOT NULL DEFAULT 'PENDING',

  -- Payment
  paid_at TIMESTAMP,
  payment_method VARCHAR(50),
  payment_reference VARCHAR(100),

  -- Dates
  due_date DATE NOT NULL,
  sent_at TIMESTAMP,

  -- Metadata
  notes TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_bi_entity ON billing_invoices(entity_id);
CREATE INDEX IF NOT EXISTS idx_bi_number ON billing_invoices(invoice_number);
CREATE INDEX IF NOT EXISTS idx_bi_status ON billing_invoices(payment_status);
CREATE INDEX IF NOT EXISTS idx_bi_due_date ON billing_invoices(due_date);
CREATE INDEX IF NOT EXISTS idx_bi_period ON billing_invoices(billing_period_start, billing_period_end);

CREATE TABLE IF NOT EXISTS billing_invoice_items (
  item_id VARCHAR(20) PRIMARY KEY,
  invoice_id VARCHAR(20) NOT NULL REFERENCES billing_invoices(invoice_id) ON DELETE CASCADE,

  -- Item details
  item_type billing_item_type NOT NULL,
  description TEXT NOT NULL,
  reference_id VARCHAR(50), -- Module ID, addon ID, etc.

  -- Quantities and amounts
  quantity DECIMAL(10, 2) DEFAULT 1.00,
  unit_price DECIMAL(10, 2) NOT NULL,
  discount_percentage DECIMAL(5, 2) DEFAULT 0.00,
  line_total DECIMAL(12, 2) NOT NULL,

  -- Metadata
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_bii_invoice ON billing_invoice_items(invoice_id);
CREATE INDEX IF NOT EXISTS idx_bii_type ON billing_invoice_items(item_type);
CREATE INDEX IF NOT EXISTS idx_bii_reference ON billing_invoice_items(reference_id);

-- ============================================================================
-- 7. MODULE PERMISSIONS (Role-based access per module)
-- ============================================================================

CREATE TABLE IF NOT EXISTS module_permissions (
  permission_id VARCHAR(20) PRIMARY KEY,
  module_id VARCHAR(50) NOT NULL,

  -- Permission details
  permission_name VARCHAR(100) NOT NULL,
  description TEXT,

  -- Related roles
  applicable_roles JSONB, -- Array of roles that can use this permission

  -- Metadata
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),

  UNIQUE(module_id, permission_name)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_mp_module ON module_permissions(module_id);

-- ============================================================================
-- 8. ENTITY MODULE OVERRIDES (Custom settings per module per entity)
-- ============================================================================

CREATE TABLE IF NOT EXISTS entity_module_settings (
  setting_id VARCHAR(20) PRIMARY KEY,
  entity_id VARCHAR(20) NOT NULL REFERENCES entities(entity_id) ON DELETE CASCADE,
  module_id VARCHAR(50) NOT NULL,

  -- Settings
  setting_key VARCHAR(100) NOT NULL,
  setting_value TEXT,
  setting_type VARCHAR(20) DEFAULT 'STRING',

  -- Metadata
  description TEXT,
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_by VARCHAR(50) REFERENCES users(user_id) ON DELETE SET NULL,

  UNIQUE(entity_id, module_id, setting_key)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_ems_entity ON entity_module_settings(entity_id);
CREATE INDEX IF NOT EXISTS idx_ems_module ON entity_module_settings(module_id);

-- ============================================================================
-- 9. MODULE AUDIT LOG
-- ============================================================================

DO $$ BEGIN
  CREATE TYPE module_audit_action AS ENUM (
    'MODULE_ENABLED',
    'MODULE_DISABLED',
    'MODULE_SUSPENDED',
    'MODULE_REACTIVATED',
    'TIER_CHANGED',
    'ADDON_ADDED',
    'ADDON_REMOVED',
    'BILLING_UPDATED',
    'SETTINGS_CHANGED'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS module_audit_log (
  audit_id VARCHAR(20) PRIMARY KEY,
  entity_id VARCHAR(20) NOT NULL REFERENCES entities(entity_id) ON DELETE CASCADE,
  module_id VARCHAR(50),

  -- Action
  action module_audit_action NOT NULL,
  old_values JSONB,
  new_values JSONB,

  -- Context
  user_id VARCHAR(50) REFERENCES users(user_id) ON DELETE SET NULL,
  ip_address INET,
  user_agent TEXT,

  -- Metadata
  notes TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_mal_entity ON module_audit_log(entity_id);
CREATE INDEX IF NOT EXISTS idx_mal_module ON module_audit_log(module_id);
CREATE INDEX IF NOT EXISTS idx_mal_action ON module_audit_log(action);
CREATE INDEX IF NOT EXISTS idx_mal_created ON module_audit_log(created_at);

-- ============================================================================
-- 10. HELPER FUNCTIONS
-- ============================================================================

-- Function to check if a module is enabled for an entity
CREATE OR REPLACE FUNCTION is_module_enabled(p_entity_id VARCHAR, p_module_id VARCHAR)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM module_subscriptions
    WHERE entity_id = p_entity_id
      AND module_id = p_module_id
      AND subscription_status IN ('ACTIVE', 'TRIAL')
      AND (subscription_end IS NULL OR subscription_end >= CURRENT_DATE)
  );
END;
$$ LANGUAGE plpgsql;

-- Function to get all enabled modules for an entity
CREATE OR REPLACE FUNCTION get_enabled_modules(p_entity_id VARCHAR)
RETURNS TABLE(module_id VARCHAR, subscription_status subscription_status) AS $$
BEGIN
  RETURN QUERY
  SELECT ms.module_id::VARCHAR, ms.subscription_status
  FROM module_subscriptions ms
  WHERE ms.entity_id = p_entity_id
    AND ms.subscription_status IN ('ACTIVE', 'TRIAL')
    AND (ms.subscription_end IS NULL OR ms.subscription_end >= CURRENT_DATE);
END;
$$ LANGUAGE plpgsql;

-- Function to calculate monthly billing for an entity
CREATE OR REPLACE FUNCTION calculate_monthly_billing(p_entity_id VARCHAR)
RETURNS DECIMAL(12, 2) AS $$
DECLARE
  v_modules_total DECIMAL(12, 2) := 0;
  v_tier_fee DECIMAL(12, 2) := 0;
  v_addons_total DECIMAL(12, 2) := 0;
BEGIN
  -- Sum active module subscriptions with monthly billing
  SELECT COALESCE(SUM(price_per_period), 0)
  INTO v_modules_total
  FROM module_subscriptions
  WHERE entity_id = p_entity_id
    AND subscription_status = 'ACTIVE'
    AND billing_cycle = 'MONTHLY';

  -- Get user tier fee
  SELECT COALESCE(monthly_fee, 0)
  INTO v_tier_fee
  FROM entity_user_tiers
  WHERE entity_id = p_entity_id;

  -- Sum active addon subscriptions
  SELECT COALESCE(SUM(monthly_fee), 0)
  INTO v_addons_total
  FROM addon_subscriptions
  WHERE entity_id = p_entity_id AND is_active = true;

  RETURN v_modules_total + v_tier_fee + v_addons_total;
END;
$$ LANGUAGE plpgsql;

-- Function to get user tier for entity
CREATE OR REPLACE FUNCTION get_entity_user_tier(p_entity_id VARCHAR)
RETURNS user_tier_id AS $$
DECLARE
  v_tier_id user_tier_id;
BEGIN
  SELECT tier_id INTO v_tier_id
  FROM entity_user_tiers
  WHERE entity_id = p_entity_id;

  RETURN COALESCE(v_tier_id, 'tier-1-5'::user_tier_id);
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 11. TRIGGERS
-- ============================================================================

-- Update updated_at timestamps
CREATE OR REPLACE FUNCTION update_module_subscriptions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS module_subscriptions_updated_at ON module_subscriptions;
CREATE TRIGGER module_subscriptions_updated_at
  BEFORE UPDATE ON module_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_module_subscriptions_updated_at();

DROP TRIGGER IF EXISTS entity_user_tiers_updated_at ON entity_user_tiers;
CREATE TRIGGER entity_user_tiers_updated_at
  BEFORE UPDATE ON entity_user_tiers
  FOR EACH ROW
  EXECUTE FUNCTION update_module_subscriptions_updated_at();

DROP TRIGGER IF EXISTS addon_subscriptions_updated_at ON addon_subscriptions;
CREATE TRIGGER addon_subscriptions_updated_at
  BEFORE UPDATE ON addon_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_module_subscriptions_updated_at();

-- ============================================================================
-- 12. SEED DATA - ENABLE ALL MODULES FOR HEAD OFFICE (Development/Testing)
-- ============================================================================

-- Insert user tier for head office
INSERT INTO entity_user_tiers (
  tier_assignment_id,
  entity_id,
  tier_id,
  monthly_fee,
  effective_date
) VALUES (
  'UT-00001',
  'ENT-00001',
  'tier-unlimited',
  799.00,
  CURRENT_DATE
) ON CONFLICT (entity_id) DO UPDATE SET
  tier_id = 'tier-unlimited',
  monthly_fee = 799.00;

-- Enable all modules for head office (development/testing)
INSERT INTO module_subscriptions (
  subscription_id,
  entity_id,
  module_id,
  billing_cycle,
  price_per_period,
  subscription_status,
  subscription_start
)
SELECT
  'MS-' || LPAD((ROW_NUMBER() OVER ())::TEXT, 5, '0'),
  'ENT-00001',
  m.module_id,
  'ANNUAL',
  m.annual_price,
  'ACTIVE',
  CURRENT_DATE
FROM (
  VALUES
    ('order-management', 990.00),
    ('inventory-management', 990.00),
    ('receiving-inbound', 790.00),
    ('shipping-outbound', 790.00),
    ('cycle-counting', 890.00),
    ('wave-picking', 890.00),
    ('zone-picking', 890.00),
    ('slotting-optimization', 990.00),
    ('route-optimization', 1290.00),
    ('quality-control', 990.00),
    ('exceptions-management', 790.00),
    ('business-rules-engine', 1290.00),
    ('dashboards-reporting', 990.00),
    ('ml-ai-predictions', 1490.00),
    ('finance-accounting', 1990.00),
    ('human-resources', 1290.00),
    ('production-manufacturing', 1490.00),
    ('procurement', 1290.00),
    ('maintenance-management', 990.00),
    ('returns-management', 890.00)
) AS m(module_id, annual_price)
ON CONFLICT (entity_id, module_id) DO UPDATE SET
  subscription_status = 'ACTIVE',
  price_per_period = EXCLUDED.price_per_period;

-- ============================================================================
-- COMPLETE
-- ============================================================================

-- Migration complete
-- Next steps:
-- 1. Create ModuleService for managing subscriptions
-- 2. Create ModuleEntitlementMiddleware for checking module access
-- 3. Update ProtectedRoute to check module access
-- 4. Create frontend ModuleManagementPage
