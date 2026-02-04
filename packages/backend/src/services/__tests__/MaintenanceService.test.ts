/**
 * Unit tests for MaintenanceService
 * @covers src/services/MaintenanceService.ts
 */

import { MaintenanceService, maintenanceService } from '../MaintenanceService';
import {
  Asset,
  MaintenanceSchedule,
  MaintenanceWorkOrder,
  ServiceLog,
  MeterReading,
  CreateAssetDTO,
  CreateMaintenanceScheduleDTO,
  CreateWorkOrderDTO,
  CompleteWorkOrderDTO,
  AddMeterReadingDTO,
  AssetStatus,
  AssetType,
  MaintenanceStatus,
  MaintenancePriority,
  MaintenanceType,
  NotFoundError,
} from '@opsui/shared';

// Mock the maintenance repository
jest.mock('../../repositories/MaintenanceRepository', () => ({
  maintenanceRepository: {
    createAsset: jest.fn(),
    findAssetById: jest.fn(),
    findAllAssets: jest.fn(),
    updateAsset: jest.fn(),
    createSchedule: jest.fn(),
    findSchedulesByAsset: jest.fn(),
    findDueSchedules: jest.fn(),
    createWorkOrder: jest.fn(),
    findWorkOrderById: jest.fn(),
    findAllWorkOrders: jest.fn(),
    updateWorkOrder: jest.fn(),
    completeWorkOrder: jest.fn(),
    findServiceLogsByAsset: jest.fn(),
    createServiceLog: jest.fn(),
    addMeterReading: jest.fn(),
    findMeterReadingsByAsset: jest.fn(),
  },
}));

import { maintenanceRepository } from '../../repositories/MaintenanceRepository';

describe('MaintenanceService', () => {
  let service: MaintenanceService;

  const mockAsset: Asset = {
    assetId: 'ASSET-001',
    assetNumber: 'AST-00001',
    name: 'Forklift 001',
    description: 'Electric forklift for zone A',
    type: AssetType.VEHICLE,
    status: AssetStatus.OPERATIONAL,
    serialNumber: 'FL-2024-001',
    manufacturer: 'Toyota',
    model: '8FBU15',
    year: 2024,
    purchaseDate: new Date('2024-01-01'),
    purchasePrice: 25000,
    location: 'A-01-01',
    assignedTo: 'user-001',
    warrantyExpiry: new Date('2026-01-01'),
    expectedLifespanYears: 10,
    lastMaintenanceDate: new Date('2024-01-15'),
    nextMaintenanceDate: new Date('2024-02-15'),
    notes: 'Regular maintenance required',
    createdAt: new Date('2024-01-01'),
    createdBy: 'admin-001',
    updatedAt: new Date('2024-01-01'),
    updatedBy: 'admin-001',
  };

  const mockSchedule: MaintenanceSchedule = {
    scheduleId: 'SCHED-001',
    assetId: 'ASSET-001',
    name: 'Monthly Forklift Inspection',
    description: 'Regular monthly inspection',
    maintenanceType: MaintenanceType.PREVENTIVE,
    priority: MaintenancePriority.MEDIUM,
    frequency: 'MONTHLY',
    intervalDays: 30,
    estimatedDurationHours: 2,
    assignedTo: 'tech-001',
    isActive: true,
    createdAt: new Date('2024-01-01'),
    createdBy: 'admin-001',
    updatedAt: new Date('2024-01-01'),
    updatedBy: 'admin-001',
    lastPerformedDate: new Date('2024-01-15'),
    nextDueDate: new Date('2024-02-15'),
  };

  const mockWorkOrder: MaintenanceWorkOrder = {
    workOrderId: 'WO-001',
    workOrderNumber: 'WO-00001',
    assetId: 'ASSET-001',
    scheduleId: 'SCHED-001',
    title: 'Replace Forklift Battery',
    description: 'Battery needs replacement',
    maintenanceType: MaintenanceType.CORRECTIVE,
    priority: MaintenancePriority.HIGH,
    status: MaintenanceStatus.SCHEDULED,
    scheduledDate: new Date('2024-02-01'),
    scheduledStartTime: '09:00',
    estimatedDurationHours: 4,
    assignedTo: 'tech-001',
    createdAt: new Date('2024-01-20'),
    createdBy: 'admin-001',
    updatedAt: new Date('2024-01-20'),
    updatedBy: 'admin-001',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    service = new MaintenanceService();
  });

  // ==========================================================================
  // ASSETS
  // ==========================================================================

  describe('createAsset', () => {
    it('should create an asset with valid data', async () => {
      const dto: CreateAssetDTO = {
        name: 'Forklift 002',
        type: AssetType.VEHICLE,
        serialNumber: 'FL-2024-002',
        manufacturer: 'Toyota',
        model: '8FBU15',
        year: 2024,
      };

      (maintenanceRepository.createAsset as jest.Mock).mockResolvedValue(mockAsset);

      const result = await service.createAsset(dto, 'admin-001');

      expect(result.name).toBe('Forklift 001');
      expect(maintenanceRepository.createAsset).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Forklift 002',
          type: AssetType.VEHICLE,
          status: AssetStatus.OPERATIONAL,
          createdBy: 'admin-001',
        })
      );
    });

    it('should throw error when asset name is empty', async () => {
      const dto: CreateAssetDTO = {
        name: '  ',
        type: AssetType.EQUIPMENT,
      };

      await expect(service.createAsset(dto, 'admin-001')).rejects.toThrow('Asset name is required');
    });

    it('should throw error when asset type is missing', async () => {
      const dto: CreateAssetDTO = {
        name: 'Some Asset',
        type: undefined as any,
      };

      await expect(service.createAsset(dto, 'admin-001')).rejects.toThrow('Asset type is required');
    });

    it('should handle purchaseDate and warrantyExpiry dates', async () => {
      const dto: CreateAssetDTO = {
        name: 'New Asset',
        type: AssetType.MACHINERY,
        purchaseDate: '2024-01-01',
        warrantyExpiry: '2026-01-01',
      };

      (maintenanceRepository.createAsset as jest.Mock).mockResolvedValue(mockAsset);

      await service.createAsset(dto, 'admin-001');

      const callArgs = (maintenanceRepository.createAsset as jest.Mock).mock.calls[0][0];
      expect(callArgs.purchaseDate).toBeInstanceOf(Date);
      expect(callArgs.warrantyExpiry).toBeInstanceOf(Date);
    });
  });

  describe('getAssetById', () => {
    it('should return asset by ID', async () => {
      (maintenanceRepository.findAssetById as jest.Mock).mockResolvedValue(mockAsset);

      const result = await service.getAssetById('ASSET-001');

      expect(result.assetId).toBe('ASSET-001');
      expect(maintenanceRepository.findAssetById).toHaveBeenCalledWith('ASSET-001');
    });

    it('should throw NotFoundError when asset not found', async () => {
      (maintenanceRepository.findAssetById as jest.Mock).mockResolvedValue(null);

      await expect(service.getAssetById('NOT-FOUND')).rejects.toThrow(NotFoundError);
    });
  });

  describe('getAllAssets', () => {
    it('should return all assets without filters', async () => {
      (maintenanceRepository.findAllAssets as jest.Mock).mockResolvedValue({
        assets: [mockAsset],
        total: 1,
      });

      const result = await service.getAllAssets();

      expect(result.assets).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it('should apply status filter', async () => {
      (maintenanceRepository.findAllAssets as jest.Mock).mockResolvedValue({
        assets: [mockAsset],
        total: 1,
      });

      await service.getAllAssets({ status: AssetStatus.OPERATIONAL });

      expect(maintenanceRepository.findAllAssets).toHaveBeenCalledWith({
        status: AssetStatus.OPERATIONAL,
      });
    });

    it('should apply type filter', async () => {
      (maintenanceRepository.findAllAssets as jest.Mock).mockResolvedValue({
        assets: [mockAsset],
        total: 1,
      });

      await service.getAllAssets({ type: AssetType.VEHICLE });

      expect(maintenanceRepository.findAllAssets).toHaveBeenCalledWith({
        type: AssetType.VEHICLE,
      });
    });

    it('should apply pagination', async () => {
      (maintenanceRepository.findAllAssets as jest.Mock).mockResolvedValue({
        assets: [mockAsset],
        total: 1,
      });

      await service.getAllAssets({ limit: 10, offset: 20 });

      expect(maintenanceRepository.findAllAssets).toHaveBeenCalledWith({
        limit: 10,
        offset: 20,
      });
    });
  });

  describe('updateAsset', () => {
    it('should update asset', async () => {
      (maintenanceRepository.findAssetById as jest.Mock).mockResolvedValue(mockAsset);
      (maintenanceRepository.updateAsset as jest.Mock).mockResolvedValue({
        ...mockAsset,
        name: 'Updated Name',
      });

      const result = await service.updateAsset('ASSET-001', { name: 'Updated Name' }, 'user-001');

      expect(maintenanceRepository.updateAsset).toHaveBeenCalledWith('ASSET-001', {
        name: 'Updated Name',
        updatedBy: 'user-001',
      });
    });

    it('should throw NotFoundError when updating non-existent asset', async () => {
      (maintenanceRepository.findAssetById as jest.Mock).mockResolvedValue(null);

      await expect(service.updateAsset('NOT-FOUND', {}, 'user-001')).rejects.toThrow(NotFoundError);
    });
  });

  describe('retireAsset', () => {
    it('should retire an operational asset', async () => {
      (maintenanceRepository.findAssetById as jest.Mock).mockResolvedValue(mockAsset);
      (maintenanceRepository.updateAsset as jest.Mock).mockResolvedValue({
        ...mockAsset,
        status: AssetStatus.RETIRED,
      });

      const result = await service.retireAsset('ASSET-001', 'admin-001');

      expect(result.status).toBe(AssetStatus.RETIRED);
      expect(maintenanceRepository.updateAsset).toHaveBeenCalledWith('ASSET-001', {
        status: AssetStatus.RETIRED,
        updatedBy: 'admin-001',
      });
    });

    it('should throw error when asset already retired', async () => {
      const retiredAsset = { ...mockAsset, status: AssetStatus.RETIRED };
      (maintenanceRepository.findAssetById as jest.Mock).mockResolvedValue(retiredAsset);

      await expect(service.retireAsset('ASSET-001', 'admin-001')).rejects.toThrow(
        'Asset already retired'
      );
    });
  });

  // ==========================================================================
  // MAINTENANCE SCHEDULES
  // ==========================================================================

  describe('createSchedule', () => {
    it('should create a maintenance schedule', async () => {
      const dto: CreateMaintenanceScheduleDTO = {
        assetId: 'ASSET-001',
        name: 'Monthly Inspection',
        maintenanceType: MaintenanceType.PREVENTIVE,
        priority: MaintenancePriority.MEDIUM,
        frequency: 'MONTHLY',
        estimatedDurationHours: 2,
        nextDueDate: '2024-02-01',
      };

      (maintenanceRepository.findAssetById as jest.Mock).mockResolvedValue(mockAsset);
      (maintenanceRepository.createSchedule as jest.Mock).mockResolvedValue({
        ...mockSchedule,
        name: 'Monthly Inspection',
      });

      const result = await service.createSchedule(dto, 'admin-001');

      expect(result.name).toBe('Monthly Inspection');
      expect(maintenanceRepository.createSchedule).toHaveBeenCalled();
    });

    it('should throw error when schedule name is empty', async () => {
      const dto: CreateMaintenanceScheduleDTO = {
        assetId: 'ASSET-001',
        name: '  ',
        maintenanceType: MaintenanceType.PREVENTIVE,
        priority: MaintenancePriority.MEDIUM,
        frequency: 'MONTHLY',
        estimatedDurationHours: 2,
        nextDueDate: '2024-02-01',
      };

      await expect(service.createSchedule(dto, 'admin-001')).rejects.toThrow(
        'Schedule name is required'
      );
    });

    it('should throw error when asset ID is empty', async () => {
      const dto: CreateMaintenanceScheduleDTO = {
        assetId: '  ',
        name: 'Schedule',
        maintenanceType: MaintenanceType.PREVENTIVE,
        priority: MaintenancePriority.MEDIUM,
        frequency: 'MONTHLY',
        estimatedDurationHours: 2,
        nextDueDate: '2024-02-01',
      };

      await expect(service.createSchedule(dto, 'admin-001')).rejects.toThrow(
        'Asset ID is required'
      );
    });

    it('should throw error when nextDueDate is missing', async () => {
      const dto: CreateMaintenanceScheduleDTO = {
        assetId: 'ASSET-001',
        name: 'Schedule',
        maintenanceType: MaintenanceType.PREVENTIVE,
        priority: MaintenancePriority.MEDIUM,
        frequency: 'MONTHLY',
        estimatedDurationHours: 2,
        nextDueDate: undefined as any,
      };

      await expect(service.createSchedule(dto, 'admin-001')).rejects.toThrow(
        'Next due date is required'
      );
    });

    it('should throw error when estimated duration is invalid', async () => {
      const dto: CreateMaintenanceScheduleDTO = {
        assetId: 'ASSET-001',
        name: 'Schedule',
        maintenanceType: MaintenanceType.PREVENTIVE,
        priority: MaintenancePriority.MEDIUM,
        frequency: 'MONTHLY',
        estimatedDurationHours: 0,
        nextDueDate: '2024-02-01',
      };

      await expect(service.createSchedule(dto, 'admin-001')).rejects.toThrow(
        'Estimated duration must be greater than 0'
      );
    });

    it('should throw NotFoundError when asset does not exist', async () => {
      const dto: CreateMaintenanceScheduleDTO = {
        assetId: 'NOT-FOUND',
        name: 'Schedule',
        maintenanceType: MaintenanceType.PREVENTIVE,
        priority: MaintenancePriority.MEDIUM,
        frequency: 'MONTHLY',
        estimatedDurationHours: 2,
        nextDueDate: '2024-02-01',
      };

      (maintenanceRepository.findAssetById as jest.Mock).mockResolvedValue(null);

      await expect(service.createSchedule(dto, 'admin-001')).rejects.toThrow(NotFoundError);
    });
  });

  describe('getSchedulesByAsset', () => {
    it('should return schedules for asset', async () => {
      (maintenanceRepository.findAssetById as jest.Mock).mockResolvedValue(mockAsset);
      (maintenanceRepository.findSchedulesByAsset as jest.Mock).mockResolvedValue([mockSchedule]);

      const result = await service.getSchedulesByAsset('ASSET-001');

      expect(result).toHaveLength(1);
      expect(maintenanceRepository.findSchedulesByAsset).toHaveBeenCalledWith('ASSET-001');
    });
  });

  describe('getUpcomingMaintenance', () => {
    it('should return schedules due within default 7 days', async () => {
      (maintenanceRepository.findDueSchedules as jest.Mock).mockResolvedValue([mockSchedule]);

      const result = await service.getUpcomingMaintenance();

      expect(result).toHaveLength(1);
      expect(maintenanceRepository.findDueSchedules).toHaveBeenCalledWith(7);
    });

    it('should return schedules due within custom days', async () => {
      (maintenanceRepository.findDueSchedules as jest.Mock).mockResolvedValue([mockSchedule]);

      await service.getUpcomingMaintenance(14);

      expect(maintenanceRepository.findDueSchedules).toHaveBeenCalledWith(14);
    });
  });

  // ==========================================================================
  // WORK ORDERS
  // ==========================================================================

  describe('createWorkOrder', () => {
    it('should create a work order', async () => {
      const dto: CreateWorkOrderDTO = {
        assetId: 'ASSET-001',
        title: 'Emergency Repair',
        maintenanceType: MaintenanceType.EMERGENCY,
        priority: MaintenancePriority.EMERGENCY,
        scheduledDate: '2024-02-01',
        estimatedDurationHours: 4,
      };

      (maintenanceRepository.findAssetById as jest.Mock).mockResolvedValue(mockAsset);
      (maintenanceRepository.createWorkOrder as jest.Mock).mockResolvedValue(mockWorkOrder);

      const result = await service.createWorkOrder(dto, 'admin-001');

      expect(result.title).toBe('Replace Forklift Battery');
      expect(maintenanceRepository.createWorkOrder).toHaveBeenCalled();
    });

    it('should throw error when asset ID is empty', async () => {
      const dto: CreateWorkOrderDTO = {
        assetId: '  ',
        title: 'Repair',
        maintenanceType: MaintenanceType.CORRECTIVE,
        priority: MaintenancePriority.MEDIUM,
        scheduledDate: '2024-02-01',
        estimatedDurationHours: 2,
      };

      await expect(service.createWorkOrder(dto, 'admin-001')).rejects.toThrow(
        'Asset ID is required'
      );
    });

    it('should throw error when title is empty', async () => {
      const dto: CreateWorkOrderDTO = {
        assetId: 'ASSET-001',
        title: '  ',
        maintenanceType: MaintenanceType.CORRECTIVE,
        priority: MaintenancePriority.MEDIUM,
        scheduledDate: '2024-02-01',
        estimatedDurationHours: 2,
      };

      await expect(service.createWorkOrder(dto, 'admin-001')).rejects.toThrow(
        'Work order title is required'
      );
    });

    it('should throw error when scheduledDate is missing', async () => {
      const dto: CreateWorkOrderDTO = {
        assetId: 'ASSET-001',
        title: 'Repair',
        maintenanceType: MaintenanceType.CORRECTIVE,
        priority: MaintenancePriority.MEDIUM,
        scheduledDate: undefined as any,
        estimatedDurationHours: 2,
      };

      await expect(service.createWorkOrder(dto, 'admin-001')).rejects.toThrow(
        'Scheduled date is required'
      );
    });

    it('should throw error when estimated duration is invalid', async () => {
      const dto: CreateWorkOrderDTO = {
        assetId: 'ASSET-001',
        title: 'Repair',
        maintenanceType: MaintenanceType.CORRECTIVE,
        priority: MaintenancePriority.MEDIUM,
        scheduledDate: '2024-02-01',
        estimatedDurationHours: -1,
      };

      await expect(service.createWorkOrder(dto, 'admin-001')).rejects.toThrow(
        'Estimated duration must be greater than 0'
      );
    });

    it('should update asset status for non-preventive maintenance', async () => {
      const dto: CreateWorkOrderDTO = {
        assetId: 'ASSET-001',
        title: 'Emergency Repair',
        maintenanceType: MaintenanceType.EMERGENCY,
        priority: MaintenancePriority.EMERGENCY,
        scheduledDate: '2024-02-01',
        estimatedDurationHours: 4,
      };

      (maintenanceRepository.findAssetById as jest.Mock).mockResolvedValue(mockAsset);
      (maintenanceRepository.createWorkOrder as jest.Mock).mockResolvedValue(mockWorkOrder);

      await service.createWorkOrder(dto, 'admin-001');

      expect(maintenanceRepository.updateAsset).toHaveBeenCalledWith('ASSET-001', {
        status: AssetStatus.IN_MAINTENANCE,
        updatedBy: 'admin-001',
      });
    });

    it('should not update asset status for preventive maintenance', async () => {
      const dto: CreateWorkOrderDTO = {
        assetId: 'ASSET-001',
        title: 'Preventive Maintenance',
        maintenanceType: MaintenanceType.PREVENTIVE,
        priority: MaintenancePriority.MEDIUM,
        scheduledDate: '2024-02-01',
        estimatedDurationHours: 2,
      };

      (maintenanceRepository.findAssetById as jest.Mock).mockResolvedValue(mockAsset);
      (maintenanceRepository.createWorkOrder as jest.Mock).mockResolvedValue(mockWorkOrder);

      await service.createWorkOrder(dto, 'admin-001');

      expect(maintenanceRepository.updateAsset).not.toHaveBeenCalled();
    });
  });

  describe('getWorkOrderById', () => {
    it('should return work order by ID', async () => {
      (maintenanceRepository.findWorkOrderById as jest.Mock).mockResolvedValue(mockWorkOrder);

      const result = await service.getWorkOrderById('WO-001');

      expect(result.workOrderId).toBe('WO-001');
    });

    it('should throw NotFoundError when work order not found', async () => {
      (maintenanceRepository.findWorkOrderById as jest.Mock).mockResolvedValue(null);

      await expect(service.getWorkOrderById('NOT-FOUND')).rejects.toThrow(NotFoundError);
    });
  });

  describe('getAllWorkOrders', () => {
    it('should return all work orders', async () => {
      (maintenanceRepository.findAllWorkOrders as jest.Mock).mockResolvedValue({
        workOrders: [mockWorkOrder],
        total: 1,
      });

      const result = await service.getAllWorkOrders();

      expect(result.workOrders).toHaveLength(1);
    });

    it('should apply status filter', async () => {
      (maintenanceRepository.findAllWorkOrders as jest.Mock).mockResolvedValue({
        workOrders: [mockWorkOrder],
        total: 1,
      });

      await service.getAllWorkOrders({ status: MaintenanceStatus.SCHEDULED });

      expect(maintenanceRepository.findAllWorkOrders).toHaveBeenCalledWith({
        status: MaintenanceStatus.SCHEDULED,
      });
    });

    it('should apply assignedTo filter', async () => {
      (maintenanceRepository.findAllWorkOrders as jest.Mock).mockResolvedValue({
        workOrders: [mockWorkOrder],
        total: 1,
      });

      await service.getAllWorkOrders({ assignedTo: 'tech-001' });

      expect(maintenanceRepository.findAllWorkOrders).toHaveBeenCalledWith({
        assignedTo: 'tech-001',
      });
    });
  });

  describe('startWorkOrder', () => {
    it('should start a scheduled work order', async () => {
      (maintenanceRepository.findWorkOrderById as jest.Mock).mockResolvedValue(mockWorkOrder);
      (maintenanceRepository.updateWorkOrder as jest.Mock).mockResolvedValue({
        ...mockWorkOrder,
        status: MaintenanceStatus.IN_PROGRESS,
        actualStartDate: new Date(),
      });

      const result = await service.startWorkOrder('WO-001', 'tech-001');

      expect(maintenanceRepository.updateWorkOrder).toHaveBeenCalledWith('WO-001', {
        status: 'IN_PROGRESS',
        actualStartDate: expect.any(Date),
        performedBy: 'tech-001',
      });
    });

    it('should throw error when work order is not SCHEDULED', async () => {
      const inProgressOrder = { ...mockWorkOrder, status: MaintenanceStatus.IN_PROGRESS };
      (maintenanceRepository.findWorkOrderById as jest.Mock).mockResolvedValue(inProgressOrder);

      await expect(service.startWorkOrder('WO-001', 'tech-001')).rejects.toThrow(
        'Only SCHEDULED work orders can be started'
      );
    });
  });

  describe('completeWorkOrder', () => {
    it('should complete a work order', async () => {
      const inProgressOrder = { ...mockWorkOrder, status: MaintenanceStatus.IN_PROGRESS };
      const dto: CompleteWorkOrderDTO = {
        workPerformed: 'Replaced battery successfully',
      };

      (maintenanceRepository.findWorkOrderById as jest.Mock).mockResolvedValue(inProgressOrder);
      (maintenanceRepository.completeWorkOrder as jest.Mock).mockResolvedValue({
        ...inProgressOrder,
        status: MaintenanceStatus.COMPLETED,
      });
      (maintenanceRepository.updateAsset as jest.Mock).mockResolvedValue(mockAsset);
      (maintenanceRepository.createServiceLog as jest.Mock).mockResolvedValue({});

      const result = await service.completeWorkOrder('WO-001', dto, 'tech-001');

      expect(maintenanceRepository.completeWorkOrder).toHaveBeenCalled();
      expect(maintenanceRepository.updateAsset).toHaveBeenCalledWith('ASSET-001', {
        status: AssetStatus.OPERATIONAL,
        updatedBy: 'tech-001',
      });
      expect(maintenanceRepository.createServiceLog).toHaveBeenCalled();
    });

    it('should throw error when work order is not IN_PROGRESS', async () => {
      const scheduledOrder = { ...mockWorkOrder, status: MaintenanceStatus.SCHEDULED };
      const dto: CompleteWorkOrderDTO = {
        workPerformed: 'Done',
      };

      (maintenanceRepository.findWorkOrderById as jest.Mock).mockResolvedValue(scheduledOrder);

      await expect(service.completeWorkOrder('WO-001', dto, 'tech-001')).rejects.toThrow(
        'Work order must be IN_PROGRESS to complete'
      );
    });

    it('should throw error when workPerformed is empty', async () => {
      const inProgressOrder = { ...mockWorkOrder, status: MaintenanceStatus.IN_PROGRESS };
      const dto: CompleteWorkOrderDTO = {
        workPerformed: '  ',
      };

      (maintenanceRepository.findWorkOrderById as jest.Mock).mockResolvedValue(inProgressOrder);

      await expect(service.completeWorkOrder('WO-001', dto, 'tech-001')).rejects.toThrow(
        'Work performed description is required'
      );
    });

    it('should throw error when completeWorkOrder fails', async () => {
      const inProgressOrder = { ...mockWorkOrder, status: MaintenanceStatus.IN_PROGRESS };
      const dto: CompleteWorkOrderDTO = {
        workPerformed: 'Done',
      };

      (maintenanceRepository.findWorkOrderById as jest.Mock).mockResolvedValue(inProgressOrder);
      (maintenanceRepository.completeWorkOrder as jest.Mock).mockResolvedValue(null);

      await expect(service.completeWorkOrder('WO-001', dto, 'tech-001')).rejects.toThrow(
        'Failed to complete work order'
      );
    });
  });

  // ==========================================================================
  // SERVICE HISTORY
  // ==========================================================================

  describe('getAssetServiceHistory', () => {
    it('should return service logs for asset', async () => {
      const mockServiceLog: ServiceLog = {
        logId: 'LOG-001',
        assetId: 'ASSET-001',
        workOrderId: 'WO-001',
        serviceDate: new Date('2024-01-15'),
        serviceType: 'CORRECTIVE',
        description: 'Battery replacement',
        performedBy: 'tech-001',
        cost: 500,
        createdAt: new Date('2024-01-15'),
        createdBy: 'tech-001',
      };

      (maintenanceRepository.findAssetById as jest.Mock).mockResolvedValue(mockAsset);
      (maintenanceRepository.findServiceLogsByAsset as jest.Mock).mockResolvedValue([
        mockServiceLog,
      ]);

      const result = await service.getAssetServiceHistory('ASSET-001');

      expect(result).toHaveLength(1);
    });

    it('should use default limit of 50', async () => {
      (maintenanceRepository.findAssetById as jest.Mock).mockResolvedValue(mockAsset);
      (maintenanceRepository.findServiceLogsByAsset as jest.Mock).mockResolvedValue([]);

      await service.getAssetServiceHistory('ASSET-001');

      expect(maintenanceRepository.findServiceLogsByAsset).toHaveBeenCalledWith('ASSET-001', 50);
    });

    it('should use custom limit', async () => {
      (maintenanceRepository.findAssetById as jest.Mock).mockResolvedValue(mockAsset);
      (maintenanceRepository.findServiceLogsByAsset as jest.Mock).mockResolvedValue([]);

      await service.getAssetServiceHistory('ASSET-001', 100);

      expect(maintenanceRepository.findServiceLogsByAsset).toHaveBeenCalledWith('ASSET-001', 100);
    });
  });

  describe('addServiceLog', () => {
    it('should add a service log', async () => {
      const log: Omit<ServiceLog, 'logId' | 'createdAt'> = {
        assetId: 'ASSET-001',
        workOrderId: 'WO-001',
        serviceDate: new Date('2024-01-20'),
        serviceType: 'PREVENTIVE',
        description: 'Monthly inspection completed',
        performedBy: 'tech-001',
        cost: 100,
        createdBy: 'tech-001',
      };

      (maintenanceRepository.findAssetById as jest.Mock).mockResolvedValue(mockAsset);
      (maintenanceRepository.createServiceLog as jest.Mock).mockResolvedValue({});
      (maintenanceRepository.updateAsset as jest.Mock).mockResolvedValue(mockAsset);

      await service.addServiceLog(log);

      expect(maintenanceRepository.createServiceLog).toHaveBeenCalledWith(log);
      expect(maintenanceRepository.updateAsset).toHaveBeenCalledWith('ASSET-001', {
        lastMaintenanceDate: log.serviceDate,
        updatedBy: 'tech-001',
      });
    });

    it('should throw error when description is empty', async () => {
      const log: Omit<ServiceLog, 'logId' | 'createdAt'> = {
        assetId: 'ASSET-001',
        serviceDate: new Date('2024-01-20'),
        serviceType: 'PREVENTIVE',
        description: '  ',
        performedBy: 'tech-001',
        createdBy: 'tech-001',
      };

      (maintenanceRepository.findAssetById as jest.Mock).mockResolvedValue(mockAsset);

      await expect(service.addServiceLog(log)).rejects.toThrow('Service description is required');
    });

    it('should throw NotFoundError when asset not found', async () => {
      const log: Omit<ServiceLog, 'logId' | 'createdAt'> = {
        assetId: 'NOT-FOUND',
        serviceDate: new Date('2024-01-20'),
        serviceType: 'PREVENTIVE',
        description: 'Service',
        performedBy: 'tech-001',
        createdBy: 'tech-001',
      };

      (maintenanceRepository.findAssetById as jest.Mock).mockResolvedValue(null);

      await expect(service.addServiceLog(log)).rejects.toThrow(NotFoundError);
    });
  });

  // ==========================================================================
  // METER READINGS
  // ==========================================================================

  describe('addMeterReading', () => {
    it('should add a meter reading', async () => {
      const dto: AddMeterReadingDTO = {
        assetId: 'ASSET-001',
        meterType: 'Hours',
        value: 1000,
        unit: 'h',
        readingDate: '2024-01-20',
      };

      const mockReading: MeterReading = {
        readingId: 'READING-001',
        assetId: 'ASSET-001',
        meterType: 'Hours',
        value: 1000,
        unit: 'h',
        readingDate: new Date('2024-01-20'),
        readBy: 'tech-001',
      };

      (maintenanceRepository.findAssetById as jest.Mock).mockResolvedValue(mockAsset);
      (maintenanceRepository.addMeterReading as jest.Mock).mockResolvedValue(mockReading);

      const result = await service.addMeterReading(dto, 'tech-001');

      expect(result.value).toBe(1000);
      expect(maintenanceRepository.addMeterReading).toHaveBeenCalled();
    });

    it('should throw error when meter type is empty', async () => {
      const dto: AddMeterReadingDTO = {
        assetId: 'ASSET-001',
        meterType: '  ',
        value: 100,
        unit: 'h',
        readingDate: '2024-01-20',
      };

      (maintenanceRepository.findAssetById as jest.Mock).mockResolvedValue(mockAsset);

      await expect(service.addMeterReading(dto, 'tech-001')).rejects.toThrow(
        'Meter type is required'
      );
    });

    it('should throw error when meter value is negative', async () => {
      const dto: AddMeterReadingDTO = {
        assetId: 'ASSET-001',
        meterType: 'Hours',
        value: -1,
        unit: 'h',
        readingDate: '2024-01-20',
      };

      (maintenanceRepository.findAssetById as jest.Mock).mockResolvedValue(mockAsset);

      await expect(service.addMeterReading(dto, 'tech-001')).rejects.toThrow(
        'Meter value cannot be negative'
      );
    });

    it('should throw error when unit is empty', async () => {
      const dto: AddMeterReadingDTO = {
        assetId: 'ASSET-001',
        meterType: 'Hours',
        value: 100,
        unit: '  ',
        readingDate: '2024-01-20',
      };

      (maintenanceRepository.findAssetById as jest.Mock).mockResolvedValue(mockAsset);

      await expect(service.addMeterReading(dto, 'tech-001')).rejects.toThrow('Unit is required');
    });

    it('should throw NotFoundError when asset not found', async () => {
      const dto: AddMeterReadingDTO = {
        assetId: 'NOT-FOUND',
        meterType: 'Hours',
        value: 100,
        unit: 'h',
        readingDate: '2024-01-20',
      };

      (maintenanceRepository.findAssetById as jest.Mock).mockResolvedValue(null);

      await expect(service.addMeterReading(dto, 'tech-001')).rejects.toThrow(NotFoundError);
    });
  });

  describe('getMeterReadingsByAsset', () => {
    it('should return meter readings for asset', async () => {
      const mockReading: MeterReading = {
        readingId: 'READING-001',
        assetId: 'ASSET-001',
        meterType: 'Hours',
        value: 1000,
        unit: 'h',
        readingDate: new Date('2024-01-20'),
        readBy: 'tech-001',
      };

      (maintenanceRepository.findAssetById as jest.Mock).mockResolvedValue(mockAsset);
      (maintenanceRepository.findMeterReadingsByAsset as jest.Mock).mockResolvedValue([
        mockReading,
      ]);

      const result = await service.getMeterReadingsByAsset('ASSET-001');

      expect(result).toHaveLength(1);
    });

    it('should use default limit of 100', async () => {
      (maintenanceRepository.findAssetById as jest.Mock).mockResolvedValue(mockAsset);
      (maintenanceRepository.findMeterReadingsByAsset as jest.Mock).mockResolvedValue([]);

      await service.getMeterReadingsByAsset('ASSET-001');

      expect(maintenanceRepository.findMeterReadingsByAsset).toHaveBeenCalledWith('ASSET-001', 100);
    });

    it('should use custom limit', async () => {
      (maintenanceRepository.findAssetById as jest.Mock).mockResolvedValue(mockAsset);
      (maintenanceRepository.findMeterReadingsByAsset as jest.Mock).mockResolvedValue([]);

      await service.getMeterReadingsByAsset('ASSET-001', 50);

      expect(maintenanceRepository.findMeterReadingsByAsset).toHaveBeenCalledWith('ASSET-001', 50);
    });
  });

  // ==========================================================================
  // SINGLETON EXPORT
  // ==========================================================================

  describe('maintenanceService singleton', () => {
    it('should export singleton instance', () => {
      expect(maintenanceService).toBeInstanceOf(MaintenanceService);
    });
  });
});
