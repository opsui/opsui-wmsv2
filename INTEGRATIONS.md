# INTEGRATIONS.md

> **AI Context System - Integration Boundaries & Architecture**
> 
> **Version:** 1.0.0 | **Last Updated:** 2026-03-12
> 
> **Purpose:** Document integration architecture and boundaries

---

## Integration Overview

### Key Principle

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│   Integration services use aap_db                                          │
│   WMS data is accessed via API calls                                       │
│   NEVER query wms_db directly from integration services                    │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Integration Services

### Service Location

All integration services are located in: `packages/backend/src/services/`

### Core Integration Services

| Service | Purpose | Database |
|---------|---------|----------|
| `IntegrationsService.ts` | Integration management | aap_db |
| `NetSuiteOrderSyncService.ts` | NetSuite order synchronization | aap_db |
| `NetSuiteClient.ts` | NetSuite API client | aap_db |
| `NetSuiteAutoSync.ts` | Automated sync jobs | aap_db |
| `EcommerceService.ts` | E-commerce platform sync | aap_db |

### Carrier Integrations

| Carrier | Purpose | Database |
|---------|---------|----------|
| FedEx | Shipping rates & tracking | aap_db |
| UPS | Shipping rates & tracking | aap_db |
| DHL | Shipping rates & tracking | aap_db |
| USPS | Shipping rates & tracking | aap_db |
| NZC | New Zealand Courier | aap_db |

### E-commerce Integrations

| Platform | Purpose | Database |
|----------|---------|----------|
| Shopify | Order import | aap_db |
| WooCommerce | Order import | aap_db |
| Magento | Order import | aap_db |

---

## NetSuite Integration

### Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       NETSUITE INTEGRATION                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────┐                     ┌─────────────────────────────┐    │
│  │   NetSuite      │                     │   Integration Services      │    │
│  │   Cloud ERP     │                     │   (aap_db)                  │    │
│  │                 │                     │                             │    │
│  │  • Sales Orders │◀═══════════════════▶│  NetSuiteOrderSyncService   │    │
│  │  • Inventory    │    TBA OAuth 1.0    │  NetSuiteClient             │    │
│  │  • Customers    │                     │  NetSuiteAutoSync           │    │
│  │                 │                     │                             │    │
│  └─────────────────┘                     └──────────────┬──────────────┘    │
│                                                          │                   │
│                                                          │ API Calls         │
│                                                          │ (NOT direct DB)   │
│                                                          ▼                   │
│                                          ┌─────────────────────────────┐    │
│                                          │   WMS API Backend           │    │
│                                          │   (wms_db)                  │    │
│                                          │                             │    │
│                                          │   Port 3001                 │    │
│                                          └─────────────────────────────┘    │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### NetSuite Authentication

Uses **Token-Based Authentication (TBA) OAuth 1.0**

```typescript
// Configuration stored in aap_db integrations table
interface NetSuiteConfig {
  consumerKey: string;
  consumerSecret: string;
  tokenId: string;
  tokenSecret: string;
  accountId: string;
  realm: string;
}
```

### NetSuite Sync Flow

```
1. Trigger: Timer (auto-sync) or Webhook
2. NetSuiteClient fetches orders from NetSuite
3. NetSuiteOrderSyncService processes orders
4. For each order:
   a. Check if exists in WMS (API call to /api/orders/:id)
   b. If new, create via API call to /api/orders
   c. If existing, update via API call
5. Log sync result to aap_db.integration_logs
```

---

## Integration Queue Architecture

### Status: Documented, Not Yet Created

The `integration_queue` table will handle asynchronous integration jobs.

### Planned Schema

```sql
-- PLANNED - NOT YET CREATED
CREATE TABLE integration_queue (
  id SERIAL PRIMARY KEY,
  job_type VARCHAR(50) NOT NULL,        -- 'netsuite_sync', 'shopify_import', etc.
  payload JSONB NOT NULL,               -- Job data
  status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
  priority INTEGER DEFAULT 5,           -- 1-10, lower is higher priority
  attempts INTEGER DEFAULT 0,           -- Retry count
  max_attempts INTEGER DEFAULT 3,       -- Max retries before dead letter
  error_message TEXT,                   -- Last error if failed
  created_at TIMESTAMP DEFAULT NOW(),
  started_at TIMESTAMP,
  completed_at TIMESTAMP
);
```

### Queue Processing Pattern

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       INTEGRATION QUEUE FLOW                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐  │
│  │   Trigger   │───▶│    Queue    │───▶│  Processor  │───▶│  External   │  │
│  │             │    │  (aap_db)   │    │             │    │   System    │  │
│  └─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘  │
│                                                                              │
│  Triggers:                                                                   │
│  • Webhook from external system                                             │
│  • Timer (scheduled sync)                                                   │
│  • Manual trigger (admin UI)                                                │
│                                                                              │
│  Processing:                                                                 │
│  • Fetch next pending job                                                   │
│  • Process with retry logic (exponential backoff)                           │
│  • Log result to integration_logs                                           │
│  • Move to dead letter queue after max attempts                             │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Integration Boundaries

### ⛔ FORBIDDEN Patterns

```typescript
// ❌ NEVER: Direct database query to wms_db from integration service
const orders = await wmsDB.query('SELECT * FROM orders WHERE status = $1', ['PENDING']);

// ❌ NEVER: Cross-database join
const result = await query(`
  SELECT o.*, i.config 
  FROM wms_db.orders o 
  JOIN aap_db.integrations i ON o.integration_id = i.id
`);
```

### ✅ CORRECT Patterns

```typescript
// ✅ CORRECT: API call to WMS
const response = await fetch('http://localhost:3001/api/orders?status=PENDING', {
  headers: { 'Authorization': `Bearer ${token}` }
});
const orders = await response.json();

// ✅ CORRECT: Log to aap_db after API call
await aapDB.query(
  'INSERT INTO integration_logs (job_type, status, details) VALUES ($1, $2, $3)',
  ['order_sync', 'success', JSON.stringify({ orderId, externalId })]
);
```

---

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          INTEGRATION DATA FLOW                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  External          Integration              WMS API              WMS DB     │
│  Systems           Services                 (Backend)                       │
│                                                                              │
│  ┌─────────┐       ┌─────────────┐       ┌─────────────┐       ┌─────────┐ │
│  │NetSuite │◀═════▶│  aap_db     │       │             │       │         │ │
│  │         │       │             │       │             │       │         │ │
│  │ Shopify │◀═════▶│ Integrations│──API──▶│  wms_db     │──────▶│ wms_db  │ │
│  │         │       │ Service     │ Calls │  Services   │       │         │ │
│  │ Carriers│◀═════▶│             │       │             │       │         │ │
│  └─────────┘       └─────────────┘       └─────────────┘       └─────────┘ │
│                           │                                                 │
│                           ▼                                                 │
│                    ┌─────────────┐                                         │
│                    │integration  │                                         │
│                    │_logs        │                                         │
│                    │(aap_db)     │                                         │
│                    └─────────────┘                                         │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Integration Configuration

### Environment Variables

```bash
# NetSuite Configuration
NETSUITE_CONSUMER_KEY=xxx
NETSUITE_CONSUMER_SECRET=xxx
NETSUITE_TOKEN_ID=xxx
NETSUITE_TOKEN_SECRET=xxx
NETSUITE_ACCOUNT_ID=TSTDRV123456
NETSUITE_REALM=TSTDRV123456

# Shopify Configuration
SHOPIFY_API_KEY=xxx
SHOPIFY_API_SECRET=xxx
SHOPIFY_SHOP_DOMAIN=myshop.myshopify.com

# Carrier APIs
FEDEX_API_KEY=xxx
FEDEX_PASSWORD=xxx
UPS_API_KEY=xxx
DHL_API_KEY=xxx
```

### Database Storage

Integration configurations are stored in `aap_db.integrations`:

```sql
-- Integration configuration table (aap_db)
CREATE TABLE integrations (
  id SERIAL PRIMARY KEY,
  organization_id INTEGER NOT NULL,
  type VARCHAR(50) NOT NULL,        -- 'netsuite', 'shopify', 'fedex', etc.
  name VARCHAR(100) NOT NULL,
  config JSONB NOT NULL,            -- Encrypted configuration
  active BOOLEAN DEFAULT true,
  last_sync_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

---

## Integration Logs

### Purpose

Track all integration activity for debugging and auditing.

### Schema

```sql
-- Integration logs table (aap_db)
CREATE TABLE integration_logs (
  id SERIAL PRIMARY KEY,
  integration_id INTEGER REFERENCES integrations(id),
  job_type VARCHAR(50) NOT NULL,
  status VARCHAR(20) NOT NULL,      -- 'success', 'failed', 'partial'
  details JSONB,
  error_message TEXT,
  duration_ms INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Log Retention

- Success logs: 30 days
- Error logs: 90 days
- Failed jobs: 1 year

---

## Error Handling

### Retry Strategy

| Attempt | Delay | Max Delay |
|---------|-------|-----------|
| 1 | 1 second | - |
| 2 | 5 seconds | - |
| 3 | 30 seconds | - |
| 4+ | Exponential | 5 minutes |

### Dead Letter Queue

After `max_attempts` failures:
1. Job marked as `dead_letter`
2. Alert sent to admin
3. Manual intervention required

---

## Summary

| Rule | Description |
|------|-------------|
| **1** | Integration services use aap_db |
| **2** | WMS data accessed via API only |
| **3** | No direct queries to wms_db from integrations |
| **4** | Log all sync activity to integration_logs |
| **5** | Use queue for async processing |
| **6** | Retry with exponential backoff |

---

**Related Files:**
- [`/ai_context.ts`](./ai_context.ts) - Machine-readable constants
- [`/DATABASE_BOUNDARIES.md`](./DATABASE_BOUNDARIES.md) - Database separation rules
- [`/SYSTEM_ARCHITECTURE.md`](./SYSTEM_ARCHITECTURE.md) - Architecture patterns