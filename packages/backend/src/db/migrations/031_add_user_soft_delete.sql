-- Migration: Add soft delete functionality to users table
-- This allows users to be marked as deleted and kept for 3 days before permanent deletion
-- Date: 2026-01-20

-- Add deleted_at column to track when users are marked for deletion
ALTER TABLE users ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;

-- Create index for efficient queries on soft-deleted users
CREATE INDEX IF NOT EXISTS idx_users_deleted_at ON users(deleted_at) WHERE deleted_at IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN users.deleted_at IS 'Timestamp when user was marked for deletion. Users are permanently deleted after 3 days. NULL means user is active.';

-- Create function to permanently delete users older than 3 days
CREATE OR REPLACE FUNCTION cleanup_deleted_users()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Delete users marked for deletion more than 3 days ago
  DELETE FROM users
  WHERE deleted_at IS NOT NULL
    AND deleted_at < NOW() - INTERVAL '3 days';

  GET DIAGNOSTICS deleted_count = ROW_COUNT;

  -- Log the cleanup
  RAISE NOTICE 'Cleaned up % users past 3-day grace period', deleted_count;

  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Add comment for documentation
COMMENT ON FUNCTION cleanup_deleted_users() IS 'Permanently deletes users who were marked for deletion more than 3 days ago. Returns the count of deleted users.';
