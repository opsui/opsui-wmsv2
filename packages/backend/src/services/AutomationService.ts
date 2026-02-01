/**
 * Automation Service
 *
 * Handles integration with ASRS, robots, drones, and other automation systems
 * for cycle counting and inventory management
 */

import { getPool } from '../db/client';
import { logger } from '../config/logger';
import { nanoid } from 'nanoid';
import {
  AutomationTask,
  CreateAutomationTaskDTO,
  AutomationTaskType,
  AutomationTaskStatus,
  RFIDScanResult,
  VarianceStatus,
} from '@opsui/shared';

export class AutomationService {
  /**
   * Create an automation task for cycle counting
   */
  async createAutomationTask(dto: CreateAutomationTaskDTO): Promise<AutomationTask> {
    const client = await getPool();

    try {
      await client.query('BEGIN');

      const taskId = `TASK-${nanoid(10)}`.toUpperCase();

      await client.query(
        `INSERT INTO automation_tasks
          (task_id, task_type, status, assigned_to, priority, location, sku, quantity, metadata, created_by, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
         RETURNING *`,
        [
          taskId,
          dto.taskType,
          AutomationTaskStatus.PENDING,
          dto.assignedTo,
          dto.priority,
          dto.location,
          dto.sku || null,
          dto.quantity || null,
          dto.metadata ? JSON.stringify(dto.metadata) : null,
          dto.createdBy,
        ]
      );

      await client.query('COMMIT');

      logger.info('Automation task created', { taskId, taskType: dto.taskType });
      return await this.getAutomationTask(taskId);
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Error creating automation task', error);
      throw error;
    }
  }

  /**
   * Get automation task by ID
   */
  async getAutomationTask(taskId: string): Promise<AutomationTask> {
    const client = await getPool();

    const result = await client.query(`SELECT * FROM automation_tasks WHERE task_id = $1`, [
      taskId,
    ]);

    if (result.rows.length === 0) {
      throw new Error(`Automation task ${taskId} not found`);
    }

    return this.mapRowToAutomationTask(result.rows[0]);
  }

  /**
   * Get pending tasks for a robot/system
   */
  async getPendingTasks(
    assignedTo: string,
    taskType?: AutomationTaskType
  ): Promise<AutomationTask[]> {
    const client = await getPool();

    let query = 'SELECT * FROM automation_tasks WHERE assigned_to = $1 AND status = $2';
    const params: any[] = [assignedTo, AutomationTaskStatus.PENDING];

    if (taskType) {
      query += ' AND task_type = $3';
      params.push(taskType);
    }

    query += ' ORDER BY priority DESC, created_at ASC';

    const result = await client.query(query, params);

    return result.rows.map(row => this.mapRowToAutomationTask(row));
  }

  /**
   * Update task status and result
   */
  async updateTaskResult(
    taskId: string,
    status: AutomationTaskStatus,
    result?: {
      countedQuantity?: number;
      variance?: number;
      notes?: string;
    }
  ): Promise<AutomationTask> {
    const client = await getPool();

    try {
      await client.query('BEGIN');

      // Get the task first
      const task = await this.getAutomationTask(taskId);

      // If this is a cycle count task with results, create a cycle count entry
      if (
        task.taskType === AutomationTaskType.CYCLE_COUNT &&
        result &&
        status === AutomationTaskStatus.COMPLETED
      ) {
        await this.processCycleCountResult(task, result);
      }

      // Update the task
      await client.query(
        `UPDATE automation_tasks
         SET status = $1,
             result = $2,
             updated_at = NOW(),
             completed_at = CASE WHEN $1 = 'COMPLETED' THEN NOW() ELSE completed_at END
         WHERE task_id = $3`,
        [status, result ? JSON.stringify(result) : null, taskId]
      );

      await client.query('COMMIT');

      logger.info('Automation task updated', { taskId, status });
      return await this.getAutomationTask(taskId);
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Error updating automation task', error);
      throw error;
    }
  }

  /**
   * Process cycle count result from automation
   */
  private async processCycleCountResult(
    task: AutomationTask,
    result: { countedQuantity?: number; variance?: number; notes?: string }
  ): Promise<void> {
    const client = await getPool();

    // Get system quantity
    const inventoryResult = await client.query(
      `SELECT quantity FROM inventory_units WHERE sku = $1 AND bin_location = $2`,
      [task.sku, task.location]
    );

    const systemQuantity =
      inventoryResult.rows.length > 0 ? parseFloat(inventoryResult.rows[0].quantity) : 0;
    const countedQuantity = result.countedQuantity || 0;
    const variance = countedQuantity - systemQuantity;
    const variancePercent = systemQuantity > 0 ? (Math.abs(variance) / systemQuantity) * 100 : 0;

    // Create cycle count entry (find or create a plan for this automation)
    const planId = await this.getOrCreateAutomationCycleCountPlan(task.location, task.assignedTo);

    const entryId = `CCE-${nanoid(10)}`.toUpperCase();

    await client.query(
      `INSERT INTO cycle_count_entries
        (entry_id, plan_id, sku, bin_location, system_quantity, counted_quantity,
         variance, variance_percent, variance_status, counted_at, counted_by, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), $10, $11)`,
      [
        entryId,
        planId,
        task.sku,
        task.location,
        systemQuantity,
        countedQuantity,
        variance,
        variancePercent,
        VarianceStatus.PENDING,
        `Automated count by ${task.assignedTo}. ${result.notes || ''}`,
      ]
    );

    logger.info('Cycle count entry created from automation', { entryId, taskId: task.taskId });
  }

  /**
   * Get or create a cycle count plan for automation counts
   */
  private async getOrCreateAutomationCycleCountPlan(
    location: string,
    automationSystem: string
  ): Promise<string> {
    const client = await getPool();

    // Check for existing automation plan for this location
    const existingResult = await client.query(
      `SELECT plan_id FROM cycle_count_plans
       WHERE location = $1
         AND notes LIKE $2
         AND status IN ($3, $4)
       ORDER BY created_at DESC
       LIMIT 1`,
      [location, `%Automation: ${automationSystem}%`, 'SCHEDULED', 'IN_PROGRESS']
    );

    if (existingResult.rows.length > 0) {
      return existingResult.rows[0].plan_id;
    }

    // Create new plan
    const planId = `CCP-${nanoid(10)}`.toUpperCase();

    await client.query(
      `INSERT INTO cycle_count_plans
        (plan_id, plan_name, count_type, scheduled_date, location, count_by, created_by, notes, status, created_at, updated_at)
       VALUES ($1, $2, $3, NOW(), $4, $5, $6, $7, $8, NOW(), NOW())`,
      [
        planId,
        `Automated Count - ${location}`,
        'AD_HOC',
        location,
        'SYSTEM',
        'SYSTEM',
        `Automated cycle count by ${automationSystem}`,
        'IN_PROGRESS',
      ]
    );

    return planId;
  }

  /**
   * Process RFID scan results
   */
  async processRFIDScan(
    scanResult: RFIDScanResult
  ): Promise<{ matchedTags: number; unmatchedTags: string[] }> {
    const client = await getPool();

    let matchedTags = 0;
    const unmatchedTags: string[] = [];

    for (const tag of scanResult.tags) {
      // Try to match tag to SKU
      const skuResult = await client.query(
        `SELECT sku FROM skus WHERE barcode = $1 OR epc_code = $1 LIMIT 1`,
        [tag.epc]
      );

      if (skuResult.rows.length > 0) {
        const sku = skuResult.rows[0].sku;

        // Update or create RFID tag record
        await client.query(
          `INSERT INTO rfid_tags (tag_id, epc, sku, bin_location, last_scanned, scan_count)
           VALUES ($1, $2, $3, $4, NOW(), 1)
           ON CONFLICT (tag_id) DO UPDATE SET
             last_scanned = NOW(),
             scan_count = rfid_tags.scan_count + 1,
             sku = EXCLUDED.sku,
             bin_location = EXCLUDED.bin_location`,
          [tag.tagId, tag.epc, sku, scanResult.scanLocation]
        );

        matchedTags++;
      } else {
        // Record unmatched tag
        await client.query(
          `INSERT INTO rfid_tags (tag_id, epc, bin_location, last_scanned, scan_count)
           VALUES ($1, $2, $3, NOW(), 1)
           ON CONFLICT (tag_id) DO UPDATE SET last_scanned = NOW()`,
          [tag.tagId, tag.epc, scanResult.scanLocation]
        );

        unmatchedTags.push(tag.epc);
      }
    }

    logger.info('RFID scan processed', {
      totalTags: scanResult.tags.length,
      matchedTags,
      unmatchedTags: unmatchedTags.length,
    });

    return { matchedTags, unmatchedTags };
  }

  /**
   * Get RFID scan summary for a location
   */
  async getRFIDScanSummary(location: string): Promise<{
    totalTags: number;
    matchedSKUs: number;
    uniqueSKUs: string[];
    lastScan?: Date;
  }> {
    const client = await getPool();

    const result = await client.query(
      `SELECT
        COUNT(*) as total_tags,
        COUNT(DISTINCT sku) as unique_skus,
        MAX(last_scanned) as last_scan
       FROM rfid_tags
       WHERE bin_location = $1`,
      [location]
    );

    const skuResult = await client.query(
      `SELECT DISTINCT sku FROM rfid_tags WHERE bin_location = $1 AND sku IS NOT NULL`,
      [location]
    );

    return {
      totalTags: parseInt(result.rows[0].total_tags) || 0,
      matchedSKUs: parseInt(result.rows[0].unique_skus) || 0,
      uniqueSKUs: skuResult.rows.map(r => r.sku),
      lastScan: result.rows[0].last_scan ? new Date(result.rows[0].last_scan) : undefined,
    };
  }

  /**
   * Map database row to AutomationTask
   */
  private mapRowToAutomationTask(row: any): AutomationTask {
    return {
      taskId: row.task_id,
      taskType: row.task_type,
      status: row.status,
      assignedTo: row.assigned_to,
      priority: parseInt(row.priority),
      location: row.location,
      sku: row.sku,
      quantity: row.quantity ? parseInt(row.quantity) : undefined,
      metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
      result: row.result ? JSON.parse(row.result) : undefined,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      completedAt: row.completed_at ? new Date(row.completed_at) : undefined,
    };
  }
}

// Singleton instance
export const automationService = new AutomationService();
