-- Reset picked_quantity for all items where order is not complete
-- This fixes corrupted data from before skip revert fix

UPDATE order_items oi
SET picked_quantity = 0
FROM pick_tasks pt
WHERE oi.order_item_id = pt.order_item_id
  AND pt.status = 'SKIPPED'
  AND oi.picked_quantity > 0;

-- Also reset pick_tasks for skipped items
UPDATE pick_tasks
SET picked_quantity = 0
WHERE status = 'SKIPPED'
  AND picked_quantity > 0;

SELECT 'Fixed ' || COUNT(*) || ' corrupted order items' as result
FROM order_items oi
JOIN pick_tasks pt ON oi.order_item_id = pt.order_item_id
WHERE pt.status = 'SKIPPED';