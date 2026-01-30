-- Migration: Auto-grant all roles to admin users
-- This trigger automatically grants all roles when a user becomes an admin
-- Date: 2026-01-20

-- All roles that admins should have (excluding ADMIN itself)
-- PICKER, PACKER, STOCK_CONTROLLER, SUPERVISOR, INWARDS, SALES, MAINTENANCE, PRODUCTION, RMA

-- First, create a function to grant all roles to a user
CREATE OR REPLACE FUNCTION grant_all_roles_to_user(target_user_id VARCHAR(20))
RETURNS VOID AS $$
BEGIN
  -- Delete existing role assignments for this user
  DELETE FROM user_role_assignments WHERE user_id = target_user_id;
  
  -- Insert all roles for this user
  INSERT INTO user_role_assignments (user_id, role, granted_by, granted_at, active)
  SELECT 
    target_user_id, 
    role::user_role, 
    target_user_id,  -- Self-granted
    NOW(), 
    true
  FROM unnest(ARRAY[
    'PICKER'::user_role, 
    'PACKER'::user_role, 
    'STOCK_CONTROLLER'::user_role, 
    'SUPERVISOR'::user_role, 
    'INWARDS'::user_role, 
    'SALES'::user_role, 
    'MAINTENANCE'::user_role, 
    'PRODUCTION'::user_role, 
    'RMA'::user_role
  ]) AS role;
END;
$$ LANGUAGE plpgsql;

-- Create trigger function that fires when user role changes to ADMIN
CREATE OR REPLACE FUNCTION trigger_grant_all_roles_to_admin()
RETURNS TRIGGER AS $$
BEGIN
  -- Only proceed if role is being set to ADMIN
  IF NEW.role = 'ADMIN'::user_role AND (OLD.role IS NULL OR OLD.role != 'ADMIN'::user_role) THEN
    PERFORM grant_all_roles_to_user(NEW.user_id);
  END IF;
  
  -- If role is being changed FROM admin, revoke all additional roles
  IF OLD.role = 'ADMIN'::user_role AND NEW.role != 'ADMIN'::user_role THEN
    DELETE FROM user_role_assignments WHERE user_id = NEW.user_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists
DROP TRIGGER IF EXISTS trg_grant_all_roles_to_admin ON users;

-- Create trigger on users table
CREATE TRIGGER trg_grant_all_roles_to_admin
  AFTER INSERT OR UPDATE OF role ON users
  FOR EACH ROW
  EXECUTE FUNCTION trigger_grant_all_roles_to_admin();

-- One-time: Grant all roles to existing admin users
INSERT INTO user_role_assignments (user_id, role, granted_by, granted_at, active)
SELECT 
  u.user_id,
  r.role::user_role,
  u.user_id,
  NOW(),
  true
FROM users u
CROSS JOIN unnest(ARRAY[
  'PICKER'::user_role, 
  'PACKER'::user_role, 
  'STOCK_CONTROLLER'::user_role, 
  'SUPERVISOR'::user_role, 
  'INWARDS'::user_role, 
  'SALES'::user_role, 
  'MAINTENANCE'::user_role, 
  'PRODUCTION'::user_role, 
  'RMA'::user_role
]) AS r(role)
WHERE u.role = 'ADMIN'::user_role
ON CONFLICT (user_id, role) WHERE active = true DO NOTHING;

-- Add comment
COMMENT ON FUNCTION grant_all_roles_to_user IS 'Grants all roles to a specified user';
COMMENT ON FUNCTION trigger_grant_all_roles_to_admin IS 'Trigger function to auto-grant all roles when user becomes admin';
