# Activity Tracking Implementation Guide

## Summary

**Good news:** The backend infrastructure for activity tracking is **already complete**! The system has everything needed to track picker activity and show accurate ACTIVE/IDLE status.

## What's Already Implemented ✅

### 1. Backend API Endpoint

**Location:** `packages/backend/src/routes/auth.ts`

- **Endpoint:** `POST /api/auth/current-view`
- **Purpose:** Updates `current_view` and `current_view_updated_at` in database
- **Authentication:** Required (Bearer token)

### 2. Backend Service Method

**Location:** `packages/backend/src/services/AuthService.ts`

```typescript
async updateCurrentView(userId: string, view: string): Promise<void> {
  await query(
    `UPDATE users
     SET current_view = $1,
         current_view_updated_at = NOW()
     WHERE user_id = $2`,
    [view, userId]
  );
}
```

### 3. Metrics Service

**Location:** `packages/backend/src/services/MetricsService.ts`

- **Endpoint:** `GET /api/metrics/picker-activity`
- **Logic:** Checks `current_view_updated_at` timestamp
- **Timeout:** 5 minutes of inactivity = IDLE status
- **Activity Detection:** Considers both page view and order status

## What's Missing ❌

**Frontend Integration:** The frontend is NOT calling the activity endpoint when buttons are pressed.

## Frontend Implementation Required

### Step 1: Create Activity Tracking Helper

Create `packages/frontend/src/services/activityTracker.ts`:

```typescript
import axios from 'axios';

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

/**
 * Updates the current page/view for activity tracking
 * Call this whenever a user interacts with the application
 *
 * @param view - Descriptive name of the current page/view
 * @param token - JWT access token
 */
export async function trackActivity(
  view: string,
  token: string
): Promise<void> {
  try {
    await axios.post(
      `${API_BASE_URL}/api/auth/current-view`,
      { view },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('Failed to track activity:', error);
    // Don't throw - tracking failures shouldn't block user actions
  }
}
```

### Step 2: Call Activity Tracker on Button Presses

For **ALL** button interactions that represent user activity:

```typescript
import { trackActivity } from '@/services/activityTracker';

// Example: Order Queue Page - Claim Button
const handleClaimOrder = async (orderId: string) => {
  await claimOrder(orderId); // Your existing API call

  // NEW: Track this activity
  await trackActivity('Order Queue', token);
};

// Example: Picking Screen - Continue Button
const handleContinuePicking = async () => {
  await updatePickTask(pickTaskId); // Your existing API call

  // NEW: Track this activity
  await trackActivity('Picking Screen', token);
};

// Example: Picking Screen - Mark as Pending
const handleMarkPending = async () => {
  await markItemPending(pickTaskId); // Your existing API call

  // NEW: Track this activity
  await trackActivity('Picking Screen', token);
};

// Example: Order Details Page
const handleViewOrder = (orderId: string) => {
  // Navigate to order details
  navigate(`/orders/${orderId}`);

  // NEW: Track this activity
  trackActivity(`Order Details: ${orderId}`, token);
};
```

### Step 3: Page Load Tracking

Track when pages load to maintain activity status:

```typescript
import { useEffect } from 'react';
import { trackActivity } from '@/services/activityTracker';

function OrderQueuePage() {
  const token = useAuthStore(state => state.token);

  useEffect(() => {
    // Track page load
    trackActivity('Order Queue', token);
  }, [token]);

  // ... rest of component
}

function PickingScreen({ orderId }) {
  const token = useAuthStore(state => state.token);

  useEffect(() => {
    // Track page load with order ID
    trackActivity(`Picking Screen: ${orderId}`, token);
  }, [orderId, token]);

  // ... rest of component
}
```

## Recommended View Names

Use descriptive, consistent view names for better tracking:

### Order Queue

- `Order Queue` - When viewing the order list
- `Order Queue: Filtering` - When applying filters

### Picking Screen

- `Picking Screen` - General picking view
- `Picking Screen: ORD-20250115-0001` - Specific order being picked
- `Picking Screen: Skipped Items` - Viewing skipped items

### Order Details

- `Order Details: ORD-20250115-0001` - Viewing specific order

### Other Pages

- `Dashboard` - Main dashboard
- `Inventory` - Inventory management
- `Reports` - Reports page

## How It Works

### 1. User Activity Flow

```
User presses button → Frontend calls trackActivity() →
Backend updates current_view and current_view_updated_at →
MetricsService checks timestamp →
If < 5 minutes ago → Status = ACTIVE
If > 5 minutes ago → Status = IDLE
```

### 2. Metrics Service Logic

The `MetricsService.getPickerActivity()` method determines status as follows:

```typescript
// 1. Check current_view_updated_at timestamp
const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);

// 2. Determine status based on page and activity
if (isOrderQueue) {
  // On order queue: ACTIVE only if recent activity
  status = currentViewUpdated >= fiveMinutesAgo ? 'ACTIVE' : 'IDLE';
} else if (isPickingScreen) {
  // On picking screen: ACTIVE if recent activity OR has active order
  status =
    hasActiveOrder || currentViewUpdated >= fiveMinutesAgo ? 'ACTIVE' : 'IDLE';
} else if (hasActiveOrder) {
  // Has active PICKING order: ACTIVE
  status = 'ACTIVE';
} else {
  // No activity, no order: IDLE
  status = 'IDLE';
}
```

### 3. Timeout Configuration

**Current timeout:** 5 minutes

To change the timeout window, edit `MetricsService.ts`:

```typescript
// Line ~272 in MetricsService.ts
const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
// Change 5 to desired minutes
```

## Testing

### Manual Testing Steps

1. **Start the application**

   ```bash
   # Terminal 1: Backend
   cd packages/backend && npm run dev

   # Terminal 2: Frontend
   cd packages/frontend && npm run dev
   ```

2. **Login as a picker user**

3. **Open Dashboard**
   - Check picker status should be IDLE (no activity yet)

4. **Press any button (Claim, Continue, etc.)**
   - Picker status should change to ACTIVE
   - Status stays ACTIVE for 5 minutes

5. **Wait 6 minutes without pressing any buttons**
   - Picker status should change to IDLE

6. **Press a button again**
   - Picker status should change back to ACTIVE

### API Testing

Use the test script:

```bash
cd packages/backend
node test-activity-endpoint.js
```

**Note:** The test script uses admin credentials. If admin password differs, update the credentials in the script.

## Benefits of This Approach

✅ **Explicit Control:** Frontend decides what counts as "activity"  
✅ **Easy to Debug:** Clear API calls and database updates  
✅ **Clean Separation:** Tracking separate from business logic  
✅ **Flexible:** Easy to add tracking to new features  
✅ **Accurate:** Real-time activity detection with 5-minute window

## Alternative Approaches (Rejected)

### ❌ Heartbeat Mechanism

- **Problem:** Requires frequent API calls (every 30-60 seconds)
- **Problem:** More complex frontend implementation
- **Problem:** Higher server load

### ❌ Database Triggers

- **Problem:** Harder to test and debug
- **Problem:** Database-specific implementation
- **Problem:** Less control over what counts as activity

## Database Schema

The `users` table already has the required columns:

```sql
CREATE TABLE users (
  -- ... other columns ...
  current_view VARCHAR(255),
  current_view_updated_at TIMESTAMP,
  -- ... other columns ...
);
```

## Security

The activity endpoint requires:

- ✅ JWT authentication
- ✅ CSRF protection (via Origin header validation)
- ✅ Rate limiting (via write operation rate limiter)

## Performance Considerations

- **API calls:** One extra call per button press (minimal overhead)
- **Database updates:** Single UPDATE query per activity
- **Impact:** Negligible for normal usage patterns
- **Scalability:** Handles hundreds of concurrent users easily

## Troubleshooting

### Picker Always Shows IDLE

**Cause:** Frontend not calling trackActivity()  
**Solution:** Add trackActivity() calls to button handlers

### Picker Shows ACTIVE When Idle

**Cause:** Activity being tracked when it shouldn't  
**Solution:** Only call trackActivity() for meaningful interactions

### "Invalid Origin" Error

**Cause:** Missing Origin header in API calls  
**Solution:** Ensure axios includes Origin header (automatic for browser calls)

### Status Changes Too Quickly

**Cause:** Timeout window too short  
**Solution:** Increase timeout in MetricsService.ts (line ~272)

## Conclusion

The backend is fully implemented and ready. The only remaining work is to add `trackActivity()` calls in the frontend when users interact with buttons. This is a straightforward integration that will provide accurate, real-time picker activity tracking.

**Estimated Frontend Work:** 2-4 hours

- 30 min: Create activityTracker service
- 2-3 hours: Add tracking to all button interactions
- 30 min: Test and verify
