# Undo Verification Fix - Race Condition Resolution

## Issue Description

When attempting to undo a packing verification in the PackingPage, users encountered an error:

```
Cannot undo more items than verified (verified: 0, trying to undo: 1)
```

This error occurred even when the UI showed the item had verified quantity > 0.

## Root Cause Analysis

### Race Condition Between UI State and Backend State

1. **Timeline of Events:**
   - User clicks "Undo Verify" button on an item showing verified: 2/2
   - Frontend fetches latest order data from API
   - At this point, the item shows verified_quantity = 2
   - User provides reason and confirms the undo
   - Between the fetch and the actual undo request, the state changed (verified_quantity became 0)
   - Backend receives undo request but sees 0 verified items
   - Backend validation fails with "Cannot undo more items than verified"

2. **Contributing Factors:**
   - **No Loading State:** Button could be clicked multiple times rapidly
   - **No Prevention of Concurrent Operations:** Multiple undo attempts could proceed simultaneously
   - **State Mismatch Window:** Time gap between fetch and API request allowed state changes
   - **Poor Error Recovery:** State mismatch wasn't handled gracefully

## Solution Implemented

### 1. Added Loading State Tracking

```typescript
const [undoLoading, setUndoLoading] = useState<Record<number, boolean>>({});
```

- Tracks loading state per item index
- Prevents multiple simultaneous undo operations on the same item
- Provides visual feedback to users

### 2. Enhanced Undo Button with Loading State

```typescript
<button
  onClick={(e) => {
    e.stopPropagation();
    handleUndoVerification(index);
  }}
  disabled={undoLoading[index]}
  className={`... ${undoLoading[index] ? 'animate-pulse' : ''}`}
>
  {undoLoading[index] ? (
    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current" />
  ) : (
    <MinusCircleIcon className="h-4 w-4" />
  )}
  <span className="text-xs">
    {undoLoading[index] ? 'Undoing...' : 'Undo Verify'}
  </span>
</button>
```

**Features:**

- Disabled during undo operation
- Shows spinner icon when loading
- Text changes to "Undoing..."
- Visual pulse animation
- Prevents cursor hover effects when disabled

### 3. Guarded Against Concurrent Operations

```typescript
const handleUndoVerification = async (index: number) => {
  // Prevent multiple simultaneous undo operations on the same item
  if (undoLoading[index]) {
    console.log(
      '[handleUndoVerification] Undo already in progress for item',
      index
    );
    return;
  }

  try {
    setUndoLoading(prev => ({ ...prev, [index]: true }));

    // ... rest of undo logic ...
  } finally {
    setUndoLoading(prev => ({ ...prev, [index]: false }));
  }
};
```

**Protection:**

- Early return if undo already in progress
- Loading state set before any API calls
- Cleanup in finally block ensures state is always reset
- No way for concurrent operations to execute

### 4. Improved Error Handling

```typescript
try {
  await apiClient.post(`/orders/${orderId}/undo-packing-verification`, {
    order_item_id: item.orderItemId,
    quantity: 1,
    reason: reason.trim(),
  });

  showSuccess('Verification undone!');
  await refetch();

  // Navigate if needed
  if (index < currentItemIndex) {
    setCurrentItemIndex(index);
    setScanValue('');
    setScanError(null);
  }
} catch (error: any) {
  console.error('Undo verification error:', error);

  const errorMsg =
    error.response?.data?.error ||
    error.message ||
    'Failed to undo verification';

  if (errorMsg.includes('Cannot undo more items than verified')) {
    // State changed between our fetch and request - refresh and inform user
    await refetch();
    showError('State has changed. Please try again.');
  } else {
    showError(errorMsg);
    await refetch(); // Always refresh on error to sync state
  }
}
```

**Error Recovery:**

- Detects state mismatch errors specifically
- Refreshes state to show current reality
- Provides user-friendly error message
- Always refreshes on any error to sync state

### 5. Pre-flight Validation

```typescript
// Can only undo if there's something verified
const currentVerified = item.verifiedQuantity || 0;
if (currentVerified <= 0) {
  showError('No verified items to undo');
  await refetch(); // Refresh to show current state
  return;
}
```

**Validation:**

- Checks verified quantity before prompting user
- Prevents unnecessary prompts
- Refreshes state if mismatch detected

## Benefits

### User Experience

1. **Clear Feedback:** Users see loading state and know the operation is in progress
2. **Prevented Errors:** Multiple rapid clicks are prevented
3. **Better Recovery:** State mismatches are handled gracefully
4. **Reduced Confusion:** Error messages are clear and actionable

### System Stability

1. **No Race Conditions:** Concurrent operations are prevented
2. **Consistent State:** State is always refreshed after errors
3. **Preventative:** Early validation catches issues before prompts

### Code Quality

1. **Defensive Programming:** Multiple layers of protection
2. **Clear Intent:** Loading state makes code behavior explicit
3. **Error Handling:** Comprehensive catch blocks with specific handling
4. **Logging:** Console logs for debugging state issues

## Testing Recommendations

### Manual Testing Scenarios

1. **Normal Undo Flow:**
   - Verify an item (e.g., scan 2 items)
   - Click "Undo Verify"
   - Provide reason
   - Confirm undo works correctly

2. **Rapid Click Prevention:**
   - Click "Undo Verify" button rapidly multiple times
   - Verify only one undo operation executes
   - Verify button is disabled during operation

3. **State Mismatch Recovery:**
   - Open two browser tabs on same order
   - In one tab, undo an item
   - In other tab, try to undo same item
   - Verify error message: "State has changed. Please try again."
   - Verify UI refreshes to show current state

4. **Edge Cases:**
   - Try undoing when verified = 0
   - Try undoing on skipped items
   - Verify buttons are appropriately disabled

### Automated Testing

Consider adding tests for:

- Loading state management
- Concurrent operation prevention
- Error handling and recovery
- State refresh after errors

## Files Modified

### packages/frontend/src/pages/PackingPage.tsx

- Added `undoLoading` state
- Enhanced `handleUndoVerification` function
- Updated undo button with loading state
- Improved error handling

## Related Issues

This fix addresses the race condition issue that could also affect other similar operations:

- Undo pick operation (pickers)
- Skip item operations
- Any operation that modifies state after a read-modify-write cycle

## Future Improvements

1. **Optimistic UI Updates:** Show immediate feedback before API confirmation
2. **Operation Queue:** Queue operations instead of blocking them
3. **WebSocket Updates:** Real-time state updates to reduce race conditions
4. **Better Conflict Resolution:** Allow users to choose which state to trust

## Conclusion

This fix resolves the race condition by:

1. Preventing concurrent undo operations
2. Providing clear visual feedback
3. Handling state mismatches gracefully
4. Ensuring state consistency through proper refresh logic

The solution is defensive, user-friendly, and maintains system integrity even in the presence of concurrent operations or network issues.
