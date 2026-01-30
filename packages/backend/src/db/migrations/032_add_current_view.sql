-- Add current_view field to users table to track picker's current page/view
-- Migration: 2024-01-14-add-current-view
-- Description: Tracks which page/view a picker is currently viewing

-- Add current_view column
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS current_view VARCHAR(100),
ADD COLUMN IF NOT EXISTS current_view_updated_at TIMESTAMP WITH TIME ZONE;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_users_current_view ON users(current_view) 
WHERE current_view IS NOT NULL;

-- Add comment
COMMENT ON COLUMN users.current_view IS 'Current page/view the user is on (e.g., "Orders Page", "Order Queue", "Order ORD-123")';
COMMENT ON COLUMN users.current_view_updated_at IS 'Timestamp when current_view was last updated';