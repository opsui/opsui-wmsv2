# NetSuite Integration Optimization Plan

## Executive Summary

This document outlines a comprehensive optimization strategy for the NetSuite integration, focusing on **reliability, speed, and maintainability** following industry standards.

---

## Current Architecture Analysis

### Strengths
- ✅ Token-Based Authentication (TBA) with OAuth 1.0 HMAC-SHA256
- ✅ Proper pagination handling with `searchMoreWithId`
- ✅ Three-phase sync architecture (fetch → upsert → cleanup)
- ✅ Multi-tenant database support
- ✅ Sync job tracking with status
- ✅ Client-side filtering for pending fulfillment orders

### Areas for Improvement
- ⚠️ Sequential processing (no parallelization)
- ⚠️ No retry logic with exponential backoff
- ⚠️ No rate limiting protection
- ⚠️ Manual SOAP XML construction (error-prone)
- ⚠️ No caching between sync cycles
- ⚠️ 1-minute interval may be too aggressive
- ⚠️ No webhook support for real-time updates
- ⚠️ No incremental sync (always fetches last 7 days)

---

## Optimization Recommendations

### 1. 🚀 PERFORMANCE: Parallel Processing

**Problem**: Orders are processed sequentially, limiting throughput.

**Solution**: Implement parallel processing with controlled concurrency.

```typescript
// Before: Sequential
for (const order of orders) {
  await processOrder(order);
}

// After: Parallel with concurrency limit
import pLimit from 'p-limit';

const limit = pLimit(5); // 5 concurrent operations
const results = await Promise.all(
  orders.map(order => limit(() => processOrder(order)))
);
```

**Expected Improvement**: 3-5x faster sync for large batches.

---

### 2. 🔄 RELIABILITY: Retry with Exponential Backoff

**Problem**: Network glitches or temporary NetSuite issues cause sync failures.

**Solution**: Implement retry logic with exponential backoff.

```typescript
async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  baseDelayMs = 1000
): Promise<T> {
  let lastError: Error;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;

      // Don't retry on client errors (4xx equivalent)
      if (error.message?.includes('Invalid credentials')) {
        throw error;
      }

      if (attempt < maxRetries - 1) {
        const delay = baseDelayMs * Math.pow(2, attempt);
        logger.warn(`Retry attempt ${attempt + 1} after ${delay}ms`, { error: error.message });
        await sleep(delay);
      }
    }
  }

  throw lastError;
}
```

---

### 3. ⏱️ RATE LIMITING: Request Throttling

**Problem**: NetSuite has API rate limits that aren't being tracked.

**Solution**: Implement a token bucket rate limiter.

```typescript
class RateLimiter {
  private tokens: number;
  private lastRefill: number;
  private readonly maxTokens: number;
  private readonly refillRate: number; // tokens per second

  constructor(maxTokens = 10, refillRate = 2) {
    this.tokens = maxTokens;
    this.maxTokens = maxTokens;
    this.refillRate = refillRate;
    this.lastRefill = Date.now();
  }

  async acquire(): Promise<void> {
    this.refill();

    if (this.tokens >= 1) {
      this.tokens--;
      return;
    }

    // Wait for next token
    const waitMs = (1 / this.refillRate) * 1000;
    await sleep(waitMs);
    return this.acquire();
  }

  private refill(): void {
    const now = Date.now();
    const elapsed = (now - this.lastRefill) / 1000;
    this.tokens = Math.min(this.maxTokens, this.tokens + elapsed * this.refillRate);
    this.lastRefill = now;
  }
}
```

---

### 4. 💾 CACHING: Persistent Item Cache

**Problem**: Item lookups happen on every sync, causing redundant API calls.

**Solution**: Implement Redis or database-backed caching.

```typescript
interface CachedItem {
  id: string;
  itemId: string;
  displayName: string;
  upcCode: string;
  binNumber: string;
  cachedAt: Date;
  ttl: number; // 24 hours in seconds
}

class ItemCache {
  private readonly TTL_SECONDS = 86400; // 24 hours

  async get(id: string): Promise<CachedItem | null> {
    const result = await pool.query(
      `SELECT * FROM netsuite_item_cache
       WHERE id = $1 AND cached_at > NOW() - INTERVAL '24 hours'`,
      [id]
    );
    return result.rows[0] || null;
  }

  async set(item: CachedItem): Promise<void> {
    await pool.query(
      `INSERT INTO netsuite_item_cache (id, item_id, display_name, upc_code, bin_number, cached_at)
       VALUES ($1, $2, $3, $4, $5, NOW())
       ON CONFLICT (id) DO UPDATE SET
         item_id = EXCLUDED.item_id,
         display_name = EXCLUDED.display_name,
         upc_code = EXCLUDED.upc_code,
         bin_number = EXCLUDED.bin_number,
         cached_at = NOW()`,
      [item.id, item.itemId, item.displayName, item.upcCode, item.binNumber]
    );
  }
}
```

**Database Migration**:
```sql
CREATE TABLE netsuite_item_cache (
  id VARCHAR(50) PRIMARY KEY,
  item_id VARCHAR(100),
  display_name VARCHAR(255),
  upc_code VARCHAR(50),
  bin_number VARCHAR(50),
  cached_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_item_cache_upc ON netsuite_item_cache(upc_code);
CREATE INDEX idx_item_cache_cached ON netsuite_item_cache(cached_at);
```

---

### 5. 📡 REAL-TIME: NetSuite Webhooks (SuiteScripts)

**Problem**: Polling every minute creates unnecessary API load.

**Solution**: Implement NetSuite RESTlet webhook for push notifications.

**NetSuite Side (SuiteScript)**:
```javascript
// NetSuite RESTlet: custscript_wms_webhook
function afterSubmit(type) {
    if (type !== 'create' && type !== 'edit') return;

    var record = nlapiGetNewRecord();
    var readyToShip = record.getFieldValue('custbody8');

    if (readyToShip === 'T') {
        var payload = {
            eventType: 'SALES_ORDER_READY',
            internalId: record.getId(),
            tranId: record.getFieldValue('tranid'),
            timestamp: new Date().toISOString()
        };

        // Call WMS webhook endpoint
        nlapiRequestURL(
            'https://your-wms.com/api/webhooks/netsuite',
            JSON.stringify(payload),
            {'Content-Type': 'application/json'},
            'POST'
        );
    }
}
```

**WMS Side (Webhook Handler)**:
```typescript
// POST /api/webhooks/netsuite
router.post('/netsuite', async (req, res) => {
  const { eventType, internalId, tranId } = req.body;

  // Verify webhook signature
  if (!verifyWebhookSignature(req)) {
    return res.status(401).json({ error: 'Invalid signature' });
  }

  // Trigger immediate sync for this order
  await syncQueue.add('sync-order', {
    internalId,
    priority: 1 // High priority
  });

  res.json({ received: true });
});
```

---

### 6. 🔧 INCREMENTAL SYNC: Delta Updates

**Problem**: Every sync fetches all orders from last 7 days.

**Solution**: Use `lastModifiedDate` with proper incremental sync.

```typescript
async function syncOrders(integrationId: string, options: SyncOptions) {
  const lastSyncAt = await getLastSuccessfulSyncTime(integrationId);

  // Only fetch orders modified since last successful sync
  const dateFrom = lastSyncAt || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const orders = await client.getSalesOrders({
    modifiedAfter: dateFrom,
    status: '_pendingFulfillment'
  });

  // ... process orders
}
```

---

### 7. 🗃️ DATABASE: Batch Upserts

**Problem**: Orders are inserted/updated one at a time.

**Solution**: Use PostgreSQL batch operations with `ON CONFLICT`.

```typescript
async function batchUpsertOrders(orders: Order[], pool: Pool): Promise<void> {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Prepare batch data
    const values = orders.map(o => [
      o.orderId, o.customerName, o.status, o.priority,
      o.netsuite_so_internal_id, o.netsuite_so_tran_id,
      // ... other fields
    ]);

    // Single batch upsert
    const query = `
      INSERT INTO orders (
        order_id, customer_name, status, priority,
        netsuite_so_internal_id, netsuite_so_tran_id
      )
      SELECT * FROM unnest($1::text[], $2::text[], $3::text[], $4::int[],
                          $5::varchar[], $6::varchar[])
      ON CONFLICT (netsuite_so_internal_id) DO UPDATE SET
        customer_name = EXCLUDED.customer_name,
        status = EXCLUDED.status,
        priority = EXCLUDED.priority,
        updated_at = NOW()
    `;

    await client.query(query, [
      values.map(v => v[0]), // order_id array
      values.map(v => v[1]), // customer_name array
      // ... other arrays
    ]);

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
```

---

### 8. 📊 MONITORING: Sync Health Dashboard

**Solution**: Add comprehensive metrics collection.

```typescript
interface SyncMetrics {
  integrationId: string;
  syncStartTime: Date;
  syncEndTime: Date;
  durationMs: number;
  ordersFetched: number;
  ordersProcessed: number;
  ordersFailed: number;
  apiCallsMade: number;
  apiLatencyAvg: number;
  apiLatencyP95: number;
  dbOperations: number;
  cacheHits: number;
  cacheMisses: number;
}

// Track in database for historical analysis
await pool.query(`
  INSERT INTO sync_metrics (
    integration_id, sync_start_time, sync_end_time, duration_ms,
    orders_fetched, orders_processed, orders_failed,
    api_calls_made, api_latency_avg
  ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
`, [...]);
```

---

### 9. 🔌 API: Consider NetSuite REST API

**Problem**: SOAP is verbose and harder to debug.

**Solution**: NetSuite now offers REST API (SuiteTalk REST) which is cleaner.

**Benefits**:
- JSON responses instead of XML
- Better error messages
- Smaller payload sizes
- Easier debugging
- Better tooling support

**Example REST Call**:
```typescript
async function getSalesOrdersREST(modifiedAfter: Date): Promise<SalesOrder[]> {
  const response = await fetch(
    `https://${accountId}.suitetalk.api.netsuite.com/services/rest/record/v1/salesOrder`,
    {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'Prefer': 'transient'
      },
      params: {
        q: `lastModifiedDate AFTER "${modifiedAfter.toISOString()}"`,
        limit: 100
      }
    }
  );

  return response.json().items;
}
```

---

### 10. 🧹 CLEANUP: Stale Order Handling

**Current**: Cancels orders not synced in 5+ minutes.

**Improved**: More sophisticated handling with grace periods.

```typescript
async function cleanupStaleOrders(syncedIds: string[], pool: Pool): Promise<string[]> {
  const staleThreshold = new Date(Date.now() - 30 * 60 * 1000); // 30 minutes

  // Find orders that:
  // 1. Were not in this sync
  // 2. Haven't been synced recently
  // 3. Are not being actively worked on
  const result = await pool.query(`
    UPDATE orders
    SET status = 'CANCELLED',
        cancelled_at = NOW(),
        cancellation_reason = 'NetSuite order no longer available'
    WHERE netsuite_source = 'NETSUITE'
      AND netsuite_so_internal_id != ALL($1)
      AND netsuite_last_synced_at < $2
      AND status IN ('PENDING', 'PICKED')
      AND NOT EXISTS (
        SELECT 1 FROM order_workers ow
        WHERE ow.order_id = orders.order_id
        AND ow.ended_at IS NULL
      )
    RETURNING order_id
  `, [syncedIds, staleThreshold]);

  return result.rows.map(r => r.order_id);
}
```

---

## Implementation Priority

| Priority | Item | Effort | Impact |
|----------|------|--------|--------|
| 🔴 P0 | Retry with Exponential Backoff | Low | High |
| 🔴 P0 | Rate Limiting | Low | High |
| 🟠 P1 | Parallel Processing | Medium | High |
| 🟠 P1 | Batch Database Operations | Medium | High |
| 🟠 P1 | Item Cache | Medium | Medium |
| 🟡 P2 | Incremental Sync | Medium | Medium |
| 🟡 P2 | Sync Metrics | Low | Medium |
| 🟢 P3 | NetSuite Webhooks | High | High |
| 🟢 P3 | REST API Migration | High | Medium |

---

## Quick Wins (Can Implement Today)

### 1. Add Retry Wrapper
```typescript
// utils/retry.ts
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: { maxRetries?: number; baseDelay?: number } = {}
): Promise<T> {
  const { maxRetries = 3, baseDelay = 1000 } = options;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      if (attempt === maxRetries - 1) throw error;

      const delay = baseDelay * Math.pow(2, attempt);
      await new Promise(r => setTimeout(r, delay));
    }
  }
  throw new Error('Max retries exceeded');
}
```

### 2. Increase Sync Interval
```typescript
// Change from 1 minute to 2-3 minutes
const DEFAULT_SYNC_INTERVAL_MS = 2 * 60 * 1000; // 2 minutes
```

### 3. Add Connection Pooling
```typescript
// Ensure database pool is properly sized
const pool = new Pool({
  max: 20, // Increase for parallel processing
  min: 5,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000
});
```

---

## Monitoring Recommendations

1. **Alert on sync failures** - Send Slack/email when sync fails 3+ times
2. **Track sync duration** - Alert if sync takes > 5 minutes
3. **Monitor API latency** - Alert if p95 > 10 seconds
4. **Track order freshness** - Alert if newest order > 10 minutes old during business hours

---

## Testing Strategy

1. **Unit Tests**: Test each service method in isolation
2. **Integration Tests**: Test against NetSuite sandbox
3. **Load Tests**: Simulate 1000+ orders sync
4. **Chaos Tests**: Simulate network failures, timeouts
