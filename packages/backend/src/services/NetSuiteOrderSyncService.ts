/**
 * NetSuite Order Sync Service
 *
 * Three-phase sync that keeps WMS picking/packing queues in sync with NetSuite:
 *   Phase 1: Fetch all Sales Orders + Item Fulfillments from NetSuite
 *   Phase 2: Upsert — create new WMS orders or update existing ones
 *   Phase 3: Cleanup — cancel stale orders no longer in NetSuite
 *
 * Sales Orders (pending fulfillment) → PENDING (picking queue)
 * Item Fulfillments (picked/packed)  → PICKED  (packing queue)
 * Item Fulfillments (shipped)        → SHIPPED (done)
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
import { query as sharedQuery } from '../db/client';
import { tenantPoolManager } from '../db/tenantContext';
import { OrderPriority } from '@opsui/shared';
import { Pool } from 'pg';

// ============================================================================
// TYPES
// ============================================================================

export interface NetSuiteSyncResult {
  totalProcessed: number;
  succeeded: number;
  failed: number;
  skipped: number;
  updated: number;
  cleaned: number;
  details: {
    imported: string[];
    updated: string[];
    failed: Array<{ tranId: string; error: string }>;
    skipped: Array<{ tranId: string; reason: string }>;
    cleaned: string[];
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
  /** Sync start timestamp (for stale cleanup) */
  syncStartTime?: Date;
  /** Sync mode: full discovery or fast incremental reconciliation */
  mode?: 'full' | 'incremental';
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
// HELPERS
// ============================================================================

/**
 * Decode HTML entities from NetSuite SOAP responses
 */
function decodeHtmlEntities(text: string): string {
  if (!text) return text;
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_match, dec) => String.fromCharCode(parseInt(dec, 10)));
}

// ============================================================================
// SERVICE
// ============================================================================

interface NetSuiteItemDetails {
  itemId: string;
  displayName: string;
  upcCode: string;
  binNumber: string;
}

interface ExistingOrder {
  orderId: string;
  status: string;
  netsuiteIfInternalId: string | null;
}

export class NetSuiteOrderSyncService {
  private static readonly INCREMENTAL_FULFILLMENT_LOOKBACK_MS = 30 * 60 * 1000;
  private client: NetSuiteClient;
  private organizationId: string | null = null;
  private tenantPool: Pool | null = null;
  private itemCache: Map<string, NetSuiteItemDetails> = new Map();
  private salesOrderCache: Map<string, Promise<NetSuiteSalesOrder>> = new Map();
  private fulfillmentCache: Map<string, Promise<any>> = new Map();
  private orderLookupBySoIdCache: Map<string, ExistingOrder | null> = new Map();
  private orderLookupByIfIdCache: Map<string, ExistingOrder | null> = new Map();
  private orderLookupByExternalIdCache: Map<string, ExistingOrder | null> = new Map();

  /**
   * Choose the most advanced fulfillment status (shipped > packed > picked).
   * NetSuite can return fulfillments out of order, so "last" is not reliable.
   */
  private selectBestFulfillment(fulfillments: any[]): any | null {
    if (!fulfillments || fulfillments.length === 0) return null;
    const rank = (f: any) => {
      const status = (f?.shipStatus || '').toLowerCase();
      if (status.includes('shipped')) return 3;
      if (status.includes('packed')) return 2;
      if (status.includes('picked')) return 1;
      return 0;
    };
    return fulfillments.reduce((best: any, current: any) => {
      if (!best) return current;
      return rank(current) >= rank(best) ? current : best;
    }, null);
  }

  private async mapWithConcurrency<T, R>(
    items: T[],
    concurrency: number,
    mapper: (item: T, index: number) => Promise<R>
  ): Promise<R[]> {
    const results: R[] = new Array(items.length);
    let nextIndex = 0;

    const worker = async () => {
      while (true) {
        const currentIndex = nextIndex++;
        if (currentIndex >= items.length) return;
        results[currentIndex] = await mapper(items[currentIndex], currentIndex);
      }
    };

    const workerCount = Math.max(1, Math.min(concurrency, items.length));
    await Promise.all(Array.from({ length: workerCount }, () => worker()));
    return results;
  }

  private async getSalesOrderCached(soId: string): Promise<NetSuiteSalesOrder> {
    let promise = this.salesOrderCache.get(soId);
    if (!promise) {
      promise = this.client.getSalesOrder(soId);
      this.salesOrderCache.set(soId, promise);
    }
    return promise;
  }

  private async getItemFulfillmentCached(fulfillmentId: string): Promise<any> {
    let promise = this.fulfillmentCache.get(fulfillmentId);
    if (!promise) {
      promise = this.client.getItemFulfillment(fulfillmentId);
      this.fulfillmentCache.set(fulfillmentId, promise);
    }
    return promise;
  }

  private resetPerSyncCaches(): void {
    this.salesOrderCache.clear();
    this.fulfillmentCache.clear();
    this.orderLookupBySoIdCache.clear();
    this.orderLookupByIfIdCache.clear();
    this.orderLookupByExternalIdCache.clear();
  }

  private invalidateOrderLookupCaches(): void {
    this.orderLookupBySoIdCache.clear();
    this.orderLookupByIfIdCache.clear();
    this.orderLookupByExternalIdCache.clear();
  }

  private reduceFulfillmentsForUpsert(fulfillments: any[]): any[] {
    const bestBySoId = new Map<string, any>();
    const standalone: any[] = [];

    for (const fulfillment of fulfillments) {
      const soId = fulfillment.createdFrom?.id;
      if (!soId) {
        standalone.push(fulfillment);
        continue;
      }

      const existing = bestBySoId.get(soId);
      bestBySoId.set(
        soId,
        existing ? this.selectBestFulfillment([existing, fulfillment]) || fulfillment : fulfillment
      );
    }

    return [...bestBySoId.values(), ...standalone];
  }

  private getOrderStatusFromFulfillmentShipStatus(
    shipStatus: string
  ): 'PICKED' | 'PACKED' | 'SHIPPED' {
    const normalizedStatus = (shipStatus || '').toLowerCase();
    if (normalizedStatus.includes('shipped')) return 'SHIPPED';
    if (normalizedStatus.includes('packed')) return 'PACKED';
    return 'PICKED';
  }

  /**
   * Rekey a legacy IF-based order to the correct SO order_id.
   * Updates dependent tables best-effort (ignores missing tables).
   */
  private async rekeyOrderToSalesOrder(
    existingOrderId: string,
    newOrderId: string,
    soInternalId: string | null,
    soTranId: string | null,
    ifInternalId: string | null,
    ifTranId: string | null
  ): Promise<boolean> {
    if (!existingOrderId || !newOrderId || existingOrderId === newOrderId) return false;

    const conflict = await this.query(`SELECT 1 FROM orders WHERE order_id = $1`, [newOrderId]);
    if (conflict.rows.length > 0) {
      logger.warn('Order rekey skipped (target order_id exists)', {
        existingOrderId,
        newOrderId,
      });
      return false;
    }

    const existing = await this.query(`SELECT * FROM orders WHERE order_id = $1`, [
      existingOrderId,
    ]);
    if (existing.rows.length === 0) return false;
    const row = existing.rows[0];

    const newRow = {
      ...row,
      order_id: newOrderId,
      netsuite_so_internal_id: soInternalId,
      netsuite_so_tran_id: soTranId,
      netsuite_if_internal_id: row.netsuite_if_internal_id || ifInternalId,
      netsuite_if_tran_id: row.netsuite_if_tran_id || ifTranId,
      updated_at: new Date(),
    };

    const cols = Object.keys(newRow);
    const values = cols.map(col => (newRow as any)[col]);
    const placeholders = cols.map((_, i) => `$${i + 1}`);

    await this.query(
      `INSERT INTO orders (${cols.join(', ')}) VALUES (${placeholders.join(', ')})`,
      values
    );
    this.invalidateOrderLookupCaches();

    await this.query(
      `UPDATE order_items
       SET order_id = $1,
           order_item_id = REPLACE(order_item_id, $2, $1)
       WHERE order_id = $2`,
      [newOrderId, existingOrderId]
    );
    this.invalidateOrderLookupCaches();

    try {
      await this.query(`UPDATE pick_tasks SET order_id = $1 WHERE order_id = $2`, [
        newOrderId,
        existingOrderId,
      ]);
    } catch {
      /* table may not exist */
    }

    try {
      await this.query(`UPDATE order_state_changes SET order_id = $1 WHERE order_id = $2`, [
        newOrderId,
        existingOrderId,
      ]);
    } catch {
      /* table may not exist */
    }

    try {
      await this.query(`UPDATE order_external_refs SET order_id = $1 WHERE order_id = $2`, [
        newOrderId,
        existingOrderId,
      ]);
    } catch {
      /* table may not exist */
    }

    await this.query(`DELETE FROM orders WHERE order_id = $1`, [existingOrderId]);

    logger.info('Rekeyed legacy IF order to SO order_id', {
      from: existingOrderId,
      to: newOrderId,
    });
    return true;
  }

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
  // SCHEMA MIGRATION (idempotent)
  // ========================================================================

  /**
   * Ensure NetSuite tracking columns exist on the orders table.
   * Runs on every sync — all statements are idempotent (IF NOT EXISTS / safe).
   */
  private async ensureSchemaColumns(): Promise<void> {
    const columns = [
      { name: 'netsuite_so_internal_id', type: 'VARCHAR(50)' },
      { name: 'netsuite_so_tran_id', type: 'VARCHAR(50)' },
      { name: 'netsuite_order_date', type: 'DATE' },
      { name: 'netsuite_if_internal_id', type: 'VARCHAR(50)' },
      { name: 'netsuite_if_tran_id', type: 'VARCHAR(50)' },
      { name: 'netsuite_last_synced_at', type: 'TIMESTAMP WITH TIME ZONE' },
      { name: 'netsuite_source', type: 'VARCHAR(20)' },
      { name: 'customer_po_number', type: 'VARCHAR(100)' },
    ];

    for (const col of columns) {
      try {
        await this.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS ${col.name} ${col.type}`);
      } catch {
        // Column may already exist — safe to ignore
      }
    }

    // Create indexes for fast lookups
    try {
      await this.query(
        `CREATE INDEX IF NOT EXISTS idx_orders_ns_so_id ON orders(netsuite_so_internal_id) WHERE netsuite_so_internal_id IS NOT NULL`
      );
      await this.query(
        `CREATE INDEX IF NOT EXISTS idx_orders_ns_if_id ON orders(netsuite_if_internal_id) WHERE netsuite_if_internal_id IS NOT NULL`
      );
      await this.query(
        `CREATE INDEX IF NOT EXISTS idx_orders_ns_so_tran ON orders(netsuite_so_tran_id) WHERE netsuite_so_tran_id IS NOT NULL`
      );
    } catch {
      // Indexes may already exist
    }

    // Backfill existing orders that were created with old approach
    try {
      await this.query(
        `UPDATE orders
         SET netsuite_so_tran_id = SUBSTRING(customer_email FROM 10),
             netsuite_source = 'NETSUITE'
         WHERE customer_email LIKE 'netsuite:SO%'
           AND netsuite_so_tran_id IS NULL`
      );
      await this.query(
        `UPDATE orders
         SET netsuite_if_tran_id = SUBSTRING(customer_email FROM 10),
             netsuite_source = 'NETSUITE'
         WHERE customer_email LIKE 'netsuite:IF%'
           AND netsuite_if_tran_id IS NULL`
      );
      // Also mark any other netsuite: prefixed orders
      await this.query(
        `UPDATE orders
         SET netsuite_source = 'NETSUITE'
         WHERE customer_email LIKE 'netsuite:%'
           AND netsuite_source IS NULL`
      );
    } catch {
      // Backfill may fail on first run if columns don't exist yet — safe
    }
  }

  // ========================================================================
  // MAIN SYNC METHOD — THREE-PHASE
  // ========================================================================

  /**
   * Sync orders from NetSuite to WMS using three-phase approach:
   * 1. Fetch all SOs + IFs from NetSuite
   * 2. Upsert: create new or update existing WMS orders
   * 3. Cleanup: cancel stale PENDING orders not seen in NetSuite
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

    // Ensure schema columns exist (idempotent)
    await this.ensureSchemaColumns();

    // Clear item cache for fresh sync
    this.itemCache.clear();
    this.resetPerSyncCaches();

    const syncStartTime = _options.syncStartTime || new Date();
    const syncMode = _options.mode || 'full';

    const result: NetSuiteSyncResult = {
      totalProcessed: 0,
      succeeded: 0,
      failed: 0,
      skipped: 0,
      updated: 0,
      cleaned: 0,
      details: {
        imported: [],
        updated: [],
        failed: [],
        skipped: [],
        cleaned: [],
      },
    };

    try {
      logger.info('Starting NetSuite three-phase order sync', {
        mode: syncMode,
      });

      // ====================================================================
      // PHASE 1: Fetch pending fulfillment Sales Orders from NetSuite
      // Search returns full data with line items (bodyFieldsOnly=false)
      // ====================================================================

      let allSalesOrders: NetSuiteSalesOrder[] = [];
      let pendingSalesOrderSummaries: NetSuiteSalesOrder[] = [];
      let allFulfillments: any[] = [];
      let phase1FetchSucceeded = false;
      if (syncMode === 'full') {
        try {
          const soResponse = await this.client.getSalesOrders({
            status: '_pendingFulfillment',
          });
          pendingSalesOrderSummaries = (soResponse.items || []) as NetSuiteSalesOrder[];
          const readySalesOrderSummaries = pendingSalesOrderSummaries.filter(so => so.readyToShip);
          const salesOrderDetails = await this.mapWithConcurrency(
            readySalesOrderSummaries,
            2,
            async salesOrder => {
              try {
                return await this.getSalesOrderCached(salesOrder.id);
              } catch (error: any) {
                logger.warn('Failed to fetch full sales order details', {
                  soInternalId: salesOrder.id,
                  soTranId: salesOrder.tranId,
                  error: error.message,
                });
                return null;
              }
            }
          );
          allSalesOrders = salesOrderDetails.filter(Boolean) as NetSuiteSalesOrder[];
          phase1FetchSucceeded = true;
          logger.info('Phase 1: Fetched pending sales orders from NetSuite', {
            count: allSalesOrders.length,
            summariesFetched: pendingSalesOrderSummaries.length,
            readySummariesFetched: readySalesOrderSummaries.length,
            detailFetchFailed: readySalesOrderSummaries.length - allSalesOrders.length,
            mode: syncMode,
          });
        } catch (error: any) {
          logger.warn('Phase 1: Failed to fetch sales orders', {
            error: error.message,
            mode: syncMode,
          });
        }
      } else {
        logger.info('Phase 1: Skipping sales-order discovery in incremental mode');
      }

      // Track all pending-fulfillment orders plus the subset that should remain in the WMS queue.
      const currentPendingSoIds = new Set<string>();
      const currentReadyToShipSoIds = new Set<string>();
      for (const so of pendingSalesOrderSummaries) {
        currentPendingSoIds.add(so.id);
        if (so.readyToShip) currentReadyToShipSoIds.add(so.id);
      }

      result.totalProcessed = allSalesOrders.length;

      // ====================================================================
      // PHASE 1.5: Fetch Item Fulfillments from NetSuite
      // These are used to sync picking/packing queue status with NetSuite
      // ====================================================================

      const fulfillmentMap = new Map<string, any[]>();
      try {
        const fulfillmentModifiedAfter =
          syncMode === 'incremental'
            ? new Date(
                syncStartTime.getTime() -
                  NetSuiteOrderSyncService.INCREMENTAL_FULFILLMENT_LOOKBACK_MS
              )
            : undefined;

        // Incremental syncs use a tight overlap window; full syncs retain the broader sweep.
        const ifResponse = await this.client.getItemFulfillments({
          limit: 1000,
          modifiedAfter: fulfillmentModifiedAfter,
        });
        allFulfillments = ifResponse.items || [];
        const fulfillments = allFulfillments;

        // Group fulfillments by parent SO ID (createdFrom.id)
        for (const f of fulfillments) {
          const soId = f.createdFrom?.id;
          if (!soId) continue;
          const existing = fulfillmentMap.get(soId) || [];
          existing.push(f);
          fulfillmentMap.set(soId, existing);
        }

        // Debug: Log sample SO IDs in fulfillmentMap
        const sampleSoIds = Array.from(fulfillmentMap.keys()).slice(0, 10);
        logger.info('Phase 1.5: Fetched Item Fulfillments from NetSuite', {
          count: fulfillments.length,
          uniqueSOs: fulfillmentMap.size,
          sampleSoIds,
          modifiedAfter: fulfillmentModifiedAfter?.toISOString() || null,
        });
      } catch (error: any) {
        logger.warn('Phase 1.5: Failed to fetch Item Fulfillments', { error: error.message });
      }

      // ====================================================================
      // PHASE 2: Upsert Sales Orders into WMS (picking queue)
      // ====================================================================

      for (const salesOrder of allSalesOrders) {
        try {
          const syncResult = await this.upsertFromSalesOrder(
            salesOrder,
            fulfillmentMap, // Pass fulfillment data for status transitions
            syncStartTime,
            _options
          );

          if (syncResult.created) {
            result.succeeded++;
            result.details.imported.push(syncResult.tranId);
          } else if (syncResult.updated) {
            result.updated++;
            result.details.updated.push(syncResult.tranId);
          } else if (syncResult.skipped) {
            result.skipped++;
            result.details.skipped.push({
              tranId: syncResult.tranId,
              reason: syncResult.reason || 'Unknown',
            });
          }
        } catch (error: any) {
          result.failed++;
          result.details.failed.push({
            tranId: salesOrder.tranId || salesOrder.id,
            error: error.message || 'Unknown error',
          });
          logger.error('Failed to sync sales order', {
            orderId: salesOrder.id,
            error: error.message,
          });
        }
      }

      // ====================================================================
      // PHASE 2.5: Upsert Item Fulfillments not tied to current pending SOs
      // This captures orders visible in Item Ship Manager even if SO is not
      // in the pending fulfillment list (e.g., ready-to-ship flags differ).
      // ====================================================================

      if (allFulfillments.length > 0) {
        const fulfillmentsForUpsert = this.reduceFulfillmentsForUpsert(allFulfillments);
        logger.info('Phase 2.5: Deduped fulfillments for upsert', {
          originalCount: allFulfillments.length,
          dedupedCount: fulfillmentsForUpsert.length,
        });

        for (const fulfillment of fulfillmentsForUpsert) {
          const soId = fulfillment.createdFrom?.id;
          if (soId && currentReadyToShipSoIds.has(soId)) {
            continue; // already handled via SO upsert
          }
          try {
            const syncResult = await this.upsertFromFulfillment(
              fulfillment,
              syncStartTime,
              _options
            );
            if (syncResult.created) {
              result.succeeded++;
              result.details.imported.push(syncResult.tranId);
            } else if (syncResult.updated) {
              result.updated++;
              result.details.updated.push(syncResult.tranId);
            } else if (syncResult.skipped) {
              result.skipped++;
              result.details.skipped.push({
                tranId: syncResult.tranId,
                reason: syncResult.reason || 'Unknown',
              });
            }
          } catch (error: any) {
            result.failed++;
            result.details.failed.push({
              tranId: fulfillment.tranId || fulfillment.id,
              error: error.message || 'Unknown error',
            });
            logger.error('Failed to sync fulfillment', {
              ifId: fulfillment.id,
              error: error.message,
              stack: error.stack,
            });
          }
        }
      }

      // ====================================================================
      // PHASE 3: Check PENDING/PICKING WMS orders against NetSuite
      // PENDING orders: transition to PICKED if fulfilled, CANCELLED if cancelled
      // PICKING orders: transition to PICKED if fulfillment exists (picked on NetSuite)
      // ====================================================================

      try {
        const activeWmsOrders = await this.query(
          `SELECT order_id, status, netsuite_so_internal_id, netsuite_so_tran_id
           FROM orders
           WHERE netsuite_source = 'NETSUITE'
             AND status IN ('PENDING', 'PICKING')
             AND netsuite_so_internal_id IS NOT NULL`
        );

        // Debug: Log sample SO IDs from WMS PENDING orders
        const wmsSoIds = activeWmsOrders.rows.map((r: any) => r.netsuite_so_internal_id);
        logger.info('Phase 3: Checking WMS PENDING/PICKING orders against NetSuite', {
          wmsActiveCount: activeWmsOrders.rows.length,
          wmsPendingCount: activeWmsOrders.rows.filter((r: any) => r.status === 'PENDING').length,
          wmsPickingCount: activeWmsOrders.rows.filter((r: any) => r.status === 'PICKING').length,
          netSuitePendingCount: currentPendingSoIds.size,
          wmsSoIds: wmsSoIds.slice(0, 15),
          fulfillmentMapKeys: Array.from(fulfillmentMap.keys()).slice(0, 15),
        });

        // Phase 3.1: Fetch fulfillments specifically for WMS orders not in the general fulfillmentMap
        // This ensures we detect fulfillments for orders that might not be in the first 200
        const wmsSoIdsWithoutFulfillments = wmsSoIds.filter(
          (soId: string) => !fulfillmentMap.has(soId)
        );
        if (wmsSoIdsWithoutFulfillments.length > 0) {
          logger.info('Phase 3.1: Fetching fulfillments for WMS orders not in general map', {
            count: wmsSoIdsWithoutFulfillments.length,
            soIds: wmsSoIdsWithoutFulfillments.slice(0, 10),
          });
          try {
            const specificFulfillments = await this.client.getItemFulfillmentsBySalesOrder(
              wmsSoIdsWithoutFulfillments
            );
            // Merge into fulfillmentMap
            for (const f of specificFulfillments) {
              const soId = f.createdFrom?.id;
              if (!soId) continue;
              const existing = fulfillmentMap.get(soId) || [];
              existing.push(f);
              fulfillmentMap.set(soId, existing);
            }
            logger.info('Phase 3.1: Added specific fulfillments to map', {
              fetched: specificFulfillments.length,
              newMapSize: fulfillmentMap.size,
            });
          } catch (error: any) {
            logger.warn('Phase 3.1: Failed to fetch specific fulfillments', {
              error: error.message,
            });
          }
        }

        // If Phase 1 succeeded, we have a reliable pending set
        // If Phase 1 failed (timeout), currentPendingSoIds will be empty
        const phase1Succeeded = phase1FetchSucceeded;

        for (const row of activeWmsOrders.rows) {
          const soId = row.netsuite_so_internal_id;
          const orderStatus = row.status;

          // Handle PICKING orders - check if fulfillment exists on NetSuite
          if (orderStatus === 'PICKING') {
            const fulfillments = fulfillmentMap.get(soId) || [];
            if (fulfillments.length > 0) {
              const latestFulfillment =
                this.selectBestFulfillment(fulfillments) || fulfillments[fulfillments.length - 1];
              const shipStatus = (latestFulfillment.shipStatus || '').toLowerCase();
              const targetStatus = this.getOrderStatusFromFulfillmentShipStatus(shipStatus);

              // Fetch full fulfillment details to get line items for verified_quantity sync
              let fulfillmentWithItems = latestFulfillment;
              if (!latestFulfillment.item && latestFulfillment.id) {
                try {
                  fulfillmentWithItems = await this.getItemFulfillmentCached(latestFulfillment.id);
                } catch (error: any) {
                  logger.warn('Failed to fetch fulfillment details for PICKING order item sync', {
                    ifId: latestFulfillment.id,
                    error: error.message,
                  });
                }
              }

              await this.updateOrderStatus(row.order_id, targetStatus, {
                ifInternalId: latestFulfillment.id,
                ifTranId: latestFulfillment.tranId,
                items: fulfillmentWithItems.item?.items || [],
              });
              result.updated++;
              result.details.updated.push(row.netsuite_so_tran_id || soId);
              logger.info(
                `Updated PICKING order to ${targetStatus} (fulfillment found on NetSuite)`,
                {
                  orderId: row.order_id,
                  soTranId: row.netsuite_so_tran_id,
                  shipStatus,
                }
              );
              await this.markOrderSynced(row.order_id, syncStartTime);
              continue;
            }
            // No fulfillment found - order is still being picked on WMS, keep in queue
            await this.markOrderSynced(row.order_id, syncStartTime);
            continue;
          }

          // Handle PENDING orders - FIRST check if fulfillment exists
          // If NetSuite created a fulfillment, the order should move to PICKED/SHIPPED
          const pendingFulfillments = fulfillmentMap.get(soId) || [];
          logger.debug('Checking PENDING order for fulfillments', {
            orderId: row.order_id,
            soId,
            fulfillmentCount: pendingFulfillments.length,
            hasMatch: pendingFulfillments.length > 0,
          });
          if (pendingFulfillments.length > 0) {
            const latestFulfillment =
              this.selectBestFulfillment(pendingFulfillments) ||
              pendingFulfillments[pendingFulfillments.length - 1];
            const shipStatus = (latestFulfillment.shipStatus || '').toLowerCase();
            const targetStatus = this.getOrderStatusFromFulfillmentShipStatus(shipStatus);

            // Fetch full fulfillment details to get line items for verified_quantity sync
            let fulfillmentWithItems = latestFulfillment;
            if (!latestFulfillment.item && latestFulfillment.id) {
              try {
                fulfillmentWithItems = await this.getItemFulfillmentCached(latestFulfillment.id);
              } catch (error: any) {
                logger.warn('Failed to fetch fulfillment details for PENDING order item sync', {
                  ifId: latestFulfillment.id,
                  error: error.message,
                });
              }
            }

            await this.updateOrderStatus(row.order_id, targetStatus, {
              ifInternalId: latestFulfillment.id,
              ifTranId: latestFulfillment.tranId,
              items: fulfillmentWithItems.item?.items || [],
            });
            result.updated++;
            result.details.updated.push(row.netsuite_so_tran_id || soId);
            logger.info(
              `Updated PENDING order to ${targetStatus} (fulfillment found on NetSuite)`,
              {
                orderId: row.order_id,
                soTranId: row.netsuite_so_tran_id,
                shipStatus,
              }
            );
            await this.markOrderSynced(row.order_id, syncStartTime);
            continue;
          }

          // No fulfillment found - check if SO is still pending in NetSuite
          if (phase1Succeeded && currentReadyToShipSoIds.has(soId)) {
            await this.markOrderSynced(row.order_id, syncStartTime);
            continue;
          }

          if (phase1Succeeded && currentPendingSoIds.has(soId)) {
            await this.query(
              `UPDATE orders
               SET status = 'CANCELLED'::order_status,
                   cancelled_at = NOW(),
                   updated_at = NOW()
               WHERE order_id = $1 AND status = 'PENDING'`,
              [row.order_id]
            );
            await this.markOrderSynced(row.order_id, syncStartTime);
            result.cleaned++;
            result.details.cleaned.push(row.netsuite_so_tran_id || soId);
            logger.info('Cancelled order (SO pending fulfillment but readyToShip is false)', {
              orderId: row.order_id,
              soTranId: row.netsuite_so_tran_id,
              soId,
            });
            continue;
          }

          // SO is not in pending set — either:
          // 1. Phase 1 failed (timeout) — need to check individually
          // 2. SO was fulfilled/cancelled on NetSuite
          try {
            const soDetail = await this.getSalesOrderCached(soId);
            const soStatus = (soDetail.status?.refName || '').toLowerCase();
            const soLines = soDetail.item?.items || [];
            const hasFulfilledQuantity = soLines.some(line => (line.quantityFulfilled || 0) > 0);

            if (soStatus.includes('pending fulfillment')) {
              if (soDetail.readyToShip === false) {
                await this.query(
                  `UPDATE orders
                   SET status = 'CANCELLED'::order_status,
                       cancelled_at = NOW(),
                       updated_at = NOW()
                   WHERE order_id = $1 AND status = 'PENDING'`,
                  [row.order_id]
                );
                await this.markOrderSynced(row.order_id, syncStartTime);
                result.cleaned++;
                result.details.cleaned.push(row.netsuite_so_tran_id || soId);
                logger.info('Cancelled order (SO pending fulfillment but readyToShip is false)', {
                  orderId: row.order_id,
                  soTranId: row.netsuite_so_tran_id,
                  soId,
                });
                continue;
              }

              if (hasFulfilledQuantity) {
                await this.updateOrderStatus(row.order_id, 'PICKED');
                await this.markOrderSynced(row.order_id, syncStartTime);
                result.updated++;
                result.details.updated.push(row.netsuite_so_tran_id || soId);
                logger.warn(
                  'Updated order to PICKED using sales-order fulfilled quantities fallback',
                  {
                    orderId: row.order_id,
                    soTranId: row.netsuite_so_tran_id,
                    soId,
                    soStatus,
                  }
                );
                continue;
              }

              // Still pending — mark synced and keep in queue
              await this.markOrderSynced(row.order_id, syncStartTime);
              logger.debug('Order still pending fulfillment in NetSuite', {
                orderId: row.order_id,
                soTranId: row.netsuite_so_tran_id,
              });
            } else if (
              soStatus.includes('billed') ||
              soStatus.includes('closed') ||
              soStatus.includes('pending billing') ||
              soStatus.includes('fulfilled')
            ) {
              // SO was fulfilled/completed — mark as PICKED (it went through picking)
              await this.updateOrderStatus(row.order_id, 'PICKED');
              await this.markOrderSynced(row.order_id, syncStartTime);
              result.updated++;
              result.details.updated.push(row.netsuite_so_tran_id || soId);
              logger.info('Updated order to PICKED (SO no longer pending fulfillment)', {
                orderId: row.order_id,
                soTranId: row.netsuite_so_tran_id,
                newSoStatus: soStatus,
              });
            } else if (soStatus.includes('cancelled')) {
              // SO was cancelled
              await this.query(
                `UPDATE orders SET status = 'CANCELLED'::order_status, cancelled_at = NOW(), updated_at = NOW()
                 WHERE order_id = $1 AND status = 'PENDING'`,
                [row.order_id]
              );
              await this.markOrderSynced(row.order_id, syncStartTime);
              result.cleaned++;
              result.details.cleaned.push(row.netsuite_so_tran_id || soId);
              logger.info('Cancelled order (SO cancelled on NetSuite)', {
                orderId: row.order_id,
                soTranId: row.netsuite_so_tran_id,
              });
            } else if (
              soStatus.includes('partially fulfilled') ||
              soStatus.includes('pending approval') ||
              soStatus.includes('approved')
            ) {
              // Handle additional known statuses
              // Partially fulfilled = some items shipped, move to PICKED
              // Approved = ready to fulfill, keep in PENDING
              if (soStatus.includes('partially fulfilled')) {
                await this.updateOrderStatus(row.order_id, 'PICKED');
                await this.markOrderSynced(row.order_id, syncStartTime);
                result.updated++;
                result.details.updated.push(row.netsuite_so_tran_id || soId);
                logger.info('Updated order to PICKED (partially fulfilled on NetSuite)', {
                  orderId: row.order_id,
                  soTranId: row.netsuite_so_tran_id,
                  newSoStatus: soStatus,
                });
              } else {
                // approved/pending approval - keep in queue
                await this.markOrderSynced(row.order_id, syncStartTime);
                logger.debug('Order status approved/pending approval, keeping in queue', {
                  orderId: row.order_id,
                  soTranId: row.netsuite_so_tran_id,
                  soStatus,
                });
              }
            } else {
              // Truly unknown status — mark synced so Phase 4 can clean up after timeout
              // This prevents orders from being stuck forever with weird statuses
              await this.markOrderSynced(row.order_id, syncStartTime);
              logger.warn('Order has unknown NetSuite status - will be cleaned up if stale', {
                orderId: row.order_id,
                soTranId: row.netsuite_so_tran_id,
                soStatus,
                note: 'Order marked synced, Phase 4 cleanup will handle if still active after 2 minutes',
              });
            }
          } catch (error: any) {
            // Check if the order was deleted from NetSuite
            const errorMsg = error.message || '';
            if (errorMsg.includes('does not exist') || errorMsg.includes('not found')) {
              // Order was deleted from NetSuite - cancel it immediately
              await this.query(
                `UPDATE orders SET status = 'CANCELLED'::order_status, cancelled_at = NOW(), updated_at = NOW()
                 WHERE order_id = $1 AND status IN ('PENDING', 'PICKING')`,
                [row.order_id]
              );
              await this.markOrderSynced(row.order_id, syncStartTime);
              result.cleaned++;
              result.details.cleaned.push(row.netsuite_so_tran_id || soId);
              logger.info('Cancelled order - record deleted from NetSuite', {
                orderId: row.order_id,
                soTranId: row.netsuite_so_tran_id,
                soId,
              });
            } else {
              // Other errors (timeout, etc.) - mark for cleanup
              logger.warn('Failed to check SO status for pending WMS order - marking for cleanup', {
                orderId: row.order_id,
                soId,
                soTranId: row.netsuite_so_tran_id,
                error: error.message,
                willBeCleanedUp: true,
              });
              await this.markOrderSynced(row.order_id, syncStartTime);
            }
          }
        }
      } catch (error: any) {
        logger.error('Phase 3: Status transition check failed', { error: error.message });
      }

      // ====================================================================
      // PHASE 3.5: Sync packing queue (PICKED/PACKING) with NetSuite fulfillments
      // Orders in packing queue may have been packed/shipped on NetSuite
      // ====================================================================

      // Configurable thresholds for stale order detection
      const STALE_ORDER_THRESHOLD_HOURS = parseInt(process.env.NETSUITE_STALE_ORDER_HOURS || '48');
      const STALE_ORDER_WARNING_HOURS = Math.floor(STALE_ORDER_THRESHOLD_HOURS / 2); // Warn at half threshold

      try {
        // Include updated_at to detect stale orders
        const packingOrders = await this.query(
          `SELECT order_id, status, netsuite_so_internal_id, netsuite_so_tran_id, netsuite_if_internal_id,
                  netsuite_last_synced_at, updated_at, created_at,
                  EXTRACT(EPOCH FROM (NOW() - updated_at)) / 3600 as hours_since_update,
                  EXTRACT(EPOCH FROM (NOW() - created_at)) / 3600 as hours_since_created
           FROM orders
           WHERE netsuite_source = 'NETSUITE'
             AND status IN ('PICKED', 'PACKING')
             AND netsuite_so_internal_id IS NOT NULL`
        );

        // Categorize orders for detailed logging
        const stats = {
          total: packingOrders.rows.length,
          withFulfillment: 0,
          withoutFulfillment: 0,
          stale: { pending: 0, cancelled: 0, kept: 0 },
          warnings: 0,
        };

        logger.info('Phase 3.5: Checking packing queue orders against NetSuite fulfillments', {
          packingQueueCount: packingOrders.rows.length,
          byStatus: {
            PICKED: packingOrders.rows.filter((r: any) => r.status === 'PICKED').length,
            PACKING: packingOrders.rows.filter((r: any) => r.status === 'PACKING').length,
          },
          fulfillmentMapSize: fulfillmentMap.size,
          staleThresholdHours: STALE_ORDER_THRESHOLD_HOURS,
        });

        // Track stale orders by action taken for summary logging
        const staleOrderActions = {
          movedToPending: [] as string[],
          movedToCancelled: [] as string[],
          keptInPlace: [] as string[],
          warnings: [] as string[],
        };

        for (const row of packingOrders.rows) {
          const soId = row.netsuite_so_internal_id;
          const fulfillments = fulfillmentMap.get(soId) || [];
          const hoursSinceUpdate = parseFloat(row.hours_since_update) || 0;
          const hoursSinceCreated = parseFloat(row.hours_since_created) || 0;

          if (fulfillments.length === 0) {
            stats.withoutFulfillment++;

            // Early warning for orders approaching stale threshold
            if (
              hoursSinceUpdate > STALE_ORDER_WARNING_HOURS &&
              hoursSinceUpdate <= STALE_ORDER_THRESHOLD_HOURS
            ) {
              stats.warnings++;
              staleOrderActions.warnings.push(row.netsuite_so_tran_id || soId);
              logger.warn('Order approaching stale threshold (no NetSuite fulfillment)', {
                orderId: row.order_id,
                soTranId: row.netsuite_so_tran_id,
                status: row.status,
                hoursSinceUpdate: Math.round(hoursSinceUpdate),
                hoursUntilStale: Math.round(STALE_ORDER_THRESHOLD_HOURS - hoursSinceUpdate),
                hasIfId: !!row.netsuite_if_internal_id,
              });
            }

            // Order is stale - check SO status to determine action
            if (hoursSinceUpdate > STALE_ORDER_THRESHOLD_HOURS) {
              // Try to fetch SO status to make smart decision
              let soStatus = 'unknown';
              try {
                const soDetail = await this.getSalesOrderCached(soId);
                soStatus = (soDetail.status?.refName || '').toLowerCase();
              } catch (error: any) {
                logger.debug('Could not fetch SO status for stale order', {
                  orderId: row.order_id,
                  soId,
                  error: error.message,
                });
              }

              const isCancelled = soStatus.includes('cancelled');
              const isClosed =
                soStatus.includes('closed') ||
                soStatus.includes('fulfilled') ||
                soStatus.includes('billed');

              if (isCancelled) {
                // SO was cancelled - move to CANCELLED
                stats.stale.cancelled++;
                staleOrderActions.movedToCancelled.push(row.netsuite_so_tran_id || soId);
                logger.info('Stale order cancelled in NetSuite - moving to CANCELLED', {
                  orderId: row.order_id,
                  soTranId: row.netsuite_so_tran_id,
                  previousStatus: row.status,
                  soStatus,
                  hoursSinceUpdate: Math.round(hoursSinceUpdate),
                });
                await this.query(
                  `UPDATE orders SET status = 'CANCELLED'::order_status, cancelled_at = NOW(), updated_at = NOW()
                   WHERE order_id = $1`,
                  [row.order_id]
                );
                result.cleaned++;
                result.details.cleaned.push(
                  `${row.netsuite_so_tran_id || soId} (stale->CANCELLED)`
                );
              } else if (row.status === 'PICKED') {
                // PICKED without fulfillment and not cancelled - move back to PENDING for re-sync
                stats.stale.pending++;
                staleOrderActions.movedToPending.push(row.netsuite_so_tran_id || soId);
                logger.warn(
                  'PICKED order has no fulfillment past threshold - moving to PENDING for re-sync',
                  {
                    orderId: row.order_id,
                    soTranId: row.netsuite_so_tran_id,
                    soStatus,
                    hoursSinceUpdate: Math.round(hoursSinceUpdate),
                    hoursSinceCreated: Math.round(hoursSinceCreated),
                    threshold: STALE_ORDER_THRESHOLD_HOURS,
                  }
                );
                await this.updateOrderStatus(row.order_id, 'PENDING');
                result.updated++;
                result.details.updated.push(`${row.netsuite_so_tran_id || soId} (stale->PENDING)`);
              } else if (row.status === 'PACKING') {
                // PACKING without fulfillment - check if we should keep or move
                if (isClosed) {
                  // SO is closed/fulfilled but no IF - might be data sync issue
                  stats.stale.kept++;
                  staleOrderActions.keptInPlace.push(row.netsuite_so_tran_id || soId);
                  logger.warn(
                    'PACKING order: SO is closed/fulfilled but no fulfillment found - keeping status',
                    {
                      orderId: row.order_id,
                      soTranId: row.netsuite_so_tran_id,
                      soStatus,
                      hoursSinceUpdate: Math.round(hoursSinceUpdate),
                      note: 'May need manual investigation',
                    }
                  );
                } else {
                  // SO is still pending - move back to PENDING
                  stats.stale.pending++;
                  staleOrderActions.movedToPending.push(row.netsuite_so_tran_id || soId);
                  logger.info('PACKING order: SO not fulfilled - moving to PENDING', {
                    orderId: row.order_id,
                    soTranId: row.netsuite_so_tran_id,
                    soStatus,
                    hoursSinceUpdate: Math.round(hoursSinceUpdate),
                  });
                  await this.updateOrderStatus(row.order_id, 'PENDING');
                  result.updated++;
                  result.details.updated.push(
                    `${row.netsuite_so_tran_id || soId} (PACKING->PENDING)`
                  );
                }
              }
            }
            await this.markOrderSynced(row.order_id, syncStartTime);
            continue;
          }

          stats.withFulfillment++;
          const latestFulfillment =
            this.selectBestFulfillment(fulfillments) || fulfillments[fulfillments.length - 1];
          const shipStatus = (latestFulfillment.shipStatus || '').toLowerCase();
          let statusChanged = false;

          // Fetch full fulfillment details to get line items for verified_quantity sync
          let fulfillmentWithItems = latestFulfillment;
          if (!latestFulfillment.item && latestFulfillment.id) {
            try {
              fulfillmentWithItems = await this.getItemFulfillmentCached(latestFulfillment.id);
            } catch (error: any) {
              logger.warn('Failed to fetch fulfillment details for item sync', {
                ifId: latestFulfillment.id,
                error: error.message,
              });
            }
          }

          if (shipStatus.includes('shipped') && row.status !== 'SHIPPED') {
            // Fulfillment is shipped - mark as SHIPPED
            await this.updateOrderStatus(row.order_id, 'SHIPPED', {
              ifInternalId: latestFulfillment.id,
              ifTranId: latestFulfillment.tranId,
              items: fulfillmentWithItems.item?.items || [],
            });
            statusChanged = true;
            logger.info(
              'Updated packing queue order to SHIPPED (fulfillment shipped on NetSuite)',
              {
                orderId: row.order_id,
                soTranId: row.netsuite_so_tran_id,
                previousStatus: row.status,
                shipStatus,
                ifTranId: latestFulfillment.tranId,
              }
            );
          } else if (shipStatus.includes('packed') && row.status === 'PICKED') {
            // Fulfillment is packed - mark as PACKED
            await this.updateOrderStatus(row.order_id, 'PACKED', {
              ifInternalId: latestFulfillment.id,
              ifTranId: latestFulfillment.tranId,
              items: fulfillmentWithItems.item?.items || [],
            });
            statusChanged = true;
            logger.info('Updated packing queue order to PACKED (fulfillment packed on NetSuite)', {
              orderId: row.order_id,
              soTranId: row.netsuite_so_tran_id,
              shipStatus,
              ifTranId: latestFulfillment.tranId,
            });
          }

          if (statusChanged) {
            result.updated++;
            result.details.updated.push(row.netsuite_so_tran_id || soId);
          }

          await this.markOrderSynced(row.order_id, syncStartTime);
        }

        // Comprehensive summary logging
        logger.info('Phase 3.5: Packing queue sync complete', {
          stats: {
            total: stats.total,
            withFulfillment: stats.withFulfillment,
            withoutFulfillment: stats.withoutFulfillment,
            warnings: stats.warnings,
          },
          staleActions: {
            movedToPending: stats.stale.pending,
            movedToCancelled: stats.stale.cancelled,
            keptInPlace: stats.stale.kept,
          },
          details: {
            pendingOrders: staleOrderActions.movedToPending.slice(0, 5),
            cancelledOrders: staleOrderActions.movedToCancelled.slice(0, 5),
            warningOrders: staleOrderActions.warnings.slice(0, 5),
          },
        });
      } catch (error: any) {
        logger.error('Phase 3.5: Packing queue sync failed', { error: error.message });
      }

      // ====================================================================
      // PHASE 4: Cleanup truly stale orders (safety net)
      // ====================================================================

      try {
        const cleanedCount = await this.cleanupStaleOrders(syncStartTime);
        result.cleaned += cleanedCount;
      } catch (error: any) {
        logger.error('Phase 4: Cleanup failed', { error: error.message });
      }

      logger.info('NetSuite three-phase sync completed', {
        totalProcessed: result.totalProcessed,
        succeeded: result.succeeded,
        updated: result.updated,
        failed: result.failed,
        skipped: result.skipped,
        cleaned: result.cleaned,
      });

      return result;
    } catch (error: any) {
      logger.error('NetSuite order sync failed', { error: error.message });
      throw error;
    }
  }

  // ========================================================================
  // PHASE 2: UPSERT METHODS
  // ========================================================================

  /**
   * Process a Sales Order: create if new, update status if existing.
   * If a fulfillment exists for this SO, transition to PICKED/SHIPPED.
   */
  private async upsertFromSalesOrder(
    salesOrder: NetSuiteSalesOrder,
    fulfillmentMap: Map<string, any[]>,
    syncStartTime: Date,
    _options: NetSuiteSyncOptions
  ): Promise<{
    created: boolean;
    updated: boolean;
    skipped: boolean;
    reason?: string;
    tranId: string;
  }> {
    const tranId = salesOrder.tranId;
    const soInternalId = salesOrder.id;
    const soTranId = salesOrder.tranId;
    const parentSalesOrder = salesOrder;

    // Check line items
    const lineItems = salesOrder.item?.items || [];
    if (lineItems.length === 0) {
      return { created: false, updated: false, skipped: true, reason: 'No line items', tranId };
    }

    // Only import orders marked "Ready To Ship" (custbody8) — matches NetSuite "Orders to Fulfill" page
    if (!salesOrder.readyToShip) {
      logger.debug('Sales order skipped — readyToShip is false', { tranId });
      return { created: false, updated: false, skipped: true, reason: 'Not ready to ship', tranId };
    }

    // Check if fulfillment exists for this SO
    const fulfillments = fulfillmentMap.get(soInternalId) || [];
    const hasFulfillment = fulfillments.length > 0;
    const latestFulfillment =
      this.selectBestFulfillment(fulfillments) || fulfillments[fulfillments.length - 1];
    const ifInternalId = latestFulfillment?.id || null;
    const shipStatus = (latestFulfillment?.shipStatus || '').toLowerCase();
    const isShipped = hasFulfillment && shipStatus.includes('shipped');
    const isPacked = hasFulfillment && shipStatus.includes('packed');

    logger.info('Processing sales order', {
      tranId,
      soInternalId,
      readyToShip: salesOrder.readyToShip,
      lineCount: lineItems.length,
      hasFulfillment: (fulfillmentMap.get(soInternalId) || []).length > 0,
    });

    // Look up existing WMS order
    const existing =
      (await this.findOrderByNetSuiteSoId(soInternalId)) ||
      (await this.findOrderByExternalIdFull(tranId));

    if (existing) {
      if (soTranId && existing.orderId !== soTranId) {
        const rekeyed = await this.rekeyOrderToSalesOrder(
          existing.orderId,
          soTranId,
          soInternalId || null,
          soTranId,
          ifInternalId || null,
          tranId || null
        );
        if (rekeyed) {
          existing.orderId = soTranId;
        }
      }

      if (parentSalesOrder) {
        const derivedSubtotal = parentSalesOrder.subTotal != null ? parentSalesOrder.subTotal : 0;
        const derivedTotal =
          parentSalesOrder.total != null ? parentSalesOrder.total : derivedSubtotal;
        try {
          await this.query(
            `UPDATE orders
             SET subtotal = CASE WHEN subtotal IS NULL OR subtotal = 0 THEN $1 ELSE subtotal END,
                 total_amount = CASE WHEN total_amount IS NULL OR total_amount = 0 THEN $2 ELSE total_amount END,
                 customer_po_number = COALESCE(customer_po_number, $4),
                 netsuite_order_date = COALESCE(netsuite_order_date, $5)
             WHERE order_id = $3`,
            [
              derivedSubtotal,
              derivedTotal,
              existing.orderId,
              parentSalesOrder.otherRefNum || null,
              parentSalesOrder.tranDate || null,
            ]
          );
        } catch {
          /* safe to ignore */
        }
      }

      await this.syncExistingOrderItemsFromSalesOrder(existing.orderId, lineItems);

      // UPDATE existing order
      let updated = false;

      if (isShipped && !['SHIPPED', 'CANCELLED'].includes(existing.status)) {
        // Fulfillment is shipped — always mark as SHIPPED (NetSuite is source of truth)
        await this.updateOrderStatus(existing.orderId, 'SHIPPED', {
          ifInternalId: latestFulfillment.id,
          ifTranId: latestFulfillment.tranId,
        });
        updated = true;
        logger.info('Updated order to SHIPPED (fulfillment shipped on NetSuite)', {
          orderId: existing.orderId,
          tranId,
        });
      } else if (
        existing.status === 'SHIPPED' &&
        salesOrder.readyToShip &&
        !hasFulfillment &&
        (salesOrder.status?.refName || '').toLowerCase().includes('pending fulfillment')
      ) {
        await this.query(
          `UPDATE orders
           SET status = 'PENDING'::order_status,
               shipped_at = NULL,
               packed_at = NULL,
               picked_at = NULL,
               netsuite_if_internal_id = NULL,
               netsuite_if_tran_id = NULL,
               progress = 0,
               updated_at = NOW()
           WHERE order_id = $1`,
          [existing.orderId]
        );
        updated = true;
        logger.warn(
          'Reverted SHIPPED order to PENDING (SO still pending fulfillment with no fulfillment)',
          {
            orderId: existing.orderId,
            tranId,
            soInternalId,
          }
        );
      } else if (hasFulfillment && existing.status === 'PENDING') {
        // Fulfillment exists — move to PACKED/PICKED based on ship status
        const newStatus = isPacked ? 'PACKED' : 'PICKED';
        await this.updateOrderStatus(existing.orderId, newStatus, {
          ifInternalId: latestFulfillment.id,
          ifTranId: latestFulfillment.tranId,
        });
        updated = true;
        logger.info(`Updated order to ${newStatus} (fulfillment exists on NetSuite)`, {
          orderId: existing.orderId,
          tranId,
        });
      }

      // Always mark as synced
      await this.markOrderSynced(existing.orderId, syncStartTime);

      // Ensure tracking columns are populated (backfill for old orders)
      // Also backfill total_amount from line items if missing
      try {
        await this.query(
          `UPDATE orders SET netsuite_so_internal_id = COALESCE(netsuite_so_internal_id, $1),
                             netsuite_so_tran_id = COALESCE(netsuite_so_tran_id, $2),
                             netsuite_source = 'NETSUITE',
                             customer_po_number = COALESCE(customer_po_number, $4),
                             netsuite_order_date = COALESCE(netsuite_order_date, $5),
                             subtotal = COALESCE(subtotal, (SELECT COALESCE(SUM(line_total), 0) FROM order_items WHERE order_id = $3)),
                             total_amount = COALESCE(total_amount, (SELECT COALESCE(SUM(line_total), 0) FROM order_items WHERE order_id = $3))
           WHERE order_id = $3`,
          [
            soInternalId,
            tranId,
            existing.orderId,
            salesOrder.otherRefNum || null,
            salesOrder.tranDate || null,
          ]
        );
      } catch {
        /* safe to ignore */
      }

      return {
        created: false,
        updated,
        skipped: !updated,
        reason: updated ? undefined : 'No status change needed',
        tranId,
      };
    }

    // CREATE new WMS order
    const targetStatus = isShipped
      ? 'SHIPPED'
      : isPacked
        ? 'PACKED'
        : hasFulfillment
          ? 'PICKED'
          : 'PENDING';
    const order = await this.createWMSOrder(
      salesOrder,
      soInternalId,
      targetStatus,
      syncStartTime,
      hasFulfillment ? latestFulfillment : null
    );

    logger.info('Created WMS order from NetSuite SO', {
      orderId: order.orderId,
      tranId,
      status: targetStatus,
      hasFulfillment,
    });

    return { created: true, updated: false, skipped: false, tranId };
  }

  /**
   * Process an Item Fulfillment that was NOT matched to a current SO.
   * This handles fulfillments whose SO is no longer _pendingFulfillment.
   */
  private async upsertFromFulfillment(
    fulfillment: any,
    syncStartTime: Date,
    _options: NetSuiteSyncOptions
  ): Promise<{
    created: boolean;
    updated: boolean;
    skipped: boolean;
    reason?: string;
    tranId: string;
  }> {
    const tranId = fulfillment.tranId || fulfillment.id;
    const ifInternalId = fulfillment.id;
    const soInternalId = fulfillment.createdFrom?.id;
    const createdFromTranId = fulfillment.createdFrom?.refName
      ? fulfillment.createdFrom.refName.replace(/^.*#/, '').trim()
      : null;
    const shipStatus = (fulfillment.shipStatus || '').toLowerCase();
    const isShipped = shipStatus.includes('shipped');
    const isPacked = shipStatus.includes('packed');

    let soTranId: string | null = null;
    let parentSalesOrder: NetSuiteSalesOrder | null = null;
    soTranId = createdFromTranId;

    const loadParentSalesOrder = async (): Promise<NetSuiteSalesOrder | null> => {
      if (parentSalesOrder || !soInternalId) return parentSalesOrder;
      try {
        const salesOrder = await this.getSalesOrderCached(soInternalId);
        parentSalesOrder = salesOrder;
        soTranId = salesOrder.tranId;
        logger.debug('Fetched parent Sales Order for IF', {
          ifTranId: tranId,
          soInternalId,
          soTranId,
        });
      } catch (error: any) {
        logger.warn('Failed to fetch parent Sales Order for IF', {
          ifTranId: tranId,
          soInternalId,
          error: error.message,
        });
      }
      return parentSalesOrder;
    };

    // Try to find existing WMS order by the parent SO
    let existing: ExistingOrder | null = null;
    if (soInternalId) {
      existing = await this.findOrderByNetSuiteSoId(soInternalId);
    }
    if (!existing) {
      existing = await this.findOrderByNetSuiteIfId(ifInternalId);
    }
    if (!existing) {
      existing = await this.findOrderByExternalIdFull(tranId);
    }
    // Also try SO tranId from createdFrom.refName
    if (!existing && createdFromTranId) {
      existing = await this.findOrderByExternalIdFull(createdFromTranId);
      if (existing) {
        soTranId = createdFromTranId;
      }
    }

    if (existing) {
      if (!soTranId && soInternalId) {
        const salesOrder = await loadParentSalesOrder();
        soTranId = salesOrder?.tranId || soTranId;
      }
      const derivedSubtotal = parentSalesOrder?.subTotal != null ? parentSalesOrder.subTotal : 0;
      const derivedTotal =
        parentSalesOrder?.total != null ? parentSalesOrder.total : derivedSubtotal;

      // Backfill totals if missing/zero
      try {
        await this.query(
          `UPDATE orders
           SET subtotal = CASE WHEN subtotal IS NULL OR subtotal = 0 THEN $1 ELSE subtotal END,
               total_amount = CASE WHEN total_amount IS NULL OR total_amount = 0 THEN $2 ELSE total_amount END,
               customer_po_number = COALESCE(customer_po_number, $4),
               netsuite_order_date = COALESCE(netsuite_order_date, $5)
           WHERE order_id = $3`,
          [
            derivedSubtotal,
            derivedTotal,
            existing.orderId,
            parentSalesOrder?.otherRefNum || null,
            parentSalesOrder?.tranDate || null,
          ]
        );
      } catch {
        /* safe to ignore */
      }

      // UPDATE existing order
      let updated = false;

      if (isShipped && !['SHIPPED', 'CANCELLED'].includes(existing.status)) {
        if (!['PICKING', 'PACKING'].includes(existing.status)) {
          await this.updateOrderStatus(existing.orderId, 'SHIPPED', {
            ifInternalId,
            ifTranId: tranId,
          });
          updated = true;
          logger.info('Updated order to SHIPPED via fulfillment', {
            orderId: existing.orderId,
            tranId,
          });
        }
      } else if (!isShipped && existing.status === 'PENDING') {
        const newStatus = isPacked ? 'PACKED' : 'PICKED';
        await this.updateOrderStatus(existing.orderId, newStatus, {
          ifInternalId,
          ifTranId: tranId,
        });
        updated = true;
        logger.info(`Updated order to ${newStatus} via fulfillment`, {
          orderId: existing.orderId,
          tranId,
        });
      }

      await this.markOrderSynced(existing.orderId, syncStartTime);

      return {
        created: false,
        updated,
        skipped: !updated,
        reason: updated ? undefined : 'No status change needed',
        tranId,
      };
    }

    // CREATE new WMS order from fulfillment (no matching SO found)
    if (isShipped) {
      // Don't create new orders for already-shipped fulfillments
      return {
        created: false,
        updated: false,
        skipped: true,
        reason: 'Already shipped, no existing order',
        tranId,
      };
    }

    let fulfillmentWithItems = fulfillment;
    let lineItems = fulfillmentWithItems.item?.items || fulfillmentWithItems.item || [];
    if (!Array.isArray(lineItems) || lineItems.length === 0) {
      if (fulfillment.id) {
        try {
          fulfillmentWithItems = await this.getItemFulfillmentCached(fulfillment.id);
          lineItems = fulfillmentWithItems.item?.items || fulfillmentWithItems.item || [];
        } catch (error: any) {
          logger.warn('Failed to fetch fulfillment details for line items', {
            ifId: fulfillment.id,
            error: error.message,
          });
        }
      }
    }

    if (!Array.isArray(lineItems) || lineItems.length === 0) {
      // Fall back to parent Sales Order line items if fulfillment has none
      const salesOrder = parentSalesOrder || (await loadParentSalesOrder());
      if (salesOrder && (salesOrder.item?.items || []).length > 0) {
        const shipStatus = (fulfillmentWithItems.shipStatus || '').toLowerCase();
        const targetStatus = shipStatus.includes('shipped')
          ? 'SHIPPED'
          : shipStatus.includes('packed')
            ? 'PACKED'
            : 'PICKED';

        const order = await this.createWMSOrder(
          salesOrder,
          soInternalId || salesOrder.id,
          targetStatus,
          syncStartTime,
          fulfillmentWithItems
        );
        logger.info('Created WMS order from NetSuite fulfillment (SO line items fallback)', {
          orderId: order.orderId,
          tranId,
          soTranId,
        });
        return { created: true, updated: false, skipped: false, tranId };
      }

      return { created: false, updated: false, skipped: true, reason: 'No line items', tranId };
    }

    const order = await this.createWMSOrderFromFulfillment(
      fulfillmentWithItems,
      syncStartTime,
      soTranId
    );
    logger.info('Created WMS order from NetSuite fulfillment (no matching SO)', {
      orderId: order.orderId,
      tranId,
      soTranId,
    });

    return { created: true, updated: false, skipped: false, tranId };
  }

  // ========================================================================
  // PHASE 3: CLEANUP
  // ========================================================================

  /**
   * Cancel stale PENDING orders that are no longer in NetSuite's pending fulfillment queue.
   * Only affects NetSuite-sourced orders, never manual orders.
   * Safety: requires at least 2 minutes since last sync to avoid race conditions.
   */
  private async cleanupStaleOrders(syncStartTime: Date): Promise<number> {
    try {
      // Find NetSuite-sourced orders in active statuses not touched in this sync cycle
      // Safety: must be at least 2 minutes old (2 sync cycles)
      const twoMinutesAgo = new Date(syncStartTime.getTime() - 2 * 60 * 1000);

      const staleResult = await this.query(
        `SELECT order_id, status, netsuite_so_internal_id, netsuite_so_tran_id, netsuite_last_synced_at
         FROM orders
         WHERE netsuite_source = 'NETSUITE'
           AND status IN ('PENDING', 'PICKING', 'PICKED', 'PACKING')
           AND netsuite_last_synced_at IS NOT NULL
           AND netsuite_last_synced_at < $1
           AND netsuite_last_synced_at < $2`,
        [syncStartTime, twoMinutesAgo]
      );

      const staleOrders = staleResult.rows || [];
      if (staleOrders.length === 0) return 0;

      logger.info('Phase 4: Found stale orders in active statuses to clean up', {
        count: staleOrders.length,
        byStatus: {
          PENDING: staleOrders.filter((o: any) => o.status === 'PENDING').length,
          PICKING: staleOrders.filter((o: any) => o.status === 'PICKING').length,
          PICKED: staleOrders.filter((o: any) => o.status === 'PICKED').length,
          PACKING: staleOrders.filter((o: any) => o.status === 'PACKING').length,
        },
        orderIds: staleOrders.map((o: any) => o.order_id).slice(0, 10),
      });

      let cleaned = 0;
      for (const order of staleOrders) {
        try {
          // For PENDING orders, mark as CANCELLED (order was never started)
          // For PICKING/PICKED/PACKING orders, check NetSuite for actual status first
          if (order.status === 'PENDING') {
            await this.query(
              `UPDATE orders
               SET status = 'CANCELLED'::order_status,
                   cancelled_at = NOW(),
                   updated_at = NOW()
               WHERE order_id = $1 AND status = 'PENDING'`,
              [order.order_id]
            );
          } else if (order.netsuite_so_internal_id) {
            // For active warehouse orders, check NetSuite for fulfillment status
            try {
              const soDetail = await this.getSalesOrderCached(order.netsuite_so_internal_id);
              const soStatus = (soDetail.status?.refName || '').toLowerCase();

              if (soStatus.includes('cancelled')) {
                // SO was cancelled
                await this.query(
                  `UPDATE orders SET status = 'CANCELLED'::order_status, cancelled_at = NOW(), updated_at = NOW()
                   WHERE order_id = $1`,
                  [order.order_id]
                );
              } else if (
                soStatus.includes('billed') ||
                soStatus.includes('closed') ||
                soStatus.includes('pending billing') ||
                soStatus.includes('fulfilled') ||
                soStatus.includes('partially fulfilled')
              ) {
                // SO was fulfilled - mark as SHIPPED (skipped warehouse)
                await this.query(
                  `UPDATE orders SET status = 'SHIPPED'::order_status, shipped_at = NOW(), updated_at = NOW()
                   WHERE order_id = $1`,
                  [order.order_id]
                );
              } else if (
                soStatus.includes('pending fulfillment') ||
                soStatus.includes('pending approval') ||
                soStatus.includes('approved')
              ) {
                // Still active in NetSuite - reset sync time and keep in queue
                logger.info('Stale order still active in NetSuite - keeping in queue', {
                  orderId: order.order_id,
                  soTranId: order.netsuite_so_tran_id,
                  soStatus,
                });
                await this.query(
                  `UPDATE orders SET netsuite_last_synced_at = NOW(), updated_at = NOW() WHERE order_id = $1`,
                  [order.order_id]
                );
                continue;
              } else {
                // Unknown status for 2+ minutes - treat as cancelled to prevent queue clogging
                logger.warn('Cleaning up stale order with unknown NetSuite status', {
                  orderId: order.order_id,
                  soTranId: order.netsuite_so_tran_id,
                  soStatus,
                  action: 'CANCELLING',
                });
                await this.query(
                  `UPDATE orders SET status = 'CANCELLED'::order_status, cancelled_at = NOW(), updated_at = NOW()
                   WHERE order_id = $1`,
                  [order.order_id]
                );
              }
            } catch (error: any) {
              // Failed to check NetSuite for 2+ minutes - cancel to prevent queue clogging
              // This is aggressive but prevents infinite stale order buildup
              logger.warn('Cancelling stale order - NetSuite check repeatedly failed', {
                orderId: order.order_id,
                soTranId: order.netsuite_so_tran_id,
                error: error.message,
                action: 'CANCELLING',
              });
              await this.query(
                `UPDATE orders SET status = 'CANCELLED'::order_status, cancelled_at = NOW(), updated_at = NOW()
                 WHERE order_id = $1`,
                [order.order_id]
              );
            }
          } else {
            // No SO internal ID - skip
            continue;
          }

          cleaned++;
          logger.info('Cleaned up stale order', {
            orderId: order.order_id,
            soTranId: order.netsuite_so_tran_id,
            previousStatus: order.status,
            lastSynced: order.netsuite_last_synced_at,
          });
        } catch (error: any) {
          logger.warn('Failed to clean up stale order', {
            orderId: order.order_id,
            error: error.message,
          });
        }
      }

      return cleaned;
    } catch (error: any) {
      logger.error('Stale order cleanup failed', { error: error.message });
      return 0;
    }
  }

  // ========================================================================
  // ORDER LOOKUP (NEW — by NetSuite tracking columns)
  // ========================================================================

  /**
   * Find WMS order by NetSuite Sales Order internal ID
   */
  private async findOrderByNetSuiteSoId(soInternalId: string): Promise<ExistingOrder | null> {
    if (this.orderLookupBySoIdCache.has(soInternalId)) {
      return this.orderLookupBySoIdCache.get(soInternalId) || null;
    }

    try {
      const result = await this.query(
        `SELECT order_id, status, netsuite_if_internal_id
         FROM orders WHERE netsuite_so_internal_id = $1`,
        [soInternalId]
      );
      if (result.rows.length > 0) {
        const row = result.rows[0];
        const existing = {
          orderId: row.order_id,
          status: row.status,
          netsuiteIfInternalId: row.netsuite_if_internal_id,
        };
        this.orderLookupBySoIdCache.set(soInternalId, existing);
        return existing;
      }
    } catch {
      /* column may not exist yet */
    }
    this.orderLookupBySoIdCache.set(soInternalId, null);
    return null;
  }

  /**
   * Find WMS order by NetSuite Item Fulfillment internal ID
   */
  private async findOrderByNetSuiteIfId(ifInternalId: string): Promise<ExistingOrder | null> {
    if (this.orderLookupByIfIdCache.has(ifInternalId)) {
      return this.orderLookupByIfIdCache.get(ifInternalId) || null;
    }

    try {
      const result = await this.query(
        `SELECT order_id, status, netsuite_if_internal_id
         FROM orders WHERE netsuite_if_internal_id = $1`,
        [ifInternalId]
      );
      if (result.rows.length > 0) {
        const row = result.rows[0];
        const existing = {
          orderId: row.order_id,
          status: row.status,
          netsuiteIfInternalId: row.netsuite_if_internal_id,
        };
        this.orderLookupByIfIdCache.set(ifInternalId, existing);
        return existing;
      }
    } catch {
      /* column may not exist yet */
    }
    this.orderLookupByIfIdCache.set(ifInternalId, null);
    return null;
  }

  /**
   * Find WMS order by external ID (customer_email, customer_reference, order_external_refs)
   * Returns full order info including status.
   */
  private async findOrderByExternalIdFull(externalOrderId: string): Promise<ExistingOrder | null> {
    if (this.orderLookupByExternalIdCache.has(externalOrderId)) {
      return this.orderLookupByExternalIdCache.get(externalOrderId) || null;
    }

    // Check customer_email field
    const result = await this.query(
      `SELECT order_id, status, netsuite_if_internal_id
       FROM orders WHERE customer_email = $1`,
      [`netsuite:${externalOrderId}`]
    );
    if (result.rows.length > 0) {
      const row = result.rows[0];
      const existing = {
        orderId: row.order_id,
        status: row.status,
        netsuiteIfInternalId: row.netsuite_if_internal_id || null,
      };
      this.orderLookupByExternalIdCache.set(externalOrderId, existing);
      return existing;
    }

    // Check customer_reference
    try {
      const refResult = await this.query(
        `SELECT order_id, status, netsuite_if_internal_id
         FROM orders WHERE customer_reference = $1`,
        [externalOrderId]
      );
      if (refResult.rows.length > 0) {
        const row = refResult.rows[0];
        const existing = {
          orderId: row.order_id,
          status: row.status,
          netsuiteIfInternalId: row.netsuite_if_internal_id || null,
        };
        this.orderLookupByExternalIdCache.set(externalOrderId, existing);
        return existing;
      }
    } catch {
      /* column may not exist */
    }

    // Check order_external_refs
    try {
      const extResult = await this.query(
        `SELECT o.order_id, o.status, o.netsuite_if_internal_id
         FROM order_external_refs r
         JOIN orders o ON o.order_id = r.order_id
         WHERE r.external_order_id = $1`,
        [externalOrderId]
      );
      if (extResult.rows.length > 0) {
        const row = extResult.rows[0];
        const existing = {
          orderId: row.order_id,
          status: row.status,
          netsuiteIfInternalId: row.netsuite_if_internal_id || null,
        };
        this.orderLookupByExternalIdCache.set(externalOrderId, existing);
        return existing;
      }
    } catch {
      /* table may not exist */
    }

    this.orderLookupByExternalIdCache.set(externalOrderId, null);
    return null;
  }

  // ========================================================================
  // STATUS UPDATE HELPERS
  // ========================================================================

  /**
   * Update WMS order status from NetSuite sync.
   * Bypasses OrderRepository.updateStatus validation intentionally —
   * NetSuite is the source of truth and may skip intermediate states.
   */
  private async updateOrderStatus(
    orderId: string,
    newStatus: string,
    ifData?: { ifInternalId: string; ifTranId: string; items?: any[] }
  ): Promise<void> {
    const updates: string[] = [`status = '${newStatus}'::order_status`, 'updated_at = NOW()'];

    if (newStatus === 'PICKED') {
      updates.push('picked_at = COALESCE(picked_at, NOW())');
      updates.push('progress = 100');
    } else if (newStatus === 'PACKED') {
      updates.push('packed_at = COALESCE(packed_at, NOW())');
      updates.push('progress = 100');
    } else if (newStatus === 'SHIPPED') {
      updates.push('shipped_at = COALESCE(shipped_at, NOW())');
      updates.push('picked_at = COALESCE(picked_at, NOW())');
      updates.push('packed_at = COALESCE(packed_at, NOW())');
      updates.push('progress = 100');
    }

    if (ifData) {
      updates.push(`netsuite_if_internal_id = '${ifData.ifInternalId}'`);
      updates.push(`netsuite_if_tran_id = '${ifData.ifTranId}'`);
    }

    await this.query(`UPDATE orders SET ${updates.join(', ')} WHERE order_id = $1`, [orderId]);
    this.invalidateOrderLookupCaches();

    // Sync verified_quantity from fulfillment items when moving to PICKED/PACKED/SHIPPED
    if (
      ifData?.items &&
      ifData.items.length > 0 &&
      ['PICKED', 'PACKED', 'SHIPPED'].includes(newStatus)
    ) {
      for (const fulfillmentItem of ifData.items) {
        const sku = fulfillmentItem.item?.refName || fulfillmentItem.itemName;
        if (!sku) continue;

        const fulfilledQty = fulfillmentItem.quantity || 0;
        if (fulfilledQty <= 0) continue;

        try {
          await this.query(
            `UPDATE order_items
             SET verified_quantity = $1,
                 status = 'FULLY_PICKED'::order_item_status
             WHERE order_id = $2 AND sku = $3`,
            [fulfilledQty, orderId, sku]
          );
        } catch (error: any) {
          logger.warn('Failed to sync verified_quantity for item', {
            orderId,
            sku,
            fulfilledQty,
            error: error.message,
          });
        }
      }
      logger.debug('Synced verified_quantity from NetSuite fulfillment', {
        orderId,
        itemCount: ifData.items.length,
        newStatus,
      });
    }
  }

  /**
   * Mark an order as synced in this cycle
   */
  private async markOrderSynced(orderId: string, syncStartTime: Date): Promise<void> {
    try {
      await this.query(`UPDATE orders SET netsuite_last_synced_at = $1 WHERE order_id = $2`, [
        syncStartTime,
        orderId,
      ]);
    } catch {
      /* safe to ignore */
    }
  }

  /**
   * Build a map of SO internal ID → fulfillment details
   */
  private buildFulfillmentMap(fulfillments: any[]): Map<string, any[]> {
    const map = new Map<string, any[]>();
    for (const f of fulfillments) {
      const soId = f.createdFrom?.id;
      if (!soId) continue;
      const existing = map.get(soId) || [];
      existing.push(f);
      map.set(soId, existing);
    }
    return map;
  }

  // ========================================================================
  // ORDER CREATION (updated with tracking columns)
  // ========================================================================

  /**
   * Create a WMS order from a NetSuite sales order.
   * Sets NetSuite tracking columns for future sync updates.
   */
  private async createWMSOrder(
    salesOrder: NetSuiteSalesOrder,
    soInternalId: string,
    targetStatus: string,
    syncStartTime: Date,
    fulfillment?: any
  ) {
    const lineItems = salesOrder.item?.items || [];
    const orderId = salesOrder.tranId; // Use NetSuite SO number as order_id
    const priority = this.calculatePriority(salesOrder.shipDate);

    // Calculate order total from line items (fallback to NetSuite totals if missing)
    let subtotal = lineItems.reduce((sum, line) => {
      return sum + (line.amount || (line.rate || 0) * (line.quantity || 1));
    }, 0);
    if ((subtotal === 0 || Number.isNaN(subtotal)) && salesOrder.subTotal != null) {
      subtotal = salesOrder.subTotal;
    }
    const totalAmount =
      salesOrder.total != null
        ? salesOrder.total
        : salesOrder.subTotal != null
          ? salesOrder.subTotal
          : subtotal;

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

    await this.query(
      `INSERT INTO orders (
        order_id, customer_id, customer_name, priority, status, progress,
        shipping_address, customer_email, organization_id, customer_po_number, netsuite_order_date,
        subtotal, total_amount,
        netsuite_so_internal_id, netsuite_so_tran_id,
        netsuite_if_internal_id, netsuite_if_tran_id,
        netsuite_source, netsuite_last_synced_at,
        picked_at, shipped_at, packed_at,
        created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5::order_status, $6, $7, $8, $9, $10, $11,
        $12, $13,
        $14, $15, $16, $17,
        'NETSUITE', $18,
        $19, $20, $21,
        NOW(), NOW()
      )`,
      [
        orderId,
        salesOrder.entity?.id || 'NETSUITE',
        salesOrder.entity?.refName || 'Unknown Customer',
        priority,
        targetStatus,
        targetStatus === 'PENDING' ? 0 : 100,
        shippingAddress ? JSON.stringify(shippingAddress) : null,
        `netsuite:${salesOrder.tranId}`,
        this.organizationId,
        salesOrder.otherRefNum || null,
        salesOrder.tranDate || null,
        subtotal,
        totalAmount,
        soInternalId,
        salesOrder.tranId,
        fulfillment?.id || null,
        fulfillment?.tranId || null,
        syncStartTime,
        targetStatus !== 'PENDING' ? new Date() : null, // picked_at
        targetStatus === 'SHIPPED' ? new Date() : null, // shipped_at
        targetStatus === 'SHIPPED' ? new Date() : null, // packed_at
      ]
    );
    this.invalidateOrderLookupCaches();

    // Insert line items
    for (let i = 0; i < lineItems.length; i++) {
      const line = lineItems[i];
      const sku = await this.findSkuByNetSuiteItem(line.item?.id, line.item?.refName);
      const skuCode = sku || line.item?.refName || line.item?.id || `NS-${i}`;

      const itemDetails = await this.getItemDetails(line.item?.id);
      const rawName = itemDetails?.displayName || line.item?.refName || skuCode;
      const itemName = decodeHtmlEntities(rawName);
      const barcode = itemDetails?.upcCode || undefined;
      const nsBin = itemDetails?.binNumber || undefined;

      await this.ensureSku(skuCode, itemName, barcode, nsBin);

      const skuResult = await this.query(
        `SELECT bin_locations[1] as bin_location FROM skus WHERE sku = $1 AND active = true`,
        [skuCode]
      );
      const binLocation = skuResult.rows[0]?.bin_location || 'UNASSIGNED';

      // Use quantityCommitted if available (what's actually reserved), fallback to quantity
      const itemQuantity = line.quantityCommitted || line.quantity || 1;

      await this.query(
        `INSERT INTO order_items (
          order_item_id, order_id, sku, name, quantity, bin_location, status,
          unit_price, line_total, currency, netsuite_available_quantity
        ) VALUES ($1, $2, $3, $4, $5, $6, 'PENDING', $7, $8, 'NZD', $9)`,
        [
          `OI-${orderId}-${i}`,
          orderId,
          skuCode,
          itemName,
          itemQuantity,
          binLocation,
          line.rate || 0,
          line.amount || (line.rate || 0) * itemQuantity,
          line.quantityAvailable ?? null,
        ]
      );
    }

    // Store external reference (legacy compat)
    await this.storeExternalOrderId(orderId, fulfillment.tranId || fulfillment.id, fulfillment.id);

    return { orderId };
  }

  /**
   * Create a WMS order from a NetSuite item fulfillment (when no SO match found).
   * Sets tracking columns so future syncs can link it.
   */
  private async createWMSOrderFromFulfillment(
    fulfillment: any,
    syncStartTime: Date,
    soTranId?: string | null
  ) {
    const lineItems = fulfillment.item?.items || fulfillment.item || [];
    const tranId = fulfillment.tranId || fulfillment.id;
    const orderId = soTranId || tranId; // Use parent SO number as order_id, fallback to fulfillment tranId
    const priority = this.calculatePriority(fulfillment.shipDate);

    const shipStatus = (fulfillment.shipStatus || '').toLowerCase();
    let wmsStatus = 'PICKED';
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
        shipping_address, customer_email, organization_id, netsuite_order_date,
        netsuite_so_internal_id, netsuite_so_tran_id, netsuite_if_internal_id, netsuite_if_tran_id,
        netsuite_source, netsuite_last_synced_at,
        picked_at, shipped_at, packed_at,
        created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5::order_status, 0, $6, $7, $8, $9,
        $10, $11, $12, $13,
        'NETSUITE', $14,
        $15, $16, $17,
        NOW(), NOW()
      )`,
      [
        orderId,
        fulfillment.entity?.id || fulfillment.createdFrom?.id || 'NETSUITE',
        fulfillment.entity?.refName || fulfillment.createdFrom?.refName || 'NetSuite Order',
        priority,
        wmsStatus,
        shippingAddress ? JSON.stringify(shippingAddress) : null,
        `netsuite:${tranId}`,
        this.organizationId,
        null,
        fulfillment.createdFrom?.id || null, // SO internal ID
        soTranId || null, // SO tran ID (fetched from parent SO)
        fulfillment.id, // IF internal ID
        tranId, // IF tranId
        syncStartTime,
        new Date(), // picked_at (fulfillments are picked)
        wmsStatus === 'SHIPPED' ? new Date() : null,
        wmsStatus === 'PACKED' || wmsStatus === 'SHIPPED' ? new Date() : null,
      ]
    );
    this.invalidateOrderLookupCaches();

    for (let i = 0; i < lineItems.length; i++) {
      const line = lineItems[i];
      const sku = await this.findSkuByNetSuiteItem(
        line.item?.id,
        line.item?.refName || line.itemName
      );
      const skuCode = sku || line.item?.refName || line.itemName || `NS-${i}`;

      const itemDetails = await this.getItemDetails(line.item?.id);
      const rawName = itemDetails?.displayName || line.item?.refName || line.itemName || skuCode;
      const itemName = decodeHtmlEntities(rawName);
      const barcode = itemDetails?.upcCode || undefined;
      const nsBin = itemDetails?.binNumber || undefined;

      await this.ensureSku(skuCode, itemName, barcode, nsBin);

      const skuResult = await this.query(
        `SELECT bin_locations[1] as bin_location FROM skus WHERE sku = $1 AND active = true`,
        [skuCode]
      );
      const binLocation = skuResult.rows[0]?.bin_location || 'UNASSIGNED';

      await this.query(
        `INSERT INTO order_items (
          order_item_id, order_id, sku, name, quantity, bin_location, status,
          unit_price, line_total, currency, netsuite_available_quantity
        ) VALUES ($1, $2, $3, $4, $5, $6, 'PENDING', $7, $8, 'NZD', $9)`,
        [
          `OI-${orderId}-${i}`,
          orderId,
          skuCode,
          itemName,
          line.quantity || 1,
          binLocation,
          line.rate || 0,
          line.amount || (line.rate || 0) * (line.quantity || 1),
          line.quantityAvailable ?? null,
        ]
      );
    }

    await this.storeExternalOrderId(orderId, tranId, fulfillment.id);
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
   * Fetch item details (barcode, bin, display name) from NetSuite with caching
   */
  private async getItemDetails(itemId: string): Promise<NetSuiteItemDetails | null> {
    if (!itemId) return null;
    if (this.itemCache.has(itemId)) return this.itemCache.get(itemId)!;

    try {
      const item = await this.client.getInventoryItem(itemId);
      const details: NetSuiteItemDetails = {
        itemId: item.itemId,
        displayName: item.displayName,
        upcCode: item.upcCode,
        binNumber: item.binNumber,
      };
      this.itemCache.set(itemId, details);
      return details;
    } catch (error: any) {
      logger.warn('Failed to fetch NetSuite item details', { itemId, error: error.message });
      return null;
    }
  }

  /**
   * Find WMS SKU by NetSuite item ID or name
   */
  private async findSkuByNetSuiteItem(
    netSuiteItemId?: string,
    netSuiteItemName?: string
  ): Promise<string | null> {
    if (netSuiteItemId) {
      const result = await this.query(
        `SELECT sku FROM skus WHERE (sku = $1 OR barcode = $1) AND active = true`,
        [netSuiteItemId]
      );
      if (result.rows.length > 0) {
        return result.rows[0].sku;
      }
    }

    if (netSuiteItemName) {
      const result = await this.query(
        `SELECT sku FROM skus WHERE (name ILIKE $1 OR sku ILIKE $1) AND active = true`,
        [netSuiteItemName]
      );
      if (result.rows.length > 0) {
        return result.rows[0].sku;
      }
    }

    return netSuiteItemName || netSuiteItemId || null;
  }

  /**
   * Ensure a SKU exists in the WMS catalog. Creates it if missing.
   */
  private async ensureSku(
    skuCode: string,
    itemName: string,
    barcode?: string,
    binLocation?: string
  ): Promise<void> {
    const cleanName = decodeHtmlEntities(itemName);
    const bin = binLocation || 'UNASSIGNED';
    const result = await this.query(`SELECT sku FROM skus WHERE sku = $1`, [skuCode]);

    if (result.rows.length > 0) {
      if (barcode || binLocation) {
        const updates: string[] = [];
        const params: any[] = [];
        let idx = 1;

        if (barcode) {
          updates.push(`barcode = COALESCE(NULLIF(barcode, ''), $${idx})`);
          params.push(barcode);
          idx++;
        }
        if (binLocation) {
          updates.push(
            `bin_locations = CASE WHEN bin_locations = ARRAY['UNASSIGNED']::varchar[] THEN ARRAY[$${idx}]::varchar[] ELSE bin_locations END`
          );
          params.push(binLocation);
          idx++;
        }

        if (updates.length > 0) {
          params.push(skuCode);
          await this.query(
            `UPDATE skus SET ${updates.join(', ')}, updated_at = NOW() WHERE sku = $${idx}`,
            params
          );
        }
      }
      return;
    }

    await this.query(
      `INSERT INTO skus (sku, name, barcode, category, active, bin_locations, organization_id, created_at, updated_at)
       VALUES ($1, $2, $3, 'NETSUITE', true, ARRAY[$4]::varchar[], $5, NOW(), NOW())
       ON CONFLICT (sku) DO NOTHING`,
      [skuCode, cleanName, barcode || null, bin, this.organizationId]
    );
    logger.info('Auto-created SKU from NetSuite item', {
      sku: skuCode,
      name: cleanName,
      barcode,
      bin,
    });
  }

  private async syncExistingOrderItemsFromSalesOrder(
    orderId: string,
    lineItems: NetSuiteSalesOrderLine[]
  ): Promise<void> {
    for (const line of lineItems) {
      const sku = await this.findSkuByNetSuiteItem(line.item?.id, line.item?.refName);
      const skuCode = sku || line.item?.refName || line.item?.id;
      if (!skuCode) continue;

      const itemDetails = await this.getItemDetails(line.item?.id);
      const rawName = itemDetails?.displayName || line.item?.refName || skuCode;
      const itemName = decodeHtmlEntities(rawName);
      const barcode = itemDetails?.upcCode || undefined;
      const nsBin = itemDetails?.binNumber || undefined;

      await this.ensureSku(skuCode, itemName, barcode, nsBin);

      const skuResult = await this.query(
        `SELECT bin_locations[1] as bin_location FROM skus WHERE sku = $1 AND active = true`,
        [skuCode]
      );
      const binLocation = skuResult.rows[0]?.bin_location || 'UNASSIGNED';

      await this.query(
        `UPDATE order_items
         SET name = COALESCE(NULLIF(name, ''), $1::varchar),
             netsuite_available_quantity = $2::numeric,
             bin_location = CASE
               WHEN (bin_location IS NULL OR bin_location = '' OR bin_location = 'UNASSIGNED')
                    AND $3::varchar IS NOT NULL AND $3::varchar <> '' THEN $3::varchar
               ELSE bin_location
             END
         WHERE order_id = $4
           AND sku = $5`,
        [itemName, line.quantityAvailable ?? null, binLocation, orderId, skuCode]
      );

      await this.query(
        `UPDATE pick_tasks
         SET name = COALESCE(NULLIF(name, ''), $1::varchar),
             target_bin = CASE
               WHEN (target_bin IS NULL OR target_bin = '' OR target_bin = 'UNASSIGNED')
                    AND $2::varchar IS NOT NULL AND $2::varchar <> '' THEN $2::varchar
               ELSE target_bin
             END
         WHERE order_id = $3
           AND sku = $4`,
        [itemName, binLocation, orderId, skuCode]
      );
    }
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
  // ORDER LOOKUP (LEGACY)
  // ========================================================================

  /**
   * Find an existing order by external (NetSuite) order ID — returns order_id only.
   * Kept for backward compatibility with preview/other consumers.
   */
  private async findOrderByExternalId(externalOrderId: string): Promise<string | null> {
    const existing = await this.findOrderByExternalIdFull(externalOrderId);
    return existing?.orderId || null;
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
      await this.query(`UPDATE orders SET customer_reference = $1 WHERE order_id = $2`, [
        tranId,
        orderId,
      ]);
    } catch {
      // Column might not exist in tenant DB
    }

    try {
      await this.query(
        `INSERT INTO order_external_refs (order_id, external_order_id, external_system, external_data)
         VALUES ($1, $2, 'NETSUITE', $3)
         ON CONFLICT (order_id, external_system) DO UPDATE SET external_order_id = $2, external_data = $3`,
        [orderId, tranId, JSON.stringify({ netSuiteId, tranId })]
      );
    } catch {
      // Table might not exist in tenant DB
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
        const salesOrder = await this.getSalesOrderCached(item.id);
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

    const existingOrder = await this.findOrderByExternalId(salesOrder.tranId);
    if (existingOrder) {
      issues.push('Order already imported');
      canImport = false;
    }

    const lineItems = salesOrder.item?.items || [];
    if (lineItems.length === 0) {
      issues.push('No line items');
      canImport = false;
    }

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

  // ========================================================================
  // SYNC RECONCILIATION
  // ========================================================================

  /**
   * Reconcile WMS orders with NetSuite to clean up stale data.
   * This method performs a full check of all PENDING orders against NetSuite.
   */
  async reconcileOrders(_integrationId: string): Promise<{
    checked: number;
    cancelled: number;
    updated: number;
    errors: Array<{ orderId: string; error: string }>;
  }> {
    // Look up the organization this integration belongs to
    const orgResult = await sharedQuery(
      `SELECT io.organization_id, o.database_name
       FROM integration_organizations io
       JOIN organizations o ON o.organization_id = io.organization_id
       WHERE io.integration_id = $1 LIMIT 1`,
      [_integrationId]
    );
    this.organizationId = orgResult.rows[0]?.organizationId || null;
    const databaseName = orgResult.rows[0]?.databaseName || null;

    if (databaseName) {
      this.tenantPool = tenantPoolManager.getPool(databaseName);
    } else {
      this.tenantPool = null;
    }

    await this.ensureSchemaColumns();

    const result = {
      checked: 0,
      cancelled: 0,
      updated: 0,
      errors: [] as Array<{ orderId: string; error: string }>,
    };

    try {
      // Get all PENDING orders sourced from NetSuite
      const pendingOrders = await this.query(
        `SELECT order_id, netsuite_so_internal_id, netsuite_so_tran_id, netsuite_last_synced_at
         FROM orders
         WHERE netsuite_source = 'NETSUITE'
           AND status = 'PENDING'
           AND netsuite_so_internal_id IS NOT NULL`
      );

      logger.info('Starting order reconciliation', {
        integrationId: _integrationId,
        pendingCount: pendingOrders.rows.length,
      });

      // Fetch current pending fulfillment orders from NetSuite
      const soResponse = await this.client.getSalesOrders({
        status: '_pendingFulfillment',
      });

      const netSuitePendingIds = new Set<string>();
      for (const so of soResponse.items || []) {
        if ((so as any).readyToShip) {
          netSuitePendingIds.add((so as any).id);
        }
      }

      logger.info('Fetched NetSuite pending orders for reconciliation', {
        netSuiteCount: netSuitePendingIds.size,
      });

      // Check each PENDING WMS order
      for (const order of pendingOrders.rows) {
        result.checked++;
        const soId = order.netsuite_so_internal_id;

        try {
          if (netSuitePendingIds.has(soId)) {
            // Order is still pending in NetSuite - mark as synced
            await this.markOrderSynced(order.order_id, new Date());
          } else {
            // Order not in NetSuite pending queue - check actual status
            const soDetail = await this.getSalesOrderCached(soId);
            const nsStatus = (soDetail.status?.refName || '').toLowerCase();

            if (nsStatus.includes('cancelled')) {
              await this.query(
                `UPDATE orders SET status = 'CANCELLED'::order_status, cancelled_at = NOW(), updated_at = NOW() WHERE order_id = $1`,
                [order.order_id]
              );
              result.cancelled++;
              logger.info('Reconciled: cancelled order', {
                orderId: order.order_id,
                soTranId: order.netsuite_so_tran_id,
                nsStatus,
              });
            } else if (
              nsStatus.includes('billed') ||
              nsStatus.includes('fulfilled') ||
              nsStatus.includes('pending billing')
            ) {
              await this.query(
                `UPDATE orders SET status = 'PICKED'::order_status, picked_at = COALESCE(picked_at, NOW()), progress = 100, updated_at = NOW() WHERE order_id = $1`,
                [order.order_id]
              );
              result.updated++;
              logger.info('Reconciled: updated order to PICKED', {
                orderId: order.order_id,
                soTranId: order.netsuite_so_tran_id,
                nsStatus,
              });
            } else {
              // Unknown status - keep and mark synced
              await this.markOrderSynced(order.order_id, new Date());
              logger.debug('Reconciled: keeping order (unknown NetSuite status)', {
                orderId: order.order_id,
                soTranId: order.netsuite_so_tran_id,
                nsStatus,
              });
            }
          }
        } catch (error: any) {
          result.errors.push({
            orderId: order.order_id,
            error: error.message,
          });
          logger.warn('Reconciliation failed for order', {
            orderId: order.order_id,
            soId,
            error: error.message,
          });
        }
      }

      logger.info('Order reconciliation complete', {
        integrationId: _integrationId,
        checked: result.checked,
        cancelled: result.cancelled,
        updated: result.updated,
        errors: result.errors.length,
      });

      return result;
    } catch (error: any) {
      logger.error('Order reconciliation failed', {
        integrationId: _integrationId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Get sync status report for all NetSuite-sourced orders
   */
  async getSyncReport(): Promise<{
    totalOrders: number;
    byStatus: Record<string, number>;
    staleOrders: number;
    neverSynced: number;
    recentlySynced: number;
  }> {
    await this.ensureSchemaColumns();

    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

    const stats = await this.query(
      `
      SELECT 
        status,
        COUNT(*) as count,
        COUNT(*) FILTER (WHERE netsuite_last_synced_at IS NULL) as never_synced,
        COUNT(*) FILTER (WHERE netsuite_last_synced_at < $1) as stale,
        COUNT(*) FILTER (WHERE netsuite_last_synced_at >= $1) as recent
      FROM orders
      WHERE netsuite_source = 'NETSUITE' OR customer_email LIKE 'netsuite:%'
      GROUP BY status
    `,
      [fiveMinutesAgo]
    );

    const report = {
      totalOrders: 0,
      byStatus: {} as Record<string, number>,
      staleOrders: 0,
      neverSynced: 0,
      recentlySynced: 0,
    };

    for (const row of stats.rows) {
      report.totalOrders += parseInt(row.count, 10);
      report.byStatus[row.status] = parseInt(row.count, 10);
      report.neverSynced += parseInt(row.neverSynced, 10);
      report.staleOrders += parseInt(row.stale, 10);
      report.recentlySynced += parseInt(row.recent, 10);
    }

    return report;
  }

  // ========================================================================
  // SINGLE ORDER/FULFILLMENT SYNC (for webhooks)
  // ========================================================================

  /**
   * Sync a single sales order from NetSuite (for webhook-triggered syncs)
   */
  async syncSingleOrder(
    salesOrder: NetSuiteSalesOrder,
    integrationId: string
  ): Promise<{ created: boolean; updated: boolean; orderId?: string; error?: string }> {
    // Set up tenant context
    const orgResult = await sharedQuery(
      `SELECT io.organization_id, o.database_name
       FROM integration_organizations io
       JOIN organizations o ON o.organization_id = io.organization_id
       WHERE io.integration_id = $1 LIMIT 1`,
      [integrationId]
    );
    this.organizationId = orgResult.rows[0]?.organizationId || null;
    const databaseName = orgResult.rows[0]?.databaseName || null;

    if (databaseName) {
      this.tenantPool = tenantPoolManager.getPool(databaseName);
    }

    await this.ensureSchemaColumns();

    const syncStartTime = new Date();
    const fulfillmentMap = new Map<string, any[]>();

    try {
      return await this.upsertFromSalesOrder(salesOrder, fulfillmentMap, syncStartTime, {});
    } catch (error: any) {
      logger.error('Failed to sync single order', {
        tranId: salesOrder.tranId,
        error: error.message,
      });
      return { created: false, updated: false, error: error.message };
    }
  }

  /**
   * Sync a single fulfillment from NetSuite (for webhook-triggered syncs)
   */
  async syncSingleFulfillment(
    fulfillment: any,
    integrationId: string
  ): Promise<{ updated: boolean; orderId?: string; error?: string }> {
    // Set up tenant context
    const orgResult = await sharedQuery(
      `SELECT io.organization_id, o.database_name
       FROM integration_organizations io
       JOIN organizations o ON o.organization_id = io.organization_id
       WHERE io.integration_id = $1 LIMIT 1`,
      [integrationId]
    );
    this.organizationId = orgResult.rows[0]?.organizationId || null;
    const databaseName = orgResult.rows[0]?.databaseName || null;

    if (databaseName) {
      this.tenantPool = tenantPoolManager.getPool(databaseName);
    }

    await this.ensureSchemaColumns();

    const syncStartTime = new Date();
    const soId = fulfillment.createdFrom?.id;

    if (!soId) {
      return { updated: false, error: 'No sales order ID in fulfillment' };
    }

    try {
      // Find the WMS order
      const existing = await this.findOrderByNetSuiteSoId(soId);

      if (!existing) {
        // Try to fetch the parent SO and create the order
        try {
          const so = await this.getSalesOrderCached(soId);
          const soTranId = so.tranId;

          // Create order from fulfillment
          const result = await this.createWMSOrderFromFulfillment(
            fulfillment,
            syncStartTime,
            soTranId
          );
          return { updated: true, orderId: result.orderId };
        } catch (soError: any) {
          return { updated: false, error: `Parent SO not found: ${soError.message}` };
        }
      }

      // Update existing order
      const shipStatus = (fulfillment.shipStatus || '').toLowerCase();
      let newStatus = 'PICKED';

      if (shipStatus.includes('shipped')) {
        newStatus = 'SHIPPED';
      } else if (shipStatus.includes('packed')) {
        newStatus = 'PACKED';
      }

      await this.updateOrderStatus(existing.orderId, newStatus, {
        ifInternalId: fulfillment.id,
        ifTranId: fulfillment.tranId,
        items: fulfillment.item?.items || [],
      });

      await this.markOrderSynced(existing.orderId, syncStartTime);

      return { updated: true, orderId: existing.orderId };
    } catch (error: any) {
      logger.error('Failed to sync single fulfillment', {
        ifId: fulfillment.id,
        error: error.message,
      });
      return { updated: false, error: error.message };
    }
  }
}
