/**
 * Jest Global Setup
 *
 * Runs once before all test suites.
 * Sets up the test database and global test fixtures.
 */

import { Pool } from 'pg';

// ============================================================================
// Configuration
// ============================================================================

const TEST_DB_CONFIG = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'test_db',
  user: process.env.DB_USER || 'test_user',
  password: process.env.DB_PASSWORD || 'test_password',
};

const ADMIN_DB_CONFIG = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: 'postgres', // Connect to default database to create test database
  user: process.env.DB_USER || 'test_user',
  password: process.env.DB_PASSWORD || 'test_password',
};

// ============================================================================
// Global Setup Function
// ============================================================================

export default async function globalSetup() {
  console.log('[TEST] Starting global setup...');

  // Create test database if it doesn't exist
  await createTestDatabase();

  // Run database migrations
  await runMigrations();

  // Seed test data
  await seedTestData();

  console.log('[TEST] Global setup complete!');
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Create the test database
 */
async function createTestDatabase() {
  console.log('[TEST] Creating test database...');

  const pool = new Pool(ADMIN_DB_CONFIG);

  try {
    // Check if database exists
    const result = await pool.query(
      `SELECT 1 FROM pg_database WHERE datname = '${TEST_DB_CONFIG.database}'`
    );

    if (result.rows.length === 0) {
      // Create database
      await pool.query(`CREATE DATABASE ${TEST_DB_CONFIG.database}`);
      console.log(`[TEST] Created database: ${TEST_DB_CONFIG.database}`);
    } else {
      console.log(`[TEST] Database already exists: ${TEST_DB_CONFIG.database}`);
    }

    // Close connection
    await pool.end();
  } catch (error) {
    console.error('[TEST] Error creating test database:', error);
    await pool.end();
    throw error;
  }
}

/**
 * Run database migrations
 */
async function runMigrations() {
  console.log('[TEST] Running database migrations...');

  const pool = new Pool(TEST_DB_CONFIG);

  try {
    // Enable required extensions
    await pool.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
    await pool.query(`CREATE EXTENSION IF NOT EXISTS "pg_trgm"`);

    // Run migrations from files
    const { readdir } = await import('fs/promises');
    const { join } = await import('path');
    const migrationsDir = join(__dirname, '../../db/migrations');

    try {
      const migrationFiles = await readdir(migrationsDir);
      const sqlMigrations = migrationFiles.filter(f => f.endsWith('.sql')).sort();

      for (const file of sqlMigrations) {
        console.log(`[TEST] Running migration: ${file}`);
        const migrationPath = join(migrationsDir, file);
        const { readFile } = await import('fs/promises');
        const migrationSQL = await readFile(migrationPath, 'utf-8');

        await pool.query(migrationSQL);
      }
    } catch (error) {
      // Migrations directory might not exist yet
      if ((error as any).code === 'ENOENT') {
        console.log('[TEST] No migrations directory found, skipping...');
      }
    }

    await pool.end();
  } catch (error) {
    console.error('[TEST] Error running migrations:', error);
    await pool.end();
    throw error;
  }
}

/**
 * Seed test data
 */
async function seedTestData() {
  console.log('[TEST] Seeding test data...');

  const pool = new Pool(TEST_DB_CONFIG);

  try {
    // Seed roles
    await pool.query(`
      INSERT INTO roles (id, name, description, permissions)
      VALUES
        ('admin-role-id', 'ADMIN', 'Administrator', '{"all": true}'),
        ('picker-role-id', 'PICKER', 'Warehouse Picker', '{"orders": ["read", "update"]}'),
        ('supervisor-role-id', 'SUPERVISOR', 'Supervisor', '{"orders": ["read", "update", "cancel"]}')
      ON CONFLICT (id) DO NOTHING
    `);

    // Seed test users
    const bcrypt = await import('bcrypt');
    const hashedPassword = await bcrypt.hash('test-password', 10);

    await pool.query(
      `
      INSERT INTO users (id, email, password_hash, name, role_id, is_active)
      VALUES
        ('admin-user-id', 'admin@test.com', $1, 'Test Admin', 'admin-role-id', true),
        ('picker-user-id', 'picker@test.com', $1, 'Test Picker', 'picker-role-id', true),
        ('supervisor-user-id', 'supervisor@test.com', $1, 'Test Supervisor', 'supervisor-role-id', true)
      ON CONFLICT (id) DO NOTHING
    `,
      [hashedPassword]
    );

    // Seed test products
    await pool.query(`
      INSERT INTO products (id, sku, name, description, unit_of_measure, weight_lbs)
      VALUES
        ('product-1-id', 'SKU-001', 'Test Product 1', 'Description 1', 'EA', 1.5),
        ('product-2-id', 'SKU-002', 'Test Product 2', 'Description 2', 'EA', 2.0),
        ('product-3-id', 'SKU-003', 'Test Product 3', 'Description 3', 'CS', 5.0)
      ON CONFLICT (id) DO NOTHING
    `);

    // Seed test locations
    await pool.query(`
      INSERT INTO locations (id, zone, aisle, shelf, bin, location_type)
      VALUES
        ('loc-001', 'A', '01', '01', '01', 'storage'),
        ('loc-002', 'A', '01', '02', '01', 'storage'),
        ('loc-003', 'B', '01', '01', '01', 'storage')
      ON CONFLICT (id) DO NOTHING
    `);

    // Seed test inventory
    await pool.query(`
      INSERT INTO inventory (id, product_id, location_id, quantity_available, quantity_allocated)
      VALUES
        ('inv-001', 'product-1-id', 'loc-001', 100, 0),
        ('inv-002', 'product-2-id', 'loc-002', 50, 0),
        ('inv-003', 'product-3-id', 'loc-003', 25, 0)
      ON CONFLICT (id) DO NOTHING
    `);

    await pool.end();
    console.log('[TEST] Test data seeded successfully!');
  } catch (error) {
    console.error('[TEST] Error seeding test data:', error);
    await pool.end();
    throw error;
  }
}
