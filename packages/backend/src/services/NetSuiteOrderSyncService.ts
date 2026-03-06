/**
 * NetSuite Order Sync Service
 *
 * Pulls sales orders from NetSuite and creates WMS orders.
 * Uses NetSuiteClient with TBA OAuth 1.0 for REST Record API calls.
 *
 * @domain integrations
 * @dependencies NetSuiteClient, OrderRepository, IntegrationsRepository
 */

import {
  NetSuiteClient,
  NetSuiteCredentials,
  NetSuiteSalesOrder,
  NetSuiteSalesOrderLine,
} from './NetSuiteClient';
import { OrderRepository } from '../repositories/OrderRepository';
import { IntegrationsRepository } from '../repositories/IntegrationsRepository';
import { logger } from '../config/logger';
import { query } from '../db/client';
import { OrderPriority } from '@opsui/shared';

// ============================================================================
// TYPES
// ============================================================================

export interface NetSuiteSyncResult {
  totalProcessed: number;
  succeeded: number;
  failed: number;
  skipped: number;
  details: {
    imported: string[];
    failed: Array<{ tranId: string; error: string }>;
    skipped: Array<{ tranId: string; reason: string }>;
  };
}

export interface NetSuiteSyncOptions {
  /** Sync only orders modified after this date */
  lastSyncAt?: Date;
  /** Maximum number of orders to pull */
  limit?: number;
  /** NetSuite sales order status filter */
  status?: string;
  /** Create orders even if SKUs don't exist (will fail) */
  createMissingSkus?: boolean;
}

export interface NetSuiteOrderPreview {
  tranId: string;
  customerName: string;
  orderDate: string;
  shipDate?: string;
  lineCount: number;
  status: string;
  canImport: boolean;
  issues: string[];
}

// ============================================================================
// SERVICE
// ============================================================================

export class NetSuiteOrderSyncService {
  private client: NetSuiteClient;
  private orderRepository: OrderRepository;
  private integrationsRepository: IntegrationsRepository | null = null;

  constructor(
    credentialsOrClient?: NetSuiteCredentials | NetSuiteClient,
    orderRepository?: OrderRepository,
    integrationsRepository?: IntegrationsRepository
  ) {
    if (credentialsOrClient instanceof NetSuiteClient) {
      this.client = credentialsOrClient;
    } else {
      this.client = new NetSuiteClient(credentialsOrClient);
    }
    this.orderRepository = orderRepository || new OrderRepository();
    this.integrationsRepository = integrationsRepository || null;
  }

  // ========================================================================
  // MAIN SYNC METHOD
  // ========================================================================

  /**
   * Sync sales orders from NetSuite to WMS
   */
  async syncOrders(
    _integrationId: string,
    _options: NetSuiteSyncOptions = {}
  ): Promise<NetSuiteSyncResult> {
    const result: NetSuiteSyncResult = {
      totalProcessed: 0,
      succeeded: 0,
      failed: 0,
      skipped: 0,
      details: {
        imported: [],
        failed: [],
        skipped: [],
      },
    };

    try {
      logger.info('Starting NetSuite order sync');

      // Try Item Fulfillments first (these are orders ready for picking/packing)
      // If that fails due to permissions, fall back to Sales Orders
      const limit = _options.limit || 50;
      let items: Array<{ id: string }> = [];
      let useItemFulfillments = true;

      try {
        const response = await this.client.getItemFulfillments({ limit });
        items = response.items || [];
        logger.info('Fetched item fulfillments from NetSuite', {
          count: items.length,
          hasMore: response.hasMore,
        });
      } catch (error: any) {
        logger.warn('Failed to fetch item fulfillments, trying sales orders', {
          error: error.message,
        });
        useItemFulfillments = false;

        // Fall back to sales orders
        const response = await this.client.getSalesOrders({ limit });
        items = response.items || [];
        logger.info('Fetched sales orders from NetSuite', {
          count: items.length,
        });
      }

      result.totalProcessed = items.length;

      // Process each record
      for (const item of items) {
        try {
          let syncResult;
          if (useItemFulfillments) {
            // Get full item fulfillment details
            const fulfillment = await this.client.getItemFulfillment(item.id);
            syncResult = await this.syncSingleFulfillment(fulfillment, _options);
          } else {
            // Get full sales order details
            const salesOrder = await this.client.getSalesOrder(item.id);
            syncResult = await this.syncSingleOrder(salesOrder, _options);
          }

          if (syncResult.imported) {
            result.succeeded++;
            result.details.imported.push(syncResult.tranId || item.id);
          } else if (syncResult.skipped) {
            result.skipped++;
            result.details.skipped.push({
              tranId: syncResult.tranId || item.id,
              reason: syncResult.reason || 'Unknown reason',
            });
          }
        } catch (error: any) {
          result.failed++;
          result.details.failed.push({
            tranId: item.id,
            error: error.message || 'Unknown error',
          });
          logger.error('Failed to sync NetSuite order', {
            orderId: item.id,
            error: error.message,
          });
        }
      }

      logger.info('NetSuite order sync completed', {
        totalProcessed: result.totalProcessed,
        succeeded: result.succeeded,
        failed: result.failed,
        skipped: result.skipped,
      });

      return result;
    } catch (error: any) {
      logger.error('NetSuite order sync failed', {
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Sync a single item fulfillment from NetSuite
   * Item Fulfillments represent orders ready for picking/packing
   */
  private async syncSingleFulfillment(
    fulfillment: any,
    _options: NetSuiteSyncOptions
  ): Promise<{ imported: boolean; skipped: boolean; reason?: string; tranId?: string }> {
    const tranId = fulfillment.tranId || fulfillment.id;

    // Check if order already exists
    const existingOrder = await this.findOrderByExternalId(tranId);
    if (existingOrder) {
      logger.info('Fulfillment already exists, skipping', { tranId, orderId: existingOrder });
      return { imported: false, skipped: true, reason: 'Order already imported', tranId };
    }

    // Get line items from fulfillment
    const lineItems = fulfillment.item?.items || fulfillment.item || [];
    if (!Array.isArray(lineItems) || lineItems.length === 0) {
      return { imported: false, skipped: true, reason: 'No line items in fulfillment', tranId };
    }

    // Validate SKUs
    const mappedItems = lineItems.map((line: any) => ({
      item: { id: line.item?.id, refName: line.item?.refName || line.itemName },
      quantity: line.quantity || 1,
    }));

    const skuValidation = await this.validateSkus(mappedItems);
    if (!skuValidation.valid) {
      return {
        imported: false,
        skipped: true,
        reason: `Missing SKUs: ${skuValidation.missingSkus.join(', ')}`,
        tranId,
      };
    }

    // Create WMS order from fulfillment
    try {
      const order = await this.createWMSOrderFromFulfillment(fulfillment);
      logger.info('Created WMS order from NetSuite fulfillment', {
        orderId: order.orderId,
        tranId,
        itemCount: lineItems.length,
      });
      return { imported: true, skipped: false, tranId };
    } catch (error: any) {
      logger.error('Failed to create WMS order from fulfillment', { tranId, error: error.message });
      throw error;
    }
  }

  /**
   * Create a WMS order from a NetSuite item fulfillment
   */
  private async createWMSOrderFromFulfillment(fulfillment: any) {
    const lineItems = fulfillment.item?.items || fulfillment.item || [];
    const tranId = fulfillment.tranId || fulfillment.id;

    // Map fulfillment items to WMS order items
    const items = await Promise.all(
      lineItems.map(async (line: any) => {
        const sku = await this.findSkuByNetSuiteItem(
          line.item?.id,
          line.item?.refName || line.itemName
        );
        return {
          sku: sku || line.item?.refName || line.itemName || '',
          quantity: line.quantity || 1,
        };
      })
    );

    // Get address info
    const shippingAddr = fulfillment.shippingAddress || {};

    // Determine priority
    const priority = this.calculatePriority(fulfillment.shipDate);

    // Create order
    const order = await this.orderRepository.createOrderWithItems({
      customerId: fulfillment.entity?.id || fulfillment.createdFrom?.id || 'NETSUITE',
      customerName:
        fulfillment.entity?.refName || fulfillment.createdFrom?.refName || 'NetSuite Order',
      priority,
      items,
      externalOrderId: tranId,
      customerReference: tranId,
      notes: fulfillment.memo || `Imported from NetSuite Fulfillment - ${tranId}`,
      shippingAddress: {
        street1: shippingAddr.addr1 || '',
        street2: shippingAddr.addr2 || '',
        city: shippingAddr.city || '',
        state: shippingAddr.state || '',
        postalCode: shippingAddr.zip || '',
        country: shippingAddr.country?.refName || '',
      },
      requiredDate: fulfillment.shipDate ? new Date(fulfillment.shipDate) : undefined,
    } as any);

    // Store external reference
    await this.storeExternalOrderId(order.orderId, tranId, fulfillment.id);

    return order;
  }

  /**
   * Sync a single sales order from NetSuite
   */
  private async syncSingleOrder(
    salesOrder: NetSuiteSalesOrder,
    _options: NetSuiteSyncOptions
  ): Promise<{ imported: boolean; skipped: boolean; reason?: string }> {
    const tranId = salesOrder.tranId;

    // Check if order already exists (by external order ID)
    const existingOrder = await this.findOrderByExternalId(tranId);
    if (existingOrder) {
      logger.info('Order already exists, skipping', { tranId, orderId: existingOrder });
      return { imported: false, skipped: true, reason: 'Order already imported' };
    }

    // Validate line items have SKUs that exist in WMS
    const lineItems = salesOrder.item?.items || [];
    if (lineItems.length === 0) {
      return { imported: false, skipped: true, reason: 'No line items in order' };
    }

    // Validate all SKUs exist before creating order
    const skuValidation = await this.validateSkus(lineItems);
    if (!skuValidation.valid) {
      return {
        imported: false,
        skipped: true,
        reason: `Missing SKUs: ${skuValidation.missingSkus.join(', ')}`,
      };
    }

    // Create WMS order
    try {
      const order = await this.createWMSOrder(salesOrder);
      logger.info('Created WMS order from NetSuite', {
        orderId: order.orderId,
        tranId,
        itemCount: lineItems.length,
      });
      return { imported: true, skipped: false };
    } catch (error: any) {
      logger.error('Failed to create WMS order', { tranId, error: error.message });
      throw error;
    }
  }

  // ========================================================================
  // ORDER CREATION
  // ========================================================================

  /**
   * Create a WMS order from a NetSuite sales order
   */
  private async createWMSOrder(salesOrder: NetSuiteSalesOrder) {
    const lineItems = salesOrder.item?.items || [];

    // Map NetSuite line items to WMS order items
    const items = await Promise.all(
      lineItems.map(async line => {
        // Get SKU from WMS by NetSuite item ID or name
        const sku = await this.findSkuByNetSuiteItem(line.item?.id, line.item?.refName);

        return {
          sku: sku || line.item?.refName || '',
          quantity: line.quantity || 1,
        };
      })
    );

    // Determine priority based on ship date
    const priority = this.calculatePriority(salesOrder.shipDate);

    // Create order using repository
    const order = await this.orderRepository.createOrderWithItems({
      customerId: salesOrder.entity?.id || 'NETSUITE',
      customerName: salesOrder.entity?.refName || 'Unknown Customer',
      priority,
      items,
      // Store NetSuite metadata
      externalOrderId: salesOrder.tranId,
      customerReference: salesOrder.tranId,
      notes: salesOrder.memo || `Imported from NetSuite - ${salesOrder.tranId}`,
      shippingAddress: salesOrder.shippingAddress
        ? {
            street1: salesOrder.shippingAddress.addr1 || '',
            street2: salesOrder.shippingAddress.addr2 || '',
            city: salesOrder.shippingAddress.city || '',
            state: salesOrder.shippingAddress.state || '',
            postalCode: salesOrder.shippingAddress.zip || '',
            country: salesOrder.shippingAddress.country?.refName || '',
          }
        : undefined,
      requiredDate: salesOrder.shipDate ? new Date(salesOrder.shipDate) : undefined,
    } as any);

    // Store external order ID reference
    await this.storeExternalOrderId(order.orderId, salesOrder.tranId, salesOrder.id);

    return order;
  }

  /**
   * Calculate order priority based on ship date
   */
  private calculatePriority(shipDate?: string): OrderPriority {
    if (!shipDate) {
      return OrderPriority.NORMAL;
    }

    const ship = new Date(shipDate);
    const now = new Date();
    const daysUntilShip = Math.ceil((ship.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (daysUntilShip <= 1) {
      return OrderPriority.URGENT;
    } else if (daysUntilShip <= 3) {
      return OrderPriority.HIGH;
    } else if (daysUntilShip <= 7) {
      return OrderPriority.NORMAL;
    }
    return OrderPriority.LOW;
  }

  // ========================================================================
  // SKU MAPPING
  // ========================================================================

  /**
   * Find WMS SKU by NetSuite item ID or name
   */
  private async findSkuByNetSuiteItem(
    netSuiteItemId?: string,
    netSuiteItemName?: string
  ): Promise<string | null> {
    // Try to find by NetSuite item ID stored in SKU external_id or custom field
    if (netSuiteItemId) {
      const result = await query(
        `SELECT sku FROM skus WHERE (external_id = $1 OR sku = $1) AND active = true`,
        [netSuiteItemId]
      );
      if (result.rows.length > 0) {
        return result.rows[0].sku;
      }
    }

    // Fallback to matching by name
    if (netSuiteItemName) {
      const result = await query(
        `SELECT sku FROM skus WHERE (name ILIKE $1 OR sku ILIKE $1) AND active = true`,
        [netSuiteItemName]
      );
      if (result.rows.length > 0) {
        return result.rows[0].sku;
      }
    }

    // Last resort: use the NetSuite item name as the SKU
    return netSuiteItemName || netSuiteItemId || null;
  }

  /**
   * Validate that all SKUs exist in WMS
   */
  private async validateSkus(
    lineItems: NetSuiteSalesOrderLine[]
  ): Promise<{ valid: boolean; missingSkus: string[] }> {
    const missingSkus: string[] = [];

    for (const line of lineItems) {
      const sku = await this.findSkuByNetSuiteItem(line.item?.id, line.item?.refName);
      if (!sku) {
        const identifier = line.item?.refName || line.item?.id || `Line ${line.line}`;
        missingSkus.push(identifier);
      }
    }

    return {
      valid: missingSkus.length === 0,
      missingSkus,
    };
  }

  // ========================================================================
  // ORDER LOOKUP
  // ========================================================================

  /**
   * Find an existing order by external (NetSuite) order ID
   */
  private async findOrderByExternalId(externalOrderId: string): Promise<string | null> {
    const result = await query(
      `SELECT order_id FROM orders WHERE customer_reference = $1 OR order_id IN (
        SELECT order_id FROM order_external_refs WHERE external_order_id = $1
      )`,
      [externalOrderId]
    );

    return result.rows.length > 0 ? result.rows[0].order_id : null;
  }

  /**
   * Store external order ID reference
   */
  private async storeExternalOrderId(
    orderId: string,
    tranId: string,
    netSuiteId: string
  ): Promise<void> {
    try {
      // Store in customer_reference field (already exists in schema)
      await query(`UPDATE orders SET customer_reference = $1 WHERE order_id = $2`, [
        tranId,
        orderId,
      ]);

      // Also try to store in order_external_refs if it exists
      await query(
        `INSERT INTO order_external_refs (order_id, external_order_id, external_system, external_data)
         VALUES ($1, $2, 'NETSUITE', $3)
         ON CONFLICT (order_id, external_system) DO UPDATE SET external_order_id = $2, external_data = $3`,
        [orderId, tranId, JSON.stringify({ netSuiteId, tranId })]
      );
    } catch (error: any) {
      // Table might not exist, that's okay
      logger.warn('Could not store external order reference', {
        orderId,
        tranId,
        error: error.message,
      });
    }
  }

  // ========================================================================
  // PREVIEW ORDERS
  // ========================================================================

  /**
   * Preview NetSuite orders without importing them
   */
  async previewOrders(options: { limit?: number; status?: string } = {}): Promise<{
    orders: NetSuiteOrderPreview[];
    total: number;
  }> {
    const status = options.status || '_pendingFulfillment';
    const limit = options.limit || 20;

    const response = await this.client.getSalesOrders({
      limit,
      status,
    });

    const orders: NetSuiteOrderPreview[] = [];

    for (const item of response.items || []) {
      try {
        const salesOrder = await this.client.getSalesOrder(item.id);
        const preview = await this.previewSingleOrder(salesOrder);
        orders.push(preview);
      } catch (error: any) {
        logger.warn('Failed to preview NetSuite order', { orderId: item.id, error: error.message });
      }
    }

    return {
      orders,
      total: response.totalResults || orders.length,
    };
  }

  /**
   * Preview a single NetSuite order
   */
  private async previewSingleOrder(salesOrder: NetSuiteSalesOrder): Promise<NetSuiteOrderPreview> {
    const issues: string[] = [];
    let canImport = true;

    // Check if already imported
    const existingOrder = await this.findOrderByExternalId(salesOrder.tranId);
    if (existingOrder) {
      issues.push('Order already imported');
      canImport = false;
    }

    // Check line items
    const lineItems = salesOrder.item?.items || [];
    if (lineItems.length === 0) {
      issues.push('No line items');
      canImport = false;
    }

    // Validate SKUs
    const skuValidation = await this.validateSkus(lineItems);
    if (!skuValidation.valid) {
      issues.push(
        `Missing SKUs: ${skuValidation.missingSkus.slice(0, 3).join(', ')}${skuValidation.missingSkus.length > 3 ? '...' : ''}`
      );
      canImport = false;
    }

    return {
      tranId: salesOrder.tranId,
      customerName: salesOrder.entity?.refName || 'Unknown',
      orderDate: salesOrder.tranDate,
      shipDate: salesOrder.shipDate,
      lineCount: lineItems.length,
      status: salesOrder.status?.refName || 'Unknown',
      canImport,
      issues,
    };
  }

  // ========================================================================
  // CONNECTION TEST
  // ========================================================================

  /**
   * Test NetSuite connection
   */
  async testConnection(): Promise<{
    success: boolean;
    message: string;
    latency?: number;
    details?: any;
  }> {
    return this.client.testConnection();
  }
}
