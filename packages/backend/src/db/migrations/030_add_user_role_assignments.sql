-- Migration: Add user_role_assignments table for multi-role support
-- This allows admins to grant additional roles to users
-- Date: 2026-01-19

-- Function to generate assignment ID
CREATE OR REPLACE FUNCTION generate_assignment_id()
RETURNS VARCHAR(20) AS $$
  SELECT 'URA-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
$$ LANGUAGE SQL;

-- Create junction table for user role assignments
CREATE TABLE IF NOT EXISTS user_role_assignments (
  assignment_id VARCHAR(20) PRIMARY KEY,
  user_id VARCHAR(20) NOT NULL,
  role user_role NOT NULL,
  granted_by VARCHAR(20) NOT NULL,
  granted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  active BOOLEAN NOT NULL DEFAULT true,
  CONSTRAINT fk_user_role_assignments_user
    FOREIGN KEY (user_id)
    REFERENCES users(user_id)
    ON DELETE CASCADE,
  CONSTRAINT fk_user_role_assignments_granted_by
    FOREIGN KEY (granted_by)
    REFERENCES users(user_id)
    ON DELETE SET NULL
);

-- Create unique constraint to prevent duplicate role assignments
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_role_assignments_unique
  ON user_role_assignments (user_id, role)
  WHERE active = true;

-- Create index for fast lookups
CREATE INDEX IF NOT EXISTS idx_user_role_assignments_user_id
  ON user_role_assignments (user_id)
  WHERE active = true;

-- Add comment for documentation
COMMENT ON TABLE user_role_assignments IS 'Stores additional roles granted to users by admins. Users can switch between their base role and any granted roles.';
COMMENT ON COLUMN user_role_assignments.assignment_id IS 'Unique identifier for the role assignment';
COMMENT ON COLUMN user_role_assignments.user_id IS 'The user receiving the role assignment';
COMMENT ON COLUMN user_role_assignments.role IS 'The role being granted to the user';
COMMENT ON COLUMN user_role_assignments.granted_by IS 'The admin user who granted this role';
COMMENT ON COLUMN user_role_assignments.granted_at IS 'When the role was granted';
COMMENT ON COLUMN user_role_assignments.active IS 'Whether this role assignment is currently active';

-- Trigger function to auto-generate assignment_id
CREATE OR REPLACE FUNCTION set_assignment_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.assignment_id IS NULL OR NEW.assignment_id = '' THEN
    NEW.assignment_id := generate_assignment_id();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-generate assignment_id on insert
DROP TRIGGER IF EXISTS trg_set_assignment_id ON user_role_assignments;
CREATE TRIGGER trg_set_assignment_id
  BEFORE INSERT ON user_role_assignments
  FOR EACH ROW
  EXECUTE FUNCTION set_assignment_id();
