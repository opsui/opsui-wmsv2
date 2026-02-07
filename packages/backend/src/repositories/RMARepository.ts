/**
 * RMA Repository
 *
 * Data access layer for Return Merchandise Authorization functionality
 */

import { getPool } from '../db/client';
import { logger } from '../config/logger';
import {
  RMARequest,
  RMAInspection,
  RMAActivity,
  RMACommunication,
  RMAStatus,
  RMAListFilters,
} from '@opsui/shared';

export class RMARepository {
  // ========================================================================
  // RMA REQUESTS
  // ========================================================================

  async createRMARequest(
    rma: Omit<RMARequest, 'rmaId' | 'rmaNumber' | 'createdAt' | 'updatedAt'>
  ): Promise<RMARequest> {
    const client = await getPool();

    // Generate RMA ID and number
    const rmaId = `RMA-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const rmaNumber = `RMA-${Date.now()}`;

    const result = await client.query(
      `INSERT INTO rma_requests
        (rma_id, rma_number, order_id, order_item_id, customer_id, customer_name, customer_email,
         customer_phone, sku, product_name, quantity, reason, reason_description, status,
         priority, customer_notes, images, created_by, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, NOW())
       RETURNING *`,
      [
        rmaId,
        rmaNumber,
        rma.orderId,
        rma.orderItemId,
        rma.customerId || null,
        rma.customerName,
        rma.customerEmail || null,
        rma.customerPhone || null,
        rma.sku,
        rma.productName,
        rma.quantity,
        rma.reason,
        rma.reasonDescription || null,
        rma.status || RMAStatus.PENDING,
        rma.priority || 'NORMAL',
        rma.customerNotes || null,
        rma.images ? JSON.stringify(rma.images) : null,
        rma.createdBy,
      ]
    );

    logger.info('RMA request created', { rmaId, rmaNumber });
    return this.mapRowToRMARequest(result.rows[0]);
  }

  async findRMAById(rmaId: string): Promise<RMARequest | null> {
    const client = await getPool();
    const result = await client.query(`SELECT * FROM rma_requests WHERE rma_id = $1`, [rmaId]);

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToRMARequest(result.rows[0]);
  }

  async findRMAByNumber(rmaNumber: string): Promise<RMARequest | null> {
    const client = await getPool();
    const result = await client.query(`SELECT * FROM rma_requests WHERE rma_number = $1`, [
      rmaNumber,
    ]);

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToRMARequest(result.rows[0]);
  }

  async findAllRMAs(filters?: RMAListFilters): Promise<{ requests: RMARequest[]; total: number }> {
    const client = await getPool();

    const conditions: string[] = [];
    const params: any[] = [];
    let paramCount = 1;

    if (filters?.status) {
      conditions.push(`status = $${paramCount}`);
      params.push(filters.status);
      paramCount++;
    }

    if (filters?.reason) {
      conditions.push(`reason = $${paramCount}`);
      params.push(filters.reason);
      paramCount++;
    }

    if (filters?.priority) {
      conditions.push(`priority = $${paramCount}`);
      params.push(filters.priority);
      paramCount++;
    }

    if (filters?.customerId) {
      conditions.push(`customer_id = $${paramCount}`);
      params.push(filters.customerId);
      paramCount++;
    }

    if (filters?.orderId) {
      conditions.push(`order_id = $${paramCount}`);
      params.push(filters.orderId);
      paramCount++;
    }

    if (filters?.startDate) {
      conditions.push(`requested_date >= $${paramCount}`);
      params.push(filters.startDate);
      paramCount++;
    }

    if (filters?.endDate) {
      conditions.push(`requested_date <= $${paramCount}`);
      params.push(filters.endDate);
      paramCount++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Get total count
    const countResult = await client.query(
      `SELECT COUNT(*) as count FROM rma_requests ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].count, 10);

    // Get paginated results
    const limit = filters?.limit || 50;
    const offset = filters?.offset || 0;

    const result = await client.query(
      `SELECT * FROM rma_requests ${whereClause}
       ORDER BY
         CASE priority
           WHEN 'URGENT' THEN 1
           WHEN 'HIGH' THEN 2
           WHEN 'NORMAL' THEN 3
           WHEN 'LOW' THEN 4
         END,
         requested_date DESC
       LIMIT $${paramCount} OFFSET $${paramCount + 1}`,
      [...params, limit, offset]
    );

    const requests = result.rows.map(row => this.mapRowToRMARequest(row));

    return { requests, total };
  }

  async updateRMARequest(rmaId: string, updates: Partial<RMARequest>): Promise<RMARequest | null> {
    const client = await getPool();

    const fields: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    const updatableFields: (keyof RMARequest)[] = [
      'status',
      'priority',
      'condition',
      'resolutionType',
      'disposition',
      'refundAmount',
      'replacementOrderId',
      'approvedAt',
      'approvedBy',
      'receivedAt',
      'receivedBy',
      'inspectedAt',
      'inspectedBy',
      'resolvedAt',
      'resolvedBy',
      'closedAt',
      'closedBy',
      'trackingNumber',
      'carrier',
      'returnLabelUrl',
      'internalNotes',
      'resolutionNotes',
      'rejectionReason',
      'refundMethod',
      'refundProcessedAt',
      'replacementShippedAt',
      'images',
      'attachments',
      'updatedBy',
    ];

    for (const field of updatableFields) {
      const key = this.camelToSnake(field);
      if (updates[field] !== undefined) {
        fields.push(`${key} = $${paramCount}`);
        if (
          field === 'images' ||
          field === 'attachments' ||
          field === 'condition' ||
          field === 'disposition' ||
          field === 'resolutionType'
        ) {
          values.push(updates[field]);
        } else {
          values.push(updates[field]);
        }
        paramCount++;
      }
    }

    if (fields.length === 0) {
      return await this.findRMAById(rmaId);
    }

    fields.push(`updated_at = NOW()`);
    values.push(rmaId);
    paramCount++;

    const result = await client.query(
      `UPDATE rma_requests SET ${fields.join(', ')} WHERE rma_id = $${paramCount} RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return null;
    }

    logger.info('RMA request updated', { rmaId });
    return this.mapRowToRMARequest(result.rows[0]);
  }

  // ========================================================================
  // RMA INSPECTIONS
  // ========================================================================

  async createInspection(
    inspection: Omit<RMAInspection, 'inspectionId' | 'createdAt'>
  ): Promise<RMAInspection> {
    const client = await getPool();

    const inspectionId = `RMAI-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const result = await client.query(
      `INSERT INTO rma_inspections
        (inspection_id, rma_id, inspected_by, inspected_at, condition, disposition,
         findings, recommended_resolution, estimated_refund, repair_cost,
         refurbishment_cost, notes, images, created_at)
       VALUES ($1, $2, $3, NOW(), $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW())
       RETURNING *`,
      [
        inspectionId,
        inspection.rmaId,
        inspection.inspectedBy,
        inspection.condition,
        inspection.disposition,
        inspection.findings,
        inspection.recommendedResolution,
        inspection.estimatedRefund || null,
        inspection.repairCost || null,
        inspection.refurbishmentCost || null,
        inspection.notes || null,
        inspection.images ? JSON.stringify(inspection.images) : null,
      ]
    );

    logger.info('RMA inspection created', { inspectionId, rmaId: inspection.rmaId });
    return result.rows[0] as RMAInspection;
  }

  async findInspectionsByRMA(rmaId: string): Promise<RMAInspection[]> {
    const client = await getPool();
    const result = await client.query(
      `SELECT * FROM rma_inspections WHERE rma_id = $1 ORDER BY inspected_at DESC`,
      [rmaId]
    );
    return result.rows as RMAInspection[];
  }

  // ========================================================================
  // RMA ACTIVITY
  // ========================================================================

  async logActivity(activity: Omit<RMAActivity, 'activityId' | 'createdAt'>): Promise<RMAActivity> {
    const client = await getPool();

    const activityId = `RMAA-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const result = await client.query(
      `INSERT INTO rma_activity
        (activity_id, rma_id, activity_type, description, old_status, new_status,
         user_id, user_name, metadata, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
       RETURNING *`,
      [
        activityId,
        activity.rmaId,
        activity.activityType,
        activity.description,
        activity.oldStatus || null,
        activity.newStatus || null,
        activity.userId,
        activity.userName,
        activity.metadata ? JSON.stringify(activity.metadata) : null,
      ]
    );

    logger.info('RMA activity logged', { activityId, rmaId: activity.rmaId });
    return result.rows[0] as RMAActivity;
  }

  async findActivitiesByRMA(rmaId: string, limit: number = 50): Promise<RMAActivity[]> {
    const client = await getPool();
    const result = await client.query(
      `SELECT * FROM rma_activity WHERE rma_id = $1 ORDER BY created_at DESC LIMIT $2`,
      [rmaId, limit]
    );
    return result.rows as RMAActivity[];
  }

  // ========================================================================
  // RMA COMMUNICATIONS
  // ========================================================================

  async addCommunication(
    communication: Omit<RMACommunication, 'communicationId' | 'createdAt'>
  ): Promise<RMACommunication> {
    const client = await getPool();

    const communicationId = `RMAC-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const result = await client.query(
      `INSERT INTO rma_communications
        (communication_id, rma_id, type, direction, subject, content, sent_by, sent_at, attachments, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
       RETURNING *`,
      [
        communicationId,
        communication.rmaId,
        communication.type,
        communication.direction,
        communication.subject || null,
        communication.content,
        communication.sentBy || null,
        communication.sentAt || null,
        communication.attachments ? JSON.stringify(communication.attachments) : null,
      ]
    );

    logger.info('RMA communication added', { communicationId, rmaId: communication.rmaId });
    return result.rows[0] as RMACommunication;
  }

  async findCommunicationsByRMA(rmaId: string): Promise<RMACommunication[]> {
    const client = await getPool();
    const result = await client.query(
      `SELECT * FROM rma_communications WHERE rma_id = $1 ORDER BY created_at DESC`,
      [rmaId]
    );
    return result.rows as RMACommunication[];
  }

  // ========================================================================
  // DASHBOARD STATISTICS
  // ========================================================================

  async getDashboardStats(): Promise<{
    pendingRequests: number;
    awaitingApproval: number;
    inProgress: number;
    completedToday: number;
    completedThisWeek: number;
    completedThisMonth: number;
    urgent: number;
    overdue: number;
    totalRefundValue: number;
    pendingRefundValue: number;
  }> {
    const client = await getPool();

    const [pendingResult, inProgressResult, completedTodayResult, urgentResult] = await Promise.all(
      [
        client.query(`SELECT COUNT(*) as count FROM rma_requests WHERE status = 'PENDING'`),
        client.query(
          `SELECT COUNT(*) as count, COALESCE(SUM(refund_amount), 0) as value FROM rma_requests
           WHERE status IN ('APPROVED', 'RECEIVED', 'INSPECTING', 'AWAITING_DECISION')`
        ),
        client.query(
          `SELECT COUNT(*) as count FROM rma_requests
           WHERE status IN ('REFUNDED', 'REPLACED', 'REPAIRED', 'CLOSED')
           AND DATE(resolved_at) = CURRENT_DATE`
        ),
        client.query(
          `SELECT COUNT(*) as count FROM rma_requests
           WHERE priority = 'URGENT' AND status NOT IN ('REJECTED', 'CLOSED', 'REFUNDED', 'REPLACED', 'REPAIRED')`
        ),
      ]
    );

    // Get completed this week
    const completedWeekResult = await client.query(
      `SELECT COUNT(*) as count FROM rma_requests
       WHERE status IN ('REFUNDED', 'REPLACED', 'REPAIRED', 'CLOSED')
       AND resolved_at >= DATE_TRUNC('week', CURRENT_DATE)`
    );

    // Get completed this month
    const completedMonthResult = await client.query(
      `SELECT COUNT(*) as count FROM rma_requests
       WHERE status IN ('REFUNDED', 'REPLACED', 'REPAIRED', 'CLOSED')
       AND DATE_TRUNC('month', CURRENT_DATE) <= resolved_at`
    );

    // Get overdue (pending for more than 7 days)
    const overdueResult = await client.query(
      `SELECT COUNT(*) as count FROM rma_requests
       WHERE status = 'PENDING' AND requested_date < NOW() - INTERVAL '7 days'`
    );

    // Get total refund value for pending approvals
    const pendingRefundValueResult = await client.query(
      `SELECT COALESCE(SUM(refund_amount), 0) as value FROM rma_requests
       WHERE status = 'PENDING'`
    );

    return {
      pendingRequests: parseInt(pendingResult.rows[0].count, 10),
      awaitingApproval: parseInt(pendingResult.rows[0].count, 10), // Same as pending for now
      inProgress: parseInt(inProgressResult.rows[0].count, 10),
      completedToday: parseInt(completedTodayResult.rows[0].count, 10),
      completedThisWeek: parseInt(completedWeekResult.rows[0].count, 10),
      completedThisMonth: parseInt(completedMonthResult.rows[0].count, 10),
      urgent: parseInt(urgentResult.rows[0].count, 10),
      overdue: parseInt(overdueResult.rows[0].count, 10),
      totalRefundValue: parseFloat(inProgressResult.rows[0].value || '0'),
      pendingRefundValue: parseFloat(pendingRefundValueResult.rows[0].value || '0'),
    };
  }

  // ========================================================================
  // HELPER METHODS
  // ========================================================================

  private mapRowToRMARequest(row: any): RMARequest {
    return {
      rmaId: row.rma_id,
      rmaNumber: row.rma_number,
      orderId: row.order_id,
      orderItemId: row.order_item_id,
      customerId: row.customer_id,
      customerName: row.customer_name,
      customerEmail: row.customer_email,
      customerPhone: row.customer_phone,
      sku: row.sku,
      productName: row.product_name,
      quantity: parseInt(row.quantity),
      reason: row.reason,
      reasonDescription: row.reason_description,
      status: row.status,
      priority: row.priority,
      condition: row.condition,
      resolutionType: row.resolution_type,
      disposition: row.disposition,
      refundAmount: row.refund_amount ? parseFloat(row.refund_amount) : undefined,
      replacementOrderId: row.replacement_order_id,
      requestedDate: row.requested_date,
      approvedAt: row.approved_at,
      approvedBy: row.approved_by,
      receivedAt: row.received_at,
      receivedBy: row.received_by,
      inspectedAt: row.inspected_at,
      inspectedBy: row.inspected_by,
      resolvedAt: row.resolved_at,
      resolvedBy: row.resolved_by,
      closedAt: row.closed_at,
      closedBy: row.closed_by,
      trackingNumber: row.tracking_number,
      carrier: row.carrier,
      returnLabelUrl: row.return_label_url,
      customerNotes: row.customer_notes,
      internalNotes: row.internal_notes,
      resolutionNotes: row.resolution_notes,
      rejectionReason: row.rejection_reason,
      refundMethod: row.refund_method,
      refundProcessedAt: row.refund_processed_at,
      replacementShippedAt: row.replacement_shipped_at,
      images: row.images
        ? typeof row.images === 'string'
          ? JSON.parse(row.images)
          : row.images
        : [],
      attachments: row.attachments
        ? typeof row.attachments === 'string'
          ? JSON.parse(row.attachments)
          : row.attachments
        : [],
      createdBy: row.created_by,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      updatedBy: row.updated_by,
    };
  }

  private camelToSnake(str: string): string {
    return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
  }
}

// Singleton instance
export const rmaRepository = new RMARepository();
