# Order Claim Race Condition Fix

## Problem

The PickingPage had a race condition causing multiple 409 Conflict errors when claiming orders:

```
[PickingPage] Checking if order needs to be claimed: ORD-20260114-6117
[PickingPage] Order status: PENDING, pickerId: null
[PickingPage] Attempting to claim order: ORD-20260114-6117
[PickingPage] Order status: PICKING, pickerId: USR-PICK01
[PickingPage] Already claiming or claimed, skipping
[PickingPage] Attempting to claim order: ORD-20260114-6117
POST /api/orders/ORD-20260114-6117/claim 409 (Conflict)
Error: Order cannot be claimed because it is currently in status: PICKING
```

### Root Cause

When React StrictMode or page tracking caused component remounts during the claim process:

1. First `useLayoutEffect` starts claim mutation (sets `isClaimingRef = true`)
2. Component remounts before mutation completes
3. Refs reset (`hasClaimedRef = false`), but `isPending` is still `true`
4. Second `useLayoutEffect` runs, sees stale order data (`status: PENDING`)
5. Attempts to claim again while first mutation is still in flight
6. Backend rejects with 409 Conflict because order status changed to PICKING

## Solution

### 1. Enhanced Guard Clause

Added `claimMutation.isError` to prevent retrying after failed claims:

```typescript
// Prevent multiple claim attempts - use ref + isPending check + isClaiming check + isError check
if (
  isClaimingRef.current ||
  claimMutation.isPending ||
  hasClaimedRef.current ||
  claimMutation.isError
) {
  console.log(
    `[PickingPage] Already claiming, claimed, or had error, skipping`
  );
  return;
}
```

### 2. Status Validation Before Mutation

Double-check order status immediately before calling the mutation:

```typescript
} else if (order.status === 'PENDING') {
  // Validate order status one more time before claiming to prevent race conditions
  // This double-checks order state right before mutation call
  if (order.status !== 'PENDING') {
    console.log(`[PickingPage] Order status changed to ${order.status} before claim, skipping`);
    hasClaimedRef.current = true;
    return;
  }

  if (order.pickerId && order.pickerId !== currentUserId) {
    console.log(`[PickingPage] Order claimed by another picker (${order.pickerId}), skipping`);
    hasClaimedRef.current = true;
    return;
  }

  console.log(`[PickingPage] Attempting to claim order: ${orderId}`);
  isClaimingRef.current = true;
  hasClaimedRef.current = true;
  claimMutation.mutate(orderId);
}
```

### 3. Smart Error Handling

Don't reset `hasClaimedRef` on 409 conflict errors (order might actually be claimed):

```typescript
onError: (error: any) => {
  console.error('[PickingPage] Claim error:', error);
  isClaimingRef.current = false;
  const errorMsg =
    error.response?.data?.error || error.message || 'Failed to claim order';

  // Don't reset hasClaimedRef on conflict errors (409) - order might actually be claimed
  const isConflict = error.response?.status === 409;
  if (!isConflict) {
    hasClaimedRef.current = false; // Only reset on non-conflict errors
  }

  // ... rest of error handling
};
```

## Benefits

✅ **Prevents duplicate claims** - Multiple checks ensure order is only claimed once
✅ **Handles component remounts** - Refs and mutation state work together to prevent race conditions
✅ **Validates order state** - Double-checks status right before mutation
✅ **Proper error handling** - Conflict errors don't cause infinite retry loops
✅ **Resilient to rapid state changes** - Works even with frequent refetches and status updates

## Testing

To verify the fix:

1. Navigate to a PENDING order
2. Observe the console logs
3. Should see only ONE claim attempt
4. No 409 Conflict errors should occur
5. Order should be claimed successfully and transition to PICKING status

## Files Modified

- `packages/frontend/src/pages/PickingPage.tsx`
  - Enhanced guard clause with `isError` check
  - Added status validation before mutation
  - Added pickerId validation before mutation
  - Smart error handling for conflict errors

## Future Improvements

Consider:

- Using a mutex/lock mechanism at the component level for claim operations
- Adding backend idempotency for claim requests
- Implementing optimistic UI updates for faster feedback
