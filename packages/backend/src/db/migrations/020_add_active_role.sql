-- Migration: Add active_role column to users table
-- This allows users with multiple roles to switch between them
-- Date: 2026-01-18

-- Add active_role column (nullable, defaults to NULL which means use base role)
ALTER TABLE users ADD COLUMN IF NOT EXISTS active_role user_role;

-- Add comment for documentation
COMMENT ON COLUMN users.active_role IS 'The currently active role for multi-role users. NULL means use the base role from the role column.';
