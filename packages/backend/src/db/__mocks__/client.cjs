/**
 * Mock for db/client module
 * Provides mock implementations for database operations in tests
 */

// Default mock pool
const defaultMockPool = {
  query: jest.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
  connect: jest.fn().mockResolvedValue({
    query: jest.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
    release: jest.fn(),
  }),
  end: jest.fn().mockResolvedValue(undefined),
  on: jest.fn(),
  totalCount: 10,
  idleCount: 5,
  waitingCount: 0,
};

// getPool mock with default return value
const getPool = jest.fn(() => defaultMockPool);

// Other mock functions
const closePool = jest.fn();
const testConnection = jest.fn();
const query = jest.fn();
const transaction = jest.fn();
const getClient = jest.fn();
const getHealthStatus = jest.fn();
const setupShutdownHandlers = jest.fn();

module.exports = {
  getPool,
  closePool,
  testConnection,
  query,
  transaction,
  getClient,
  getHealthStatus,
  setupShutdownHandlers,
};
