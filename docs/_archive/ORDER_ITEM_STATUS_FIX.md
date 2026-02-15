# Fix for Order Item Status Database Type Error

## Problem

When clicking or scanning an item in an order, the application encountered a PostgreSQL error:

```
column "status" is of type order_item_status but expression is of type text
```

This error occurred in the `POST /api/orders/:orderId/pick` endpoint when trying to update the `order_items.status` field.

## Root Cause

The database trigger `update_order_progress()` was automatically updating the `order_items.status` column based on `picked_quantity` values. However, the trigger was using string literals without explicit type casting to the `order_item_status` enum type, causing PostgreSQL to reject the update.

**Location**: `packages/backend/src/db/schema.sql` (lines ~311-324)

## Solution

Updated the `update_order_progress()` trigger function to explicitly cast status values to the `order_item_status` enum type:

```sql
-- Before (caused error):
SET status = CASE
  WHEN picked_quantity >= quantity THEN 'FULLY_PICKED'
  WHEN picked_quantity > 0 THEN 'PARTIAL_PICKED'
  ELSE 'PENDING'
END

-- After (fixed):
SET status = CASE
  WHEN picked_quantity >= quantity THEN 'FULLY_PICKED'::order_item_status
  WHEN picked_quantity > 0 THEN 'PARTIAL_PICKED'::order_item_status
  ELSE 'PENDING'::order_item_status
END
```

## Files Modified

1. **packages/backend/trigger-fix-simple.js** - Migration script that was applied
2. **packages/backend/fix-order-item-status-trigger.sql** - SQL migration file
3. **packages/backend/src/db/schema.sql** - Updated schema with the fix
4. **packages/backend/src/migrations/fix-order-item-status-trigger.ts** - TypeScript migration

## Changes Made

### Applied Migration

✅ Dropped old `trigger_update_order_progress` trigger
✅ Dropped old `update_order_progress()` function
✅ Recreated `update_order_progress()` function with explicit enum casting
✅ Recreated `trigger_update_order_progress` trigger

### Database Impact

- The trigger now correctly handles `order_item_status` enum values
- Order item status updates automatically when `picked_quantity` changes
- Status values transition correctly: `PENDING` → `PARTIAL_PICKED` → `FULLY_PICKED`

## Testing

To verify the fix works:

1. **Start the backend server** (if not running):

   ```bash
   npm run dev
   ```

2. **Start the frontend** (if not running):

   ```bash
   cd packages/frontend
   npm run dev
   ```

3. **Test picking an item**:
   - Login as a picker
   - Claim an order
   - Click or scan an item in the picking page
   - Verify the item is picked without errors

4. **Verify database state**:

   ```sql
   -- Check order item status
   SELECT order_item_id, sku, quantity, picked_quantity, status
   FROM order_items
   WHERE order_id = 'ORD-20260114-0001';

   -- Status should be:
   - 'PENDING' when picked_quantity = 0
   - 'PARTIAL_PICKED' when 0 < picked_quantity < quantity
   - 'FULLY_PICKED' when picked_quantity >= quantity
   ```

## Rollback (if needed)

If you need to rollback this change:

```bash
node "c:\Users\Heinricht\Documents\Warehouse Management System\packages\backend\apply-trigger-fix.js"
```

Or manually execute:

```sql
DROP TRIGGER IF EXISTS trigger_update_order_progress ON order_items;
DROP FUNCTION IF EXISTS update_order_progress();
```

Then re-run the original schema if needed.

## Future Deployments

The fix has been incorporated into `packages/backend/src/db/schema.sql`, so:

- Fresh database installations will automatically have the fix
- No additional migrations needed for new deployments
- The fix is now part of the canonical schema

## Related Issues

This fix resolves the 500 Internal Server Error that occurred when:

- Clicking on items in the picking interface
- Scanning item barcodes
- Any operation that updates `order_items.picked_quantity`

The error was a database constraint violation, not a code logic error, so all related functionality should now work correctly.
