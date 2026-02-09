/**
 * Jest Global Teardown
 *
 * Runs once after all test suites.
 * Cleans up test database and connections.
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

// ============================================================================
// Global Teardown Function
// ============================================================================

export default async function globalTeardown() {
  console.log('[TEST] Starting global teardown...');

  // Clean up test data (optional - can keep for debugging)
  const keepTestData = process.env.KEEP_TEST_DATA === 'true';

  if (!keepTestData) {
    await cleanupTestData();
  }

  // Close database connections
  await closeConnections();

  console.log('[TEST] Global teardown complete!');
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Clean up test data
 */
async function cleanupTestData() {
  console.log('[TEST] Cleaning up test data...');

  const pool = new Pool(TEST_DB_CONFIG);

  try {
    // Clean up in reverse order of foreign key dependencies
    await pool.query("DELETE FROM inventory WHERE product_id LIKE '%-id'");
    await pool.query("DELETE FROM locations WHERE id LIKE 'loc-%'");
    await pool.query("DELETE FROM products WHERE id LIKE 'product-%-id'");
    await pool.query("DELETE FROM users WHERE id LIKE '%-user-id'");
    await pool.query("DELETE FROM roles WHERE id LIKE '%-role-id'");

    await pool.end();
    console.log('[TEST] Test data cleaned up!');
  } catch (error) {
    console.error('[TEST] Error cleaning up test data:', error);
    await pool.end();
  }
}

/**
 * Close all database connections
 */
async function closeConnections() {
  // Note: Jest should handle this automatically
  // This is a safeguard for any lingering connections
  console.log('[TEST] Closing database connections...');
}
