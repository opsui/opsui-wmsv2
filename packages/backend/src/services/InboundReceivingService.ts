/**
 * Inbound Receiving Service
 *
 * Handles Advance Shipping Notices (ASN), receipts, and putaway workflows
 */

import { getPool } from '../db/client';
import { logger } from '../config/logger';
import { nanoid } from 'nanoid';
import {
  ASNStatus,
  ASNLineStatus,
  ReceiptType,
  ReceiptStatus,
  QualityStatus,
  PutawayStatus,
  AdvanceShippingNotice,
  ASNLineItem,
  Receipt,
  ReceiptLineItem,
  PutawayTask,
  CreateASNDTO,
  CreateReceiptDTO,
  UpdatePutawayTaskDTO,
} from '@opsui/shared';

// ============================================================================
// INBOUND RECEIVING SERVICE
// ============================================================================

export class InboundReceivingService {
  // ==========================================================================
  // DASHBOARD METHODS
  // ==========================================================================

  /**
   * Get dashboard metrics for inwards goods
   */
  async getDashboardMetrics(): Promise<{
    pendingASNs: number;
    inTransitASNs: number;
    activeReceipts: number;
    pendingPutaway: number;
    inProgressPutaway: number;
    todayReceived: number;
    todayPutaway: number;
  }> {
    const client = await getPool();

    // Get counts
    const [
      pendingASNResult,
      inTransitASNResult,
      activeReceiptResult,
      pendingPutawayResult,
      inProgressPutawayResult,
    ] = await Promise.all([
      client.query(`SELECT COUNT(*) as count FROM advance_shipping_notices WHERE status = $1`, [
        ASNStatus.PENDING,
      ]),
      client.query(`SELECT COUNT(*) as count FROM advance_shipping_notices WHERE status = $1`, [
        ASNStatus.IN_TRANSIT,
      ]),
      client.query(`SELECT COUNT(*) as count FROM receipts WHERE status = $1`, [
        ReceiptStatus.RECEIVING,
      ]),
      client.query(`SELECT COUNT(*) as count FROM putaway_tasks WHERE status = $1`, [
        PutawayStatus.PENDING,
      ]),
      client.query(`SELECT COUNT(*) as count FROM putaway_tasks WHERE status = $1`, [
        PutawayStatus.IN_PROGRESS,
      ]),
    ]);

    // Get today's completed putaway count
    const todayPutawayResult = await client.query(
      `SELECT COUNT(*) as count FROM putaway_tasks WHERE completed_at::date = CURRENT_DATE`
    );

    // Get today's received receipts count
    const todayReceivedResult = await client.query(
      `SELECT COUNT(*) as count FROM receipts WHERE created_at::date = CURRENT_DATE`
    );

    return {
      pendingASNs: parseInt(pendingASNResult.rows[0].count, 10),
      inTransitASNs: parseInt(inTransitASNResult.rows[0].count, 10),
      activeReceipts: parseInt(activeReceiptResult.rows[0].count, 10),
      pendingPutaway: parseInt(pendingPutawayResult.rows[0].count, 10),
      inProgressPutaway: parseInt(inProgressPutawayResult.rows[0].count, 10),
      todayReceived: parseInt(todayReceivedResult.rows[0].count, 10),
      todayPutaway: parseInt(todayPutawayResult.rows[0].count, 10),
    };
  }

  // ==========================================================================
  // ASN METHODS
  // ==========================================================================

  /**
   * Create a new Advance Shipping Notice
   */
  async createASN(dto: CreateASNDTO): Promise<AdvanceShippingNotice> {
    const client = await getPool();

    try {
      await client.query('BEGIN');

      // Generate ASN ID
      const asnId = `ASN-${nanoid(10)}`.toUpperCase();

      // Insert ASN
      await client.query(
        `INSERT INTO advance_shipping_notices
          (asn_id, supplier_id, purchase_order_number, status, expected_arrival_date,
           carrier, tracking_number, shipment_notes, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING *`,
        [
          asnId,
          dto.supplierId,
          dto.purchaseOrderNumber,
          ASNStatus.PENDING,
          dto.expectedArrivalDate,
          dto.carrier || null,
          dto.trackingNumber || null,
          dto.shipmentNotes || null,
          dto.createdBy,
        ]
      );

      // Insert line items
      for (const item of dto.lineItems) {
        const lineItemId = `ASNL-${nanoid(10)}`.toUpperCase();
        await client.query(
          `INSERT INTO asn_line_items
            (line_item_id, asn_id, sku, expected_quantity, unit_cost,
             lot_number, expiration_date, receiving_status, line_notes)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [
            lineItemId,
            asnId,
            item.sku,
            item.expectedQuantity,
            item.unitCost,
            item.lotNumber || null,
            item.expirationDate || null,
            ASNLineStatus.PENDING,
            item.lineNotes || null,
          ]
        );
      }

      await client.query('COMMIT');

      logger.info('ASN created', { asnId, supplierId: dto.supplierId });
      return await this.getASN(asnId);
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Error creating ASN', error);
      throw error;
    }
  }

  /**
   * Get ASN by ID
   */
  async getASN(asnId: string): Promise<AdvanceShippingNotice> {
    const client = await getPool();

    const result = await client.query(`SELECT * FROM advance_shipping_notices WHERE asn_id = $1`, [
      asnId,
    ]);

    if (result.rows.length === 0) {
      throw new Error(`ASN ${asnId} not found`);
    }

    const asn = this.mapRowToASN(result.rows[0]);

    // Get line items
    const lineItemsResult = await client.query(
      `SELECT * FROM asn_line_items WHERE asn_id = $1 ORDER BY line_item_id`,
      [asnId]
    );

    asn.lineItems = lineItemsResult.rows.map(row => this.mapRowToASNLineItem(row));

    return asn;
  }

  /**
   * Get all ASNs with optional filters
   */
  async getAllASNs(filters?: {
    status?: ASNStatus;
    supplierId?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ asns: AdvanceShippingNotice[]; total: number }> {
    const client = await getPool();

    const conditions: string[] = [];
    const params: any[] = [];
    let paramCount = 1;

    if (filters?.status) {
      conditions.push(`status = $${paramCount}`);
      params.push(filters.status);
      paramCount++;
    }

    if (filters?.supplierId) {
      conditions.push(`supplier_id = $${paramCount}`);
      params.push(filters.supplierId);
      paramCount++;
    }

    const whereClause = conditions.length > 0 ? conditions.join(' AND ') : '1=1';

    // Get total count
    const countResult = await client.query(
      `SELECT COUNT(*) as count FROM advance_shipping_notices WHERE ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].count, 10);

    // Get paginated results
    const limit = filters?.limit || 50;
    const offset = filters?.offset || 0;

    const result = await client.query(
      `SELECT * FROM advance_shipping_notices
       WHERE ${whereClause}
       ORDER BY created_at DESC
       LIMIT $${paramCount} OFFSET $${paramCount + 1}`,
      [...params, limit, offset]
    );

    const asns = await Promise.all(
      result.rows.map(async row => {
        const asn = this.mapRowToASN(row);
        // Get line items for each ASN
        const lineItemsResult = await client.query(
          `SELECT * FROM asn_line_items WHERE asn_id = $1 ORDER BY line_item_id`,
          [asn.asnId]
        );
        asn.lineItems = lineItemsResult.rows.map(r => this.mapRowToASNLineItem(r));
        return asn;
      })
    );

    return { asns, total };
  }

  /**
   * Update ASN status
   */
  async updateASNStatus(asnId: string, status: ASNStatus): Promise<AdvanceShippingNotice> {
    const client = await getPool();

    const result = await client.query(
      `UPDATE advance_shipping_notices
       SET status = $1, updated_at = NOW()
       WHERE asn_id = $2
       RETURNING *`,
      [status, asnId]
    );

    if (result.rows.length === 0) {
      throw new Error(`ASN ${asnId} not found`);
    }

    logger.info('ASN status updated', { asnId, status });
    return await this.getASN(asnId);
  }

  // ==========================================================================
  // RECEIPT METHODS
  // ==========================================================================

  /**
   * Create a new receipt
   */
  async createReceipt(dto: CreateReceiptDTO): Promise<Receipt> {
    const client = await getPool();

    try {
      await client.query('BEGIN');

      // Generate receipt ID
      const receiptId = `RCP-${nanoid(10)}`.toUpperCase();

      // Insert receipt
      await client.query(
        `INSERT INTO receipts
          (receipt_id, asn_id, receipt_date, receipt_type, status, received_by)
         VALUES ($1, $2, CURRENT_DATE, $3, $4, $5)
         RETURNING *`,
        [receiptId, dto.asnId || null, dto.receiptType, ReceiptStatus.RECEIVING, dto.receivedBy]
      );

      // Insert line items and create putaway tasks
      for (const item of dto.lineItems) {
        const receiptLineId = `RCPL-${nanoid(10)}`.toUpperCase();

        await client.query(
          `INSERT INTO receipt_line_items
            (receipt_line_id, receipt_id, asn_line_item_id, sku, quantity_ordered,
             quantity_received, quantity_damaged, quality_status, putaway_status,
             unit_cost, lot_number, expiration_date, notes)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
          [
            receiptLineId,
            receiptId,
            item.asnLineItemId || null,
            item.sku,
            item.quantityOrdered,
            item.quantityReceived,
            item.quantityDamaged,
            QualityStatus.PENDING,
            PutawayStatus.PENDING,
            item.unitCost || null,
            item.lotNumber || null,
            item.expirationDate || null,
            item.notes || null,
          ]
        );

        // Create putaway task for received goods
        const quantityToPutaway = item.quantityReceived - item.quantityDamaged;
        if (quantityToPutaway > 0) {
          await this.createPutawayTasksForReceiptLine(
            client,
            receiptLineId,
            item.sku,
            quantityToPutaway
          );
        }
      }

      await client.query('COMMIT');

      logger.info('Receipt created', { receiptId, asnId: dto.asnId });
      return await this.getReceipt(receiptId);
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Error creating receipt', error);
      throw error;
    }
  }

  /**
   * Get receipt by ID
   */
  async getReceipt(receiptId: string): Promise<Receipt> {
    const client = await getPool();

    const result = await client.query(`SELECT * FROM receipts WHERE receipt_id = $1`, [receiptId]);

    if (result.rows.length === 0) {
      throw new Error(`Receipt ${receiptId} not found`);
    }

    const receipt = this.mapRowToReceipt(result.rows[0]);

    // Get line items
    const lineItemsResult = await client.query(
      `SELECT * FROM receipt_line_items WHERE receipt_id = $1 ORDER BY receipt_line_id`,
      [receiptId]
    );

    receipt.lineItems = lineItemsResult.rows.map(row => this.mapRowToReceiptLineItem(row));

    return receipt;
  }

  /**
   * Get all receipts with optional filters
   */
  async getAllReceipts(filters?: {
    status?: ReceiptStatus;
    asnId?: string;
    receiptType?: ReceiptType;
    limit?: number;
    offset?: number;
  }): Promise<{ receipts: Receipt[]; total: number }> {
    const client = await getPool();

    const conditions: string[] = [];
    const params: any[] = [];
    let paramCount = 1;

    if (filters?.status) {
      conditions.push(`status = $${paramCount}`);
      params.push(filters.status);
      paramCount++;
    }

    if (filters?.asnId) {
      conditions.push(`asn_id = $${paramCount}`);
      params.push(filters.asnId);
      paramCount++;
    }

    if (filters?.receiptType) {
      conditions.push(`receipt_type = $${paramCount}`);
      params.push(filters.receiptType);
      paramCount++;
    }

    const whereClause = conditions.length > 0 ? conditions.join(' AND ') : '1=1';

    // Get total count
    const countResult = await client.query(
      `SELECT COUNT(*) as count FROM receipts WHERE ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].count, 10);

    // Get paginated results
    const limit = filters?.limit || 50;
    const offset = filters?.offset || 0;

    const result = await client.query(
      `SELECT * FROM receipts
       WHERE ${whereClause}
       ORDER BY created_at DESC
       LIMIT $${paramCount} OFFSET $${paramCount + 1}`,
      [...params, limit, offset]
    );

    const receipts = await Promise.all(
      result.rows.map(async row => {
        const receipt = this.mapRowToReceipt(row);
        // Get line items for each receipt
        const lineItemsResult = await client.query(
          `SELECT * FROM receipt_line_items WHERE receipt_id = $1 ORDER BY receipt_line_id`,
          [receipt.receiptId]
        );
        receipt.lineItems = lineItemsResult.rows.map(r => this.mapRowToReceiptLineItem(r));
        return receipt;
      })
    );

    return { receipts, total };
  }

  // ==========================================================================
  // PUTAWAY METHODS
  // ==========================================================================

  /**
   * Create putaway tasks for a receipt line item
   */
  private async createPutawayTasksForReceiptLine(
    client: any,
    receiptLineId: string,
    sku: string,
    quantity: number
  ): Promise<void> {
    // Get SKU's default bin location
    const skuResult = await client.query(`SELECT bin_locations FROM skus WHERE sku = $1`, [sku]);

    if (skuResult.rows.length === 0) {
      throw new Error(`SKU ${sku} not found`);
    }

    const binLocations: string[] = skuResult.rows[0].bin_locations;
    const targetBin = binLocations[0] || 'STAGING'; // Default to first bin or staging

    const putawayTaskId = `PTA-${nanoid(10)}`.toUpperCase();

    await client.query(
      `INSERT INTO putaway_tasks
        (putaway_task_id, receipt_line_id, sku, quantity_to_putaway, quantity_putaway,
         target_bin_location, status, priority)
       VALUES ($1, $2, $3, $4, 0, $5, $6, $7)`,
      [putawayTaskId, receiptLineId, sku, quantity, targetBin, PutawayStatus.PENDING, 'NORMAL']
    );
  }

  /**
   * Get putaway tasks by status
   */
  async getPutawayTasks(filters?: {
    status?: PutawayStatus;
    assignedTo?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ tasks: PutawayTask[]; total: number }> {
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

    const whereClause = conditions.length > 0 ? conditions.join(' AND ') : '1=1';

    // Get total count
    const countResult = await client.query(
      `SELECT COUNT(*) as count FROM putaway_tasks WHERE ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].count, 10);

    // Get paginated results
    const limit = filters?.limit || 50;
    const offset = filters?.offset || 0;

    const result = await client.query(
      `SELECT * FROM putaway_tasks
       WHERE ${whereClause}
       ORDER BY priority DESC, created_at ASC
       LIMIT $${paramCount} OFFSET $${paramCount + 1}`,
      [...params, limit, offset]
    );

    const tasks = result.rows.map(row => this.mapRowToPutawayTask(row));

    return { tasks, total };
  }

  /**
   * Assign putaway task to user
   */
  async assignPutawayTask(putawayTaskId: string, userId: string): Promise<PutawayTask> {
    const client = await getPool();

    const result = await client.query(
      `UPDATE putaway_tasks
       SET assigned_to = $1, assigned_at = NOW(), status = $2, updated_at = NOW()
       WHERE putaway_task_id = $3
       RETURNING *`,
      [userId, PutawayStatus.IN_PROGRESS, putawayTaskId]
    );

    if (result.rows.length === 0) {
      throw new Error(`Putaway task ${putawayTaskId} not found`);
    }

    logger.info('Putaway task assigned', { putawayTaskId, userId });
    return this.mapRowToPutawayTask(result.rows[0]);
  }

  /**
   * Update putaway task (complete or partial putaway)
   */
  async updatePutawayTask(dto: UpdatePutawayTaskDTO): Promise<PutawayTask> {
    const client = await getPool();

    try {
      await client.query('BEGIN');

      // Get current task
      const currentResult = await client.query(
        `SELECT * FROM putaway_tasks WHERE putaway_task_id = $1 FOR UPDATE`,
        [dto.putawayTaskId]
      );

      if (currentResult.rows.length === 0) {
        throw new Error(`Putaway task ${dto.putawayTaskId} not found`);
      }

      const current = currentResult.rows[0];
      const newQuantityPutaway = current.quantity_putaway + dto.quantityPutaway;

      // Update task
      const updateResult = await client.query(
        `UPDATE putaway_tasks
         SET quantity_putaway = $1,
             status = CASE
               WHEN $1 >= quantity_to_putaway THEN $2
               ELSE status
             END,
             completed_at = CASE
               WHEN $1 >= quantity_to_putaway THEN NOW()
               ELSE completed_at
             END,
             completed_by = CASE
               WHEN $1 >= quantity_to_putaway THEN $3
               ELSE completed_by
             END,
             updated_at = NOW()
         WHERE putaway_task_id = $4
         RETURNING *`,
        [newQuantityPutaway, PutawayStatus.COMPLETED, dto.userId, dto.putawayTaskId]
      );

      const updatedTask = this.mapRowToPutawayTask(updateResult.rows[0]);

      // If task is completed, update receipt line item status
      if (updatedTask.status === PutawayStatus.COMPLETED) {
        await client.query(
          `UPDATE receipt_line_items
           SET putaway_status = $2
           WHERE receipt_line_id = $3`,
          [PutawayStatus.COMPLETED, current.receipt_line_id]
        );
      }

      await client.query('COMMIT');

      logger.info('Putaway task updated', {
        putawayTaskId: dto.putawayTaskId,
        quantityPutaway: dto.quantityPutaway,
        userId: dto.userId,
      });

      return updatedTask;
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Error updating putaway task', error);
      throw error;
    }
  }

  // ==========================================================================
  // HELPER METHODS
  // ==========================================================================

  private mapRowToASN(row: any): AdvanceShippingNotice {
    return {
      asnId: row.asn_id,
      supplierId: row.supplier_id,
      purchaseOrderNumber: row.purchase_order_number,
      status: row.status,
      expectedArrivalDate: new Date(row.expected_arrival_date),
      actualArrivalDate: row.actual_arrival_date ? new Date(row.actual_arrival_date) : undefined,
      carrier: row.carrier,
      trackingNumber: row.tracking_number,
      shipmentNotes: row.shipment_notes,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      receivedAt: row.received_at ? new Date(row.received_at) : undefined,
      createdBy: row.created_by,
    };
  }

  private mapRowToASNLineItem(row: any): ASNLineItem {
    return {
      lineItemId: row.line_item_id,
      asnId: row.asn_id,
      sku: row.sku,
      expectedQuantity: parseInt(row.expected_quantity, 10),
      receivedQuantity: parseInt(row.received_quantity, 10),
      unitCost: parseFloat(row.unit_cost),
      lotNumber: row.lot_number,
      expirationDate: row.expiration_date ? new Date(row.expiration_date) : undefined,
      receivingStatus: row.receiving_status,
      lineNotes: row.line_notes,
    };
  }

  private mapRowToReceipt(row: any): Receipt {
    return {
      receiptId: row.receipt_id,
      asnId: row.asn_id,
      receiptDate: new Date(row.receipt_date),
      receiptType: row.receipt_type,
      status: row.status,
      createdAt: new Date(row.created_at),
      completedAt: row.completed_at ? new Date(row.completed_at) : undefined,
      receivedBy: row.received_by,
    };
  }

  private mapRowToReceiptLineItem(row: any): ReceiptLineItem {
    return {
      receiptLineId: row.receipt_line_id,
      receiptId: row.receipt_id,
      asnLineItemId: row.asn_line_item_id,
      sku: row.sku,
      quantityOrdered: parseInt(row.quantity_ordered, 10),
      quantityReceived: parseInt(row.quantity_received, 10),
      quantityDamaged: parseInt(row.quantity_damaged, 10),
      qualityStatus: row.quality_status,
      putawayStatus: row.putaway_status,
      unitCost: row.unit_cost ? parseFloat(row.unit_cost) : undefined,
      totalCost: parseFloat(row.total_cost),
      lotNumber: row.lot_number,
      expirationDate: row.expiration_date ? new Date(row.expiration_date) : undefined,
      notes: row.notes,
    };
  }

  private mapRowToPutawayTask(row: any): PutawayTask {
    return {
      putawayTaskId: row.putaway_task_id,
      receiptLineId: row.receipt_line_id,
      sku: row.sku,
      quantityToPutaway: parseInt(row.quantity_to_putaway, 10),
      quantityPutaway: parseInt(row.quantity_putaway, 10),
      targetBinLocation: row.target_bin_location,
      status: row.status,
      assignedTo: row.assigned_to,
      assignedAt: row.assigned_at ? new Date(row.assigned_at) : undefined,
      completedAt: row.completed_at ? new Date(row.completed_at) : undefined,
      completedBy: row.completed_by,
      priority: row.priority,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      notes: row.notes,
    };
  }
}

// Singleton instance
export const inboundReceivingService = new InboundReceivingService();
