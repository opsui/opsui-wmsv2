-- ============================================================================
-- ADD DISPATCH AND ACCOUNTING ROLES TO DATABASE
-- ============================================================================

-- Add new values to the user_role enum type
-- PostgreSQL doesn't support ALTER TYPE ... ADD VALUE in a transaction,
-- and we need to add them one at a time if they don't exist

DO $$
BEGIN
  -- Add DISPATCH if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'DISPATCH' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'user_role')) THEN
    ALTER TYPE user_role ADD VALUE 'DISPATCH';
  END IF;

  -- Add ACCOUNTING if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'ACCOUNTING' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'user_role')) THEN
    ALTER TYPE user_role ADD VALUE 'ACCOUNTING';
  END IF;
END $$;
