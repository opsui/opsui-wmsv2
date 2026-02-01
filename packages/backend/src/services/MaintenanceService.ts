/**
 * Maintenance & Assets Service
 *
 * Business logic for asset management and maintenance workflows
 */

import { maintenanceRepository } from '../repositories/MaintenanceRepository';
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
  MaintenanceStatus,
  NotFoundError,
} from '@opsui/shared';

export class MaintenanceService {
  // ========================================================================
  // ASSETS
  // ========================================================================

  async createAsset(dto: CreateAssetDTO, createdBy: string): Promise<Asset> {
    // Validate asset
    if (!dto.name || dto.name.trim() === '') {
      throw new Error('Asset name is required');
    }

    if (!dto.type) {
      throw new Error('Asset type is required');
    }

    const asset = await maintenanceRepository.createAsset({
      ...dto,
      purchaseDate: dto.purchaseDate ? new Date(dto.purchaseDate) : undefined,
      warrantyExpiry: dto.warrantyExpiry ? new Date(dto.warrantyExpiry) : undefined,
      status: AssetStatus.OPERATIONAL,
      createdBy,
    });

    return asset;
  }

  async getAssetById(assetId: string): Promise<Asset> {
    const asset = await maintenanceRepository.findAssetById(assetId);
    if (!asset) {
      throw new NotFoundError('Asset', assetId);
    }
    return asset;
  }

  async getAllAssets(filters?: {
    status?: AssetStatus;
    type?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ assets: Asset[]; total: number }> {
    return await maintenanceRepository.findAllAssets(filters);
  }

  async updateAsset(assetId: string, dto: Partial<Asset>, userId: string): Promise<Asset> {
    const asset = await maintenanceRepository.findAssetById(assetId);
    if (!asset) {
      throw new NotFoundError('Asset', assetId);
    }

    const updated = await maintenanceRepository.updateAsset(assetId, {
      ...dto,
      updatedBy: userId,
    });

    return updated as Asset;
  }

  async retireAsset(assetId: string, userId: string): Promise<Asset> {
    const asset = await this.getAssetById(assetId);

    if (asset.status === AssetStatus.RETIRED) {
      throw new Error('Asset already retired');
    }

    const updated = await maintenanceRepository.updateAsset(assetId, {
      status: AssetStatus.RETIRED,
      updatedBy: userId,
    });

    return updated as Asset;
  }

  // ========================================================================
  // MAINTENANCE SCHEDULES
  // ========================================================================

  async createSchedule(
    dto: CreateMaintenanceScheduleDTO,
    createdBy: string
  ): Promise<MaintenanceSchedule> {
    // Validate schedule
    if (!dto.name || dto.name.trim() === '') {
      throw new Error('Schedule name is required');
    }

    if (!dto.assetId || dto.assetId.trim() === '') {
      throw new Error('Asset ID is required');
    }

    if (!dto.nextDueDate) {
      throw new Error('Next due date is required');
    }

    if (dto.estimatedDurationHours <= 0) {
      throw new Error('Estimated duration must be greater than 0');
    }

    // Validate asset exists
    const asset = await maintenanceRepository.findAssetById(dto.assetId);
    if (!asset) {
      throw new NotFoundError('Asset', dto.assetId);
    }

    const schedule = await maintenanceRepository.createSchedule({
      ...dto,
      nextDueDate: new Date(dto.nextDueDate),
      isActive: true,
      createdBy,
    } as any);

    return schedule;
  }

  async getSchedulesByAsset(assetId: string): Promise<MaintenanceSchedule[]> {
    const asset = await this.getAssetById(assetId);
    return await maintenanceRepository.findSchedulesByAsset(assetId);
  }

  async getUpcomingMaintenance(daysAhead: number = 7): Promise<MaintenanceSchedule[]> {
    return await maintenanceRepository.findDueSchedules(daysAhead);
  }

  // ========================================================================
  // WORK ORDERS
  // ========================================================================

  async createWorkOrder(dto: CreateWorkOrderDTO, createdBy: string): Promise<MaintenanceWorkOrder> {
    // Validate work order
    if (!dto.assetId || dto.assetId.trim() === '') {
      throw new Error('Asset ID is required');
    }

    if (!dto.title || dto.title.trim() === '') {
      throw new Error('Work order title is required');
    }

    if (!dto.scheduledDate) {
      throw new Error('Scheduled date is required');
    }

    if (dto.estimatedDurationHours <= 0) {
      throw new Error('Estimated duration must be greater than 0');
    }

    // Validate asset exists
    const asset = await maintenanceRepository.findAssetById(dto.assetId);
    if (!asset) {
      throw new NotFoundError('Asset', dto.assetId);
    }

    const workOrder = await maintenanceRepository.createWorkOrder({
      ...dto,
      scheduledDate: new Date(dto.scheduledDate),
      scheduledStartTime: dto.scheduledStartTime, // Keep as string (HH:mm format)
      status: MaintenanceStatus.SCHEDULED,
      createdBy,
    } as any);

    // Update asset status if maintenance type is not preventive
    if (dto.maintenanceType !== 'PREVENTIVE') {
      await maintenanceRepository.updateAsset(dto.assetId, {
        status: AssetStatus.IN_MAINTENANCE,
        updatedBy: createdBy,
      });
    }

    return workOrder;
  }

  async getWorkOrderById(workOrderId: string): Promise<MaintenanceWorkOrder> {
    const workOrder = await maintenanceRepository.findWorkOrderById(workOrderId);
    if (!workOrder) {
      throw new NotFoundError('Work Order', workOrderId);
    }
    return workOrder;
  }

  async getAllWorkOrders(filters?: {
    status?: MaintenanceStatus;
    assignedTo?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ workOrders: MaintenanceWorkOrder[]; total: number }> {
    return await maintenanceRepository.findAllWorkOrders(filters);
  }

  async startWorkOrder(workOrderId: string, userId: string): Promise<MaintenanceWorkOrder> {
    const workOrder = await this.getWorkOrderById(workOrderId);

    if (workOrder.status !== 'SCHEDULED') {
      throw new Error('Only SCHEDULED work orders can be started');
    }

    // Update work order
    const updated = await maintenanceRepository.updateWorkOrder(workOrderId, {
      status: 'IN_PROGRESS',
      actualStartDate: new Date(),
      performedBy: userId,
    } as any);

    return updated as MaintenanceWorkOrder;
  }

  async completeWorkOrder(
    workOrderId: string,
    dto: CompleteWorkOrderDTO,
    userId: string
  ): Promise<MaintenanceWorkOrder> {
    const workOrder = await this.getWorkOrderById(workOrderId);

    if (workOrder.status !== 'IN_PROGRESS') {
      throw new Error('Work order must be IN_PROGRESS to complete');
    }

    if (!dto.workPerformed || dto.workPerformed.trim() === '') {
      throw new Error('Work performed description is required');
    }

    const completed = await maintenanceRepository.completeWorkOrder(workOrderId, {
      ...dto,
      completedBy: userId,
    });

    if (!completed) {
      throw new Error('Failed to complete work order');
    }

    // Update asset back to operational
    await maintenanceRepository.updateAsset(workOrder.assetId, {
      status: AssetStatus.OPERATIONAL,
      updatedBy: userId,
    });

    // Create service log entry
    await maintenanceRepository.createServiceLog({
      assetId: workOrder.assetId,
      workOrderId,
      serviceDate: new Date(),
      serviceType: workOrder.maintenanceType,
      description: dto.workPerformed,
      performedBy: userId,
      cost: completed.totalCost,
      notes: dto.notes,
      createdBy: userId,
    });

    return completed;
  }

  // ========================================================================
  // SERVICE HISTORY
  // ========================================================================

  async getAssetServiceHistory(assetId: string, limit: number = 50): Promise<ServiceLog[]> {
    const asset = await this.getAssetById(assetId);
    return await maintenanceRepository.findServiceLogsByAsset(assetId, limit);
  }

  async addServiceLog(log: Omit<ServiceLog, 'logId' | 'createdAt'>): Promise<ServiceLog> {
    // Validate asset exists
    const asset = await maintenanceRepository.findAssetById(log.assetId);
    if (!asset) {
      throw new NotFoundError('Asset', log.assetId);
    }

    if (!log.description || log.description.trim() === '') {
      throw new Error('Service description is required');
    }

    const serviceLog = await maintenanceRepository.createServiceLog({
      ...log,
    });

    // Update asset last maintenance date
    await maintenanceRepository.updateAsset(log.assetId, {
      lastMaintenanceDate: log.serviceDate,
      updatedBy: log.createdBy,
    });

    return serviceLog;
  }

  // ========================================================================
  // METER READINGS
  // ========================================================================

  async addMeterReading(dto: AddMeterReadingDTO, userId: string): Promise<MeterReading> {
    // Validate asset exists
    const asset = await maintenanceRepository.findAssetById(dto.assetId);
    if (!asset) {
      throw new NotFoundError('Asset', dto.assetId);
    }

    if (!dto.meterType || dto.meterType.trim() === '') {
      throw new Error('Meter type is required');
    }

    if (dto.value < 0) {
      throw new Error('Meter value cannot be negative');
    }

    if (!dto.unit || dto.unit.trim() === '') {
      throw new Error('Unit is required');
    }

    const reading = await maintenanceRepository.addMeterReading({
      assetId: dto.assetId,
      meterType: dto.meterType,
      value: dto.value,
      unit: dto.unit,
      readingDate: new Date(dto.readingDate),
      readBy: userId,
      notes: dto.notes,
    });

    // Check if reading triggers maintenance
    await this.checkMeterReadingForMaintenance(dto.assetId, dto.meterType, dto.value);

    return reading;
  }

  async getMeterReadingsByAsset(assetId: string, limit: number = 100): Promise<MeterReading[]> {
    const asset = await this.getAssetById(assetId);
    return await maintenanceRepository.findMeterReadingsByAsset(assetId, limit);
  }

  // ========================================================================
  // PRIVATE HELPERS
  // ========================================================================

  private async checkMeterReadingForMaintenance(
    assetId: string,
    meterType: string,
    value: number
  ): Promise<void> {
    // Check if this reading exceeds any thresholds that should trigger maintenance
    // This would integrate with the maintenance schedule and alert system

    // For now, just log
    console.log(`Checking meter reading ${meterType} = ${value} for asset ${assetId}`);
  }
}

// Singleton instance
export const maintenanceService = new MaintenanceService();
