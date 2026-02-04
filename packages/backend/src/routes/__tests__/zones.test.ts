/**
 * Zone Picking Routes Tests
 *
 * Tests for zone-based picking API endpoints
 */

import request from 'supertest';
import express from 'express';
import { UserRole } from '@opsui/shared';

// Mock services and middleware BEFORE importing the router
jest.mock('../../services/ZonePickingService', () => ({
  zonePickingService: {
    getZones: jest.fn(),
    getZoneStats: jest.fn(),
    getAllZoneStats: jest.fn(),
    assignPickerToZone: jest.fn(),
    releasePickerFromZone: jest.fn(),
    rebalancePickers: jest.fn(),
    getZonePickTasks: jest.fn(),
  },
}));

jest.mock('../../middleware/auth', () => ({
  authenticate: jest.fn((req, _res, next) => {
    (req as any).user = {
      userId: 'user-001',
      email: 'user@example.com',
      role: UserRole.PICKER,
      baseRole: UserRole.PICKER,
      effectiveRole: UserRole.PICKER,
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
  requirePicker: jest.fn((req, _res, next) => {
    // Pass through for PICKER role
    if ((req as any).user?.role === UserRole.PICKER) {
      next();
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (req as any).user = { ...(req as any).user, role: UserRole.PICKER };
      next();
    }
  }),
}));

// Import router after mocks are set up
import zonesRouter from '../zones';
import { zonePickingService } from '../../services/ZonePickingService';

const mockUser = {
  userId: 'user-001',
  email: 'user@example.com',
  role: UserRole.PICKER,
  baseRole: UserRole.PICKER,
  effectiveRole: UserRole.PICKER,
};

describe('Zone Picking Routes', () => {
  let app: express.Application;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/api/v1/zones', zonesRouter);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/v1/zones', () => {
    it('should return all zones', async () => {
      const mockZones = [
        { zoneId: 'A', name: 'Zone A', locationCount: 100 },
        { zoneId: 'B', name: 'Zone B', locationCount: 150 },
        { zoneId: 'C', name: 'Zone C', locationCount: 200 },
      ];

      (zonePickingService.getZones as jest.Mock).mockResolvedValue(mockZones);

      const response = await request(app).get('/api/v1/zones').expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toEqual(mockZones);
      expect(zonePickingService.getZones).toHaveBeenCalled();
    });

    it('should handle errors when getting zones', async () => {
      (zonePickingService.getZones as jest.Mock).mockRejectedValue(
        new Error('Database connection failed')
      );

      const response = await request(app).get('/api/v1/zones').expect(500);

      expect(response.body).toHaveProperty('error', 'Failed to get zones');
    });
  });

  describe('GET /api/v1/zones/:zoneId/stats', () => {
    it('should return zone statistics', async () => {
      const mockStats = {
        zoneId: 'A',
        totalTasks: 50,
        completedTasks: 35,
        pendingTasks: 15,
        activePickers: 3,
      };

      (zonePickingService.getZoneStats as jest.Mock).mockResolvedValue(mockStats);

      const response = await request(app).get('/api/v1/zones/A/stats').expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toEqual(mockStats);
      expect(zonePickingService.getZoneStats).toHaveBeenCalledWith('A');
    });

    it('should return 404 when zone not found', async () => {
      (zonePickingService.getZoneStats as jest.Mock).mockResolvedValue(null);

      const response = await request(app).get('/api/v1/zones/UNKNOWN/stats').expect(404);

      expect(response.body).toHaveProperty('error', 'Zone not found');
      expect(response.body.message).toContain('UNKNOWN');
    });

    it('should handle errors when getting zone stats', async () => {
      (zonePickingService.getZoneStats as jest.Mock).mockRejectedValue(
        new Error('Service unavailable')
      );

      const response = await request(app).get('/api/v1/zones/A/stats').expect(500);

      expect(response.body).toHaveProperty('error', 'Failed to get zone stats');
    });
  });

  describe('GET /api/v1/zones/stats/all', () => {
    it('should return statistics for all zones', async () => {
      const mockStats = [
        { zoneId: 'A', totalTasks: 50, completedTasks: 35 },
        { zoneId: 'B', totalTasks: 60, completedTasks: 40 },
        { zoneId: 'C', totalTasks: 45, completedTasks: 30 },
      ];

      (zonePickingService.getAllZoneStats as jest.Mock).mockResolvedValue(mockStats);

      const response = await request(app).get('/api/v1/zones/stats/all').expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toEqual(mockStats);
      expect(zonePickingService.getAllZoneStats).toHaveBeenCalled();
    });

    it('should handle errors when getting all zone stats', async () => {
      (zonePickingService.getAllZoneStats as jest.Mock).mockRejectedValue(
        new Error('Database error')
      );

      const response = await request(app).get('/api/v1/zones/stats/all').expect(500);

      expect(response.body).toHaveProperty('error', 'Failed to get zone stats');
    });
  });

  describe('POST /api/v1/zones/assign', () => {
    beforeEach(() => {
      // Override user role for admin/supervisor tests
      const { authenticate } = require('../../middleware/auth');
      authenticate.mockImplementationOnce((req: any, _res: any, next: any) => {
        req.user = { ...mockUser, role: UserRole.SUPERVISOR };
        next();
      });
    });

    it('should assign picker to zone', async () => {
      const mockAssignment = {
        assignmentId: 'assign-001',
        pickerId: 'picker-001',
        zoneId: 'A',
        assignedAt: new Date(),
      };

      (zonePickingService.assignPickerToZone as jest.Mock).mockResolvedValue(mockAssignment);

      const response = await request(app)
        .post('/api/v1/zones/assign')
        .send({
          pickerId: 'picker-001',
          zoneId: 'A',
        })
        .expect(201);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.message).toContain('assigned');
      expect(zonePickingService.assignPickerToZone).toHaveBeenCalledWith(
        'picker-001',
        'A',
        expect.any(Object)
      );
    });

    it('should return 400 when pickerId is missing', async () => {
      const response = await request(app)
        .post('/api/v1/zones/assign')
        .send({
          zoneId: 'A',
        })
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Missing required fields');
      expect(response.body.message).toContain('pickerId');
    });

    it('should return 400 when zoneId is missing', async () => {
      const response = await request(app)
        .post('/api/v1/zones/assign')
        .send({
          pickerId: 'picker-001',
        })
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Missing required fields');
      expect(response.body.message).toContain('zoneId');
    });

    it('should handle assignment errors', async () => {
      const { authenticate } = require('../../middleware/auth');
      authenticate.mockImplementation((req: any, _res: any, next: any) => {
        req.user = { ...mockUser, role: UserRole.SUPERVISOR };
        next();
      });

      (zonePickingService.assignPickerToZone as jest.Mock).mockRejectedValue(
        new Error('Picker not found')
      );

      const response = await request(app)
        .post('/api/v1/zones/assign')
        .send({
          pickerId: 'invalid-picker',
          zoneId: 'A',
        })
        .expect(500);

      expect(response.body).toHaveProperty('error', 'Zone assignment failed');
    });
  });

  describe('POST /api/v1/zones/release', () => {
    it('should release picker from zone using pickerId from body', async () => {
      (zonePickingService.releasePickerFromZone as jest.Mock).mockResolvedValue(undefined);

      const response = await request(app)
        .post('/api/v1/zones/release')
        .send({
          pickerId: 'picker-001',
        })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.message).toContain('released');
      expect(zonePickingService.releasePickerFromZone).toHaveBeenCalledWith(
        'picker-001',
        expect.any(Object)
      );
    });

    it('should use current user when pickerId not provided', async () => {
      (zonePickingService.releasePickerFromZone as jest.Mock).mockResolvedValue(undefined);

      const response = await request(app).post('/api/v1/zones/release').send({}).expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(zonePickingService.releasePickerFromZone).toHaveBeenCalledWith(
        'user-001', // Current user's ID
        expect.any(Object)
      );
    });

    it('should handle release errors', async () => {
      (zonePickingService.releasePickerFromZone as jest.Mock).mockRejectedValue(
        new Error('Picker not assigned to any zone')
      );

      const response = await request(app)
        .post('/api/v1/zones/release')
        .send({
          pickerId: 'picker-001',
        })
        .expect(500);

      expect(response.body).toHaveProperty('error', 'Zone release failed');
    });
  });

  describe('POST /api/v1/zones/rebalance', () => {
    beforeEach(() => {
      const { authenticate } = require('../../middleware/auth');
      authenticate.mockImplementationOnce((req: any, _res: any, next: any) => {
        req.user = { ...mockUser, role: UserRole.SUPERVISOR };
        next();
      });
    });

    it('should rebalance pickers across zones', async () => {
      (zonePickingService.rebalancePickers as jest.Mock).mockResolvedValue(undefined);

      const response = await request(app).post('/api/v1/zones/rebalance').expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.message).toContain('rebalanced');
      expect(zonePickingService.rebalancePickers).toHaveBeenCalledWith(expect.any(Object));
    });

    it('should handle rebalance errors', async () => {
      const { authenticate } = require('../../middleware/auth');
      authenticate.mockImplementation((req: any, _res: any, next: any) => {
        req.user = { ...mockUser, role: UserRole.SUPERVISOR };
        next();
      });

      (zonePickingService.rebalancePickers as jest.Mock).mockRejectedValue(
        new Error('Rebalancing service unavailable')
      );

      const response = await request(app).post('/api/v1/zones/rebalance').expect(500);

      expect(response.body).toHaveProperty('error', 'Zone rebalancing failed');
    });
  });

  describe('GET /api/v1/zones/:zoneId/tasks', () => {
    it('should return pick tasks for a zone', async () => {
      const mockTasks = [
        { taskId: 'task-001', zoneId: 'A', status: 'PENDING' },
        { taskId: 'task-002', zoneId: 'A', status: 'IN_PROGRESS' },
        { taskId: 'task-003', zoneId: 'A', status: 'PENDING' },
      ];

      (zonePickingService.getZonePickTasks as jest.Mock).mockResolvedValue(mockTasks);

      const response = await request(app).get('/api/v1/zones/A/tasks').expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toEqual(mockTasks);
      expect(zonePickingService.getZonePickTasks).toHaveBeenCalledWith('A', undefined);
    });

    it('should filter tasks by status', async () => {
      const mockTasks = [
        { taskId: 'task-001', zoneId: 'A', status: 'PENDING' },
        { taskId: 'task-003', zoneId: 'A', status: 'PENDING' },
      ];

      (zonePickingService.getZonePickTasks as jest.Mock).mockResolvedValue(mockTasks);

      const response = await request(app).get('/api/v1/zones/A/tasks?status=PENDING').expect(200);

      expect(response.body.data).toEqual(mockTasks);
      expect(zonePickingService.getZonePickTasks).toHaveBeenCalledWith('A', ['PENDING']);
    });

    it('should filter by multiple statuses', async () => {
      const mockTasks = [
        { taskId: 'task-001', zoneId: 'A', status: 'PENDING' },
        { taskId: 'task-002', zoneId: 'A', status: 'IN_PROGRESS' },
      ];

      (zonePickingService.getZonePickTasks as jest.Mock).mockResolvedValue(mockTasks);

      await request(app).get('/api/v1/zones/A/tasks?status=PENDING,IN_PROGRESS').expect(200);

      expect(zonePickingService.getZonePickTasks).toHaveBeenCalledWith('A', [
        'PENDING',
        'IN_PROGRESS',
      ]);
    });

    it('should handle errors when getting zone tasks', async () => {
      (zonePickingService.getZonePickTasks as jest.Mock).mockRejectedValue(
        new Error('Zone not found')
      );

      const response = await request(app).get('/api/v1/zones/UNKNOWN/tasks').expect(500);

      expect(response.body).toHaveProperty('error', 'Failed to get zone tasks');
    });
  });
});
