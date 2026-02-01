/**
 * Pick task repository
 *
 * Handles all database operations for pick tasks
 */

import { BaseRepository } from './BaseRepository';
import { PickTask, TaskStatus } from '@opsui/shared';
import { query } from '../db/client';
import { NotFoundError, ConflictError } from '@opsui/shared';
import { logger } from '../config/logger';

// ============================================================================
// PICK TASK REPOSITORY
// ============================================================================

export class PickTaskRepository extends BaseRepository<PickTask> {
  constructor() {
    super('pick_tasks', 'pick_task_id');
  }

  // --------------------------------------------------------------------------
  // GET PICK TASKS BY ORDER
  // --------------------------------------------------------------------------

  async getByOrder(orderId: string): Promise<PickTask[]> {
    const result = await query<PickTask>(
      `SELECT * FROM pick_tasks WHERE order_id = $1 ORDER BY pick_task_id`,
      [orderId]
    );

    return result.rows;
  }

  // --------------------------------------------------------------------------
  // GET PICKER ACTIVE TASKS
  // --------------------------------------------------------------------------

  async getPickerActiveTasks(pickerId: string): Promise<PickTask[]> {
    const result = await query<PickTask>(
      `SELECT * FROM pick_tasks
       WHERE picker_id = $1 AND status IN ('PENDING', 'IN_PROGRESS')
       ORDER BY pick_task_id`,
      [pickerId]
    );

    return result.rows;
  }

  // --------------------------------------------------------------------------
  // GET NEXT PICK TASK FOR ORDER
  // --------------------------------------------------------------------------

  async getNextPickTask(orderId: string): Promise<PickTask | null> {
    const result = await query<PickTask>(
      `SELECT * FROM pick_tasks
       WHERE order_id = $1 AND status = 'PENDING'
       ORDER BY pick_task_id
       LIMIT 1`,
      [orderId]
    );

    return result.rows[0] || null;
  }

  // --------------------------------------------------------------------------
  // START PICK TASK
  // --------------------------------------------------------------------------

  async startPickTask(pickTaskId: string, pickerId: string): Promise<PickTask> {
    return this.withTransaction(async client => {
      const result = await client.query(
        `UPDATE pick_tasks
         SET status = 'IN_PROGRESS',
             picker_id = $1,
             started_at = NOW()
         WHERE pick_task_id = $2 AND status = 'PENDING'
         RETURNING *`,
        [pickerId, pickTaskId]
      );

      if (result.rows.length === 0) {
        throw new ConflictError('Pick task not available for starting');
      }

      return result.rows[0];
    });
  }

  // --------------------------------------------------------------------------
  // UPDATE PICKED QUANTITY
  // --------------------------------------------------------------------------

  async updatePickedQuantity(pickTaskId: string, quantity: number): Promise<PickTask> {
    return this.withTransaction(async client => {
      // Lock the row for update to prevent race conditions
      const lockResult = await client.query(
        `SELECT * FROM pick_tasks WHERE pick_task_id = $1 FOR UPDATE`,
        [pickTaskId]
      );

      if (lockResult.rows.length === 0) {
        throw new NotFoundError('PickTask', pickTaskId);
      }

      // Update with lock held
      const result = await client.query(
        `UPDATE pick_tasks
         SET picked_quantity = $1
         WHERE pick_task_id = $2
         RETURNING *`,
        [quantity, pickTaskId]
      );

      return result.rows[0];
    });
  }

  // --------------------------------------------------------------------------
  // COMPLETE PICK TASK
  // --------------------------------------------------------------------------

  async completePickTask(pickTaskId: string): Promise<PickTask> {
    return this.withTransaction(async client => {
      // Lock the row for update to prevent race conditions
      const lockResult = await client.query(
        `SELECT * FROM pick_tasks WHERE pick_task_id = $1 FOR UPDATE`,
        [pickTaskId]
      );

      if (lockResult.rows.length === 0) {
        throw new NotFoundError('PickTask', pickTaskId);
      }

      // Update with lock held
      const result = await client.query(
        `UPDATE pick_tasks
         SET status = 'COMPLETED',
             completed_at = NOW(),
             picked_quantity = quantity
         WHERE pick_task_id = $1 AND status != 'COMPLETED'
         RETURNING *`,
        [pickTaskId]
      );

      if (result.rows.length === 0) {
        throw new ConflictError('Pick task already completed');
      }

      return result.rows[0];
    });
  }

  // --------------------------------------------------------------------------
  // DECREMENT PICKED QUANTITY (UNDO PICK)
  // --------------------------------------------------------------------------

  async decrementPickedQuantity(pickTaskId: string, quantity: number = 1): Promise<PickTask> {
    console.log('=== decrementPickedQuantity called ===');
    console.log('pickTaskId:', pickTaskId);
    console.log('quantity to decrement:', quantity);

    // First check if task exists with explicit column selection
    const checkResult = await query(
      `SELECT 
         pick_task_id,
         order_id,
         order_item_id,
         sku,
         name,
         target_bin,
         quantity,
         picked_quantity,
         status,
         picker_id,
         started_at,
         completed_at,
         skipped_at,
         skip_reason
       FROM pick_tasks 
       WHERE pick_task_id = $1`,
      [pickTaskId]
    );

    if (checkResult.rows.length === 0) {
      throw new NotFoundError('PickTask', pickTaskId);
    }

    const task = checkResult.rows[0] as any;
    console.log('Current picked_quantity:', task.picked_quantity);
    console.log('Current quantity:', task.quantity);
    console.log('Current status:', task.status);

    // Reset picked_quantity to 0 in pick_tasks (instead of decrementing)
    // Do the UPDATE, then immediately SELECT to get fresh data
    await query(
      `UPDATE pick_tasks
       SET picked_quantity = 0,
           status = 'PENDING'
       WHERE pick_task_id = $1`,
      [pickTaskId]
    );

    // After UPDATE, SELECT to get fresh data with all columns
    // Use column aliases to match TypeScript PickTask interface (camelCase)
    const selectResult = await query(
      `SELECT 
         pt.pick_task_id as "pickTaskId",
         pt.order_id as "orderId",
         pt.order_item_id as "orderItemId",
         pt.sku as "sku",
         pt.name as "name",
         pt.target_bin as "targetBin",
         pt.quantity as "quantity",
         pt.picked_quantity as "pickedQuantity",
         pt.status as "status",
         pt.picker_id as "pickerId",
         pt.started_at as "startedAt",
         pt.completed_at as "completedAt",
         pt.skipped_at as "skippedAt",
         pt.skip_reason as "skipReason"
       FROM pick_tasks pt
       WHERE pt.pick_task_id = $1`,
      [pickTaskId]
    );

    const updatedTask = selectResult.rows[0] as any;
    console.log('Reset picked_quantity in pick_tasks to 0');
    console.log('Status after reset:', updatedTask.status);
    console.log('pickedQuantity from SELECT:', updatedTask.pickedQuantity);
    console.log('orderItemId from SELECT:', updatedTask.orderItemId);

    return updatedTask;
  }

  // --------------------------------------------------------------------------
  // SKIP PICK TASK
  // --------------------------------------------------------------------------

  async skipPickTask(pickTaskId: string, reason: string): Promise<PickTask> {
    const result = await query(
      `UPDATE pick_tasks
       SET status = 'SKIPPED',
           skipped_at = NOW(),
           skip_reason = $1
       WHERE pick_task_id = $2 AND status != 'COMPLETED'
       RETURNING *`,
      [reason, pickTaskId]
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('PickTask', pickTaskId);
    }

    return result.rows[0] as PickTask;
  }

  // --------------------------------------------------------------------------
  // UPDATE PICK TASK STATUS
  // --------------------------------------------------------------------------

  async updateStatus(pickTaskId: string, status: TaskStatus): Promise<PickTask> {
    console.log('=== updateStatus called ===');
    console.log('pickTaskId type:', typeof pickTaskId);
    console.log('pickTaskId value:', pickTaskId);
    console.log('status type:', typeof status);
    console.log('status value:', status);
    console.log('pickTaskId length:', pickTaskId?.length);

    logger.debug('Updating pick task status', { pickTaskId, status });

    // First check if task exists
    const checkResult = await query<PickTask>(`SELECT * FROM pick_tasks WHERE pick_task_id = $1`, [
      pickTaskId,
    ]);

    console.log('checkResult rows:', checkResult.rows.length);
    if (checkResult.rows.length > 0) {
      console.log('checkResult first row:', checkResult.rows[0]);
    }

    logger.debug('Pick task check', {
      pickTaskId,
      found: checkResult.rows.length > 0,
      task: checkResult.rows[0],
    });

    // If reverting from SKIPPED to PENDING, also reset picked_quantity to 0
    const task = checkResult.rows[0];
    const shouldResetQuantity = task?.status === 'SKIPPED' && status === 'PENDING';

    console.log('shouldResetQuantity:', shouldResetQuantity);

    const result = await query(
      `UPDATE pick_tasks
       SET status = $1::task_status,
           started_at = CASE WHEN $2 = 'IN_PROGRESS' AND started_at IS NULL THEN NOW() ELSE started_at END,
           skipped_at = CASE WHEN $2 = 'SKIPPED' AND skipped_at IS NULL THEN NOW() ELSE skipped_at END
       WHERE pick_task_id = $3
       RETURNING *`,
      [status, status, pickTaskId]
    );

    console.log('UPDATE result rows:', result.rows.length);
    logger.debug('Update result', {
      pickTaskId,
      status,
      rowsUpdated: result.rows.length,
    });

    // If reverting skip, reset picked_quantity to 0 in both pick_tasks and order_items
    if (shouldResetQuantity) {
      console.log('=== REVERTING SKIP ===');
      console.log('Resetting picked_quantity in pick_tasks');

      // Reset picked_quantity in pick_tasks table
      const pickTaskReset = await query(
        `UPDATE pick_tasks SET picked_quantity = 0 WHERE pick_task_id = $1 RETURNING *`,
        [pickTaskId]
      );

      console.log('Pick tasks reset rows:', pickTaskReset.rows.length);

      if (task?.orderItemId) {
        console.log(
          'Resetting picked_quantity in order_items for order_item_id:',
          task.orderItemId
        );
        const orderItemReset = await query(
          `UPDATE order_items SET picked_quantity = 0 WHERE order_item_id = $1 RETURNING *`,
          [task.orderItemId]
        );
        console.log('Order items reset rows:', orderItemReset.rows.length);
      }
    } else {
      console.log(
        'NOT resetting picked_quantity - shouldResetQuantity:',
        shouldResetQuantity,
        'orderItemId:',
        task?.orderItemId
      );
    }

    if (result.rows.length === 0) {
      throw new NotFoundError('PickTask', pickTaskId);
    }

    return result.rows[0] as PickTask;
  }

  // --------------------------------------------------------------------------
  // GET PICKING PROGRESS
  // --------------------------------------------------------------------------

  async getOrderPickingProgress(orderId: string): Promise<{
    total: number;
    completed: number;
    skipped: number;
    inProgress: number;
    pending: number;
    percentage: number;
  }> {
    const result = await query(
      `SELECT
         COUNT(*) as total,
         COUNT(*) FILTER (WHERE status = 'COMPLETED') as completed,
         COUNT(*) FILTER (WHERE status = 'SKIPPED') as skipped,
         COUNT(*) FILTER (WHERE status = 'IN_PROGRESS') as in_progress,
         COUNT(*) FILTER (WHERE status = 'PENDING') as pending
       FROM pick_tasks
       WHERE order_id = $1`,
      [orderId]
    );

    const row = result.rows[0];
    const total = parseInt(row.total, 10);
    const completed = parseInt(row.completed, 10);
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

    return {
      total,
      completed: parseInt(row.completed, 10),
      skipped: parseInt(row.skipped, 10),
      inProgress: parseInt(row.in_progress, 10),
      pending: parseInt(row.pending, 10),
      percentage,
    };
  }

  // --------------------------------------------------------------------------
  // GET PICKER PERFORMANCE
  // --------------------------------------------------------------------------

  async getPickerPerformance(
    pickerId: string,
    startDate: Date,
    endDate: Date
  ): Promise<{
    tasksCompleted: number;
    tasksTotal: number;
    averageTimePerTask: number; // in seconds
    totalItemsPicked: number;
  }> {
    const result = await query(
      `SELECT
         COUNT(*) FILTER (WHERE status = 'COMPLETED') as tasks_completed,
         COUNT(*) as tasks_total,
         COALESCE(AVG(EXTRACT(EPOCH FROM (completed_at - started_at))), 0) as avg_time,
         COALESCE(SUM(picked_quantity) FILTER (WHERE status = 'COMPLETED'), 0) as total_picked
       FROM pick_tasks
       WHERE picker_id = $1
         AND started_at >= $2
         AND started_at <= $3`,
      [pickerId, startDate, endDate]
    );

    const row = result.rows[0];

    return {
      tasksCompleted: parseInt(row.tasks_completed, 10),
      tasksTotal: parseInt(row.tasks_total, 10),
      averageTimePerTask: parseFloat(row.avg_time),
      totalItemsPicked: parseInt(row.total_picked, 10),
    };
  }
}

// Singleton instance
export const pickTaskRepository = new PickTaskRepository();
