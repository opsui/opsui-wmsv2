/**
 * Health Routes Tests
 *
 * Tests for health check endpoints used for monitoring and Kubernetes probes
 */

import request from 'supertest';
import express from 'express';
import healthRouter from '../health';
import { getHealthStatus } from '../../db/client';
import config from '../../config';

// Mock dependencies
jest.mock('../../db/client');
jest.mock('../../config');

const mockGetHealthStatus = getHealthStatus as jest.MockedFunction<typeof getHealthStatus>;

describe('Health Routes', () => {
  let app: express.Application;

  beforeAll(() => {
    app = express();
    app.use('/health', healthRouter);

    // Setup default config mock
    (config as any) = {
      nodeEnv: 'test',
      features: {
        websocket: true,
        redisCache: false,
        auditLog: true,
      },
    };

    // Setup default health status mock
    mockGetHealthStatus.mockResolvedValue({
      healthy: true,
      connections: 5,
      waiting: 0,
      max: 20,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /health', () => {
    it('should return basic health status', async () => {
      const response = await request(app).get('/health').expect(200).expect('Content-Type', /json/);

      expect(response.body).toHaveProperty('status', 'ok');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('uptime');
      expect(response.body).toHaveProperty('environment', 'test');
    });

    it('should include numeric uptime', async () => {
      const response = await request(app).get('/health').expect(200);

      expect(typeof response.body.uptime).toBe('number');
      expect(response.body.uptime).toBeGreaterThanOrEqual(0);
    });

    it('should include ISO timestamp', async () => {
      const response = await request(app).get('/health').expect(200);

      expect(response.body.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });
  });

  describe('GET /health/detailed', () => {
    it('should return detailed health with database info when DB is healthy', async () => {
      mockGetHealthStatus.mockResolvedValueOnce({
        healthy: true,
        connections: 8,
        waiting: 2,
        max: 20,
      });

      const response = await request(app)
        .get('/health/detailed')
        .expect(200)
        .expect('Content-Type', /json/);

      expect(response.body).toHaveProperty('status', 'ok');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('uptime');
      expect(response.body).toHaveProperty('environment', 'test');
      expect(response.body).toHaveProperty('database');
      expect(response.body).toHaveProperty('features');

      expect(response.body.database).toEqual({
        healthy: true,
        connections: 8,
        waiting: 2,
        max: 20,
      });

      expect(response.body.features).toEqual({
        websocket: true,
        redisCache: false,
        auditLog: true,
      });
    });

    it('should return 503 when database is unhealthy', async () => {
      mockGetHealthStatus.mockResolvedValueOnce({
        healthy: false,
        connections: 20,
        waiting: 15,
        max: 20,
      });

      const response = await request(app)
        .get('/health/detailed')
        .expect(503)
        .expect('Content-Type', /json/);

      expect(response.body).toHaveProperty('status', 'degraded');
      expect(response.body.database).toHaveProperty('healthy', false);
      expect(response.body.database.connections).toBe(20);
    });

    it('should include feature flags in response', async () => {
      const response = await request(app).get('/health/detailed').expect(200);

      expect(response.body.features).toHaveProperty('websocket');
      expect(response.body.features).toHaveProperty('redisCache');
      expect(response.body.features).toHaveProperty('auditLog');
    });
  });

  describe('GET /health/ready', () => {
    it('should return 200 when database is healthy', async () => {
      mockGetHealthStatus.mockResolvedValueOnce({
        healthy: true,
        connections: 5,
        waiting: 0,
        max: 20,
      });

      const response = await request(app)
        .get('/health/ready')
        .expect(200)
        .expect('Content-Type', /json/);

      expect(response.body).toEqual({ status: 'ready' });
    });

    it('should return 503 when database is unhealthy', async () => {
      mockGetHealthStatus.mockResolvedValueOnce({
        healthy: false,
        connections: 20,
        waiting: 10,
        max: 20,
      });

      const response = await request(app)
        .get('/health/ready')
        .expect(503)
        .expect('Content-Type', /json/);

      expect(response.body).toHaveProperty('status', 'not ready');
      expect(response.body).toHaveProperty('database', 'unhealthy');
    });
  });

  describe('GET /health/live', () => {
    it('should always return 200 for liveness probe', async () => {
      const response = await request(app)
        .get('/health/live')
        .expect(200)
        .expect('Content-Type', /json/);

      expect(response.body).toEqual({ status: 'alive' });
    });

    it('should return alive even when database is down', async () => {
      mockGetHealthStatus.mockResolvedValueOnce({
        healthy: false,
        connections: 0,
        waiting: 0,
        max: 20,
      });

      await request(app).get('/health/live').expect(200).expect('Content-Type', /json/);
    });
  });

  describe('Environment configurations', () => {
    it('should reflect production environment', async () => {
      (config as any).nodeEnv = 'production';

      const response = await request(app).get('/health').expect(200);

      expect(response.body.environment).toBe('production');

      // Reset
      (config as any).nodeEnv = 'test';
    });

    it('should reflect development environment', async () => {
      (config as any).nodeEnv = 'development';

      const response = await request(app).get('/health').expect(200);

      expect(response.body.environment).toBe('development');

      // Reset
      (config as any).nodeEnv = 'test';
    });
  });
});
