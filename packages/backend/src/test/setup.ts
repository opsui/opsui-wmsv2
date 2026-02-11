/**
 * Jest Test Setup
 *
 * Configures the test environment for all test suites.
 */

import { jest } from '@jest/globals';

// ============================================================================
// Test Environment Configuration
// ============================================================================

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.DB_HOST = process.env.DB_HOST || 'localhost';
process.env.DB_PORT = process.env.DB_PORT || '5432';
process.env.DB_NAME = process.env.DB_NAME || 'test_db';
process.env.DB_USER = process.env.DB_USER || 'test_user';
process.env.DB_PASSWORD = process.env.DB_PASSWORD || 'test_password';
process.env.REDIS_HOST = process.env.REDIS_HOST || 'localhost';
process.env.REDIS_PORT = process.env.REDIS_PORT || '6379';
process.env.JWT_SECRET = 'test-secret-key-for-testing-only';
process.env.TEST_MODE = 'true';

// ============================================================================
// Mock External Services
// ============================================================================

// Mock Redis
jest.mock('redis', () => ({
  createClient: jest.fn(() => ({
    connect: jest.fn().mockResolvedValue(undefined as never),
    disconnect: jest.fn().mockResolvedValue(undefined as never),
    get: jest.fn().mockResolvedValue(null as never),
    set: jest.fn().mockResolvedValue('OK' as never),
    del: jest.fn().mockResolvedValue(1 as never),
    exists: jest.fn().mockResolvedValue(0 as never),
    expire: jest.fn().mockResolvedValue(1 as never),
    on: jest.fn(),
  })),
}));

// Mock email services
jest.mock('@sendgrid/mail', () => ({
  setApiKey: jest.fn(),
  send: jest.fn().mockResolvedValue([{ statusCode: 202 }] as never),
}));

jest.mock('postmark', () => ({
  ServerClient: jest.fn().mockImplementation(() => ({
    sendEmail: jest.fn().mockResolvedValue({ ErrorCode: 0, MessageID: 'test-id' } as never),
  })),
}));

// Mock Twilio
jest.mock('twilio', () => ({
  Twilio: jest.fn().mockImplementation(() => ({
    messages: {
      create: jest.fn().mockResolvedValue({ sid: 'test-sid' } as never),
    },
  })),
}));

// Mock web-push
jest.mock('web-push', () => ({
  sendNotification: jest.fn().mockResolvedValue(201 as never),
  setVapidDetails: jest.fn(),
}));

// Mock OpenTelemetry
jest.mock('@opentelemetry/api', () => ({
  trace: {
    getTracer: jest.fn().mockReturnValue({
      startSpan: jest.fn().mockReturnValue({
        end: jest.fn(),
        setAttributes: jest.fn(),
        recordException: jest.fn(),
        setStatus: jest.fn(),
      }),
    }),
  },
  context: {
    active: jest.fn(),
    bind: jest.fn(),
  },
}));

// ============================================================================
// Global Test Utilities
// ============================================================================

// Extend Jest matchers
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeValidUUID(): R;
      toBeValidISODate(): R;
      toHaveErrorMessage(message: string): R;
    }
  }
}

// Custom matchers
expect.extend({
  toBeValidUUID(received: string) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    const pass = uuidRegex.test(received);
    return {
      pass,
      message: () =>
        pass
          ? `Expected ${received} not to be a valid UUID`
          : `Expected ${received} to be a valid UUID`,
    };
  },

  toBeValidISODate(received: string) {
    const date = new Date(received);
    const pass = !isNaN(date.getTime()) && date.toISOString() === received;
    return {
      pass,
      message: () =>
        pass
          ? `Expected ${received} not to be a valid ISO date`
          : `Expected ${received} to be a valid ISO date`,
    };
  },

  toHaveErrorMessage(received: Error, message: string) {
    const pass = received.message.includes(message);
    return {
      pass,
      message: () =>
        pass
          ? `Expected error message not to contain "${message}"`
          : `Expected error message to contain "${message}", but got "${received.message}"`,
    };
  },
});

// ============================================================================
// Console Overrides
// ============================================================================

// Suppress console.log during tests unless debugging
const originalConsoleLog = console.log;
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

if (process.env.DEBUG !== 'true') {
  console.log = (...args: any[]) => {
    if (typeof args[0] === 'string' && args[0].includes('[TEST]')) {
      originalConsoleLog(...args);
    }
  };

  console.error = (...args: any[]) => {
    if (typeof args[0] === 'string' && args[0].includes('[TEST]')) {
      originalConsoleError(...args);
    }
  };

  console.warn = (...args: any[]) => {
    if (typeof args[0] === 'string' && args[0].includes('[TEST]')) {
      originalConsoleWarn(...args);
    }
  };
}

// ============================================================================
// Test Timeout Configuration
// ============================================================================

// Increase timeout for integration tests
jest.setTimeout(30000);

// ============================================================================
// Export Test Utilities
// ============================================================================

export {};
