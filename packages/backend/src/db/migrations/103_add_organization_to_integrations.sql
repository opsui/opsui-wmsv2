-- ============================================================================
-- MIGRATION 103: Link integrations to organizations
-- Creates a mapping table to associate integrations with organizations
-- ============================================================================

CREATE TABLE IF NOT EXISTS integration_organizations (
  integration_id VARCHAR(255) NOT NULL,
  organization_id VARCHAR(255) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (integration_id, organization_id)
);

CREATE INDEX IF NOT EXISTS idx_integration_orgs_org
  ON integration_organizations(organization_id);
