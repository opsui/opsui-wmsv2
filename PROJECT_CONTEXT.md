# PROJECT_CONTEXT.md

> **AI Context System - Infrastructure & Architecture Documentation**
> 
> **Version:** 1.0.0 | **Last Updated:** 2026-03-12
> 
> **READ THIS FILE:** At session start, along with `/ai_context.ts`

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Infrastructure Architecture](#infrastructure-architecture)
3. [Frontend Deployment](#frontend-deployment)
4. [Backend Runtime](#backend-runtime)
5. [Database Architecture](#database-architecture)
6. [Integration Systems](#integration-systems)
7. [Development Workflow](#development-workflow)
8. [Environment Variables](#environment-variables)

---

## System Overview

### What This System Is

This is an **Enterprise Resource Planning (ERP) / Warehouse Management System (WMS)** built as a TypeScript/Node.js monorepo with PostgreSQL databases and a React frontend.

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              PRODUCTION                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────────┐         ┌─────────────────────────────────────┐   │
│  │   Cloudflare Pages  │         │      Remote SSH Server              │   │
│  │   (Frontend Hosting)│         │      103.208.85.233                 │   │
│  │                     │         │                                     │   │
│  │  • React SPA        │ ──────▶ │  • Backend API (Port 3001)          │   │
│  │  • Static Assets    │   API   │  • WebSocket (Port 3002)            │   │
│  │  • Git-triggered    │  Calls  │  • PostgreSQL (Port 5432)           │   │
│  │    deployment       │         │  • PM2 Process Manager              │   │
│  └─────────────────────┘         │                                     │   │
│                                  │  Databases:                          │   │
│                                  │  • wms_db (Warehouse)                │   │
│                                  │  • aap_db (Application/Integrations) │   │
│                                  └─────────────────────────────────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                            LOCAL DEVELOPMENT                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────────┐         ┌─────────────────────────────────────┐   │
│  │   Local Machine     │         │      SSH Tunnel                      │   │
│  │                     │         │      localhost:5433                  │   │
│  │  • Frontend :5173   │ ═══════ │           ↓                          │   │
│  │  • Backend  :3001   │         │      103.208.85.233:5432            │   │
│  │  • WebSocket:3002   │         │                                     │   │
│  └─────────────────────┘         └─────────────────────────────────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Key Architectural Principles

1. **Backend owns all domain state** - Frontend is presentation-only
2. **Database is authoritative** - All business logic validates against DB constraints
3. **Shared types package** - Single source of truth for domain model
4. **Frontend/Backend separation** - Different deployment targets

---

## Infrastructure Architecture

### Monorepo Structure

```
Warehouse Management System/
├── ai_context.ts                    # ⭐ AI Context Constants (READ FIRST)
├── PROJECT_CONTEXT.md               # ⭐ This file
├── AI_RULES.md                      # Development rules for AI
├── CURRENT_CONTEXT.md               # Session state tracking
├── DATABASE_BOUNDARIES.md           # Database separation rules
├── SYSTEM_ARCHITECTURE.md           # Architecture documentation
├── INTEGRATIONS.md                  # Integration boundaries
├── AI_STARTUP_PROMPT.md             # AI session workflow
│
├── db/                              # Database client exports
│   ├── wms_db.ts                    # WMS database client
│   └── aap_db.ts                    # AAP database client
│
├── packages/
│   ├── backend/                     # Node.js/Express API server
│   ├── frontend/                    # React + Vite SPA
│   ├── shared/                      # Shared TypeScript types
│   ├── mcp-server/                  # MCP integration server
│   ├── ml/                          # ML pipeline
│   └── module-videos/               # Video module components
│
├── docs/                            # Documentation
├── k8s/                             # Kubernetes manifests
├── e2e/                             # End-to-end tests
└── scripts/                         # Utility scripts
```

### Package Dependencies

```
┌─────────────────┐      ┌─────────────────┐
│    Frontend     │      │    Backend      │
│  @opsui/frontend│      │  @opsui/backend │
└────────┬────────┘      └────────┬────────┘
         │                        │
         │      ┌─────────────────┴─────────────────┐
         │      │                                   │
         └─────▶│        @opsui/shared              │◀─────────┘
                │    (Shared Types & Utils)          │
                └────────────────────────────────────┘
```

---

## Frontend Deployment

### Deployment Target

| Property | Value |
|----------|-------|
| **Platform** | Cloudflare Pages |
| **Build Tool** | Vite |
| **Trigger** | Git push to main branch |
| **Location** | NOT on backend server |

### Frontend Stack

| Component | Technology |
|-----------|------------|
| Framework | React 18 + TypeScript |
| Build | Vite 5 |
| Styling | Tailwind CSS |
| State | Zustand |
| Data Fetching | TanStack Query |
| Charts | Recharts |
| Icons | Heroicons |
| Animations | Framer Motion |
| Routing | React Router v6 |
| WebSocket | Socket.io Client |

### Development Ports

| Service | Port | Notes |
|---------|------|-------|
| Frontend Dev Server | 5173 | Vite dev server |
| API Proxy Target | 3001 | Local backend |

### Build Commands

```bash
# Development
cd packages/frontend && npm run dev

# Production Build
cd packages/frontend && npm run build

# Preview Production Build
cd packages/frontend && npm run preview
```

### ⚠️ CRITICAL: Frontend is NOT on Backend Server

- Frontend deploys to **Cloudflare Pages**
- Backend API runs on **103.208.85.233**
- These are **separate deployment targets**
- Do NOT attempt to deploy frontend to the SSH server

---

## Backend Runtime

### Production Server

| Property | Value |
|----------|-------|
| **Host** | `103.208.85.233` |
| **Access** | `ssh root@103.208.85.233` |
| **Runtime** | PM2 + Node.js |
| **Container** | None (NOT Docker) |

### Backend Stack

| Component | Technology |
|-----------|------------|
| Runtime | Node.js 18+ |
| Framework | Express |
| Database | PostgreSQL 14+ |
| Caching | Redis 6+ (optional) |
| Process Manager | PM2 |
| Web Server | Nginx (reverse proxy) |

### Locked Ports

| Port | Service | Status |
|------|---------|--------|
| 3001 | Backend API | 🔒 LOCKED - Never change |
| 3002 | WebSocket | 🔒 LOCKED - Never change |

### Database Connection

**On Server (Production):**
```
Host: localhost
Port: 5432
```

**Local Development (SSH Tunnel):**
```
# Establish tunnel first
ssh -f -N -L 5433:localhost:5432 root@103.208.85.233

# Connect via tunnel
Host: localhost
Port: 5433
```

### Backend Commands

```bash
# Development
cd packages/backend && npm run dev

# Production (on server)
pm2 status
pm2 logs wms-backend
pm2 restart wms-backend
```

---

## Database Architecture

### Two Separate Databases

| Database | Type | Purpose |
|----------|------|---------|
| `wms_db` | TEST/DEV | Warehouse Management operations |
| `aap_db` | CUSTOMER | Application + Integrations (PRODUCTION) |

### Database Separation Rules

```
┌───────────────────────────────────────────────────────────────────────────┐
│                          DATABASE BOUNDARIES                               │
├───────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│  ┌─────────────────────────────┐   ┌─────────────────────────────────┐   │
│  │         wms_db              │   │           aap_db                 │   │
│  │      (TEST/DEV)             │   │        (CUSTOMER)                │   │
│  ├─────────────────────────────┤   ├─────────────────────────────────┤   │
│  │                             │   │                                 │   │
│  │  ✓ Warehouse Operations     │   │  ✓ Users & Authentication       │   │
│  │  ✓ Sales Orders            │   │  ✓ Permissions                  │   │
│  │  ✓ Pick Lists              │   │  ✓ System Configuration         │   │
│  │  ✓ Inventory               │   │  ✓ External Integrations        │   │
│  │  ✓ Packing Workflows       │   │  ✓ NetSuite Synchronization     │   │
│  │  ✓ Fulfillment Records     │   │  ✓ Integration Logs             │   │
│  │  ✓ Bin Locations           │   │                                 │   │
│  │  ✓ SKUs                    │   │  ✗ NO Warehouse Operations      │   │
│  │  ✓ Courier Assignments     │   │  ✗ NO Orders                    │   │
│  │                             │   │  ✗ NO Inventory                 │   │
│  │  ✗ NO User Auth            │   │                                 │   │
│  │  ✗ NO Integration Logs     │   │                                 │   │
│  │  ✗ NO NetSuite Sync        │   │                                 │   │
│  │                             │   │                                 │   │
│  └─────────────────────────────┘   └─────────────────────────────────┘   │
│                                                                            │
│              ║                                        ║                    │
│              ║    ⛔ NO CROSS-DATABASE JOINS ⛔        ║                    │
│              ║                                        ║                    │
└───────────────────────────────────────────────────────────────────────────┘
```

### WMS Database Tables (wms_db)

| Table | Purpose |
|-------|---------|
| `users` | Warehouse staff (pickers, packers) |
| `orders` | Sales orders |
| `order_items` | Order line items |
| `pick_tasks` | Individual pick assignments |
| `inventory_units` | Inventory by bin location |
| `bin_locations` | Warehouse storage locations |
| `skus` | Product catalog |
| `inventory_transactions` | Inventory audit log |
| `order_state_changes` | Order status history |

### AAP Database Tables (aap_db)

| Table | Purpose |
|-------|---------|
| `users` | Application users (authentication) |
| `organizations` | Multi-tenant organizations |
| `integrations` | External system connections |
| `integration_queue` | Integration job queue (documented, not created) |
| `integration_logs` | Sync job history |
| `feature_flags` | Feature toggle configuration |

---

## Integration Systems

### Integration Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         INTEGRATION BOUNDARIES                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  External Systems                     Internal Services                      │
│  ───────────────                     ──────────────────                      │
│                                                                              │
│  ┌─────────────┐                     ┌─────────────────────────────┐        │
│  │  NetSuite   │◀═══════════════════▶│  IntegrationsService        │        │
│  │    ERP      │                     │  NetSuiteOrderSyncService   │        │
│  └─────────────┘                     │  NetSuiteClient             │        │
│                                      │                             │        │
│  ┌─────────────┐                     │  Database: aap_db           │        │
│  │   Shopify   │◀═══════════════════▶│                             │        │
│  │  E-commerce │                     └──────────────┬──────────────┘        │
│  └─────────────┘                                    │                       │
│                                                     │                       │
│  ┌─────────────┐                                    │ API CALLS ONLY        │
│  │    FedEx    │                                    │ (No direct DB access) │
│  │   Carrier   │◀═══════════════════════════════════┤                       │
│  └─────────────┘                                    │                       │
│                                                     ▼                       │
│                                      ┌─────────────────────────────┐        │
│                                      │    WMS API (Backend)        │        │
│                                      │    Port 3001                │        │
│                                      │                             │        │
│                                      │    Database: wms_db         │        │
│                                      └─────────────────────────────┘        │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Integration Services Location

All integration services are in: `packages/backend/src/services/`

| Service | Purpose | Database |
|---------|---------|----------|
| `IntegrationsService.ts` | Integration management | aap_db |
| `NetSuiteOrderSyncService.ts` | NetSuite order sync | aap_db |
| `NetSuiteClient.ts` | NetSuite API client | aap_db |
| `NetSuiteAutoSync.ts` | Automated sync jobs | aap_db |
| `EcommerceService.ts` | E-commerce platform sync | aap_db |

### Supported Integration Providers

| Type | Providers |
|------|-----------|
| ERP | NetSuite, SAP, Oracle |
| E-commerce | Shopify, WooCommerce, Magento |
| Carriers | FedEx, UPS, DHL, USPS, NZC |

### Integration Queue Architecture

> **Status:** Documented, not yet created

The `integration_queue` table will handle:
- Asynchronous integration jobs
- Retry logic with exponential backoff
- Dead letter queue for failed jobs
- Job priority scheduling

---

## Development Workflow

### Local Development Setup

```bash
# 1. Clone repository
git clone https://github.com/opsui/opsui-wmsv2.git
cd "Warehouse Management System"

# 2. Install dependencies
npm install

# 3. Setup SSH tunnel to database
ssh -f -N -L 5433:localhost:5432 root@103.208.85.233

# 4. Configure environment
cp packages/backend/.env.example packages/backend/.env
# Edit .env with DB_PORT=5433

# 5. Start backend
cd packages/backend && npm run dev

# 6. Start frontend (new terminal)
cd packages/frontend && npm run dev
```

### Development URLs

| Service | URL |
|---------|-----|
| Frontend | http://localhost:5173 |
| Backend API | http://localhost:3001 |
| WebSocket | ws://localhost:3002 |
| API Health | http://localhost:3001/api/health |

---

## Environment Variables

### Backend Environment (`packages/backend/.env`)

```bash
# Node Environment
NODE_ENV=development

# Server Configuration (LOCKED PORTS)
PORT=3001          # 🔒 LOCKED - Backend API
HOST=0.0.0.0

# Database Configuration
# Local: Connect via SSH tunnel
DB_HOST=localhost
DB_PORT=5433       # Tunnel port (maps to remote:5432)
DB_NAME=wms_db
DB_USER=wms_user
DB_PASSWORD=your_password
DB_SSL=false

# WebSocket Configuration
WS_PORT=3002       # 🔒 LOCKED - WebSocket Server

# JWT Configuration
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=8h

# CORS (comma-separated origins)
CORS_ORIGIN=http://localhost:5173,http://localhost:3000
```

### Frontend Environment (`packages/frontend/.env`)

```bash
# API Proxy Target (for development)
VITE_API_PROXY_TARGET=http://localhost:3001
```

---

## Quick Reference

### Database Quick Reference

| Task | Database | Connection |
|------|----------|------------|
| Warehouse operations | wms_db | localhost:5433 (tunnel) |
| User authentication | aap_db | localhost:5433 (tunnel) |
| Integration logs | aap_db | localhost:5433 (tunnel) |

### Server Quick Reference

| Task | Command |
|------|---------|
| SSH to server | `ssh root@103.208.85.233` |
| Start SSH tunnel | `ssh -f -N -L 5433:localhost:5432 root@103.208.85.233` |
| Check PM2 status | `pm2 status` |
| View logs | `pm2 logs wms-backend` |
| Restart backend | `pm2 restart wms-backend` |

### AI Context Quick Reference

| File | Purpose |
|------|---------|
| `/ai_context.ts` | Machine-readable constants |
| `/PROJECT_CONTEXT.md` | This file - infrastructure docs |
| `/DATABASE_BOUNDARIES.md` | Database separation rules |
| `/AI_STARTUP_PROMPT.md` | AI session workflow |

---

## Summary

1. **Frontend** → Cloudflare Pages (NOT backend server)
2. **Backend** → Remote SSH server (103.208.85.233)
3. **Database** → PostgreSQL on same server (NOT Docker)
4. **wms_db** → Warehouse operations (TEST/DEV)
5. **aap_db** → Application + Integrations (CUSTOMER/PRODUCTION)
6. **Integrations** → Access WMS via API, not direct DB
7. **Local dev** → SSH tunnel (localhost:5433 → remote:5432)

---

**Related Files:**
- [`/ai_context.ts`](./ai_context.ts) - Machine-readable constants
- [`/DATABASE_BOUNDARIES.md`](./DATABASE_BOUNDARIES.md) - Database separation rules
- [`/AI_STARTUP_PROMPT.md`](./AI_STARTUP_PROMPT.md) - AI session workflow