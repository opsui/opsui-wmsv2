/**
 * Mock for db/client module
 * Provides mock implementations for database operations in tests
 */

// Create a mock pool that returns a proper query result
const createMockPool = () => ({
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
});

// Create default mock pool instance
const mockPoolInstance = createMockPool();

// Mock getPool function - returns the mock pool by default
const getPool = jest.fn(() => mockPoolInstance);

// Allow tests to override the return value
getPool.mockReturnValue = jest.fn((value) => {
  mockPoolInstance.query = value?.query || mockPoolInstance.query;
  mockPoolInstance.connect = value?.connect || mockPoolInstance.connect;
  return getPool;
});

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
