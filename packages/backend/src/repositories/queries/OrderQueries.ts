/**
 * Order Query Constants
 *
 * Centralized SQL queries for order-related operations to eliminate duplication
 */

// ============================================================================
// ORDER ITEMS QUERIES
// ============================================================================

/**
 * Query to fetch pick tasks for PICKING orders
 * Used in: getOrderWithItems, getOrderQueue, getOrdersWithItemsByStatus
 */
export const FETCH_PICK_TASKS_WITH_BARCODE_QUERY = `
  SELECT
    pt.pick_task_id as order_item_id,
    pt.order_id,
    pt.sku,
    pt.name,
    pt.target_bin as bin_location,
    pt.quantity,
    pt.picked_quantity as picked_quantity,
    0 as verified_quantity,
    pt.status,
    pt.completed_at,
    s.barcode
  FROM pick_tasks pt
  LEFT JOIN skus s ON pt.sku = s.sku
  WHERE pt.order_id = $1
  ORDER BY pt.pick_task_id ASC
`;

/**
 * Query to fetch order items for non-PICKING orders
 * Used in: getOrderWithItems, getOrderQueue, getOrdersWithItemsByStatus
 */
export const FETCH_ORDER_ITEMS_WITH_BARCODE_QUERY = `
  SELECT
    oi.order_item_id,
    oi.order_id,
    oi.sku,
    oi.name,
    oi.bin_location,
    oi.quantity,
    oi.picked_quantity,
    0 as verified_quantity,
    oi.status,
    s.barcode
  FROM order_items oi
  LEFT JOIN skus s ON oi.sku = s.sku
  WHERE oi.order_id = $1
  ORDER BY oi.order_item_id
`;

// ============================================================================
// PROGRESS CALCULATION QUERIES
// ============================================================================

/**
 * Common CASE expression for calculating order progress
 * Returns progress percentage based on completed pick tasks
 */
export const PROGRESS_CALCULATION = `
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
`;

/**
 * Query to update order progress based on pick task completion
 */
export const UPDATE_ORDER_PROGRESS_QUERY = `
  UPDATE orders
  SET progress = (
    SELECT FLOOR(
      (CAST(COUNT(*) FILTER (WHERE pt.status = 'COMPLETED') AS NUMERIC) /
       NULLIF(COUNT(*), 0)) * 100 + 0.5
    )
    FROM pick_tasks pt
    WHERE pt.order_id = $1
  )
  WHERE order_id = $1
`;

// ============================================================================
// MAPPING HELPERS
// ============================================================================

/**
 * Maps database row to order item camelCase format
 * Handles both pick tasks and order items
 */
export function mapOrderItem(row: any): any {
  return {
    orderItemId: row.order_item_id || row.orderItemId,
    orderId: row.order_id || row.orderId,
    sku: row.sku,
    name: row.name,
    binLocation: row.bin_location || row.binLocation,
    quantity: row.quantity,
    pickedQuantity: row.picked_quantity || row.pickedQuantity,
    verifiedQuantity: row.verified_quantity || row.verifiedQuantity || 0,
    status: row.status,
    skipReason: row.skip_reason || row.skipReason,
    completedAt: row.completed_at || row.completedAt,
    barcode: row.barcode || null,
  };
}

/**
 * Determines which query to use based on order status
 */
export function getOrderItemsQuery(status: string): string {
  if (status === 'PICKING') {
    return FETCH_PICK_TASKS_WITH_BARCODE_QUERY;
  }
  return FETCH_ORDER_ITEMS_WITH_BARCODE_QUERY;
}
