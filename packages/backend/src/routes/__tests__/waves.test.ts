/**
 * Wave Picking Routes Tests
 *
 * Tests for wave picking API endpoints
 */

import request from 'supertest';
import express from 'express';
import { UserRole } from '@opsui/shared';

// Mock services and middleware BEFORE importing the router
jest.mock('../../services/WavePickingService', () => ({
  wavePickingService: {
    createWave: jest.fn(),
    releaseWave: jest.fn(),
    getWaveStatus: jest.fn(),
    getActiveWavesForPicker: jest.fn(),
    completeWave: jest.fn(),
  },
  WaveStrategy: {
    CARRIER: 'CARRIER',
    PRIORITY: 'PRIORITY',
    ZONE: 'ZONE',
    DEADLINE: 'DEADLINE',
    SKU_COMPATIBILITY: 'SKU_COMPATIBILITY',
    BALANCED: 'BALANCED',
  },
}));

jest.mock('../../middleware/auth', () => ({
  authenticate: jest.fn((req, _res, next) => {
    (req as any).user = {
      userId: 'user-001',
      email: 'user@example.com',
      role: UserRole.ADMIN,
      baseRole: UserRole.ADMIN,
      effectiveRole: UserRole.ADMIN,
    };
    next();
  }),
  authorize: jest.fn((...roles: string[]) => {
    return (req: any, res: any, next: any) => {
      if (roles.includes((req as any).user?.role)) {
        next();
      } else {
        res.status(403).json({ error: 'Forbidden' });
      }
    };
  }),
}));

// Import router after mocks are set up
import wavesRouter from '../waves';
import { wavePickingService, WaveStrategy } from '../../services/WavePickingService';

const mockUser = {
  userId: 'user-001',
  email: 'user@example.com',
  role: UserRole.ADMIN,
  baseRole: UserRole.ADMIN,
  effectiveRole: UserRole.ADMIN,
};

describe('Wave Picking Routes', () => {
  let app: express.Application;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/api/v1/waves', wavesRouter);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/v1/waves/create', () => {
    it('should create a new wave', async () => {
      const mockWave = {
        waveId: 'wave-001',
        status: 'PENDING',
        orderCount: 10,
        strategy: WaveStrategy.CARRIER,
      };

      (wavePickingService.createWave as jest.Mock).mockResolvedValue(mockWave);

      const response = await request(app)
        .post('/api/v1/waves/create')
        .send({
          strategy: WaveStrategy.CARRIER,
          maxOrders: 50,
        })
        .expect(201);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message', 'Wave created successfully');
      expect(response.body.data).toEqual(mockWave);
      expect(wavePickingService.createWave).toHaveBeenCalledWith(
        {
          strategy: WaveStrategy.CARRIER,
          maxOrders: 50,
        },
        expect.any(Object)
      );
    });

    it('should return 400 when strategy is missing', async () => {
      const response = await request(app)
        .post('/api/v1/waves/create')
        .send({
          maxOrders: 50,
        })
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Missing required field');
      expect(response.body.message).toContain('strategy');
    });

    it('should handle wave creation errors', async () => {
      (wavePickingService.createWave as jest.Mock).mockRejectedValue(
        new Error('No orders found matching criteria')
      );

      const response = await request(app)
        .post('/api/v1/waves/create')
        .send({
          strategy: WaveStrategy.PRIORITY,
        })
        .expect(500);

      expect(response.body).toHaveProperty('error', 'Wave creation failed');
    });
  });

  describe('POST /api/v1/waves/:waveId/release', () => {
    it('should release a wave', async () => {
      const mockWave = {
        waveId: 'wave-001',
        status: 'RELEASED',
        orderCount: 10,
      };

      (wavePickingService.releaseWave as jest.Mock).mockResolvedValue(mockWave);

      const response = await request(app).post('/api/v1/waves/wave-001/release').expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.message).toContain('released');
      expect(wavePickingService.releaseWave).toHaveBeenCalledWith('wave-001', expect.any(Object));
    });

    it('should handle release errors', async () => {
      (wavePickingService.releaseWave as jest.Mock).mockRejectedValue(new Error('Wave not found'));

      const response = await request(app).post('/api/v1/waves/nonexistent/release').expect(500);

      expect(response.body).toHaveProperty('error', 'Wave release failed');
    });
  });

  describe('GET /api/v1/waves/:waveId/status', () => {
    it('should return wave status', async () => {
      const mockStatus = {
        waveId: 'wave-001',
        status: 'IN_PROGRESS',
        totalOrders: 10,
        completedOrders: 5,
        remainingOrders: 5,
        pickers: [{ pickerId: 'picker-001', assignedOrders: 5, completedOrders: 3 }],
      };

      (wavePickingService.getWaveStatus as jest.Mock).mockResolvedValue(mockStatus);

      const response = await request(app).get('/api/v1/waves/wave-001/status').expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toEqual(mockStatus);
    });

    it('should return 404 when wave not found', async () => {
      (wavePickingService.getWaveStatus as jest.Mock).mockResolvedValue(null);

      const response = await request(app).get('/api/v1/waves/nonexistent/status').expect(404);

      expect(response.body).toHaveProperty('error', 'Wave not found');
    });

    it('should handle status retrieval errors', async () => {
      (wavePickingService.getWaveStatus as jest.Mock).mockRejectedValue(
        new Error('Database error')
      );

      const response = await request(app).get('/api/v1/waves/wave-001/status').expect(500);

      expect(response.body).toHaveProperty('error', 'Failed to get wave status');
    });
  });

  describe('GET /api/v1/waves/picker/:pickerId', () => {
    it('should return active waves for picker', async () => {
      const mockWaves = [
        {
          waveId: 'wave-001',
          status: 'IN_PROGRESS',
          assignedOrders: 8,
        },
        {
          waveId: 'wave-002',
          status: 'RELEASED',
          assignedOrders: 5,
        },
      ];

      (wavePickingService.getActiveWavesForPicker as jest.Mock).mockResolvedValue(mockWaves);

      const response = await request(app).get('/api/v1/waves/picker/picker-001').expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toEqual(mockWaves);
      expect(wavePickingService.getActiveWavesForPicker).toHaveBeenCalledWith('picker-001');
    });

    it('should handle errors when getting picker waves', async () => {
      (wavePickingService.getActiveWavesForPicker as jest.Mock).mockRejectedValue(
        new Error('Picker not found')
      );

      const response = await request(app).get('/api/v1/waves/picker/invalid-picker').expect(500);

      expect(response.body).toHaveProperty('error', 'Failed to get picker waves');
    });
  });

  describe('POST /api/v1/waves/:waveId/complete', () => {
    it('should mark a wave as completed', async () => {
      (wavePickingService.completeWave as jest.Mock).mockResolvedValue(undefined);

      const response = await request(app).post('/api/v1/waves/wave-001/complete').expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.message).toContain('completed');
      expect(wavePickingService.completeWave).toHaveBeenCalledWith('wave-001', expect.any(Object));
    });

    it('should handle completion errors', async () => {
      (wavePickingService.completeWave as jest.Mock).mockRejectedValue(
        new Error('Cannot complete wave with pending orders')
      );

      const response = await request(app).post('/api/v1/waves/wave-001/complete').expect(500);

      expect(response.body).toHaveProperty('error', 'Wave completion failed');
    });
  });

  describe('GET /api/v1/waves/strategies', () => {
    it('should return all available strategies', async () => {
      const response = await request(app).get('/api/v1/waves/strategies').expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('strategies');
      expect(Array.isArray(response.body.data.strategies)).toBe(true);
      expect(response.body.data.strategies).toHaveLength(6);

      // Verify all strategies are present
      const strategyIds = response.body.data.strategies.map((s: any) => s.id);
      expect(strategyIds).toContain(WaveStrategy.CARRIER);
      expect(strategyIds).toContain(WaveStrategy.PRIORITY);
      expect(strategyIds).toContain(WaveStrategy.ZONE);
      expect(strategyIds).toContain(WaveStrategy.DEADLINE);
      expect(strategyIds).toContain(WaveStrategy.SKU_COMPATIBILITY);
      expect(strategyIds).toContain(WaveStrategy.BALANCED);
    });

    it('should include strategy descriptions', async () => {
      const response = await request(app).get('/api/v1/waves/strategies').expect(200);

      const carrierStrategy = response.body.data.strategies.find(
        (s: any) => s.id === WaveStrategy.CARRIER
      );
      expect(carrierStrategy).toHaveProperty('name');
      expect(carrierStrategy).toHaveProperty('description');
      expect(carrierStrategy.name).toBe('Carrier-based');
    });
  });
});
