/**
 * Bin Location Routes Tests
 *
 * Tests for bin location management API endpoints
 */

import request from 'supertest';
import express from 'express';
import { UserRole, BinType } from '@opsui/shared';

// Mock services and middleware BEFORE importing the router
jest.mock('../../services/BinLocationService', () => ({
  binLocationService: {
    createBinLocation: jest.fn(),
    batchCreateBinLocations: jest.fn(),
    getAllBinLocations: jest.fn(),
    getZones: jest.fn(),
    getBinLocationsByZone: jest.fn(),
    getBinLocation: jest.fn(),
    updateBinLocation: jest.fn(),
    deleteBinLocation: jest.fn(),
  },
}));

jest.mock('../../middleware', () => {
  const actual = jest.requireActual('../../middleware');
  return {
    ...actual,
    authenticate: jest.fn((req, _res, next) => {
      (req as any).user = {
        userId: 'user-001',
        email: 'user@example.com',
        role: 'ADMIN',
        baseRole: 'ADMIN',
        effectiveRole: 'ADMIN',
      };
      next();
    }),
    authorize: jest.fn((...roles: string[]) => (req: any, res: any, next: any) => {
      if (roles.includes((req as any).user?.role)) {
        next();
      } else {
        res.status(403).json({ error: 'Forbidden' });
      }
    }),
    asyncHandler: (fn: any) => (req: any, res: any, next: any) => {
      return Promise.resolve(fn(req, res, next)).catch((err: any) => {
        const status = err.status || 500;
        res.status(status).json(err.message ? { error: err.message, code: err.code } : {});
      });
    },
  };
});

// Import router after mocks are set up
import binLocationsRouter from '../binLocations';
import { binLocationService } from '../../services/BinLocationService';

const mockUser = {
  userId: 'user-001',
  email: 'user@example.com',
  role: UserRole.ADMIN,
  baseRole: UserRole.ADMIN,
  effectiveRole: UserRole.ADMIN,
};

describe('Bin Location Routes', () => {
  let app: express.Application;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/api/bin-locations', binLocationsRouter);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/bin-locations', () => {
    it('should create a new bin location', async () => {
      const mockLocation = {
        binId: 'A-01-01',
        zone: 'A',
        aisle: '01',
        shelf: '01',
        type: BinType.RACK,
      };

      (binLocationService.createBinLocation as jest.Mock).mockResolvedValue(mockLocation);

      const response = await request(app)
        .post('/api/bin-locations')
        .send({
          binId: 'A-01-01',
          zone: 'A',
          aisle: '01',
          shelf: '01',
          type: BinType.RACK,
        })
        .expect(201);

      expect(response.body).toEqual(mockLocation);
      expect(binLocationService.createBinLocation).toHaveBeenCalledWith(mockLocation);
    });

    it('should return 400 when required fields are missing', async () => {
      const response = await request(app)
        .post('/api/bin-locations')
        .send({
          binId: 'A-01-01',
        })
        .expect(400);

      expect(response.body).toHaveProperty(
        'error',
        'Missing required fields: binId, zone, aisle, shelf, type'
      );
      expect(response.body.code).toBe('MISSING_FIELDS');
    });

    it('should return 400 for invalid type', async () => {
      const response = await request(app)
        .post('/api/bin-locations')
        .send({
          binId: 'A-01-01',
          zone: 'A',
          aisle: '01',
          shelf: '01',
          type: 'INVALID_TYPE',
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Invalid type');
      expect(response.body.code).toBe('INVALID_TYPE');
    });
  });

  describe('POST /api/bin-locations/batch', () => {
    it('should batch create bin locations', async () => {
      const mockLocations = [
        { binId: 'A-01-01', zone: 'A', aisle: '01', shelf: '01', type: BinType.RACK },
        { binId: 'A-01-02', zone: 'A', aisle: '01', shelf: '02', type: BinType.RACK },
      ];

      (binLocationService.batchCreateBinLocations as jest.Mock).mockResolvedValue({
        created: mockLocations,
        failed: [],
      });

      const response = await request(app)
        .post('/api/bin-locations/batch')
        .send({ locations: mockLocations })
        .expect(201);

      expect(response.body.created).toEqual(mockLocations);
      expect(response.body.summary).toEqual({
        total: 2,
        createdCount: 2,
        failedCount: 0,
      });
    });

    it('should return 400 when locations array is missing', async () => {
      const response = await request(app).post('/api/bin-locations/batch').send({}).expect(400);

      expect(response.body).toHaveProperty('error', 'locations must be a non-empty array');
      expect(response.body.code).toBe('INVALID_INPUT');
    });

    it('should return 400 when locations array is empty', async () => {
      const response = await request(app)
        .post('/api/bin-locations/batch')
        .send({ locations: [] })
        .expect(400);

      expect(response.body).toHaveProperty('error', 'locations must be a non-empty array');
    });

    it('should return 400 when location has missing fields', async () => {
      const response = await request(app)
        .post('/api/bin-locations/batch')
        .send({
          locations: [
            { binId: 'A-01-01', zone: 'A', aisle: '01', shelf: '01', type: BinType.RACK },
            { binId: 'A-01-02' }, // Missing required fields
          ],
        })
        .expect(400);

      expect(response.body).toHaveProperty(
        'error',
        'Each location must have binId, zone, aisle, shelf, and type'
      );
    });

    it('should return 400 for invalid type in batch', async () => {
      const response = await request(app)
        .post('/api/bin-locations/batch')
        .send({
          locations: [
            { binId: 'A-01-01', zone: 'A', aisle: '01', shelf: '01', type: 'INVALID_TYPE' },
          ],
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Invalid type');
      expect(response.body.code).toBe('INVALID_TYPE');
    });
  });

  describe('GET /api/bin-locations', () => {
    it('should return all bin locations with default filters', async () => {
      const mockLocations = [
        { binId: 'A-01-01', zone: 'A', type: BinType.RACK },
        { binId: 'B-02-03', zone: 'B', type: BinType.SHELF },
      ];

      (binLocationService.getAllBinLocations as jest.Mock).mockResolvedValue(mockLocations);

      const response = await request(app).get('/api/bin-locations').expect(200);

      expect(response.body).toEqual(mockLocations);
      expect(binLocationService.getAllBinLocations).toHaveBeenCalledWith(
        expect.objectContaining({
          limit: 100,
          offset: 0,
        })
      );
    });

    it('should filter by zone', async () => {
      (binLocationService.getAllBinLocations as jest.Mock).mockResolvedValue([]);

      await request(app).get('/api/bin-locations?zone=A').expect(200);

      expect(binLocationService.getAllBinLocations).toHaveBeenCalledWith(
        expect.objectContaining({ zone: 'A' })
      );
    });

    it('should filter by type', async () => {
      (binLocationService.getAllBinLocations as jest.Mock).mockResolvedValue([]);

      await request(app).get('/api/bin-locations?type=RACK').expect(200);

      expect(binLocationService.getAllBinLocations).toHaveBeenCalledWith(
        expect.objectContaining({ type: BinType.RACK })
      );
    });

    it('should filter by active status', async () => {
      (binLocationService.getAllBinLocations as jest.Mock).mockResolvedValue([]);

      await request(app).get('/api/bin-locations?active=true').expect(200);

      expect(binLocationService.getAllBinLocations).toHaveBeenCalledWith(
        expect.objectContaining({ active: true })
      );
    });

    it('should support pagination', async () => {
      (binLocationService.getAllBinLocations as jest.Mock).mockResolvedValue([]);

      await request(app).get('/api/bin-locations?limit=50&offset=10').expect(200);

      expect(binLocationService.getAllBinLocations).toHaveBeenCalledWith(
        expect.objectContaining({ limit: 50, offset: 10 })
      );
    });
  });

  describe('GET /api/bin-locations/zones', () => {
    it('should return all zones', async () => {
      const mockZones = ['A', 'B', 'C', 'D'];

      (binLocationService.getZones as jest.Mock).mockResolvedValue(mockZones);

      const response = await request(app).get('/api/bin-locations/zones').expect(200);

      expect(response.body).toEqual({ zones: mockZones });
    });
  });

  describe('GET /api/bin-locations/by-zone/:zone', () => {
    it('should return bin locations for a zone', async () => {
      const mockLocations = [
        { binId: 'A-01-01', zone: 'A', type: BinType.RACK },
        { binId: 'A-01-02', zone: 'A', type: BinType.RACK },
      ];

      (binLocationService.getBinLocationsByZone as jest.Mock).mockResolvedValue(mockLocations);

      const response = await request(app).get('/api/bin-locations/by-zone/A').expect(200);

      expect(response.body).toEqual(mockLocations);
      expect(binLocationService.getBinLocationsByZone).toHaveBeenCalledWith('A');
    });
  });

  describe('GET /api/bin-locations/:binId', () => {
    it('should return a specific bin location', async () => {
      const mockLocation = {
        binId: 'A-01-01',
        zone: 'A',
        aisle: '01',
        shelf: '01',
        type: BinType.RACK,
        active: true,
      };

      (binLocationService.getBinLocation as jest.Mock).mockResolvedValue(mockLocation);

      const response = await request(app).get('/api/bin-locations/A-01-01').expect(200);

      expect(response.body).toEqual(mockLocation);
      expect(binLocationService.getBinLocation).toHaveBeenCalledWith('A-01-01');
    });
  });

  describe('PATCH /api/bin-locations/:binId', () => {
    it('should update a bin location', async () => {
      const mockUpdated = {
        binId: 'A-01-01',
        zone: 'A',
        aisle: '01',
        shelf: '01',
        type: BinType.RACK,
        active: false,
      };

      (binLocationService.updateBinLocation as jest.Mock).mockResolvedValue(mockUpdated);

      const response = await request(app)
        .patch('/api/bin-locations/A-01-01')
        .send({ active: false })
        .expect(200);

      expect(response.body).toEqual(mockUpdated);
      expect(binLocationService.updateBinLocation).toHaveBeenCalledWith('A-01-01', {
        active: false,
      });
    });

    it('should return 400 for invalid type', async () => {
      const response = await request(app)
        .patch('/api/bin-locations/A-01-01')
        .send({ type: 'INVALID_TYPE' })
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Invalid type');
      expect(response.body.code).toBe('INVALID_TYPE');
    });
  });

  describe('DELETE /api/bin-locations/:binId', () => {
    it('should delete a bin location', async () => {
      (binLocationService.deleteBinLocation as jest.Mock).mockResolvedValue(undefined);

      await request(app).delete('/api/bin-locations/A-01-01').expect(204);

      expect(binLocationService.deleteBinLocation).toHaveBeenCalledWith('A-01-01');
    });
  });
});
