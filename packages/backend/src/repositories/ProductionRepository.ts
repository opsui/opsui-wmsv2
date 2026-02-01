/**
 * Production Management Repository
 *
 * Data access layer for production management functionality
 */

import { getPool } from '../db/client';
import { logger } from '../config/logger';
import {
  BillOfMaterial,
  ProductionOrder,
  ProductionOutput,
  ProductionJournal,
  ProductionOrderStatus,
} from '@opsui/shared';

export class ProductionRepository {
  // ========================================================================
  // BILL OF MATERIALS
  // ========================================================================

  async createBOM(
    bom: Omit<BillOfMaterial, 'bomId' | 'createdAt' | 'updatedAt'>
  ): Promise<BillOfMaterial> {
    const client = await getPool();

    // Generate BOM ID
    const bomId = `BOM-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    try {
      await client.query('BEGIN');

      // Insert BOM
      const result = await client.query(
        `INSERT INTO bill_of_materials
          (bom_id, name, description, product_id, version, status, total_quantity,
           unit_of_measure, estimated_cost, effective_date, expiry_date,
           created_by, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW())
         RETURNING *`,
        [
          bomId,
          bom.name,
          bom.description || null,
          bom.productId,
          bom.version,
          bom.status,
          bom.totalQuantity,
          bom.unitOfMeasure,
          bom.estimatedCost || null,
          bom.effectiveDate || null,
          bom.expiryDate || null,
          bom.createdBy,
        ]
      );

      const newBOM = result.rows[0];

      // Insert components
      for (const component of bom.components) {
        await client.query(
          `INSERT INTO bom_components
            (component_id, bom_id, sku, quantity, unit_of_measure, is_optional, substitute_skus, notes)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [
            `COMP-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            bomId,
            component.sku,
            component.quantity,
            component.unitOfMeasure,
            component.isOptional,
            component.substituteSkus ? JSON.stringify(component.substituteSkus) : null,
            component.notes || null,
          ]
        );
      }

      await client.query('COMMIT');

      logger.info('BOM created', { bomId, productId: bom.productId });
      return this.mapRowToBOM(newBOM, bom.components);
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Error creating BOM', error);
      throw error;
    }
  }

  async findBOMById(bomId: string): Promise<BillOfMaterial | null> {
    const client = await getPool();

    const result = await client.query(`SELECT * FROM bill_of_materials WHERE bom_id = $1`, [bomId]);

    if (result.rows.length === 0) {
      return null;
    }

    const bomRow = result.rows[0];

    // Get components
    const componentsResult = await client.query(`SELECT * FROM bom_components WHERE bom_id = $1`, [
      bomId,
    ]);

    const components = componentsResult.rows.map(row => ({
      componentId: row.component_id,
      bomId: row.bom_id,
      sku: row.sku,
      quantity: parseFloat(row.quantity),
      unitOfMeasure: row.unit_of_measure,
      isOptional: row.is_optional,
      substituteSkus: row.substitute_skus ? JSON.parse(row.substitute_skus) : undefined,
      notes: row.notes,
    }));

    return this.mapRowToBOM(bomRow, components);
  }

  async findAllBOMs(filters?: { productId?: string; status?: string }): Promise<BillOfMaterial[]> {
    const client = await getPool();

    const conditions: string[] = [];
    const params: any[] = [];
    let paramCount = 1;

    if (filters?.productId) {
      conditions.push(`product_id = $${paramCount}`);
      params.push(filters.productId);
      paramCount++;
    }

    if (filters?.status) {
      conditions.push(`status = $${paramCount}`);
      params.push(filters.status);
      paramCount++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const result = await client.query(
      `SELECT * FROM bill_of_materials ${whereClause} ORDER BY created_at DESC`,
      params
    );

    const boms: BillOfMaterial[] = [];

    for (const bomRow of result.rows) {
      const componentsResult = await client.query(
        `SELECT * FROM bom_components WHERE bom_id = $1`,
        [bomRow.bom_id]
      );

      const components = componentsResult.rows.map(row => ({
        componentId: row.component_id,
        bomId: row.bom_id,
        sku: row.sku,
        quantity: parseFloat(row.quantity),
        unitOfMeasure: row.unit_of_measure,
        isOptional: row.is_optional,
        substituteSkus: row.substitute_skus ? JSON.parse(row.substitute_skus) : undefined,
        notes: row.notes,
      }));

      boms.push(this.mapRowToBOM(bomRow, components));
    }

    return boms;
  }

  // ========================================================================
  // PRODUCTION ORDERS
  // ========================================================================

  async createProductionOrder(
    order: Omit<
      ProductionOrder,
      | 'orderId'
      | 'orderNumber'
      | 'createdAt'
      | 'updatedAt'
      | 'components'
      | 'quantityCompleted'
      | 'quantityRejected'
    >
  ): Promise<ProductionOrder> {
    const client = await getPool();

    // Generate order ID and number
    const orderId = `PO-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const orderNumber = `PO-${Date.now()}`;

    try {
      await client.query('BEGIN');

      // Get BOM to load components
      const bom = await this.findBOMById(order.bomId);
      if (!bom) {
        throw new Error('BOM not found');
      }

      // Insert production order
      await client.query(
        `INSERT INTO production_orders
          (order_id, order_number, product_id, product_name, bom_id, status, priority,
           quantity_to_produce, quantity_completed, quantity_rejected, unit_of_measure,
           scheduled_start_date, scheduled_end_date, assigned_to, work_center, notes,
           created_by, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, NOW())
         RETURNING *`,
        [
          orderId,
          orderNumber,
          order.productId,
          order.productName,
          order.bomId,
          order.status,
          order.priority,
          order.quantityToProduce,
          0,
          0,
          order.unitOfMeasure,
          order.scheduledStartDate,
          order.scheduledEndDate,
          order.assignedTo || null,
          order.workCenter || null,
          order.notes || null,
          order.createdBy,
        ]
      );

      // Insert components from BOM
      for (const bomComponent of bom.components) {
        const quantityRequired =
          (bomComponent.quantity * order.quantityToProduce) / bom.totalQuantity;

        await client.query(
          `INSERT INTO production_order_components
            (component_id, order_id, sku, description, quantity_required, quantity_issued,
             quantity_returned, unit_of_measure)
           VALUES ($1, $2, $3, $4, $5, 0, 0, $6)`,
          [
            `POC-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            orderId,
            bomComponent.sku,
            null,
            quantityRequired,
            bomComponent.unitOfMeasure,
          ]
        );
      }

      await client.query('COMMIT');

      logger.info('Production order created', { orderId, orderNumber });
      return (await this.findProductionOrderById(orderId)) as ProductionOrder;
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Error creating production order', error);
      throw error;
    }
  }

  async findProductionOrderById(orderId: string): Promise<ProductionOrder | null> {
    const client = await getPool();

    const result = await client.query(`SELECT * FROM production_orders WHERE order_id = $1`, [
      orderId,
    ]);

    if (result.rows.length === 0) {
      return null;
    }

    const orderRow = result.rows[0];

    // Get components
    const componentsResult = await client.query(
      `SELECT * FROM production_order_components WHERE order_id = $1`,
      [orderId]
    );

    const components = componentsResult.rows.map(row => ({
      componentId: row.component_id,
      orderId: row.order_id,
      sku: row.sku,
      description: row.description,
      quantityRequired: parseFloat(row.quantity_required),
      quantityIssued: parseFloat(row.quantity_issued),
      quantityReturned: parseFloat(row.quantity_returned),
      unitOfMeasure: row.unit_of_measure,
      binLocation: row.bin_location,
      lotNumber: row.lot_number,
    }));

    return this.mapRowToProductionOrder(orderRow, components);
  }

  async findAllProductionOrders(filters?: {
    status?: ProductionOrderStatus;
    assignedTo?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ orders: ProductionOrder[]; total: number }> {
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

    // Get total count
    const countResult = await client.query(
      `SELECT COUNT(*) as count FROM production_orders ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].count, 10);

    // Get paginated results
    const limit = filters?.limit || 50;
    const offset = filters?.offset || 0;

    const result = await client.query(
      `SELECT * FROM production_orders ${whereClause} ORDER BY created_at DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`,
      [...params, limit, offset]
    );

    const orders: ProductionOrder[] = [];

    for (const orderRow of result.rows) {
      const order = await this.findProductionOrderById(orderRow.order_id);
      if (order) {
        orders.push(order);
      }
    }

    return { orders, total };
  }

  async updateProductionOrder(
    orderId: string,
    updates: Partial<ProductionOrder>
  ): Promise<ProductionOrder | null> {
    const client = await getPool();

    const fields: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (updates.status !== undefined) {
      fields.push(`status = $${paramCount}`);
      values.push(updates.status);
      paramCount++;
    }

    if (updates.priority !== undefined) {
      fields.push(`priority = $${paramCount}`);
      values.push(updates.priority);
      paramCount++;
    }

    if (updates.quantityToProduce !== undefined) {
      fields.push(`quantity_to_produce = $${paramCount}`);
      values.push(updates.quantityToProduce);
      paramCount++;
    }

    if (updates.assignedTo !== undefined) {
      fields.push(`assigned_to = $${paramCount}`);
      values.push(updates.assignedTo);
      paramCount++;
    }

    if (updates.notes !== undefined) {
      fields.push(`notes = $${paramCount}`);
      values.push(updates.notes);
      paramCount++;
    }

    if (updates.updatedBy !== undefined) {
      fields.push(`updated_by = $${paramCount}`);
      values.push(updates.updatedBy);
      paramCount++;
    }

    fields.push(`updated_at = NOW()`);
    values.push(orderId);
    paramCount++;

    if (fields.length === 1) {
      return await this.findProductionOrderById(orderId);
    }

    const result = await client.query(
      `UPDATE production_orders SET ${fields.join(', ')} WHERE order_id = $${paramCount} RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return null;
    }

    logger.info('Production order updated', { orderId });
    return await this.findProductionOrderById(orderId);
  }

  // ========================================================================
  // PRODUCTION OUTPUT
  // ========================================================================

  async createProductionOutput(
    output: Omit<ProductionOutput, 'outputId'>
  ): Promise<ProductionOutput> {
    const client = await getPool();

    const outputId = `OUT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const result = await client.query(
      `INSERT INTO production_outputs
        (output_id, order_id, product_id, quantity, quantity_rejected, lot_number,
         produced_at, produced_by, inspected_by, inspection_date, notes, bin_location)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING *`,
      [
        outputId,
        output.orderId,
        output.productId,
        output.quantity,
        output.quantityRejected,
        output.lotNumber || null,
        output.producedAt,
        output.producedBy,
        output.inspectedBy || null,
        output.inspectionDate || null,
        output.notes || null,
        output.binLocation || null,
      ]
    );

    // Update production order quantities
    await client.query(
      `UPDATE production_orders
       SET quantity_completed = quantity_completed + $1,
           quantity_rejected = quantity_rejected + $2,
           updated_at = NOW()
       WHERE order_id = $3`,
      [output.quantity, output.quantityRejected, output.orderId]
    );

    logger.info('Production output recorded', { outputId, orderId: output.orderId });
    return this.mapRowToProductionOutput(result.rows[0]);
  }

  // ========================================================================
  // PRODUCTION JOURNAL
  // ========================================================================

  async createProductionJournalEntry(
    entry: Omit<ProductionOutput, 'outputId'>
  ): Promise<ProductionOutput> {
    // This should be for journal, not output - fixing the type
    const client = await getPool();

    const journalId = `JRNL-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    await client.query(
      `INSERT INTO production_journals
        (journal_id, order_id, entry_type, entered_at, entered_by, quantity, notes, duration_minutes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        journalId,
        (entry as any).orderId,
        'NOTE',
        entry.producedAt,
        entry.producedBy,
        null,
        entry.notes,
        null,
      ]
    );

    logger.info('Production journal entry created', { journalId });
    return entry as ProductionOutput; // Return the input for now
  }

  async findProductionJournalEntries(orderId: string): Promise<ProductionJournal[]> {
    const client = await getPool();

    const result = await client.query(
      `SELECT * FROM production_journals WHERE order_id = $1 ORDER BY entered_at DESC`,
      [orderId]
    );

    return result.rows.map(row => ({
      journalId: row.journal_id,
      orderId: row.order_id,
      entryType: row.entry_type,
      enteredAt: row.entered_at,
      enteredBy: row.entered_by,
      quantity: row.quantity ? parseFloat(row.quantity) : undefined,
      notes: row.notes,
      durationMinutes: row.duration_minutes,
    }));
  }

  // ========================================================================
  // HELPER METHODS
  // ========================================================================

  private mapRowToBOM(row: any, components: any[]): BillOfMaterial {
    return {
      bomId: row.bom_id,
      name: row.name,
      description: row.description,
      productId: row.product_id,
      version: row.version,
      status: row.status,
      components,
      totalQuantity: row.total_quantity,
      unitOfMeasure: row.unit_of_measure,
      estimatedCost: row.estimated_cost ? parseFloat(row.estimated_cost) : undefined,
      createdBy: row.created_by,
      createdAt: row.created_at,
      updatedBy: row.updated_by,
      updatedAt: row.updated_at,
      effectiveDate: row.effective_date,
      expiryDate: row.expiry_date,
    };
  }

  private mapRowToProductionOrder(row: any, components: any[]): ProductionOrder {
    return {
      orderId: row.order_id,
      orderNumber: row.order_number,
      productId: row.product_id,
      productName: row.product_name,
      bomId: row.bom_id,
      status: row.status,
      priority: row.priority,
      quantityToProduce: row.quantity_to_produce,
      quantityCompleted: row.quantity_completed,
      quantityRejected: row.quantity_rejected,
      unitOfMeasure: row.unit_of_measure,
      scheduledStartDate: row.scheduled_start_date,
      scheduledEndDate: row.scheduled_end_date,
      actualStartDate: row.actual_start_date,
      actualEndDate: row.actual_end_date,
      assignedTo: row.assigned_to,
      workCenter: row.work_center,
      notes: row.notes,
      materialsReserved: row.materials_reserved,
      components,
      createdAt: row.created_at,
      createdBy: row.created_by,
      updatedAt: row.updated_at,
      updatedBy: row.updated_by,
    };
  }

  private mapRowToProductionOutput(row: any): ProductionOutput {
    return {
      outputId: row.output_id,
      orderId: row.order_id,
      productId: row.product_id,
      quantity: row.quantity,
      quantityRejected: row.quantity_rejected,
      lotNumber: row.lot_number,
      producedAt: row.produced_at,
      producedBy: row.produced_by,
      inspectedBy: row.inspected_by,
      inspectionDate: row.inspection_date,
      notes: row.notes,
      binLocation: row.bin_location,
    };
  }
}

// Singleton instance
export const productionRepository = new ProductionRepository();
