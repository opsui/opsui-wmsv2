/**
 * Migration: Create custom roles and permissions tables
 *
 * This migration adds support for custom roles with granular permissions
 */

export async function up(query) {
  // Create custom_roles table
  await query(`
    CREATE TABLE IF NOT EXISTS custom_roles (
      role_id VARCHAR(50) PRIMARY KEY,
      name VARCHAR(100) NOT NULL UNIQUE,
      description TEXT,
      is_system BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  `);

  // Create role_permissions table for mapping roles to permissions
  await query(`
    CREATE TABLE IF NOT EXISTS role_permissions (
      role_permission_id SERIAL PRIMARY KEY,
      role_id VARCHAR(50) NOT NULL,
      permission VARCHAR(100) NOT NULL,
      granted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      granted_by VARCHAR(50) NOT NULL,
      UNIQUE(role_id, permission),
      CONSTRAINT fk_role_permissions_user FOREIGN KEY (granted_by) REFERENCES users(user_id) ON DELETE CASCADE
    );
  `);

  // Create index for faster lookups
  await query(`
    CREATE INDEX IF NOT EXISTS idx_role_permissions_role_id ON role_permissions(role_id);
  `);

  // Grant access to the application user
  await query(`
    GRANT SELECT, INSERT, UPDATE, DELETE ON custom_roles TO wms_app;
    GRANT SELECT, INSERT, UPDATE, DELETE ON role_permissions TO wms_app;
    GRANT USAGE, SELECT ON SEQUENCE custom_roles_role_id_seq TO wms_app;
    GRANT USAGE, SELECT ON SEQUENCE role_permissions_role_permission_id_seq TO wms_app;
  `);
}

export async function down(query) {
  await query(`DROP TABLE IF EXISTS role_permissions CASCADE;`);
  await query(`DROP TABLE IF EXISTS custom_roles CASCADE;`);
}
