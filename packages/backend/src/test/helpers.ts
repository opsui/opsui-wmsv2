/**
 * Test Helper Functions
 *
 * Utility functions for writing tests.
 */

import { Pool } from 'pg';
import { randomUUID } from 'crypto';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';

// ============================================================================
// Database Helpers
// ============================================================================

/**
 * Get a test database connection
 */
export function getTestDb(): Pool {
  return new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'test_db',
    user: process.env.DB_USER || 'test_user',
    password: process.env.DB_PASSWORD || 'test_password',
  });
}

/**
 * Clean all tables in the test database
 */
export async function cleanDatabase(db: Pool): Promise<void> {
  const tables = [
    'inventory',
    'locations',
    'products',
    'users',
    'roles',
    'orders',
    'order_items',
    'audit_log',
  ];

  for (const table of tables) {
    try {
      await db.query(`DELETE FROM ${table} WHERE id LIKE '%-test-id' OR id LIKE '%-id'`);
    } catch (error) {
      // Table might not exist, ignore
    }
  }
}

/**
 * Run a database transaction that auto-rolls back
 */
export async function withTransaction<T>(db: Pool, callback: (db: Pool) => Promise<T>): Promise<T> {
  await db.query('BEGIN');
  try {
    const result = await callback(db);
    await db.query('ROLLBACK');
    return result;
  } catch (error) {
    await db.query('ROLLBACK');
    throw error;
  }
}

// ============================================================================
// User/Auth Helpers
// ============================================================================

/**
 * Create a test user
 */
export interface TestUser {
  id: string;
  email: string;
  password: string;
  name: string;
  role_id: string;
}

export async function createTestUser(
  db: Pool,
  overrides: Partial<TestUser> = {}
): Promise<TestUser> {
  const userId = overrides.id || `${randomUUID()}-test-id`;
  const email = overrides.email || `test-${userId}@example.com`;
  const password = overrides.password || 'TestPassword123!';
  const name = overrides.name || 'Test User';
  const roleId = overrides.role_id || 'admin-role-id';

  const hashedPassword = await bcrypt.hash(password, 10);

  await db.query(
    `INSERT INTO users (id, email, password_hash, name, role_id, is_active)
     VALUES ($1, $2, $3, $4, $5, true)
     ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email, password_hash = EXCLUDED.password_hash`,
    [userId, email, hashedPassword, name, roleId]
  );

  return {
    id: userId,
    email,
    password,
    name,
    role_id: roleId,
  };
}

/**
 * Generate a test JWT token
 */
export function generateTestToken(
  userId: string,
  email: string,
  roleId: string,
  overrides: { expiresIn?: string } = {}
): string {
  return jwt.sign(
    {
      userId,
      email,
      roleId,
    },
    config.jwt.secret,
    {
      expiresIn: overrides.expiresIn || '1h',
    }
  );
}

/**
 * Get auth headers for a test user
 */
export async function getTestAuthHeaders(
  db: Pool,
  user?: TestUser
): Promise<{ Authorization: string }> {
  const testUser = user || (await createTestUser(db));
  const token = generateTestToken(testUser.id, testUser.email, testUser.role_id);
  return { Authorization: `Bearer ${token}` };
}

// ============================================================================
// Order Helpers
// ============================================================================

/**
 * Create a test order
 */
export interface TestOrder {
  id: string;
  customer_id: string;
  customer_name: string;
  status: string;
  priority: string;
}

export async function createTestOrder(
  db: Pool,
  overrides: Partial<TestOrder> = {}
): Promise<TestOrder> {
  const orderId = overrides.id || `${randomUUID()}-test-id`;
  const customerId = overrides.customer_id || `${randomUUID()}-test-id`;
  const customerName = overrides.customer_name || 'Test Customer';
  const status = overrides.status || 'pending';
  const priority = overrides.priority || 'normal';

  await db.query(
    `INSERT INTO orders (id, customer_id, customer_name, status, priority, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
     ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status`,
    [orderId, customerId, customerName, status, priority]
  );

  return {
    id: orderId,
    customer_id: customerId,
    customer_name: customerName,
    status,
    priority,
  };
}

// ============================================================================
// Product/Inventory Helpers
// ============================================================================

/**
 * Create a test product
 */
export interface TestProduct {
  id: string;
  sku: string;
  name: string;
  description: string;
  unit_of_measure: string;
  weight_lbs: number;
}

export async function createTestProduct(
  db: Pool,
  overrides: Partial<TestProduct> = {}
): Promise<TestProduct> {
  const productId = overrides.id || `${randomUUID()}-test-id`;
  const sku = overrides.sku || `SKU-${Math.random().toString(36).substring(7).toUpperCase()}`;
  const name = overrides.name || 'Test Product';
  const description = overrides.description || 'Test Description';
  const unitOfMeasure = overrides.unit_of_measure || 'EA';
  const weightLbs = overrides.weight_lbs || 1.0;

  await db.query(
    `INSERT INTO products (id, sku, name, description, unit_of_measure, weight_lbs)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (id) DO UPDATE SET sku = EXCLUDED.sku`,
    [productId, sku, name, description, unitOfMeasure, weightLbs]
  );

  return {
    id: productId,
    sku,
    name,
    description,
    unit_of_measure: unitOfMeasure,
    weight_lbs: weightLbs,
  };
}

/**
 * Create a test location
 */
export interface TestLocation {
  id: string;
  zone: string;
  aisle: string;
  shelf: string;
  bin: string;
  location_type: string;
}

export async function createTestLocation(
  db: Pool,
  overrides: Partial<TestLocation> = {}
): Promise<TestLocation> {
  const locationId = overrides.id || `loc-${Math.random().toString(36).substring(7)}`;
  const zone = overrides.zone || 'A';
  const aisle = overrides.aisle || '01';
  const shelf = overrides.shelf || '01';
  const bin = overrides.bin || '01';
  const locationType = overrides.location_type || 'storage';

  await db.query(
    `INSERT INTO locations (id, zone, aisle, shelf, bin, location_type)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (id) DO NOTHING`,
    [locationId, zone, aisle, shelf, bin, locationType]
  );

  return {
    id: locationId,
    zone,
    aisle,
    shelf,
    bin,
    location_type: locationType,
  };
}

/**
 * Create test inventory
 */
export async function createTestInventory(
  db: Pool,
  productId: string,
  locationId: string,
  quantity: number = 100
): Promise<void> {
  const inventoryId = `${randomUUID()}-test-id`;

  await db.query(
    `INSERT INTO inventory (id, product_id, location_id, quantity_available, quantity_allocated)
     VALUES ($1, $2, $3, $4, 0)
     ON CONFLICT (id) DO UPDATE SET quantity_available = EXCLUDED.quantity_available`,
    [inventoryId, productId, locationId, quantity]
  );
}

// ============================================================================
// HTTP Test Helpers
// ============================================================================

/**
 * Create a test API request with auth headers
 */
export interface TestApiRequest {
  method: string;
  path: string;
  body?: any;
  headers?: Record<string, string>;
  userId?: string;
}

export async function makeTestRequest(
  request: TestApiRequest
): Promise<{ status: number; data: any; headers: Headers }> {
  const baseUrl = process.env.TEST_API_URL || 'http://localhost:3001';

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...request.headers,
  };

  const options: RequestInit = {
    method: request.method,
    headers,
  };

  if (request.body) {
    options.body = JSON.stringify(request.body);
  }

  const response = await fetch(`${baseUrl}${request.path}`, options);
  const data = await response.json().catch(() => null);

  return {
    status: response.status,
    data,
    headers: response.headers,
  };
}

// ============================================================================
// Assertion Helpers
// ============================================================================

/**
 * Assert that an API response has the expected status
 */
export function expectStatus(response: { status: number }, expectedStatus: number): void {
  expect(response.status).toBe(expectedStatus);
}

/**
 * Assert that an API response has a specific error
 */
export function expectApiError(
  response: { status: number; data: any },
  expectedError: {
    code?: string;
    message?: string;
  }
): void {
  expect(response.status).toBeGreaterThanOrEqual(400);
  if (expectedError.code) {
    expect(response.data.code).toBe(expectedError.code);
  }
  if (expectedError.message) {
    expect(response.data.message).toContain(expectedError.message);
  }
}

// ============================================================================
// Mock Helpers
// ============================================================================

/**
 * Create a mock response object
 */
export function createMockResponse() {
  const res: any = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    send: jest.fn().mockReturnThis(),
    setHeader: jest.fn().mockReturnThis(),
    getHeader: jest.fn(),
  };
  return res;
}

/**
 * Create a mock request object
 */
export function createMockRequest(overrides: any = {}): any {
  return {
    headers: {},
    query: {},
    params: {},
    body: {},
    user: null,
    ...overrides,
  };
}

// ============================================================================
// Async Helpers
// ============================================================================

/**
 * Wait for a specified amount of time
 */
export function wait(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retry a function until it succeeds or times out
 */
export async function retry<T>(
  fn: () => Promise<T>,
  options: { maxAttempts?: number; delay?: number; timeout?: number } = {}
): Promise<T> {
  const { maxAttempts = 5, delay = 100, timeout = 5000 } = options;
  const startTime = Date.now();

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === maxAttempts || Date.now() - startTime > timeout) {
        throw error;
      }
      await wait(delay * attempt);
    }
  }

  throw new Error('Retry failed');
}
