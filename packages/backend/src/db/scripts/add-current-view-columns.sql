-- Add missing current_view columns to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS current_view VARCHAR(50);
ALTER TABLE users ADD COLUMN IF NOT EXISTS current_view_updated_at TIMESTAMP;