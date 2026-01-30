-- ============================================================================
-- ADD RMA ROLE TO DATABASE
-- ============================================================================

-- Add new values to the user_role enum type
-- PostgreSQL doesn't support ALTER TYPE ... ADD VALUE in a transaction,
-- and we need to add them one at a time if they don't exist

DO $$
BEGIN
  -- Add INWARDS if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'INWARDS' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'user_role')) THEN
    ALTER TYPE user_role ADD VALUE 'INWARDS';
  END IF;

  -- Add SALES if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'SALES' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'user_role')) THEN
    ALTER TYPE user_role ADD VALUE 'SALES';
  END IF;

  -- Add MAINTENANCE if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'MAINTENANCE' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'user_role')) THEN
    ALTER TYPE user_role ADD VALUE 'MAINTENANCE';
  END IF;

  -- Add PRODUCTION if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'PRODUCTION' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'user_role')) THEN
    ALTER TYPE user_role ADD VALUE 'PRODUCTION';
  END IF;

  -- Add RMA if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'RMA' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'user_role')) THEN
    ALTER TYPE user_role ADD VALUE 'RMA';
  END IF;
END $$;
