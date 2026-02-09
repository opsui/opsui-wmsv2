/**
 * E-commerce Integration Service
 *
 * Business logic for e-commerce platform integration
 * Supports Shopify, WooCommerce, Magento, and custom platforms
 */

import { query } from '../db/client';
import { ecommerceRepository } from '../repositories/EcommerceRepository';
import {
  EcommerceConnection,
  EcommerceProductMapping,
  EcommerceInventorySync,
  EcommerceOrderSync,
  EcommerceCustomerSync,
  EcommerceWebhook,
  EcommerceSyncLog,
  PlatformType,
  ProductMappingStatus,
  EcommerceSyncStatus,
  InventorySyncType,
  OrderSyncType,
  WebhookProcessingStatus,
  CreateEcommerceConnectionDTO,
  UpdateEcommerceConnectionDTO,
  CreateProductMappingDTO,
  UpdateProductMappingDTO,
  SyncInventoryRequestDTO,
  SyncProductsRequestDTO,
  SyncOrdersRequestDTO,
  TestConnectionResult,
  PlatformProductData,
  PlatformOrderData,
} from '@opsui/shared';

// Import platform-specific services
import { ShopifyService } from './platforms/ShopifyService';
import { WooCommerceService } from './platforms/WooCommerceService';
import { MagentoService } from './platforms/MagentoService';

// ============================================================================
// SERVICE
// ============================================================================

export class EcommerceService {
  private platformServices: Map<PlatformType, any>;

  constructor() {
    this.platformServices = new Map<PlatformType, any>([
      [PlatformType.SHOPIFY, new ShopifyService()],
      [PlatformType.WOOCOMMERCE, new WooCommerceService()],
      [PlatformType.MAGENTO, new MagentoService()],
    ] as Array<[PlatformType, any]>);
  }

  // ========================================================================
  // CONNECTION MANAGEMENT
  // ========================================================================

  /**
   * Create a new e-commerce connection
   */
  async createConnection(dto: CreateEcommerceConnectionDTO): Promise<EcommerceConnection> {
    const connectionId = `ECONN-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;

    // Create the connection
    const connection: Omit<EcommerceConnection, 'connectionId' | 'createdAt' | 'updatedAt'> = {
      connectionName: dto.connectionName,
      platformType: dto.platformType,
      apiEndpoint: dto.apiEndpoint,
      apiKey: dto.apiKey,
      apiSecret: dto.apiSecret,
      accessToken: dto.accessToken,
      storeUrl: dto.storeUrl,
      apiVersion: dto.apiVersion || 'v1',
      webhookUrl: dto.webhookUrl,
      webhookSecret: dto.webhookSecret,
      isActive: true,
      syncCustomers: dto.syncCustomers ?? true,
      syncProducts: dto.syncProducts ?? true,
      syncInventory: dto.syncInventory ?? true,
      syncOrders: dto.syncOrders ?? true,
      autoImportOrders: dto.autoImportOrders ?? false,
      syncFrequencyMinutes: dto.syncFrequencyMinutes ?? 60,
      connectionSettings: dto.connectionSettings,
      createdBy: dto.createdBy,
    };

    const created = await ecommerceRepository.insert({
      ...connection,
      connectionId,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Save platform-specific settings if provided
    if (dto.platformSettings) {
      await this.savePlatformSettings(connectionId, dto.platformType, dto.platformSettings);
    }

    return created;
  }

  /**
   * Update an existing connection
   */
  async updateConnection(
    connectionId: string,
    dto: UpdateEcommerceConnectionDTO
  ): Promise<EcommerceConnection | null> {
    return await ecommerceRepository.update(connectionId, {
      ...dto,
      updatedAt: new Date(),
    });
  }

  /**
   * Get connection by ID
   */
  async getConnection(connectionId: string): Promise<EcommerceConnection | null> {
    return await ecommerceRepository.findById(connectionId);
  }

  /**
   * Get all connections
   */
  async getAllConnections(): Promise<EcommerceConnection[]> {
    return await ecommerceRepository.findAll({ orderBy: 'created_at', orderDirection: 'DESC' });
  }

  /**
   * Get active connections
   */
  async getActiveConnections(): Promise<EcommerceConnection[]> {
    return await ecommerceRepository.findActiveConnections();
  }

  /**
   * Delete a connection
   */
  async deleteConnection(connectionId: string): Promise<boolean> {
    return await ecommerceRepository.delete(connectionId);
  }

  /**
   * Test connection to e-commerce platform
   */
  async testConnection(connectionId: string): Promise<TestConnectionResult> {
    const connection = await ecommerceRepository.findByIdOrThrow(connectionId);
    const platformService = this.platformServices.get(connection.platformType);

    if (!platformService) {
      return {
        success: false,
        message: 'Platform not supported',
        responseTimeMs: 0,
      };
    }

    const startTime = Date.now();
    try {
      const result = await platformService.testConnection(connection);
      const responseTime = Date.now() - startTime;

      // Update rate limit info if provided
      if (result.rateLimitRemaining !== undefined) {
        await ecommerceRepository.updateRateLimit(
          connectionId,
          result.rateLimitRemaining,
          result.rateLimitResetAt || new Date(Date.now() + 3600000)
        );
      }

      return {
        success: result.success,
        message: result.message,
        responseTimeMs: responseTime,
        platformInfo: result.platformInfo,
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Connection test failed',
        responseTimeMs: Date.now() - startTime,
      };
    }
  }

  // ========================================================================
  // PRODUCT MAPPING
  // ========================================================================

  /**
   * Create product mapping
   */
  async createProductMapping(dto: CreateProductMappingDTO): Promise<EcommerceProductMapping> {
    return await ecommerceRepository.createProductMapping({
      connectionId: dto.connectionId,
      internalSku: dto.internalSku,
      externalProductId: dto.externalProductId,
      externalVariantId: dto.externalVariantId,
      externalProductTitle: dto.externalProductTitle,
      syncStatus: ProductMappingStatus.ACTIVE,
    });
  }

  /**
   * Update product mapping
   */
  async updateProductMapping(
    mappingId: string,
    dto: UpdateProductMappingDTO
  ): Promise<EcommerceProductMapping | null> {
    return await ecommerceRepository.updateProductMapping(mappingId, dto);
  }

  /**
   * Get product mappings for a connection
   */
  async getProductMappings(connectionId: string): Promise<EcommerceProductMapping[]> {
    return await ecommerceRepository.findAllProductMappings(connectionId);
  }

  /**
   * Delete product mapping
   */
  async deleteProductMapping(mappingId: string): Promise<boolean> {
    return await ecommerceRepository.deleteProductMapping(mappingId);
  }

  // ========================================================================
  // INVENTORY SYNC
  // ========================================================================

  /**
   * Sync inventory for SKUs
   */
  async syncInventory(dto: SyncInventoryRequestDTO): Promise<EcommerceSyncLog> {
    const connection = await ecommerceRepository.findByIdOrThrow(dto.connectionId);
    const platformService = this.platformServices.get(connection.platformType);

    if (!platformService) {
      throw new Error('Platform not supported');
    }

    // Create sync log
    const log = await ecommerceRepository.createSyncLog({
      connectionId: dto.connectionId,
      syncType: dto.syncType || InventorySyncType.PUSH,
      resourceType: 'INVENTORY',
      resourceCount: dto.skus.length,
      successCount: 0,
      failureCount: 0,
      syncStatus: EcommerceSyncStatus.IN_PROGRESS,
      createdBy: 'system',
    });

    let successCount = 0;
    let failureCount = 0;
    const errors: string[] = [];

    try {
      for (const sku of dto.skus) {
        try {
          // Get current inventory from WMS
          const inventoryResult = await query(`SELECT quantity FROM inventory WHERE sku = $1`, [
            sku,
          ]);

          if (inventoryResult.rows.length === 0) {
            errors.push(`SKU ${sku} not found in inventory`);
            failureCount++;
            continue;
          }

          const currentQuantity = inventoryResult.rows[0].quantity;

          // Get product mapping
          const mapping = await ecommerceRepository.findProductMappingBySKU(dto.connectionId, sku);

          if (!mapping) {
            errors.push(`No product mapping found for SKU ${sku}`);
            failureCount++;
            continue;
          }

          // Create inventory sync record
          await ecommerceRepository.createInventorySync({
            connectionId: dto.connectionId,
            sku: sku,
            syncType: dto.syncType || InventorySyncType.PUSH,
            syncStatus: EcommerceSyncStatus.IN_PROGRESS,
            quantityBefore: currentQuantity,
            quantityAfter: currentQuantity,
            externalQuantityBefore: undefined,
          });

          // Sync to platform
          if (
            dto.syncType === InventorySyncType.PUSH ||
            dto.syncType === InventorySyncType.BIDIRECTIONAL
          ) {
            await platformService.updateInventory(connection, mapping, currentQuantity);
          }

          // For pull or bidirectional, get platform inventory
          if (
            dto.syncType === InventorySyncType.PULL ||
            dto.syncType === InventorySyncType.BIDIRECTIONAL
          ) {
            const platformInventory = await platformService.getInventory(connection, mapping);
            // Update WMS inventory if different
            if (platformInventory !== undefined && platformInventory !== currentQuantity) {
              await query(`UPDATE inventory SET quantity = $1 WHERE sku = $2`, [
                platformInventory,
                sku,
              ]);
            }
          }

          successCount++;
        } catch (error) {
          errors.push(`${sku}: ${error instanceof Error ? error.message : 'Unknown error'}`);
          failureCount++;
        }
      }

      // Update connection last sync
      await ecommerceRepository.updateLastSync(dto.connectionId);

      // Update sync log
      await ecommerceRepository.updateSyncLog(log.logId, {
        successCount,
        failureCount,
        syncStatus: EcommerceSyncStatus.COMPLETED,
        errorSummary: errors.length > 0 ? errors.join('; ') : undefined,
      });
    } catch (error) {
      await ecommerceRepository.updateSyncLog(log.logId, {
        successCount,
        failureCount,
        syncStatus: EcommerceSyncStatus.FAILED,
        errorSummary: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }

    return (await ecommerceRepository.findSyncLogs(dto.connectionId, 1))[0];
  }

  // ========================================================================
  // PRODUCT SYNC
  // ========================================================================

  /**
   * Sync products from platform
   */
  async syncProducts(dto: SyncProductsRequestDTO): Promise<EcommerceSyncLog> {
    const connection = await ecommerceRepository.findByIdOrThrow(dto.connectionId);
    const platformService = this.platformServices.get(connection.platformType);

    if (!platformService) {
      throw new Error('Platform not supported');
    }

    // Create sync log
    const log = await ecommerceRepository.createSyncLog({
      connectionId: dto.connectionId,
      syncType: 'PULL',
      resourceType: 'PRODUCT',
      resourceCount: 0,
      successCount: 0,
      failureCount: 0,
      syncStatus: EcommerceSyncStatus.IN_PROGRESS,
      createdBy: 'system',
    });

    let successCount = 0;
    let failureCount = 0;
    const errors: string[] = [];

    try {
      // Fetch products from platform
      const products = await platformService.fetchProducts(connection, dto.skus);

      log.resourceCount = products.length;

      for (const product of products) {
        try {
          // Check if product exists in WMS
          const existingProduct = await query(`SELECT sku FROM products WHERE sku = $1`, [
            product.sku,
          ]);

          if (existingProduct.rows.length === 0 && !dto.includeUnmapped) {
            continue;
          }

          // Create or update product mapping
          const existingMapping = await ecommerceRepository.findProductMappingBySKU(
            dto.connectionId,
            product.sku
          );

          if (existingMapping) {
            await ecommerceRepository.updateProductMapping(existingMapping.mappingId, {
              externalProductTitle: product.title,
              syncStatus: ProductMappingStatus.ACTIVE,
              lastSyncedAt: new Date(),
            });
          } else if (dto.includeUnmapped && product.sku) {
            await ecommerceRepository.createProductMapping({
              connectionId: dto.connectionId,
              internalSku: product.sku,
              externalProductId: product.externalProductId,
              externalVariantId: product.externalVariantId,
              externalProductTitle: product.title,
              syncStatus: ProductMappingStatus.UNSYNCED,
            });
          }

          successCount++;
        } catch (error) {
          errors.push(
            `${product.sku || product.externalProductId}: ${error instanceof Error ? error.message : 'Unknown error'}`
          );
          failureCount++;
        }
      }

      // Update connection last sync
      await ecommerceRepository.updateLastSync(dto.connectionId);

      // Update sync log
      await ecommerceRepository.updateSyncLog(log.logId, {
        resourceCount: products.length,
        successCount,
        failureCount,
        syncStatus: EcommerceSyncStatus.COMPLETED,
        errorSummary: errors.length > 0 ? errors.join('; ') : undefined,
      });
    } catch (error) {
      await ecommerceRepository.updateSyncLog(log.logId, {
        successCount,
        failureCount,
        syncStatus: EcommerceSyncStatus.FAILED,
        errorSummary: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }

    return (await ecommerceRepository.findSyncLogs(dto.connectionId, 1))[0];
  }

  // ========================================================================
  // ORDER SYNC
  // ========================================================================

  /**
   * Sync orders from platform
   */
  async syncOrders(dto: SyncOrdersRequestDTO): Promise<EcommerceSyncLog> {
    const connection = await ecommerceRepository.findByIdOrThrow(dto.connectionId);
    const platformService = this.platformServices.get(connection.platformType);

    if (!platformService) {
      throw new Error('Platform not supported');
    }

    // Create sync log
    const log = await ecommerceRepository.createSyncLog({
      connectionId: dto.connectionId,
      syncType: 'IMPORT',
      resourceType: 'ORDER',
      resourceCount: 0,
      successCount: 0,
      failureCount: 0,
      syncStatus: EcommerceSyncStatus.IN_PROGRESS,
      createdBy: 'system',
    });

    let successCount = 0;
    let failureCount = 0;
    const errors: string[] = [];

    try {
      // Fetch orders from platform
      const orders = await platformService.fetchOrders(
        connection,
        dto.orderIds,
        dto.daysToLookBack || 7
      );

      log.resourceCount = orders.length;

      for (const order of orders) {
        try {
          // Check if order already synced
          const existingSync = await ecommerceRepository.findOrderSyncByExternalId(
            dto.connectionId,
            order.externalOrderId
          );

          if (existingSync && existingSync.syncStatus === EcommerceSyncStatus.COMPLETED) {
            continue;
          }

          // Create or update order sync record
          if (existingSync) {
            await ecommerceRepository.updateOrderSyncStatus(
              existingSync.syncId,
              EcommerceSyncStatus.IN_PROGRESS
            );
          } else {
            await ecommerceRepository.createOrderSync({
              connectionId: dto.connectionId,
              externalOrderId: order.externalOrderId,
              syncStatus: EcommerceSyncStatus.IN_PROGRESS,
              syncType: OrderSyncType.IMPORT,
              orderData: order as any,
              lineItemsData: order.lineItems as any,
              customerData: order.customer as any,
            });
          }

          // Process order - create sales order in WMS
          const internalOrderId = await this.processPlatformOrder(connection, order);

          // Update sync record
          const syncRecord = await ecommerceRepository.findOrderSyncByExternalId(
            dto.connectionId,
            order.externalOrderId
          );

          if (syncRecord) {
            await ecommerceRepository.updateOrderSyncStatus(
              syncRecord.syncId,
              EcommerceSyncStatus.COMPLETED,
              internalOrderId
            );
          }

          successCount++;
        } catch (error) {
          errors.push(
            `${order.externalOrderId}: ${error instanceof Error ? error.message : 'Unknown error'}`
          );
          failureCount++;

          // Update sync record with error
          const syncRecord = await ecommerceRepository.findOrderSyncByExternalId(
            dto.connectionId,
            order.externalOrderId
          );

          if (syncRecord) {
            await ecommerceRepository.updateOrderSyncStatus(
              syncRecord.syncId,
              EcommerceSyncStatus.FAILED,
              undefined,
              error instanceof Error ? error.message : 'Unknown error'
            );
          }
        }
      }

      // Update connection last sync
      await ecommerceRepository.updateLastSync(dto.connectionId);

      // Update sync log
      await ecommerceRepository.updateSyncLog(log.logId, {
        resourceCount: orders.length,
        successCount,
        failureCount,
        syncStatus: EcommerceSyncStatus.COMPLETED,
        errorSummary: errors.length > 0 ? errors.join('; ') : undefined,
      });
    } catch (error) {
      await ecommerceRepository.updateSyncLog(log.logId, {
        successCount,
        failureCount,
        syncStatus: EcommerceSyncStatus.FAILED,
        errorSummary: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }

    return (await ecommerceRepository.findSyncLogs(dto.connectionId, 1))[0];
  }

  /**
   * Process a platform order and create internal sales order
   */
  private async processPlatformOrder(
    connection: EcommerceConnection,
    order: PlatformOrderData
  ): Promise<string> {
    // This would integrate with the sales/order module
    // For now, create a placeholder internal order ID
    const internalOrderId = `SO-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;

    // TODO: Create sales order in the system
    // - Validate customer (create if not exists)
    // - Validate line items (SKUs)
    // - Create sales order header
    // - Create sales order lines
    // - Set order status based on platform status

    return internalOrderId;
  }

  // ========================================================================
  // WEBHOOK HANDLING
  // ========================================================================

  /**
   * Process incoming webhook
   */
  async processWebhook(connectionId: string, event: string, payload: any): Promise<void> {
    const connection = await ecommerceRepository.findByIdOrThrow(connectionId);
    const platformService = this.platformServices.get(connection.platformType);

    if (!platformService) {
      throw new Error('Platform not supported');
    }

    // Verify webhook signature if secret is configured
    if (connection.webhookSecret && platformService.verifyWebhook) {
      const isValid = await platformService.verifyWebhook(connection, payload);
      if (!isValid) {
        throw new Error('Invalid webhook signature');
      }
    }

    // Create webhook record
    const webhook = await ecommerceRepository.createWebhook({
      connectionId,
      webhookEvent: event,
      externalResourceId: payload.id || payload.resource_id,
      payload,
      processingStatus: WebhookProcessingStatus.PENDING,
      receivedAt: new Date(),
    });

    // Process webhook based on event type
    try {
      await this.handleWebhookEvent(connection, event, payload);

      await ecommerceRepository.updateWebhookStatus(
        webhook.webhookId,
        WebhookProcessingStatus.PROCESSED
      );
    } catch (error) {
      await ecommerceRepository.updateWebhookStatus(
        webhook.webhookId,
        WebhookProcessingStatus.FAILED,
        error instanceof Error ? error.message : 'Unknown error'
      );
      throw error;
    }
  }

  /**
   * Handle specific webhook event
   */
  private async handleWebhookEvent(
    connection: EcommerceConnection,
    event: string,
    payload: any
  ): Promise<void> {
    const platformService = this.platformServices.get(connection.platformType);

    if (!platformService) {
      throw new Error('Platform not supported');
    }

    // Process based on event type
    if (event.includes('order') && platformService.handleOrderWebhook) {
      await platformService.handleOrderWebhook(connection, payload);
    } else if (event.includes('product') && platformService.handleProductWebhook) {
      await platformService.handleProductWebhook(connection, payload);
    } else if (event.includes('inventory') && platformService.handleInventoryWebhook) {
      await platformService.handleInventoryWebhook(connection, payload);
    }
  }

  // ========================================================================
  // STATUS & REPORTING
  // ========================================================================

  /**
   * Get connection status overview
   */
  async getConnectionStatus() {
    return await ecommerceRepository.getConnectionStatus();
  }

  /**
   * Get sync errors
   */
  async getSyncErrors() {
    return await ecommerceRepository.getSyncErrors();
  }

  /**
   * Get pending syncs
   */
  async getPendingSyncs() {
    return await ecommerceRepository.getPendingSyncs();
  }

  /**
   * Get sync logs for a connection
   */
  async getSyncLogs(connectionId: string, limit = 50) {
    return await ecommerceRepository.findSyncLogs(connectionId, limit);
  }

  // ========================================================================
  // PLATFORM SETTINGS
  // ========================================================================

  /**
   * Save platform-specific settings
   */
  private async savePlatformSettings(
    connectionId: string,
    platformType: PlatformType,
    settings: any
  ): Promise<void> {
    switch (platformType) {
      case PlatformType.SHOPIFY:
        await ecommerceRepository.saveShopifySettings(connectionId, settings);
        break;
      case PlatformType.WOOCOMMERCE:
        await ecommerceRepository.saveWooCommerceSettings(connectionId, settings);
        break;
      case PlatformType.MAGENTO:
        await ecommerceRepository.saveMagentoSettings(connectionId, settings);
        break;
    }
  }

  /**
   * Get platform-specific settings
   */
  async getPlatformSettings(connectionId: string, platformType: PlatformType) {
    switch (platformType) {
      case PlatformType.SHOPIFY:
        return await ecommerceRepository.getShopifySettings(connectionId);
      case PlatformType.WOOCOMMERCE:
        return await ecommerceRepository.getWooCommerceSettings(connectionId);
      case PlatformType.MAGENTO:
        return await ecommerceRepository.getMagentoSettings(connectionId);
      default:
        return null;
    }
  }
}

// Export singleton instance
export const ecommerceService = new EcommerceService();
