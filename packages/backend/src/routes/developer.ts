/**
 * Developer Routes
 *
 * Development and debugging tools
 * Only available in development environment
 */

import { Router, Response } from 'express';
import { asyncHandler, authenticate } from '../middleware';
import { AuthenticatedRequest } from '../middleware/auth';
import { getPool } from '../db/client';
import { UserRole } from '@opsui/shared';
import * as fs from 'fs';
import * as path from 'path';
import { exec, spawn } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

const router = Router();
const pool = getPool();

// Helper middleware to ensure development environment OR admin user (for crawler testing)
const requireDevelopment = (req: AuthenticatedRequest, res: Response, next: Function) => {
  // Allow in development environment OR for admin users
  const isAdmin = req.user?.baseRole === 'ADMIN' || req.user?.effectiveRole === 'ADMIN';
  if (process.env.NODE_ENV !== 'development' && !isAdmin) {
    res.status(404).json({ error: 'Not found' });
    return;
  }
  next();
};

/**
 * GET /api/developer/stats
 * Get database statistics
 */
router.get(
  '/stats',
  requireDevelopment,
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const stats = await Promise.all([
      pool.query('SELECT COUNT(*) FROM orders'),
      pool.query('SELECT COUNT(*) FROM users'),
      pool.query('SELECT COUNT(*) FROM skus'),
      pool.query('SELECT COUNT(*) FROM audit_logs'),
      pool.query('SELECT COUNT(*) FROM pick_tasks'),
      pool.query('SELECT COUNT(*) FROM bin_locations'),
      pool.query('SELECT COUNT(*) FROM custom_roles'),
    ]);

    res.json({
      orders: parseInt(stats[0].rows[0].count),
      users: parseInt(stats[1].rows[0].count),
      skus: parseInt(stats[2].rows[0].count),
      auditLogs: parseInt(stats[3].rows[0].count),
      pickTasks: parseInt(stats[4].rows[0].count),
      binLocations: parseInt(stats[5].rows[0].count),
      customRoles: parseInt(stats[6].rows[0].count),
    });
  })
);

/**
 * GET /api/developer/tables/:tableName
 * Get data from a specific table
 */
router.get(
  '/tables/:tableName',
  requireDevelopment,
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { tableName } = req.params;
    const { limit = 50, offset = 0 } = req.query;

    // Whitelist of allowed tables with their order columns
    const tableConfigs: Record<string, string> = {
      orders: 'order_id',
      users: 'user_id',
      skus: 'sku',
      audit_logs: 'occurred_at',
      pick_tasks: 'created_at',
      bin_locations: 'bin_id',
      custom_roles: 'role_id',
      user_role_assignments: 'assignment_id',
      order_items: 'order_item_id',
      carriers: 'carrier_id',
      zones: 'zone_id',
    };

    if (!tableConfigs[tableName]) {
      res.status(400).json({ error: 'Invalid table name' });
      return;
    }

    const orderBy = tableConfigs[tableName];

    const result = await pool.query(
      `SELECT * FROM ${tableName} ORDER BY ${orderBy} DESC LIMIT $1 OFFSET $2`,
      [parseInt(limit as string), parseInt(offset as string)]
    );

    const countResult = await pool.query(`SELECT COUNT(*) FROM ${tableName}`);
    const total = parseInt(countResult.rows[0].count);

    res.json({
      data: result.rows,
      total,
      limit: parseInt(limit as string),
      offset: parseInt(offset as string),
    });
  })
);

/**
 * POST /api/developer/generate-orders
 * Generate mock orders for testing
 */
router.post(
  '/generate-orders',
  requireDevelopment,
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { count = 10 } = req.body;

    if (count > 100) {
      res.status(400).json({ error: 'Maximum 100 orders at a time' });
      return;
    }

    // Get random SKUs
    const skuResult = await pool.query('SELECT sku FROM skus ORDER BY RANDOM() LIMIT 50');
    const skus = skuResult.rows.map(r => r.sku);

    if (skus.length === 0) {
      res.status(400).json({ error: 'No SKUs available' });
      return;
    }

    const statuses = ['PENDING', 'CLAIMED', 'PICKING', 'PICKED', 'PACKING', 'PACKED', 'SHIPPED'];
    const zones = ['A', 'B', 'C', 'D'];
    const createdOrders = [];

    for (let i = 0; i < count; i++) {
      const orderId = `ORD-${Date.now()}-${i}`;
      const customerId = `CUST-${Math.floor(Math.random() * 10000)}`;
      const customerName = `Customer ${Math.floor(Math.random() * 1000)}`;
      const itemCount = Math.floor(Math.random() * 5) + 1;
      const status = statuses[Math.floor(Math.random() * statuses.length)];
      const priority = Math.random() > 0.8 ? 'URGENT' : 'NORMAL';

      // Create order
      await pool.query(
        `INSERT INTO orders (order_id, customer_id, customer_name, priority, status, created_at)
         VALUES ($1, $2, $3, $4, $5, NOW())`,
        [orderId, customerId, customerName, priority, status]
      );

      // Add items
      for (let j = 0; j < itemCount; j++) {
        const sku = skus[Math.floor(Math.random() * skus.length)];
        const zone = zones[Math.floor(Math.random() * zones.length)];
        const aisle = String(Math.floor(Math.random() * 20) + 1).padStart(2, '0');
        const bay = String(Math.floor(Math.random() * 10) + 1).padStart(2, '0');
        const binLocation = `${zone}-${aisle}-${bay}`;

        await pool.query(
          `INSERT INTO order_items (order_id, sku, quantity, bin_location, status)
           VALUES ($1, $2, $3, $4, 'PENDING')`,
          [orderId, sku, Math.floor(Math.random() * 3) + 1, binLocation]
        );
      }

      createdOrders.push({ order_id: orderId, status });
    }

    res.json({
      message: `Generated ${count} orders`,
      orders: createdOrders,
    });
  })
);

/**
 * DELETE /api/developer/clear-audit-logs
 * Clear all audit logs (for testing)
 */
router.delete(
  '/clear-audit-logs',
  requireDevelopment,
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const result = await pool.query('DELETE FROM audit_logs');
    res.json({
      message: `Cleared ${result.rowCount || 0} audit logs`,
    });
  })
);

/**
 * DELETE /api/developer/cancel-all-orders
 * Cancel all orders (for testing)
 */
router.delete(
  '/cancel-all-orders',
  requireDevelopment,
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const result = await pool.query("UPDATE orders SET status = 'cancelled'");
    res.json({
      message: `Cancelled ${result.rowCount || 0} orders`,
    });
  })
);

/**
 * POST /api/developer/reset-orders
 * Reset all orders to pending (for testing)
 */
router.post(
  '/reset-orders',
  requireDevelopment,
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    await pool.query(`
      UPDATE orders SET status = 'pending', claimed_at = NULL, claimed_by = NULL
      WHERE status != 'shipped' AND status != 'cancelled'
    `);
    await pool.query('DELETE FROM pick_tasks');
    const result = await pool.query("SELECT COUNT(*) FROM orders WHERE status = 'pending'");
    res.json({
      message: `Reset orders to pending`,
      pendingCount: parseInt(result.rows[0].count),
    });
  })
);

/**
 * GET /api/developer/health
 * Get system health info
 */
router.get(
  '/health',
  requireDevelopment,
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    // Check database connection
    const dbStart = Date.now();
    await pool.query('SELECT 1');
    const dbLatency = Date.now() - dbStart;

    // Get database size
    const sizeResult = await pool.query(`
      SELECT pg_size_pretty(pg_database_size('wms_db')) as size
    `);

    // Get active connections
    const connResult = await pool.query(`
      SELECT count(*) FROM pg_stat_activity WHERE datname = 'wms_db'
    `);

    res.json({
      database: {
        connected: true,
        latency: `${dbLatency}ms`,
        size: sizeResult.rows[0]?.size || 'Unknown',
        activeConnections: parseInt(connResult.rows[0]?.count || '0'),
      },
      environment: process.env.NODE_ENV,
      uptime: process.uptime(),
      memory: process.memoryUsage(),
    });
  })
);

/**
 * GET /api/developer/database/health
 * Get database schema health check - verifies all required tables exist
 */
router.get(
  '/database/health',
  requireDevelopment,
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const requiredTables: Record<string, string[]> = {
      core: ['users', 'orders', 'order_items', 'skus', 'pick_tasks', 'bin_locations'],
      audit: ['audit_logs'],
      wavePicking: ['zone_assignments', 'wave_plans', 'wave_tasks'],
      features: ['feature_flags'],
      qualityControl: [
        'quality_inspections',
        'inspection_checklists',
        'inspection_checklist_items',
        'inspection_results',
        'return_authorizations',
        'return_items',
      ],
      cycleCounting: ['cycle_count_plans', 'cycle_count_entries', 'cycle_count_tolerances'],
      locationCapacity: ['location_capacities', 'capacity_rules', 'capacity_alerts'],
    };

    const results: Record<string, { exists: string[]; missing: string[]; healthy: boolean }> = {};

    for (const [category, tables] of Object.entries(requiredTables)) {
      const exists: string[] = [];
      const missing: string[] = [];

      for (const table of tables) {
        const result = await pool.query(
          `SELECT EXISTS (
            SELECT FROM information_schema.tables
            WHERE table_schema = 'public'
            AND table_name = $1
          )`,
          [table]
        );

        if (result.rows[0].exists) {
          exists.push(table);
        } else {
          missing.push(table);
        }
      }

      results[category] = {
        exists,
        missing,
        healthy: missing.length === 0,
      };
    }

    const allMissing = Object.values(results).flatMap(r => r.missing);
    const overallHealthy = allMissing.length === 0;

    res.json({
      healthy: overallHealthy,
      summary: {
        totalCategories: Object.keys(requiredTables).length,
        healthyCategories: Object.values(results).filter(r => r.healthy).length,
        totalTables: Object.values(requiredTables).reduce((sum, tables) => sum + tables.length, 0),
        existingTables: Object.values(results).reduce((sum, r) => sum + r.exists.length, 0),
        missingTables: allMissing.length,
      },
      categories: results,
      recommendations:
        allMissing.length > 0
          ? [
              `Run: npx tsx packages/backend/src/db/run-migrations.ts`,
              `Or apply migrations manually: psql -U your_user -d wms_db -f packages/backend/src/db/migrations/add_phase2_operational_excellence.sql`,
            ]
          : ['All tables present - database schema is healthy'],
    });
  })
);

/**
 * GET /api/developer/audit-summary
 * Get audit log summary grouped by action type
 */
router.get(
  '/audit-summary',
  requireDevelopment,
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const result = await pool.query(`
      SELECT action_type, COUNT(*) as count,
             MAX(occurred_at) as last_occurred
      FROM audit_logs
      WHERE occurred_at > NOW() - INTERVAL '7 days'
      GROUP BY action_type
      ORDER BY count DESC
    `);

    res.json({
      summary: result.rows,
      total: result.rows.reduce((sum, row) => sum + parseInt(row.count), 0),
    });
  })
);

/**
 * POST /api/developer/create-test-user
 * Create a test user with specified role
 */
router.post(
  '/create-test-user',
  requireDevelopment,
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { email, name, role = UserRole.PICKER } = req.body;

    // Validate required fields
    if (!email || !name) {
      res.status(400).json({ error: 'email and name are required' });
      return;
    }

    // Validate email format using a stricter regex
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      res.status(400).json({
        error: 'Invalid email format',
        code: 'INVALID_EMAIL',
      });
      return;
    }

    // Check if user exists
    const existing = await pool.query('SELECT user_id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      res.status(400).json({ error: 'User already exists' });
      return;
    }

    // Generate a simple password hash (for testing only!)
    const userId = `USR-${Date.now()}`;

    const result = await pool.query(
      `INSERT INTO users (user_id, email, name, password_hash, role, created_at)
       VALUES ($1, $2, $3, '$2a$10$dummy.hash.for.testing', $4, NOW())
       RETURNING user_id, email, name, role`,
      [userId, email, name, role]
    );

    res.json({
      message: 'Test user created',
      user: result.rows[0],
      password: 'password123', // Default test password
    });
  })
);

/**
 * GET /api/developer/recent-errors
 * Get recent error logs from audit_logs
 */
router.get(
  '/recent-errors',
  requireDevelopment,
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { limit = 20 } = req.query;

    const result = await pool.query(
      `SELECT * FROM audit_logs
       WHERE status = 'FAILURE' OR error_code IS NOT NULL
       ORDER BY occurred_at DESC
       LIMIT $1`,
      [parseInt(limit as string)]
    );

    res.json({
      errors: result.rows,
      count: result.rows.length,
    });
  })
);

/**
 * GET /api/developer/test-users
 * Get all test users (for management)
 */
router.get(
  '/test-users',
  requireDevelopment,
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const result = await pool.query(
      `SELECT user_id, email, name, role, active, created_at
       FROM users
       ORDER BY created_at DESC`
    );

    res.json({
      users: result.rows,
      count: result.rows.length,
    });
  })
);

/**
 * DELETE /api/developer/test-users/:userId
 * Delete a test user
 */
router.delete(
  '/test-users/:userId',
  requireDevelopment,
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { userId } = req.params;

    // Don't allow deleting the current user
    if (userId === req.user?.userId) {
      res.status(400).json({ error: 'Cannot delete your own account' });
      return;
    }

    // First delete role assignments
    await pool.query('DELETE FROM user_role_assignments WHERE user_id = $1', [userId]);

    // Then delete the user
    const result = await pool.query('DELETE FROM users WHERE user_id = $1 RETURNING name, email', [
      userId,
    ]);

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json({
      message: `Deleted user: ${result.rows[0].name} (${result.rows[0].email})`,
    });
  })
);

/**
 * PATCH /api/developer/test-users/:userId
 * Update a test user's role or status
 */
router.patch(
  '/test-users/:userId',
  requireDevelopment,
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { userId } = req.params;
    const { base_role, is_active } = req.body;

    // Don't allow modifying the current user
    if (userId === req.user?.userId) {
      res.status(400).json({ error: 'Cannot modify your own account' });
      return;
    }

    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (base_role) {
      updates.push(`base_role = $${paramIndex++}`);
      values.push(base_role);
    }

    if (typeof is_active === 'boolean') {
      updates.push(`is_active = $${paramIndex++}`);
      values.push(is_active);
    }

    if (updates.length === 0) {
      res.status(400).json({ error: 'No updates provided' });
      return;
    }

    values.push(userId);

    const result = await pool.query(
      `UPDATE users SET ${updates.join(', ')} WHERE user_id = $${paramIndex} RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json({
      message: 'User updated successfully',
      user: result.rows[0],
    });
  })
);

/**
 * POST /api/developer/sql-query
 * Execute a custom SQL query (dangerous, dev only!)
 */
router.post(
  '/sql-query',
  requireDevelopment,
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { query } = req.body;

    if (!query) {
      res.status(400).json({ error: 'Query is required' });
      return;
    }

    // Basic safety check - only allow SELECT
    if (!query.trim().toLowerCase().startsWith('select')) {
      res.status(400).json({ error: 'Only SELECT queries are allowed' });
      return;
    }

    try {
      const result = await pool.query(query);
      res.json({
        columns: result.fields.map((f: any) => f.name),
        rows: result.rows,
        rowCount: result.rows.length,
      });
    } catch (error: any) {
      res.status(400).json({
        error: error.message,
      });
    }
  })
);

// ============================================================================
// FEATURE FLAGS
// ============================================================================

import {
  getFlag,
  getAllFlags,
  getFlagsByCategory,
  setFlag,
  createFlag as createFlagService,
  deleteFlag as deleteFlagService,
  getCategorySummary,
} from '../services/FeatureFlagService';

/**
 * GET /api/developer/feature-flags
 * Get all feature flags
 */
router.get(
  '/feature-flags',
  requireDevelopment,
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const flags = await getAllFlags();
    res.json({ flags });
  })
);

/**
 * GET /api/developer/feature-flags/categories
 * Get feature flags grouped by category with summary
 */
router.get(
  '/feature-flags/categories',
  requireDevelopment,
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const summary = await getCategorySummary();
    const flagsByCategory: Record<string, any[]> = {};

    const categories = ['picking', 'packing', 'inventory', 'shipping', 'experimental'];
    for (const category of categories) {
      flagsByCategory[category] = await getFlagsByCategory(category);
    }

    res.json({
      summary,
      flagsByCategory,
    });
  })
);

/**
 * GET /api/developer/feature-flags/:key
 * Get a single feature flag
 */
router.get(
  '/feature-flags/:key',
  requireDevelopment,
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { key } = req.params;
    const flag = await getFlag(key);

    if (!flag) {
      res.status(404).json({ error: 'Feature flag not found' });
      return;
    }

    res.json({ flag });
  })
);

/**
 * POST /api/developer/feature-flags
 * Create a new feature flag
 */
router.post(
  '/feature-flags',
  requireDevelopment,
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { flag_key, name, description, category, is_enabled } = req.body;

    if (!flag_key || !name || !category) {
      res.status(400).json({ error: 'flag_key, name, and category are required' });
      return;
    }

    const validCategories = ['picking', 'packing', 'inventory', 'shipping', 'experimental'];
    if (!validCategories.includes(category)) {
      res
        .status(400)
        .json({ error: `Invalid category. Must be one of: ${validCategories.join(', ')}` });
      return;
    }

    try {
      const flag = await createFlagService({ flag_key, name, description, category, is_enabled });
      res.status(201).json({ flag });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  })
);

/**
 * PATCH /api/developer/feature-flags/:key
 * Toggle/set a feature flag
 */
router.patch(
  '/feature-flags/:key',
  requireDevelopment,
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { key } = req.params;
    const { is_enabled } = req.body;

    if (typeof is_enabled !== 'boolean') {
      res.status(400).json({ error: 'is_enabled (boolean) is required' });
      return;
    }

    try {
      const flag = await setFlag(key, is_enabled);
      res.json({ flag });
    } catch (error: any) {
      res.status(404).json({ error: error.message });
    }
  })
);

/**
 * DELETE /api/developer/feature-flags/:key
 * Delete a feature flag
 */
router.delete(
  '/feature-flags/:key',
  requireDevelopment,
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { key } = req.params;

    try {
      await deleteFlagService(key);
      res.json({ message: `Feature flag '${key}' deleted successfully` });
    } catch (error: any) {
      res.status(404).json({ error: error.message });
    }
  })
);

// ============================================================================
// MONITORING
// ============================================================================

import {
  getRecentRequests,
  getRequestStats,
  getLogs,
  getMetricsSummary,
  getPerformanceMetrics,
} from '../services/DeveloperMetricsService';

/**
 * GET /api/developer/monitoring/requests
 * Get recent API requests
 */
router.get(
  '/monitoring/requests',
  requireDevelopment,
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { limit = '50' } = req.query;
    const requests = await getRecentRequests(parseInt(limit as string));
    res.json({ requests, count: requests.length });
  })
);

/**
 * GET /api/developer/monitoring/request-stats
 * Get request statistics
 */
router.get(
  '/monitoring/request-stats',
  requireDevelopment,
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { duration = '1h' } = req.query;
    const stats = await getRequestStats(duration as string);
    res.json(stats);
  })
);

/**
 * GET /api/developer/monitoring/logs
 * Get application logs
 */
router.get(
  '/monitoring/logs',
  requireDevelopment,
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { limit = '100', level } = req.query;
    const logs = await getLogs(parseInt(limit as string), level as string);
    res.json({ logs, count: logs.length });
  })
);

/**
 * GET /api/developer/monitoring/metrics
 * Get metrics summary
 */
router.get(
  '/monitoring/metrics',
  requireDevelopment,
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const metrics = await getMetricsSummary();
    res.json(metrics);
  })
);

/**
 * GET /api/developer/monitoring/performance
 * Get performance metrics over time
 */
router.get(
  '/monitoring/performance',
  requireDevelopment,
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { duration = '24h' } = req.query;
    const metrics = await getPerformanceMetrics(duration as string);
    res.json({ metrics });
  })
);

// ============================================================================
// DATA MANAGEMENT
// ============================================================================

import {
  saveScenario,
  getScenarios,
  getScenario,
  applyScenario as applyScenarioService,
  deleteScenario as deleteScenarioService,
  exportCurrentState,
  importData as importDataFromService,
  getMigrations,
  runDatabaseReset,
} from '../services/SeedDataService';

/**
 * GET /api/developer/data/scenarios
 * Get all saved scenarios
 */
router.get(
  '/data/scenarios',
  requireDevelopment,
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const scenarios = await getScenarios();
    res.json({ scenarios, count: scenarios.length });
  })
);

/**
 * POST /api/developer/data/scenarios
 * Save current state as a scenario
 */
router.post(
  '/data/scenarios',
  requireDevelopment,
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { name, description } = req.body;
    const createdBy = req.user?.userId || 'unknown';

    if (!name) {
      res.status(400).json({ error: 'name is required' });
      return;
    }

    try {
      const scenario = await saveScenario(name, description || '', createdBy);
      res.status(201).json({ scenario });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  })
);

/**
 * GET /api/developer/data/scenarios/:id
 * Get a single scenario
 */
router.get(
  '/data/scenarios/:id',
  requireDevelopment,
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { id } = req.params;
    const scenario = await getScenario(id);

    if (!scenario) {
      res.status(404).json({ error: 'Scenario not found' });
      return;
    }

    res.json({ scenario });
  })
);

/**
 * POST /api/developer/data/scenarios/:id/apply
 * Apply a scenario (restore database state)
 */
router.post(
  '/data/scenarios/:id/apply',
  requireDevelopment,
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { id } = req.params;

    try {
      await applyScenarioService(id);
      res.json({ message: 'Scenario applied successfully' });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  })
);

/**
 * DELETE /api/developer/data/scenarios/:id
 * Delete a scenario
 */
router.delete(
  '/data/scenarios/:id',
  requireDevelopment,
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { id } = req.params;
    await deleteScenarioService(id);
    res.json({ message: 'Scenario deleted successfully' });
  })
);

/**
 * GET /api/developer/data/export
 * Export all data
 */
router.get(
  '/data/export',
  requireDevelopment,
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const data = await exportCurrentState();
    res.json(data);
  })
);

/**
 * POST /api/developer/data/import
 * Import data
 */
router.post(
  '/data/import',
  requireDevelopment,
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const dataImport = req.body;

    if (!dataImport.tables) {
      res.status(400).json({ error: 'Invalid import data format' });
      return;
    }

    try {
      await importDataFromService(dataImport);
      res.json({ message: 'Data imported successfully' });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  })
);

/**
 * GET /api/developer/data/migrations
 * List migration history
 */
router.get(
  '/data/migrations',
  requireDevelopment,
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const migrations = await getMigrations();
    res.json({ migrations, count: migrations.length });
  })
);

/**
 * POST /api/developer/data/reset
 * Reset database to a specific state
 */
router.post(
  '/data/reset',
  requireDevelopment,
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { type = 'fresh' } = req.body;

    if (!['fresh', 'with-orders', 'full'].includes(type)) {
      res.status(400).json({ error: 'Invalid reset type. Must be fresh, with-orders, or full' });
      return;
    }

    try {
      await runDatabaseReset(type);
      res.json({ message: `Database reset to ${type} state` });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  })
);

// ============================================================================
// TESTING TOOLS
// ============================================================================

/**
 * GET /api/developer/testing/session
 * Get current session debug info
 */
router.get(
  '/testing/session',
  requireDevelopment,
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const sessionInfo = {
      userId: req.user?.userId,
      email: req.user?.email,
      baseRole: req.user?.baseRole,
      effectiveRole: req.user?.effectiveRole,
      isLoggedIn: !!req.user,
      timestamp: new Date(),
    };

    res.json(sessionInfo);
  })
);

/**
 * GET /api/developer/testing/permissions
 * Get permission matrix for testing
 */
router.get(
  '/testing/permissions',
  requireDevelopment,
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    // Define permission matrix for all roles
    const permissionMatrix = {
      PICKER: ['orders:claim', 'orders:pick', 'pick_tasks:update', 'audit_logs:read_own'],
      PACKER: ['orders:pack', 'orders:ship', 'packing:update', 'audit_logs:read_own'],
      SUPERVISOR: [
        'orders:read_all',
        'orders:cancel',
        'users:read',
        'metrics:read',
        'audit_logs:read_all',
      ],
      STOCK_CONTROLLER: [
        'skus:create',
        'skus:update',
        'skus:delete',
        'inventory:adjust',
        'bin_locations:manage',
        'audit_logs:read_own',
      ],
      ADMIN: ['*'],
    };

    // Current user's permissions based on role
    const userRole = req.user?.baseRole || 'PICKER';
    const userPermissions =
      userRole === 'ADMIN'
        ? ['*']
        : permissionMatrix[userRole as keyof typeof permissionMatrix] || [];

    res.json({
      matrix: permissionMatrix,
      currentRole: userRole,
      currentPermissions: userPermissions,
      allRoles: Object.keys(permissionMatrix),
    });
  })
);

/**
 * GET /api/developer/testing/presets
 * Get available test data presets
 */
router.get(
  '/testing/presets',
  requireDevelopment,
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const presets = [
      {
        id: 'fresh',
        name: 'Fresh Start',
        description: 'Clean database with admin user and sample SKUs',
        orderCount: 0,
      },
      {
        id: 'with-orders',
        name: 'With Sample Orders',
        description: 'Database with 20 sample orders in various states',
        orderCount: 20,
      },
      {
        id: 'high-volume',
        name: 'High Volume',
        description: 'Many orders for load testing (100+ orders)',
        orderCount: 100,
      },
      {
        id: 'multi-zone',
        name: 'Multi-Zone',
        description: 'Orders distributed across all warehouse zones',
        orderCount: 30,
      },
      {
        id: 'low-inventory',
        name: 'Low Inventory',
        description: 'Test stock shortage scenarios',
        orderCount: 15,
      },
    ];

    res.json({ presets });
  })
);

/**
 * POST /api/developer/testing/load-preset
 * Load a test data preset
 */
router.post(
  '/testing/load-preset',
  requireDevelopment,
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { presetId } = req.body;

    if (!presetId) {
      res.status(400).json({ error: 'presetId is required' });
      return;
    }

    // Import preset handling logic
    const pool = getPool();

    try {
      // Reset database first
      await pool.query('DELETE FROM order_items');
      await pool.query('DELETE FROM orders');
      await pool.query('DELETE FROM pick_tasks');
      await pool.query('DELETE FROM audit_logs');

      // Load preset-specific data
      const presets: Record<string, () => Promise<void>> = {
        fresh: async () => {
          // Clean state already achieved by delete
        },
        'with-orders': async () => {
          const statuses = [
            'pending',
            'claimed',
            'picking',
            'picked',
            'packing',
            'packed',
            'shipped',
          ];
          const priorities = ['STANDARD', 'EXPRESS'];
          const zones = ['A', 'B', 'C', 'D'];

          // Get some SKUs to add to orders
          const skuResult = await pool.query('SELECT sku FROM skus ORDER BY RANDOM() LIMIT 10');
          const skus = skuResult.rows.map(r => r.sku);

          for (let i = 1; i <= 20; i++) {
            const orderId = `ORD-TEST-${i}`;
            const status = statuses[Math.floor(Math.random() * statuses.length)];
            const priority = priorities[Math.floor(Math.random() * priorities.length)];

            await pool.query(
              `INSERT INTO orders (order_id, customer_id, customer_name, priority, status, created_at)
               VALUES ($1, $2, $3, $4, $5, NOW())`,
              [orderId, `CUST-${i}`, `Test Customer ${i}`, priority, status]
            );

            // Add items if we have SKUs
            if (skus.length > 0) {
              const itemCount = Math.floor(Math.random() * 3) + 1;
              for (let j = 0; j < itemCount; j++) {
                const sku = skus[Math.floor(Math.random() * skus.length)];
                const zone = zones[Math.floor(Math.random() * zones.length)];
                const aisle = String(Math.floor(Math.random() * 20) + 1).padStart(2, '0');
                const bay = String(Math.floor(Math.random() * 10) + 1).padStart(2, '0');
                const binLocation = `${zone}-${aisle}-${bay}`;

                await pool.query(
                  `INSERT INTO order_items (order_id, sku, quantity, bin_location, status)
                   VALUES ($1, $2, $3, $4, 'PENDING')`,
                  [orderId, sku, Math.floor(Math.random() * 3) + 1, binLocation]
                );
              }
            }
          }
        },
        'high-volume': async () => {
          const statuses = ['pending', 'claimed', 'picking', 'picked', 'packing', 'packed'];
          const zones = ['A', 'B', 'C', 'D'];

          // Get some SKUs
          const skuResult = await pool.query('SELECT sku FROM skus ORDER BY RANDOM() LIMIT 5');
          const skus = skuResult.rows.map(r => r.sku);

          for (let i = 1; i <= 100; i++) {
            const orderId = `ORD-LOAD-${i}`;
            const status = statuses[Math.floor(Math.random() * statuses.length)];

            await pool.query(
              `INSERT INTO orders (order_id, customer_id, customer_name, status, priority, created_at)
               VALUES ($1, $2, $3, $4, 'STANDARD', NOW())`,
              [orderId, `CUST-${i}`, `Load Test Customer ${i}`, status]
            );

            // Add one item if we have SKUs
            if (skus.length > 0) {
              const sku = skus[Math.floor(Math.random() * skus.length)];
              const zone = zones[Math.floor(Math.random() * zones.length)];
              const aisle = String(Math.floor(Math.random() * 20) + 1).padStart(2, '0');
              const bay = String(Math.floor(Math.random() * 10) + 1).padStart(2, '0');
              const binLocation = `${zone}-${aisle}-${bay}`;

              await pool.query(
                `INSERT INTO order_items (order_id, sku, quantity, bin_location, status)
                 VALUES ($1, $2, 1, $3, 'PENDING')`,
                [orderId, sku, binLocation]
              );
            }
          }
        },
        'multi-zone': async () => {
          const zones = ['A', 'B', 'C', 'D'];

          // Get some SKUs
          const skuResult = await pool.query('SELECT sku FROM skus ORDER BY RANDOM() LIMIT 10');
          const skus = skuResult.rows.map(r => r.sku);

          for (let i = 1; i <= 30; i++) {
            const zone = zones[i % 4];
            const orderId = `ORD-ZONE-${zone}-${i}`;

            await pool.query(
              `INSERT INTO orders (order_id, customer_id, customer_name, status, priority, created_at)
               VALUES ($1, $2, $3, 'pending', 'STANDARD', NOW())`,
              [orderId, `CUST-ZONE-${i}`, `Zone Test Customer ${i}`]
            );

            // Add one item if we have SKUs
            if (skus.length > 0) {
              const sku = skus[Math.floor(Math.random() * skus.length)];
              const aisle = String(Math.floor(Math.random() * 20) + 1).padStart(2, '0');
              const bay = String(Math.floor(Math.random() * 10) + 1).padStart(2, '0');
              const binLocation = `${zone}-${aisle}-${bay}`;

              await pool.query(
                `INSERT INTO order_items (order_id, sku, quantity, bin_location, status)
                 VALUES ($1, $2, 1, $3, 'PENDING')`,
                [orderId, sku, binLocation]
              );
            }
          }
        },
        'low-inventory': async () => {
          // First reduce SKU quantities
          await pool.query(`UPDATE skus SET quantity = 0 WHERE quantity > 10`);

          // Create orders that will fail inventory checks
          const zones = ['A', 'B', 'C', 'D'];
          for (let i = 1; i <= 15; i++) {
            const orderId = `ORD-STOCK-${i}`;
            const zone = zones[Math.floor(Math.random() * zones.length)];
            const aisle = String(Math.floor(Math.random() * 20) + 1).padStart(2, '0');
            const bay = String(Math.floor(Math.random() * 10) + 1).padStart(2, '0');
            const binLocation = `${zone}-${aisle}-${bay}`;

            await pool.query(
              `INSERT INTO orders (order_id, customer_id, customer_name, status, priority, created_at)
               VALUES ($1, $2, $3, 'EXPRESS', NOW())`,
              [orderId, `CUST-STOCK-${i}`, `Low Stock Test ${i}`]
            );

            // Add item with 0 quantity SKU (will fail inventory)
            await pool.query(
              `INSERT INTO order_items (order_id, sku, quantity, bin_location, status)
               VALUES ($1, 'OUT-OF-STOCK', 1, $2, 'PENDING')`,
              [orderId, binLocation]
            );
          }
        },
      };

      const loadPreset = presets[presetId];
      if (!loadPreset) {
        res.status(400).json({ error: 'Invalid preset ID' });
        return;
      }

      await loadPreset();

      res.json({ message: `Preset '${presetId}' loaded successfully` });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  })
);

// ============================================================================
// ERROR CRAWLER
// ============================================================================

// In-memory crawler state (for development/testing)
let crawlerState = {
  isRunning: false,
  lastRun: null as Date | null,
  lastResults: null as any,
  log: [] as Array<{ timestamp: Date; message: string; level: string }>,
  process: null as any, // Store the spawn process to allow killing
};

const AI_LOOP_DIR = path.join(process.cwd(), '..', '..', 'ai-loop');

/**
 * GET /api/developer/crawler/status
 * Get crawler status
 */
router.get(
  '/crawler/status',
  requireDevelopment,
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    res.json({
      isRunning: crawlerState.isRunning,
      lastRun: crawlerState.lastRun,
      lastResults: crawlerState.lastResults,
      log: crawlerState.log.slice(-100), // Last 100 log entries
    });
  })
);

/**
 * POST /api/developer/crawler/start
 * Start the crawler
 */
router.post(
  '/crawler/start',
  requireDevelopment,
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    if (crawlerState.isRunning) {
      res.status(400).json({ error: 'Crawler is already running' });
      return;
    }

    crawlerState.isRunning = true;
    crawlerState.log.push({
      timestamp: new Date(),
      message: 'Starting crawler...',
      level: 'info',
    });

    // Run crawler asynchronously with real-time logging
    (async () => {
      const startTime = Date.now();
      let currentRoute = '';

      try {
        crawlerState.log.push({
          timestamp: new Date(),
          message: 'Running Playwright tests...',
          level: 'info',
        });

        // Use spawn for real-time output
        // Pass the admin's auth token to avoid login issues
        const playwright = spawn(
          'npx',
          ['playwright', 'test', 'crawl.spec.ts', '--reporter=list'],
          {
            cwd: AI_LOOP_DIR,
            shell: true,
            env: {
              ...process.env,
              FORCE_COLOR: '0',
              // Pass the current user's auth token to the crawler
              // Get it from the Authorization header since req.user is just the decoded payload
              CRAWLER_AUTH_TOKEN: (req.headers.authorization || '').replace('Bearer ', ''),
              CRAWLER_USER_ID: req.user?.userId || '',
            },
          }
        );

        // Store the process reference so we can kill it if needed
        crawlerState.process = playwright;

        // Capture stdout in real-time
        playwright.stdout.on('data', (data: Buffer) => {
          const output = data.toString();
          const lines = output.split('\n').filter((l: string) => l.trim());

          for (const line of lines) {
            // Parse route progress from Playwright output
            const routeMatch = line.match(/📍\s+(.+?)\s+\((.+?)\)/);
            if (routeMatch) {
              currentRoute = `${routeMatch[1]} (${routeMatch[2]})`;
              crawlerState.log.push({
                timestamp: new Date(),
                message: `Testing: ${currentRoute}`,
                level: 'info',
              });
            }

            // Parse errors
            if (line.includes('Error:') || line.includes('error')) {
              crawlerState.log.push({
                timestamp: new Date(),
                message: `Error: ${line.trim().substring(0, 200)}`,
                level: 'error',
              });
            }

            // Parse warnings
            if (line.includes('Warning:') || line.includes('warning')) {
              crawlerState.log.push({
                timestamp: new Date(),
                message: `Warning: ${line.trim().substring(0, 200)}`,
                level: 'warn',
              });
            }
          }
        });

        // Capture stderr
        playwright.stderr.on('data', (data: Buffer) => {
          const output = data.toString();
          crawlerState.log.push({
            timestamp: new Date(),
            message: `Stderr: ${output.trim().substring(0, 200)}`,
            level: 'warn',
          });
        });

        // Wait for completion
        await new Promise<void>((resolve, reject) => {
          playwright.on('close', (code: number | null) => {
            // Treat null as successful exit (process terminated via signal)
            // Both 0 and null indicate normal termination
            if (code === 0 || code === null) {
              resolve();
            } else {
              reject(new Error(`Playwright exited with code ${code}`));
            }
          });

          // Timeout after 30 minutes (for 100% coverage crawling)
          setTimeout(() => {
            playwright.kill();
            reject(new Error('Crawler timeout after 30 minutes'));
          }, 1800000);
        });

        crawlerState.log.push({
          timestamp: new Date(),
          message: 'Playwright tests completed. Normalizing errors...',
          level: 'info',
        });

        // Normalize errors
        await execAsync('cd "' + AI_LOOP_DIR + '" && npx tsx normalize-errors.ts', {
          timeout: 60000,
        });

        // Read normalized results
        const resultsPath = path.join(AI_LOOP_DIR, 'normalized-errors.json');
        const errorLogPath = path.join(AI_LOOP_DIR, 'error-log.json');

        if (fs.existsSync(resultsPath)) {
          const results = JSON.parse(fs.readFileSync(resultsPath, 'utf-8'));

          // Try to read raw coverage data from error-log.json
          let rawCoverage: any[] = [];
          if (fs.existsSync(errorLogPath)) {
            try {
              const errorLog = JSON.parse(fs.readFileSync(errorLogPath, 'utf-8'));
              rawCoverage = errorLog.coverage || [];
            } catch {}
          }

          // Flatten the results structure for frontend consumption
          const flattenedResults = {
            duration: results.duration || 0,
            totalErrors: results.summary?.totalUniqueErrors || 0,
            totalAPIFailures: results.summary?.totalAPIIssues || 0,
            routesCovered: results.coverage?.routesVisited || 0,
            totalRoutes: results.coverage?.totalRoutes || 0,
            totalElements: results.coverage?.elementStats?.totalElements || 0,
            interactedElements: results.coverage?.elementStats?.interactedElements || 0,
            coverage: results.coverage?.routeCoverage || 0,
            tabsTested: 0,
            byType: results.summary?.byType || {},
            errors: results.errors || [],
            apiIssues: results.apiIssues || [],
            // Include raw coverage array for detailed view
            coverageArray: rawCoverage,
            fullCoverage: results.coverage,
          };

          crawlerState.lastResults = flattenedResults;
          crawlerState.lastRun = new Date();

          crawlerState.log.push({
            timestamp: new Date(),
            message: `Crawler completed in ${Date.now() - startTime}ms. Found ${results.summary?.totalUniqueErrors || 0} unique errors.`,
            level: 'info',
          });
        } else {
          crawlerState.log.push({
            timestamp: new Date(),
            message: 'Crawler completed but no results file found.',
            level: 'warn',
          });
        }
      } catch (error: any) {
        crawlerState.log.push({
          timestamp: new Date(),
          message: `Crawler failed: ${error.message}`,
          level: 'error',
        });
      } finally {
        crawlerState.isRunning = false;
        crawlerState.process = null;
      }
    })();

    res.json({ message: 'Crawler started', isRunning: true });
  })
);

/**
 * POST /api/developer/crawler/stop
 * Stop the crawler - actually kills the Playwright process
 */
router.post(
  '/crawler/stop',
  requireDevelopment,
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    if (!crawlerState.isRunning) {
      res.status(400).json({ error: 'Crawler is not running' });
      return;
    }

    // Actually kill the Playwright process
    if (crawlerState.process) {
      try {
        // Kill the entire process tree (including shell)
        crawlerState.process.kill('SIGTERM');

        // Also try on Windows
        if (process.platform === 'win32') {
          crawlerState.process.kill();
        }

        crawlerState.log.push({
          timestamp: new Date(),
          message: 'Crawler stopped by user request.',
          level: 'info',
        });
      } catch (error: any) {
        crawlerState.log.push({
          timestamp: new Date(),
          message: `Failed to stop crawler: ${error.message}`,
          level: 'error',
        });
      }
    }

    crawlerState.isRunning = false;
    crawlerState.process = null;

    res.json({ message: 'Crawler stopped' });
  })
);

/**
 * GET /api/developer/crawler/results
 * Get latest crawler results
 */
router.get(
  '/crawler/results',
  requireDevelopment,
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const resultsPath = path.join(AI_LOOP_DIR, 'normalized-errors.json');
    const errorLogPath = path.join(AI_LOOP_DIR, 'error-log.json');

    if (!fs.existsSync(resultsPath)) {
      res.status(404).json({ error: 'No results available. Run the crawler first.' });
      return;
    }

    const results = JSON.parse(fs.readFileSync(resultsPath, 'utf-8'));

    // Try to read raw coverage data from error-log.json
    let rawCoverage: any[] = [];
    if (fs.existsSync(errorLogPath)) {
      try {
        const errorLog = JSON.parse(fs.readFileSync(errorLogPath, 'utf-8'));
        rawCoverage = errorLog.coverage || [];
      } catch {}
    }

    // Flatten the results structure for frontend consumption
    const flattenedResults = {
      duration: results.duration || 0,
      totalErrors: results.summary?.totalUniqueErrors || 0,
      totalAPIFailures: results.summary?.totalAPIIssues || 0,
      routesCovered: results.coverage?.routesVisited || 0,
      totalRoutes: results.coverage?.totalRoutes || 0,
      totalElements: results.coverage?.elementStats?.totalElements || 0,
      interactedElements: results.coverage?.elementStats?.interactedElements || 0,
      coverage: results.coverage?.routeCoverage || 0,
      tabsTested: 0,
      byType: results.summary?.byType || {},
      errors: results.errors || [],
      apiIssues: results.apiIssues || [],
      coverageArray: rawCoverage,
      fullCoverage: results.coverage,
    };

    res.json(flattenedResults);
  })
);

/**
 * GET /api/developer/crawler/fix-prompt
 * Get the fix prompt for Claude Code
 */
router.get(
  '/crawler/fix-prompt',
  requireDevelopment,
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const fixPromptPath = path.join(AI_LOOP_DIR, 'fix-prompt.md');

    if (!fs.existsSync(fixPromptPath)) {
      res.status(404).json({ error: 'No fix prompt available. Run the crawler first.' });
      return;
    }

    const content = fs.readFileSync(fixPromptPath, 'utf-8');
    res.json({ prompt: content });
  })
);

/**
 * DELETE /api/developer/crawler/results
 * Clear crawler results and logs
 */
router.delete(
  '/crawler/results',
  requireDevelopment,
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    // Clear in-memory state
    crawlerState.lastResults = null;
    crawlerState.lastRun = null;
    crawlerState.log = [];

    // Clear files
    const filesToDelete = [
      path.join(AI_LOOP_DIR, 'error-log.json'),
      path.join(AI_LOOP_DIR, 'normalized-errors.json'),
      path.join(AI_LOOP_DIR, 'fix-prompt.md'),
    ];

    for (const file of filesToDelete) {
      if (fs.existsSync(file)) {
        fs.unlinkSync(file);
      }
    }

    res.json({ message: 'Crawler results cleared' });
  })
);

/**
 * GET /api/developer/crawler/logs
 * Get raw Playwright output logs
 */
router.get(
  '/crawler/logs',
  requireDevelopment,
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const logPath = path.join(AI_LOOP_DIR, 'error-log.json');

    if (!fs.existsSync(logPath)) {
      res.status(404).json({ error: 'No logs available. Run the crawler first.' });
      return;
    }

    const logs = JSON.parse(fs.readFileSync(logPath, 'utf-8'));
    res.json(logs);
  })
);

/**
 * POST /api/developer/e2e/start
 * Run E2E tests with assertions
 */
router.post(
  '/e2e/start',
  requireDevelopment,
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const playwright = spawn('npx', ['playwright', 'test', 'e2e.spec.ts', '--reporter=list'], {
      cwd: AI_LOOP_DIR,
      shell: true,
      env: {
        ...process.env,
        FORCE_COLOR: '0',
        CRAWLER_AUTH_TOKEN: (req.headers.authorization || '').replace('Bearer ', ''),
        CRAWLER_USER_ID: req.user?.userId || '',
      },
    });

    let output = '';
    playwright.stdout.on('data', (data: Buffer) => {
      output += data.toString();
    });

    playwright.stderr.on('data', (data: Buffer) => {
      output += data.toString();
    });

    playwright.on('close', (code: number | null) => {
      const passed = (output.match(/passed/g) || []).length;
      const failed = (output.match(/failed/g) || []).length;
      const skipped = (output.match(/skipped/g) || []).length;

      // Parse output for summary
      const durationMatch = output.match(/\((\d+\.?\d*[ms]+)\)/);
      const duration = durationMatch ? durationMatch[1] : 'unknown';

      // Treat null as successful exit (process terminated via signal)
      const isSuccess = code === 0 || code === null;

      const results = {
        success: isSuccess,
        exitCode: code,
        passed,
        failed,
        skipped,
        total: passed + failed + skipped,
        duration,
        output: output.substring(output.lastIndexOf('Running')),
      };

      // Save results
      const resultsPath = path.join(AI_LOOP_DIR, 'e2e-results.json');
      fs.writeFileSync(resultsPath, JSON.stringify(results, null, 2));
    });

    res.json({ message: 'E2E tests started', isRunning: true });
  })
);

/**
 * GET /api/developer/e2e/results
 * Get E2E test results
 */
router.get(
  '/e2e/results',
  requireDevelopment,
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const resultsPath = path.join(AI_LOOP_DIR, 'e2e-results.json');

    if (!fs.existsSync(resultsPath)) {
      res.status(404).json({ error: 'No E2E results available. Run tests first.' });
      return;
    }

    const results = JSON.parse(fs.readFileSync(resultsPath, 'utf-8'));
    res.json(results);
  })
);

/**
 * POST /api/developer/workflows/start
 * Run workflow E2E tests with assertions for business logic
 */
router.post(
  '/workflows/start',
  requireDevelopment,
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const playwright = spawn(
      'npx',
      ['playwright', 'test', 'workflows.spec.ts', '--reporter=list'],
      {
        cwd: AI_LOOP_DIR,
        shell: true,
        env: {
          ...process.env,
          FORCE_COLOR: '0',
          CRAWLER_AUTH_TOKEN: (req.headers.authorization || '').replace('Bearer ', ''),
          CRAWLER_USER_ID: req.user?.userId || '',
        },
      }
    );

    let output = '';
    playwright.stdout.on('data', (data: Buffer) => {
      output += data.toString();
    });

    playwright.stderr.on('data', (data: Buffer) => {
      output += data.toString();
    });

    playwright.on('close', (code: number | null) => {
      const passed = (output.match(/passed/g) || []).length;
      const failed = (output.match(/failed/g) || []).length;
      const skipped = (output.match(/skipped/g) || []).length;

      // Parse output for summary
      const durationMatch = output.match(/\((\d+\.?\d*[ms]+)\)/);
      const duration = durationMatch ? durationMatch[1] : 'unknown';

      // Treat null as successful exit (process terminated via signal)
      const isSuccess = code === 0 || code === null;

      const results = {
        success: isSuccess,
        exitCode: code,
        passed,
        failed,
        skipped,
        total: passed + failed + skipped,
        duration,
        output: output.substring(output.lastIndexOf('Running')),
      };

      // Save results
      const resultsPath = path.join(AI_LOOP_DIR, 'workflow-results.json');
      fs.writeFileSync(resultsPath, JSON.stringify(results, null, 2));
    });

    res.json({ message: 'Workflow tests started', isRunning: true });
  })
);

/**
 * GET /api/developer/workflows/results
 * Get workflow test results
 */
router.get(
  '/workflows/results',
  requireDevelopment,
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const resultsPath = path.join(AI_LOOP_DIR, 'workflow-results.json');

    if (!fs.existsSync(resultsPath)) {
      res.status(404).json({ error: 'No workflow results available. Run tests first.' });
      return;
    }

    const results = JSON.parse(fs.readFileSync(resultsPath, 'utf-8'));
    res.json(results);
  })
);

// ============================================================================
// DATABASE INTEGRITY TEST ENDPOINTS
// ============================================================================

/**
 * GET /api/developer/test/stock/:sku
 * Get current stock level for a SKU (for database integrity testing)
 */
router.get(
  '/test/stock/:sku',
  requireDevelopment,
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { sku } = req.params;

    // Get total quantity across all bin locations
    const result = await pool.query(
      `SELECT COALESCE(SUM(quantity), 0) as total_quantity
       FROM skus
       WHERE sku = $1`,
      [sku]
    );

    const quantity = parseInt(result.rows[0]?.total_quantity || '0');

    res.json({
      sku,
      quantity,
      timestamp: new Date().toISOString(),
    });
  })
);

/**
 * GET /api/developer/test/transactions
 * Get transaction history for a SKU (for database integrity testing)
 */
router.get(
  '/test/transactions',
  requireDevelopment,
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { sku, limit = 50 } = req.query;

    if (!sku) {
      res.status(400).json({ error: 'sku parameter is required' });
      return;
    }

    // Get transaction history from audit_logs
    const result = await pool.query(
      `SELECT log_id, action_type, entity_type, entity_id, old_value, new_value,
              user_id, occurred_at, status, error_code
       FROM audit_logs
       WHERE entity_type = 'SKU' AND entity_id = $1
       ORDER BY occurred_at DESC
       LIMIT $2`,
      [sku, parseInt(limit as string)]
    );

    void res.json({
      sku,
      transactions: result.rows,
      count: result.rows.length,
    });
  })
);

/**
 * GET /api/developer/test/audit-logs
 * Get audit logs for an entity (for database integrity testing)
 */
router.get(
  '/test/audit-logs',
  requireDevelopment,
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { entityType, entityId, limit = 50 } = req.query;

    if (!entityType || !entityId) {
      res.status(400).json({ error: 'entityType and entityId are required' });
      return;
    }

    const result = await pool.query(
      `SELECT log_id, action_type, entity_type, entity_id, old_value, new_value,
              user_id, occurred_at, status, error_code
       FROM audit_logs
       WHERE entity_type = $1 AND entity_id = $2
       ORDER BY occurred_at DESC
       LIMIT $3`,
      [entityType, entityId, parseInt(limit as string)]
    );

    void res.json({
      entityType,
      entityId,
      auditLogs: result.rows,
      count: result.rows.length,
    });
  })
);

/**
 * GET /api/developer/test/bin-locations/:sku
 * Get all bin locations for a SKU with quantities
 */
router.get(
  '/test/bin-locations/:sku',
  requireDevelopment,
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { sku } = req.params;

    // This query assumes the SKU table has a bin_location field
    // If your schema is different, adjust accordingly
    const result = await pool.query(
      `SELECT sku, bin_location, quantity
       FROM skus
       WHERE sku = $1 AND quantity > 0
       ORDER BY bin_location`,
      [sku]
    );

    void res.json({
      sku,
      locations: result.rows,
      count: result.rows.length,
    });
  })
);

/**
 * POST /api/developer/test/setup
 * Set up test data for database integrity testing
 */
router.post(
  '/test/setup',
  requireDevelopment,
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    try {
      // Create test SKU with known quantity
      const testSku = `TEST-SKU-${Date.now()}`;
      const initialQuantity = 100;

      await pool.query(
        `INSERT INTO skus (sku, description, quantity, bin_location, created_at)
         VALUES ($1, 'Database Integrity Test SKU', $2, 'A-01-01', NOW())
         ON CONFLICT (sku) DO UPDATE SET quantity = $2`,
        [testSku, initialQuantity]
      );

      // Create a test order
      const testOrderId = `TEST-ORD-${Date.now()}`;

      await pool.query(
        `INSERT INTO orders (order_id, customer_id, customer_name, status, priority, created_at)
         VALUES ($1, 'TEST-CUST', 'Database Integrity Test', 'pending', 'STANDARD', NOW())`,
        [testOrderId]
      );

      // Add item to order
      await pool.query(
        `INSERT INTO order_items (order_id, sku, quantity, bin_location, status)
         VALUES ($1, $2, 5, 'A-01-01', 'PENDING')`,
        [testOrderId, testSku]
      );

      void res.json({
        message: 'Test data created successfully',
        testSku,
        testOrderId,
        initialQuantity,
        pickQuantity: 5,
      });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
      return;
    }
  })
);

/**
 * POST /api/developer/test/teardown
 * Clean up test data (for database integrity testing)
 */
router.post(
  '/test/teardown',
  requireDevelopment,
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { testSku, testOrderId } = req.body;

    if (!testSku || !testOrderId) {
      res.status(400).json({ error: 'testSku and testOrderId are required' });
      return;
    }

    try {
      // Delete order items first (foreign key constraint)
      await pool.query('DELETE FROM order_items WHERE order_id = $1', [testOrderId]);

      // Delete order
      await pool.query('DELETE FROM orders WHERE order_id = $1', [testOrderId]);

      // Delete test SKU
      await pool.query('DELETE FROM skus WHERE sku = $1', [testSku]);

      // Delete audit logs for this test
      await pool.query('DELETE FROM audit_logs WHERE entity_id = $1', [testSku]);
      await pool.query('DELETE FROM audit_logs WHERE entity_id = $1', [testOrderId]);

      void res.json({
        message: 'Test data cleaned up successfully',
      });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
      return;
    }
  })
);

/**
 * GET /api/developer/test/order/:orderId
 * Get order details with current stock levels
 */
router.get(
  '/test/order/:orderId',
  requireDevelopment,
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { orderId } = req.params;

    // Get order details
    const orderResult = await pool.query(
      `SELECT order_id, status, claimed_by, created_at
       FROM orders
       WHERE order_id = $1`,
      [orderId]
    );

    if (orderResult.rows.length === 0) {
      res.status(404).json({ error: 'Order not found' });
      return;
    }

    // Get order items with current SKU stock
    const itemsResult = await pool.query(
      `SELECT oi.order_item_id, oi.sku, oi.quantity, oi.bin_location, oi.status,
              s.quantity as current_stock
       FROM order_items oi
       LEFT JOIN skus s ON oi.sku = s.sku
       WHERE oi.order_id = $1`,
      [orderId]
    );

    void res.json({
      order: orderResult.rows[0],
      items: itemsResult.rows,
    });
  })
);

/**
 * GET /api/developer/test/stats
 * Get database statistics for testing
 */
router.get(
  '/test/stats',
  requireDevelopment,
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    // Get various counts for test validation
    const [ordersCount, skusCount, pickTasksCount, auditLogsCount] = await Promise.all([
      pool.query('SELECT COUNT(*) FROM orders'),
      pool.query('SELECT COUNT(*) FROM skus'),
      pool.query('SELECT COUNT(*) FROM pick_tasks'),
      pool.query('SELECT COUNT(*) FROM audit_logs'),
    ]);

    void res.json({
      orders: parseInt(ordersCount.rows[0].count),
      skus: parseInt(skusCount.rows[0].count),
      pickTasks: parseInt(pickTasksCount.rows[0].count),
      auditLogs: parseInt(auditLogsCount.rows[0].count),
      timestamp: new Date().toISOString(),
    });
  })
);

export default router;
