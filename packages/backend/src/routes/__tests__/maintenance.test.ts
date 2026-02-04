/**
 * Integration tests for maintenance routes
 * @covers src/routes/maintenance.ts
 */

import request from 'supertest';
import { createApp } from '../../app';
import { maintenanceService } from '../../services/MaintenanceService';
import { authenticate, authorize } from '../../middleware';
import { UserRole } from '@opsui/shared';

// Mock the authentication middleware
jest.mock('../../middleware/auth', () => ({
  ...jest.requireActual('../../middleware/auth'),
  authenticate: jest.fn((req: any, res: any, next: any) => {
    req.user = {
      userId: 'user-123',
      email: 'maintenance@example.com',
      role: UserRole.MAINTENANCE,
      baseRole: UserRole.MAINTENANCE,
      activeRole: null,
      effectiveRole: UserRole.MAINTENANCE,
    };
    next();
  }),
  authorize: jest.fn((...allowedRoles: string[]) => (req: any, res: any, next: any) => {
    const user = req.user || { role: UserRole.MAINTENANCE };
    if (allowedRoles.includes(user.role)) {
      next();
    } else {
      res.status(403).json({ error: 'Forbidden' });
    }
  }),
}));

// Mock the MaintenanceService
jest.mock('../../services/MaintenanceService', () => {
  const mockModule = jest.requireActual('../../services/MaintenanceService');
  return {
    ...mockModule,
    maintenanceService: {
      createAsset: jest.fn(),
      getAllAssets: jest.fn(),
      getAssetById: jest.fn(),
      updateAsset: jest.fn(),
      retireAsset: jest.fn(),
      createSchedule: jest.fn(),
      getUpcomingMaintenance: jest.fn(),
      getSchedulesByAsset: jest.fn(),
      createWorkOrder: jest.fn(),
      getAllWorkOrders: jest.fn(),
      getWorkOrderById: jest.fn(),
      startWorkOrder: jest.fn(),
      completeWorkOrder: jest.fn(),
      getAssetServiceHistory: jest.fn(),
      addServiceLog: jest.fn(),
      addMeterReading: jest.fn(),
      getMeterReadingsByAsset: jest.fn(),
    },
  };
});

jest.mock('../../config/logger');
jest.mock('../../db/client');

// Local status constants
const AssetStatus = {
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
  MAINTENANCE: 'MAINTENANCE',
  RETIRED: 'RETIRED',
} as const;

const MaintenanceStatus = {
  PENDING: 'PENDING',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
} as const;

describe('Maintenance Routes', () => {
  let app: any;

  beforeEach(() => {
    app = createApp();
  });

  // ==========================================================================
  // POST /api/v1/maintenance/assets
  // ==========================================================================

  describe('POST /api/v1/maintenance/assets', () => {
    it('should create an asset', async () => {
      const assetData = {
        name: 'Forklift A-01',
        type: 'EQUIPMENT',
        category: 'MATERIAL_HANDLING',
        location: 'Zone A',
        purchaseDate: '2025-01-01',
        purchaseCost: 25000,
      };

      const mockAsset = {
        assetId: 'asset-001',
        name: 'Forklift A-01',
        type: 'EQUIPMENT',
        status: AssetStatus.ACTIVE,
      };

      (maintenanceService.createAsset as jest.MockedFunction<any>).mockResolvedValue(mockAsset);

      const response = await request(app)
        .post('/api/v1/maintenance/assets')
        .set('Authorization', 'Bearer valid-token')
        .send(assetData)
        .expect(201);

      expect(response.body).toMatchObject({
        assetId: 'asset-001',
        name: 'Forklift A-01',
        status: AssetStatus.ACTIVE,
      });
    });
  });

  // ==========================================================================
  // GET /api/v1/maintenance/assets
  // ==========================================================================

  describe('GET /api/v1/maintenance/assets', () => {
    it('should get all assets', async () => {
      const mockResult = {
        assets: [
          {
            assetId: 'asset-001',
            name: 'Forklift A-01',
            type: 'EQUIPMENT',
            status: AssetStatus.ACTIVE,
          },
          {
            assetId: 'asset-002',
            name: 'Conveyor Belt B-01',
            type: 'EQUIPMENT',
            status: AssetStatus.ACTIVE,
          },
        ],
        total: 2,
      };

      (maintenanceService.getAllAssets as jest.MockedFunction<any>).mockResolvedValue(mockResult);

      const response = await request(app)
        .get('/api/v1/maintenance/assets')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(response.body).toEqual(mockResult);
    });

    it('should filter by status', async () => {
      (maintenanceService.getAllAssets as jest.MockedFunction<any>).mockResolvedValue({
        assets: [],
        total: 0,
      });

      await request(app)
        .get('/api/v1/maintenance/assets?status=ACTIVE')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(maintenanceService.getAllAssets).toHaveBeenCalledWith(
        expect.objectContaining({ status: AssetStatus.ACTIVE })
      );
    });

    it('should filter by type', async () => {
      (maintenanceService.getAllAssets as jest.MockedFunction<any>).mockResolvedValue({
        assets: [],
        total: 0,
      });

      await request(app)
        .get('/api/v1/maintenance/assets?type=EQUIPMENT')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(maintenanceService.getAllAssets).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'EQUIPMENT' })
      );
    });

    it('should support pagination', async () => {
      (maintenanceService.getAllAssets as jest.MockedFunction<any>).mockResolvedValue({
        assets: [],
        total: 0,
      });

      await request(app)
        .get('/api/v1/maintenance/assets?limit=25&offset=50')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(maintenanceService.getAllAssets).toHaveBeenCalledWith(
        expect.objectContaining({ limit: 25, offset: 50 })
      );
    });
  });

  // ==========================================================================
  // GET /api/v1/maintenance/assets/:assetId
  // ==========================================================================

  describe('GET /api/v1/maintenance/assets/:assetId', () => {
    it('should get an asset by ID', async () => {
      const mockAsset = {
        assetId: 'asset-001',
        name: 'Forklift A-01',
        type: 'EQUIPMENT',
        status: AssetStatus.ACTIVE,
        location: 'Zone A',
      };

      (maintenanceService.getAssetById as jest.MockedFunction<any>).mockResolvedValue(mockAsset);

      const response = await request(app)
        .get('/api/v1/maintenance/assets/asset-001')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(response.body).toEqual(mockAsset);
    });
  });

  // ==========================================================================
  // PUT /api/v1/maintenance/assets/:assetId
  // ==========================================================================

  describe('PUT /api/v1/maintenance/assets/:assetId', () => {
    it('should update an asset', async () => {
      const updateData = {
        name: 'Forklift A-01 Updated',
        location: 'Zone B',
      };

      const mockAsset = {
        assetId: 'asset-001',
        name: 'Forklift A-01 Updated',
        type: 'EQUIPMENT',
        status: AssetStatus.ACTIVE,
        location: 'Zone B',
      };

      (maintenanceService.updateAsset as jest.MockedFunction<any>).mockResolvedValue(mockAsset);

      const response = await request(app)
        .put('/api/v1/maintenance/assets/asset-001')
        .set('Authorization', 'Bearer valid-token')
        .send(updateData)
        .expect(200);

      expect(response.body).toMatchObject({
        assetId: 'asset-001',
        name: 'Forklift A-01 Updated',
        location: 'Zone B',
      });
    });
  });

  // ==========================================================================
  // POST /api/v1/maintenance/assets/:assetId/retire
  // ==========================================================================

  describe('POST /api/v1/maintenance/assets/:assetId/retire', () => {
    it('should return 403 for MAINTENANCE role (requires ADMIN or SUPERVISOR)', async () => {
      const response = await request(app)
        .post('/api/v1/maintenance/assets/asset-001/retire')
        .set('Authorization', 'Bearer valid-token')
        .expect(403);
    });
  });

  // ==========================================================================
  // POST /api/v1/maintenance/schedules
  // ==========================================================================

  describe('POST /api/v1/maintenance/schedules', () => {
    it('should create a maintenance schedule', async () => {
      const scheduleData = {
        assetId: 'asset-001',
        type: 'PREVENTIVE',
        frequency: 'MONTHLY',
        nextDueDate: '2026-02-15',
        title: 'Monthly Inspection',
      };

      const mockSchedule = {
        scheduleId: 'schedule-001',
        assetId: 'asset-001',
        type: 'PREVENTIVE',
        frequency: 'MONTHLY',
      };

      (maintenanceService.createSchedule as jest.MockedFunction<any>).mockResolvedValue(
        mockSchedule
      );

      const response = await request(app)
        .post('/api/v1/maintenance/schedules')
        .set('Authorization', 'Bearer valid-token')
        .send(scheduleData)
        .expect(201);

      expect(response.body).toMatchObject({
        scheduleId: 'schedule-001',
        type: 'PREVENTIVE',
        frequency: 'MONTHLY',
      });
    });
  });

  // ==========================================================================
  // GET /api/v1/maintenance/schedules
  // ==========================================================================

  describe('GET /api/v1/maintenance/schedules', () => {
    it('should get upcoming maintenance', async () => {
      const mockSchedules = [
        {
          scheduleId: 'schedule-001',
          assetId: 'asset-001',
          dueDate: '2026-02-10',
        },
        {
          scheduleId: 'schedule-002',
          assetId: 'asset-002',
          dueDate: '2026-02-12',
        },
      ];

      (maintenanceService.getUpcomingMaintenance as jest.MockedFunction<any>).mockResolvedValue(
        mockSchedules
      );

      const response = await request(app)
        .get('/api/v1/maintenance/schedules')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(response.body).toMatchObject({
        schedules: mockSchedules,
        count: 2,
      });
    });
  });

  // ==========================================================================
  // GET /api/v1/maintenance/assets/:assetId/schedules
  // ==========================================================================

  describe('GET /api/v1/maintenance/assets/:assetId/schedules', () => {
    it('should get asset schedules', async () => {
      const mockSchedules = [
        {
          scheduleId: 'schedule-001',
          assetId: 'asset-001',
          type: 'PREVENTIVE',
        },
        {
          scheduleId: 'schedule-002',
          assetId: 'asset-001',
          type: 'CORRECTIVE',
        },
      ];

      (maintenanceService.getSchedulesByAsset as jest.MockedFunction<any>).mockResolvedValue(
        mockSchedules
      );

      const response = await request(app)
        .get('/api/v1/maintenance/assets/asset-001/schedules')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(response.body).toMatchObject({
        schedules: mockSchedules,
        count: 2,
      });
    });
  });

  // ==========================================================================
  // GET /api/v1/maintenance/schedules/due
  // ==========================================================================

  describe('GET /api/v1/maintenance/schedules/due', () => {
    it('should get due schedules (default 7 days)', async () => {
      const mockSchedules = [
        {
          scheduleId: 'schedule-001',
          assetId: 'asset-001',
          dueDate: '2026-02-08',
        },
      ];

      (maintenanceService.getUpcomingMaintenance as jest.MockedFunction<any>).mockResolvedValue(
        mockSchedules
      );

      const response = await request(app)
        .get('/api/v1/maintenance/schedules/due')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(maintenanceService.getUpcomingMaintenance).toHaveBeenCalledWith(7);
    });

    it('should get due schedules with custom days', async () => {
      (maintenanceService.getUpcomingMaintenance as jest.MockedFunction<any>).mockResolvedValue([]);

      await request(app)
        .get('/api/v1/maintenance/schedules/due?days=30')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(maintenanceService.getUpcomingMaintenance).toHaveBeenCalledWith(30);
    });
  });

  // ==========================================================================
  // POST /api/v1/maintenance/work-orders
  // ==========================================================================

  describe('POST /api/v1/maintenance/work-orders', () => {
    it('should create a work order', async () => {
      const workOrderData = {
        assetId: 'asset-001',
        type: 'PREVENTIVE',
        priority: 'NORMAL',
        title: 'Monthly maintenance',
        description: 'Check all fluid levels',
      };

      const mockWorkOrder = {
        workOrderId: 'workorder-001',
        assetId: 'asset-001',
        type: 'PREVENTIVE',
        priority: 'NORMAL',
        status: MaintenanceStatus.PENDING,
      };

      (maintenanceService.createWorkOrder as jest.MockedFunction<any>).mockResolvedValue(
        mockWorkOrder
      );

      const response = await request(app)
        .post('/api/v1/maintenance/work-orders')
        .set('Authorization', 'Bearer valid-token')
        .send(workOrderData)
        .expect(201);

      expect(response.body).toMatchObject({
        workOrderId: 'workorder-001',
        status: MaintenanceStatus.PENDING,
      });
    });
  });

  // ==========================================================================
  // GET /api/v1/maintenance/work-orders
  // ==========================================================================

  describe('GET /api/v1/maintenance/work-orders', () => {
    it('should get all work orders', async () => {
      const mockResult = {
        workOrders: [
          {
            workOrderId: 'workorder-001',
            assetId: 'asset-001',
            status: MaintenanceStatus.PENDING,
            priority: 'HIGH',
          },
          {
            workOrderId: 'workorder-002',
            assetId: 'asset-002',
            status: MaintenanceStatus.IN_PROGRESS,
            priority: 'NORMAL',
          },
        ],
        total: 2,
      };

      (maintenanceService.getAllWorkOrders as jest.MockedFunction<any>).mockResolvedValue(
        mockResult
      );

      const response = await request(app)
        .get('/api/v1/maintenance/work-orders')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(response.body).toEqual(mockResult);
    });

    it('should filter by status', async () => {
      (maintenanceService.getAllWorkOrders as jest.MockedFunction<any>).mockResolvedValue({
        workOrders: [],
        total: 0,
      });

      await request(app)
        .get('/api/v1/maintenance/work-orders?status=PENDING')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(maintenanceService.getAllWorkOrders).toHaveBeenCalledWith(
        expect.objectContaining({ status: MaintenanceStatus.PENDING })
      );
    });

    it('should support pagination', async () => {
      (maintenanceService.getAllWorkOrders as jest.MockedFunction<any>).mockResolvedValue({
        workOrders: [],
        total: 0,
      });

      await request(app)
        .get('/api/v1/maintenance/work-orders?limit=25&offset=50')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(maintenanceService.getAllWorkOrders).toHaveBeenCalledWith(
        expect.objectContaining({ limit: 25, offset: 50 })
      );
    });
  });

  // ==========================================================================
  // GET /api/v1/maintenance/work-orders/:workOrderId
  // ==========================================================================

  describe('GET /api/v1/maintenance/work-orders/:workOrderId', () => {
    it('should get a work order by ID', async () => {
      const mockWorkOrder = {
        workOrderId: 'workorder-001',
        assetId: 'asset-001',
        type: 'PREVENTIVE',
        status: MaintenanceStatus.PENDING,
        title: 'Monthly maintenance',
      };

      (maintenanceService.getWorkOrderById as jest.MockedFunction<any>).mockResolvedValue(
        mockWorkOrder
      );

      const response = await request(app)
        .get('/api/v1/maintenance/work-orders/workorder-001')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(response.body).toEqual(mockWorkOrder);
    });
  });

  // ==========================================================================
  // POST /api/v1/maintenance/work-orders/:workOrderId/start
  // ==========================================================================

  describe('POST /api/v1/maintenance/work-orders/:workOrderId/start', () => {
    it('should start a work order', async () => {
      const mockWorkOrder = {
        workOrderId: 'workorder-001',
        status: MaintenanceStatus.IN_PROGRESS,
        startedAt: new Date(),
      };

      (maintenanceService.startWorkOrder as jest.MockedFunction<any>).mockResolvedValue(
        mockWorkOrder
      );

      const response = await request(app)
        .post('/api/v1/maintenance/work-orders/workorder-001/start')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(response.body).toMatchObject({
        workOrderId: 'workorder-001',
        status: MaintenanceStatus.IN_PROGRESS,
        startedAt: expect.any(String),
      });
    });
  });

  // ==========================================================================
  // POST /api/v1/maintenance/work-orders/:workOrderId/complete
  // ==========================================================================

  describe('POST /api/v1/maintenance/work-orders/:workOrderId/complete', () => {
    it('should complete a work order', async () => {
      const completeData = {
        notes: 'All tasks completed successfully',
        partsUsed: [],
      };

      const mockWorkOrder = {
        workOrderId: 'workorder-001',
        status: MaintenanceStatus.COMPLETED,
        completedAt: new Date(),
      };

      (maintenanceService.completeWorkOrder as jest.MockedFunction<any>).mockResolvedValue(
        mockWorkOrder
      );

      const response = await request(app)
        .post('/api/v1/maintenance/work-orders/workorder-001/complete')
        .set('Authorization', 'Bearer valid-token')
        .send(completeData)
        .expect(200);

      expect(response.body).toMatchObject({
        workOrderId: 'workorder-001',
        status: MaintenanceStatus.COMPLETED,
        completedAt: expect.any(String),
      });
    });
  });

  // ==========================================================================
  // GET /api/v1/maintenance/assets/:assetId/service-history
  // ==========================================================================

  describe('GET /api/v1/maintenance/assets/:assetId/service-history', () => {
    it('should get asset service history', async () => {
      const mockServiceLogs = [
        {
          logId: 'log-001',
          assetId: 'asset-001',
          type: 'INSPECTION',
          performedBy: 'user-123',
          notes: 'Routine inspection',
        },
        {
          logId: 'log-002',
          assetId: 'asset-001',
          type: 'REPAIR',
          performedBy: 'user-456',
          notes: 'Fixed hydraulic leak',
        },
      ];

      (maintenanceService.getAssetServiceHistory as jest.MockedFunction<any>).mockResolvedValue(
        mockServiceLogs
      );

      const response = await request(app)
        .get('/api/v1/maintenance/assets/asset-001/service-history')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(response.body).toMatchObject({
        serviceLogs: mockServiceLogs,
        count: 2,
      });
    });

    it('should support limit parameter', async () => {
      (maintenanceService.getAssetServiceHistory as jest.MockedFunction<any>).mockResolvedValue([]);

      await request(app)
        .get('/api/v1/maintenance/assets/asset-001/service-history?limit=10')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(maintenanceService.getAssetServiceHistory).toHaveBeenCalledWith('asset-001', 10);
    });
  });

  // ==========================================================================
  // POST /api/v1/maintenance/service-logs
  // ==========================================================================

  describe('POST /api/v1/maintenance/service-logs', () => {
    it('should add a service log', async () => {
      const logData = {
        assetId: 'asset-001',
        type: 'REPAIR',
        notes: 'Replaced worn belt',
      };

      const mockLog = {
        logId: 'log-001',
        assetId: 'asset-001',
        type: 'REPAIR',
        notes: 'Replaced worn belt',
      };

      (maintenanceService.addServiceLog as jest.MockedFunction<any>).mockResolvedValue(mockLog);

      const response = await request(app)
        .post('/api/v1/maintenance/service-logs')
        .set('Authorization', 'Bearer valid-token')
        .send(logData)
        .expect(201);

      expect(response.body).toMatchObject({
        logId: 'log-001',
        type: 'REPAIR',
      });
    });
  });

  // ==========================================================================
  // POST /api/v1/maintenance/meter-readings
  // ==========================================================================

  describe('POST /api/v1/maintenance/meter-readings', () => {
    it('should add a meter reading', async () => {
      const readingData = {
        assetId: 'asset-001',
        meterType: 'HOURS',
        value: 1250.5,
        unit: 'HOURS',
      };

      const mockReading = {
        readingId: 'reading-001',
        assetId: 'asset-001',
        meterType: 'HOURS',
        value: 1250.5,
      };

      (maintenanceService.addMeterReading as jest.MockedFunction<any>).mockResolvedValue(
        mockReading
      );

      const response = await request(app)
        .post('/api/v1/maintenance/meter-readings')
        .set('Authorization', 'Bearer valid-token')
        .send(readingData)
        .expect(201);

      expect(response.body).toMatchObject({
        readingId: 'reading-001',
        meterType: 'HOURS',
        value: 1250.5,
      });
    });
  });

  // ==========================================================================
  // GET /api/v1/maintenance/assets/:assetId/meter-readings
  // ==========================================================================

  describe('GET /api/v1/maintenance/assets/:assetId/meter-readings', () => {
    it('should get meter readings for an asset', async () => {
      const mockReadings = [
        {
          readingId: 'reading-001',
          assetId: 'asset-001',
          meterType: 'HOURS',
          value: 1200,
        },
        {
          readingId: 'reading-002',
          assetId: 'asset-001',
          meterType: 'HOURS',
          value: 1250,
        },
      ];

      (maintenanceService.getMeterReadingsByAsset as jest.MockedFunction<any>).mockResolvedValue(
        mockReadings
      );

      const response = await request(app)
        .get('/api/v1/maintenance/assets/asset-001/meter-readings')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(response.body).toMatchObject({
        readings: mockReadings,
        count: 2,
      });
    });

    it('should support limit parameter', async () => {
      (maintenanceService.getMeterReadingsByAsset as jest.MockedFunction<any>).mockResolvedValue(
        []
      );

      await request(app)
        .get('/api/v1/maintenance/assets/asset-001/meter-readings?limit=10')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(maintenanceService.getMeterReadingsByAsset).toHaveBeenCalledWith('asset-001', 10);
    });
  });
});
