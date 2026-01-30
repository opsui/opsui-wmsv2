/**
 * Quality Control Service
 *
 * Handles quality inspections, checklists, and return authorizations
 */

import { getPool } from '../db/client';
import { logger } from '../config/logger';
import { nanoid } from 'nanoid';
import {
  QualityInspection,
  InspectionChecklist,
  InspectionChecklistItem,
  InspectionResult,
  ReturnAuthorization,
  ReturnItem,
  CreateInspectionDTO,
  UpdateInspectionStatusDTO,
  CreateReturnAuthorizationDTO,
  InspectionStatus,
  InspectionType,
  DispositionAction,
} from '@opsui/shared';
import { notifyUser, NotificationType, NotificationPriority } from './NotificationHelper';

// ============================================================================
// QUALITY CONTROL SERVICE
// ============================================================================

export class QualityControlService {
  // ==========================================================================
  // INSPECTION CHECKLIST METHODS
  // ==========================================================================

  /**
   * Create an inspection checklist
   */
  async createInspectionChecklist(data: {
    checklistName: string;
    description?: string;
    inspectionType: InspectionType;
    sku?: string;
    category?: string;
    items: Array<{
      itemDescription: string;
      itemType: 'CHECKBOX' | 'TEXT' | 'NUMBER' | 'PHOTO' | 'PASS_FAIL';
      isRequired: boolean;
      displayOrder: number;
      options?: string[];
    }>;
    createdBy: string;
  }): Promise<InspectionChecklist> {
    const client = await getPool();

    try {
      await client.query('BEGIN');

      const checklistId = `CHK-${nanoid(10)}`.toUpperCase();

      // Create checklist
      await client.query(
        `INSERT INTO inspection_checklists
          (checklist_id, checklist_name, description, inspection_type, sku, category, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
        [
          checklistId,
          data.checklistName,
          data.description || null,
          data.inspectionType,
          data.sku || null,
          data.category || null,
          data.createdBy,
        ]
      );

      // Create checklist items
      for (const item of data.items) {
        const itemId = `CHKI-${nanoid(10)}`.toUpperCase();
        await client.query(
          `INSERT INTO inspection_checklist_items
            (item_id, checklist_id, item_description, item_type, is_required, display_order, options)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            itemId,
            checklistId,
            item.itemDescription,
            item.itemType,
            item.isRequired,
            item.displayOrder,
            item.options ? JSON.stringify(item.options) : null,
          ]
        );
      }

      await client.query('COMMIT');

      logger.info('Inspection checklist created', {
        checklistId,
        checklistName: data.checklistName,
      });
      return await this.getInspectionChecklist(checklistId);
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Error creating inspection checklist', error);
      throw error;
    }
  }

  /**
   * Get inspection checklist by ID
   */
  async getInspectionChecklist(checklistId: string): Promise<InspectionChecklist> {
    const client = await getPool();

    const result = await client.query(
      `SELECT * FROM inspection_checklists WHERE checklist_id = $1`,
      [checklistId]
    );

    if (result.rows.length === 0) {
      throw new Error(`Inspection checklist ${checklistId} not found`);
    }

    const checklist = this.mapRowToChecklist(result.rows[0]);

    // Get checklist items
    const itemsResult = await client.query(
      `SELECT * FROM inspection_checklist_items WHERE checklist_id = $1 ORDER BY display_order`,
      [checklistId]
    );

    checklist.items = itemsResult.rows.map(row => this.mapRowToChecklistItem(row));

    return checklist;
  }

  /**
   * Get all inspection checklists
   */
  async getAllInspectionChecklists(filters?: {
    inspectionType?: InspectionType;
    sku?: string;
    category?: string;
    activeOnly?: boolean;
  }): Promise<InspectionChecklist[]> {
    const client = await getPool();

    const conditions: string[] = [];
    const params: any[] = [];
    let paramCount = 1;

    if (filters?.inspectionType) {
      conditions.push(`inspection_type = $${paramCount}`);
      params.push(filters.inspectionType);
      paramCount++;
    }

    if (filters?.sku) {
      conditions.push(`sku = $${paramCount}`);
      params.push(filters.sku);
      paramCount++;
    }

    if (filters?.category) {
      conditions.push(`category = $${paramCount}`);
      params.push(filters.category);
      paramCount++;
    }

    if (filters?.activeOnly) {
      conditions.push(`is_active = true`);
    }

    const whereClause = conditions.length > 0 ? conditions.join(' AND ') : '1=1';

    const result = await client.query(
      `SELECT * FROM inspection_checklists WHERE ${whereClause} ORDER BY checklist_name`,
      params
    );

    const checklists = await Promise.all(
      result.rows.map(async row => {
        const checklist = this.mapRowToChecklist(row);
        const itemsResult = await client.query(
          `SELECT * FROM inspection_checklist_items WHERE checklist_id = $1 ORDER BY display_order`,
          [checklist.checklistId]
        );
        checklist.items = itemsResult.rows.map(r => this.mapRowToChecklistItem(r));
        return checklist;
      })
    );

    return checklists;
  }

  // ==========================================================================
  // QUALITY INSPECTION METHODS
  // ==========================================================================

  /**
   * Create a quality inspection
   */
  async createInspection(dto: CreateInspectionDTO): Promise<QualityInspection> {
    const client = await getPool();

    try {
      await client.query('BEGIN');

      const inspectionId = `QI-${nanoid(10)}`.toUpperCase();

      // Get inspector name
      const userResult = await client.query(`SELECT name FROM users WHERE user_id = $1`, [
        dto.inspectorId,
      ]);

      const inspectorName = userResult.rows[0]?.name || 'Unknown';

      const result = await client.query(
        `INSERT INTO quality_inspections
          (inspection_id, inspection_type, reference_type, reference_id, sku, quantity_inspected,
           inspector_id, inspector_name, location, lot_number, expiration_date, checklist_id, notes)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
         RETURNING *`,
        [
          inspectionId,
          dto.inspectionType,
          dto.referenceType,
          dto.referenceId,
          dto.sku,
          dto.quantityInspected,
          dto.inspectorId,
          inspectorName,
          dto.location || null,
          dto.lotNumber || null,
          dto.expirationDate || null,
          dto.checklistId || null,
          dto.notes || null,
        ]
      );

      await client.query('COMMIT');

      logger.info('Quality inspection created', { inspectionId, sku: dto.sku });
      return await this.getQualityInspection(inspectionId);
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Error creating quality inspection', error);
      throw error;
    }
  }

  /**
   * Get quality inspection by ID
   */
  async getQualityInspection(inspectionId: string): Promise<QualityInspection> {
    const client = await getPool();

    const result = await client.query(
      `SELECT * FROM quality_inspections WHERE inspection_id = $1`,
      [inspectionId]
    );

    if (result.rows.length === 0) {
      throw new Error(`Quality inspection ${inspectionId} not found`);
    }

    return this.mapRowToInspection(result.rows[0]);
  }

  /**
   * Get all quality inspections with optional filters
   */
  async getAllQualityInspections(filters?: {
    status?: InspectionStatus;
    inspectionType?: InspectionType;
    referenceType?: string;
    referenceId?: string;
    sku?: string;
    inspectorId?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ inspections: QualityInspection[]; total: number }> {
    const client = await getPool();

    const conditions: string[] = [];
    const params: any[] = [];
    let paramCount = 1;

    if (filters?.status) {
      conditions.push(`status = $${paramCount}`);
      params.push(filters.status);
      paramCount++;
    }

    if (filters?.inspectionType) {
      conditions.push(`inspection_type = $${paramCount}`);
      params.push(filters.inspectionType);
      paramCount++;
    }

    if (filters?.referenceType) {
      conditions.push(`reference_type = $${paramCount}`);
      params.push(filters.referenceType);
      paramCount++;
    }

    if (filters?.referenceId) {
      conditions.push(`reference_id = $${paramCount}`);
      params.push(filters.referenceId);
      paramCount++;
    }

    if (filters?.sku) {
      conditions.push(`sku = $${paramCount}`);
      params.push(filters.sku);
      paramCount++;
    }

    if (filters?.inspectorId) {
      conditions.push(`inspector_id = $${paramCount}`);
      params.push(filters.inspectorId);
      paramCount++;
    }

    const whereClause = conditions.length > 0 ? conditions.join(' AND ') : '1=1';

    // Get total count
    const countResult = await client.query(
      `SELECT COUNT(*) as count FROM quality_inspections WHERE ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].count, 10);

    // Get paginated results
    const limit = filters?.limit || 50;
    const offset = filters?.offset || 0;

    const result = await client.query(
      `SELECT * FROM quality_inspections
       WHERE ${whereClause}
       ORDER BY created_at DESC
       LIMIT $${paramCount} OFFSET $${paramCount + 1}`,
      [...params, limit, offset]
    );

    const inspections = result.rows.map(row => this.mapRowToInspection(row));

    return { inspections, total };
  }

  /**
   * Update inspection status (complete inspection)
   */
  async updateInspectionStatus(dto: UpdateInspectionStatusDTO): Promise<QualityInspection> {
    const client = await getPool();

    try {
      await client.query('BEGIN');

      const updateFields: string[] = ['status = $1', 'completed_at = NOW()'];
      const updateParams: any[] = [dto.status];
      let paramCount = 2;

      if (dto.quantityPassed !== undefined) {
        updateFields.push(`quantity_passed = $${paramCount}`);
        updateParams.push(dto.quantityPassed);
        paramCount++;
      }

      if (dto.quantityFailed !== undefined) {
        updateFields.push(`quantity_failed = $${paramCount}`);
        updateParams.push(dto.quantityFailed);
        paramCount++;
      }

      if (dto.defectType) {
        updateFields.push(`defect_type = $${paramCount}`);
        updateParams.push(dto.defectType);
        paramCount++;
      }

      if (dto.defectDescription) {
        updateFields.push(`defect_description = $${paramCount}`);
        updateParams.push(dto.defectDescription);
        paramCount++;
      }

      if (dto.dispositionAction) {
        updateFields.push(`disposition_action = $${paramCount}`);
        updateParams.push(dto.dispositionAction);
        paramCount++;
      }

      if (dto.dispositionNotes) {
        updateFields.push(`disposition_notes = $${paramCount}`);
        updateParams.push(dto.dispositionNotes);
        paramCount++;
      }

      if (dto.approvedBy) {
        updateFields.push(`approved_by = $${paramCount}`);
        updateParams.push(dto.approvedBy);
        paramCount++;

        updateFields.push(`approved_at = NOW()`);
      }

      if (dto.notes) {
        updateFields.push(`notes = $${paramCount}`);
        updateParams.push(dto.notes);
        paramCount++;
      }

      updateParams.push(dto.inspectionId);

      const result = await client.query(
        `UPDATE quality_inspections
         SET ${updateFields.join(', ')}
         WHERE inspection_id = $${paramCount}
         RETURNING *`,
        updateParams
      );

      await client.query('COMMIT');

      logger.info('Inspection status updated', {
        inspectionId: dto.inspectionId,
        status: dto.status,
      });

      // Send notification based on inspection result
      const inspection = await this.getQualityInspection(dto.inspectionId);
      const notificationType =
        dto.status === InspectionStatus.FAILED
          ? NotificationType.QUALITY_FAILED
          : dto.status === InspectionStatus.PASSED
            ? NotificationType.QUALITY_APPROVED
            : null;

      if (notificationType && dto.approvedBy) {
        await notifyUser({
          userId: dto.approvedBy,
          type: notificationType,
          title:
            dto.status === InspectionStatus.FAILED
              ? 'Quality Inspection Failed'
              : 'Quality Inspection Approved',
          message: `Inspection ${dto.inspectionId} for ${inspection.sku || 'N/A'} - ${dto.status}`,
          priority:
            dto.status === InspectionStatus.FAILED
              ? NotificationPriority.HIGH
              : NotificationPriority.NORMAL,
          data: {
            inspectionId: dto.inspectionId,
            sku: inspection.sku,
            status: dto.status,
            quantityPassed: dto.quantityPassed,
            quantityFailed: dto.quantityFailed,
          },
        });
      }

      return inspection;
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Error updating inspection status', error);
      throw error;
    }
  }

  /**
   * Start an inspection
   */
  async startInspection(inspectionId: string): Promise<QualityInspection> {
    const client = await getPool();

    const result = await client.query(
      `UPDATE quality_inspections
       SET status = $1, started_at = NOW(), updated_at = NOW()
       WHERE inspection_id = $2
       RETURNING *`,
      [InspectionStatus.IN_PROGRESS, inspectionId]
    );

    if (result.rows.length === 0) {
      throw new Error(`Quality inspection ${inspectionId} not found`);
    }

    logger.info('Inspection started', { inspectionId });
    return await this.getQualityInspection(inspectionId);
  }

  // ==========================================================================
  // INSPECTION RESULT METHODS
  // ==========================================================================

  /**
   * Save inspection result (checklist item result)
   */
  async saveInspectionResult(data: {
    inspectionId: string;
    checklistItemId: string;
    result: string;
    passed: boolean;
    notes?: string;
    imageUrl?: string;
  }): Promise<InspectionResult> {
    const client = await getPool();

    const resultId = `IR-${nanoid(10)}`.toUpperCase();

    const result = await client.query(
      `INSERT INTO inspection_results
        (result_id, inspection_id, checklist_item_id, result, passed, notes, image_url)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        resultId,
        data.inspectionId,
        data.checklistItemId,
        data.result,
        data.passed,
        data.notes || null,
        data.imageUrl || null,
      ]
    );

    logger.info('Inspection result saved', { resultId, inspectionId: data.inspectionId });

    return this.mapRowToInspectionResult(result.rows[0]);
  }

  /**
   * Get inspection results for an inspection
   */
  async getInspectionResults(inspectionId: string): Promise<InspectionResult[]> {
    const client = await getPool();

    const result = await client.query(`SELECT * FROM inspection_results WHERE inspection_id = $1`, [
      inspectionId,
    ]);

    return result.rows.map(row => this.mapRowToInspectionResult(row));
  }

  // ==========================================================================
  // RETURN AUTHORIZATION METHODS
  // ==========================================================================

  /**
   * Create a return authorization
   */
  async createReturnAuthorization(dto: CreateReturnAuthorizationDTO): Promise<ReturnAuthorization> {
    const client = await getPool();

    try {
      await client.query('BEGIN');

      const returnId = `RA-${nanoid(10)}`.toUpperCase();

      // Create return authorization
      await client.query(
        `INSERT INTO return_authorizations
          (return_id, order_id, customer_id, customer_name, return_reason, return_date,
           authorized_by, total_refund_amount, restocking_fee)
         VALUES ($1, $2, $3, $4, $5, NOW(), $6, $7, $8)
         RETURNING *`,
        [
          returnId,
          dto.orderId,
          dto.customerId,
          dto.customerName,
          dto.returnReason,
          dto.authorizedBy,
          dto.totalRefundAmount,
          dto.restockingFee || null,
        ]
      );

      // Create return items
      for (const item of dto.items) {
        const returnItemId = `RI-${nanoid(10)}`.toUpperCase();
        await client.query(
          `INSERT INTO return_items
            (return_item_id, return_id, order_item_id, sku, name, quantity, return_reason, condition, refund_amount)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [
            returnItemId,
            returnId,
            item.orderItemId,
            item.sku,
            item.name,
            item.quantity,
            item.returnReason,
            item.condition,
            item.refundAmount,
          ]
        );
      }

      await client.query('COMMIT');

      logger.info('Return authorization created', { returnId, orderId: dto.orderId });
      return await this.getReturnAuthorization(returnId);
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Error creating return authorization', error);
      throw error;
    }
  }

  /**
   * Get return authorization by ID
   */
  async getReturnAuthorization(returnId: string): Promise<ReturnAuthorization> {
    const client = await getPool();

    const result = await client.query(`SELECT * FROM return_authorizations WHERE return_id = $1`, [
      returnId,
    ]);

    if (result.rows.length === 0) {
      throw new Error(`Return authorization ${returnId} not found`);
    }

    const returnAuth = this.mapRowToReturnAuthorization(result.rows[0]);

    // Get return items
    const itemsResult = await client.query(`SELECT * FROM return_items WHERE return_id = $1`, [
      returnId,
    ]);

    returnAuth.items = itemsResult.rows.map(row => this.mapRowToReturnItem(row));

    return returnAuth;
  }

  /**
   * Get all return authorizations with optional filters
   */
  async getAllReturnAuthorizations(filters?: {
    status?: string;
    orderId?: string;
    customerId?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ returns: ReturnAuthorization[]; total: number }> {
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

    if (filters?.customerId) {
      conditions.push(`customer_id = $${paramCount}`);
      params.push(filters.customerId);
      paramCount++;
    }

    const whereClause = conditions.length > 0 ? conditions.join(' AND ') : '1=1';

    // Get total count
    const countResult = await client.query(
      `SELECT COUNT(*) as count FROM return_authorizations WHERE ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].count, 10);

    // Get paginated results
    const limit = filters?.limit || 50;
    const offset = filters?.offset || 0;

    const result = await client.query(
      `SELECT * FROM return_authorizations
       WHERE ${whereClause}
       ORDER BY return_date DESC
       LIMIT $${paramCount} OFFSET $${paramCount + 1}`,
      [...params, limit, offset]
    );

    const returns = await Promise.all(
      result.rows.map(async row => {
        const returnAuth = this.mapRowToReturnAuthorization(row);
        const itemsResult = await client.query(`SELECT * FROM return_items WHERE return_id = $1`, [
          returnAuth.returnId,
        ]);
        returnAuth.items = itemsResult.rows.map(r => this.mapRowToReturnItem(r));
        return returnAuth;
      })
    );

    return { returns, total };
  }

  /**
   * Update return authorization status
   */
  async updateReturnAuthorizationStatus(
    returnId: string,
    status: string,
    userId?: string
  ): Promise<ReturnAuthorization> {
    const client = await getPool();

    const updateFields: string[] = ['status = $1', 'updated_at = NOW()'];
    const updateParams: any[] = [status];
    let paramCount = 2;

    if (status === 'RECEIVED' && userId) {
      updateFields.push(`received_by = $${paramCount}`);
      updateParams.push(userId);
      paramCount++;
    }

    if (status === 'INSPECTED' && userId) {
      updateFields.push(`inspected_by = $${paramCount}`);
      updateParams.push(userId);
      paramCount++;
    }

    updateParams.push(returnId);

    const result = await client.query(
      `UPDATE return_authorizations
       SET ${updateFields.join(', ')}
       WHERE return_id = $${paramCount}
       RETURNING *`,
      updateParams
    );

    if (result.rows.length === 0) {
      throw new Error(`Return authorization ${returnId} not found`);
    }

    logger.info('Return authorization status updated', { returnId, status });
    return await this.getReturnAuthorization(returnId);
  }

  // ==========================================================================
  // MAPPING METHODS
  // ==========================================================================

  private mapRowToChecklist(row: any): InspectionChecklist {
    return {
      checklistId: row.checklist_id,
      checklistName: row.checklist_name,
      description: row.description,
      inspectionType: row.inspection_type,
      sku: row.sku,
      category: row.category,
      isActive: row.is_active,
      createdBy: row.created_by,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      items: [],
    };
  }

  private mapRowToChecklistItem(row: any): InspectionChecklistItem {
    return {
      itemId: row.item_id,
      checklistId: row.checklist_id,
      itemDescription: row.item_description,
      itemType: row.item_type,
      isRequired: row.is_required,
      displayOrder: parseInt(row.display_order, 10),
      options: row.options ? JSON.parse(row.options) : undefined,
    };
  }

  private mapRowToInspection(row: any): QualityInspection {
    return {
      inspectionId: row.inspection_id,
      inspectionType: row.inspection_type,
      status: row.status,
      referenceType: row.reference_type,
      referenceId: row.reference_id,
      sku: row.sku,
      quantityInspected: parseInt(row.quantity_inspected, 10),
      quantityPassed: parseInt(row.quantity_passed || 0, 10),
      quantityFailed: parseInt(row.quantity_failed || 0, 10),
      defectType: row.defect_type,
      defectDescription: row.defect_description,
      dispositionAction: row.disposition_action,
      dispositionNotes: row.disposition_notes,
      inspectorId: row.inspector_id,
      inspectorName: row.inspector_name,
      startedAt: row.started_at ? new Date(row.started_at) : undefined,
      completedAt: row.completed_at ? new Date(row.completed_at) : undefined,
      location: row.location,
      lotNumber: row.lot_number,
      expirationDate: row.expiration_date ? new Date(row.expiration_date) : undefined,
      images: row.images ? JSON.parse(row.images) : undefined,
      attachments: row.attachments ? JSON.parse(row.attachments) : undefined,
      approvedBy: row.approved_by,
      approvedAt: row.approved_at ? new Date(row.approved_at) : undefined,
      notes: row.notes,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }

  private mapRowToInspectionResult(row: any): InspectionResult {
    return {
      resultId: row.result_id,
      inspectionId: row.inspection_id,
      checklistItemId: row.checklist_item_id,
      result: row.result,
      passed: row.passed,
      notes: row.notes,
      imageUrl: row.image_url,
    };
  }

  private mapRowToReturnAuthorization(row: any): ReturnAuthorization {
    return {
      returnId: row.return_id,
      orderId: row.order_id,
      customerId: row.customer_id,
      customerName: row.customer_name,
      returnReason: row.return_reason,
      returnDate: new Date(row.return_date),
      status: row.status,
      authorizedBy: row.authorized_by,
      receivedBy: row.received_by,
      inspectedBy: row.inspected_by,
      totalRefundAmount: parseFloat(row.total_refund_amount),
      restockingFee: row.restocking_fee ? parseFloat(row.restocking_fee) : undefined,
      notes: row.notes,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      items: [],
    };
  }

  private mapRowToReturnItem(row: any): ReturnItem {
    return {
      returnItemId: row.return_item_id,
      returnId: row.return_id,
      orderItemId: row.order_item_id,
      sku: row.sku,
      name: row.name,
      quantity: parseInt(row.quantity, 10),
      returnReason: row.return_reason,
      condition: row.condition,
      disposition: row.disposition,
      refundAmount: parseFloat(row.refund_amount),
      inspectionId: row.inspection_id,
    };
  }
}

// Singleton instance
export const qualityControlService = new QualityControlService();
