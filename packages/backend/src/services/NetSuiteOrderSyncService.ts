/**
 * NetSuite Order Sync Service
 *
 * Pulls sales orders from NetSuite and creates WMS orders.
 * Uses NetSuiteClient with TBA OAuth 1.0 for REST Record API calls.
 *
 * @domain integrations
 * @dependencies NetSuiteClient, OrderRepository
 */

import {
  NetSuiteClient,
  NetSuiteCredentials,
  NetSuiteSalesOrder,
  NetSuiteSalesOrderLine,
} from './NetSuiteClient';
import { logger } from '../config/logger';
import { query as sharedQuery, getPool } from '../db/client';
import { tenantPoolManager } from '../db/tenantContext';
import { OrderPriority, generateOrderId } from '@opsui/shared';
import { Pool } from 'pg';

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
  private organizationId: string | null = null;
  private tenantPool: Pool | null = null;

  /**
   * Execute a query against the correct database (tenant or shared).
   * Uses tenant pool if the integration's org has a dedicated database.
   */
  private async query<T extends Record<string, any> = Record<string, any>>(
    text: string,
    params?: any[]
  ) {
    if (this.tenantPool) {
      const start = Date.now();
      const result = await this.tenantPool.query<any>(text, params);
      logger.debug('Tenant query executed', {
        duration: `${Date.now() - start}ms`,
        rows: result.rowCount,
        sql: text.substring(0, 100),
      });
      return { ...result, rows: result.rows || [] };
    }
    return sharedQuery<T>(text, params);
  }

  constructor(credentialsOrClient?: NetSuiteCredentials | NetSuiteClient) {
    if (credentialsOrClient instanceof NetSuiteClient) {
      this.client = credentialsOrClient;
    } else {
      this.client = new NetSuiteClient(credentialsOrClient);
    }
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
    // Look up the organization this integration belongs to (always from shared DB)
    const orgResult = await sharedQuery(
      `SELECT io.organization_id, o.database_name
       FROM integration_organizations io
       JOIN organizations o ON o.organization_id = io.organization_id
       WHERE io.integration_id = $1 LIMIT 1`,
      [_integrationId]
    );
    this.organizationId = orgResult.rows[0]?.organizationId || null;
    const databaseName = orgResult.rows[0]?.databaseName || null;

    if (!this.organizationId) {
      logger.warn('No organization mapping found for integration, orders will have no org scope', {
        integrationId: _integrationId,
      });
    }

    // If the org has a dedicated tenant database, use that pool for all writes
    if (databaseName) {
      this.tenantPool = tenantPoolManager.getPool(databaseName);
      logger.info('NetSuite sync using tenant database', {
        integrationId: _integrationId,
        organizationId: this.organizationId,
        database: databaseName,
      });
    } else {
      this.tenantPool = null;
    }

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

      const limit = _options.limit || 50;

      // Sync both Sales Orders (picking) and Item Fulfillments (packing)
      // 1. Item Fulfillments → imported as PICKED (ready for packing)
      try {
        const fulfillmentResponse = await this.client.getItemFulfillments({ limit });
        const fulfillmentItems = fulfillmentResponse.items || [];
        logger.info('Fetched item fulfillments from NetSuite', {
          count: fulfillmentItems.length,
          hasMore: fulfillmentResponse.hasMore,
        });

        result.totalProcessed += fulfillmentItems.length;

        for (const item of fulfillmentItems) {
          try {
            const fulfillment = await this.client.getItemFulfillment(item.id);
            const syncResult = await this.syncSingleFulfillment(fulfillment, _options);

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
            logger.error('Failed to sync NetSuite fulfillment', {
              orderId: item.id,
              error: error.message,
            });
          }
        }
      } catch (error: any) {
        logger.warn('Failed to fetch item fulfillments', { error: error.message });
      }

      // 2. Sales Orders (pending fulfillment) → imported as PENDING (ready for picking)
      try {
        const soResponse = await this.client.getSalesOrders({ limit, status: '_pendingFulfillment' });
        const soItems = soResponse.items || [];
        logger.info('Fetched pending sales orders from NetSuite', {
          count: soItems.length,
          hasMore: soResponse.hasMore,
        });

        result.totalProcessed += soItems.length;

        for (const item of soItems) {
          try {
            const salesOrder = await this.client.getSalesOrder(item.id);
            const syncResult = await this.syncSingleOrder(salesOrder, _options);

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
            logger.error('Failed to sync NetSuite sales order', {
              orderId: item.id,
              error: error.message,
            });
          }
        }
      } catch (error: any) {
        logger.warn('Failed to fetch sales orders', { error: error.message });
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
    const orderId = generateOrderId();
    const priority = this.calculatePriority(fulfillment.shipDate);

    // Map NetSuite fulfillment shipStatus to WMS order status
    // Item Fulfillments are already picked in NetSuite → import as PICKED (ready for packing)
    const shipStatus = (fulfillment.shipStatus || '').toLowerCase();
    let wmsStatus = 'PICKED'; // Default: fulfillments are ready for packing
    if (shipStatus.includes('shipped')) {
      wmsStatus = 'SHIPPED';
    } else if (shipStatus.includes('packed')) {
      wmsStatus = 'PACKED';
    }

    const shippingAddr = fulfillment.shippingAddress || {};
    const shippingAddress =
      shippingAddr.addr1 || shippingAddr.city
        ? {
            street1: shippingAddr.addr1 || '',
            street2: shippingAddr.addr2 || '',
            city: shippingAddr.city || '',
            state: shippingAddr.state || '',
            postalCode: shippingAddr.zip || '',
            country: shippingAddr.country?.refName || '',
          }
        : null;

    await this.query(
      `INSERT INTO orders (
        order_id, customer_id, customer_name, priority, status, progress,
        shipping_address, notes, customer_reference, external_order_id, required_date,
        organization_id, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $11::order_status, 0, $5, $6, $7, $8, $9, $10, NOW(), NOW())`,
      [
        orderId,
        fulfillment.entity?.id || fulfillment.createdFrom?.id || 'NETSUITE',
        fulfillment.entity?.refName || fulfillment.createdFrom?.refName || 'NetSuite Order',
        priority,
        shippingAddress ? JSON.stringify(shippingAddress) : null,
        fulfillment.memo || `Imported from NetSuite Fulfillment - ${tranId}`,
        tranId,
        tranId,
        fulfillment.shipDate ? new Date(fulfillment.shipDate) : null,
        this.organizationId,
        wmsStatus,
      ]
    );

    for (let i = 0; i < lineItems.length; i++) {
      const line = lineItems[i];
      const sku = await this.findSkuByNetSuiteItem(
        line.item?.id,
        line.item?.refName || line.itemName
      );
      const skuCode = sku || line.item?.refName || line.itemName || `NS-${i}`;
      const itemName = line.description || line.item?.refName || skuCode;

      await this.ensureSku(skuCode, itemName);

      const skuResult = await this.query(
        `SELECT bin_locations[1] as bin_location FROM skus WHERE sku = $1 AND active = true`,
        [skuCode]
      );
      const binLocation = skuResult.rows[0]?.bin_location || 'UNASSIGNED';

      await this.query(
        `INSERT INTO order_items (
          order_item_id, order_id, sku, name, quantity, bin_location, status,
          unit_price, line_total, currency
        ) VALUES ($1, $2, $3, $4, $5, $6, 'PENDING', $7, $8, 'NZD')`,
        [
          `OI-${orderId}-${i}`,
          orderId,
          skuCode,
          itemName,
          line.quantity || 1,
          binLocation,
          line.rate || 0,
          line.amount || (line.rate || 0) * (line.quantity || 1),
        ]
      );
    }

    await this.storeExternalOrderId(orderId, tranId, fulfillment.id);
    return { orderId };
  }

  /**
   * Sync a single sales order from NetSuite
   */
  private async syncSingleOrder(
    salesOrder: NetSuiteSalesOrder,
    _options: NetSuiteSyncOptions
  ): Promise<{ imported: boolean; skipped: boolean; reason?: string; tranId?: string }> {
    const tranId = salesOrder.tranId;

    // Check if order already exists (by external order ID)
    const existingOrder = await this.findOrderByExternalId(tranId);
    if (existingOrder) {
      logger.info('Order already exists, skipping', { tranId, orderId: existingOrder });
      return { imported: false, skipped: true, reason: 'Order already imported', tranId };
    }

    // Check line items exist
    const lineItems = salesOrder.item?.items || [];
    if (lineItems.length === 0) {
      return { imported: false, skipped: true, reason: 'No line items in order', tranId };
    }

    // Create WMS order
    try {
      const order = await this.createWMSOrder(salesOrder);
      logger.info('Created WMS order from NetSuite', {
        orderId: order.orderId,
        tranId,
        itemCount: lineItems.length,
      });
      return { imported: true, skipped: false, tranId };
    } catch (error: any) {
      logger.error('Failed to create WMS order', { tranId, error: error.message });
      throw error;
    }
  }

  // ========================================================================
  // ORDER CREATION
  // ========================================================================

  /**
   * Create a WMS order from a NetSuite sales order.
   * Uses direct SQL inserts to handle items that may not exist in WMS SKU catalog.
   */
  private async createWMSOrder(salesOrder: NetSuiteSalesOrder) {
    const lineItems = salesOrder.item?.items || [];
    const orderId = generateOrderId();
    const priority = this.calculatePriority(salesOrder.shipDate);

    const shippingAddress = salesOrder.shippingAddress
      ? {
          street1: salesOrder.shippingAddress.addr1 || '',
          street2: salesOrder.shippingAddress.addr2 || '',
          city: salesOrder.shippingAddress.city || '',
          state: salesOrder.shippingAddress.state || '',
          postalCode: salesOrder.shippingAddress.zip || '',
          country: salesOrder.shippingAddress.country?.refName || '',
        }
      : null;

    // Insert order
    await this.query(
      `INSERT INTO orders (
        order_id, customer_id, customer_name, priority, status, progress,
        shipping_address, notes, customer_reference, external_order_id, required_date,
        organization_id, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, 'PENDING', 0, $5, $6, $7, $8, $9, $10, NOW(), NOW())`,
      [
        orderId,
        salesOrder.entity?.id || 'NETSUITE',
        salesOrder.entity?.refName || 'Unknown Customer',
        priority,
        shippingAddress ? JSON.stringify(shippingAddress) : null,
        salesOrder.memo || `Imported from NetSuite - ${salesOrder.tranId}`,
        salesOrder.tranId,
        salesOrder.tranId,
        salesOrder.shipDate ? new Date(salesOrder.shipDate) : null,
        this.organizationId,
      ]
    );

    // Insert line items — look up SKU in WMS, fall back to NetSuite item name
    for (let i = 0; i < lineItems.length; i++) {
      const line = lineItems[i];
      const sku = await this.findSkuByNetSuiteItem(line.item?.id, line.item?.refName);
      const skuCode = sku || line.item?.refName || line.item?.id || `NS-${i}`;
      const itemName = line.description || line.item?.refName || skuCode;

      // Ensure SKU exists in catalog (auto-create if missing)
      await this.ensureSku(skuCode, itemName);

      // Get bin location from WMS
      const skuResult = await this.query(
        `SELECT bin_locations[1] as bin_location FROM skus WHERE sku = $1 AND active = true`,
        [skuCode]
      );
      const binLocation = skuResult.rows[0]?.bin_location || 'UNASSIGNED';

      await this.query(
        `INSERT INTO order_items (
          order_item_id, order_id, sku, name, quantity, bin_location, status,
          unit_price, line_total, currency
        ) VALUES ($1, $2, $3, $4, $5, $6, 'PENDING', $7, $8, 'NZD')`,
        [
          `OI-${orderId}-${i}`,
          orderId,
          skuCode,
          itemName,
          line.quantity || 1,
          binLocation,
          line.rate || 0,
          line.amount || (line.rate || 0) * (line.quantity || 1),
        ]
      );
    }

    // Store external reference
    await this.storeExternalOrderId(orderId, salesOrder.tranId, salesOrder.id);

    return { orderId };
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
    // Try to find by SKU code or barcode matching NetSuite item ID
    if (netSuiteItemId) {
      const result = await this.query(
        `SELECT sku FROM skus WHERE (sku = $1 OR barcode = $1) AND active = true`,
        [netSuiteItemId]
      );
      if (result.rows.length > 0) {
        return result.rows[0].sku;
      }
    }

    // Fallback to matching by name or SKU code
    if (netSuiteItemName) {
      const result = await this.query(
        `SELECT sku FROM skus WHERE (name ILIKE $1 OR sku ILIKE $1) AND active = true`,
        [netSuiteItemName]
      );
      if (result.rows.length > 0) {
        return result.rows[0].sku;
      }
    }

    // Return the NetSuite item name as the SKU identifier
    return netSuiteItemName || netSuiteItemId || null;
  }

  /**
   * Ensure a SKU exists in the WMS catalog. Creates it if missing.
   */
  private async ensureSku(skuCode: string, itemName: string): Promise<void> {
    const result = await this.query(`SELECT sku FROM skus WHERE sku = $1`, [skuCode]);
    if (result.rows.length > 0) return;

    await this.query(
      `INSERT INTO skus (sku, name, category, active, bin_locations, organization_id, created_at, updated_at)
       VALUES ($1, $2, 'NETSUITE', true, ARRAY['UNASSIGNED'], $3, NOW(), NOW())
       ON CONFLICT (sku) DO NOTHING`,
      [skuCode, itemName, this.organizationId]
    );
    logger.info('Auto-created SKU from NetSuite item', { sku: skuCode, name: itemName });
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
    const result = await this.query(
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
      await this.query(`UPDATE orders SET customer_reference = $1 WHERE order_id = $2`, [
        tranId,
        orderId,
      ]);

      // Also try to store in order_external_refs if it exists
      await this.query(
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
