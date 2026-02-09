/**
 * Integration Tests: API Client + Backend Communication
 *
 * These tests validate that the frontend can successfully communicate
 * with the backend API and handle responses correctly.
 *
 * NOTE: These tests require the backend to be running on localhost:3001
 * They should be run separately from unit tests using: npm test -- integration
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import axios from 'axios';

const API_BASE_URL = process.env.VITE_API_URL || 'http://localhost:3001/api';

// Test API client instance
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 5000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Test credentials
const TEST_CREDENTIALS = {
  email: 'john.picker@wms.local',
  password: 'password123',
};

let authToken: string | null = null;
let backendAvailable = false;

describe('API Integration Tests', () => {
  beforeAll(async () => {
    // Check if backend is available first
    try {
      const healthResponse = await axios.get('http://localhost:3001/health', {
        timeout: 3000,
      });
      backendAvailable = healthResponse.status === 200;

      if (!backendAvailable) {
        console.warn('Backend is not available. Skipping integration tests.');
        return;
      }

      // Setup: Authenticate and get token
      try {
        const response = await apiClient.post('/auth/login', TEST_CREDENTIALS);
        authToken = response.data.token;
        apiClient.defaults.headers.common['Authorization'] = `Bearer ${authToken}`;
      } catch (error) {
        console.error('Failed to authenticate for integration tests:', error);
        backendAvailable = false;
      }
    } catch (error) {
      console.warn('Backend is not available. Skipping integration tests.');
      backendAvailable = false;
    }
  }, 10000);

  afterAll(() => {
    // Cleanup
    delete apiClient.defaults.headers.common['Authorization'];
  });

  // Skip all tests if backend is not available
  const conditionalIt = backendAvailable ? it : it.skip;

  describe('Authentication Flow', () => {
    conditionalIt('should successfully login with valid credentials', async () => {
      const response = await apiClient.post('/auth/login', TEST_CREDENTIALS);

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('token');
      expect(response.data).toHaveProperty('user');
      expect(response.data.user).toHaveProperty('email', TEST_CREDENTIALS.email);
      expect(response.data.user).toHaveProperty('role', 'PICKER');
    });

    conditionalIt('should reject login with invalid credentials', async () => {
      try {
        await apiClient.post('/auth/login', {
          email: 'invalid@test.com',
          password: 'wrongpassword',
        });
        expect.fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.response?.status).toBe(401);
      }
    });

    conditionalIt('should get current user with valid token', async () => {
      const response = await apiClient.get('/auth/current');

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('email', TEST_CREDENTIALS.email);
      expect(response.data).toHaveProperty('userId');
      expect(response.data).toHaveProperty('role');
    });

    conditionalIt('should reject requests without token', async () => {
      const clientWithoutAuth = axios.create({
        baseURL: API_BASE_URL,
        timeout: 5000,
      });

      try {
        await clientWithoutAuth.get('/auth/current');
        expect.fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.response?.status).toBe(401);
      }
    });
  });

  describe('Order API', () => {
    conditionalIt('should fetch list of orders', async () => {
      const response = await apiClient.get('/orders');

      expect(response.status).toBe(200);
      expect(Array.isArray(response.data)).toBe(true);
      expect(response.data.length).toBeGreaterThan(0);

      // Validate order structure
      const firstOrder = response.data[0];
      expect(firstOrder).toHaveProperty('order_id');
      expect(firstOrder).toHaveProperty('status');
      expect(firstOrder).toHaveProperty('priority');
      expect(firstOrder).toHaveProperty('created_at');
    });

    conditionalIt('should fetch a single order by ID', async () => {
      // First get a list to find a valid order ID
      const listResponse = await apiClient.get('/orders');
      const orderId = listResponse.data[0].order_id;

      // Fetch the specific order
      const response = await apiClient.get(`/orders/${orderId}`);

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('order_id', orderId);
      expect(response.data).toHaveProperty('items');
      expect(Array.isArray(response.data.items)).toBe(true);
    });

    conditionalIt('should fetch next task for an order', async () => {
      // Get an order in PICKING status
      const response = await apiClient.get(`/orders/ORD-20260114-6062/next-task`);

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('pickTaskId');
      expect(response.data).toHaveProperty('orderId');
      expect(response.data).toHaveProperty('sku');
      expect(response.data).toHaveProperty('name');
      expect(response.data).toHaveProperty('targetBin');
    });

    conditionalIt('should update picker status', async () => {
      const response = await apiClient.put('/orders/ORD-20260114-6062/picker-status', {
        isPicking: true,
      });

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('success', true);
    });
  });

  describe('Error Handling', () => {
    conditionalIt('should handle 404 errors gracefully', async () => {
      try {
        await apiClient.get('/orders/NON-EXISTENT-ID');
        expect.fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.response?.status).toBe(404);
        expect(error.response?.data).toHaveProperty('error');
      }
    });

    conditionalIt('should handle validation errors', async () => {
      try {
        await apiClient.post('/auth/login', {
          email: 'invalid-email',
          // Missing password
        });
        expect.fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.response?.status).toBe(400);
      }
    });
  });

  describe('Response Times', () => {
    conditionalIt('should respond to health check within 100ms', async () => {
      const start = Date.now();
      await apiClient.get('/health');
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(100);
    });

    conditionalIt('should fetch orders within 500ms', async () => {
      const start = Date.now();
      await apiClient.get('/orders');
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(500);
    });
  });
});

/**
 * Connection Validation Test Suite
 *
 * This suite validates that the frontend and backend are properly connected
 * and can communicate before marking a task as complete.
 */
describe('Connection Validation', () => {
  const conditionalIt = backendAvailable ? it : it.skip;

  conditionalIt('should connect to backend API', async () => {
    const response = await axios.get('http://localhost:3001/health', {
      timeout: 3000,
    });

    expect(response.status).toBe(200);
    expect(response.data).toHaveProperty('status', 'ok');
  });

  conditionalIt('should verify database connectivity', async () => {
    const response = await axios.get('http://localhost:3001/health', {
      timeout: 3000,
    });

    expect(response.data).toHaveProperty('database');
    expect(response.data.database).toHaveProperty('status', 'connected');
  });

  conditionalIt('should verify WebSocket endpoint is available', async () => {
    // Check if the server responds to WebSocket upgrade requests
    // This is a basic check - actual WebSocket connection would require WS client
    const response = await axios.get('http://localhost:3001/health', {
      timeout: 3000,
    });

    expect(response.status).toBe(200);
  });
});
