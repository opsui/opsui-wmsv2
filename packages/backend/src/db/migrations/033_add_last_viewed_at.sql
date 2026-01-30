-- Add last_viewed_at column to orders table
-- This tracks when a picker last viewed an order, which helps identify
-- which order is actively being worked on (the one on their screen)

ALTER TABLE orders ADD COLUMN last_viewed_at TIMESTAMP WITH TIME ZONE;