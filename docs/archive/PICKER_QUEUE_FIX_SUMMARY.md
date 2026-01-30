# Picker Queue Fix Summary

## Issue

Order ORD-20260114-5978 (Prime Electronics) was not appearing in the picker's order queue, even though:

- Status was PENDING
- Progress was 0%
- It had 2 order items in the order_items table

## Root Cause

The order had **0 pick tasks** in the pick_tasks table. The picker queue query uses an INNER JOIN on the pick_tasks table:

```sql
FROM orders o
INNER JOIN order_items oi ON o.order_id = oi.order_id
INNER JOIN pick_tasks pt ON o.order_id = pt.order_id
WHERE o.status IN ('PENDING', 'PICKING')
  AND o.progress < 100
```

Since it was an INNER JOIN, orders without pick tasks were automatically excluded from the results.

## Solution

Generated missing pick tasks for the order:

- Order had 2 items:
  - WMS-001 (Qty: 4) → Generated 4 pick tasks
  - WMS-003 (Qty: 2) → Generated 2 pick tasks
- Total: 6 pick tasks generated

## Verification

After generating the pick tasks:

- ✅ Order passes all queue query conditions
- ✅ Order now appears in picker queue (position 8 of 9)
- ✅ Pickers can now see and claim the order

## Prevention

This issue occurred because pick tasks were not created when the order was initially created. To prevent this in the future:

1. **Ensure order creation process always generates pick tasks** - The backend should automatically create pick tasks when an order is created with items.

2. **Add validation** - Consider adding a check during order creation to verify that pick tasks are successfully generated before marking the order as ready for picking.

3. **Monitor for orphaned orders** - Create a periodic check for orders that have items but no pick tasks, and auto-generate the missing tasks.

## Files Modified/Created

- `packages/backend/generate-missing-pick-tasks.js` - Script to generate missing pick tasks for an order
- `packages/backend/check-order-simple.js` - Diagnostic script to check order status and queue eligibility
- `packages/backend/test-picker-queue.js` - Script to test the picker queue query

## Next Steps for the User

1. **Refresh the picker dashboard** - The order should now be visible
2. **Test the order** - Have a picker claim and work on the order to ensure everything works end-to-end
3. **Check other orders** - There may be other orders in the system with the same issue. Consider running the generate-missing-pick-tasks.js script for other orders that aren't showing up.

## Command to Fix Other Orders

To fix other orders with missing pick tasks:

```bash
node packages/backend/generate-missing-pick-tasks.js ORD-<ORDER_ID>
```

Replace `ORD-<ORDER_ID>` with the actual order ID that needs fixing.
