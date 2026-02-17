-- ============================================================================
-- ORGANIZATIONS MULTI-TENANT FOUNDATION
-- Enables true multi-tenancy with organization-level data isolation
-- Each organization represents a separate customer/account with isolated data
-- ============================================================================

-- ============================================================================
-- 1. ORGANIZATION TYPES AND ENUMS
-- ============================================================================

-- Organization status enum
DO $$ BEGIN
  CREATE TYPE organization_status AS ENUM (
    'ACTIVE',
    'SUSPENDED',
    'PENDING_SETUP',
    'TRIAL',
    'CLOSED'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Organization tier/plan enum
DO $$ BEGIN
  CREATE TYPE organization_tier AS ENUM (
    'FREE',
    'STARTER',
    'PROFESSIONAL',
    'ENTERPRISE',
    'CUSTOM'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Organization user role enum
DO $$ BEGIN
  CREATE TYPE organization_user_role AS ENUM (
    'ORG_OWNER',       -- Full control, can delete organization
    'ORG_ADMIN',       -- Manage users, settings, billing
    'ORG_MEMBER',      -- Regular access
    'ORG_VIEWER'       -- Read-only access
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- ============================================================================
-- 2. ORGANIZATIONS TABLE
-- ============================================================================

-- Organizations (tenants) table
CREATE TABLE IF NOT EXISTS organizations (
  organization_id VARCHAR(20) PRIMARY KEY,
  organization_code VARCHAR(20) UNIQUE NOT NULL,
  organization_name VARCHAR(255) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,  -- URL-friendly identifier
  
  -- Status and tier
  status organization_status NOT NULL DEFAULT 'PENDING_SETUP',
  tier organization_tier NOT NULL DEFAULT 'STARTER',
  
  -- Contact information
  legal_name VARCHAR(255),
  tax_id VARCHAR(50),
  registration_number VARCHAR(100),
  
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
  
  -- Branding
  logo_url VARCHAR(500),
  primary_color VARCHAR(7),  -- Hex color code
  custom_domain VARCHAR(255),
  
  -- Settings
  base_currency CHAR(3) DEFAULT 'USD',
  timezone VARCHAR(50) DEFAULT 'UTC',
  date_format VARCHAR(20) DEFAULT 'YYYY-MM-DD',
  fiscal_year_start_month INTEGER DEFAULT 1,
  
  -- Limits based on tier
  max_users INTEGER DEFAULT 10,
  max_entities INTEGER DEFAULT 1,
  max_storage_mb INTEGER DEFAULT 1000,
  
  -- Trial/subscription
  trial_ends_at TIMESTAMP,
  subscription_ends_at TIMESTAMP,
  
  -- Metadata
  settings JSONB DEFAULT '{}',  -- Flexible organization-specific settings
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  created_by VARCHAR(50),
  
  -- Constraints
  CONSTRAINT valid_slug CHECK (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  CONSTRAINT valid_primary_color CHECK (primary_color IS NULL OR primary_color ~ '^#[0-9A-Fa-f]{6}$')
);

-- Indexes for organizations
CREATE INDEX IF NOT EXISTS idx_org_status ON organizations(status);
CREATE INDEX IF NOT EXISTS idx_org_tier ON organizations(tier);
CREATE INDEX IF NOT EXISTS idx_org_slug ON organizations(slug);
CREATE INDEX IF NOT EXISTS idx_org_active ON organizations(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_org_email ON organizations(email);
CREATE INDEX IF NOT EXISTS idx_org_custom_domain ON organizations(custom_domain) WHERE custom_domain IS NOT NULL;

-- Comments
COMMENT ON TABLE organizations IS 'Top-level tenant organizations for multi-tenancy';
COMMENT ON COLUMN organizations.slug IS 'URL-friendly unique identifier for the organization';
COMMENT ON COLUMN organizations.tier IS 'Subscription tier determining feature access and limits';

-- ============================================================================
-- 3. ORGANIZATION USERS TABLE
-- ============================================================================

-- Organization users (which users belong to which organizations)
CREATE TABLE IF NOT EXISTS organization_users (
  organization_user_id VARCHAR(20) PRIMARY KEY,
  organization_id VARCHAR(20) NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,
  user_id VARCHAR(50) NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  
  -- Role and permissions
  role organization_user_role NOT NULL DEFAULT 'ORG_MEMBER',
  is_primary BOOLEAN DEFAULT false,  -- User's primary organization
  
  -- Access control
  can_manage_users BOOLEAN DEFAULT false,
  can_manage_billing BOOLEAN DEFAULT false,
  can_manage_settings BOOLEAN DEFAULT false,
  can_invite_users BOOLEAN DEFAULT false,
  
  -- Status
  is_active BOOLEAN NOT NULL DEFAULT true,
  invited_by VARCHAR(50) REFERENCES users(user_id) ON DELETE SET NULL,
  invited_at TIMESTAMP,
  joined_at TIMESTAMP DEFAULT NOW(),
  
  -- Metadata
  last_access_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(organization_id, user_id)
);

-- Indexes for organization users
CREATE INDEX IF NOT EXISTS idx_org_users_org ON organization_users(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_users_user ON organization_users(user_id);
CREATE INDEX IF NOT EXISTS idx_org_users_role ON organization_users(role);
CREATE INDEX IF NOT EXISTS idx_org_users_active ON organization_users(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_org_users_primary ON organization_users(user_id, is_primary) WHERE is_primary = true;

-- Comments
COMMENT ON TABLE organization_users IS 'Links users to organizations with role-based access control';
COMMENT ON COLUMN organization_users.is_primary IS 'Indicates if this is the user''s primary organization';

-- ============================================================================
-- 4. ORGANIZATION INVITATIONS TABLE
-- ============================================================================

-- Pending invitations to organizations
CREATE TABLE IF NOT EXISTS organization_invitations (
  invitation_id VARCHAR(20) PRIMARY KEY,
  organization_id VARCHAR(20) NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,
  
  -- Invitee details
  email VARCHAR(255) NOT NULL,
  role organization_user_role NOT NULL DEFAULT 'ORG_MEMBER',
  
  -- Invitation tracking
  token VARCHAR(100) UNIQUE NOT NULL,  -- Secure token for accepting invitation
  invited_by VARCHAR(50) NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  invited_at TIMESTAMP NOT NULL DEFAULT NOW(),
  
  -- Status
  accepted_at TIMESTAMP,
  declined_at TIMESTAMP,
  expires_at TIMESTAMP NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
  
  -- Metadata
  message TEXT,  -- Optional message from inviter
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Indexes for invitations
CREATE INDEX IF NOT EXISTS idx_org_invites_org ON organization_invitations(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_invites_email ON organization_invitations(email);
CREATE INDEX IF NOT EXISTS idx_org_invites_token ON organization_invitations(token);
CREATE INDEX IF NOT EXISTS idx_org_invites_pending ON organization_invitations(organization_id, email) 
  WHERE accepted_at IS NULL AND declined_at IS NULL AND expires_at > NOW();

-- Comments
COMMENT ON TABLE organization_invitations IS 'Pending invitations for users to join organizations';

-- ============================================================================
-- 5. ADD ORGANIZATION_ID TO ENTITIES TABLE
-- ============================================================================

-- Add organization_id to entities for multi-tenant isolation
ALTER TABLE entities 
  ADD COLUMN IF NOT EXISTS organization_id VARCHAR(20) REFERENCES organizations(organization_id) ON DELETE CASCADE;

-- Create index for organization-based queries
CREATE INDEX IF NOT EXISTS idx_entities_organization ON entities(organization_id);

-- Update existing entities to belong to a default organization (will be created by seed data)
-- This is handled by the migration script, not here

COMMENT ON COLUMN entities.organization_id IS 'Organization this entity belongs to for multi-tenant isolation';

-- ============================================================================
-- 6. ADD ORGANIZATION_ID TO CORE TABLES
-- ============================================================================

-- Add organization_id to users table (for default organization context)
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS default_organization_id VARCHAR(20) REFERENCES organizations(organization_id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_users_default_org ON users(default_organization_id);

COMMENT ON COLUMN users.default_organization_id IS 'User''s default organization context';

-- Add organization_id to orders table
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS organization_id VARCHAR(20) REFERENCES organizations(organization_id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_orders_organization ON orders(organization_id);

-- Add organization_id to products table
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS organization_id VARCHAR(20) REFERENCES organizations(organization_id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_products_organization ON products(organization_id);

-- Add organization_id to inventory_items table
ALTER TABLE inventory_items
  ADD COLUMN IF NOT EXISTS organization_id VARCHAR(20) REFERENCES organizations(organization_id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_inventory_organization ON inventory_items(organization_id);

-- Add organization_id to skus table
ALTER TABLE skus
  ADD COLUMN IF NOT EXISTS organization_id VARCHAR(20) REFERENCES organizations(organization_id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_skus_organization ON skus(organization_id);

-- Add organization_id to customers table
ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS organization_id VARCHAR(20) REFERENCES organizations(organization_id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_customers_organization ON customers(organization_id);

-- Add organization_id to suppliers table
ALTER TABLE suppliers
  ADD COLUMN IF NOT EXISTS organization_id VARCHAR(20) REFERENCES organizations(organization_id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_suppliers_organization ON suppliers(organization_id);

-- Add organization_id to bin_locations table
ALTER TABLE bin_locations
  ADD COLUMN IF NOT EXISTS organization_id VARCHAR(20) REFERENCES organizations(organization_id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_bin_locations_organization ON bin_locations(organization_id);

-- Add organization_id to warehouses table
ALTER TABLE warehouses
  ADD COLUMN IF NOT EXISTS organization_id VARCHAR(20) REFERENCES organizations(organization_id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_warehouses_organization ON warehouses(organization_id);

-- Add organization_id to zones table
ALTER TABLE zones
  ADD COLUMN IF NOT EXISTS organization_id VARCHAR(20) REFERENCES organizations(organization_id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_zones_organization ON zones(organization_id);

-- ============================================================================
-- 7. ORGANIZATION SETTINGS TABLE
-- ============================================================================

-- Organization-specific settings (key-value store)
CREATE TABLE IF NOT EXISTS organization_settings (
  setting_id VARCHAR(20) PRIMARY KEY,
  organization_id VARCHAR(20) NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,
  setting_key VARCHAR(100) NOT NULL,
  setting_value TEXT,
  setting_type VARCHAR(20) DEFAULT 'STRING',  -- STRING, NUMBER, BOOLEAN, JSON
  description TEXT,
  is_encrypted BOOLEAN DEFAULT false,
  is_public BOOLEAN DEFAULT false,  -- Whether this setting is visible to org members
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_by VARCHAR(50) REFERENCES users(user_id) ON DELETE SET NULL,
  
  UNIQUE(organization_id, setting_key)
);

CREATE INDEX IF NOT EXISTS idx_org_settings_org ON organization_settings(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_settings_key ON organization_settings(setting_key);

COMMENT ON TABLE organization_settings IS 'Organization-specific configuration settings';

-- ============================================================================
-- 8. ORGANIZATION AUDIT LOG
-- ============================================================================

-- Audit log for organization-level events
CREATE TABLE IF NOT EXISTS organization_audit_log (
  audit_id VARCHAR(20) PRIMARY KEY,
  organization_id VARCHAR(20) NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,
  
  -- Event details
  event_type VARCHAR(50) NOT NULL,  -- ORG_CREATED, USER_INVITED, SETTINGS_CHANGED, etc.
  event_description TEXT,
  
  -- Actor
  user_id VARCHAR(50) REFERENCES users(user_id) ON DELETE SET NULL,
  user_email VARCHAR(255),
  
  -- Changes
  old_values JSONB,
  new_values JSONB,
  
  -- Request context
  ip_address INET,
  user_agent TEXT,
  
  -- Metadata
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_org_audit_org ON organization_audit_log(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_audit_user ON organization_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_org_audit_event ON organization_audit_log(event_type);
CREATE INDEX IF NOT EXISTS idx_org_audit_created ON organization_audit_log(created_at);

COMMENT ON TABLE organization_audit_log IS 'Audit trail for organization-level events';

-- ============================================================================
-- 9. ROW-LEVEL SECURITY POLICIES (Optional - for database-level isolation)
-- ============================================================================

-- Note: RLS policies are created separately and can be enabled per deployment
-- This provides an additional layer of security at the database level

-- Example RLS policy (commented out by default):
-- ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY orders_isolation ON orders
--   USING (organization_id = current_setting('app.current_organization_id')::VARCHAR);

-- ============================================================================
-- 10. HELPER FUNCTIONS
-- ============================================================================

-- Function to generate unique organization code
CREATE OR REPLACE FUNCTION generate_organization_code()
RETURNS VARCHAR(20) AS $$
DECLARE
  code VARCHAR(20);
  exists BOOLEAN;
BEGIN
  LOOP
    code := 'ORG' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 7));
    SELECT EXISTS(SELECT 1 FROM organizations WHERE organization_code = code) INTO exists;
    IF NOT exists THEN
      RETURN code;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Function to generate unique slug from name
CREATE OR REPLACE FUNCTION generate_organization_slug(org_name VARCHAR(255))
RETURNS VARCHAR(100) AS $$
DECLARE
  base_slug VARCHAR(100);
  slug VARCHAR(100);
  counter INTEGER := 0;
BEGIN
  -- Convert to lowercase, replace spaces with hyphens, remove special chars
  base_slug := LOWER(REGEXP_REPLACE(org_name, '[^a-zA-Z0-9\s]', '', 'g'));
  base_slug := REGEXP_REPLACE(base_slug, '\s+', '-', 'g');
  base_slug := TRIM(BOTH '-' FROM base_slug);
  
  slug := base_slug;
  
  -- Check for uniqueness and append number if needed
  WHILE EXISTS(SELECT 1 FROM organizations WHERE slug = slug) LOOP
    counter := counter + 1;
    slug := base_slug || '-' || counter;
  END LOOP;
  
  RETURN slug;
END;
$$ LANGUAGE plpgsql;

-- Function to get user's organizations
CREATE OR REPLACE FUNCTION get_user_organizations(p_user_id VARCHAR(50))
RETURNS TABLE (
  organization_id VARCHAR(20),
  organization_name VARCHAR(255),
  slug VARCHAR(100),
  role organization_user_role,
  is_primary BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    o.organization_id,
    o.organization_name,
    o.slug,
    ou.role,
    ou.is_primary
  FROM organizations o
  INNER JOIN organization_users ou ON o.organization_id = ou.organization_id
  WHERE ou.user_id = p_user_id
    AND ou.is_active = true
    AND o.is_active = true
  ORDER BY ou.is_primary DESC, o.organization_name;
END;
$$ LANGUAGE plpgsql;

-- Function to check if user has access to organization
CREATE OR REPLACE FUNCTION user_has_organization_access(
  p_user_id VARCHAR(50),
  p_organization_id VARCHAR(20)
)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS(
    SELECT 1 
    FROM organization_users ou
    INNER JOIN organizations o ON ou.organization_id = o.organization_id
    WHERE ou.user_id = p_user_id
      AND ou.organization_id = p_organization_id
      AND ou.is_active = true
      AND o.is_active = true
  );
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 11. TRIGGERS
-- ============================================================================

-- Trigger to auto-generate organization_id and slug on insert
CREATE OR REPLACE FUNCTION trigger_organization_auto_generate()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.organization_id IS NULL THEN
    NEW.organization_id := generate_organization_code();
  END IF;
  
  IF NEW.slug IS NULL THEN
    NEW.slug := generate_organization_slug(NEW.organization_name);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_organizations_auto_generate ON organizations;
CREATE TRIGGER trigger_organizations_auto_generate
  BEFORE INSERT ON organizations
  FOR EACH ROW
  EXECUTE FUNCTION trigger_organization_auto_generate();

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION trigger_update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_organizations_updated_at ON organizations;
CREATE TRIGGER trigger_organizations_updated_at
  BEFORE UPDATE ON organizations
  FOR EACH ROW
  EXECUTE FUNCTION trigger_update_timestamp();

DROP TRIGGER IF EXISTS trigger_organization_users_updated_at ON organization_users;
CREATE TRIGGER trigger_organization_users_updated_at
  BEFORE UPDATE ON organization_users
  FOR EACH ROW
  EXECUTE FUNCTION trigger_update_timestamp();

-- ============================================================================
-- 12. GRANT PERMISSIONS
-- ============================================================================

-- Grant appropriate permissions to application user
-- These should be adjusted based on your security requirements
GRANT SELECT, INSERT, UPDATE, DELETE ON organizations TO CURRENT_USER;
GRANT SELECT, INSERT, UPDATE, DELETE ON organization_users TO CURRENT_USER;
GRANT SELECT, INSERT, UPDATE, DELETE ON organization_invitations TO CURRENT_USER;
GRANT SELECT, INSERT, UPDATE, DELETE ON organization_settings TO CURRENT_USER;
GRANT SELECT, INSERT, DELETE ON organization_audit_log TO CURRENT_USER;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

-- Log migration completion
DO $$ 
BEGIN
  RAISE NOTICE 'Migration 060_organizations_multi_tenant.sql completed successfully';
END $$;
