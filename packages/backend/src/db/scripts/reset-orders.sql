-- Reset all orders to claimable state
-- This fixes orders stuck in wrong states and resets picker assignments

-- Reset orders stuck in PICKING status without a picker
UPDATE orders
SET status = 'PENDING',
    picker_id = NULL,
    claimed_at = NULL
WHERE status = 'PICKING' 
  AND (picker_id IS NULL OR picker_id = '');

-- Reset orders in PICKING status (clear all picker assignments)
-- This helps if orders are stuck because the assigned user can't claim
UPDATE orders
SET status = 'PENDING',
    picker_id = NULL,
    claimed_at = NULL
WHERE status = 'PICKING';

-- Delete orphaned pick tasks (tasks without valid orders)
DELETE FROM pick_tasks
WHERE order_id NOT IN (SELECT order_id FROM orders);

-- Verify the changes
SELECT 
    order_id,
    status,
    picker_id,
    customer_name,
    priority,
    created_at
FROM orders
WHERE status = 'PENDING'
ORDER BY priority DESC, created_at ASC
LIMIT 10;

-- Show order ORD-20260112-7802 specifically
SELECT 
    order_id,
    status,
    picker_id,
    CASE 
        WHEN status = 'PENDING' AND picker_id IS NULL THEN 'Can be claimed: YES'
        ELSE 'Can be claimed: NO'
    END as claimable
FROM orders
WHERE order_id = 'ORD-20260112-7802';