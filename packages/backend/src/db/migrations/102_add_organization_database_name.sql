-- Add database_name column to organizations table
-- Enables database-per-tenant isolation.
-- NULL or 'wms_db' means use the default shared database.

ALTER TABLE organizations ADD COLUMN IF NOT EXISTS database_name VARCHAR(100) DEFAULT NULL;

-- Add a comment explaining the column
COMMENT ON COLUMN organizations.database_name IS 'Dedicated database name for this organization. NULL means shared default database.';
