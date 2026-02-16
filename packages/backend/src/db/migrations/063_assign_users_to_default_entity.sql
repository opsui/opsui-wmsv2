-- ============================================================================
-- ASSIGN USERS TO DEFAULT ENTITY
-- Assigns all existing users to the default entity (ENT-00001)
-- This ensures the module management system can work for all users
-- ============================================================================

-- Assign all existing users to the default entity
-- Uses ON CONFLICT to handle users that are already assigned
INSERT INTO entity_users (
  entity_user_id,
  entity_id,
  user_id,
  entity_user_role,
  is_default_entity,
  can_view_financials,
  can_edit_financials,
  can_approve_transactions,
  is_active,
  created_at
)
SELECT
  'EU-' || LPAD(ROW_NUMBER() OVER ()::TEXT, 5, '0'),
  'ENT-00001',
  u.user_id,
  CASE
    WHEN u.role = 'ADMIN' THEN 'ENTITY_ADMIN'::entity_user_role
    WHEN u.role = 'SUPERVISOR' THEN 'ENTITY_MANAGER'::entity_user_role
    WHEN u.role = 'ACCOUNTING' THEN 'ENTITY_ACCOUNTANT'::entity_user_role
    ELSE 'ENTITY_USER'::entity_user_role
  END,
  true, -- is_default_entity
  CASE WHEN u.role IN ('ADMIN', 'SUPERVISOR', 'ACCOUNTING') THEN true ELSE false END, -- can_view_financials
  CASE WHEN u.role IN ('ADMIN', 'ACCOUNTING') THEN true ELSE false END, -- can_edit_financials
  CASE WHEN u.role = 'ADMIN' THEN true ELSE false END, -- can_approve_transactions
  true,
  NOW()
FROM users u
WHERE u.deleted_at IS NULL
ON CONFLICT (entity_id, user_id) DO NOTHING;

-- Comment
COMMENT ON TABLE entity_users IS 'Assigns users to entities with role-based access control. All users are assigned to ENT-00001 by default.';
