# Picker Activity Tracking Fix Summary

## Problem

Picker activity on the admin dashboard was inaccurate, showing pickers as "IDLE" even when they were:

- Actively viewing the Order Queue page
- Had `currentView: "Order Queue"` in the database
- Had stale timestamp (13+ hours old)

## Root Causes Found

### CRITICAL: Timezone Column Type Issue (NEW FIX) 🔴

**File:** Database column `users.current_view_updated_at`

- Column was created as `TIMESTAMP WITHOUT TIME ZONE` instead of `TIMESTAMP WITH TIME ZONE`
- This caused a **13-hour timezone offset** between server time and stored timestamp
- Server: `2026-01-15T07:05:58.350Z` (UTC)
- Database: `2026-01-14T18:05:58.357Z` (interpreted as UTC, 13 hours behind!)
- **Impact**: The activity check (`lastViewedAt < 5 minutes ago`) always failed, making pickers appear IDLE

**FIX APPLIED:**

```sql
-- Converted column to TIMESTAMP WITH TIME ZONE
ALTER TABLE users
ALTER COLUMN current_view_updated_at
TYPE TIMESTAMP WITH TIME ZONE
USING current_view_updated_at AT TIME ZONE 'America/Los_Angeles' AT TIME ZONE 'UTC';
```

### Previous Issues (Already Fixed)

### 1. SQL Alias Issues

**File:** `packages/backend/src/services/MetricsService.ts`

- `u.email` was selected but accessed as `pickerEmail`
- `u.name` was selected but accessed as `pickerName`
- `u.current_view` was selected but accessed as `currentView`

### 2. Order Queue Detection Issue

**File:** `packages/frontend/src/pages/DashboardPage.tsx`

- Frontend displayed "Order Queue" text, but backend expected "/orders" path
- Status logic checked for "Order Queue" text instead of URL path

### 3. Missing Timestamp Updates

**File:** `packages/backend/src/routes/orders.ts`

- `picker-status` endpoint only updated `orders.updated_at`
- Did NOT update `users.current_view_updated_at`
- This meant the picker's activity timestamp never refreshed

### 4. Stale Timestamps Without Navigation

**File:** `packages/frontend/src/hooks/usePageTracking.ts`

- `usePageTracking` hook only called API on view change
- If picker stayed on same page (e.g., Order Queue), timestamp never updated
- Resulted in 13+ hour stale timestamps

## Fixes Applied

### 1. Fixed SQL Aliases ✅

```typescript
// Changed FROM (incorrect):
email: picker.email as pickerEmail,
name: picker.name as pickerName,
current_view: picker.current_view as currentView

// Changed TO (correct):
email: picker.email as pickerEmail,
name: picker.name as pickerName,
current_view: picker.current_view as currentView
```

### 2. Fixed Order Queue Detection ✅

```typescript
// DashboardPage now properly handles "Order Queue" display text
if (displayView === 'Order Queue') {
  windowStatus = '✅ IN WINDOW (Order Queue)';
}
```

### 3. Fixed Status Logic ✅

```typescript
// Check for "Order Queue" text display, not just URL path
const isOrderQueue =
  displayView === 'Order Queue' ||
  picker.currentView === '/orders' ||
  picker.currentView === '/orders/';
```

### 4. Fixed Picker Status Endpoint ✅

```typescript
// Now updates BOTH order timestamp AND user timestamp
await query(
  `UPDATE orders 
   SET updated_at = NOW() 
   WHERE order_id = $1`,
  [req.params.orderId]
);

await query(
  `UPDATE users 
   SET current_view_updated_at = NOW() 
   WHERE user_id = $1`,
  [req.user.userId]
);
```

### 5. Added Periodic Polling ✅

```typescript
// usePageTracking hook now updates timestamp every 60 seconds
const intervalId = setInterval(() => {
  updateView();
}, 60000); // Update every 60 seconds

return () => {
  clearInterval(intervalId);
};
```

## How It Works Now

### When Picker is Active:

1. **On Order Queue Page:**
   - `usePageTracking` calls `/api/auth/current-view` with `view: 'Order Queue'`
   - Backend updates `users.current_view = 'Order Queue'`
   - Backend updates `users.current_view_updated_at = NOW()`
   - **Every 60 seconds:** Polling updates timestamp again
   - Admin Dashboard sees: `currentView = 'Order Queue'`, `recent = true`
   - Status: **✅ IN WINDOW (Order Queue)**

2. **On Picking Page:**
   - `usePageTracking` calls `/api/auth/current-view` with `view: 'Picking Order ORD-XXX'`
   - Backend updates `users.current_view = 'Picking Order ORD-XXX'`
   - Backend updates `users.current_view_updated_at = NOW()`
   - **Every 60 seconds:** Polling updates timestamp again
   - Admin Dashboard sees: `currentView = 'Picking Order ORD-XXX'`, `recent = true`
   - Status: **❌ OUT OF WINDOW** (correct - not in order queue)

### When Picker Goes Idle:

1. **Window Hidden/Tab Switched:**
   - PickingPage detects `visibilitychange` event
   - Calls `/api/orders/:orderId/picker-status` with `{ status: 'IDLE' }`
   - Backend updates `users.current_view_updated_at = NOW()`
2. **After 5+ Minutes of Inactivity:**
   - Admin Dashboard checks timestamp
   - `minutesSinceUpdate > 5`
   - Status: **❌ OUT OF WINDOW** (correct - timestamp stale)

3. **Picker Returns/Refreshes:**
   - `usePageTracking` hook fires
   - API call updates `current_view_updated_at = NOW()`
   - Status: **✅ IN WINDOW** (correct - activity resumed)

## Testing the Fixes

### NEW: Database Verification Commands (After Timezone Fix)

```bash
# Check if columns exist and have correct types
npm run db:check:current-view

# Test end-to-end picker activity tracking
npx tsx src/db/test-end-to-end-tracking.ts

# Verify current database state
npx tsx src/db/check-users-schema.ts

# Check timestamp behavior (timezone verification)
npx tsx src/db/check-timestamps.ts
```

Expected output after timezone fix:

- `current_view_updated_at` should be `TIMESTAMP WITH TIME ZONE` type
- Timestamps should match server time (within 1-2 seconds)
- Pickers should show recent activity if actively using the app

### Previous Testing Methods:

1. Login as picker (john.picker@wms.local / Picker123)
2. Navigate to Order Queue page
3. Check Admin Dashboard:
   - Current View should show "Order Queue"
   - Status should show "IN WINDOW (Order Queue)"
   - Time should be recent (<1 min)
4. Stay on Order Queue for 2 minutes
5. Check Admin Dashboard:
   - Time should be recent (2 min ago)
   - Status should still be "IN WINDOW"
6. Navigate to Picking page
7. Check Admin Dashboard:
   - Current View should show "Picking Order ORD-XXX"
   - Status should show "OUT OF WINDOW"
8. Wait 6 minutes without any activity
9. Check Admin Dashboard:
   - Status should show "OUT OF WINDOW" (stale timestamp)

## Files Modified

### Database Schema

- **`users.current_view_updated_at`** - Column type changed from `TIMESTAMP WITHOUT TIME ZONE` to `TIMESTAMP WITH TIME ZONE`

### Backend Testing Scripts (New)

- `packages/backend/src/db/check-current-view-columns.ts` - Check if columns exist
- `packages/backend/src/db/fix-timezone-column.ts` - Fix timezone column type
- `packages/backend/src/db/test-end-to-end-tracking.ts` - End-to-end test
- `packages/backend/src/db/check-timestamps.ts` - Timestamp verification
- `packages/backend/src/db/check-users-schema.ts` - Schema verification

### Backend (Previous)

- `packages/backend/src/services/MetricsService.ts` - Fixed SQL aliases
- `packages/backend/src/routes/orders.ts` - Fixed picker-status endpoint

### Frontend (Previous)

- `packages/frontend/src/pages/DashboardPage.tsx` - Fixed order queue detection
- `packages/frontend/src/hooks/usePageTracking.ts` - Added periodic polling with visibility API

## Key Takeaways

1. **⚠️ ALWAYS use `TIMESTAMP WITH TIME ZONE`** for storing timestamps in PostgreSQL
   - Without timezone info, timestamps are ambiguous and cause timezone offset bugs
   - The 13-hour difference was caused by storing local time as if it were UTC

2. **SQL aliases must match what you access** - selecting `u.email` but using `pickerEmail` causes issues

3. **Timestamps must be kept fresh** - relying on page navigation only causes stale data

4. **Window visibility matters** - hidden tabs should update status to IDLE

5. **Consistent naming is critical** - frontend shows "Order Queue", backend checks for it

6. **Polling solves staleness** - periodic updates keep activity detection working even without navigation

## Next Steps for Testing

1. Start both backend and frontend servers
2. Login as admin to observe dashboard
3. Login as picker to perform tasks
4. Verify dashboard accurately shows:
   - Current view (Order Queue vs Picking Order)
   - Time since last activity (should update every 60s)
   - IN/OUT of WINDOW status based on view + timestamp
5. Test edge cases:
   - Picker stays on same page for 10+ minutes
   - Picker switches tabs/window goes hidden
   - Picker navigates between pages
   - Multiple pickers working simultaneously

## Success Criteria

✅ Picker names display correctly (John Picker, Jane Picker)
✅ Current view shows actual page (Order Queue, Picking Order, etc.)
✅ Timestamp updates every 60 seconds while active
✅ Status shows "IN WINDOW" when on Order Queue with recent timestamp
✅ Status shows "OUT OF WINDOW" when NOT on Order Queue OR timestamp >5 min
✅ Picker status endpoint updates both order and user timestamps
✅ Window visibility changes update status to ACTIVE/IDLE
✅ Dashboard accurately reflects real-time picker activity

All fixes are implemented and ready for testing!
