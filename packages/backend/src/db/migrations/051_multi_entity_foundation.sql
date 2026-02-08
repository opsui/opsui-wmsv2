-- ============================================================================
-- MULTI-ENTITY FOUNDATION
-- Foundation for full ERP: Companies, Subsidiaries, Inter-company Transactions
-- This migration enables multi-company, multi-subsidiary operations
-- ============================================================================

-- ============================================================================
-- 1. ENTITIES (COMPANIES/SUBSIDIARIES)
-- ============================================================================

-- Entity type enum
DO $$ BEGIN
  CREATE TYPE entity_type AS ENUM ('HEAD_OFFICE', 'SUBSIDIARY', 'BRANCH', 'DIVISION');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Entity status enum
DO $$ BEGIN
  CREATE TYPE entity_status AS ENUM ('ACTIVE', 'INACTIVE', 'PENDING_SETUP', 'CLOSED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Entities (companies and subsidiaries) table
CREATE TABLE IF NOT EXISTS entities (
  entity_id VARCHAR(20) PRIMARY KEY,
  entity_code VARCHAR(20) UNIQUE NOT NULL,
  entity_name VARCHAR(255) NOT NULL,
  parent_entity_id VARCHAR(20) REFERENCES entities(entity_id) ON DELETE SET NULL,
  entity_type entity_type NOT NULL DEFAULT 'SUBSIDIARY',
  entity_status entity_status NOT NULL DEFAULT 'ACTIVE',
  legal_name VARCHAR(255),
  tax_id VARCHAR(50),
  registration_number VARCHAR(100),
  base_currency CHAR(3) DEFAULT 'USD',
  -- Address
  address_line1 VARCHAR(255),
  address_line2 VARCHAR(255),
  city VARCHAR(100),
  state_province VARCHAR(100),
  postal_code VARCHAR(20),
  country_code CHAR(2),
  -- Contact
  phone VARCHAR(50),
  email VARCHAR(255),
  website VARCHAR(255),
  -- Financial
  fiscal_year_start_month INTEGER DEFAULT 1, -- January = 1
  -- Hierarchy
  hierarchy_level INTEGER DEFAULT 0,
  sort_order INTEGER DEFAULT 0,
  -- Metadata
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  created_by VARCHAR(50) REFERENCES users(user_id) ON DELETE SET NULL
);

-- Indexes for entities
CREATE INDEX IF NOT EXISTS idx_entities_parent ON entities(parent_entity_id);
CREATE INDEX IF NOT EXISTS idx_entities_type ON entities(entity_type);
CREATE INDEX IF NOT EXISTS idx_entities_status ON entities(entity_status);
CREATE INDEX IF NOT EXISTS idx_entities_active ON entities(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_entities_currency ON entities(base_currency);
CREATE INDEX IF NOT EXISTS idx_entities_country ON entities(country_code);

-- Comments
COMMENT ON TABLE entities IS 'Companies, subsidiaries, and branches in the multi-entity ERP structure';
COMMENT ON COLUMN entities.parent_entity_id IS 'Parent company for subsidiaries (null for head office)';
COMMENT ON COLUMN entities.hierarchy_level IS 'Depth in entity hierarchy (0 = head office, 1 = direct subsidiary, etc.)';

-- ============================================================================
-- 2. INTER-COMPANY TRANSACTIONS
-- ============================================================================

-- Inter-company transaction type enum
DO $$ BEGIN
  CREATE TYPE intercompany_type AS ENUM (
    'TRANSFER_OF_GOODS',
    'TRANSFER_OF_FUNDS',
    'INTERCOMPANY_LOAN',
    'COST_ALLOCATION',
    'REVENUE_ALLOCATION',
    'MANAGEMENT_FEE',
    'ROYALTY_PAYMENT',
    'DIVIDEND_PAYMENT'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Inter-company transaction status enum
DO $$ BEGIN
  CREATE TYPE intercompany_status AS ENUM ('PENDING', 'POSTED', 'ELIMINATED', 'REVERSED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Inter-company transactions table
CREATE TABLE IF NOT EXISTS intercompany_transactions (
  transaction_id VARCHAR(20) PRIMARY KEY,
  transaction_number VARCHAR(50) UNIQUE NOT NULL,
  from_entity_id VARCHAR(20) NOT NULL REFERENCES entities(entity_id),
  to_entity_id VARCHAR(20) NOT NULL REFERENCES entities(entity_id),
  transaction_date DATE NOT NULL,
  transaction_type intercompany_type NOT NULL,
  transaction_status intercompany_status NOT NULL DEFAULT 'PENDING',
  amount DECIMAL(12, 2) NOT NULL,
  currency CHAR(3) NOT NULL DEFAULT 'USD',
  exchange_rate DECIMAL(12, 6) DEFAULT 1.0,
  base_currency_amount DECIMAL(12, 2),
  description TEXT,
  reference_number VARCHAR(100),
  -- Accounting integration
  from_journal_entry_id VARCHAR(50),
  to_journal_entry_id VARCHAR(50),
  elimination_journal_id VARCHAR(50),
  -- Approval
  approved_by VARCHAR(50) REFERENCES users(user_id) ON DELETE SET NULL,
  approved_at TIMESTAMP,
  -- Metadata
  notes TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  created_by VARCHAR(50) REFERENCES users(user_id) ON DELETE SET NULL,

  CONSTRAINT check_not_same_entity CHECK (from_entity_id != to_entity_id)
);

-- Indexes for inter-company transactions
CREATE INDEX IF NOT EXISTS idx_ic_from ON intercompany_transactions(from_entity_id);
CREATE INDEX IF NOT EXISTS idx_ic_to ON intercompany_transactions(to_entity_id);
CREATE INDEX IF NOT EXISTS idx_ic_date ON intercompany_transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_ic_type ON intercompany_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_ic_status ON intercompany_transactions(transaction_status);
CREATE INDEX IF NOT EXISTS idx_ic_from_journal ON intercompany_transactions(from_journal_entry_id);
CREATE INDEX IF NOT EXISTS idx_ic_to_journal ON intercompany_transactions(to_journal_entry_id);
CREATE INDEX IF NOT EXISTS idx_ic_elimination ON intercompany_transactions(elimination_journal_id);

-- Comments
COMMENT ON TABLE intercompany_transactions IS 'Transactions between entities in the multi-entity structure';
COMMENT ON COLUMN intercompany_transactions.elimination_journal_id IS 'Journal entry for consolidation elimination';

-- ============================================================================
-- 3. ENTITY RELATIONSHIPS
-- ============================================================================

-- Entity relationship type enum
DO $$ BEGIN
  CREATE TYPE entity_relationship_type AS ENUM (
    'PARENT_SUBSIDIARY',
    'JOINT_VENTURE',
    'AFFILIATE',
    'PARTNERSHIP',
    'STRATEGIC_ALLIANCE'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Entity relationships table
CREATE TABLE IF NOT EXISTS entity_relationships (
  relationship_id VARCHAR(20) PRIMARY KEY,
  entity_id VARCHAR(20) NOT NULL REFERENCES entities(entity_id) ON DELETE CASCADE,
  related_entity_id VARCHAR(20) NOT NULL REFERENCES entities(entity_id) ON DELETE CASCADE,
  relationship_type entity_relationship_type NOT NULL,
  ownership_percentage DECIMAL(5, 2),
  is_primary_contact BOOLEAN DEFAULT false,
  effective_date DATE,
  expiry_date DATE,
  notes TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  created_by VARCHAR(50) REFERENCES users(user_id) ON DELETE SET NULL,

  CONSTRAINT check_not_self_related CHECK (entity_id != related_entity_id)
);

-- Indexes for entity relationships
CREATE INDEX IF NOT EXISTS idx_er_entity ON entity_relationships(entity_id);
CREATE INDEX IF NOT EXISTS idx_er_related ON entity_relationships(related_entity_id);
CREATE INDEX IF NOT EXISTS idx_er_type ON entity_relationships(relationship_type);
CREATE UNIQUE INDEX IF NOT EXISTS idx_er_unique ON entity_relationships(entity_id, related_entity_id);

-- ============================================================================
-- 4. ENTITY SETTINGS
-- ============================================================================

-- Entity settings table (configuration per entity)
CREATE TABLE IF NOT EXISTS entity_settings (
  setting_id VARCHAR(20) PRIMARY KEY,
  entity_id VARCHAR(20) NOT NULL REFERENCES entities(entity_id) ON DELETE CASCADE,
  setting_key VARCHAR(100) NOT NULL,
  setting_value TEXT,
  setting_type VARCHAR(20) DEFAULT 'STRING', -- STRING, NUMBER, BOOLEAN, JSON
  description TEXT,
  is_encrypted BOOLEAN DEFAULT false,
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_by VARCHAR(50) REFERENCES users(user_id) ON DELETE SET NULL
);

-- Indexes for entity settings
CREATE INDEX IF NOT EXISTS idx_es_entity ON entity_settings(entity_id);
CREATE INDEX IF NOT EXISTS idx_es_key ON entity_settings(setting_key);
CREATE UNIQUE INDEX IF NOT EXISTS idx_es_unique ON entity_settings(entity_id, setting_key);

-- ============================================================================
-- 5. ENTITY USERS (USER ASSIGNMENTS TO ENTITIES)
-- ============================================================================

-- Entity user role enum
DO $$ BEGIN
  CREATE TYPE entity_user_role AS ENUM (
    'ENTITY_ADMIN',
    'ENTITY_USER',
    'ENTITY_VIEWER',
    'ENTITY_ACCOUNTANT',
    'ENTITY_MANAGER'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Entity users table (which users can access which entities)
CREATE TABLE IF NOT EXISTS entity_users (
  entity_user_id VARCHAR(20) PRIMARY KEY,
  entity_id VARCHAR(20) NOT NULL REFERENCES entities(entity_id) ON DELETE CASCADE,
  user_id VARCHAR(50) NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  entity_user_role entity_user_role NOT NULL DEFAULT 'ENTITY_USER',
  is_default_entity BOOLEAN DEFAULT false, -- User's primary entity
  -- Access control
  can_view_financials BOOLEAN DEFAULT false,
  can_edit_financials BOOLEAN DEFAULT false,
  can_approve_transactions BOOLEAN DEFAULT false,
  -- Permissions
  permissions JSONB, -- Flexible permission structure
  -- Metadata
  effective_date DATE NOT NULL DEFAULT CURRENT_DATE,
  expiry_date DATE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  created_by VARCHAR(50) REFERENCES users(user_id) ON DELETE SET NULL
);

-- Indexes for entity users
CREATE INDEX IF NOT EXISTS idx_eu_entity ON entity_users(entity_id);
CREATE INDEX IF NOT EXISTS idx_eu_user ON entity_users(user_id);
CREATE INDEX IF NOT EXISTS idx_eu_role ON entity_users(entity_user_role);
CREATE INDEX IF NOT EXISTS idx_eu_active ON entity_users(is_active) WHERE is_active = true;
CREATE UNIQUE INDEX IF NOT EXISTS idx_eu_unique ON entity_users(entity_id, user_id);

-- Comments
COMMENT ON TABLE entity_users IS 'Assigns users to entities with role-based access control';

-- ============================================================================
-- 6. CONSOLIDATION RULES
-- ============================================================================

-- Consolidation method enum
DO $$ BEGIN
  CREATE TYPE consolidation_method AS ENUM (
    'FULL_CONSOLIDATION',
    'PROPORTIONAL_CONSOLIDATION',
    'EQUITY_METHOD',
    'COST_METHOD'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Consolidation rules table
CREATE TABLE IF NOT EXISTS consolidation_rules (
  rule_id VARCHAR(20) PRIMARY KEY,
  parent_entity_id VARCHAR(20) NOT NULL REFERENCES entities(entity_id),
  subsidiary_entity_id VARCHAR(20) NOT NULL REFERENCES entities(entity_id),
  consolidation_method consolidation_method NOT NULL DEFAULT 'FULL_CONSOLIDATION',
  ownership_percentage DECIMAL(5, 2) NOT NULL,
  control_percentage DECIMAL(5, 2) DEFAULT 100.00,
  voting_percentage DECIMAL(5, 2) DEFAULT 100.00,
  -- Elimination rules
  eliminate_intercompany BOOLEAN DEFAULT true,
  eliminate_unrealized_gains BOOLEAN default true,
  -- Accounting
  consolidation_account_id VARCHAR(20), -- Investment account to use
  minority_interest_account_id VARCHAR(20),
  -- Effective dates
  effective_date DATE NOT NULL DEFAULT CURRENT_DATE,
  expiry_date DATE,
  -- Metadata
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  created_by VARCHAR(50) REFERENCES users(user_id) ON DELETE SET NULL,

  CONSTRAINT check_not_same_entity_rule CHECK (parent_entity_id != subsidiary_entity_id)
);

-- Indexes for consolidation rules
CREATE INDEX IF NOT EXISTS idx_cr_parent ON consolidation_rules(parent_entity_id);
CREATE INDEX IF NOT EXISTS idx_cr_subsidiary ON consolidation_rules(subsidiary_entity_id);
CREATE INDEX IF NOT EXISTS idx_cr_active ON consolidation_rules(is_active) WHERE is_active = true;
CREATE UNIQUE INDEX IF NOT EXISTS idx_cr_unique ON consolidation_rules(parent_entity_id, subsidiary_entity_id);

-- Comments
COMMENT ON TABLE consolidation_rules IS 'Rules for consolidating subsidiary financials into parent';

-- ============================================================================
-- 7. EXCHANGE RATES (ENHANCED)
-- ============================================================================

-- Note: acct_currencies and acct_exchange_rates already exist from migration 046
-- This adds entity-specific exchange rate overrides

CREATE TABLE IF NOT EXISTS entity_exchange_rates (
  rate_id VARCHAR(20) PRIMARY KEY,
  entity_id VARCHAR(20) NOT NULL REFERENCES entities(entity_id) ON DELETE CASCADE,
  from_currency CHAR(3) NOT NULL,
  to_currency CHAR(3) NOT NULL,
  rate_date DATE NOT NULL,
  exchange_rate DECIMAL(12, 6) NOT NULL,
  rate_source VARCHAR(100), -- Where the rate came from
  is_override BOOLEAN DEFAULT false, -- Override global rates?
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  created_by VARCHAR(50) REFERENCES users(user_id) ON DELETE SET NULL
);

-- Indexes for entity exchange rates
CREATE INDEX IF NOT EXISTS idx_eer_entity ON entity_exchange_rates(entity_id);
CREATE INDEX IF NOT EXISTS idx_eer_currencies ON entity_exchange_rates(from_currency, to_currency);
CREATE INDEX IF NOT EXISTS idx_eer_date ON entity_exchange_rates(rate_date);
CREATE UNIQUE INDEX IF NOT EXISTS idx_eer_unique ON entity_exchange_rates(entity_id, from_currency, to_currency, rate_date);

-- Comments
COMMENT ON TABLE entity_exchange_rates IS 'Entity-specific exchange rates that override global rates';

-- ============================================================================
-- 8. ENTITY AUDIT LOG
-- ============================================================================

-- Entity audit action enum
DO $$ BEGIN
  CREATE TYPE entity_audit_action AS ENUM (
    'ENTITY_CREATED',
    'ENTITY_UPDATED',
    'ENTITY_DELETED',
    'ENTITY_MERGED',
    'RELATIONSHIP_ADDED',
    'RELATIONSHIP_REMOVED',
    'USER_ASSIGNED',
    'USER_REMOVED',
    'CONSOLIDATION_RULE_CHANGED',
    'SETTINGS_CHANGED'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Entity audit log table
CREATE TABLE IF NOT EXISTS entity_audit_log (
  audit_id VARCHAR(20) PRIMARY KEY,
  entity_id VARCHAR(20) REFERENCES entities(entity_id) ON DELETE SET NULL,
  action entity_audit_action NOT NULL,
  old_values JSONB,
  new_values JSONB,
  related_entity_id VARCHAR(20) REFERENCES entities(entity_id) ON DELETE SET NULL,
  user_id VARCHAR(50) REFERENCES users(user_id) ON DELETE SET NULL,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Indexes for entity audit log
CREATE INDEX IF NOT EXISTS idx_eal_entity ON entity_audit_log(entity_id);
CREATE INDEX IF NOT EXISTS idx_eal_action ON entity_audit_log(action);
CREATE INDEX IF NOT EXISTS idx_eal_user ON entity_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_eal_created ON entity_audit_log(created_at);

-- ============================================================================
-- SEED DATA - DEFAULT HEAD OFFICE ENTITY
-- ============================================================================

-- Insert default head office entity
INSERT INTO entities (
  entity_id,
  entity_code,
  entity_name,
  entity_type,
  entity_status,
  legal_name,
  base_currency,
  hierarchy_level,
  sort_order,
  is_active,
  created_by
) VALUES (
  'ENT-00001',
  'HO-001',
  'Head Office',
  'HEAD_OFFICE',
  'ACTIVE',
  'Main Operating Company',
  'USD',
  0,
  0,
  true,
  (SELECT user_id FROM users WHERE email = 'admin@opsui.local' LIMIT 1)
) ON CONFLICT (entity_id) DO NOTHING;

-- Insert default entity settings
INSERT INTO entity_settings (
  setting_id,
  entity_id,
  setting_key,
  setting_value,
  setting_type,
  description
) VALUES
  ('ES-00001', 'ENT-00001', 'timezone', 'UTC', 'STRING', 'Default timezone for this entity'),
  ('ES-00002', 'ENT-00001', 'locale', 'en-US', 'STRING', 'Default locale for this entity'),
  ('ES-00003', 'ENT-00001', 'date_format', 'YYYY-MM-DD', 'STRING', 'Default date format'),
  ('ES-00004', 'ENT-00001', 'number_format', '#,##0.00', 'STRING', 'Default number format'),
  ('ES-00005', 'ENT-00001', 'decimal_separator', '.', 'STRING', 'Decimal separator'),
  ('ES-00006', 'ENT-00001', 'thousands_separator', ',', 'STRING', 'Thousands separator')
ON CONFLICT DO NOTHING;

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to get entity hierarchy path
CREATE OR REPLACE FUNCTION get_entity_hierarchy_path(p_entity_id VARCHAR)
RETURNS TABLE(entity_id VARCHAR, entity_code VARCHAR, entity_name VARCHAR, level INTEGER) AS $$
BEGIN
  RETURN QUERY
  WITH RECURSIVE entity_tree AS (
    -- Base case: the entity itself
    SELECT e.entity_id, e.entity_code, e.entity_name, 0 as level
    FROM entities e
    WHERE e.entity_id = p_entity_id

    UNION ALL

    -- Recursive case: parent entities
    SELECT e.entity_id, e.entity_code, e.entity_name, et.level + 1
    FROM entities e
    INNER JOIN entity_tree et ON e.entity_id = (
      SELECT parent_entity_id FROM entities WHERE entity_id = et.entity_id
    )
    WHERE e.parent_entity_id IS NOT NULL
  )
  SELECT * FROM entity_tree ORDER BY level DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to get all subsidiaries of an entity
CREATE OR REPLACE FUNCTION get_entity_subsidiaries(p_entity_id VARCHAR, p_include_children BOOLEAN DEFAULT true)
RETURNS TABLE(entity_id VARCHAR, entity_code VARCHAR, entity_name VARCHAR) AS $$
BEGIN
  IF p_include_children THEN
    RETURN QUERY
    WITH RECURSIVE entity_tree AS (
      -- Base case: direct children
      SELECT e.entity_id, e.entity_code, e.entity_name
      FROM entities e
      WHERE e.parent_entity_id = p_entity_id

      UNION ALL

      -- Recursive case: children's children
      SELECT e.entity_id, e.entity_code, e.entity_name
      FROM entities e
      INNER JOIN entity_tree et ON e.parent_entity_id = et.entity_id
    )
    SELECT DISTINCT * FROM entity_tree;
  ELSE
    RETURN QUERY
    SELECT e.entity_id, e.entity_code, e.entity_name
    FROM entities e
    WHERE e.parent_entity_id = p_entity_id;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to update hierarchy levels
CREATE OR REPLACE FUNCTION update_entity_hierarchy_levels()
RETURNS void AS $$
BEGIN
  WITH RECURSIVE entity_tree AS (
    -- Start with head offices (no parent)
    SELECT entity_id, 0 as level
    FROM entities
    WHERE parent_entity_id IS NULL

    UNION ALL

    -- Add children
    SELECT e.entity_id, et.level + 1
    FROM entities e
    INNER JOIN entity_tree et ON e.parent_entity_id = et.entity_id
  )
  UPDATE entities e
  SET hierarchy_level = et.level,
      updated_at = NOW()
  FROM entity_tree et
  WHERE e.entity_id = et.entity_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Update updated_at timestamp on entities
CREATE OR REPLACE FUNCTION update_entities_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS entities_updated_at ON entities;
CREATE TRIGGER entities_updated_at
  BEFORE UPDATE ON entities
  FOR EACH ROW
  EXECUTE FUNCTION update_entities_updated_at();

-- Update hierarchy levels when entity parent changes
CREATE OR REPLACE FUNCTION update_hierarchy_on_parent_change()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.parent_entity_id IS DISTINCT FROM OLD.parent_entity_id THEN
    PERFORM update_entity_hierarchy_levels();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS entity_parent_change ON entities;
CREATE TRIGGER entity_parent_change
  AFTER INSERT OR UPDATE ON entities
  FOR EACH ROW
  WHEN (NEW.parent_entity_id IS DISTINCT FROM OLD.parent_entity_id OR OLD.parent_entity_id IS NULL)
  EXECUTE FUNCTION update_hierarchy_on_parent_change();

-- ============================================================================
-- GRANT PERMISSIONS (if using row-level security)
-- ============================================================================

-- Enable RLS on entity tables
ALTER TABLE entities ENABLE ROW LEVEL SECURITY;
ALTER TABLE entity_users ENABLE ROW LEVEL SECURITY;

-- Policies would be added based on your security requirements
-- Example: Users can only see entities they're assigned to
-- CREATE POLICY entities_select_policy ON entities
--   FOR SELECT
--   USING (entity_id IN (SELECT entity_id FROM entity_users WHERE user_id = current_user_id()));

-- ============================================================================
-- COMPLETE
-- ============================================================================

-- Migration complete
-- Next steps:
-- 1. Create entity types in shared package
-- 2. Create MultiEntityService and MultiEntityRepository
-- 3. Create multi-entity API routes
-- 4. Create entity management frontend
