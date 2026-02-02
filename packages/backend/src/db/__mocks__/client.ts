/**
 * Mock for db/client module
 * Provides mock implementations for database operations in tests
 */

import { Pool } from 'pg';

// Create a mock pool
const mockPool = {
  query: jest.fn(),
  connect: jest.fn(),
  end: jest.fn(),
  on: jest.fn(),
  totalCount: 10,
  idleCount: 5,
  waitingCount: 0,
};

// Mock getPool function
export const getPool = jest.fn((): Pool => mockPool as unknown as Pool);

// Mock closePool function
export const closePool = jest.fn();

// Mock testConnection function
export const testConnection = jest.fn();

// Mock query function
export const query = jest.fn();

// Mock transaction function
export const transaction = jest.fn();

// Mock getClient function
export const getClient = jest.fn();

// Mock getHealthStatus function
export const getHealthStatus = jest.fn();

// Mock setupShutdownHandlers function
export const setupShutdownHandlers = jest.fn();
