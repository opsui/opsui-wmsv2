/**
 * Recurring Schedule Service
 *
 * Manages automated recurring cycle count schedules.
 * Processes due schedules to generate cycle count plans automatically.
 */

import { getPool } from '../db/client';
import { logger } from '../config/logger';
import { nanoid } from 'nanoid';
import { cycleCountService } from './CycleCountService';
import { CycleCountType, CycleCountStatus } from '@opsui/shared';

// ============================================================================
// TYPES
// ============================================================================

export interface RecurringCountSchedule {
  scheduleId: string;
  scheduleName: string;
  countType: CycleCountType;
  frequencyType: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'QUARTERLY';
  frequencyInterval: number;
  location?: string;
  sku?: string;
  assignedTo: string;
  nextRunDate: Date;
  lastRunDate?: Date;
  isActive: boolean;
  createdBy: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateRecurringScheduleDTO {
  scheduleName: string;
  countType: CycleCountType;
  frequencyType: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'QUARTERLY';
  frequencyInterval?: number;
  location?: string;
  sku?: string;
  assignedTo: string;
  notes?: string;
  createdBy: string;
}

export interface UpdateRecurringScheduleDTO {
  scheduleName?: string;
  frequencyType?: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'QUARTERLY';
  frequencyInterval?: number;
  location?: string;
  sku?: string;
  assignedTo?: string;
  isActive?: boolean;
  notes?: string;
}

export interface ScheduleFilters {
  isActive?: boolean;
  assignedTo?: string;
  frequencyType?: string;
  countType?: CycleCountType;
  limit?: number;
  offset?: number;
}

// ============================================================================
// RECURRING SCHEDULE SERVICE
// ============================================================================

export class RecurringScheduleService {
  /**
   * Create a new recurring schedule
   */
  async createRecurringSchedule(dto: CreateRecurringScheduleDTO): Promise<RecurringCountSchedule> {
    const client = await getPool();

    try {
      await client.query('BEGIN');

      const scheduleId = `RCS-${nanoid(10)}`.toUpperCase();

      // Calculate initial next run date
      const nextRunDate = this.calculateNextRunDate(
        dto.frequencyType,
        dto.frequencyInterval || 1,
        new Date()
      );

      const result = await client.query(
        `INSERT INTO recurring_count_schedules
          (schedule_id, schedule_name, count_type, frequency_type, frequency_interval,
           location, sku, assigned_to, next_run_date, created_by, notes)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         RETURNING *`,
        [
          scheduleId,
          dto.scheduleName,
          dto.countType,
          dto.frequencyType,
          dto.frequencyInterval || 1,
          dto.location || null,
          dto.sku || null,
          dto.assignedTo,
          nextRunDate,
          dto.createdBy,
          dto.notes || null,
        ]
      );

      await client.query('COMMIT');

      logger.info('Recurring schedule created', {
        scheduleId,
        scheduleName: dto.scheduleName,
        nextRunDate,
      });

      return this.mapRowToSchedule(result.rows[0]);
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Error creating recurring schedule', error);
      throw error;
    }
  }

  /**
   * Get all recurring schedules with optional filters
   */
  async getAllSchedules(filters?: ScheduleFilters): Promise<{
    schedules: RecurringCountSchedule[];
    total: number;
  }> {
    const client = await getPool();

    const conditions: string[] = [];
    const params: any[] = [];
    let paramCount = 1;

    if (filters?.isActive !== undefined) {
      conditions.push(`is_active = $${paramCount}`);
      params.push(filters.isActive);
      paramCount++;
    }

    if (filters?.assignedTo) {
      conditions.push(`assigned_to = $${paramCount}`);
      params.push(filters.assignedTo);
      paramCount++;
    }

    if (filters?.frequencyType) {
      conditions.push(`frequency_type = $${paramCount}`);
      params.push(filters.frequencyType);
      paramCount++;
    }

    if (filters?.countType) {
      conditions.push(`count_type = $${paramCount}`);
      params.push(filters.countType);
      paramCount++;
    }

    const whereClause = conditions.length > 0 ? conditions.join(' AND ') : '1=1';

    // Get total count
    const countResult = await client.query(
      `SELECT COUNT(*) as count FROM recurring_count_schedules WHERE ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].count, 10);

    // Get paginated results
    const limit = filters?.limit || 50;
    const offset = filters?.offset || 0;

    const result = await client.query(
      `SELECT rs.*, u.name as assigned_to_name, u_creator.name as created_by_name
       FROM recurring_count_schedules rs
       LEFT JOIN users u ON rs.assigned_to = u.user_id
       LEFT JOIN users u_creator ON rs.created_by = u_creator.user_id
       WHERE ${whereClause}
       ORDER BY rs.next_run_date ASC
       LIMIT $${paramCount} OFFSET $${paramCount + 1}`,
      [...params, limit, offset]
    );

    const schedules = result.rows.map(row => ({
      ...this.mapRowToSchedule(row),
      assignedToName: row.assigned_to_name,
      createdByName: row.created_by_name,
    }));

    return { schedules, total };
  }

  /**
   * Get a specific recurring schedule
   */
  async getSchedule(scheduleId: string): Promise<RecurringCountSchedule> {
    const client = await getPool();

    const result = await client.query(
      `SELECT rs.*, u.name as assigned_to_name, u_creator.name as created_by_name
       FROM recurring_count_schedules rs
       LEFT JOIN users u ON rs.assigned_to = u.user_id
       LEFT JOIN users u_creator ON rs.created_by = u_creator.user_id
       WHERE rs.schedule_id = $1`,
      [scheduleId]
    );

    if (result.rows.length === 0) {
      throw new Error(`Recurring schedule ${scheduleId} not found`);
    }

    const row = result.rows[0];
    return {
      ...this.mapRowToSchedule(row),
      assignedToName: row.assigned_to_name,
      createdByName: row.created_by_name,
    };
  }

  /**
   * Update a recurring schedule
   */
  async updateSchedule(
    scheduleId: string,
    dto: UpdateRecurringScheduleDTO
  ): Promise<RecurringCountSchedule> {
    const client = await getPool();

    try {
      await client.query('BEGIN');

      // Build update fields
      const updates: string[] = [];
      const values: any[] = [];
      let paramCount = 1;

      if (dto.scheduleName !== undefined) {
        updates.push(`schedule_name = $${paramCount}`);
        values.push(dto.scheduleName);
        paramCount++;
      }

      if (dto.frequencyType !== undefined) {
        updates.push(`frequency_type = $${paramCount}`);
        values.push(dto.frequencyType);
        paramCount++;
      }

      if (dto.frequencyInterval !== undefined) {
        updates.push(`frequency_interval = $${paramCount}`);
        values.push(dto.frequencyInterval);
        paramCount++;
      }

      if (dto.location !== undefined) {
        updates.push(`location = $${paramCount}`);
        values.push(dto.location || null);
        paramCount++;
      }

      if (dto.sku !== undefined) {
        updates.push(`sku = $${paramCount}`);
        values.push(dto.sku || null);
        paramCount++;
      }

      if (dto.assignedTo !== undefined) {
        updates.push(`assigned_to = $${paramCount}`);
        values.push(dto.assignedTo);
        paramCount++;
      }

      if (dto.isActive !== undefined) {
        updates.push(`is_active = $${paramCount}`);
        values.push(dto.isActive);
        paramCount++;
      }

      if (dto.notes !== undefined) {
        updates.push(`notes = $${paramCount}`);
        values.push(dto.notes || null);
        paramCount++;
      }

      updates.push(`updated_at = NOW()`);
      values.push(scheduleId);

      const result = await client.query(
        `UPDATE recurring_count_schedules
         SET ${updates.join(', ')}
         WHERE schedule_id = $${values.length}
         RETURNING *`,
        values
      );

      if (result.rows.length === 0) {
        throw new Error(`Recurring schedule ${scheduleId} not found`);
      }

      await client.query('COMMIT');

      logger.info('Recurring schedule updated', { scheduleId });
      return this.mapRowToSchedule(result.rows[0]);
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Error updating recurring schedule', error);
      throw error;
    }
  }

  /**
   * Delete (cancel) a recurring schedule
   */
  async deleteSchedule(scheduleId: string): Promise<void> {
    const client = await getPool();

    const result = await client.query(
      `DELETE FROM recurring_count_schedules WHERE schedule_id = $1`,
      [scheduleId]
    );

    if (result.rowCount === 0) {
      throw new Error(`Recurring schedule ${scheduleId} not found`);
    }

    logger.info('Recurring schedule deleted', { scheduleId });
  }

  /**
   * Process all due schedules and generate cycle count plans
   * Called by cron job
   */
  async processDueSchedules(): Promise<{
    processed: number;
    skipped: number;
    failed: number;
    details: Array<{ scheduleId: string; scheduleName: string; planId?: string; error?: string }>;
  }> {
    const client = await getPool();

    try {
      await client.query('BEGIN');

      // Find all due schedules
      const result = await client.query(
        `SELECT * FROM recurring_count_schedules
         WHERE is_active = true
           AND next_run_date <= NOW()
         ORDER BY next_run_date ASC`
      );

      const schedules = result.rows.map(row => this.mapRowToSchedule(row));

      let processed = 0;
      let skipped = 0;
      let failed = 0;
      const details: Array<{
        scheduleId: string;
        scheduleName: string;
        planId?: string;
        error?: string;
      }> = [];

      for (const schedule of schedules) {
        try {
          logger.info('Processing due schedule', {
            scheduleId: schedule.scheduleId,
            scheduleName: schedule.scheduleName,
          });

          // Create cycle count plan from schedule
          const plan = await cycleCountService.createCycleCountPlan({
            planName: `${schedule.scheduleName} - ${new Date().toLocaleDateString()}`,
            countType: schedule.countType,
            scheduledDate: new Date(),
            location: schedule.location,
            sku: schedule.sku,
            countBy: schedule.assignedTo,
            createdBy: schedule.createdBy,
            notes: `Auto-generated from recurring schedule: ${schedule.notes || ''}`,
          });

          // Calculate next run date
          const nextRunDate = this.calculateNextRunDate(
            schedule.frequencyType,
            schedule.frequencyInterval,
            new Date()
          );

          // Update schedule with last run and next run dates
          await client.query(
            `UPDATE recurring_count_schedules
             SET last_run_date = NOW(),
                 next_run_date = $1,
                 updated_at = NOW()
             WHERE schedule_id = $2`,
            [nextRunDate, schedule.scheduleId]
          );

          processed++;
          details.push({
            scheduleId: schedule.scheduleId,
            scheduleName: schedule.scheduleName,
            planId: plan.planId,
          });

          logger.info('Schedule processed successfully', {
            scheduleId: schedule.scheduleId,
            planId: plan.planId,
            nextRunDate,
          });
        } catch (error: any) {
          failed++;
          details.push({
            scheduleId: schedule.scheduleId,
            scheduleName: schedule.scheduleName,
            error: error.message,
          });

          logger.error('Failed to process schedule', {
            scheduleId: schedule.scheduleId,
            error: error.message,
          });
        }
      }

      await client.query('COMMIT');

      logger.info('Schedule processing completed', {
        total: schedules.length,
        processed,
        skipped,
        failed,
      });

      return { processed, skipped, failed, details };
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Error processing due schedules', error);
      throw error;
    }
  }

  /**
   * Calculate next run date based on frequency type and interval
   */
  private calculateNextRunDate(
    frequencyType: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'QUARTERLY',
    interval: number,
    fromDate: Date
  ): Date {
    const nextDate = new Date(fromDate);

    switch (frequencyType) {
      case 'DAILY':
        nextDate.setDate(nextDate.getDate() + interval);
        break;

      case 'WEEKLY':
        nextDate.setDate(nextDate.getDate() + 7 * interval);
        break;

      case 'MONTHLY':
        nextDate.setMonth(nextDate.getMonth() + interval);
        break;

      case 'QUARTERLY':
        nextDate.setMonth(nextDate.getMonth() + 3 * interval);
        break;
    }

    // Set time to start of business day (8 AM)
    nextDate.setHours(8, 0, 0, 0);

    return nextDate;
  }

  // ==========================================================================
  // PRIVATE METHODS
  // ==========================================================================

  private mapRowToSchedule(row: any): RecurringCountSchedule {
    return {
      scheduleId: row.schedule_id,
      scheduleName: row.schedule_name,
      countType: row.count_type,
      frequencyType: row.frequency_type,
      frequencyInterval: parseInt(row.frequency_interval),
      location: row.location,
      sku: row.sku,
      assignedTo: row.assigned_to,
      nextRunDate: new Date(row.next_run_date),
      lastRunDate: row.last_run_date ? new Date(row.last_run_date) : undefined,
      isActive: row.is_active,
      createdBy: row.created_by,
      notes: row.notes,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }
}

// Singleton instance
export const recurringScheduleService = new RecurringScheduleService();
