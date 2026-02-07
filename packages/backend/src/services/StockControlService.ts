/**
 * Stock Control Service
 *
 * Business logic for stock control operations including stock counts,
 * transfers, adjustments, and reporting
 */

import {
  InventoryTransaction,
  TransactionType,
  BinLocation,
  NotFoundError,
  ConflictError,
} from '@opsui/shared';
import { logger } from '../config/logger';
import { getPool } from '../db/client';

// ============================================================================
// TYPES
// ============================================================================

export interface StockCount {
  countId: string;
  binLocation: string;
  type: 'FULL' | 'CYCLIC' | 'SPOT';
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'VERIFIED';
  createdBy: string;
  createdAt: Date;
  completedAt?: Date;
  verifiedBy?: string;
  items?: StockCountItem[];
}

export interface StockCountItem {
  countItemId: string;
  sku: string;
  expectedQuantity: number;
  countedQuantity: number;
  variance: number;
  notes?: string;
}

export interface StockTransfer {
  transferId: string;
  sku: string;
  fromBin: string;
  toBin: string;
  quantity: number;
  reason: string;
  performedBy: string;
  performedAt: Date;
}

export interface StockAdjustment {
  adjustmentId: string;
  sku: string;
  binLocation: string;
  previousQuantity: number;
  newQuantity: number;
  variance: number;
  reason: string;
  performedBy: string;
  performedAt: Date;
}

export interface Discrepancy {
  sku: string;
  binLocation: string;
  systemQuantity: number;
  actualQuantity: number;
  variance: number;
  reason: string;
}

// ============================================================================
// STOCK CONTROL SERVICE
// ============================================================================

export class StockControlService {
  // --------------------------------------------------------------------------
  // GET DASHBOARD
  // --------------------------------------------------------------------------

  async getDashboard(): Promise<{
    totalSKUs: number;
    totalBins: number;
    lowStockItems: number;
    outOfStockItems: number;
    pendingStockCounts: number;
    recentTransactions: InventoryTransaction[];
    totalInventoryValue?: number;
  }> {
    try {
      // Get total SKUs
      const skuResult = await getPool().query(
        'SELECT COUNT(*) as count FROM skus WHERE active = true'
      );
      const totalSKUs = parseInt(skuResult.rows[0].count);

      // Get total bins
      const binResult = await getPool().query(
        'SELECT COUNT(*) as count FROM bin_locations WHERE active = true'
      );
      const totalBins = parseInt(binResult.rows[0].count);

      // Get low stock items
      const lowStockResult = await getPool().query(`
        SELECT COUNT(*) as count
        FROM inventory_units
        WHERE available > 0 AND available <= 10
      `);
      const lowStockItems = parseInt(lowStockResult.rows[0].count);

      // Get out of stock items
      const outOfStockResult = await getPool().query(`
        SELECT COUNT(*) as count
        FROM inventory_units
        WHERE available = 0 AND quantity > 0
      `);
      const outOfStockItems = parseInt(outOfStockResult.rows[0].count);

      // Get pending stock counts
      const pendingCountsResult = await getPool().query(`
        SELECT COUNT(*) as count
        FROM stock_counts
        WHERE status IN ('PENDING', 'IN_PROGRESS')
      `);
      const pendingStockCounts = parseInt(pendingCountsResult.rows[0].count);

      // Get recent transactions
      const transactionsResult = await getPool().query(`
        SELECT
          transaction_id as "transactionId",
          type,
          sku,
          quantity,
          order_id as "orderId",
          user_id as "userId",
          timestamp,
          reason,
          bin_location as "binLocation"
        FROM inventory_transactions
        ORDER BY timestamp DESC
        LIMIT 10
      `);

      const recentTransactions = transactionsResult.rows.map((row: any) => ({
        transactionId: row.transactionId,
        type: row.type,
        sku: row.sku,
        quantity: row.quantity,
        orderId: row.orderId,
        userId: row.userId,
        timestamp: row.timestamp,
        reason: row.reason,
        binLocation: row.binLocation,
      }));

      return {
        totalSKUs,
        totalBins,
        lowStockItems,
        outOfStockItems,
        pendingStockCounts,
        recentTransactions,
      };
    } catch (error) {
      logger.error('Error getting stock control dashboard', error);
      throw error;
    }
  }

  // --------------------------------------------------------------------------
  // GET INVENTORY LIST
  // --------------------------------------------------------------------------

  async getInventoryList(filters: {
    name?: string;
    sku?: string;
    category?: string;
    binLocation?: string;
    lowStock?: boolean;
    outOfStock?: boolean;
    page: number;
    limit: number;
  }): Promise<{
    items: Array<{
      sku: string;
      name: string;
      category: string;
      binLocation: string;
      quantity: number;
      reserved: number;
      available: number;
    }>;
    total: number;
    page: number;
    pageSize: number;
  }> {
    try {
      const offset = (filters.page - 1) * filters.limit;

      // Build WHERE clause separately
      const whereConditions: string[] = ['s.active = true'];
      const params: any[] = [];
      let paramCount = 1;

      if (filters.name) {
        whereConditions.push(`s.name ILIKE $${paramCount}`);
        params.push(`%${filters.name}%`);
        paramCount++;
      }

      if (filters.sku) {
        whereConditions.push(`i.sku ILIKE $${paramCount}`);
        params.push(`%${filters.sku}%`);
        paramCount++;
      }

      if (filters.category) {
        whereConditions.push(`s.category = $${paramCount}`);
        params.push(filters.category);
        paramCount++;
      }

      if (filters.binLocation) {
        whereConditions.push(`i.bin_location ILIKE $${paramCount}`);
        params.push(`%${filters.binLocation}%`);
        paramCount++;
      }

      if (filters.lowStock) {
        whereConditions.push(`i.available > 0 AND i.available <= 10`);
      }

      if (filters.outOfStock) {
        whereConditions.push(`i.available = 0 AND i.quantity > 0`);
      }

      const whereClause = whereConditions.join(' AND ');

      // Get total count
      const countQuery = `
        SELECT COUNT(*) as count
        FROM inventory_units i
        JOIN skus s ON i.sku = s.sku
        WHERE ${whereClause}
      `;
      const countResult = await getPool().query(countQuery, params);
      const total = parseInt(countResult.rows[0].count);

      // Get paginated results
      const dataQuery = `
        SELECT
          i.sku,
          s.name,
          s.category,
          i.bin_location as "binLocation",
          i.quantity,
          i.reserved,
          i.available
        FROM inventory_units i
        JOIN skus s ON i.sku = s.sku
        WHERE ${whereClause}
        ORDER BY i.sku, i.bin_location
        LIMIT $${paramCount} OFFSET $${paramCount + 1}
      `;
      params.push(filters.limit, offset);

      const result = await getPool().query(dataQuery, params);

      return {
        items: result.rows,
        total,
        page: filters.page,
        pageSize: filters.limit,
      };
    } catch (error) {
      logger.error('Error getting inventory list', error);
      throw error;
    }
  }

  // --------------------------------------------------------------------------
  // GET SKU INVENTORY DETAIL
  // --------------------------------------------------------------------------

  async getSKUInventoryDetail(sku: string): Promise<{
    sku: string;
    name: string;
    description: string;
    category: string;
    barcode?: string;
    totalQuantity: number;
    totalReserved: number;
    totalAvailable: number;
    locations: Array<{
      binLocation: string;
      quantity: number;
      reserved: number;
      available: number;
      lastUpdated: Date;
    }>;
    recentTransactions: InventoryTransaction[];
  }> {
    try {
      // Get SKU details
      const skuResult = await getPool().query('SELECT * FROM skus WHERE sku = $1', [sku]);

      if (skuResult.rows.length === 0) {
        throw new NotFoundError('SKU', sku);
      }

      const skuData = skuResult.rows[0];

      // Get inventory by location
      const inventoryResult = await getPool().query(
        'SELECT * FROM inventory_units WHERE sku = $1 ORDER BY bin_location',
        [sku]
      );

      const locations = inventoryResult.rows.map((row: any) => ({
        binLocation: row.bin_location,
        quantity: row.quantity,
        reserved: row.reserved,
        available: row.available,
        lastUpdated: row.last_updated,
      }));

      // Get recent transactions
      const transactionsResult = await getPool().query(
        `SELECT * FROM inventory_transactions
         WHERE sku = $1
         ORDER BY timestamp DESC
         LIMIT 20`,
        [sku]
      );

      const recentTransactions = transactionsResult.rows.map((row: any) => ({
        transactionId: row.transaction_id,
        type: row.type,
        sku: row.sku,
        quantity: row.quantity,
        orderId: row.order_id,
        userId: row.user_id,
        timestamp: row.timestamp,
        reason: row.reason,
        binLocation: row.bin_location,
      }));

      // Calculate totals
      const totalQuantity = locations.reduce((sum, loc) => sum + loc.quantity, 0);
      const totalReserved = locations.reduce((sum, loc) => sum + loc.reserved, 0);
      const totalAvailable = locations.reduce((sum, loc) => sum + loc.available, 0);

      return {
        sku: skuData.sku,
        name: skuData.name,
        description: skuData.description,
        category: skuData.category,
        barcode: skuData.barcode,
        totalQuantity,
        totalReserved,
        totalAvailable,
        locations,
        recentTransactions,
      };
    } catch (error) {
      logger.error('Error getting SKU inventory detail', error);
      throw error;
    }
  }

  // --------------------------------------------------------------------------
  // CREATE STOCK COUNT
  // --------------------------------------------------------------------------

  async createStockCount(
    binLocation: string,
    type: 'FULL' | 'CYCLIC' | 'SPOT',
    userId: string
  ): Promise<StockCount> {
    try {
      // Generate count ID
      const countId = `SC-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;

      // Check if bin exists
      const binResult = await getPool().query('SELECT * FROM bin_locations WHERE bin_id = $1', [
        binLocation,
      ]);

      if (binResult.rows.length === 0) {
        throw new NotFoundError('Bin location', binLocation);
      }

      // Create stock count record
      await getPool().query(
        `INSERT INTO stock_counts (count_id, bin_location, type, status, created_by, created_at)
         VALUES ($1, $2, $3, 'PENDING', $4, NOW())`,
        [countId, binLocation, type, userId]
      );

      logger.info('Stock count created', { countId, binLocation, type, userId });

      return {
        countId,
        binLocation,
        type,
        status: 'PENDING',
        createdBy: userId,
        createdAt: new Date(),
      };
    } catch (error) {
      logger.error('Error creating stock count', error);
      throw error;
    }
  }

  // --------------------------------------------------------------------------
  // SUBMIT STOCK COUNT
  // --------------------------------------------------------------------------

  async submitStockCount(
    countId: string,
    items: Array<{ sku: string; countedQuantity: number; notes?: string }>,
    userId: string
  ): Promise<{
    countId: string;
    status: string;
    discrepancies: Array<{
      sku: string;
      binLocation: string;
      expectedQuantity: number;
      countedQuantity: number;
      variance: number;
    }>;
  }> {
    const client = await getPool().connect();
    try {
      await client.query('BEGIN');

      // Get stock count details
      const countResult = await client.query('SELECT * FROM stock_counts WHERE count_id = $1', [
        countId,
      ]);

      if (countResult.rows.length === 0) {
        throw new NotFoundError('Stock count', countId);
      }

      const count = countResult.rows[0];
      const discrepancies: any[] = [];

      // Process each counted item
      for (const item of items) {
        // Get expected quantity
        const inventoryResult = await client.query(
          'SELECT * FROM inventory_units WHERE sku = $1 AND bin_location = $2',
          [item.sku, count.bin_location]
        );

        const expectedQuantity =
          inventoryResult.rows.length > 0 ? inventoryResult.rows[0].quantity : 0;
        const variance = item.countedQuantity - expectedQuantity;

        // Save stock count item
        const countItemId = `SCI-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
        await client.query(
          `INSERT INTO stock_count_items (count_item_id, count_id, sku, expected_quantity, counted_quantity, variance, notes)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            countItemId,
            countId,
            item.sku,
            expectedQuantity,
            item.countedQuantity,
            variance,
            item.notes || '',
          ]
        );

        if (variance !== 0) {
          discrepancies.push({
            sku: item.sku,
            binLocation: count.bin_location,
            expectedQuantity,
            countedQuantity: item.countedQuantity,
            variance,
          });
        }
      }

      // Update stock count status
      await client.query(
        "UPDATE stock_counts SET status = 'COMPLETED', completed_at = NOW() WHERE count_id = $1",
        [countId]
      );

      await client.query('COMMIT');

      logger.info('Stock count submitted', { countId, userId, itemCount: items.length });

      return {
        countId,
        status: 'COMPLETED',
        discrepancies,
      };
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Error submitting stock count', error);
      throw error;
    } finally {
      client.release();
    }
  }

  // --------------------------------------------------------------------------
  // GET STOCK COUNTS
  // --------------------------------------------------------------------------

  async getStockCounts(filters: { status?: string; limit: number; offset: number }): Promise<{
    counts: StockCount[];
    total: number;
  }> {
    try {
      let query = 'SELECT * FROM stock_counts';
      const params: any[] = [];
      let paramCount = 1;

      if (filters.status) {
        query += ` WHERE status = $${paramCount}`;
        params.push(filters.status);
        paramCount++;
      }

      // Get total count
      const countQuery = query.replace(
        'SELECT * FROM stock_counts',
        'SELECT COUNT(*) as count FROM stock_counts'
      );
      const countResult = await getPool().query(countQuery, params);
      const total = parseInt(countResult.rows[0].count);

      // Add ordering and pagination
      query += ` ORDER BY created_at DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
      params.push(filters.limit, filters.offset);

      const result = await getPool().query(query, params);

      const counts = result.rows.map((row: any) => ({
        countId: row.count_id,
        binLocation: row.bin_location,
        type: row.type,
        status: row.status,
        createdBy: row.created_by,
        createdAt: row.created_at,
        completedAt: row.completed_at,
        verifiedBy: row.verified_by,
      }));

      return { counts, total };
    } catch (error) {
      logger.error('Error getting stock counts', error);
      throw error;
    }
  }

  // --------------------------------------------------------------------------
  // TRANSFER STOCK
  // --------------------------------------------------------------------------

  async transferStock(
    sku: string,
    fromBin: string,
    toBin: string,
    quantity: number,
    reason: string,
    userId: string
  ): Promise<StockTransfer> {
    const client = await getPool().connect();
    try {
      await client.query('BEGIN');

      // Check source inventory
      const sourceResult = await client.query(
        'SELECT * FROM inventory_units WHERE sku = $1 AND bin_location = $2',
        [sku, fromBin]
      );

      if (sourceResult.rows.length === 0) {
        throw new NotFoundError(`Inventory for SKU ${sku} at bin`, fromBin);
      }

      const sourceInventory = sourceResult.rows[0];

      if (sourceInventory.available < quantity) {
        throw new ConflictError(
          `Insufficient available quantity at ${fromBin}. Available: ${sourceInventory.available}, Requested: ${quantity}`
        );
      }

      // Deduct from source
      await client.query(
        `UPDATE inventory_units
         SET quantity = quantity - $1, reserved = reserved - $1, last_updated = NOW()
         WHERE sku = $2 AND bin_location = $3`,
        [quantity, sku, fromBin]
      );

      // Add or update destination
      const destResult = await client.query(
        'SELECT * FROM inventory_units WHERE sku = $1 AND bin_location = $2',
        [sku, toBin]
      );

      if (destResult.rows.length > 0) {
        await client.query(
          `UPDATE inventory_units
           SET quantity = quantity + $1, last_updated = NOW()
           WHERE sku = $2 AND bin_location = $3`,
          [quantity, sku, toBin]
        );
      } else {
        const unitId = `IU-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
        await client.query(
          `INSERT INTO inventory_units (unit_id, sku, bin_location, quantity, reserved, last_updated)
           VALUES ($1, $2, $3, $4, 0, NOW())`,
          [unitId, sku, toBin, quantity]
        );
      }

      // Log transactions
      const transactionId = `TXN-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;

      await client.query(
        `INSERT INTO inventory_transactions (transaction_id, type, sku, quantity, user_id, reason, bin_location)
         VALUES ($1, 'DEDUCTION', $2, $3, $4, $5, $6)`,
        [transactionId, sku, -quantity, userId, `Transfer out: ${reason}`, fromBin]
      );

      const transactionId2 = `TXN-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
      await client.query(
        `INSERT INTO inventory_transactions (transaction_id, type, sku, quantity, user_id, reason, bin_location)
         VALUES ($1, 'RECEIPT', $2, $3, $4, $5, $6)`,
        [transactionId2, sku, quantity, userId, `Transfer in: ${reason}`, toBin]
      );

      await client.query('COMMIT');

      const transferId = `ST-${Date.now()}`;

      logger.info('Stock transferred', {
        transferId,
        sku,
        fromBin,
        toBin,
        quantity,
        userId,
      });

      return {
        transferId,
        sku,
        fromBin,
        toBin,
        quantity,
        reason,
        performedBy: userId,
        performedAt: new Date(),
      };
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Error transferring stock', error);
      throw error;
    } finally {
      client.release();
    }
  }

  // --------------------------------------------------------------------------
  // ADJUST INVENTORY
  // --------------------------------------------------------------------------

  async adjustInventory(
    sku: string,
    binLocation: string,
    quantity: number,
    reason: string,
    userId: string
  ): Promise<StockAdjustment> {
    try {
      // Get current inventory
      const currentResult = await getPool().query(
        'SELECT * FROM inventory_units WHERE sku = $1 AND bin_location = $2',
        [sku, binLocation]
      );

      if (currentResult.rows.length === 0) {
        throw new NotFoundError(`Inventory for SKU ${sku} at bin`, binLocation);
      }

      const current = currentResult.rows[0];
      const previousQuantity = current.quantity;
      const newQuantity = previousQuantity + quantity;

      if (newQuantity < 0) {
        throw new ConflictError(
          `Adjustment would result in negative quantity. Current: ${previousQuantity}, Adjustment: ${quantity}`
        );
      }

      // Update inventory
      await getPool().query(
        `UPDATE inventory_units
         SET quantity = $1, reserved = LEAST(reserved, $1), last_updated = NOW()
         WHERE sku = $2 AND bin_location = $3`,
        [newQuantity, sku, binLocation]
      );

      // Log transaction
      const transactionId = `TXN-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
      await getPool().query(
        `INSERT INTO inventory_transactions (transaction_id, type, sku, quantity, user_id, reason, bin_location)
         VALUES ($1, 'ADJUSTMENT', $2, $3, $4, $5, $6)`,
        [transactionId, sku, quantity, userId, reason, binLocation]
      );

      const adjustmentId = `ADJ-${Date.now()}`;

      logger.info('Inventory adjusted', {
        adjustmentId,
        sku,
        binLocation,
        previousQuantity,
        newQuantity,
        quantity,
        userId,
        reason,
      });

      return {
        adjustmentId,
        sku,
        binLocation,
        previousQuantity,
        newQuantity,
        variance: quantity,
        reason,
        performedBy: userId,
        performedAt: new Date(),
      };
    } catch (error) {
      logger.error('Error adjusting inventory', error);
      throw error;
    }
  }

  // --------------------------------------------------------------------------
  // GET TRANSACTION HISTORY
  // --------------------------------------------------------------------------

  async getTransactionHistory(filters: {
    sku?: string;
    binLocation?: string;
    type?: TransactionType;
    userId?: string;
    startDate?: string;
    endDate?: string;
    limit: number;
    offset: number;
  }): Promise<{
    transactions: InventoryTransaction[];
    total: number;
  }> {
    try {
      let query = 'SELECT * FROM inventory_transactions WHERE 1=1';
      const params: any[] = [];
      let paramCount = 1;

      if (filters.sku) {
        query += ` AND sku = $${paramCount}`;
        params.push(filters.sku);
        paramCount++;
      }

      if (filters.binLocation) {
        query += ` AND bin_location = $${paramCount}`;
        params.push(filters.binLocation);
        paramCount++;
      }

      if (filters.type) {
        query += ` AND type = $${paramCount}`;
        params.push(filters.type);
        paramCount++;
      }

      if (filters.userId) {
        query += ` AND user_id = $${paramCount}`;
        params.push(filters.userId);
        paramCount++;
      }

      if (filters.startDate) {
        query += ` AND timestamp >= $${paramCount}`;
        params.push(filters.startDate);
        paramCount++;
      }

      if (filters.endDate) {
        query += ` AND timestamp <= $${paramCount}`;
        params.push(filters.endDate);
        paramCount++;
      }

      // Get total count
      const countQuery = query.replace(
        'SELECT * FROM inventory_transactions',
        'SELECT COUNT(*) as count FROM inventory_transactions'
      );
      const countResult = await getPool().query(countQuery, params);
      const total = parseInt(countResult.rows[0].count);

      // Add ordering and pagination
      query += ` ORDER BY timestamp DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
      params.push(filters.limit, filters.offset);

      const result = await getPool().query(query, params);

      const transactions = result.rows.map((row: any) => ({
        transactionId: row.transaction_id,
        type: row.type,
        sku: row.sku,
        quantity: row.quantity,
        orderId: row.order_id,
        userId: row.user_id,
        timestamp: row.timestamp,
        reason: row.reason,
        binLocation: row.bin_location,
      }));

      return { transactions, total };
    } catch (error) {
      logger.error('Error getting transaction history', error);
      throw error;
    }
  }

  // --------------------------------------------------------------------------
  // GET LOW STOCK REPORT
  // --------------------------------------------------------------------------

  async getLowStockReport(threshold: number): Promise<{
    threshold: number;
    items: Array<{
      sku: string;
      name: string;
      category: string;
      binLocation: string;
      available: number;
      quantity: number;
    }>;
    generatedAt: Date;
  }> {
    try {
      const result = await getPool().query(
        `SELECT
          i.sku,
          s.name,
          s.category,
          i.bin_location as "binLocation",
          i.available,
          i.quantity
        FROM inventory_units i
        JOIN skus s ON i.sku = s.sku
        WHERE i.available > 0 AND i.available <= $1
        ORDER BY i.available ASC, i.sku ASC`,
        [threshold]
      );

      return {
        threshold,
        items: result.rows,
        generatedAt: new Date(),
      };
    } catch (error) {
      logger.error('Error generating low stock report', error);
      throw error;
    }
  }

  // --------------------------------------------------------------------------
  // GET MOVEMENT REPORT
  // --------------------------------------------------------------------------

  async getMovementReport(filters: {
    startDate?: string;
    endDate?: string;
    sku?: string;
  }): Promise<{
    movements: Array<{
      sku: string;
      name: string;
      receipts: number;
      deductions: number;
      adjustments: number;
      netChange: number;
    }>;
    period: { startDate?: string; endDate?: string };
    generatedAt: Date;
  }> {
    try {
      let query = `
        SELECT
          t.sku,
          s.name,
          SUM(CASE WHEN t.type = 'RECEIPT' THEN t.quantity ELSE 0 END) as receipts,
          SUM(CASE WHEN t.type = 'DEDUCTION' THEN ABS(t.quantity) ELSE 0 END) as deductions,
          SUM(CASE WHEN t.type = 'ADJUSTMENT' THEN t.quantity ELSE 0 END) as adjustments,
          SUM(t.quantity) as "netChange"
        FROM inventory_transactions t
        JOIN skus s ON t.sku = s.sku
        WHERE 1=1
      `;
      const params: any[] = [];
      let paramCount = 1;

      if (filters.startDate) {
        query += ` AND t.timestamp >= $${paramCount}`;
        params.push(filters.startDate);
        paramCount++;
      }

      if (filters.endDate) {
        query += ` AND t.timestamp <= $${paramCount}`;
        params.push(filters.endDate);
        paramCount++;
      }

      if (filters.sku) {
        query += ` AND t.sku = $${paramCount}`;
        params.push(filters.sku);
        paramCount++;
      }

      query += ` GROUP BY t.sku, s.name ORDER BY t.sku`;

      const result = await getPool().query(query, params);

      return {
        movements: result.rows,
        period: {
          startDate: filters.startDate,
          endDate: filters.endDate,
        },
        generatedAt: new Date(),
      };
    } catch (error) {
      logger.error('Error generating movement report', error);
      throw error;
    }
  }

  // --------------------------------------------------------------------------
  // RECONCILE DISCREPANCIES
  // --------------------------------------------------------------------------

  async reconcileDiscrepancies(
    discrepancies: Discrepancy[],
    userId: string
  ): Promise<{
    reconciled: number;
    details: StockAdjustment[];
  }> {
    const details: StockAdjustment[] = [];

    for (const discrepancy of discrepancies) {
      const variance = discrepancy.actualQuantity - discrepancy.systemQuantity;

      if (variance !== 0) {
        const adjustment = await this.adjustInventory(
          discrepancy.sku,
          discrepancy.binLocation,
          variance,
          discrepancy.reason || `Reconciliation: Stock count correction`,
          userId
        );

        details.push(adjustment);
      }
    }

    logger.info('Discrepancies reconciled', {
      userId,
      totalDiscrepancies: discrepancies.length,
      reconciled: details.length,
    });

    return {
      reconciled: details.length,
      details,
    };
  }

  // --------------------------------------------------------------------------
  // GET BIN LOCATIONS
  // --------------------------------------------------------------------------

  async getBinLocations(filters: { zone?: string; active?: boolean }): Promise<BinLocation[]> {
    try {
      let query = 'SELECT * FROM bin_locations WHERE 1=1';
      const params: any[] = [];
      let paramCount = 1;

      if (filters.zone) {
        query += ` AND zone = $${paramCount}`;
        params.push(filters.zone);
        paramCount++;
      }

      if (filters.active !== undefined) {
        query += ` AND active = $${paramCount}`;
        params.push(filters.active);
        paramCount++;
      }

      query += ' ORDER BY zone, aisle, shelf';

      const result = await getPool().query(query, params);

      return result.rows.map((row: any) => ({
        binId: row.bin_id,
        zone: row.zone,
        aisle: row.aisle,
        shelf: row.shelf,
        type: row.type,
        active: row.active,
      }));
    } catch (error) {
      logger.error('Error getting bin locations', error);
      throw error;
    }
  }

  // --------------------------------------------------------------------------
  // INVENTORY ANALYTICS - NEW METHODS
  // --------------------------------------------------------------------------

  /**
   * Get inventory aging report - items grouped by how long they've been in warehouse
   */
  async getInventoryAgingReport(
    filters: {
      sku?: string;
      binLocation?: string;
      minDays?: number;
    } = {}
  ): Promise<{
    items: Array<{
      sku: string;
      name: string;
      binLocation: string;
      quantity: number;
      daysInWarehouse: number;
      lastReceivedDate: Date;
      lotNumber?: string;
      expirationDate?: Date;
    }>;
    agingBuckets: Array<{
      range: string;
      itemCount: number;
      totalQuantity: number;
    }>;
  }> {
    try {
      const params: any[] = [];
      let paramCount = 1;
      let query = `
        SELECT
          iu.sku,
          s.name,
          iu.bin_location as "binLocation",
          iu.quantity,
          MAX(it.timestamp) as "lastReceivedDate",
          EXTRACT(DAY FROM NOW() - MAX(it.timestamp)) as "daysInWarehouse",
          iu.lot_number as "lotNumber",
          iu.expiration_date as "expirationDate"
        FROM inventory_units iu
        INNER JOIN skus s ON s.sku = iu.sku
        LEFT JOIN inventory_transactions it ON it.sku = iu.sku AND it.type = 'RECEIPT'
        WHERE iu.quantity > 0
      `;

      if (filters.sku) {
        query += ` AND iu.sku = $${paramCount}`;
        params.push(filters.sku);
        paramCount++;
      }

      if (filters.binLocation) {
        query += ` AND iu.bin_location LIKE $${paramCount}`;
        params.push(`${filters.binLocation}%`);
        paramCount++;
      }

      if (filters.minDays !== undefined) {
        query += ` AND EXTRACT(DAY FROM NOW() - MAX(it.timestamp)) >= $${paramCount}`;
        params.push(filters.minDays);
        paramCount++;
      }

      query += `
        GROUP BY iu.sku, s.name, iu.bin_location, iu.quantity, iu.lot_number, iu.expiration_date
        ORDER BY "daysInWarehouse" DESC
      `;

      const result = await getPool().query(query, params);

      const items = result.rows.map((row: any) => ({
        sku: row.sku,
        name: row.name,
        binLocation: row.binLocation,
        quantity: parseInt(row.quantity),
        daysInWarehouse: Math.floor(row.daysInWarehouse) || 0,
        lastReceivedDate: row.lastReceivedDate,
        lotNumber: row.lotNumber,
        expirationDate: row.expirationDate,
      }));

      // Calculate aging buckets
      const agingBuckets = [
        { range: '0-30 days', min: 0, max: 30, itemCount: 0, totalQuantity: 0 },
        { range: '31-60 days', min: 31, max: 60, itemCount: 0, totalQuantity: 0 },
        { range: '61-90 days', min: 61, max: 90, itemCount: 0, totalQuantity: 0 },
        { range: '91-180 days', min: 91, max: 180, itemCount: 0, totalQuantity: 0 },
        { range: '180+ days', min: 181, max: 99999, itemCount: 0, totalQuantity: 0 },
      ];

      items.forEach(item => {
        const bucket = agingBuckets.find(
          b => item.daysInWarehouse >= b.min && item.daysInWarehouse <= b.max
        );
        if (bucket) {
          bucket.itemCount++;
          bucket.totalQuantity += item.quantity;
        }
      });

      return { items, agingBuckets };
    } catch (error) {
      logger.error('Error generating inventory aging report', error);
      throw error;
    }
  }

  /**
   * Get lot tracking information for an SKU
   */
  async getLotTracking(sku: string): Promise<{
    lots: Array<{
      lotNumber: string;
      expirationDate?: Date;
      quantity: number;
      available: number;
      binLocations: string[];
      daysUntilExpiration?: number;
      status: 'OK' | 'EXPIRING_SOON' | 'EXPIRED';
    }>;
  }> {
    try {
      const result = await getPool().query(
        `
        SELECT
          lot_number as "lotNumber",
          expiration_date as "expirationDate",
          SUM(quantity) as quantity,
          SUM(available) as available,
          ARRAY_AGG(DISTINCT bin_location) as "binLocations"
        FROM inventory_units
        WHERE sku = $1 AND lot_number IS NOT NULL
        GROUP BY lot_number, expiration_date
        ORDER BY
          CASE WHEN expiration_date IS NULL THEN 1 ELSE 0 END,
          expiration_date ASC
        `,
        [sku]
      );

      const lots = result.rows.map((row: any) => {
        const expirationDate = row.expirationDate ? new Date(row.expirationDate) : undefined;
        let daysUntilExpiration: number | undefined;
        let status: 'OK' | 'EXPIRING_SOON' | 'EXPIRED' = 'OK';

        if (expirationDate) {
          daysUntilExpiration = Math.floor(
            (expirationDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
          );
          if (daysUntilExpiration < 0) {
            status = 'EXPIRED';
          } else if (daysUntilExpiration <= 30) {
            status = 'EXPIRING_SOON';
          }
        }

        return {
          lotNumber: row.lotNumber,
          expirationDate,
          quantity: parseInt(row.quantity),
          available: parseInt(row.available),
          binLocations: row.binLocations || [],
          daysUntilExpiration,
          status,
        };
      });

      return { lots };
    } catch (error) {
      logger.error('Error getting lot tracking', error);
      throw error;
    }
  }

  /**
   * Get expiring inventory report (FEFO - First Expired First Out)
   */
  async getExpiringInventory(days: number = 30): Promise<{
    items: Array<{
      sku: string;
      name: string;
      lotNumber: string;
      expirationDate: Date;
      daysUntilExpiration: number;
      quantity: number;
      available: number;
      binLocation: string;
      urgency: 'CRITICAL' | 'WARNING' | 'INFO';
    }>;
  }> {
    try {
      const result = await getPool().query(
        `
        SELECT
          iu.sku,
          s.name,
          iu.lot_number as "lotNumber",
          iu.expiration_date as "expirationDate",
          EXTRACT(DAY FROM iu.expiration_date - NOW()) as "daysUntilExpiration",
          iu.quantity,
          iu.available,
          iu.bin_location as "binLocation"
        FROM inventory_units iu
        INNER JOIN skus s ON s.sku = iu.sku
        WHERE iu.expiration_date IS NOT NULL
          AND iu.expiration_date <= NOW() + ($1 || ' days')::INTERVAL
          AND iu.quantity > 0
        ORDER BY iu.expiration_date ASC
        `,
        [days]
      );

      const items = result.rows.map((row: any) => {
        const daysUntilExpiration = Math.floor(row.daysUntilExpiration);
        let urgency: 'CRITICAL' | 'WARNING' | 'INFO' = 'INFO';

        if (daysUntilExpiration < 0) {
          urgency = 'CRITICAL';
        } else if (daysUntilExpiration <= 7) {
          urgency = 'CRITICAL';
        } else if (daysUntilExpiration <= 14) {
          urgency = 'WARNING';
        }

        return {
          sku: row.sku,
          name: row.name,
          lotNumber: row.lotNumber,
          expirationDate: new Date(row.expirationDate),
          daysUntilExpiration,
          quantity: parseInt(row.quantity),
          available: parseInt(row.available),
          binLocation: row.binLocation,
          urgency,
        };
      });

      return { items };
    } catch (error) {
      logger.error('Error getting expiring inventory', error);
      throw error;
    }
  }

  /**
   * Get bin utilization report from location_capacities table
   */
  async getBinUtilizationReport(filters?: {
    zone?: string;
    status?: 'OK' | 'WARNING' | 'OVER_CAPACITY';
  }): Promise<{
    bins: Array<{
      binLocation: string;
      zone: string;
      capacityType: 'WEIGHT' | 'VOLUME' | 'QUANTITY';
      maximumCapacity: number;
      currentUtilization: number;
      availableCapacity: number;
      utilizationPercent: number;
      status: 'OK' | 'WARNING' | 'OVER_CAPACITY';
      itemsCount: number;
    }>;
    zoneSummary: Array<{
      zone: string;
      totalBins: number;
      occupiedBins: number;
      averageUtilization: number;
      overCapacityBins: number;
    }>;
  }> {
    try {
      let query = `
        SELECT
          lc.bin_location as "binLocation",
          bl.zone,
          lc.capacity_type as "capacityType",
          lc.maximum_capacity as "maximumCapacity",
          lc.current_utilization as "currentUtilization",
          lc.available_capacity as "availableCapacity",
          lc.utilization_percent as "utilizationPercent",
          COUNT(iu.sku) as "itemsCount"
        FROM location_capacities lc
        INNER JOIN bin_locations bl ON bl.bin_id = lc.bin_location
        LEFT JOIN inventory_units iu ON iu.bin_location = lc.bin_location AND iu.quantity > 0
        WHERE 1=1
      `;
      const params: any[] = [];
      let paramCount = 1;

      if (filters?.zone) {
        query += ` AND bl.zone = $${paramCount}`;
        params.push(filters.zone);
        paramCount++;
      }

      if (filters?.status) {
        if (filters.status === 'OVER_CAPACITY') {
          query += ` AND lc.utilization_percent > 100`;
        } else if (filters.status === 'WARNING') {
          query += ` AND lc.utilization_percent >= 80 AND lc.utilization_percent <= 100`;
        } else {
          query += ` AND lc.utilization_percent < 80`;
        }
      }

      query += ` GROUP BY lc.bin_location, bl.zone, lc.capacity_type, lc.maximum_capacity, lc.current_utilization, lc.available_capacity, lc.utilization_percent`;

      const result = await getPool().query(query, params);

      const bins = result.rows.map((row: any) => {
        const utilizationPercent = parseFloat(row.utilizationPercent);
        let status: 'OK' | 'WARNING' | 'OVER_CAPACITY' = 'OK';

        if (utilizationPercent > 100) {
          status = 'OVER_CAPACITY';
        } else if (utilizationPercent >= 80) {
          status = 'WARNING';
        }

        return {
          binLocation: row.binLocation,
          zone: row.zone,
          capacityType: row.capacityType,
          maximumCapacity: parseFloat(row.maximumCapacity),
          currentUtilization: parseFloat(row.currentUtilization),
          availableCapacity: parseFloat(row.availableCapacity),
          utilizationPercent,
          status,
          itemsCount: parseInt(row.itemsCount),
        };
      });

      // Get zone summary
      let zoneQuery = `
        SELECT
          bl.zone,
          COUNT(DISTINCT lc.bin_location) as "totalBins",
          COUNT(DISTINCT CASE WHEN iu.sku IS NOT NULL THEN lc.bin_location END) as "occupiedBins",
          AVG(lc.utilization_percent) as "averageUtilization",
          COUNT(DISTINCT CASE WHEN lc.utilization_percent > 100 THEN lc.bin_location END) as "overCapacityBins"
        FROM location_capacities lc
        INNER JOIN bin_locations bl ON bl.bin_id = lc.bin_location
        LEFT JOIN inventory_units iu ON iu.bin_location = lc.bin_location AND iu.quantity > 0
        WHERE 1=1
      `;
      const zoneParams: any[] = [];
      let zoneParamCount = 1;

      if (filters?.zone) {
        zoneQuery += ` AND bl.zone = $${zoneParamCount}`;
        zoneParams.push(filters.zone);
        zoneParamCount++;
      }

      zoneQuery += ` GROUP BY bl.zone ORDER BY bl.zone`;

      const zoneResult = await getPool().query(zoneQuery, zoneParams);

      const zoneSummary = zoneResult.rows.map((row: any) => ({
        zone: row.zone,
        totalBins: parseInt(row.totalBins),
        occupiedBins: parseInt(row.occupiedBins),
        averageUtilization: parseFloat(row.averageUtilization) || 0,
        overCapacityBins: parseInt(row.overCapacityBins),
      }));

      return { bins, zoneSummary };
    } catch (error) {
      logger.error('Error getting bin utilization report', error);
      throw error;
    }
  }

  /**
   * Get inventory turnover metrics
   */
  async getInventoryTurnover(period: 'month' | 'quarter' | 'year' = 'month'): Promise<{
    period: string;
    startDate: Date;
    endDate: Date;
    items: Array<{
      sku: string;
      name: string;
      receiptsQuantity: number;
      deductionsQuantity: number;
      averageInventory: number;
      turnoverCount: number;
      turnoverRate: 'HIGH' | 'NORMAL' | 'LOW' | 'STAGNANT';
    }>;
  }> {
    try {
      let interval = '1 month';
      if (period === 'quarter') interval = '3 months';
      if (period === 'year') interval = '1 year';

      const query = `
        WITH period_range AS (
          SELECT
            NOW() - ($1::INTERVAL) as "startDate",
            NOW() as "endDate"
        ),
        inventory_movement AS (
          SELECT
            iu.sku,
            s.name,
            SUM(CASE WHEN it.type = 'RECEIPT' THEN ABS(it.quantity) ELSE 0 END) as "receiptsQuantity",
            SUM(CASE WHEN it.type = 'DEDUCTION' THEN ABS(it.quantity) ELSE 0 END) as "deductionsQuantity",
            AVG(iu.quantity) as "averageInventory"
          FROM inventory_units iu
          INNER JOIN skus s ON s.sku = iu.sku
          LEFT JOIN inventory_transactions it ON it.sku = iu.sku
            AND it.timestamp >= (SELECT "startDate" FROM period_range)
            AND it.timestamp <= (SELECT "endDate" FROM period_range)
          WHERE iu.quantity > 0
          GROUP BY iu.sku, s.name
          HAVING SUM(CASE WHEN it.type IN ('RECEIPT', 'DEDUCTION') THEN 1 ELSE 0 END) > 0
        )
        SELECT
          sku,
          name,
          receiptsQuantity,
          deductionsQuantity,
          averageInventory,
          CASE
            WHEN averageInventory > 0 THEN ROUND((deductionsQuantity::NUMERIC / averageInventory), 2)
            ELSE 0
          END as "turnoverCount"
        FROM inventory_movement
        ORDER BY "turnoverCount" DESC
      `;

      const result = await getPool().query(query, [interval]);

      const startDate = new Date();
      if (period === 'month') startDate.setMonth(startDate.getMonth() - 1);
      if (period === 'quarter') startDate.setMonth(startDate.getMonth() - 3);
      if (period === 'year') startDate.setFullYear(startDate.getFullYear() - 1);

      const items = result.rows.map((row: any) => {
        const turnoverCount = parseFloat(row.turnoverCount);
        let turnoverRate: 'HIGH' | 'NORMAL' | 'LOW' | 'STAGNANT' = 'NORMAL';

        if (turnoverCount >= 4) {
          turnoverRate = 'HIGH';
        } else if (turnoverCount >= 2) {
          turnoverRate = 'NORMAL';
        } else if (turnoverCount >= 0.5) {
          turnoverRate = 'LOW';
        } else {
          turnoverRate = 'STAGNANT';
        }

        return {
          sku: row.sku,
          name: row.name,
          receiptsQuantity: parseInt(row.receiptsQuantity) || 0,
          deductionsQuantity: parseInt(row.deductionsQuantity) || 0,
          averageInventory: Math.round(parseFloat(row.averageInventory)),
          turnoverCount,
          turnoverRate,
        };
      });

      return {
        period,
        startDate,
        endDate: new Date(),
        items,
      };
    } catch (error) {
      logger.error('Error getting inventory turnover', error);
      throw error;
    }
  }
}

// Singleton instance
export const stockControlService = new StockControlService();
