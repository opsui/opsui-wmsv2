-- Migration: Fix account_id column length to accommodate UUIDs
-- The chart_of_accounts table was using VARCHAR(20) which is too short for UUIDs

-- Alter the account_id column in chart_of_accounts
ALTER TABLE IF EXISTS acct_chart_of_accounts 
ALTER COLUMN account_id TYPE VARCHAR(50);

-- Update any foreign key references if needed
-- Note: Other tables already reference this correctly, but let's ensure consistency

-- Drop and recreate foreign key constraints where needed
DO $$
DECLARE
    fk_record RECORD;
BEGIN
    -- Find and update all foreign key columns that reference account_id
    FOR fk_record IN 
        SELECT 
            tc.table_name, 
            kcu.column_name,
            tc.constraint_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu 
            ON tc.constraint_name = kcu.constraint_name
        WHERE tc.constraint_type = 'FOREIGN KEY'
            AND kcu.column_name = 'account_id'
            AND tc.table_schema = 'public'
    LOOP
        -- Alter the column type
        EXECUTE format('ALTER TABLE %I ALTER COLUMN %I TYPE VARCHAR(50)', 
            fk_record.table_name, 
            fk_record.column_name);
    END LOOP;
END $$;

-- Add comment
COMMENT ON COLUMN acct_chart_of_accounts.account_id IS 'Unique account identifier (supports UUID format)';