/**
 * Maintenance & Assets Repository
 *
 * Data access layer for equipment maintenance and asset tracking
 */

import { getPool } from '../db/client';
import { logger } from '../config/logger';
import {
  Asset,
  MaintenanceSchedule,
  MaintenanceWorkOrder,
  ServiceLog,
  MeterReading,
  AssetStatus,
  MaintenanceStatus,
} from '@opsui/shared';

export class MaintenanceRepository {
  // ========================================================================
  // ASSETS
  // ========================================================================

  async createAsset(
    asset: Omit<Asset, 'assetId' | 'assetNumber' | 'createdAt' | 'updatedAt'>
  ): Promise<Asset> {
    const client = await getPool();

    const assetId = `AST-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const assetNumber = `AST-${Date.now()}`;

    const result = await client.query(
      `INSERT INTO assets
        (asset_id, asset_number, name, description, type, status, serial_number, manufacturer,
         model, year, purchase_date, purchase_price, location, assigned_to, parent_id,
         warranty_expiry, expected_lifespan_years, notes, created_by, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, NOW())
       RETURNING *`,
      [
        assetId,
        assetNumber,
        asset.name,
        asset.description || null,
        asset.type,
        asset.status,
        asset.serialNumber || null,
        asset.manufacturer || null,
        asset.model || null,
        asset.year || null,
        asset.purchaseDate || null,
        asset.purchasePrice || null,
        asset.location || null,
        asset.assignedTo || null,
        asset.parentId || null,
        asset.warrantyExpiry || null,
        asset.expectedLifespanYears || null,
        asset.notes || null,
        asset.createdBy,
      ]
    );

    logger.info('Asset created', { assetId, assetNumber });
    return this.mapRowToAsset(result.rows[0]);
  }

  async findAssetById(assetId: string): Promise<Asset | null> {
    const client = await getPool();

    const result = await client.query(`SELECT * FROM assets WHERE asset_id = $1`, [assetId]);

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToAsset(result.rows[0]);
  }

  async findAllAssets(filters?: {
    status?: AssetStatus;
    type?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ assets: Asset[]; total: number }> {
    const client = await getPool();

    const conditions: string[] = [];
    const params: any[] = [];
    let paramCount = 1;

    if (filters?.status) {
      conditions.push(`status = $${paramCount}`);
      params.push(filters.status);
      paramCount++;
    }

    if (filters?.type) {
      conditions.push(`type = $${paramCount}`);
      params.push(filters.type);
      paramCount++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countResult = await client.query(
      `SELECT COUNT(*) as count FROM assets ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].count, 10);

    const limit = filters?.limit || 50;
    const offset = filters?.offset || 0;

    const result = await client.query(
      `SELECT * FROM assets ${whereClause} ORDER BY created_at DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`,
      [...params, limit, offset]
    );

    const assets = result.rows.map(row => this.mapRowToAsset(row));

    return { assets, total };
  }

  async updateAsset(assetId: string, updates: Partial<Asset>): Promise<Asset | null> {
    const client = await getPool();

    const fields: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (updates.status !== undefined) {
      fields.push(`status = $${paramCount}`);
      values.push(updates.status);
      paramCount++;
    }

    if (updates.location !== undefined) {
      fields.push(`location = $${paramCount}`);
      values.push(updates.location);
      paramCount++;
    }

    if (updates.assignedTo !== undefined) {
      fields.push(`assigned_to = $${paramCount}`);
      values.push(updates.assignedTo);
      paramCount++;
    }

    if (updates.updatedBy !== undefined) {
      fields.push(`updated_by = $${paramCount}`);
      values.push(updates.updatedBy);
      paramCount++;
    }

    // Handle lastMaintenanceDate update
    if ((updates as any).lastMaintenanceDate !== undefined) {
      fields.push(`last_maintenance_date = $${paramCount}`);
      values.push((updates as any).lastMaintenanceDate);
      paramCount++;
    }

    fields.push(`updated_at = NOW()`);
    values.push(assetId);
    paramCount++;

    if (fields.length === 1) {
      return await this.findAssetById(assetId);
    }

    const result = await client.query(
      `UPDATE assets SET ${fields.join(', ')} WHERE asset_id = $${paramCount} RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return null;
    }

    logger.info('Asset updated', { assetId });
    return this.mapRowToAsset(result.rows[0]);
  }

  // ========================================================================
  // MAINTENANCE SCHEDULES
  // ========================================================================

  async createSchedule(
    schedule: Omit<
      MaintenanceSchedule,
      'scheduleId' | 'createdAt' | 'updatedAt' | 'lastPerformedDate'
    >
  ): Promise<MaintenanceSchedule> {
    const client = await getPool();

    const scheduleId = `SCH-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const result = await client.query(
      `INSERT INTO maintenance_schedules
        (schedule_id, asset_id, name, description, maintenance_type, priority, frequency,
         interval_days, estimated_duration_hours, assigned_to, parts_required, instructions,
         is_active, created_by, created_at, next_due_date)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW(), $15)
       RETURNING *`,
      [
        scheduleId,
        schedule.assetId,
        schedule.name,
        schedule.description || null,
        schedule.maintenanceType,
        schedule.priority,
        schedule.frequency,
        schedule.intervalDays || null,
        schedule.estimatedDurationHours,
        schedule.assignedTo || null,
        (schedule as any).partsRequired ? JSON.stringify((schedule as any).partsRequired) : null,
        schedule.instructions || null,
        schedule.isActive,
        schedule.createdBy,
        schedule.nextDueDate,
      ]
    );

    logger.info('Maintenance schedule created', { scheduleId });
    return this.mapRowToSchedule(result.rows[0]);
  }

  async findSchedulesByAsset(assetId: string): Promise<MaintenanceSchedule[]> {
    const client = await getPool();

    const result = await client.query(
      `SELECT * FROM maintenance_schedules WHERE asset_id = $1 AND is_active = true ORDER BY next_due_date`,
      [assetId]
    );

    return result.rows.map(row => this.mapRowToSchedule(row));
  }

  async findDueSchedules(daysAhead: number = 7): Promise<MaintenanceSchedule[]> {
    const client = await getPool();

    const result = await client.query(
      `SELECT * FROM maintenance_schedules
       WHERE is_active = true AND next_due_date <= NOW() + INTERVAL '${daysAhead} days'
       ORDER BY next_due_date`,
      []
    );

    return result.rows.map(row => this.mapRowToSchedule(row));
  }

  // ========================================================================
  // WORK ORDERS
  // ========================================================================

  async createWorkOrder(
    workOrder: Omit<
      MaintenanceWorkOrder,
      | 'workOrderId'
      | 'workOrderNumber'
      | 'createdAt'
      | 'updatedAt'
      | 'actualStartDate'
      | 'actualEndDate'
      | 'completedAt'
      | 'completedBy'
    >
  ): Promise<MaintenanceWorkOrder> {
    const client = await getPool();

    const workOrderId = `WO-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const workOrderNumber = `WO-${Date.now()}`;

    const result = await client.query(
      `INSERT INTO maintenance_work_orders
        (work_order_id, work_order_number, asset_id, schedule_id, title, description,
         maintenance_type, priority, status, scheduled_date, scheduled_start_time,
         estimated_duration_hours, assigned_to, parts_required, created_by, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, NOW())
       RETURNING *`,
      [
        workOrderId,
        workOrderNumber,
        workOrder.assetId,
        workOrder.scheduleId || null,
        workOrder.title,
        workOrder.description || null,
        workOrder.maintenanceType,
        workOrder.priority,
        workOrder.status,
        workOrder.scheduledDate,
        workOrder.scheduledStartTime || null,
        workOrder.estimatedDurationHours,
        workOrder.assignedTo || null,
        (workOrder as any).partsRequired ? JSON.stringify((workOrder as any).partsRequired) : null,
        workOrder.createdBy,
      ]
    );

    logger.info('Work order created', { workOrderId, workOrderNumber });
    return this.mapRowToWorkOrder(result.rows[0]);
  }

  async findWorkOrderById(workOrderId: string): Promise<MaintenanceWorkOrder | null> {
    const client = await getPool();

    const result = await client.query(
      `SELECT * FROM maintenance_work_orders WHERE work_order_id = $1`,
      [workOrderId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToWorkOrder(result.rows[0]);
  }

  async findAllWorkOrders(filters?: {
    status?: MaintenanceStatus;
    assignedTo?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ workOrders: MaintenanceWorkOrder[]; total: number }> {
    const client = await getPool();

    const conditions: string[] = [];
    const params: any[] = [];
    let paramCount = 1;

    if (filters?.status) {
      conditions.push(`status = $${paramCount}`);
      params.push(filters.status);
      paramCount++;
    }

    if (filters?.assignedTo) {
      conditions.push(`assigned_to = $${paramCount}`);
      params.push(filters.assignedTo);
      paramCount++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countResult = await client.query(
      `SELECT COUNT(*) as count FROM maintenance_work_orders ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].count, 10);

    const limit = filters?.limit || 50;
    const offset = filters?.offset || 0;

    const result = await client.query(
      `SELECT * FROM maintenance_work_orders ${whereClause} ORDER BY scheduled_date ASC LIMIT $${paramCount} OFFSET $${paramCount + 1}`,
      [...params, limit, offset]
    );

    const workOrders = result.rows.map(row => this.mapRowToWorkOrder(row));

    return { workOrders, total };
  }

  async completeWorkOrder(
    workOrderId: string,
    completionData: {
      workPerformed: string;
      partsUsed?: any[];
      actualDurationHours?: number;
      laborCost?: number;
      partsCost?: number;
      notes?: string;
      completedBy: string;
    }
  ): Promise<MaintenanceWorkOrder | null> {
    const client = await getPool();

    const totalCost = (completionData.laborCost || 0) + (completionData.partsCost || 0);

    const result = await client.query(
      `UPDATE maintenance_work_orders
       SET status = 'COMPLETED',
           work_performed = $1,
           parts_used = $2,
           actual_duration_hours = $3,
           labor_cost = $4,
           parts_cost = $5,
           total_cost = $6,
           notes = COALESCE($7, notes),
           actual_end_date = NOW(),
           completed_at = NOW(),
           completed_by = $8,
           updated_at = NOW()
       WHERE work_order_id = $9
       RETURNING *`,
      [
        completionData.workPerformed,
        completionData.partsUsed ? JSON.stringify(completionData.partsUsed) : null,
        completionData.actualDurationHours || null,
        completionData.laborCost || null,
        completionData.partsCost || null,
        totalCost,
        completionData.notes || null,
        completionData.completedBy,
        workOrderId,
      ]
    );

    if (result.rows.length === 0) {
      return null;
    }

    // Update asset last maintenance date
    const workOrder = this.mapRowToWorkOrder(result.rows[0]);
    await this.updateAsset(workOrder.assetId, {
      lastMaintenanceDate: new Date(),
      updatedBy: completionData.completedBy,
    } as Partial<Asset>);

    logger.info('Work order completed', { workOrderId });
    return this.mapRowToWorkOrder(result.rows[0]);
  }

  async updateWorkOrder(
    workOrderId: string,
    updates: Partial<MaintenanceWorkOrder>
  ): Promise<MaintenanceWorkOrder | null> {
    const client = await getPool();

    const fields: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (updates.status !== undefined) {
      fields.push(`status = $${paramCount}`);
      values.push(updates.status);
      paramCount++;
    }

    if (updates.actualStartDate !== undefined) {
      fields.push(`actual_start_date = $${paramCount}`);
      values.push(updates.actualStartDate);
      paramCount++;
    }

    if (updates.actualEndDate !== undefined) {
      fields.push(`actual_end_date = $${paramCount}`);
      values.push(updates.actualEndDate);
      paramCount++;
    }

    if (updates.performedBy !== undefined) {
      fields.push(`performed_by = $${paramCount}`);
      values.push(updates.performedBy);
      paramCount++;
    }

    if (updates.updatedBy !== undefined) {
      fields.push(`updated_by = $${paramCount}`);
      values.push(updates.updatedBy);
      paramCount++;
    }

    fields.push(`updated_at = NOW()`);
    values.push(workOrderId);
    paramCount++;

    if (fields.length === 1) {
      return await this.findWorkOrderById(workOrderId);
    }

    const result = await client.query(
      `UPDATE maintenance_work_orders SET ${fields.join(', ')} WHERE work_order_id = $${paramCount} RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return null;
    }

    logger.info('Work order updated', { workOrderId });
    return this.mapRowToWorkOrder(result.rows[0]);
  }

  // ========================================================================
  // SERVICE LOGS
  // ========================================================================

  async createServiceLog(log: Omit<ServiceLog, 'logId' | 'createdAt'>): Promise<ServiceLog> {
    const client = await getPool();

    const logId = `SLG-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    await client.query(
      `INSERT INTO service_logs
        (log_id, asset_id, work_order_id, service_date, service_type, description,
         performed_by, cost, notes, attachments, created_by, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())`,
      [
        logId,
        log.assetId,
        log.workOrderId || null,
        log.serviceDate,
        log.serviceType,
        log.description,
        log.performedBy,
        log.cost || null,
        log.notes || null,
        log.attachments ? JSON.stringify(log.attachments) : null,
        log.createdBy,
      ]
    );

    logger.info('Service log created', { logId });

    return {
      logId,
      ...log,
      createdAt: new Date(),
    } as ServiceLog;
  }

  async findServiceLogsByAsset(assetId: string, limit: number = 50): Promise<ServiceLog[]> {
    const client = await getPool();

    const result = await client.query(
      `SELECT * FROM service_logs WHERE asset_id = $1 ORDER BY service_date DESC LIMIT $2`,
      [assetId, limit]
    );

    return result.rows.map(row => ({
      logId: row.log_id,
      assetId: row.asset_id,
      workOrderId: row.work_order_id,
      serviceDate: row.service_date,
      serviceType: row.service_type,
      description: row.description,
      performedBy: row.performed_by,
      cost: row.cost ? parseFloat(row.cost) : undefined,
      notes: row.notes,
      attachments: row.attachments ? JSON.parse(row.attachments) : undefined,
      createdAt: row.created_at,
      createdBy: row.created_by,
    }));
  }

  // ========================================================================
  // METER READINGS
  // ========================================================================

  async addMeterReading(reading: Omit<MeterReading, 'readingId'>): Promise<MeterReading> {
    const client = await getPool();

    const readingId = `MR-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    await client.query(
      `INSERT INTO meter_readings
        (reading_id, asset_id, meter_type, value, unit, reading_date, read_by, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        readingId,
        reading.assetId,
        reading.meterType,
        reading.value,
        reading.unit,
        reading.readingDate,
        reading.readBy,
        reading.notes || null,
      ]
    );

    logger.info('Meter reading added', { readingId });

    return {
      readingId,
      ...reading,
    };
  }

  async findMeterReadingsByAsset(assetId: string, limit: number = 100): Promise<MeterReading[]> {
    const client = await getPool();

    const result = await client.query(
      `SELECT * FROM meter_readings WHERE asset_id = $1 ORDER BY reading_date DESC LIMIT $2`,
      [assetId, limit]
    );

    return result.rows.map(row => ({
      readingId: row.reading_id,
      assetId: row.asset_id,
      meterType: row.meter_type,
      value: parseFloat(row.value),
      unit: row.unit,
      readingDate: row.reading_date,
      readBy: row.read_by,
      notes: row.notes,
    }));
  }

  // ========================================================================
  // HELPER METHODS
  // ========================================================================

  private mapRowToAsset(row: any): Asset {
    return {
      assetId: row.asset_id,
      assetNumber: row.asset_number,
      name: row.name,
      description: row.description,
      type: row.type,
      status: row.status,
      serialNumber: row.serial_number,
      manufacturer: row.manufacturer,
      model: row.model,
      year: row.year,
      purchaseDate: row.purchase_date,
      purchasePrice: row.purchase_price ? parseFloat(row.purchase_price) : undefined,
      location: row.location,
      assignedTo: row.assigned_to,
      parentId: row.parent_id,
      warrantyExpiry: row.warranty_expiry,
      expectedLifespanYears: row.expected_lifespan_years,
      lastMaintenanceDate: row.last_maintenance_date,
      nextMaintenanceDate: row.next_maintenance_date,
      notes: row.notes,
      createdAt: row.created_at,
      createdBy: row.created_by,
      updatedAt: row.updated_at,
      updatedBy: row.updated_by,
    };
  }

  private mapRowToSchedule(row: any): MaintenanceSchedule {
    return {
      scheduleId: row.schedule_id,
      assetId: row.asset_id,
      name: row.name,
      description: row.description,
      maintenanceType: row.maintenance_type,
      priority: row.priority,
      frequency: row.frequency,
      intervalDays: row.interval_days,
      estimatedDurationHours: parseFloat(row.estimated_duration_hours),
      assignedTo: row.assigned_to,
      partsRequired: row.parts_required ? JSON.parse(row.parts_required) : undefined,
      instructions: row.instructions,
      isActive: row.is_active,
      createdAt: row.created_at,
      createdBy: row.created_by,
      updatedAt: row.updated_at,
      updatedBy: row.updated_by,
      lastPerformedDate: row.last_performed_date,
      nextDueDate: row.next_due_date,
    };
  }

  private mapRowToWorkOrder(row: any): MaintenanceWorkOrder {
    return {
      workOrderId: row.work_order_id,
      workOrderNumber: row.work_order_number,
      assetId: row.asset_id,
      scheduleId: row.schedule_id,
      title: row.title,
      description: row.description,
      maintenanceType: row.maintenance_type,
      priority: row.priority,
      status: row.status,
      scheduledDate: row.scheduled_date,
      scheduledStartTime: row.scheduled_start_time,
      estimatedDurationHours: parseFloat(row.estimated_duration_hours),
      assignedTo: row.assigned_to,
      actualStartDate: row.actual_start_date,
      actualEndDate: row.actual_end_date,
      actualDurationHours: row.actual_duration_hours
        ? parseFloat(row.actual_duration_hours)
        : undefined,
      workPerformed: row.work_performed,
      partsUsed: row.parts_used ? JSON.parse(row.parts_used) : undefined,
      laborCost: row.labor_cost ? parseFloat(row.labor_cost) : undefined,
      partsCost: row.parts_cost ? parseFloat(row.parts_cost) : undefined,
      totalCost: row.total_cost ? parseFloat(row.total_cost) : undefined,
      performedBy: row.performed_by,
      completedAt: row.completed_at,
      completedBy: row.completed_by,
      notes: row.notes,
      createdAt: row.created_at,
      createdBy: row.created_by,
      updatedAt: row.updated_at,
      updatedBy: row.updated_by,
    };
  }
}

// Singleton instance
export const maintenanceRepository = new MaintenanceRepository();
