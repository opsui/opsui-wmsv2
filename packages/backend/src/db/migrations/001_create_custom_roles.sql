/**
 * Migration: Create custom roles and permissions tables
 *
 * This migration adds support for custom roles with granular permissions
 */

-- Create custom_roles table
CREATE TABLE IF NOT EXISTS custom_roles (
  role_id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  is_system BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create role_permissions table for mapping roles to permissions
CREATE TABLE IF NOT EXISTS role_permissions (
  role_permission_id SERIAL PRIMARY KEY,
  role_id VARCHAR(50) NOT NULL,
  permission VARCHAR(100) NOT NULL,
  granted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  granted_by VARCHAR(50) NOT NULL,
  UNIQUE(role_id, permission)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_role_permissions_role_id ON role_permissions(role_id);

-- Add foreign key constraint if users table exists (wrapped in do block to handle gracefully)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'users') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint WHERE conname = 'fk_role_permissions_user'
    ) THEN
      ALTER TABLE role_permissions
      ADD CONSTRAINT fk_role_permissions_user
      FOREIGN KEY (granted_by) REFERENCES users(user_id) ON DELETE CASCADE;
    END IF;
  END IF;
END $$;
