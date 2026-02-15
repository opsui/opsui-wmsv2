/**
 * Order repository
 *
 * Handles all database operations for orders and order items
 */

import {
  ConflictError,
  CreateOrderDTO,
  generateOrderId,
  generatePickTaskId,
  NotFoundError,
  Order,
  OrderPriority,
  OrderStatus,
} from '@opsui/shared';
import { logger } from '../config/logger';
import { query } from '../db/client';
import { BaseRepository } from './BaseRepository';
import { getOrderItemsQuery, mapOrderItem } from './queries/OrderQueries';

// ============================================================================
// ORDER REPOSITORY
// ============================================================================

export class OrderRepository extends BaseRepository<Order> {
  constructor() {
    super('orders', 'order_id');
  }

  // --------------------------------------------------------------------------
  // CREATE ORDER WITH ITEMS
  // --------------------------------------------------------------------------

  async createOrderWithItems(dto: CreateOrderDTO): Promise<Order> {
    return this.withTransaction(async client => {
      // Generate order ID
      const orderId = generateOrderId();

      // Default currency
      const currency = 'NZD';
      let subtotal = 0;

      // Create order
      const order = await this.insert(
        {
          orderId,
          customerId: dto.customerId,
          customerName: dto.customerName,
          priority: dto.priority,
          status: OrderStatus.PENDING,
          progress: 0,
          currency,
          taxAmount: 0,
          shippingCost: 0,
          discountAmount: 0,
        } as any,
        client
      );

      // Create order items
      for (let i = 0; i < dto.items.length; i++) {
        const item = dto.items[i];

        // Get SKU details, bin location, and pricing
        const skuResult = await client.query(
          `SELECT s.name, s.bin_locations[1] as bin_location, s.unit_price, s.currency FROM skus s WHERE s.sku = $1 AND s.active = true`,
          [item.sku]
        );

        if (skuResult.rows.length === 0) {
          throw new NotFoundError('SKU', item.sku);
        }

        const { name, bin_location, unit_price, skuCurrency } = skuResult.rows[0];

        // Calculate line total
        const unitPrice = unit_price ? parseFloat(unit_price) : 0;
        const lineTotal = unitPrice * item.quantity;
        subtotal += lineTotal;

        // Check inventory availability
        const inventoryResult = await client.query(
          `SELECT available FROM inventory_units WHERE sku = $1 AND bin_location = $2`,
          [item.sku, bin_location]
        );

        if (inventoryResult.rows.length === 0) {
          throw new ConflictError(`No inventory found for SKU ${item.sku} at ${bin_location}`);
        }

        const available = parseInt(inventoryResult.rows[0].available, 10);
        if (available < item.quantity) {
          throw new ConflictError(
            `Insufficient inventory for SKU ${item.sku}. Available: ${available}, requested: ${item.quantity}`
          );
        }

        // Create order item with pricing
        await client.query(
          `INSERT INTO order_items (order_item_id, order_id, sku, name, quantity, bin_location, status, unit_price, line_total, currency) VALUES ($1, $2, $3, $4, $5, $6, 'PENDING', $7, $8, $9)`,
          [
            `OI-${order.orderId}-${i}`,
            order.orderId,
            item.sku,
            name,
            item.quantity,
            bin_location,
            unitPrice,
            lineTotal,
            skuCurrency || currency,
          ]
        );
      }

      // Calculate and update order totals
      const taxAmount = 0; // TODO: Implement tax calculation based on customer location
      const shippingCost = 0; // TODO: Implement shipping cost calculation
      const discountAmount = 0; // TODO: Implement discount calculation
      const totalAmount = subtotal + taxAmount + shippingCost - discountAmount;

      await client.query(
        `UPDATE orders SET subtotal = $1, tax_amount = $2, shipping_cost = $3, discount_amount = $4, total_amount = $5 WHERE order_id = $6`,
        [subtotal, taxAmount, shippingCost, discountAmount, totalAmount, orderId]
      );

      // Fetch complete order with items
      return this.getOrderWithItems(order.orderId);
    });
  }

  // --------------------------------------------------------------------------
  // GET ORDER WITH ITEMS
  // --------------------------------------------------------------------------

  async getOrderWithItems(orderId: string): Promise<Order> {
    const order = await this.findByIdOrThrow(orderId);

    let itemsResult: any;
    let progress = 0;

    // Use centralized query based on order status
    const itemsQuery = getOrderItemsQuery(order.status);
    itemsResult = await query(itemsQuery, [orderId]);

    // Calculate progress based on completed pick tasks for PICKING orders
    if (order.status === OrderStatus.PICKING && itemsResult.rows.length > 0) {
      const totalTasks = itemsResult.rows.length;
      const completedTasks = itemsResult.rows.filter(
        (item: any) => item.status === 'COMPLETED'
      ).length;
      progress = Math.round((completedTasks / totalTasks) * 100);
    }

    // Debug logging for PACKING orders
    if (order.status === OrderStatus.PACKING) {
      logger.info('[getOrderWithItems] PACKING order items fetched', {
        orderId,
        itemCount: itemsResult.rows.length,
        items: itemsResult.rows.map((item: any) => ({
          orderItemId: item.order_item_id,
          sku: item.sku,
          verifiedQuantity: item.verified_quantity,
          quantity: item.quantity,
        })),
      });
    }

    return {
      ...order,
      items: itemsResult.rows,
      progress,
    } as Order;
  }

  // --------------------------------------------------------------------------
  // ORDER QUEUE
  // --------------------------------------------------------------------------

  async getOrderQueue(
    filters: {
      status?: OrderStatus;
      priority?: OrderPriority;
      pickerId?: string;
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<{ orders: Order[]; total: number }> {
    const conditions: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (filters.status) {
      conditions.push(`o.status = $${paramIndex++}`);
      params.push(filters.status);
    }

    if (filters.priority) {
      conditions.push(`o.priority = $${paramIndex++}`);
      params.push(filters.priority);
    }

    if (filters.pickerId) {
      conditions.push(`o.picker_id = $${paramIndex++}`);
      params.push(filters.pickerId);
    }

    // For PENDING status, exclude orders that are already claimed (have a picker_id)
    // This prevents showing already-claimed orders in the queue
    if (filters.status === OrderStatus.PENDING && !filters.pickerId) {
      conditions.push(`o.picker_id IS NULL`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const limit = filters.limit || 20;
    const offset = filters.offset || 0;

    // Count total
    const countResult = await query(`SELECT COUNT(*) FROM orders o ${whereClause}`, params);
    const total = parseInt(countResult.rows[0].count, 10);

    // Fetch orders with dynamic progress calculation
    // For PICKING orders: calculate progress based on completed items
    // For PENDING orders: progress is 0
    const ordersResult = await query(
      `SELECT 
        o.*,
        CASE 
          WHEN o.status = 'PICKING' 
          THEN (
            SELECT COUNT(*) FROM pick_tasks pt WHERE pt.order_id = o.order_id
          )
          ELSE (
            SELECT COUNT(*) FROM order_items oi WHERE oi.order_id = o.order_id
          )
        END as item_count,
        CASE 
          WHEN o.status = 'PICKING' 
          THEN (
            SELECT COUNT(*) FILTER (WHERE pt.status = 'COMPLETED') FROM pick_tasks pt WHERE pt.order_id = o.order_id
          )
          ELSE 0
        END as completed_count,
        CASE 
          WHEN o.status = 'PICKING' 
          THEN ROUND(
            CAST(
              (SELECT COUNT(*) FILTER (WHERE pt.status = 'COMPLETED') FROM pick_tasks pt WHERE pt.order_id = o.order_id) AS FLOAT
            ) / NULLIF(
              (SELECT COUNT(*) FROM pick_tasks pt WHERE pt.order_id = o.order_id), 
              0
            ) * 100
          )
          ELSE 0
        END as progress
      FROM orders o
      ${whereClause}
      ORDER BY o.priority DESC, o.created_at ASC 
      LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
      [...params, limit, offset]
    );

    // Fetch items for each order using centralized queries
    const orders = await Promise.all(
      ordersResult.rows.map(async order => {
        const itemsQuery = getOrderItemsQuery(order.status);
        const itemsResult = await query(itemsQuery, [order.orderId]);

        // Map database columns to camelCase for frontend
        const mappedItems = itemsResult.rows.map(mapOrderItem);

        return {
          ...order,
          items: mappedItems,
        };
      })
    );

    return {
      orders: orders as Order[],
      total,
    };
  }

  // --------------------------------------------------------------------------
  // GET ORDERS WITH ITEMS BY STATUS
  // --------------------------------------------------------------------------

  async getOrdersWithItemsByStatus(
    filters: {
      status?: OrderStatus;
      packerId?: string;
    } = {}
  ): Promise<{ orders: Order[] }> {
    const conditions: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (filters.status) {
      conditions.push(`o.status = $${paramIndex++}`);
      params.push(filters.status);
    }

    if (filters.packerId) {
      conditions.push(`o.packer_id = $${paramIndex++}`);
      params.push(filters.packerId);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Get orders with items
    const ordersResult = await query<Order>(
      `SELECT o.*,
        CASE
          WHEN o.status = 'PACKING'
          THEN (
            SELECT COUNT(*) FILTER (
              WHERE oi.picked_quantity >= oi.quantity
            ) FROM order_items oi WHERE oi.order_id = o.order_id
          )
          ELSE 0
        END as completed_count,
        CASE
          WHEN o.status = 'PACKING'
          THEN ROUND(
            CAST(
              (SELECT COUNT(*) FILTER (
                WHERE oi.picked_quantity >= oi.quantity
              ) FROM order_items oi WHERE oi.order_id = o.order_id) AS FLOAT
            ) / NULLIF((SELECT COUNT(*) FROM order_items oi WHERE oi.order_id = o.order_id), 0) * 100
          )
          ELSE 0
        END as progress
      FROM orders o
      ${whereClause}
      ORDER BY o.priority DESC, o.created_at ASC`,
      params
    );

    // Get items for each order using centralized queries
    const orders = await Promise.all(
      ordersResult.rows.map(async order => {
        const itemsQuery = getOrderItemsQuery(order.status);
        const itemsResult = await query(itemsQuery, [order.orderId]);

        // Map database columns to camelCase for frontend
        const mappedItems = itemsResult.rows.map(mapOrderItem);

        return {
          ...order,
          items: mappedItems,
        };
      })
    );

    return { orders };
  }

  // --------------------------------------------------------------------------
  // CLAIM ORDER
  // --------------------------------------------------------------------------

  async claimOrder(orderId: string, pickerId: string): Promise<Order> {
    return this.withTransaction(async client => {
      // Check if order exists and is claimable
      const orderResult = await client.query(
        `SELECT * FROM orders WHERE order_id = $1 FOR UPDATE`,
        [orderId]
      );

      if (orderResult.rows.length === 0) {
        throw new NotFoundError('Order', orderId);
      }

      const order = orderResult.rows[0];

      if (order.status !== OrderStatus.PENDING) {
        throw new ConflictError(
          `Order cannot be claimed because it is currently in status: ${order.status}. Only orders in PENDING status can be claimed.`
        );
      }

      if (order.picker_id) {
        throw new ConflictError(
          `Order already claimed by picker ${order.picker_id}. Only one picker can claim an order at a time.`
        );
      }

      // Check if picker has active orders
      const activeOrdersResult = await client.query(
        `SELECT COUNT(*) FROM orders WHERE picker_id = $1 AND status = 'PICKING'`,
        [pickerId]
      );
      const activeCount = parseInt(activeOrdersResult.rows[0].count, 10);

      if (activeCount >= 5) {
        throw new ConflictError(
          `You have reached the maximum limit of 5 active orders. Currently you have ${activeCount} active orders. Please complete or cancel some orders before claiming more.`
        );
      }

      await client.query(
        `UPDATE orders SET status = 'PICKING', picker_id = $1, claimed_at = NOW() WHERE order_id = $2`,
        [pickerId, orderId]
      );

      // Clean up any existing pick tasks for this order (from failed previous claims)
      await client.query(`DELETE FROM pick_tasks WHERE order_id = $1`, [orderId]);

      // Generate pick tasks
      const itemsResult = await client.query(`SELECT * FROM order_items WHERE order_id = $1`, [
        orderId,
      ]);

      for (const item of itemsResult.rows) {
        await client.query(
          `INSERT INTO pick_tasks (pick_task_id, order_id, order_item_id, sku, name, target_bin, quantity, picked_quantity, status) VALUES ($1, $2, $3, $4, $5, $6, $7, 0, 'PENDING')`,
          [
            generatePickTaskId(),
            orderId,
            item.order_item_id,
            item.sku,
            item.name,
            item.bin_location,
            item.quantity,
          ]
        );
      }

      return this.getOrderWithItems(orderId);
    });
  }

  // --------------------------------------------------------------------------
  // UPDATE ORDER STATUS
  // --------------------------------------------------------------------------

  async updateStatus(orderId: string, status: OrderStatus): Promise<Order> {
    const order = await this.findByIdOrThrow(orderId);

    // Validate status transition
    const validTransitions: Record<OrderStatus, string[]> = {
      PENDING: ['PICKING', 'CANCELLED', 'BACKORDER'],
      PICKING: ['PICKED', 'CANCELLED'],
      PICKED: ['PACKING', 'CANCELLED'],
      PACKING: ['PACKED'],
      PACKED: ['SHIPPED'],
      SHIPPED: [],
      CANCELLED: [],
      BACKORDER: ['PENDING'],
    };

    const allowedStatuses = validTransitions[order.status];
    if (!allowedStatuses.includes(status)) {
      throw new ConflictError(`Cannot transition order from ${order.status} to ${status}`);
    }

    const timestampColumnMap: Record<string, string | undefined> = {
      PICKED: 'picked_at',
      PACKED: 'packed_at',
      SHIPPED: 'shipped_at',
      CANCELLED: 'cancelled_at',
      PENDING: undefined,
      PICKING: undefined,
      BACKORDER: undefined,
    };

    const timestampColumnValue = timestampColumnMap[status];
    const updateQuery = timestampColumnValue
      ? `UPDATE orders SET status = $1, ${timestampColumnValue} = NOW() WHERE order_id = $2 RETURNING *`
      : `UPDATE orders SET status = $1 WHERE order_id = $2 RETURNING *`;

    await query(updateQuery, [status, orderId]);

    return this.getOrderWithItems(orderId);
  }

  // --------------------------------------------------------------------------
  // CANCEL ORDER
  // --------------------------------------------------------------------------

  async cancelOrder(orderId: string, userId: string, reason: string): Promise<Order> {
    return this.withTransaction(async client => {
      const order = await this.findByIdOrThrow(orderId);

      if (order.status === OrderStatus.SHIPPED) {
        throw new ConflictError('Cannot cancel a shipped order');
      }

      if (order.status === OrderStatus.CANCELLED) {
        return order; // Already cancelled
      }

      await client.query(
        `UPDATE orders SET status = 'CANCELLED', cancelled_at = NOW() WHERE order_id = $1`,
        [orderId]
      );

      await client.query(
        `UPDATE inventory_units SET reserved = reserved - oi.quantity, last_updated = NOW() FROM order_items oi WHERE inventory_units.sku = oi.sku AND inventory_units.bin_location = oi.bin_location AND oi.order_id = $1`,
        [orderId]
      );

      await client.query(
        `INSERT INTO inventory_transactions (transaction_id, type, sku, quantity, order_id, user_id, reason) SELECT 'TXN-CANCEL-' || oi.order_item_id, 'CANCELLATION', oi.sku, oi.quantity, oi.order_id, $1, $2 FROM order_items oi WHERE oi.order_id = $3`,
        [userId, reason, orderId]
      );

      return this.getOrderWithItems(orderId);
    });
  }

  // --------------------------------------------------------------------------
  // GET PICKER ACTIVE ORDERS
  // --------------------------------------------------------------------------

  async getPickerActiveOrders(pickerId: string): Promise<Order[]> {
    const result = await query(
      `SELECT o.* FROM orders o WHERE o.picker_id = $1 AND o.status = 'PICKING' ORDER BY o.priority DESC, o.created_at ASC`,
      [pickerId]
    );

    return result.rows as Order[];
  }
}

// Singleton instance

export const orderRepository = new OrderRepository();
