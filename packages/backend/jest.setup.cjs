/**
 * Jest setup file for backend tests
 * Configures global mocks and test utilities
 */

// Mock environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-key-for-jwt-signing';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-key';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/wms_test';
process.env.REDIS_URL = 'redis://localhost:6379/1';

// Mock Winston logger
global.logger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
};

// Mock database client - will be overridden in individual tests as needed
global.mockDb = {
  query: jest.fn(),
  connect: jest.fn(),
  end: jest.fn(),
};

// Silence console output during tests (unless debugging)
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Mock Redis client
jest.mock('redis', () => ({
  createClient: jest.fn(() => ({
    connect: jest.fn(),
    disconnect: jest.fn(),
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    on: jest.fn(),
  })),
}));

// Mock nanoid - provide a mock function that can be overridden in tests
// nanoid is an ES module that exports a function as both default and named export
jest.mock('nanoid', () => {
  const nanoidMock = jest.fn((length = 21) => 'a'.repeat(length));
  return {
    __esModule: true,
    default: nanoidMock,
    nanoid: nanoidMock,
  };
});

// Mock db/client module - provide default mock pool that can be overridden in tests
jest.mock('./src/db/client', () => {
  const mockPool = {
    query: jest.fn(),
    connect: jest.fn(),
    end: jest.fn(),
    on: jest.fn(),
    totalCount: 10,
    idleCount: 5,
    waitingCount: 0,
  };

  return {
    getPool: jest.fn(() => mockPool),
    closePool: jest.fn(),
    testConnection: jest.fn(),
    query: jest.fn(),
    transaction: jest.fn(),
    getClient: jest.fn(),
    getHealthStatus: jest.fn(),
    setupShutdownHandlers: jest.fn(),
  };
});
