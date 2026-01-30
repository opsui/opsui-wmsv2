/**
 * Seed Data Service
 *
 * Manages seed scenarios for quick database state restoration
 */

import { getPool } from '../db/client';

export interface SeedScenario {
  scenario_id: string;
  name: string;
  description: string | null;
  data: any;
  created_at: Date;
  created_by: string | null;
}

export interface ExportData {
  timestamp: Date;
  tables: Record<string, any[]>;
}

/**
 * Save current database state as a scenario
 */
export async function saveScenario(
  name: string,
  description: string,
  createdBy: string
): Promise<SeedScenario> {
  const pool = getPool();

  // Get data from key tables
  const tables = ['orders', 'users', 'skus', 'order_items', 'pick_tasks', 'audit_logs'];
  const data: Record<string, any[]> = {};

  for (const table of tables) {
    try {
      const result = await pool.query(`SELECT * FROM ${table}`);
      data[table] = result.rows;
    } catch (error) {
      console.error(`Failed to export table ${table}:`, error);
    }
  }

  const scenarioData = {
    timestamp: new Date(),
    tables: data,
  };

  const result = await pool.query(
    `INSERT INTO seed_scenarios (name, description, data, created_by)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [name, description, JSON.stringify(scenarioData), createdBy]
  );

  return result.rows[0] as SeedScenario;
}

/**
 * Get all saved scenarios
 */
export async function getScenarios(): Promise<SeedScenario[]> {
  const pool = getPool();

  const result = await pool.query(
    `SELECT * FROM seed_scenarios ORDER BY created_at DESC`
  );

  return result.rows as SeedScenario[];
}

/**
 * Get a single scenario by ID
 */
export async function getScenario(scenarioId: string): Promise<SeedScenario | null> {
  const pool = getPool();

  const result = await pool.query(
    'SELECT * FROM seed_scenarios WHERE scenario_id = $1',
    [scenarioId]
  );

  if (result.rows.length === 0) return null;

  return result.rows[0] as SeedScenario;
}

/**
 * Apply a scenario (restore database state)
 */
export async function applyScenario(scenarioId: string): Promise<void> {
  const pool = getPool();
  const scenario = await getScenario(scenarioId);

  if (!scenario) {
    throw new Error('Scenario not found');
  }

  const scenarioData: ExportData = typeof scenario.data === 'string'
    ? JSON.parse(scenario.data)
    : scenario.data;

  // Apply data to tables
  for (const [tableName, rows] of Object.entries(scenarioData.tables)) {
    if (!Array.isArray(rows) || rows.length === 0) continue;

    try {
      // Clear existing data
      await pool.query(`DELETE FROM ${tableName}`);

      // Insert new data (build INSERT query dynamically)
      const columns = Object.keys(rows[0]);
      const placeholders = rows.map((_, rowIndex) =>
        columns.map((_, colIndex) => `$${rowIndex * columns.length + colIndex + 1}`).join(', ')
      );
      const values = rows.flatMap(row => columns.map(col => row[col]));

      await pool.query(
        `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES ${placeholders.map(p => `(${p})`).join(', ')}`,
        values
      );
    } catch (error) {
      console.error(`Failed to restore table ${tableName}:`, error);
    }
  }

  // Reset sequences
  await pool.query(`SELECT setval('orders_id_seq', (SELECT COALESCE(MAX(id), 1) FROM orders))`);
  await pool.query(`SELECT setval('users_id_seq', (SELECT COALESCE(MAX(id), 1) FROM users))`);
  await pool.query(`SELECT setval('skus_id_seq', (SELECT COALESCE(MAX(id), 1) FROM skus))`);
}

/**
 * Delete a scenario
 */
export async function deleteScenario(scenarioId: string): Promise<void> {
  const pool = getPool();

  await pool.query('DELETE FROM seed_scenarios WHERE scenario_id = $1', [scenarioId]);
}

/**
 * Export current database state
 */
export async function exportCurrentState(): Promise<ExportData> {
  const pool = getPool();

  const tables = [
    'orders',
    'users',
    'skus',
    'order_items',
    'pick_tasks',
    'audit_logs',
    'bin_locations',
    'custom_roles',
    'user_role_assignments',
    'carriers',
    'zones'
  ];

  const data: Record<string, any[]> = {};

  for (const table of tables) {
    try {
      const result = await pool.query(`SELECT * FROM ${table}`);
      data[table] = result.rows;
    } catch (error) {
      console.error(`Failed to export table ${table}:`, error);
      data[table] = [];
    }
  }

  return {
    timestamp: new Date(),
    tables: data,
  };
}

/**
 * Import data from exported state
 */
export async function importData(importData: ExportData): Promise<void> {
  const pool = getPool();

  for (const [tableName, rows] of Object.entries(importData.tables)) {
    if (!Array.isArray(rows) || rows.length === 0) continue;

    try {
      // Check if table exists
      const tableExists = await pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables
          WHERE table_name = $1
        )
      `, [tableName]);

      if (!tableExists.rows[0].exists) {
        console.warn(`Table ${tableName} does not exist, skipping`);
        continue;
      }

      // Clear existing data
      await pool.query(`DELETE FROM ${tableName}`);

      // Get columns from the first row
      const columns = Object.keys(rows[0]);

      // Build and execute INSERT query
      for (const row of rows) {
        const columnNames = Object.keys(row);
        const values = Object.values(row);
        const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');

        await pool.query(
          `INSERT INTO ${tableName} (${columnNames.join(', ')}) VALUES (${placeholders})`,
          values
        );
      }
    } catch (error) {
      console.error(`Failed to import table ${tableName}:`, error);
    }
  }

  // Reset sequences
  try {
    await pool.query(`SELECT setval('orders_id_seq', (SELECT COALESCE(MAX(id), 1) FROM orders))`);
    await pool.query(`SELECT setval('users_id_seq', (SELECT COALESCE(MAX(id), 1) FROM users))`);
    await pool.query(`SELECT setval('skus_id_seq', (SELECT COALESCE(MAX(id), 1) FROM skus))`);
  } catch (error) {
    console.error('Failed to reset sequences:', error);
  }
}

/**
 * List available migrations
 */
export async function getMigrations(): Promise<any[]> {
  const pool = getPool();

  const result = await pool.query(`
    SELECT
      migration_name,
      applied_at,
      applied_by
    FROM migration_history
    ORDER BY applied_at DESC
  `);

  return result.rows;
}

/**
 * Run a database reset (clear all data and reseed)
 */
export async function runDatabaseReset(resetType: 'fresh' | 'with-orders' | 'full'): Promise<void> {
  const pool = getPool();

  // Tables to clear (in dependency order)
  const clearOrder = [
    'audit_logs',
    'pick_tasks',
    'order_items',
    'orders',
    'user_role_assignments',
    'users',
    'bin_locations',
    'skus',
    'carriers',
    'zones',
  ];

  // Clear all tables
  for (const table of clearOrder) {
    try {
      await pool.query(`DELETE FROM ${table}`);
    } catch (error) {
      console.error(`Failed to clear table ${table}:`, error);
    }
  }

  // Reset sequences
  await pool.query(`SELECT setval('orders_id_seq', 1, false)`);
  await pool.query(`SELECT setval('users_id_seq', 1, false)`);
  await pool.query(`SELECT setval('skus_id_seq', 1, false)`);

  // Add default data based on reset type
  if (resetType === 'fresh' || resetType === 'with-orders') {
    // Add default admin user
    await pool.query(`
      INSERT INTO users (user_id, email, name, password_hash, base_role)
      VALUES ('USR-ADMIN', 'admin@wms.local', 'System Admin', '$2a$10$dummy.hash.for.testing', 'ADMIN')
      ON CONFLICT (user_id) DO NOTHING
    `);

    // Add some sample SKUs
    const sampleSkus = [
      ['SKU-001', 'Widget A', 'A-01-01', 100],
      ['SKU-002', 'Widget B', 'A-01-02', 150],
      ['SKU-003', 'Gadget X', 'B-02-01', 75],
      ['SKU-004', 'Gadget Y', 'B-02-02', 200],
      ['SKU-005', 'Tool Z', 'C-03-01', 50],
    ];

    for (const [sku, description, location, quantity] of sampleSkus) {
      await pool.query(`
        INSERT INTO skus (sku, description, bin_location, quantity)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (sku) DO NOTHING
      `, [sku, description, location, quantity]);
    }
  }

  if (resetType === 'with-orders') {
    // Add some sample orders
    const statuses = ['pending', 'claimed', 'picking', 'picked', 'packing', 'packed', 'shipped'];
    const priorities = ['STANDARD', 'EXPRESS'];

    for (let i = 1; i <= 20; i++) {
      const orderId = `ORD-TEST-${i}`;
      await pool.query(`
        INSERT INTO orders (order_id, status, priority)
        VALUES ($1, $2, $3)
      `, [orderId, statuses[Math.floor(Math.random() * statuses.length)], priorities[Math.floor(Math.random() * priorities.length)]]);
    }
  }
}
