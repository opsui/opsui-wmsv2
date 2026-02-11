-- ============================================================================
-- ADD ALL MISSING USER ROLES TO DATABASE
-- This ensures all roles defined in the frontend enum exist in the database
-- ============================================================================

-- Add all missing values to the user_role enum type
-- PostgreSQL doesn't support ALTER TYPE ... ADD VALUE in a transaction,
-- and we need to add them one at a time if they don't exist

DO $$
BEGIN
  -- Add STOCK_CONTROLLER if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'STOCK_CONTROLLER' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'user_role')) THEN
    ALTER TYPE user_role ADD VALUE 'STOCK_CONTROLLER';
  END IF;

  -- Add INWARDS if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'INWARDS' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'user_role')) THEN
    ALTER TYPE user_role ADD VALUE 'INWARDS';
  END IF;

  -- Add DISPATCH if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'DISPATCH' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'user_role')) THEN
    ALTER TYPE user_role ADD VALUE 'DISPATCH';
  END IF;

  -- Add PRODUCTION if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'PRODUCTION' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'user_role')) THEN
    ALTER TYPE user_role ADD VALUE 'PRODUCTION';
  END IF;

  -- Add SALES if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'SALES' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'user_role')) THEN
    ALTER TYPE user_role ADD VALUE 'SALES';
  END IF;

  -- Add MAINTENANCE if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'MAINTENANCE' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'user_role')) THEN
    ALTER TYPE user_role ADD VALUE 'MAINTENANCE';
  END IF;

  -- Add RMA if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'RMA' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'user_role')) THEN
    ALTER TYPE user_role ADD VALUE 'RMA';
  END IF;

  -- Add ACCOUNTING if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'ACCOUNTING' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'user_role')) THEN
    ALTER TYPE user_role ADD VALUE 'ACCOUNTING';
  END IF;

  -- Add HR_MANAGER if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'HR_MANAGER' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'user_role')) THEN
    ALTER TYPE user_role ADD VALUE 'HR_MANAGER';
  END IF;

  -- Add HR_ADMIN if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'HR_ADMIN' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'user_role')) THEN
    ALTER TYPE user_role ADD VALUE 'HR_ADMIN';
  END IF;
END $$;
