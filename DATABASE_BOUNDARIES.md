# DATABASE_BOUNDARIES.md

> **AI Context System - Database Separation Rules**
> 
> **Version:** 1.0.0 | **Last Updated:** 2026-03-12
> 
> **CRITICAL:** Read this file before ANY database-related work

---

## ⚠️ CRITICAL WARNING

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│   ⛔ NEVER MIX DATABASES ⛔                                                 │
│                                                                             │
│   wms_db and aap_db serve COMPLETELY DIFFERENT purposes                     │
│   Cross-database queries are FORBIDDEN                                      │
│   Always confirm which database you're working with                         │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Database Overview

### Two Databases, Two Purposes

| Database | Type | Purpose | Risk Level |
|----------|------|---------|------------|
| `wms_db` | TEST/DEV | Warehouse operations | Medium |
| `aap_db` | CUSTOMER | Application + Integrations | **HIGH** (Production) |

### Connection Details

Both databases run on the same PostgreSQL instance:

```
Server: 103.208.85.233
Port: 5432 (direct) / 5433 (SSH tunnel)
```

---

## Database: wms_db (TEST/DEV)

### Purpose
Warehouse Management System operations - development and testing database.

### Allowed Contents ✅

| Category | Tables | Description |
|----------|--------|-------------|
| **Orders** | `orders`, `order_items` | Sales orders and line items |
| **Picking** | `pick_tasks` | Pick assignments for warehouse staff |
| **Inventory** | `inventory_units`, `inventory_transactions` | Stock levels and movements |
| **Locations** | `bin_locations` | Warehouse storage locations |
| **Products** | `skus` | Product catalog |
| **Staff** | `users` | Warehouse workers (pickers, packers) |
| **Audit** | `order_state_changes` | Order status history |

### Forbidden Contents ❌

| Data Type | Reason |
|-----------|--------|
| Application authentication | Belongs in aap_db |
| User permissions | Belongs in aap_db |
| Integration configurations | Belongs in aap_db |
| NetSuite sync data | Belongs in aap_db |
| Integration logs | Belongs in aap_db |
| Organization data | Belongs in aap_db |

### Schema Summary

```sql
-- Core Tables
users                -- Warehouse staff (pickers, packers, supervisors)
orders               -- Sales orders
order_items          -- Order line items
pick_tasks           -- Individual pick assignments
inventory_units      -- Inventory by bin location
bin_locations        -- Warehouse storage locations (Z-A-S format)
skus                 -- Product catalog
inventory_transactions -- Inventory audit log
order_state_changes  -- Order status history
```

### Development Rules for wms_db

1. **Safe for development** - This is the test database
2. **Can create/modify tables** - With proper migration files
3. **Can seed test data** - Use seed scripts
4. **Still requires migrations** - Never modify schema directly

---

## Database: aap_db (CUSTOMER/PRODUCTION)

### Purpose
Application platform and integrations - **REAL CUSTOMER DATA**.

### ⚠️ HIGH RISK WARNING

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│   🔴 aap_db contains REAL CUSTOMER DATA                                    │
│                                                                             │
│   • DO NOT modify schema without explicit approval                          │
│   • DO NOT create tables without explicit approval                          │
│   • DO NOT seed or modify data without explicit approval                    │
│   • DO NOT write integration tests against this database                    │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Allowed Contents ✅

| Category | Tables | Description |
|----------|--------|-------------|
| **Authentication** | `users` | Application users (login credentials) |
| **Authorization** | `roles`, `permissions` | Access control |
| **Organizations** | `organizations` | Multi-tenant data |
| **Integrations** | `integrations` | External system connections |
| **Sync Data** | `integration_logs` | NetSuite and other sync history |
| **Configuration** | `feature_flags` | Feature toggles |
| **Queue** | `integration_queue` | Async job queue (documented, not created) |

### Forbidden Contents ❌

| Data Type | Reason |
|-----------|--------|
| Sales orders | Belongs in wms_db |
| Pick tasks | Belongs in wms_db |
| Inventory data | Belongs in wms_db |
| Bin locations | Belongs in wms_db |
| Packing data | Belongs in wms_db |

### Development Rules for aap_db

1. **🔴 READ-ONLY by default** - No modifications without approval
2. **No schema changes** - Unless explicitly requested by user
3. **No data seeding** - This is production data
4. **No test data** - Use wms_db for testing

---

## Cross-Database Communication

### ⛔ FORBIDDEN: Direct Cross-Database Queries

```typescript
// ❌ NEVER DO THIS
// Cross-database join
const result = await query(`
  SELECT o.*, u.email 
  FROM wms_db.orders o 
  JOIN aap_db.users u ON o.picker_id = u.user_id
`);

// ❌ NEVER DO THIS
// Querying wrong database for data
const user = await wmsDB.query('SELECT * FROM users WHERE email = $1', [email]);
// This is wrong if you need authentication data (should be aap_db)
```

### ✅ CORRECT: API-Based Communication

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│   Integration Services (aap_db)          WMS Services (wms_db)              │
│                                                                             │
│   ┌─────────────────────┐               ┌─────────────────────┐            │
│   │ IntegrationsService │               │    OrderService     │            │
│   │ NetSuiteSyncService │─── API ─────▶ │  InventoryService   │            │
│   │                     │   CALLS       │   PickingService    │            │
│   └─────────────────────┘               └─────────────────────┘            │
│            │                                      │                         │
│            ▼                                      ▼                         │
│       ┌─────────┐                           ┌─────────┐                     │
│       │ aap_db  │                           │ wms_db  │                     │
│       └─────────┘                           └─────────┘                     │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

```typescript
// ✅ CORRECT: Integration service calls WMS API
// In IntegrationsService (uses aap_db)
async syncOrderToNetSuite(orderId: string) {
  // Get order from WMS via API call
  const order = await this.wmsApiClient.get(`/orders/${orderId}`);
  
  // Sync to NetSuite
  await this.netSuiteClient.createSalesOrder(order);
  
  // Log in aap_db
  await this.logSync(orderId, 'success');
}
```

---

## Service-to-Database Mapping

### Warehouse Services → wms_db

| Service | Database | Purpose |
|---------|----------|---------|
| `OrderService` | wms_db | Order management |
| `InventoryService` | wms_db | Stock control |
| `PickingService` | wms_db | Pick task management |
| `PackingService` | wms_db | Packing workflows |
| `ShippingService` | wms_db | Shipment processing |
| `ZonePickingService` | wms_db | Zone-based picking |
| `WavePickingService` | wms_db | Wave picking |

### Application Services → aap_db

| Service | Database | Purpose |
|---------|----------|---------|
| `AuthService` | aap_db | Authentication |
| `UserService` | aap_db | User management |
| `OrganizationService` | aap_db | Multi-tenant orgs |
| `FeatureFlagService` | aap_db | Feature toggles |

### Integration Services → aap_db

| Service | Database | WMS Access |
|---------|----------|------------|
| `IntegrationsService` | aap_db | API only |
| `NetSuiteOrderSyncService` | aap_db | API only |
| `NetSuiteClient` | aap_db | N/A |
| `EcommerceService` | aap_db | API only |

---

## Database Client Usage

### File Structure

```
db/
├── wms_db.ts    # WMS database client export
└── aap_db.ts    # AAP database client export
```

### Usage Example

```typescript
// Import the correct client for your service
import { wmsDB } from '../db/wms_db';    // For warehouse services
import { aapDB } from '../db/aap_db';    // For application/integration services

// Warehouse service example
async function getOrders() {
  // ✅ CORRECT: Use wmsDB for warehouse data
  const result = await wmsDB.query('SELECT * FROM orders WHERE status = $1', ['PENDING']);
  return result.rows;
}

// Integration service example
async function logSync(orderId: string, status: string) {
  // ✅ CORRECT: Use aapDB for integration logs
  await aapDB.query(
    'INSERT INTO integration_logs (order_id, status, timestamp) VALUES ($1, $2, NOW())',
    [orderId, status]
  );
}
```

---

## Environment Variables

### For wms_db

```bash
WMS_DB_URL=postgresql://wms_user:password@localhost:5433/wms_db
# OR individual variables:
WMS_DB_HOST=localhost
WMS_DB_PORT=5433
WMS_DB_NAME=wms_db
WMS_DB_USER=wms_user
WMS_DB_PASSWORD=your_password
```

### For aap_db

```bash
AAP_DB_URL=postgresql://aap_user:password@localhost:5433/aap_db
# OR individual variables:
AAP_DB_HOST=localhost
AAP_DB_PORT=5433
AAP_DB_NAME=aap_db
AAP_DB_USER=aap_user
AAP_DB_PASSWORD=your_password
```

---

## Quick Decision Tree

```
                    ┌─────────────────────────┐
                    │ What data are you       │
                    │ working with?           │
                    └───────────┬─────────────┘
                                │
          ┌─────────────────────┼─────────────────────┐
          │                     │                     │
          ▼                     ▼                     ▼
   ┌─────────────┐      ┌─────────────┐      ┌─────────────┐
   │  Warehouse  │      │   User      │      │ Integration │
   │ Operations  │      │   Auth      │      │   /Sync     │
   └──────┬──────┘      └──────┬──────┘      └──────┬──────┘
          │                    │                    │
          ▼                    ▼                    ▼
   ┌─────────────┐      ┌─────────────┐      ┌─────────────┐
   │   wms_db    │      │   aap_db    │      │   aap_db    │
   │   (TEST)    │      │ (PRODUCTION)│      │ (PRODUCTION)│
   └─────────────┘      └─────────────┘      └─────────────┘
```

---

## Checklist Before Database Work

Before ANY database-related coding, confirm:

- [ ] Which database does this data belong to? (wms_db or aap_db)
- [ ] Is this the correct database client? (wmsDB or aapDB)
- [ ] Am I in the right service? (Check service-to-database mapping)
- [ ] If aap_db, do I have explicit user approval?
- [ ] Am I accidentally doing a cross-database query?
- [ ] Is my query going through the right connection?

---

## Summary

| Rule | Description |
|------|-------------|
| **1** | Never mix databases - wms_db ≠ aap_db |
| **2** | wms_db = Warehouse operations (TEST) |
| **3** | aap_db = Application + Integrations (PRODUCTION) |
| **4** | No cross-database joins - use API calls |
| **5** | Integration services use aap_db, call WMS via API |
| **6** | Always confirm database before coding |
| **7** | aap_db requires explicit approval for modifications |

---

**Related Files:**
- [`/ai_context.ts`](./ai_context.ts) - Machine-readable constants
- [`/PROJECT_CONTEXT.md`](./PROJECT_CONTEXT.md) - Infrastructure documentation
- [`/db/wms_db.ts`](./db/wms_db.ts) - WMS database client
- [`/db/aap_db.ts`](./db/aap_db.ts) - AAP database client