# SYSTEM_ARCHITECTURE.md

> **AI Context System - Architecture Discovered from Repository**
> 
> **Version:** 1.0.0 | **Last Updated:** 2026-03-12
> 
> **Purpose:** Document the architecture patterns found in this codebase

---

## Architecture Overview

### System Type
**Monorepo TypeScript/Node.js ERP/WMS Platform**

### Key Architectural Patterns

1. **Backend owns all domain state** - Frontend is presentation-only
2. **Repository pattern** - Data access layer abstraction
3. **Service layer** - Business logic encapsulation
4. **Shared types** - Single source of truth for domain models
5. **Multi-database** - Separate databases for different concerns

---

## Repository Structure

```
Warehouse Management System/
│
├── ai_context.ts                    # ⭐ AI Context (READ FIRST)
├── PROJECT_CONTEXT.md               # Infrastructure documentation
├── AI_RULES.md                      # Development rules
├── DATABASE_BOUNDARIES.md           # Database separation rules
├── SYSTEM_ARCHITECTURE.md           # This file
│
├── packages/
│   ├── backend/                     # Node.js/Express API
│   │   ├── src/
│   │   │   ├── app.ts              # Express app setup
│   │   │   ├── index.ts            # Entry point
│   │   │   ├── config/             # Configuration
│   │   │   ├── db/                 # Database layer
│   │   │   │   ├── client.ts       # PostgreSQL pool
│   │   │   │   ├── tenantContext.ts # Multi-tenant context
│   │   │   │   ├── schema.sql      # Canonical schema
│   │   │   │   └── migrations/     # Migration files
│   │   │   ├── middleware/         # Express middleware
│   │   │   ├── repositories/       # Data access layer
│   │   │   ├── routes/             # API route definitions
│   │   │   ├── services/           # Business logic
│   │   │   ├── utils/              # Utilities
│   │   │   └── websocket/          # WebSocket handlers
│   │   └── package.json
│   │
│   ├── frontend/                    # React SPA
│   │   ├── src/
│   │   │   ├── components/         # React components
│   │   │   ├── pages/              # Page components
│   │   │   ├── stores/             # Zustand stores
│   │   │   ├── services/           # API clients
│   │   │   ├── hooks/              # Custom hooks
│   │   │   └── types/              # Frontend types
│   │   └── package.json
│   │
│   ├── shared/                      # Shared code
│   │   ├── src/
│   │   │   ├── types/              # Domain types
│   │   │   └── utils/              # Shared utilities
│   │   └── package.json
│   │
│   ├── mcp-server/                  # MCP integration
│   ├── ml/                          # ML pipeline
│   └── module-videos/               # Video modules
│
├── db/                              # ⭐ Database clients
│   ├── wms_db.ts                    # WMS database client
│   └── aap_db.ts                    # AAP database client
│
├── docs/                            # Documentation
├── k8s/                             # Kubernetes manifests
├── e2e/                             # E2E tests
└── scripts/                         # Utility scripts
```

---

## Backend Architecture

### Layer Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              ROUTES LAYER                                    │
│                     (packages/backend/src/routes/)                           │
│                                                                              │
│  • HTTP endpoint definitions                                                 │
│  • Request validation                                                        │
│  • Response formatting                                                       │
│  • Route registration                                                        │
└────────────────────────────────────┬────────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                             SERVICE LAYER                                    │
│                    (packages/backend/src/services/)                          │
│                                                                              │
│  • Business logic                                                            │
│  • Orchestration                                                             │
│  • Validation rules                                                          │
│  • Cross-entity operations                                                   │
│                                                                              │
│  Services: OrderService, InventoryService, IntegrationsService, etc.        │
└────────────────────────────────────┬────────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           REPOSITORY LAYER                                   │
│                  (packages/backend/src/repositories/)                        │
│                                                                              │
│  • Data access abstraction                                                   │
│  • SQL queries                                                               │
│  • CRUD operations                                                           │
│  • Data mapping                                                              │
└────────────────────────────────────┬────────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                            DATABASE LAYER                                    │
│                      (packages/backend/src/db/)                              │
│                                                                              │
│  • Connection pooling                                                        │
│  • Transaction management                                                    │
│  • Multi-tenant context                                                      │
│  • Schema migrations                                                         │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Service Categories

| Category | Services | Database |
|----------|----------|----------|
| **Warehouse** | OrderService, InventoryService, PickingService, PackingService, ShippingService | wms_db |
| **Planning** | ZonePickingService, WavePickingService, RouteOptimizationService, SlottingOptimizationService | wms_db |
| **Inventory** | StockControlService, AdvancedInventoryService, CycleCountService, LocationCapacityService | wms_db |
| **Quality** | QualityControlService, OrderExceptionService, RMAService, VarianceSeverityService | wms_db |
| **Application** | AuthService, OrganizationService, FeatureFlagService, TokenBlacklistService | aap_db |
| **Integration** | IntegrationsService, NetSuiteOrderSyncService, NetSuiteClient, EcommerceService | aap_db |
| **Finance** | AccountingService, PurchasingService, SalesService, ProjectsService | wms_db |
| **Operations** | HRService, ManufacturingService, ProductionService, MaintenanceService | wms_db |

---

## Frontend Architecture

### Component Structure

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              PAGES                                           │
│                      (packages/frontend/src/pages/)                          │
│                                                                              │
│  • Route-level components                                                    │
│  • Page composition                                                          │
│  • Data fetching (TanStack Query)                                           │
│                                                                              │
│  Pages: DashboardPage, PickingPage, PackingPage, InventoryPage, etc.        │
└────────────────────────────────────┬────────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                            COMPONENTS                                        │
│                   (packages/frontend/src/components/)                        │
│                                                                              │
│  • Reusable UI components                                                    │
│  • Layout components                                                         │
│  • Form components                                                           │
│  • Domain components                                                         │
└────────────────────────────────────┬────────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              STORES                                          │
│                      (packages/frontend/src/stores/)                         │
│                                                                              │
│  • Zustand state stores                                                      │
│  • Client-side state                                                         │
│  • UI state management                                                       │
└────────────────────────────────────┬────────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                            SERVICES                                          │
│                      (packages/frontend/src/services/)                       │
│                                                                              │
│  • API clients                                                               │
│  • WebSocket connections                                                     │
│  • External service integrations                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Frontend Stack

| Layer | Technology |
|-------|------------|
| Framework | React 18 |
| Build | Vite 5 |
| Routing | React Router v6 |
| State | Zustand |
| Data Fetching | TanStack Query |
| Styling | Tailwind CSS |
| Icons | Heroicons |
| Animations | Framer Motion |
| Charts | Recharts |
| WebSocket | Socket.io Client |

---

## Database Architecture

### Multi-Database Design

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         PostgreSQL Instance                                  │
│                        (103.208.85.233:5432)                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────────────────────┐   ┌─────────────────────────────────┐  │
│  │            wms_db               │   │            aap_db               │  │
│  │         (TEST/DEV)              │   │        (CUSTOMER)               │  │
│  ├─────────────────────────────────┤   ├─────────────────────────────────┤  │
│  │                                 │   │                                 │  │
│  │  Warehouse Operations           │   │  Application Platform           │  │
│  │  • orders                       │   │  • users (auth)                 │  │
│  │  • order_items                  │   │  • organizations                │  │
│  │  • pick_tasks                   │   │  • permissions                  │  │
│  │  • inventory_units              │   │  • integrations                 │  │
│  │  • bin_locations                │   │  • integration_logs             │  │
│  │  • skus                         │   │  • feature_flags                │  │
│  │  • users (warehouse staff)      │   │                                 │  │
│  │  • inventory_transactions       │   │                                 │  │
│  │  • order_state_changes          │   │                                 │  │
│  │                                 │   │                                 │  │
│  └─────────────────────────────────┘   └─────────────────────────────────┘  │
│                                                                              │
│  ⛔ NO CROSS-DATABASE QUERIES - USE API FOR COMMUNICATION                   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Connection Patterns

```typescript
// Backend database client (packages/backend/src/db/client.ts)
const poolConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME || 'wms_db',
  user: process.env.DB_USER || 'wms_user',
  password: process.env.DB_PASSWORD || 'wms_password',
  min: 2,
  max: 10,
};

// Multi-tenant context (packages/backend/src/db/tenantContext.ts)
// Uses AsyncLocalStorage for tenant-specific database connections
```

---

## Integration Architecture

### Integration Patterns

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          EXTERNAL SYSTEMS                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐ │
│  │   NetSuite    │  │    Shopify    │  │     FedEx     │  │     SAP       │ │
│  │     ERP       │  │  E-commerce   │  │    Carrier    │  │     ERP       │ │
│  └───────┬───────┘  └───────┬───────┘  └───────┬───────┘  └───────┬───────┘ │
│          │                  │                  │                  │         │
└──────────┼──────────────────┼──────────────────┼──────────────────┼─────────┘
           │                  │                  │                  │
           └──────────────────┼──────────────────┼──────────────────┘
                              │                  │
                              ▼                  ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                       INTEGRATION SERVICES                                   │
│                    (packages/backend/src/services/)                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  IntegrationsService                                                         │
│  ├── NetSuiteOrderSyncService (TBA OAuth 1.0)                              │
│  ├── NetSuiteClient                                                          │
│  ├── NetSuiteAutoSync                                                        │
│  ├── EcommerceService (Shopify, WooCommerce, Magento)                       │
│  └── Carrier integrations (FedEx, UPS, DHL, USPS, NZC)                      │
│                                                                              │
│  Database: aap_db                                                            │
│  WMS Access: API calls only (NO direct database queries)                    │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Integration Service Flow

```
NetSuite                 IntegrationsService              WMS API              wms_db
   │                           │                            │                    │
   │  1. Webhook/Timer         │                            │                    │
   │─────────────────────────▶│                            │                    │
   │                           │                            │                    │
   │                           │  2. GET /api/orders/123    │                    │
   │                           │──────────────────────────▶│                    │
   │                           │                            │                    │
   │                           │                            │  3. Query wms_db   │
   │                           │                            │──────────────────▶│
   │                           │                            │                    │
   │                           │                            │  4. Return order   │
   │                           │                            │◀──────────────────│
   │                           │                            │                    │
   │                           │  5. Order data             │                    │
   │                           │◀──────────────────────────│                    │
   │                           │                            │                    │
   │  6. Sync to NetSuite      │                            │                    │
   │◀─────────────────────────│                            │                    │
   │                           │                            │                    │
   │  7. Confirmation          │                            │                    │
   │─────────────────────────▶│                            │                    │
   │                           │                            │                    │
   │                           │  8. Log to aap_db          │                    │
   │                           │─────────────────────────────────────────────▶│
   │                           │                            │                    │
```

---

## Deployment Architecture

### Production Environment

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              PRODUCTION                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                        Cloudflare Pages                              │   │
│  │                                                                      │   │
│  │  • Frontend static assets (React SPA)                               │   │
│  │  • Git-triggered deployment                                         │   │
│  │  • Global CDN distribution                                          │   │
│  │  • NOT on backend server                                            │   │
│  │                                                                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                      │                                       │
│                                      │ API calls                             │
│                                      ▼                                       │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    Remote SSH Server (103.208.85.233)               │   │
│  │                                                                      │   │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────┐  │   │
│  │  │    Nginx        │  │   PM2 + Node    │  │    PostgreSQL       │  │   │
│  │  │  (Port 80/443)  │─▶│   (Port 3001)   │─▶│    (Port 5432)      │  │   │
│  │  └─────────────────┘  └─────────────────┘  └─────────────────────┘  │   │
│  │                              │                     │                 │   │
│  │  ┌─────────────────┐         │                     │                 │   │
│  │  │   WebSocket     │         │                     │                 │   │
│  │  │   (Port 3002)   │─────────┘                     │                 │   │
│  │  └─────────────────┘                               │                 │   │
│  │                                                    │                 │   │
│  │  Databases:                                        │                 │   │
│  │  • wms_db (Warehouse Operations)                   │                 │   │
│  │  • aap_db (Application + Integrations)             │                 │   │
│  │                                                                      │   │
│  │  NOT Docker - Bare metal deployment                                 │   │
│  │                                                                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Local Development Environment

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          LOCAL DEVELOPMENT                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────────┐         ┌─────────────────────────────────────┐   │
│  │   Local Machine     │         │      SSH Tunnel                      │   │
│  │                     │         │                                      │   │
│  │  ┌───────────────┐  │         │  localhost:5433                      │   │
│  │  │ Frontend      │  │         │        │                             │   │
│  │  │ :5173 (Vite)  │  │         │        ▼                             │   │
│  │  └───────────────┘  │ ═══════ │  103.208.85.233:5432                │   │
│  │                     │         │                                      │   │
│  │  ┌───────────────┐  │         │  (PostgreSQL on remote server)      │   │
│  │  │ Backend       │  │         │                                      │   │
│  │  │ :3001 (Node)  │──┼─────────┼──────────────────────────────────▶  │   │
│  │  └───────────────┘  │         │                                      │   │
│  │                     │         │                                      │   │
│  │  ┌───────────────┐  │         │                                      │   │
│  │  │ WebSocket     │  │         │                                      │   │
│  │  │ :3002         │  │         │                                      │   │
│  │  └───────────────┘  │         │                                      │   │
│  │                     │         │                                      │   │
│  └─────────────────────┘         └─────────────────────────────────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Key Architectural Decisions

### 1. Backend Owns Domain State

- Frontend is presentation-only
- All business logic lives in services
- Database constraints are authoritative

### 2. Repository Pattern

```typescript
// Repository interface (data access)
class OrderRepository {
  async findById(id: string): Promise<Order | null>;
  async create(order: OrderCreate): Promise<Order>;
  async update(id: string, updates: OrderUpdate): Promise<Order>;
}

// Service (business logic)
class OrderService {
  constructor(private orderRepo: OrderRepository) {}
  
  async claimOrder(orderId: string, pickerId: string): Promise<Order> {
    // Business logic here
    return this.orderRepo.update(orderId, { pickerId, status: 'PICKING' });
  }
}
```

### 3. Shared Types Package

```typescript
// packages/shared/src/types/index.ts
export enum OrderStatus {
  PENDING = 'PENDING',
  PICKING = 'PICKING',
  PICKED = 'PICKED',
  // ...
}

// Imported by both frontend and backend
import { OrderStatus } from '@opsui/shared';
```

### 4. Multi-Database Separation

- `wms_db` for warehouse operations
- `aap_db` for application + integrations
- No cross-database queries - use API calls

### 5. Multi-Tenant Context

```typescript
// Uses AsyncLocalStorage for tenant context
import { runWithTenantPool, getCurrentTenantPool } from './tenantContext';

await runWithTenantPool(tenantId, async () => {
  // All queries in this block use tenant-specific pool
  const pool = getCurrentTenantPool();
});
```

---

## WebSocket Architecture

### Real-Time Updates

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          WEBSOCKET SERVER                                    │
│                           (Port 3002)                                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Events:                                                                     │
│  • order:created     - New order received                                   │
│  • order:updated     - Order status changed                                 │
│  • pick:assigned     - Pick task assigned                                   │
│  • pick:completed    - Pick task completed                                  │
│  • inventory:changed - Inventory updated                                    │
│                                                                              │
│  Clients:                                                                    │
│  • Picker dashboard                                                          │
│  • Supervisor dashboard                                                      │
│  • Packing station                                                           │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Summary

| Component | Technology | Location |
|-----------|------------|----------|
| Frontend | React + Vite | Cloudflare Pages |
| Backend | Node.js + Express | 103.208.85.233 |
| Database | PostgreSQL | Same server as backend |
| Cache | Redis (optional) | Same server as backend |
| WebSocket | Socket.io | Port 3002 |
| WMS Database | wms_db | PostgreSQL instance |
| AAP Database | aap_db | PostgreSQL instance |

---

**Related Files:**
- [`/ai_context.ts`](./ai_context.ts) - Machine-readable constants
- [`/PROJECT_CONTEXT.md`](./PROJECT_CONTEXT.md) - Infrastructure documentation
- [`/DATABASE_BOUNDARIES.md`](./DATABASE_BOUNDARIES.md) - Database separation rules