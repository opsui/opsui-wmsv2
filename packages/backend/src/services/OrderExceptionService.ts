/**
 * Order Exception Service
 *
 * Handles order exceptions during fulfillment - short picks, damages, substitutions, etc.
 */

import { getPool } from '../db/client';
import { logger } from '../config/logger';
import {
  ExceptionType,
  ExceptionStatus,
  ExceptionResolution,
  OrderException,
  LogExceptionDTO,
  ResolveExceptionDTO,
} from '@opsui/shared';
import { nanoid } from 'nanoid';
import { notifyExceptionReported } from './NotificationHelper';

// ============================================================================
// ORDER EXCEPTION SERVICE
// ============================================================================

export class OrderExceptionService {
  // --------------------------------------------------------------------------
  // LOG EXCEPTION
  // --------------------------------------------------------------------------

  async logException(dto: LogExceptionDTO): Promise<OrderException> {
    const client = await getPool();

    try {
      // Calculate quantity short
      const quantityShort = dto.quantityExpected - dto.quantityActual;

      // Determine initial status based on exception type
      let initialStatus = ExceptionStatus.OPEN;
      if (dto.type === ExceptionType.SHORT_PICK_BACKORDER) {
        initialStatus = ExceptionStatus.REVIEWING; // Backorders need review
      }

      // Generate exception ID
      const exceptionId = `EXC-${nanoid(10)}`.toUpperCase();

      // Insert exception
      const result = await client.query(
        `INSERT INTO order_exceptions
          (exception_id, order_id, order_item_id, sku, type, status,
           quantity_expected, quantity_actual, reason, reported_by,
           substitute_sku, reported_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
         RETURNING *`,
        [
          exceptionId,
          dto.orderId,
          dto.orderItemId,
          dto.sku,
          dto.type,
          initialStatus,
          dto.quantityExpected,
          dto.quantityActual,
          dto.reason,
          dto.reportedBy,
          dto.substituteSku || null,
        ]
      );

      const exception = result.rows[0];
      logger.info('Exception logged', {
        exceptionId,
        orderId: dto.orderId,
        sku: dto.sku,
        type: dto.type,
      });

      // Send notification about the exception
      await notifyExceptionReported({
        exceptionId,
        orderId: dto.orderId,
        type: dto.type,
        description: dto.reason || 'No reason provided',
        userId: dto.reportedBy,
      });

      return this.mapRowToException(exception);
    } catch (error) {
      logger.error('Error logging exception', error);
      throw error;
    }
  }

  // --------------------------------------------------------------------------
  // GET EXCEPTIONS
  // --------------------------------------------------------------------------

  async getException(exceptionId: string): Promise<OrderException> {
    const client = await getPool();

    const result = await client.query(`SELECT * FROM order_exceptions WHERE exception_id = $1`, [
      exceptionId,
    ]);

    if (result.rows.length === 0) {
      throw new Error(`Exception ${exceptionId} not found`);
    }

    return this.mapRowToException(result.rows[0]);
  }

  async getOpenExceptions(filters?: {
    orderId?: string;
    sku?: string;
    type?: ExceptionType;
    limit?: number;
    offset?: number;
  }): Promise<{ exceptions: OrderException[]; total: number }> {
    const client = await getPool();

    const conditions: string[] = ["status = 'OPEN'"];
    const params: any[] = [];
    let paramCount = 1;

    if (filters?.orderId) {
      conditions.push(`order_id = $${paramCount}`);
      params.push(filters.orderId);
      paramCount++;
    }

    if (filters?.sku) {
      conditions.push(`sku = $${paramCount}`);
      params.push(filters.sku);
      paramCount++;
    }

    if (filters?.type) {
      conditions.push(`type = $${paramCount}`);
      params.push(filters.type);
      paramCount++;
    }

    const whereClause = conditions.join(' AND ');

    // Get total count
    const countResult = await client.query(
      `SELECT COUNT(*) as count FROM order_exceptions WHERE ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].count, 10);

    // Get paginated results
    const limit = filters?.limit || 50;
    const offset = filters?.offset || 0;

    const result = await client.query(
      `SELECT * FROM order_exceptions
       WHERE ${whereClause}
       ORDER BY reported_at DESC
       LIMIT $${paramCount} OFFSET $${paramCount + 1}`,
      [...params, limit, offset]
    );

    return {
      exceptions: result.rows.map(row => this.mapRowToException(row)),
      total,
    };
  }

  async getAllExceptions(filters?: {
    status?: ExceptionStatus;
    orderId?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ exceptions: OrderException[]; total: number }> {
    const client = await getPool();

    const conditions: string[] = [];
    const params: any[] = [];
    let paramCount = 1;

    if (filters?.status) {
      conditions.push(`status = $${paramCount}`);
      params.push(filters.status);
      paramCount++;
    }

    if (filters?.orderId) {
      conditions.push(`order_id = $${paramCount}`);
      params.push(filters.orderId);
      paramCount++;
    }

    const whereClause = conditions.length > 0 ? conditions.join(' AND ') : '1=1';

    // Get total count
    const countResult = await client.query(
      `SELECT COUNT(*) as count FROM order_exceptions WHERE ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].count, 10);

    // Get paginated results
    const limit = filters?.limit || 50;
    const offset = filters?.offset || 0;

    const result = await client.query(
      `SELECT * FROM order_exceptions
       WHERE ${whereClause}
       ORDER BY reported_at DESC
       LIMIT $${paramCount} OFFSET $${paramCount + 1}`,
      [...params, limit, offset]
    );

    return {
      exceptions: result.rows.map(row => this.mapRowToException(row)),
      total,
    };
  }

  // --------------------------------------------------------------------------
  // RESOLVE EXCEPTION
  // --------------------------------------------------------------------------

  async resolveException(dto: ResolveExceptionDTO): Promise<OrderException> {
    const client = await getPool();

    try {
      // Start transaction
      await client.query('BEGIN');

      // Get current exception
      const currentResult = await client.query(
        `SELECT * FROM order_exceptions WHERE exception_id = $1 FOR UPDATE`,
        [dto.exceptionId]
      );

      if (currentResult.rows.length === 0) {
        throw new Error(`Exception ${dto.exceptionId} not found`);
      }

      const current = currentResult.rows[0];

      // Update exception status
      const updateFields: string[] = [
        'status = $1',
        'resolution = $2',
        'resolution_notes = $3',
        'resolved_by = $4',
        'resolved_at = NOW()',
      ];
      const updateParams: any[] = [
        ExceptionStatus.RESOLVED,
        dto.resolution,
        dto.notes || null,
        dto.resolvedBy,
      ];
      let paramCount = 5;

      // Handle substitute SKU
      if (dto.substituteSku) {
        updateFields.push(`substitute_sku = $${paramCount}`);
        updateParams.push(dto.substituteSku);
        paramCount++;
      }

      // Update based on resolution type
      switch (dto.resolution) {
        case ExceptionResolution.SUBSTITUTE:
          // Update order item with substitute SKU
          if (dto.substituteSku) {
            await client.query(
              `UPDATE order_items
               SET substitute_sku = $1, substitution_notes = $2
               WHERE order_item_id = $3`,
              [dto.substituteSku, dto.notes, current.order_item_id]
            );
          }
          break;

        case ExceptionResolution.CANCEL_ITEM:
          // Update order item status to cancelled
          await client.query(
            `UPDATE order_items
             SET status = 'CANCELLED', cancellation_reason = $1
             WHERE order_item_id = $2`,
            [dto.notes, current.order_item_id]
          );
          break;

        case ExceptionResolution.CANCEL_ORDER:
          // Cancel entire order
          await client.query(
            `UPDATE orders
             SET status = 'CANCELLED', cancelled_at = NOW()
             WHERE order_id = $1`,
            [current.order_id]
          );
          break;

        case ExceptionResolution.ADJUST_QUANTITY:
          // Adjust order item quantity
          if (dto.newQuantity) {
            await client.query(
              `UPDATE order_items
               SET quantity = $1
               WHERE order_item_id = $2`,
              [dto.newQuantity, current.order_item_id]
            );
          }
          break;

        case ExceptionResolution.TRANSFER_BIN:
          // Update bin location for the item
          if (dto.newBinLocation) {
            await client.query(
              `UPDATE order_items
               SET bin_location = $1
               WHERE order_item_id = $2`,
              [dto.newBinLocation, current.order_item_id]
            );
          }
          break;

        case ExceptionResolution.BACKORDER:
          // Update order to backorder status
          await client.query(
            `UPDATE orders
             SET status = 'BACKORDER'
             WHERE order_id = $1`,
            [current.order_id]
          );
          break;
      }

      // Update exception
      updateParams.push(dto.exceptionId);
      const updateResult = await client.query(
        `UPDATE order_exceptions
         SET ${updateFields.join(', ')}
         WHERE exception_id = $${paramCount}
         RETURNING *`,
        updateParams
      );

      // Commit transaction
      await client.query('COMMIT');

      const exception = updateResult.rows[0];
      logger.info('Exception resolved', {
        exceptionId: dto.exceptionId,
        resolution: dto.resolution,
        resolvedBy: dto.resolvedBy,
      });

      return this.mapRowToException(exception);
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Error resolving exception', error);
      throw error;
    }
  }

  // --------------------------------------------------------------------------
  // GET EXCEPTION SUMMARY
  // --------------------------------------------------------------------------

  async getExceptionSummary(): Promise<{
    total: number;
    open: number;
    resolved: number;
    byType: Record<string, number>;
  }> {
    const client = await getPool();

    const result = await client.query(`
      SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'OPEN') as open,
        COUNT(*) FILTER (WHERE status = 'RESOLVED') as resolved
      FROM order_exceptions
    `);

    const byTypeResult = await client.query(`
      SELECT type, COUNT(*) as count
      FROM order_exceptions
      GROUP BY type
    `);

    const byType: Record<string, number> = {};
    for (const row of byTypeResult.rows) {
      byType[row.type] = parseInt(row.count, 10);
    }

    return {
      total: parseInt(result.rows[0].total, 10),
      open: parseInt(result.rows[0].open, 10),
      resolved: parseInt(result.rows[0].resolved, 10),
      byType,
    };
  }

  // --------------------------------------------------------------------------
  // REPORT PROBLEM (General problem, not tied to specific order)
  // --------------------------------------------------------------------------

  async reportProblem(dto: {
    problemType: string;
    location?: string;
    description: string;
    reportedBy: string;
  }): Promise<{
    problemId: string;
    problemType: string;
    location: string | null;
    description: string;
    reportedBy: string;
    reportedAt: Date;
    status: string;
  }> {
    const client = await getPool();

    try {
      // Generate problem ID
      const problemId = `PROB-${Date.now()}-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;

      // Insert problem report into order_exceptions with a special type
      // This allows us to reuse existing exception tracking infrastructure
      const result = await client.query(
        `INSERT INTO order_exceptions
          (exception_id, order_id, order_item_id, sku, type, status,
           quantity_expected, quantity_actual, reason, reported_by,
           reported_at)
         VALUES ($1, NULL, NULL, NULL, $2, 'OPEN', 0, 0, $3, $4, NOW())
         RETURNING *`,
        [problemId, `PROBLEM_${dto.problemType.toUpperCase()}`, dto.description, dto.reportedBy]
      );

      logger.info('Problem reported', {
        problemId,
        problemType: dto.problemType,
        location: dto.location,
        reportedBy: dto.reportedBy,
      });

      // Send notification about the problem
      await notifyExceptionReported({
        exceptionId: problemId,
        orderId: 'N/A',
        type: dto.problemType as ExceptionType,
        description: `${dto.problemType}${dto.location ? ` at ${dto.location}` : ''}: ${dto.description}`,
        userId: dto.reportedBy,
      });

      return {
        problemId,
        problemType: dto.problemType,
        location: dto.location || null,
        description: dto.description,
        reportedBy: dto.reportedBy,
        reportedAt: new Date(),
        status: 'OPEN',
      };
    } catch (error) {
      logger.error('Error reporting problem', error);
      throw error;
    }
  }

  // --------------------------------------------------------------------------
  // GET PROBLEM REPORTS
  // --------------------------------------------------------------------------

  async getProblemReports(filters?: {
    status?: string;
    problemType?: string;
    limit?: number;
    offset?: number;
  }): Promise<{
    problems: Array<{
      problemId: string;
      problemType: string;
      location: string | null;
      description: string;
      reportedBy: string;
      reportedAt: Date;
      status: string;
      resolution?: string;
      resolvedBy?: string;
      resolvedAt?: Date;
    }>;
    total: number;
  }> {
    const client = await getPool();

    const conditions: string[] = ['order_id IS NULL']; // Problem reports have no order
    const params: any[] = [];
    let paramCount = 1;

    if (filters?.status) {
      conditions.push(`status = $${paramCount}`);
      params.push(filters.status);
      paramCount++;
    }

    if (filters?.problemType) {
      conditions.push(`type LIKE $${paramCount}`);
      params.push(`PROBLEM_${filters.problemType.toUpperCase()}%`);
      paramCount++;
    }

    const whereClause = conditions.join(' AND ');

    // Get total count
    const countResult = await client.query(
      `SELECT COUNT(*) as count FROM order_exceptions WHERE ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].count, 10);

    // Get paginated results
    const limit = filters?.limit || 50;
    const offset = filters?.offset || 0;

    const result = await client.query(
      `SELECT * FROM order_exceptions
       WHERE ${whereClause}
       ORDER BY reported_at DESC
       LIMIT $${paramCount} OFFSET $${paramCount + 1}`,
      [...params, limit, offset]
    );

    const problems = result.rows.map(row => ({
      problemId: row.exception_id,
      problemType: row.type.replace('PROBLEM_', '').replace(/_/g, ' '),
      location: null, // Location is stored in reason
      description: row.reason,
      reportedBy: row.reported_by,
      reportedAt: new Date(row.reported_at),
      status: row.status,
      resolution: row.resolution,
      resolvedBy: row.resolved_by,
      resolvedAt: row.resolved_at ? new Date(row.resolved_at) : undefined,
    }));

    return { problems, total };
  }

  // --------------------------------------------------------------------------
  // RESOLVE PROBLEM REPORT
  // --------------------------------------------------------------------------

  async resolveProblemReport(dto: {
    problemId: string;
    resolution: string;
    notes?: string;
    resolvedBy: string;
  }): Promise<{
    problemId: string;
    status: string;
    resolution: string;
    resolvedBy: string;
    resolvedAt: Date;
  }> {
    const client = await getPool();

    try {
      const result = await client.query(
        `UPDATE order_exceptions
         SET status = 'RESOLVED',
             resolution = $1,
             resolution_notes = $2,
             resolved_by = $3,
             resolved_at = NOW()
         WHERE exception_id = $4 AND order_id IS NULL
         RETURNING *`,
        [dto.resolution, dto.notes || null, dto.resolvedBy, dto.problemId]
      );

      if (result.rows.length === 0) {
        throw new Error(`Problem report ${dto.problemId} not found`);
      }

      logger.info('Problem report resolved', {
        problemId: dto.problemId,
        resolution: dto.resolution,
        resolvedBy: dto.resolvedBy,
      });

      return {
        problemId: dto.problemId,
        status: 'RESOLVED',
        resolution: dto.resolution,
        resolvedBy: dto.resolvedBy,
        resolvedAt: new Date(),
      };
    } catch (error) {
      logger.error('Error resolving problem report', error);
      throw error;
    }
  }

  // --------------------------------------------------------------------------
  // HELPER METHODS
  // --------------------------------------------------------------------------

  private mapRowToException(row: any): OrderException {
    return {
      exceptionId: row.exception_id,
      orderId: row.order_id,
      orderItemId: row.order_item_id,
      sku: row.sku,
      type: row.type,
      status: row.status,
      resolution: row.resolution,
      quantityExpected: parseInt(row.quantity_expected, 10),
      quantityActual: parseInt(row.quantity_actual, 10),
      quantityShort: parseInt(row.quantity_short, 10),
      reason: row.reason,
      reportedBy: row.reported_by,
      reportedAt: new Date(row.reported_at),
      reviewedBy: row.reviewed_by,
      reviewedAt: row.reviewed_at ? new Date(row.reviewed_at) : undefined,
      resolvedBy: row.resolved_by,
      resolvedAt: row.resolved_at ? new Date(row.resolved_at) : undefined,
      resolutionNotes: row.resolution_notes,
      substituteSku: row.substitute_sku,
      // Cycle count variance specific fields
      cycleCountEntryId: row.cycle_count_entry_id,
      cycleCountPlanId: row.cycle_count_plan_id,
      binLocation: row.bin_location,
      systemQuantity: row.system_quantity ? parseFloat(row.system_quantity) : undefined,
      countedQuantity: row.counted_quantity ? parseFloat(row.counted_quantity) : undefined,
      variancePercent: row.variance_percent ? parseFloat(row.variance_percent) : undefined,
      varianceReasonCode: row.variance_reason_code,
    };
  }
}

// Singleton instance
export const orderExceptionService = new OrderExceptionService();
