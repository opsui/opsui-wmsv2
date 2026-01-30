/**
 * Run the custom roles migration
 *
 * Creates tables for custom roles and permissions system
 */

import { query, closePool } from './client';

async function runMigration() {
  try {
    console.log('Running custom roles migration...');

    // Drop existing tables if they exist (to recreate with correct schema)
    console.log('Dropping existing tables if present...');
    await query(`DROP TABLE IF EXISTS role_permissions CASCADE;`);
    await query(`DROP TABLE IF EXISTS custom_roles CASCADE;`);

    // Create custom_roles table
    console.log('Creating custom_roles table...');
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
    console.log('Creating role_permissions table...');
    await query(`
      CREATE TABLE IF NOT EXISTS role_permissions (
        role_permission_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        role_id VARCHAR(50) NOT NULL,
        permission VARCHAR(100) NOT NULL,
        granted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        granted_by VARCHAR(50) NOT NULL,
        UNIQUE(role_id, permission),
        CONSTRAINT fk_role_permissions_user FOREIGN KEY (granted_by) REFERENCES users(user_id) ON DELETE CASCADE
      );
    `);

    // Create index for faster lookups
    console.log('Creating indexes...');
    await query(`
      CREATE INDEX IF NOT EXISTS idx_role_permissions_role_id ON role_permissions(role_id);
    `);

    // Grant access to the application user (if using PostgreSQL with roles)
    try {
      await query(`
        GRANT SELECT, INSERT, UPDATE, DELETE ON custom_roles TO wms_app;
        GRANT SELECT, INSERT, UPDATE, DELETE ON role_permissions TO wms_app;
      `);
    } catch (e) {
      // Grant may fail if user doesn't exist or we're not using role-based access
      console.log('Note: Grant statements may have failed (expected in some environments)');
    }

    console.log('Custom roles migration completed successfully!');
    await closePool();
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    await closePool();
    process.exit(1);
  }
}

runMigration();
