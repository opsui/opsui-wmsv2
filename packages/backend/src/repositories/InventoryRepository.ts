/**
 * Inventory repository
 *
 * Handles all database operations for inventory units and transactions
 */

import { BaseRepository } from './BaseRepository';
import { InventoryUnit, TransactionType, InventoryTransaction } from '@opsui/shared';
import { query } from '../db/client';
import { NotFoundError, ConflictError } from '@opsui/shared';

// ============================================================================
// INVENTORY REPOSITORY
// ============================================================================

export class InventoryRepository extends BaseRepository<InventoryUnit> {
  constructor() {
    super('inventory_units', 'unit_id');
  }

  // --------------------------------------------------------------------------
  // FIND BY SKU
  // --------------------------------------------------------------------------

  async findBySKU(sku: string): Promise<InventoryUnit[]> {
    const result = await query<InventoryUnit>(
      `SELECT * FROM inventory_units WHERE sku = $1 ORDER BY bin_location`,
      [sku]
    );

    return result.rows;
  }

  // --------------------------------------------------------------------------
  // FIND BY BIN LOCATION
  // --------------------------------------------------------------------------

  async findByBinLocation(binLocation: string): Promise<InventoryUnit[]> {
    const result = await query<InventoryUnit>(
      `SELECT * FROM inventory_units WHERE bin_location = $1`,
      [binLocation]
    );

    return result.rows;
  }

  // --------------------------------------------------------------------------
  // GET AVAILABLE INVENTORY FOR SKU
  // --------------------------------------------------------------------------

  async getAvailableInventory(sku: string): Promise<
    Array<{
      binLocation: string;
      available: number;
    }>
  > {
    const result = await query(
      `SELECT bin_location, available
       FROM inventory_units
       WHERE sku = $1 AND available > 0
       ORDER BY available DESC`,
      [sku]
    );

    return result.rows.map((row: any) => ({
      binLocation: row.bin_location,
      available: row.available,
    }));
  }

  // --------------------------------------------------------------------------
  // GET TOTAL AVAILABLE FOR SKU
  // --------------------------------------------------------------------------

  async getTotalAvailable(sku: string): Promise<number> {
    const result = await query(
      `SELECT COALESCE(SUM(available), 0) as total
       FROM inventory_units
       WHERE sku = $1`,
      [sku]
    );

    return parseInt(result.rows[0].total, 10);
  }

  // --------------------------------------------------------------------------
  // RESERVE INVENTORY
  // --------------------------------------------------------------------------

  async reserveInventory(
    sku: string,
    binLocation: string,
    quantity: number,
    orderId: string
  ): Promise<InventoryUnit> {
    return this.withTransaction(async client => {
      // Check availability
      const checkResult = await client.query(
        `SELECT available FROM inventory_units
         WHERE sku = $1 AND bin_location = $2 FOR UPDATE`,
        [sku, binLocation]
      );

      if (checkResult.rows.length === 0) {
        throw new NotFoundError('Inventory unit', `${sku} at ${binLocation}`);
      }

      const available = parseInt(checkResult.rows[0].available, 10);
      if (available < quantity) {
        throw new ConflictError(
          `Insufficient inventory at ${binLocation}. Available: ${available}, requested: ${quantity}`
        );
      }

      // Reserve the inventory
      const result = await client.query(
        `UPDATE inventory_units
         SET reserved = reserved + $1, last_updated = NOW()
         WHERE sku = $2 AND bin_location = $3
         RETURNING *`,
        [quantity, sku, binLocation]
      );

      // Log the reservation
      await client.query(
        `INSERT INTO inventory_transactions (transaction_id, type, sku, quantity, order_id, reason, bin_location)
         VALUES ($1, 'RESERVATION', $2, $3, $4, 'Order allocation', $5)`,
        [`TXN-RES-${orderId}-${sku}-${Date.now()}`, sku, quantity, orderId, binLocation]
      );

      return result.rows[0];
    });
  }

  // --------------------------------------------------------------------------
  // RELEASE RESERVATION
  // --------------------------------------------------------------------------

  async releaseReservation(
    sku: string,
    binLocation: string,
    quantity: number,
    orderId: string
  ): Promise<InventoryUnit> {
    const result = await query(
      `UPDATE inventory_units
       SET reserved = GREATEST(0, reserved - $1), last_updated = NOW()
       WHERE sku = $2 AND bin_location = $3
       RETURNING *`,
      [quantity, sku, binLocation]
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('Inventory unit', `${sku} at ${binLocation}`);
    }

    // Log the release
    await query(
      `INSERT INTO inventory_transactions (transaction_id, type, sku, quantity, order_id, reason, bin_location)
       VALUES ($1, 'CANCELLATION', $2, $3, $4, 'Reservation released', $5)`,
      [`TXN-REL-${orderId}-${sku}-${Date.now()}`, sku, quantity, orderId, binLocation]
    );

    return result.rows[0] as InventoryUnit;
  }

  // --------------------------------------------------------------------------
  // DEDUCT INVENTORY (at shipping)
  // --------------------------------------------------------------------------

  async deductInventory(
    sku: string,
    binLocation: string,
    quantity: number,
    orderId: string
  ): Promise<InventoryUnit> {
    return this.withTransaction(async client => {
      // Check sufficient quantity
      const checkResult = await client.query(
        `SELECT quantity, reserved FROM inventory_units
         WHERE sku = $1 AND bin_location = $2 FOR UPDATE`,
        [sku, binLocation]
      );

      if (checkResult.rows.length === 0) {
        throw new NotFoundError('Inventory unit', `${sku} at ${binLocation}`);
      }

      const { quantity: currentQty } = checkResult.rows[0];

      if (currentQty < quantity) {
        throw new ConflictError(
          `Insufficient inventory to deduct. Current: ${currentQty}, requested: ${quantity}`
        );
      }

      // Deduct from both quantity and reserved
      const result = await client.query(
        `UPDATE inventory_units
         SET quantity = quantity - $1,
             reserved = GREATEST(0, reserved - $1),
             last_updated = NOW()
         WHERE sku = $2 AND bin_location = $3
         RETURNING *`,
        [quantity, sku, binLocation]
      );

      // Log the deduction
      await client.query(
        `INSERT INTO inventory_transactions (transaction_id, type, sku, quantity, order_id, reason, bin_location)
         VALUES ($1, 'DEDUCTION', $2, $3, $4, 'Order shipped', $5)`,
        [`TXN-DED-${orderId}-${sku}-${Date.now()}`, sku, -quantity, orderId, binLocation]
      );

      return result.rows[0];
    });
  }

  // --------------------------------------------------------------------------
  // ADJUST INVENTORY (manual correction)
  // --------------------------------------------------------------------------

  async adjustInventory(
    sku: string,
    binLocation: string,
    quantity: number,
    userId: string,
    reason: string
  ): Promise<InventoryUnit> {
    return this.withTransaction(async client => {
      const result = await client.query(
        `INSERT INTO inventory_units (unit_id, sku, bin_location, quantity, reserved, last_updated)
         VALUES ($1, $2, $3, $4, 0, NOW())
         ON CONFLICT (sku, bin_location)
         DO UPDATE SET
           quantity = inventory_units.quantity + $4,
           last_updated = NOW()
         RETURNING *`,
        [`IU-${sku}-${binLocation}`, sku, binLocation, quantity]
      );

      // Log the adjustment
      await client.query(
        `INSERT INTO inventory_transactions (transaction_id, type, sku, quantity, user_id, reason, bin_location)
         VALUES ($1, 'ADJUSTMENT', $2, $3, $4, $5, $6)`,
        [`TXN-ADJ-${sku}-${Date.now()}`, sku, quantity, userId, reason, binLocation]
      );

      return result.rows[0];
    });
  }

  // --------------------------------------------------------------------------
  // GET TRANSACTION HISTORY
  // --------------------------------------------------------------------------

  async getTransactionHistory(
    filters: {
      sku?: string;
      orderId?: string;
      type?: TransactionType;
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<{ transactions: InventoryTransaction[]; total: number }> {
    const conditions: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (filters.sku) {
      conditions.push(`sku = $${paramIndex++}`);
      params.push(filters.sku);
    }

    if (filters.orderId) {
      conditions.push(`order_id = $${paramIndex++}`);
      params.push(filters.orderId);
    }

    if (filters.type) {
      conditions.push(`type = $${paramIndex++}`);
      params.push(filters.type);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const limit = filters.limit || 50;
    const offset = filters.offset || 0;

    // Count total
    const countResult = await query(
      `SELECT COUNT(*) FROM inventory_transactions ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].count, 10);

    // Fetch transactions
    const transactionsResult = await query<InventoryTransaction>(
      `SELECT * FROM inventory_transactions
       ${whereClause}
       ORDER BY timestamp DESC
       LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
      [...params, limit, offset]
    );

    return {
      transactions: transactionsResult.rows,
      total,
    };
  }

  // --------------------------------------------------------------------------
  // GET LOW STOCK ALERTS
  // --------------------------------------------------------------------------

  async getLowStock(threshold: number = 10): Promise<
    Array<{
      sku: string;
      binLocation: string;
      available: number;
      quantity: number;
    }>
  > {
    const result = await query(
      `SELECT sku, bin_location, available, quantity
       FROM inventory_units
       WHERE available < $1
       ORDER BY available ASC`,
      [threshold]
    );

    return result.rows.map((row: any) => ({
      sku: row.sku,
      binLocation: row.bin_location,
      available: row.available,
      quantity: row.quantity,
    }));
  }

  // --------------------------------------------------------------------------
  // RECONCILE INVENTORY
  // --------------------------------------------------------------------------

  async reconcileInventory(sku: string): Promise<{
    expected: number;
    actual: number;
    discrepancies: Array<{
      binLocation: string;
      expected: number;
      actual: number;
      difference: number;
    }>;
  }> {
    // Calculate expected from orders
    const expectedResult = await query(
      `SELECT SUM(quantity) as total FROM order_items oi
       INNER JOIN orders o ON oi.order_id = o.order_id
       WHERE oi.sku = $1 AND o.status NOT IN ('CANCELLED', 'SHIPPED')`,
      [sku]
    );

    const expected = parseInt(expectedResult.rows[0].total || '0', 10);

    // Get actual inventory
    const actualResult = await query(
      `SELECT SUM(quantity - reserved) as total FROM inventory_units WHERE sku = $1`,
      [sku]
    );

    const actual = parseInt(actualResult.rows[0].total || '0', 10);

    // Get per-bin discrepancies
    const discrepanciesResult = await query(
      `SELECT bin_location,
         SUM(quantity - reserved) as actual,
         0 as expected
       FROM inventory_units
       WHERE sku = $1
       GROUP BY bin_location`,
      [sku]
    );

    return {
      expected,
      actual,
      discrepancies: discrepanciesResult.rows.map(row => ({
        binLocation: row.bin_location,
        expected: parseInt(row.expected, 10),
        actual: parseInt(row.actual, 10),
        difference: parseInt(row.actual, 10) - parseInt(row.expected, 10),
      })),
    };
  }
}

// Singleton instance
export const inventoryRepository = new InventoryRepository();
