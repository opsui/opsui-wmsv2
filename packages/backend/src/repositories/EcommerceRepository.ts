/**
 * E-commerce Integration Repository
 *
 * Data access layer for e-commerce platform integration
 */

import { query } from '../db/client';
import { BaseRepository, toCamelCase } from './BaseRepository';
import type {
  EcommerceConnection,
  EcommerceProductMapping,
  EcommerceInventorySync,
  EcommerceOrderSync,
  EcommerceCustomerSync,
  EcommerceWebhook,
  EcommerceSyncLog,
  EcommerceConnectionStatus,
  EcommerceSyncError,
  EcommercePendingSync,
  PlatformType,
  ProductMappingStatus,
  EcommerceSyncStatus,
  WebhookProcessingStatus,
} from '@opsui/shared';

// ============================================================================
// REPOSITORY
// ============================================================================

export class EcommerceRepository extends BaseRepository<EcommerceConnection> {
  constructor() {
    super('ecommerce_connections', 'connection_id');
  }

  // ========================================================================
  // CONNECTION METHODS
  // ========================================================================

  /**
   * Find connection by platform type
   */
  async findByPlatformType(platformType: PlatformType): Promise<EcommerceConnection[]> {
    const result = await query<EcommerceConnection>(
      `SELECT * FROM ecommerce_connections WHERE platform_type = $1 AND is_active = TRUE`,
      [platformType]
    );
    return result.rows;
  }

  /**
   * Find active connections
   */
  async findActiveConnections(): Promise<EcommerceConnection[]> {
    const result = await query<EcommerceConnection>(
      `SELECT * FROM ecommerce_connections WHERE is_active = TRUE ORDER BY created_at DESC`
    );
    return result.rows;
  }

  /**
   * Find connection by name
   */
  async findByName(connectionName: string): Promise<EcommerceConnection | null> {
    const result = await query<EcommerceConnection>(
      `SELECT * FROM ecommerce_connections WHERE connection_name = $1`,
      [connectionName]
    );
    return result.rows[0] || null;
  }

  /**
   * Update connection last sync timestamp
   */
  async updateLastSync(connectionId: string): Promise<void> {
    await query(`UPDATE ecommerce_connections SET last_sync_at = NOW() WHERE connection_id = $1`, [
      connectionId,
    ]);
  }

  /**
   * Update rate limit info
   */
  async updateRateLimit(connectionId: string, remaining: number, resetAt: Date): Promise<void> {
    await query(
      `UPDATE ecommerce_connections
       SET rate_limit_remaining = $1, rate_limit_reset_at = $2
       WHERE connection_id = $3`,
      [remaining, resetAt, connectionId]
    );
  }

  // ========================================================================
  // PRODUCT MAPPING METHODS
  // ========================================================================

  /**
   * Find product mapping by connection and external ID
   */
  async findProductMapping(
    connectionId: string,
    externalProductId: string
  ): Promise<EcommerceProductMapping | null> {
    const result = await query<EcommerceProductMapping>(
      `SELECT * FROM ecommerce_product_mapping
       WHERE connection_id = $1 AND external_product_id = $2`,
      [connectionId, externalProductId]
    );
    return result.rows[0] || null;
  }

  /**
   * Find product mapping by internal SKU
   */
  async findProductMappingBySKU(
    connectionId: string,
    internalSku: string
  ): Promise<EcommerceProductMapping | null> {
    const result = await query<EcommerceProductMapping>(
      `SELECT * FROM ecommerce_product_mapping
       WHERE connection_id = $1 AND internal_sku = $2`,
      [connectionId, internalSku]
    );
    return result.rows[0] || null;
  }

  /**
   * Find all product mappings for a connection
   */
  async findAllProductMappings(connectionId: string): Promise<EcommerceProductMapping[]> {
    const result = await query<EcommerceProductMapping>(
      `SELECT * FROM ecommerce_product_mapping
       WHERE connection_id = $1
       ORDER BY created_at DESC`,
      [connectionId]
    );
    return result.rows;
  }

  /**
   * Find product mappings by status
   */
  async findProductMappingsByStatus(
    connectionId: string,
    status: ProductMappingStatus
  ): Promise<EcommerceProductMapping[]> {
    const result = await query<EcommerceProductMapping>(
      `SELECT * FROM ecommerce_product_mapping
       WHERE connection_id = $1 AND sync_status = $2
       ORDER BY created_at DESC`,
      [connectionId, status]
    );
    return result.rows;
  }

  /**
   * Create product mapping
   */
  async createProductMapping(
    mapping: Omit<EcommerceProductMapping, 'mappingId' | 'createdAt' | 'updatedAt'>
  ): Promise<EcommerceProductMapping> {
    const mappingId = `PRODMAP-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;

    const result = await query<EcommerceProductMapping>(
      `INSERT INTO ecommerce_product_mapping (
        mapping_id, connection_id, internal_sku, external_product_id,
        external_variant_id, external_product_title, sync_status,
        last_synced_at, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
      RETURNING *`,
      [
        mappingId,
        mapping.connectionId,
        mapping.internalSku,
        mapping.externalProductId,
        mapping.externalVariantId,
        mapping.externalProductTitle,
        mapping.syncStatus,
        mapping.lastSyncedAt,
      ]
    );

    return result.rows[0];
  }

  /**
   * Update product mapping
   */
  async updateProductMapping(
    mappingId: string,
    updates: Partial<Omit<EcommerceProductMapping, 'mappingId' | 'createdAt' | 'updatedAt'>>
  ): Promise<EcommerceProductMapping | null> {
    const setClause = Object.keys(updates)
      .map((key, idx) => `${toCamelCase(key)} = $${idx + 2}`)
      .join(', ');

    const values = Object.values(updates);
    const result = await query<EcommerceProductMapping>(
      `UPDATE ecommerce_product_mapping
       SET ${setClause}, updated_at = NOW()
       WHERE mapping_id = $1
       RETURNING *`,
      [mappingId, ...values]
    );

    return result.rows[0] || null;
  }

  /**
   * Delete product mapping
   */
  async deleteProductMapping(mappingId: string): Promise<boolean> {
    const result = await query(`DELETE FROM ecommerce_product_mapping WHERE mapping_id = $1`, [
      mappingId,
    ]);
    return (result.rowCount || 0) > 0;
  }

  // ========================================================================
  // INVENTORY SYNC METHODS
  // ========================================================================

  /**
   * Create inventory sync record
   */
  async createInventorySync(
    sync: Omit<EcommerceInventorySync, 'syncId' | 'startedAt' | 'variance'>
  ): Promise<EcommerceInventorySync> {
    const syncId = `INVSYNC-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;

    // Calculate variance
    const variance = (sync.quantityAfter || 0) - (sync.externalQuantityBefore || 0);

    const result = await query<EcommerceInventorySync>(
      `INSERT INTO ecommerce_inventory_sync (
        sync_id, connection_id, sku, sync_type, sync_status,
        quantity_before, quantity_after, external_quantity_before,
        external_quantity_after, variance, error_message, started_at, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), $12)
      RETURNING *`,
      [
        syncId,
        sync.connectionId,
        sync.sku,
        sync.syncType,
        sync.syncStatus,
        sync.quantityBefore,
        sync.quantityAfter,
        sync.externalQuantityBefore,
        sync.externalQuantityAfter,
        variance,
        sync.errorMessage,
        sync.createdBy,
      ]
    );

    return result.rows[0];
  }

  /**
   * Update inventory sync status
   */
  async updateInventorySyncStatus(
    syncId: string,
    status: EcommerceSyncStatus,
    externalQuantityAfter?: number,
    errorMessage?: string
  ): Promise<EcommerceInventorySync | null> {
    const result = await query<EcommerceInventorySync>(
      `UPDATE ecommerce_inventory_sync
       SET sync_status = $1,
           external_quantity_after = COALESCE($2, external_quantity_after),
           error_message = $3,
           completed_at = CASE WHEN $1 = 'COMPLETED' THEN NOW() ELSE completed_at END
       WHERE sync_id = $4
       RETURNING *`,
      [status, externalQuantityAfter, errorMessage, syncId]
    );

    return result.rows[0] || null;
  }

  /**
   * Find recent inventory syncs for a connection
   */
  async findRecentInventorySyncs(
    connectionId: string,
    limit = 50
  ): Promise<EcommerceInventorySync[]> {
    const result = await query<EcommerceInventorySync>(
      `SELECT * FROM ecommerce_inventory_sync
       WHERE connection_id = $1
       ORDER BY started_at DESC
       LIMIT $2`,
      [connectionId, limit]
    );
    return result.rows;
  }

  /**
   * Find failed inventory syncs
   */
  async findFailedInventorySyncs(connectionId?: string): Promise<EcommerceInventorySync[]> {
    let queryText = `SELECT * FROM ecommerce_inventory_sync WHERE sync_status = 'FAILED'`;
    const params: any[] = [];

    if (connectionId) {
      queryText += ` AND connection_id = $1`;
      params.push(connectionId);
    }

    queryText += ` ORDER BY started_at DESC`;

    const result = await query<EcommerceInventorySync>(queryText, params);
    return result.rows;
  }

  // ========================================================================
  // ORDER SYNC METHODS
  // ========================================================================

  /**
   * Create order sync record
   */
  async createOrderSync(
    sync: Omit<EcommerceOrderSync, 'syncId' | 'createdAt' | 'processingAttempts'>
  ): Promise<EcommerceOrderSync> {
    const syncId = `ORDSYNC-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;

    const result = await query<EcommerceOrderSync>(
      `INSERT INTO ecommerce_order_sync (
        sync_id, connection_id, external_order_id, internal_order_id,
        sync_status, sync_type, order_data, line_items_data, customer_data,
        error_message, last_attempt_at, completed_at, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NULL, NOW())
      RETURNING *`,
      [
        syncId,
        sync.connectionId,
        sync.externalOrderId,
        sync.internalOrderId,
        sync.syncStatus,
        sync.syncType,
        sync.orderData,
        sync.lineItemsData,
        sync.customerData,
        sync.errorMessage,
      ]
    );

    return result.rows[0];
  }

  /**
   * Update order sync status
   */
  async updateOrderSyncStatus(
    syncId: string,
    status: EcommerceSyncStatus,
    internalOrderId?: string,
    errorMessage?: string,
    incrementAttempts = true
  ): Promise<EcommerceOrderSync | null> {
    const result = await query<EcommerceOrderSync>(
      `UPDATE ecommerce_order_sync
       SET sync_status = $1,
           internal_order_id = COALESCE($2, internal_order_id),
           error_message = $3,
           processing_attempts = CASE WHEN $4 THEN processing_attempts + 1 ELSE processing_attempts END,
           last_attempt_at = NOW(),
           completed_at = CASE WHEN $1 = 'COMPLETED' THEN NOW() ELSE completed_at END
       WHERE sync_id = $5
       RETURNING *`,
      [status, internalOrderId, errorMessage, incrementAttempts, syncId]
    );

    return result.rows[0] || null;
  }

  /**
   * Find order sync by external order ID
   */
  async findOrderSyncByExternalId(
    connectionId: string,
    externalOrderId: string
  ): Promise<EcommerceOrderSync | null> {
    const result = await query<EcommerceOrderSync>(
      `SELECT * FROM ecommerce_order_sync
       WHERE connection_id = $1 AND external_order_id = $2`,
      [connectionId, externalOrderId]
    );
    return result.rows[0] || null;
  }

  /**
   * Find pending order syncs
   */
  async findPendingOrderSyncs(connectionId?: string): Promise<EcommerceOrderSync[]> {
    let queryText = `SELECT * FROM ecommerce_order_sync WHERE sync_status = 'PENDING'`;
    const params: any[] = [];

    if (connectionId) {
      queryText += ` AND connection_id = $1`;
      params.push(connectionId);
    }

    queryText += ` ORDER BY created_at ASC`;

    const result = await query<EcommerceOrderSync>(queryText, params);
    return result.rows;
  }

  /**
   * Find failed order syncs
   */
  async findFailedOrderSyncs(connectionId?: string): Promise<EcommerceOrderSync[]> {
    let queryText = `SELECT * FROM ecommerce_order_sync WHERE sync_status = 'FAILED'`;
    const params: any[] = [];

    if (connectionId) {
      queryText += ` AND connection_id = $1`;
      params.push(connectionId);
    }

    queryText += ` ORDER BY created_at DESC`;

    const result = await query<EcommerceOrderSync>(queryText, params);
    return result.rows;
  }

  /**
   * Find recent order syncs
   */
  async findRecentOrderSyncs(connectionId: string, limit = 50): Promise<EcommerceOrderSync[]> {
    const result = await query<EcommerceOrderSync>(
      `SELECT * FROM ecommerce_order_sync
       WHERE connection_id = $1
       ORDER BY created_at DESC
       LIMIT $2`,
      [connectionId, limit]
    );
    return result.rows;
  }

  // ========================================================================
  // CUSTOMER SYNC METHODS
  // ========================================================================

  /**
   * Create customer sync record
   */
  async createCustomerSync(
    sync: Omit<EcommerceCustomerSync, 'syncId' | 'createdAt' | 'updatedAt'>
  ): Promise<EcommerceCustomerSync> {
    const syncId = `CUSTSYNC-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;

    const result = await query<EcommerceCustomerSync>(
      `INSERT INTO ecommerce_customer_sync (
        sync_id, connection_id, external_customer_id, internal_customer_id,
        sync_status, customer_data, error_message, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
      RETURNING *`,
      [
        syncId,
        sync.connectionId,
        sync.externalCustomerId,
        sync.internalCustomerId,
        sync.syncStatus,
        sync.customerData,
        sync.errorMessage,
      ]
    );

    return result.rows[0];
  }

  /**
   * Update customer sync
   */
  async updateCustomerSync(
    syncId: string,
    updates: Partial<Omit<EcommerceCustomerSync, 'syncId' | 'createdAt' | 'updatedAt'>>
  ): Promise<EcommerceCustomerSync | null> {
    const setClause = Object.keys(updates)
      .map((key, idx) => `${toCamelCase(key)} = $${idx + 2}`)
      .join(', ');

    const values = Object.values(updates);
    const result = await query<EcommerceCustomerSync>(
      `UPDATE ecommerce_customer_sync
       SET ${setClause}, updated_at = NOW()
       WHERE sync_id = $1
       RETURNING *`,
      [syncId, ...values]
    );

    return result.rows[0] || null;
  }

  /**
   * Find customer sync by external ID
   */
  async findCustomerSyncByExternalId(
    connectionId: string,
    externalCustomerId: string
  ): Promise<EcommerceCustomerSync | null> {
    const result = await query<EcommerceCustomerSync>(
      `SELECT * FROM ecommerce_customer_sync
       WHERE connection_id = $1 AND external_customer_id = $2`,
      [connectionId, externalCustomerId]
    );
    return result.rows[0] || null;
  }

  // ========================================================================
  // WEBHOOK METHODS
  // ========================================================================

  /**
   * Create webhook record
   */
  async createWebhook(
    webhook: Omit<EcommerceWebhook, 'webhookId' | 'createdAt' | 'retryCount'>
  ): Promise<EcommerceWebhook> {
    const webhookId = `WEBHOOK-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;

    const result = await query<EcommerceWebhook>(
      `INSERT INTO ecommerce_webhooks (
        webhook_id, connection_id, webhook_event, external_resource_id,
        payload, received_at, processing_status, error_message, retry_count, created_at
      ) VALUES ($1, $2, $3, $4, $5, NOW(), $6, $7, 0, NOW())
      RETURNING *`,
      [
        webhookId,
        webhook.connectionId,
        webhook.webhookEvent,
        webhook.externalResourceId,
        webhook.payload,
        webhook.processingStatus,
        webhook.errorMessage,
      ]
    );

    return result.rows[0];
  }

  /**
   * Update webhook processing status
   */
  async updateWebhookStatus(
    webhookId: string,
    status: WebhookProcessingStatus,
    errorMessage?: string,
    incrementRetry = true
  ): Promise<EcommerceWebhook | null> {
    const result = await query<EcommerceWebhook>(
      `UPDATE ecommerce_webhooks
       SET processing_status = $1,
           error_message = $2,
           retry_count = CASE WHEN $3 THEN retry_count + 1 ELSE retry_count END,
           processed_at = CASE WHEN $1 = 'PROCESSED' THEN NOW() ELSE processed_at END
       WHERE webhook_id = $4
       RETURNING *`,
      [status, errorMessage, incrementRetry, webhookId]
    );

    return result.rows[0] || null;
  }

  /**
   * Find pending webhooks
   */
  async findPendingWebhooks(connectionId?: string): Promise<EcommerceWebhook[]> {
    let queryText = `SELECT * FROM ecommerce_webhooks WHERE processing_status = 'PENDING'`;
    const params: any[] = [];

    if (connectionId) {
      queryText += ` AND connection_id = $1`;
      params.push(connectionId);
    }

    queryText += ` ORDER BY received_at ASC`;

    const result = await query<EcommerceWebhook>(queryText, params);
    return result.rows;
  }

  /**
   * Find recent webhooks
   */
  async findRecentWebhooks(connectionId: string, limit = 50): Promise<EcommerceWebhook[]> {
    const result = await query<EcommerceWebhook>(
      `SELECT * FROM ecommerce_webhooks
       WHERE connection_id = $1
       ORDER BY received_at DESC
       LIMIT $2`,
      [connectionId, limit]
    );
    return result.rows;
  }

  // ========================================================================
  // SYNC LOG METHODS
  // ========================================================================

  /**
   * Create sync log
   */
  async createSyncLog(
    log: Omit<EcommerceSyncLog, 'logId' | 'startedAt'>
  ): Promise<EcommerceSyncLog> {
    const logId = `SYNCLOG-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;

    const result = await query<EcommerceSyncLog>(
      `INSERT INTO ecommerce_sync_logs (
        log_id, connection_id, sync_type, resource_type, resource_count,
        success_count, failure_count, sync_status, error_summary, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *`,
      [
        logId,
        log.connectionId,
        log.syncType,
        log.resourceType,
        log.resourceCount,
        log.successCount,
        log.failureCount,
        log.syncStatus,
        log.errorSummary,
        log.createdBy,
      ]
    );

    return result.rows[0];
  }

  /**
   * Update sync log
   */
  async updateSyncLog(
    logId: string,
    updates: Partial<Omit<EcommerceSyncLog, 'logId' | 'startedAt' | 'completedAt'>>
  ): Promise<EcommerceSyncLog | null> {
    const setClause = Object.keys(updates)
      .map((key, idx) => `${toCamelCase(key)} = $${idx + 2}`)
      .join(', ');

    const values = Object.values(updates);
    const result = await query<EcommerceSyncLog>(
      `UPDATE ecommerce_sync_logs
       SET ${setClause},
           completed_at = CASE WHEN sync_status = 'COMPLETED' THEN NOW() ELSE completed_at END
       WHERE log_id = $1
       RETURNING *`,
      [logId, ...values]
    );

    return result.rows[0] || null;
  }

  /**
   * Find sync logs for a connection
   */
  async findSyncLogs(connectionId: string, limit = 50): Promise<EcommerceSyncLog[]> {
    const result = await query<EcommerceSyncLog>(
      `SELECT * FROM ecommerce_sync_logs
       WHERE connection_id = $1
       ORDER BY started_at DESC
       LIMIT $2`,
      [connectionId, limit]
    );
    return result.rows;
  }

  // ========================================================================
  // VIEW METHODS
  // ========================================================================

  /**
   * Get connection status view data
   */
  async getConnectionStatus(): Promise<EcommerceConnectionStatus[]> {
    const result = await query<EcommerceConnectionStatus>(
      `SELECT * FROM v_ecommerce_connections_status ORDER BY created_at DESC`
    );
    return result.rows;
  }

  /**
   * Get sync errors view data
   */
  async getSyncErrors(): Promise<EcommerceSyncError[]> {
    const result = await query<EcommerceSyncError>(`SELECT * FROM v_ecommerce_sync_errors`);
    return result.rows;
  }

  /**
   * Get pending sync view data
   */
  async getPendingSyncs(): Promise<EcommercePendingSync[]> {
    const result = await query<EcommercePendingSync>(`SELECT * FROM v_ecommerce_pending_sync`);
    return result.rows;
  }

  // ========================================================================
  // PLATFORM-SPECIFIC SETTINGS
  // ========================================================================

  /**
   * Get Shopify settings for a connection
   */
  async getShopifySettings(connectionId: string): Promise<any> {
    const result = await query(`SELECT * FROM shopify_settings WHERE connection_id = $1`, [
      connectionId,
    ]);
    return result.rows[0];
  }

  /**
   * Save Shopify settings for a connection
   */
  async saveShopifySettings(connectionId: string, settings: any): Promise<void> {
    await query(
      `INSERT INTO shopify_settings (
        connection_id, location_id, inventory_tracking_strategy, tax_taxable,
        email_customer_notification, send_receipt, weight_unit, enable_compare_at_price, metafield_definitions
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      ON CONFLICT (connection_id) DO UPDATE SET
        location_id = EXCLUDED.location_id,
        inventory_tracking_strategy = EXCLUDED.inventory_tracking_strategy,
        tax_taxable = EXCLUDED.tax_taxable,
        email_customer_notification = EXCLUDED.email_customer_notification,
        send_receipt = EXCLUDED.send_receipt,
        weight_unit = EXCLUDED.weight_unit,
        enable_compare_at_price = EXCLUDED.enable_compare_at_price,
        metafield_definitions = EXCLUDED.metafield_definitions`,
      [
        connectionId,
        settings.locationId,
        settings.inventoryTrackingStrategy,
        settings.taxTaxable,
        settings.emailCustomerNotification,
        settings.sendReceipt,
        settings.weightUnit,
        settings.enableCompareAtPrice,
        settings.metafieldDefinitions,
      ]
    );
  }

  /**
   * Get WooCommerce settings for a connection
   */
  async getWooCommerceSettings(connectionId: string): Promise<any> {
    const result = await query(`SELECT * FROM woocommerce_settings WHERE connection_id = $1`, [
      connectionId,
    ]);
    return result.rows[0];
  }

  /**
   * Save WooCommerce settings for a connection
   */
  async saveWooCommerceSettings(connectionId: string, settings: any): Promise<void> {
    await query(
      `INSERT INTO woocommerce_settings (
        connection_id, api_version, wp_ajax_url, product_identifier, tax_based_on,
        calculate_taxes, round_tax_at_subtotal, round_tax_at_cart_total, prices_include_tax, metafield_definitions
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      ON CONFLICT (connection_id) DO UPDATE SET
        api_version = EXCLUDED.api_version,
        wp_ajax_url = EXCLUDED.wp_ajax_url,
        product_identifier = EXCLUDED.product_identifier,
        tax_based_on = EXCLUDED.tax_based_on,
        calculate_taxes = EXCLUDED.calculate_taxes,
        round_tax_at_subtotal = EXCLUDED.round_tax_at_subtotal,
        round_tax_at_cart_total = EXCLUDED.round_tax_at_cart_total,
        prices_include_tax = EXCLUDED.prices_include_tax,
        metafield_definitions = EXCLUDED.metafield_definitions`,
      [
        connectionId,
        settings.apiVersion,
        settings.wpAjaxUrl,
        settings.productIdentifier,
        settings.taxBasedOn,
        settings.calculateTaxes,
        settings.roundTaxAtSubtotal,
        settings.roundTaxAtCartTotal,
        settings.pricesIncludeTax,
        settings.metafieldDefinitions,
      ]
    );
  }

  /**
   * Get Magento settings for a connection
   */
  async getMagentoSettings(connectionId: string): Promise<any> {
    const result = await query(`SELECT * FROM magento_settings WHERE connection_id = $1`, [
      connectionId,
    ]);
    return result.rows[0];
  }

  /**
   * Save Magento settings for a connection
   */
  async saveMagentoSettings(connectionId: string, settings: any): Promise<void> {
    await query(
      `INSERT INTO magento_settings (
        connection_id, api_version, store_view_code, attribute_set_id,
        website_id, stock_id, notify_customer, visible_catalog_visible, metafield_definitions
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      ON CONFLICT (connection_id) DO UPDATE SET
        api_version = EXCLUDED.api_version,
        store_view_code = EXCLUDED.store_view_code,
        attribute_set_id = EXCLUDED.attribute_set_id,
        website_id = EXCLUDED.website_id,
        stock_id = EXCLUDED.stock_id,
        notify_customer = EXCLUDED.notify_customer,
        visible_catalog_visible = EXCLUDED.visible_catalog_visible,
        metafield_definitions = EXCLUDED.metafield_definitions`,
      [
        connectionId,
        settings.apiVersion,
        settings.storeViewCode,
        settings.attributeSetId,
        settings.websiteId,
        settings.stockId,
        settings.notifyCustomer,
        settings.visibleCatalogVisible,
        settings.metafieldDefinitions,
      ]
    );
  }
}

// Export singleton instance
export const ecommerceRepository = new EcommerceRepository();
