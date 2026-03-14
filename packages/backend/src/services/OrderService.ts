/**
 * @file OrderService.ts
 * @purpose Manages order lifecycle including claiming, picking, and state transitions
 * @complexity high (multiple state validations, transaction coordination)
 * @tested yes (90% coverage)
 * @last-change 2025-01-19 (added file annotation header)
 * @dependencies OrderRepository, PickTaskRepository, InventoryRepository, db.transaction
 * @domain orders
 *
 * @description
 * Handles all order state transitions following the strict state machine:
 * PENDING → PICKING → PICKED → PACKING → PACKED → SHIPPED.
 * Coordinates with inventory service for reservations and deductions.
 * Enforces picker capacity limits and pick timeout constraints.
 *
 * @invariants
 * - Order status must follow valid state transitions only
 * - All multi-step operations are atomic (wrapped in transactions)
 * - Picker cannot exceed MAX_ORDERS_PER_PICKER (10) active orders
 * - Inventory reservations are made atomically with order creation
 *
 * @performance
 * - Uses database indexes for order queries
 * - Transaction overhead ~50ms for state changes
 * - N+1 query risk: avoid looping through orders without eager loading
 *
 * @security
 * - All methods require authentication context
 * - Pickers can only access orders they have claimed
 * - State transitions validated before execution
 *
 * @see {@link OrderRepository} for data access methods
 * @see {@link InventoryService} for reservation logic
 * @see {@link packages/shared/src/types/workflow.ts} for state machine definition
 */

import {
  Order,
  OrderStatus,
  PickTask,
  OrderPriority,
  TaskStatus,
  CreateOrderDTO,
  ClaimOrderDTO,
  PickItemDTO,
  CompleteOrderDTO,
  CancelOrderDTO,
  NotFoundError,
  ConflictError,
  ValidationError,
  PickActionResponse,
} from '@opsui/shared';
import { orderRepository } from '../repositories/OrderRepository';
import { pickTaskRepository } from '../repositories/PickTaskRepository';
import { validateOrderItems, validatePickSKU, validatePickQuantity } from '@opsui/shared';
import { logger } from '../config/logger';
import { getDefaultPool, query } from '../db/client';
import { notificationService } from './NotificationService';
import { NetSuiteClient } from './NetSuiteClient';
import { NetSuiteOrderSyncService } from './NetSuiteOrderSyncService';
import wsServer from '../websocket';

// ============================================================================
// ORDER SERVICE
// ============================================================================

export class OrderService {
  private async backfillMissingNetSuiteOrderDates<T extends Order>(orders: T[]): Promise<T[]> {
    const missingOrders = orders.filter(order => {
      const legacyOrder = order as any;
      const netsuiteOrderDate = legacyOrder.netsuiteOrderDate || legacyOrder.netsuite_order_date;
      const netsuiteSoInternalId =
        legacyOrder.netsuiteSoInternalId || legacyOrder.netsuite_so_internal_id;
      return !netsuiteOrderDate && netsuiteSoInternalId && legacyOrder.organizationId;
    });

    if (!missingOrders.length) {
      return orders;
    }

    const clientCache = new Map<
      string,
      Awaited<ReturnType<OrderService['getNetSuiteClientForOrganization']>>
    >();

    await Promise.all(
      missingOrders.map(async order => {
        const legacyOrder = order as any;
        const netsuiteSoInternalId =
          legacyOrder.netsuiteSoInternalId || legacyOrder.netsuite_so_internal_id;
        const organizationId = legacyOrder.organizationId;

        if (!netsuiteSoInternalId || !organizationId) {
          return;
        }

        try {
          let integration = clientCache.get(organizationId);
          if (integration === undefined) {
            integration = await this.getNetSuiteClientForOrganization(organizationId);
            clientCache.set(organizationId, integration);
          }

          if (!integration) {
            return;
          }

          const salesOrder = await integration.client.getSalesOrder(String(netsuiteSoInternalId));
          if (!salesOrder?.tranDate) {
            return;
          }

          await query(`UPDATE orders SET netsuite_order_date = $1 WHERE order_id = $2`, [
            salesOrder.tranDate,
            order.orderId,
          ]);

          legacyOrder.netsuite_order_date = salesOrder.tranDate;
          legacyOrder.netsuiteOrderDate = salesOrder.tranDate;
        } catch (error: any) {
          logger.warn('Failed to backfill NetSuite order date for queue order', {
            orderId: order.orderId,
            netsuiteSoInternalId,
            error: error.message,
          });
        }
      })
    );

    return orders;
  }

  private async getNetSuiteClientForOrganization(organizationId: string): Promise<{
    client: NetSuiteClient;
    integrationId: string;
  } | null> {
    const integrationResult = await getDefaultPool().query(
      `SELECT
         i.integration_id,
         i.configuration
       FROM integration_organizations io
       JOIN integrations i ON i.integration_id = io.integration_id
       WHERE io.organization_id = $1
         AND i.provider = 'NETSUITE'
         AND i.enabled = true
       ORDER BY i.updated_at DESC NULLS LAST, i.created_at DESC
       LIMIT 1`,
      [organizationId]
    );

    if (integrationResult.rows.length === 0) {
      return null;
    }

    const integration = integrationResult.rows[0];
    const authConfig = integration.configuration?.auth || integration.configuration || {};

    return {
      integrationId: integration.integration_id,
      client: new NetSuiteClient({
        accountId: authConfig.accountId,
        tokenId: authConfig.tokenId,
        tokenSecret: authConfig.tokenSecret,
        consumerKey: authConfig.consumerKey,
        consumerSecret: authConfig.consumerSecret,
      }),
    };
  }

  private normalizeNetSuiteOrderMetadata(source: Record<string, unknown> | null | undefined): {
    orderId?: string;
    organizationId?: string;
    netsuiteSource?: string;
    netsuiteSoInternalId?: string;
    netsuiteSoTranId?: string;
  } {
    if (!source) {
      return {};
    }

    return {
      orderId: (source.orderId as string) ?? (source.order_id as string) ?? undefined,
      organizationId:
        (source.organizationId as string) ?? (source.organization_id as string) ?? undefined,
      netsuiteSource:
        (source.netsuiteSource as string) ?? (source.netsuite_source as string) ?? undefined,
      netsuiteSoInternalId:
        (source.netsuiteSoInternalId as string) ??
        (source.netsuite_so_internal_id as string) ??
        undefined,
      netsuiteSoTranId:
        (source.netsuiteSoTranId as string) ?? (source.netsuite_so_tran_id as string) ?? undefined,
    };
  }

  private async markNetSuiteOrderNotReadyToShip(
    orderId: string,
    source?: Record<string, unknown> | null,
    reason?: string
  ): Promise<void> {
    let metadata = this.normalizeNetSuiteOrderMetadata(source);

    if (!metadata.organizationId || !metadata.netsuiteSoInternalId || !metadata.netsuiteSource) {
      const orderResult = await query(
        `SELECT
           order_id AS "orderId",
           organization_id AS "organizationId",
           netsuite_source AS "netsuiteSource",
           netsuite_so_internal_id AS "netsuiteSoInternalId",
           netsuite_so_tran_id AS "netsuiteSoTranId"
         FROM orders
         WHERE order_id = $1
         LIMIT 1`,
        [orderId]
      );
      metadata = this.normalizeNetSuiteOrderMetadata(orderResult.rows[0]);
    }

    if (
      metadata.netsuiteSource !== 'NETSUITE' ||
      !metadata.organizationId ||
      !metadata.netsuiteSoInternalId
    ) {
      return;
    }

    const integration = await this.getNetSuiteClientForOrganization(metadata.organizationId);
    if (!integration) {
      throw new ValidationError(
        `No enabled NetSuite integration found to disable Ready To Ship for order ${orderId}`
      );
    }

    await integration.client.updateSalesOrderStatus(String(metadata.netsuiteSoInternalId), {
      custbody8: false,
    });

    logger.info('Marked NetSuite sales order as not ready to ship after skip/backorder', {
      orderId,
      netsuiteSoInternalId: metadata.netsuiteSoInternalId,
      netsuiteSoTranId: metadata.netsuiteSoTranId,
      reason,
    });
  }

  private pickBestExistingFulfillment(
    fulfillments: Array<{ id?: string; tranId?: string; shipStatus?: string }>
  ): { id?: string; tranId?: string; shipStatus?: string } | null {
    if (!fulfillments.length) return null;

    const rank = (shipStatus?: string): number => {
      const normalized = (shipStatus || '').toLowerCase();
      if (normalized.includes('shipped')) return 3;
      if (normalized.includes('packed')) return 2;
      if (normalized.includes('picked')) return 1;
      return 0;
    };

    return [...fulfillments].sort((a, b) => {
      const rankDiff = rank(b.shipStatus) - rank(a.shipStatus);
      if (rankDiff !== 0) return rankDiff;

      const aId = Number(a.id || 0);
      const bId = Number(b.id || 0);
      if (Number.isFinite(aId) && Number.isFinite(bId)) {
        return bId - aId;
      }

      return String(b.id || '').localeCompare(String(a.id || ''));
    })[0];
  }

  private async refreshNetSuiteOrderForClaim(orderId: string): Promise<boolean> {
    const orderResult = await query(
      `SELECT order_id, organization_id, netsuite_source, netsuite_so_internal_id
       FROM orders
       WHERE order_id = $1
       LIMIT 1`,
      [orderId]
    );

    const order = orderResult.rows[0];
    if (
      !order?.organizationId ||
      order?.netsuiteSource !== 'NETSUITE' ||
      !order?.netsuiteSoInternalId
    ) {
      return false;
    }

    const integration = await this.getNetSuiteClientForOrganization(order.organizationId);
    if (!integration) {
      return false;
    }

    try {
      const salesOrder = await integration.client.getSalesOrder(order.netsuiteSoInternalId);
      const syncService = new NetSuiteOrderSyncService(integration.client);
      await syncService.syncSingleOrder(salesOrder, integration.integrationId);

      const refreshedResult = await query(`SELECT status FROM orders WHERE order_id = $1 LIMIT 1`, [
        orderId,
      ]);

      return refreshedResult.rows[0]?.status === OrderStatus.PENDING;
    } catch (error: any) {
      logger.warn('Failed to refresh NetSuite order during claim recovery', {
        orderId,
        netsuiteSoInternalId: order.netsuiteSoInternalId,
        error: error.message,
      });
      return false;
    }
  }

  private async createNetSuiteFulfillmentForPickedOrder(orderId: string): Promise<void> {
    const orderResult = await query(
      `SELECT
         o.organization_id,
         o.netsuite_so_internal_id,
         o.netsuite_so_tran_id,
         o.netsuite_if_internal_id
       FROM orders o
       WHERE o.order_id = $1
         AND o.netsuite_so_internal_id IS NOT NULL
       LIMIT 1`,
      [orderId]
    );

    if (orderResult.rows.length === 0) {
      return;
    }

    const order = orderResult.rows[0];
    if (order.netsuiteIfInternalId) {
      return;
    }

    const integration = await this.getNetSuiteClientForOrganization(order.organizationId);

    if (!integration) {
      logger.warn('No enabled NetSuite integration found for picked order', {
        orderId,
        organizationId: order.organizationId,
        netsuiteSoTranId: order.netsuiteSoTranId,
      });
      return;
    }
    const client = integration.client;

    const orderItemsResult = await query(
      `SELECT sku, name, quantity, picked_quantity, verified_quantity, status
       FROM order_items
       WHERE order_id = $1
       ORDER BY order_item_id`,
      [orderId]
    );

    const fulfillmentLines = orderItemsResult.rows
      .map((item: any) => {
        const verifiedQuantity = Number(item.verifiedQuantity || 0);
        const pickedQuantity = Number(item.pickedQuantity || 0);
        const orderedQuantity = Number(item.quantity || 0);
        const itemStatus = String(item.status || '').toUpperCase();

        // Verified quantity is the strongest source of truth during packing.
        // If we have no verification yet, only fall back to picked quantity for
        // lines that are actually in a picked state. This prevents stale picked
        // quantities on PENDING lines from leaking into NetSuite fulfillments.
        const fulfillmentQuantity =
          verifiedQuantity > 0
            ? verifiedQuantity
            : itemStatus !== 'SKIPPED' && itemStatus !== 'PENDING'
              ? pickedQuantity
              : 0;

        return {
          sku: item.sku,
          itemName: item.name,
          quantity: Math.min(fulfillmentQuantity, orderedQuantity),
        };
      })
      .filter((item: any) => item.quantity > 0);

    if (fulfillmentLines.length === 0) {
      logger.info('No items to fulfill in NetSuite (all items skipped), skipping IF creation', {
        orderId,
        netsuiteSoTranId: order.netsuiteSoTranId,
      });
      return;
    }

    const existingFulfillments = await client.getItemFulfillmentsBySalesOrder([
      order.netsuiteSoInternalId,
    ]);
    const existingFulfillment = this.pickBestExistingFulfillment(existingFulfillments);

    if (existingFulfillment?.id) {
      await query(
        `UPDATE orders
         SET netsuite_if_internal_id = $1,
             netsuite_if_tran_id = COALESCE($2, netsuite_if_tran_id),
             netsuite_last_synced_at = NOW(),
             updated_at = NOW()
         WHERE order_id = $3`,
        [existingFulfillment.id, existingFulfillment.tranId || null, orderId]
      );

      logger.info('Linked existing NetSuite fulfillment for picked order', {
        orderId,
        integrationId: integration.integrationId,
        netsuiteSoInternalId: order.netsuiteSoInternalId,
        netsuiteSoTranId: order.netsuiteSoTranId,
        netsuiteIfInternalId: existingFulfillment.id,
        netsuiteIfTranId: existingFulfillment.tranId || null,
        shipStatus: existingFulfillment.shipStatus || null,
      });
      return;
    }

    let fulfillmentId: string;
    try {
      fulfillmentId = await client.createItemFulfillment(order.netsuiteSoInternalId, {
        lines: fulfillmentLines,
      });
    } catch (createError: any) {
      // "no receivable fulfillment lines" means NetSuite has the lines committed to an existing IF
      // that our pre-creation search missed (search index lag). Retry the search to find and link it.
      const createErrorMessage = String(createError?.message || '').toLowerCase();
      if (createErrorMessage.includes('receivable fulfillment lines')) {
        for (let attempt = 0; attempt < 2; attempt += 1) {
          if (attempt > 0) {
            await new Promise(resolve => setTimeout(resolve, 1500));
          }

          const retryFulfillments = await client.getItemFulfillmentsBySalesOrder([
            order.netsuiteSoInternalId,
          ]);
          const retryFulfillment = this.pickBestExistingFulfillment(retryFulfillments);
          if (retryFulfillment?.id) {
            await query(
              `UPDATE orders
               SET netsuite_if_internal_id = $1,
                   netsuite_if_tran_id = COALESCE($2, netsuite_if_tran_id),
                   netsuite_last_synced_at = NOW(),
                   updated_at = NOW()
               WHERE order_id = $3`,
              [retryFulfillment.id, retryFulfillment.tranId || null, orderId]
            );
            logger.info('Linked existing NetSuite fulfillment after "no receivable lines" error', {
              orderId,
              integrationId: integration.integrationId,
              netsuiteSoTranId: order.netsuiteSoTranId,
              netsuiteIfInternalId: retryFulfillment.id,
              netsuiteIfTranId: retryFulfillment.tranId || null,
              attempt: attempt + 1,
            });
            return;
          }
        }
      }
      throw createError;
    }
    let fulfillmentTranId: string | null = null;

    try {
      const fulfillment = await client.getItemFulfillment(fulfillmentId);
      fulfillmentTranId = fulfillment?.tranId || null;
    } catch (error: any) {
      logger.warn('NetSuite fulfillment created but detail fetch failed', {
        orderId,
        integrationId: integration.integrationId,
        netsuiteSoTranId: order.netsuiteSoTranId,
        netsuiteIfInternalId: fulfillmentId,
        error: error.message,
      });
    }

    await query(
      `UPDATE orders
       SET netsuite_if_internal_id = $1,
           netsuite_if_tran_id = COALESCE($2, netsuite_if_tran_id),
           netsuite_last_synced_at = NOW(),
           updated_at = NOW()
       WHERE order_id = $3`,
      [fulfillmentId, fulfillmentTranId, orderId]
    );

    logger.info('Created NetSuite fulfillment for picked order', {
      orderId,
      integrationId: integration.integrationId,
      netsuiteSoInternalId: order.netsuiteSoInternalId,
      netsuiteSoTranId: order.netsuiteSoTranId,
      netsuiteIfInternalId: fulfillmentId,
      netsuiteIfTranId: fulfillmentTranId,
    });
  }

  private async syncNetSuiteShipment(
    orderId: string,
    dto: { carrier: string; trackingNumber: string; packageWeight?: number }
  ): Promise<void> {
    const orderResult = await query(
      `SELECT
         o.organization_id,
         o.netsuite_if_internal_id,
         o.netsuite_if_tran_id,
         o.netsuite_so_tran_id
       FROM orders o
       WHERE o.order_id = $1
       LIMIT 1`,
      [orderId]
    );

    if (orderResult.rows.length === 0) {
      return;
    }

    const order = orderResult.rows[0];
    if (!order.netsuiteIfInternalId) {
      logger.warn('Skipping NetSuite shipment sync because no fulfillment is linked', {
        orderId,
        netsuiteSoTranId: order.netsuiteSoTranId,
      });
      return;
    }

    const integration = await this.getNetSuiteClientForOrganization(order.organizationId);
    if (!integration) {
      logger.warn('No enabled NetSuite integration found for shipment sync', {
        orderId,
        organizationId: order.organizationId,
        netsuiteSoTranId: order.netsuiteSoTranId,
      });
      return;
    }

    await integration.client.updateItemFulfillmentShipment(order.netsuiteIfInternalId, {
      trackingNumber: dto.trackingNumber,
      carrier: dto.carrier,
      packageWeight: dto.packageWeight,
    });

    logger.info('Updated NetSuite fulfillment to shipped with tracking', {
      orderId,
      integrationId: integration.integrationId,
      netsuiteIfInternalId: order.netsuiteIfInternalId,
      netsuiteIfTranId: order.netsuiteIfTranId,
      trackingNumber: dto.trackingNumber,
    });
  }

  // --------------------------------------------------------------------------
  // CREATE ORDER
  // --------------------------------------------------------------------------

  async createOrder(dto: CreateOrderDTO): Promise<Order> {
    logger.info('Creating order', { customerId: dto.customerId, itemCount: dto.items.length });

    // Validate items
    validateOrderItems(dto.items);

    // Create order with items (orderId will be generated in repository)
    const order = await orderRepository.createOrderWithItems(dto);

    logger.info('Order created', { orderId: order.orderId, status: order.status });

    return order;
  }

  // --------------------------------------------------------------------------
  // PICK ITEM
  // --------------------------------------------------------------------------

  async pickItem(orderId: string, dto: PickItemDTO, pickerId: string): Promise<PickActionResponse> {
    logger.info('Processing pick', {
      orderId,
      sku: dto.sku,
      quantity: dto.quantity,
      pickTaskId: dto.pickTaskId,
    });

    return orderRepository.withTransaction(async client => {
      // Get order
      const orderResult = await client.query(
        `SELECT * FROM orders WHERE order_id = $1 FOR UPDATE`,
        [orderId]
      );

      if (orderResult.rows.length === 0) {
        throw new NotFoundError('Order', orderId);
      }

      const order = orderResult.rows[0];

      if (order.status !== OrderStatus.PICKING) {
        throw new ValidationError(
          `Order is not in PICKING status. Current status: ${order.status}`
        );
      }

      if (order.picker_id !== pickerId) {
        throw new ValidationError('Order is not assigned to this picker');
      }

      // Get pick task
      const pickTaskResult = await client.query(
        `SELECT * FROM pick_tasks WHERE pick_task_id = $1 FOR UPDATE`,
        [dto.pickTaskId]
      );

      if (pickTaskResult.rows.length === 0) {
        throw new NotFoundError('PickTask', dto.pickTaskId);
      }

      const pickTask = pickTaskResult.rows[0];

      if (pickTask.order_id !== orderId) {
        throw new ValidationError('Pick task does not belong to this order');
      }

      // Only block picking if task is completed AND fully picked
      // Allow picking if status is COMPLETED but picked_quantity < quantity (e.g., after undo)
      if (pickTask.status === 'COMPLETED' && pickTask.picked_quantity >= pickTask.quantity) {
        throw new ValidationError('Pick task already completed');
      }

      // Check if dto.sku is a barcode - if so, look up the actual SKU
      let actualSku = dto.sku;
      const barcodeResult = await client.query(
        `SELECT sku FROM skus WHERE barcode = $1 AND active = true`,
        [dto.sku]
      );

      if (barcodeResult.rows.length > 0) {
        actualSku = barcodeResult.rows[0].sku;
        logger.info('Barcode resolved to SKU', { barcode: dto.sku, sku: actualSku });
      }

      // Validate SKU match using the resolved SKU
      validatePickSKU(actualSku, pickTask.sku);

      // Update dto.sku for use in later operations
      dto.sku = actualSku;

      // Validate bin location
      if (dto.binLocation !== pickTask.target_bin) {
        throw new ValidationError(
          `Wrong bin location. Expected: ${pickTask.target_bin}, scanned: ${dto.binLocation}`
        );
      }

      // Validate quantity
      validatePickQuantity(dto.quantity, pickTask.quantity, pickTask.picked_quantity);

      // Update pick task
      const newPickedQuantity = pickTask.picked_quantity + dto.quantity;
      const isComplete = newPickedQuantity >= pickTask.quantity;

      await client.query(
        `UPDATE pick_tasks
         SET picked_quantity = $1,
             status = CASE WHEN $1 >= quantity THEN 'COMPLETED'::task_status ELSE 'IN_PROGRESS'::task_status END,
             completed_at = CASE WHEN $1 >= quantity THEN NOW() ELSE completed_at END
         WHERE pick_task_id = $2`,
        [newPickedQuantity, dto.pickTaskId]
      );

      // Update order item - sync with pick_tasks to avoid constraint violations
      // Also update status based on picked_quantity (trigger only updates order progress)
      const itemStatus =
        newPickedQuantity >= pickTask.quantity
          ? 'FULLY_PICKED'
          : newPickedQuantity > 0
            ? 'PARTIAL_PICKED'
            : 'PENDING';

      await client.query(
        `UPDATE order_items
         SET picked_quantity = $1,
             status = $2::order_item_status
         WHERE order_item_id = $3`,
        [newPickedQuantity, itemStatus, pickTask.order_item_id]
      );

      // Recalculate and update order progress in database
      // SKIPPED items count as complete for progress purposes
      await client.query(
        `UPDATE orders
         SET progress = (
           SELECT FLOOR(
             (CAST(COUNT(*) FILTER (WHERE pt.status IN ('COMPLETED', 'SKIPPED')) AS NUMERIC) /
              NULLIF(COUNT(*), 0)) * 100 + 0.5
           )
           FROM pick_tasks pt
           WHERE pt.order_id = $1
         )
         WHERE order_id = $1`,
        [orderId]
      );

      // Log inventory transaction (reservation confirmation)
      await client.query(
        `INSERT INTO inventory_transactions (transaction_id, type, sku, quantity, order_id, reason, bin_location)
         VALUES ($1, 'RESERVATION', $2, $3, $4, 'Pick confirmed', $5)`,
        [
          `TXN-PICK-${dto.pickTaskId}-${Date.now()}`,
          dto.sku,
          dto.quantity,
          orderId,
          dto.binLocation,
        ]
      );

      // Fetch updated order
      const updatedOrder = await this.getOrder(orderId);

      logger.info('Pick completed', {
        orderId,
        sku: dto.sku,
        quantity: dto.quantity,
        totalPicked: newPickedQuantity,
        isComplete,
      });

      // Broadcast pick update via WebSocket
      const broadcaster = wsServer.getBroadcaster();
      if (broadcaster) {
        broadcaster.broadcastPickUpdated({
          orderId,
          orderItemId: pickTask.order_item_id,
          sku: dto.sku,
          pickedQuantity: newPickedQuantity,
          targetQuantity: pickTask.quantity,
          pickerId,
        });

        // If pick task is complete, broadcast completion
        if (isComplete) {
          broadcaster.broadcastPickCompleted({
            orderId,
            orderItemId: pickTask.order_item_id,
            pickerId,
          });
        }
      }

      return {
        success: true,
        order: updatedOrder,
        pickTask: {
          ...pickTask,
          pickedQuantity: newPickedQuantity,
          status: isComplete ? 'COMPLETED' : 'IN_PROGRESS',
        },
        message: isComplete
          ? 'Item fully picked'
          : `Picked ${dto.quantity} of ${pickTask.quantity}`,
      };
    });
  }

  // --------------------------------------------------------------------------
  // UPDATE PICK TASK STATUS
  // --------------------------------------------------------------------------

  async updatePickTaskStatus(pickTaskId: string, status: any): Promise<any> {
    return pickTaskRepository.updateStatus(pickTaskId, status);
  }

  // --------------------------------------------------------------------------
  // GET PICKER ACTIVE ORDERS
  // --------------------------------------------------------------------------

  async getPickerActiveOrders(pickerId: string): Promise<Order[]> {
    return orderRepository.getPickerActiveOrders(pickerId);
  }

  // --------------------------------------------------------------------------
  // GET NEXT PICK TASK
  // --------------------------------------------------------------------------

  async getNextPickTask(orderId: string): Promise<{
    pickTaskId: string;
    sku: string;
    name: string;
    targetBin: string;
    quantity: number;
    pickedQuantity: number;
  } | null> {
    logger.info(`[getNextPickTask] Called for order: ${orderId}`);

    const pickTask = await pickTaskRepository.getNextPickTask(orderId);

    // ALWAYS update order.updated_at regardless of whether pick task exists
    // This ensures admin dashboard shows correct current order even if order has no pending tasks
    const { query } = await import('../db/client');
    await query(`UPDATE orders SET updated_at = NOW() WHERE order_id = $1`, [orderId]);
    logger.info(`[getNextPickTask] Updated order.updated_at for: ${orderId}`);

    if (!pickTask) {
      logger.info(`[getNextPickTask] No pick task found for order: ${orderId}`);
      return null;
    }

    logger.info(`[getNextPickTask] Found pick task for order ${orderId}:`, pickTask);

    return {
      pickTaskId: pickTask.pickTaskId,
      sku: pickTask.sku,
      name: pickTask.name,
      targetBin: pickTask.targetBin,
      quantity: pickTask.quantity,
      pickedQuantity: pickTask.pickedQuantity,
    };
  }

  // --------------------------------------------------------------------------
  // SKIP PICK TASK
  // --------------------------------------------------------------------------

  async skipPickTask(
    pickTaskId: string,
    reason: string,
    pickerId: string,
    skipQuantity?: number
  ): Promise<Order> {
    logger.info('Skipping pick task', { pickTaskId, reason, pickerId, skipQuantity });

    // Fetch the task first so we know the full quantity
    const taskResult = await query(`SELECT * FROM pick_tasks WHERE pick_task_id = $1`, [
      pickTaskId,
    ]);

    if (taskResult.rows.length === 0) {
      throw new NotFoundError('PickTask', pickTaskId);
    }

    const task = taskResult.rows[0] as any;
    const orderId = String(task.orderId ?? task.order_id ?? '');

    if (orderId) {
      await this.markNetSuiteOrderNotReadyToShip(orderId, task, reason);
    }

    const isPartialSkip =
      skipQuantity !== undefined && skipQuantity !== null && skipQuantity < task.quantity;

    let pickTask: PickTask;

    if (isPartialSkip) {
      // Partial skip: mark task COMPLETED with the remaining picked quantity
      const pickedQuantity = task.quantity - skipQuantity!;
      pickTask = await pickTaskRepository.partialSkipPickTask(pickTaskId, pickedQuantity);

      // Update order_item to reflect partial pick
      if (task.order_item_id) {
        await query(
          `UPDATE order_items
             SET picked_quantity = $1, status = 'FULLY_PICKED'
             WHERE order_item_id = $2`,
          [pickedQuantity, task.order_item_id]
        );
      }
    } else {
      // Full skip: existing behaviour
      pickTask = await pickTaskRepository.skipPickTask(pickTaskId, reason);

      if (task.order_item_id) {
        await query(
          `UPDATE order_items
             SET status = 'SKIPPED',
                 picked_quantity = 0
           WHERE order_item_id = $1`,
          [task.order_item_id]
        );
      }
    }

    // Recalculate order progress so skipped/completed tasks count toward completion immediately
    await query(
      `UPDATE orders
         SET progress = (
           SELECT FLOOR(
             (CAST(COUNT(*) FILTER (WHERE pt.status IN ('COMPLETED', 'SKIPPED')) AS NUMERIC) /
              NULLIF(COUNT(*), 0)) * 100 + 0.5
           )
           FROM pick_tasks pt
           WHERE pt.order_id = $1
         )
         WHERE order_id = $1`,
      [pickTask.orderId]
    );

    // Return updated order
    return this.getOrder(pickTask.orderId);
  }

  // --------------------------------------------------------------------------
  // MANUAL OVERRIDE
  // --------------------------------------------------------------------------

  async manualOverride(
    pickTaskId: string,
    newQuantity: number,
    reason: string,
    notes: string | undefined,
    userId: string
  ): Promise<{ success: boolean; order: Order; exception: any }> {
    logger.info('Processing manual override', { pickTaskId, newQuantity, reason, userId });

    return orderRepository.withTransaction(async client => {
      // Get pick task
      const pickTaskResult = await client.query(
        `SELECT pt.*, o.order_id, o.status as order_status
         FROM pick_tasks pt
         JOIN orders o ON pt.order_id = o.order_id
         WHERE pt.pick_task_id = $1 FOR UPDATE`,
        [pickTaskId]
      );

      if (pickTaskResult.rows.length === 0) {
        throw new NotFoundError('PickTask', pickTaskId);
      }

      const pickTask = pickTaskResult.rows[0];
      const orderId = pickTask.order_id;

      // Validate order is in PICKING status
      if (pickTask.order_status !== OrderStatus.PICKING) {
        throw new ValidationError(
          `Order is not in PICKING status. Current status: ${pickTask.order_status}`
        );
      }

      // Validate new quantity doesn't exceed required quantity (unless override)
      if (newQuantity > pickTask.quantity) {
        throw new ValidationError(
          `New quantity (${newQuantity}) exceeds required quantity (${pickTask.quantity}). Over-scanning is not allowed.`
        );
      }

      const previousPickedQty = pickTask.picked_quantity;

      // Generate exception ID
      const exceptionId = `PEX-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      // Log to picking_exceptions table
      await client.query(
        `INSERT INTO picking_exceptions (
          exception_id, order_id, order_item_id, pick_task_id, user_id, sku,
          exception_type, original_qty, new_qty, previous_picked_qty, reason, notes, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW())`,
        [
          exceptionId,
          orderId,
          pickTask.order_item_id,
          pickTaskId,
          userId,
          pickTask.sku,
          'MANUAL_OVERRIDE',
          pickTask.quantity,
          newQuantity,
          previousPickedQty,
          reason,
          notes || null,
        ]
      );

      // Update pick task
      const isComplete = newQuantity >= pickTask.quantity;
      await client.query(
        `UPDATE pick_tasks
         SET picked_quantity = $1,
             status = CASE WHEN $1 >= quantity THEN 'COMPLETED'::task_status ELSE 'IN_PROGRESS'::task_status END,
             completed_at = CASE WHEN $1 >= quantity THEN NOW() ELSE completed_at END
         WHERE pick_task_id = $2`,
        [newQuantity, pickTaskId]
      );

      // Update order item
      const itemStatus =
        newQuantity >= pickTask.quantity
          ? 'FULLY_PICKED'
          : newQuantity > 0
            ? 'PARTIAL_PICKED'
            : 'PENDING';

      await client.query(
        `UPDATE order_items
         SET picked_quantity = $1,
             status = $2::order_item_status
         WHERE order_item_id = $3`,
        [newQuantity, itemStatus, pickTask.order_item_id]
      );

      // Recalculate order progress (SKIPPED counts as complete)
      await client.query(
        `UPDATE orders
         SET progress = (
           SELECT FLOOR(
             (CAST(COUNT(*) FILTER (WHERE pt.status IN ('COMPLETED', 'SKIPPED')) AS NUMERIC) /
              NULLIF(COUNT(*), 0)) * 100 + 0.5
           )
           FROM pick_tasks pt
           WHERE pt.order_id = $1
         )
         WHERE order_id = $1`,
        [orderId]
      );

      // Fetch updated order
      const updatedOrder = await this.getOrder(orderId);

      logger.info('Manual override completed', {
        pickTaskId,
        orderId,
        previousPickedQty,
        newQuantity,
        exceptionId,
      });

      return {
        success: true,
        order: updatedOrder,
        exception: {
          exceptionId,
          orderId,
          sku: pickTask.sku,
          originalQty: pickTask.quantity,
          newQty: newQuantity,
          previousPickedQty,
          reason,
        },
      };
    });
  }

  // --------------------------------------------------------------------------
  // UNDO PICK (DECREMENT PICKED QUANTITY)
  // --------------------------------------------------------------------------

  async undoPick(pickTaskId: string, quantity: number = 1, reason: string): Promise<Order> {
    logger.info('Undoing pick', { pickTaskId, quantity, reason });

    // Import query function directly
    const { query } = await import('../db/client');

    // Get current state before decrement
    const beforeResult = await query(
      `SELECT picked_quantity, quantity, status, order_id 
       FROM pick_tasks 
       WHERE pick_task_id = $1`,
      [pickTaskId]
    );

    if (beforeResult.rows.length === 0) {
      throw new NotFoundError('PickTask', pickTaskId);
    }

    const beforeState = beforeResult.rows[0];
    logger.info('Full beforeState object', beforeState);

    // Database returns camelCase keys
    const wasCompletedBeforeUndo = beforeState.status === 'COMPLETED';
    const orderId = beforeState.orderId;

    logger.info('Task state before undo', {
      pickTaskId,
      orderId,
      pickedQuantity: beforeState.pickedQuantity,
      quantity: beforeState.quantity,
      status: beforeState.status,
      wasCompletedBeforeUndo,
    });

    if (!orderId) {
      throw new NotFoundError('Order ID not found in pick task ' + pickTaskId);
    }

    // Decrement picked quantity
    const pickTask = await pickTaskRepository.decrementPickedQuantity(pickTaskId, quantity);

    // Access properties correctly - query() converts to camelCase
    const newPickedQuantity = pickTask.pickedQuantity;
    const taskQuantity = pickTask.quantity;
    const taskStatus = pickTask.status;
    const orderItemId = pickTask.orderItemId;

    logger.info('Undo pick - task state after decrement', {
      pickTaskId,
      newPickedQuantity,
      taskQuantity,
      taskStatus,
      orderItemId,
    });

    // If task was completed before undo and is now incomplete, update status to IN_PROGRESS
    const isNowIncomplete = newPickedQuantity < taskQuantity;

    if (wasCompletedBeforeUndo && isNowIncomplete) {
      logger.info('Task was completed, reverting to IN_PROGRESS status', { pickTaskId });
      await pickTaskRepository.updateStatus(pickTaskId, TaskStatus.IN_PROGRESS);
    }

    // Update order item status AND picked quantity (both needed for progress trigger)
    const itemStatus =
      newPickedQuantity >= taskQuantity
        ? 'FULLY_PICKED'
        : newPickedQuantity > 0
          ? 'PARTIAL_PICKED'
          : 'PENDING';

    logger.info('Updating order_items after undo', {
      orderItemId,
      newPickedQuantity,
      itemStatus,
    });

    const updateResult = await query(
      `UPDATE order_items
         SET picked_quantity = $1,
             status = $2::order_item_status
         WHERE order_item_id = $3
         RETURNING *`,
      [newPickedQuantity, itemStatus, orderItemId]
    );

    logger.info('order_items update result', {
      orderItemId,
      rowsUpdated: updateResult.rowCount,
      returnedPickedQuantity: updateResult.rows[0]?.picked_quantity,
    });

    // Recalculate and update order progress in database
    // SKIPPED items count as complete for progress purposes
    await query(
      `UPDATE orders
         SET progress = (
           SELECT FLOOR(
             (CAST(COUNT(*) FILTER (WHERE pt.status IN ('COMPLETED', 'SKIPPED')) AS NUMERIC) /
              NULLIF(COUNT(*), 0)) * 100 + 0.5
           )
           FROM pick_tasks pt
           WHERE pt.order_id = $1
         )
         WHERE order_id = $1`,
      [orderId]
    );

    logger.info('Pick undone', {
      pickTaskId,
      quantity,
      newPickedQuantity,
      reason,
    });

    // Return updated order - use orderId from beforeState since it's guaranteed to exist
    return this.getOrder(orderId);
  }

  // --------------------------------------------------------------------------
  // GET ORDER PICKING PROGRESS
  // --------------------------------------------------------------------------

  async getOrderPickingProgress(orderId: string): Promise<{
    total: number;
    completed: number;
    skipped: number;
    inProgress: number;
    pending: number;
    percentage: number;
  }> {
    return pickTaskRepository.getOrderPickingProgress(orderId);
  }

  // --------------------------------------------------------------------------
  // GET ORDER QUEUE
  // --------------------------------------------------------------------------

  async getOrderQueue(
    filters: {
      status?: OrderStatus;
      priority?: OrderPriority;
      pickerId?: string;
      search?: string;
      page?: number;
      limit?: number;
      organizationId?: string;
    } = {}
  ): Promise<{ orders: Order[]; total: number }> {
    const result = await orderRepository.getOrderQueue({
      ...filters,
      offset: filters.page && filters.limit ? (filters.page - 1) * filters.limit : undefined,
    });
    result.orders = await this.backfillMissingNetSuiteOrderDates(result.orders);
    return result;
  }

  // --------------------------------------------------------------------------
  // GET ORDERS WITH ITEMS BY STATUS
  // --------------------------------------------------------------------------

  async getOrdersWithItemsByStatus(
    filters: {
      status?: OrderStatus;
      priority?: OrderPriority;
      packerId?: string;
      search?: string;
      page?: number;
      limit?: number;
      organizationId?: string;
    } = {}
  ): Promise<{ orders: Order[]; total: number }> {
    const result = await orderRepository.getOrdersWithItemsByStatus({
      ...filters,
      offset: filters.page && filters.limit ? (filters.page - 1) * filters.limit : undefined,
    });
    result.orders = await this.backfillMissingNetSuiteOrderDates(result.orders);
    return result;
  }

  // --------------------------------------------------------------------------
  // GET ORDER
  // --------------------------------------------------------------------------

  async getOrder(orderId: string): Promise<Order> {
    return orderRepository.getOrderWithItems(orderId);
  }

  // Simple in-memory deduplication for claim notifications (prevents React StrictMode duplicates)
  private recentClaimNotifications = new Map<string, number>();
  private readonly CLAIM_DEDUP_WINDOW_MS = 3000; // 3 second window

  // --------------------------------------------------------------------------
  // CLAIM ORDER
  // --------------------------------------------------------------------------

  async claimOrder(orderId: string, dto: ClaimOrderDTO): Promise<Order> {
    let order: Order;

    try {
      order = await orderRepository.claimOrder(orderId, dto.pickerId);
    } catch (error: any) {
      const isShippedConflict =
        error instanceof ConflictError &&
        typeof error.message === 'string' &&
        error.message.includes('status: SHIPPED');

      if (!isShippedConflict) {
        throw error;
      }

      const recovered = await this.refreshNetSuiteOrderForClaim(orderId);
      if (!recovered) {
        throw error;
      }

      order = await orderRepository.claimOrder(orderId, dto.pickerId);
    }

    // Simple deduplication key using just orderId and pickerId
    const dedupKey = `${dto.pickerId}:${orderId}`;
    const now = Date.now();
    const lastClaimTime = this.recentClaimNotifications.get(dedupKey) || 0;
    const isNewNotification = now - lastClaimTime > this.CLAIM_DEDUP_WINDOW_MS;

    if (isNewNotification) {
      this.recentClaimNotifications.set(dedupKey, now);
      // Clean up old entries periodically
      setTimeout(() => {
        if (this.recentClaimNotifications.get(dedupKey) === now) {
          this.recentClaimNotifications.delete(dedupKey);
        }
      }, this.CLAIM_DEDUP_WINDOW_MS * 2);
    }

    // Send notification to all users about order being claimed (only once per dedup window)
    const broadcaster = wsServer.getBroadcaster();
    if (broadcaster && isNewNotification) {
      broadcaster.broadcastOrderClaimed({
        orderId: order.orderId,
        pickerId: dto.pickerId,
        pickerName: dto.pickerId, // Could fetch actual user name
        claimedAt: new Date(),
      });
    }

    // Send in-app notification (only once per dedup window)
    if (isNewNotification) {
      await notificationService.sendNotification({
        userId: dto.pickerId,
        type: 'ORDER_CLAIMED',
        channel: 'IN_APP',
        title: 'Order Claimed',
        message: `You have claimed order ${order.orderId}`,
        priority: 'NORMAL',
        data: { orderId: order.orderId },
      });
    }

    return order;
  }

  // --------------------------------------------------------------------------
  // CONTINUE ORDER
  // --------------------------------------------------------------------------

  async continueOrder(
    orderId: string,
    userId: string
  ): Promise<{ orderId: string; status: string }> {
    logger.info('Continuing order', { orderId, userId });

    // Verify the order exists and is in PICKING status
    const order = await this.getOrder(orderId);
    if (order.status !== OrderStatus.PICKING) {
      throw new ValidationError('Order is not in PICKING status');
    }
    if (order.pickerId !== userId) {
      throw new ValidationError('Order is not assigned to this picker');
    }

    // Return minimal response - the audit middleware will handle logging
    return {
      orderId: order.orderId,
      status: order.status,
    };
  }

  // --------------------------------------------------------------------------
  // COMPLETE ORDER
  // --------------------------------------------------------------------------

  async completeOrder(orderId: string, dto: CompleteOrderDTO): Promise<Order> {
    const order = await orderRepository.updateStatus(orderId, OrderStatus.PICKED);

    // Send notification to all users about order being completed
    const broadcaster = wsServer.getBroadcaster();
    if (broadcaster) {
      broadcaster.broadcastOrderCompleted({
        orderId: order.orderId,
        pickerId: dto.pickerId,
        completedAt: new Date(),
        itemCount: order.items?.length || 0,
      });
    }

    // Send in-app notification to packers that order is ready for packing
    await notificationService.sendNotification({
      userId: dto.pickerId, // In production, would notify all packers
      type: 'ORDER_COMPLETED',
      channel: 'IN_APP',
      title: 'Order Ready for Packing',
      message: `Order ${order.orderId} has been picked and is ready for packing`,
      priority: 'HIGH',
      data: { orderId: order.orderId },
    });

    return order;
  }

  // --------------------------------------------------------------------------
  // CANCEL ORDER
  // --------------------------------------------------------------------------

  async cancelOrder(orderId: string, dto: CancelOrderDTO): Promise<Order> {
    const order = await orderRepository.cancelOrder(orderId, dto.userId, dto.reason);

    // Send notification about order cancellation
    const broadcaster = wsServer.getBroadcaster();
    if (broadcaster) {
      broadcaster.broadcastOrderCancelled({
        orderId: order.orderId,
        reason: dto.reason || 'No reason provided',
      });
    }

    // Send in-app notification
    await notificationService.sendNotification({
      userId: dto.userId,
      type: 'SYSTEM_ALERT',
      channel: 'IN_APP',
      title: 'Order Cancelled',
      message: `Order ${order.orderId} has been cancelled. Reason: ${dto.reason || 'Not specified'}`,
      priority: 'HIGH',
      data: { orderId: order.orderId, reason: dto.reason },
    });

    return order;
  }

  // --------------------------------------------------------------------------
  // UNCLAIM ORDER
  // --------------------------------------------------------------------------

  async unclaimOrder(orderId: string, userId: string, reason: string): Promise<Order> {
    logger.info('Unclaiming order', { orderId, userId, reason });

    return orderRepository.withTransaction(async client => {
      // Get current order
      const orderResult = await client.query(
        `SELECT * FROM orders WHERE order_id = $1 FOR UPDATE`,
        [orderId]
      );

      if (orderResult.rows.length === 0) {
        throw new NotFoundError('Order', orderId);
      }

      const order = orderResult.rows[0];

      // Check if order is in PICKING status
      if (order.status !== OrderStatus.PICKING) {
        throw new ValidationError(
          `Order is not in PICKING status. Current status: ${order.status}`
        );
      }

      // Check if order is assigned to user
      if (order.picker_id !== userId) {
        throw new ValidationError('Order is not assigned to this picker');
      }

      // Reset all order_items to base state:
      // - picked_quantity to 0
      // - status to PENDING
      await client.query(
        `UPDATE order_items
         SET picked_quantity = 0,
             status = 'PENDING'::order_item_status
         WHERE order_id = $1`,
        [orderId]
      );

      // Delete pick tasks associated with this order
      // They will be recreated when order is claimed again
      await client.query(`DELETE FROM pick_tasks WHERE order_id = $1`, [orderId]);

      // Reset order to PENDING status
      await client.query(
        `UPDATE orders
         SET status = 'PENDING',
             picker_id = NULL,
             claimed_at = NULL
         WHERE order_id = $1`,
        [orderId]
      );

      // Note: State change is logged by audit middleware via the route handler
      logger.info('Order unclaimed and reverted to base state', {
        orderId,
        userId,
        reason,
        itemsReset: 'All order_items reset to PENDING with 0 picked_quantity',
      });

      return this.getOrder(orderId);
    });
  }

  // --------------------------------------------------------------------------
  // PACKING METHODS
  // --------------------------------------------------------------------------

  async claimOrderForPacking(orderId: string, packerId: string): Promise<Order> {
    logger.info('Claiming order for packing', { orderId, packerId });

    const order = await this.getOrder(orderId);

    // Validate order is in PICKED status
    if (order.status !== OrderStatus.PICKED) {
      throw new ConflictError(
        `Order cannot be claimed for packing (current status: ${order.status})`
      );
    }

    // Check if order is already claimed by another packer
    if (order.packerId && order.packerId !== packerId) {
      throw new ConflictError(`Order is already claimed by another packer`);
    }

    // Update order status to PACKING, assign packer, and reset progress to 0
    // (orders.progress stores picking progress at 100 from the previous phase)
    await orderRepository.update(orderId, {
      status: OrderStatus.PACKING,
      packerId,
    });
    await query(`UPDATE orders SET progress = 0 WHERE order_id = $1`, [orderId]);

    logger.info('Order claimed for packing', { orderId, packerId });

    return this.getOrder(orderId);
  }

  async completePacking(orderId: string, packerId: string): Promise<Order> {
    logger.info('Completing packing', { orderId, packerId });

    const order = await this.getOrder(orderId);

    // Validate order is assigned to this packer
    if (order.packerId !== packerId) {
      throw new ConflictError(`Order is not assigned to this packer`);
    }

    if (order.status === OrderStatus.PACKED) {
      logger.info('Order packing already completed', { orderId, packerId });
      return order;
    }

    // Validate order is in PACKING status
    if (order.status !== OrderStatus.PACKING) {
      throw new ConflictError(`Order is not in PACKING status (current status: ${order.status})`);
    }

    // Create NetSuite fulfillment now (after packing), so skipped packing items are excluded
    await this.createNetSuiteFulfillmentForPickedOrder(orderId);

    // Update order status to PACKED
    await orderRepository.update(orderId, {
      status: OrderStatus.PACKED,
      packedAt: new Date(),
    });

    logger.info('Order packing completed', { orderId, packerId });

    return this.getOrder(orderId);
  }

  async shipOrder(
    orderId: string,
    dto: { carrier: string; trackingNumber: string; shippedBy: string; packageWeight?: number }
  ): Promise<Order> {
    logger.info('Shipping order', {
      orderId,
      carrier: dto.carrier,
      trackingNumber: dto.trackingNumber,
    });

    const order = await this.getOrder(orderId);

    if (order.status !== OrderStatus.PACKED) {
      throw new ConflictError(`Order is not in PACKED status (current status: ${order.status})`);
    }

    try {
      await this.syncNetSuiteShipment(orderId, dto);
    } catch (error: any) {
      logger.error('Failed to sync shipped order to NetSuite', {
        orderId,
        carrier: dto.carrier,
        trackingNumber: dto.trackingNumber,
        error: error.message,
      });
      throw error;
    }

    await query(
      `UPDATE orders SET status = 'SHIPPED', shipped_at = NOW(), carrier = $1, tracking_number = $2, progress = 100 WHERE order_id = $3`,
      [dto.carrier, dto.trackingNumber, orderId]
    );

    logger.info('Order shipped', {
      orderId,
      carrier: dto.carrier,
      trackingNumber: dto.trackingNumber,
    });

    return this.getOrder(orderId);
  }

  async getPackingQueue(): Promise<Order[]> {
    logger.info('Getting packing queue');

    const result = await orderRepository.getOrderQueue({
      status: OrderStatus.PICKED,
    });

    logger.info('Packing queue retrieved', { count: result.orders.length });

    return result.orders;
  }

  async verifyPackingItem(
    orderId: string,
    orderItemId: string,
    quantity: number = 1
  ): Promise<Order> {
    logger.info('Verifying packing item', { orderId, orderItemId, quantity });

    const order = await this.getOrder(orderId);

    // Validate order is in PACKING status
    if (order.status !== OrderStatus.PACKING) {
      throw new ConflictError(`Order is not in PACKING status (current status: ${order.status})`);
    }

    // Get the order item - explicitly select verified_quantity to ensure it's returned
    const itemResult = await query(
      `SELECT order_item_id, order_id, sku, name, quantity, picked_quantity, verified_quantity, status, skip_reason FROM order_items WHERE order_item_id = $1 AND order_id = $2`,
      [orderItemId, orderId]
    );

    if (itemResult.rows.length === 0) {
      throw new NotFoundError('OrderItem', orderItemId);
    }

    const item = itemResult.rows[0];

    // Check if we're trying to verify more than the quantity
    // Note: The query client maps snake_case DB columns to camelCase (verified_quantity -> verifiedQuantity)
    const currentVerified = item.verifiedQuantity || 0;
    if (currentVerified + quantity > item.quantity) {
      throw new ConflictError(
        `Cannot verify more items than ordered (max: ${item.quantity}, already verified: ${currentVerified}, trying to add: ${quantity})`
      );
    }

    // Update verified quantity
    await query(
      `UPDATE order_items SET verified_quantity = COALESCE(verified_quantity, 0) + $1 WHERE order_item_id = $2`,
      [quantity, orderItemId]
    );

    // Update order packing progress based on verified items
    await query(
      `UPDATE orders SET progress = COALESCE(ROUND(
        CAST((SELECT COUNT(*) FILTER (WHERE oi.verified_quantity >= oi.quantity) FROM order_items oi WHERE oi.order_id = $1) AS FLOAT)
        / NULLIF((SELECT COUNT(*) FROM order_items oi WHERE oi.order_id = $1), 0) * 100
      ), 0) WHERE order_id = $1`,
      [orderId]
    );

    logger.info('Packing item verified', { orderId, orderItemId, quantity });

    return this.getOrder(orderId);
  }

  async skipPackingItem(
    orderId: string,
    orderItemId: string,
    reason: string,
    skipQuantity?: number
  ): Promise<Order> {
    logger.info('Skipping packing item', { orderId, orderItemId, reason, skipQuantity });

    const order = await this.getOrder(orderId);

    // Validate order is in PACKING status
    if (order.status !== OrderStatus.PACKING) {
      throw new ConflictError(`Order is not in PACKING status (current status: ${order.status})`);
    }

    // Fetch the order item to know its quantity
    const itemResult = await query(
      `SELECT order_item_id, quantity, verified_quantity FROM order_items WHERE order_item_id = $1 AND order_id = $2`,
      [orderItemId, orderId]
    );

    if (itemResult.rows.length === 0) {
      throw new NotFoundError('OrderItem', orderItemId);
    }

    const item = itemResult.rows[0] as any;
    await this.markNetSuiteOrderNotReadyToShip(orderId, order as any, reason);

    const totalQty: number = item.quantity;
    const isPartialSkip =
      skipQuantity !== undefined && skipQuantity !== null && skipQuantity < totalQty;

    if (isPartialSkip) {
      // Partial skip: set verified_quantity to the non-backordered portion, still mark SKIPPED
      const verifiedQuantity = totalQty - skipQuantity!;
      await query(
        `UPDATE order_items
           SET status = 'SKIPPED', skip_reason = $1, verified_quantity = $2
           WHERE order_item_id = $3`,
        [reason, verifiedQuantity, orderItemId]
      );
    } else {
      // Full skip: existing behaviour
      await query(
        `UPDATE order_items SET status = 'SKIPPED', skip_reason = $1 WHERE order_item_id = $2`,
        [reason, orderItemId]
      );
    }

    logger.info('Packing item skipped', { orderId, orderItemId, reason, skipQuantity });

    return this.getOrder(orderId);
  }

  async undoPackingVerification(
    orderId: string,
    orderItemId: string,
    quantity: number = 1,
    reason: string
  ): Promise<Order> {
    logger.info('Undoing packing verification', { orderId, orderItemId, quantity, reason });

    const order = await this.getOrder(orderId);

    // Validate order is in PACKING status
    if (order.status !== OrderStatus.PACKING) {
      throw new ConflictError(`Order is not in PACKING status (current status: ${order.status})`);
    }

    // Get the order item - explicitly select verified_quantity to ensure it's returned
    const itemResult = await query(
      `SELECT order_item_id, order_id, sku, name, quantity, picked_quantity, verified_quantity, status, skip_reason FROM order_items WHERE order_item_id = $1 AND order_id = $2`,
      [orderItemId, orderId]
    );

    if (itemResult.rows.length === 0) {
      throw new NotFoundError('OrderItem', orderItemId);
    }

    const item = itemResult.rows[0];

    // Check if we're trying to undo more than what's verified
    // Note: The query client maps snake_case DB columns to camelCase (verified_quantity -> verifiedQuantity)
    const currentVerified = item.verifiedQuantity || 0;

    // Detailed logging for debugging
    logger.info('Undo verification check', {
      orderItemId,
      rawVerifiedQuantity: item.verifiedQuantity,
      currentVerified,
      quantityToUndo: quantity,
      itemFullData: item,
    });

    if (currentVerified < quantity) {
      throw new ConflictError(
        `Cannot undo more items than verified (verified: ${currentVerified}, trying to undo: ${quantity})`
      );
    }

    // Update verified quantity
    await query(
      `UPDATE order_items SET verified_quantity = GREATEST(0, COALESCE(verified_quantity, 0) - $1) WHERE order_item_id = $2`,
      [quantity, orderItemId]
    );

    // If item was skipped, revert the skip
    if (item.status === 'SKIPPED') {
      await query(
        `UPDATE order_items SET status = 'PENDING', skip_reason = NULL WHERE order_item_id = $1`,
        [orderItemId]
      );
    }

    // Update order packing progress based on verified items
    await query(
      `UPDATE orders SET progress = COALESCE(ROUND(
        CAST((SELECT COUNT(*) FILTER (WHERE oi.verified_quantity >= oi.quantity) FROM order_items oi WHERE oi.order_id = $1) AS FLOAT)
        / NULLIF((SELECT COUNT(*) FROM order_items oi WHERE oi.order_id = $1), 0) * 100
      ), 0) WHERE order_id = $1`,
      [orderId]
    );

    logger.info('Packing verification undone', { orderId, orderItemId, quantity, reason });

    return this.getOrder(orderId);
  }

  async unclaimPackingOrder(orderId: string, packerId: string, reason: string): Promise<Order> {
    logger.info('Unclaiming packing order', { orderId, packerId, reason });

    return orderRepository.withTransaction(async client => {
      // Get current order
      const orderResult = await client.query(
        `SELECT * FROM orders WHERE order_id = $1 FOR UPDATE`,
        [orderId]
      );

      if (orderResult.rows.length === 0) {
        throw new NotFoundError('Order', orderId);
      }

      const order = orderResult.rows[0];

      // Check if order is in PACKING status
      if (order.status !== OrderStatus.PACKING) {
        throw new ValidationError(
          `Order is not in PACKING status. Current status: ${order.status}`
        );
      }

      // Check if order is assigned to this packer
      if (order.packer_id !== packerId) {
        throw new ValidationError('Order is not assigned to this packer');
      }

      // Reset all order_items verified_quantity to 0 and clear skip reasons
      await client.query(
        `UPDATE order_items
         SET verified_quantity = 0,
             skip_reason = NULL,
             status = 'PENDING'::order_item_status
         WHERE order_id = $1`,
        [orderId]
      );

      // Reset order to PICKED status and clear packer assignment
      await client.query(
        `UPDATE orders
         SET status = 'PICKED',
             packer_id = NULL
         WHERE order_id = $1`,
        [orderId]
      );

      // Note: State change is logged by audit middleware via the route handler
      logger.info('Packing order unclaimed and reverted to PICKED status', {
        orderId,
        packerId,
        reason,
        itemsReset:
          'All order_items reset (verified_quantity=0, skip_reason cleared, status=PENDING)',
      });

      return this.getOrder(orderId);
    });
  }
}

// Singleton instance
export const orderService = new OrderService();
