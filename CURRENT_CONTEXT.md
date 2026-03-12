# CURRENT_CONTEXT.md

> **AI Context System - Session State Tracking**
> 
> **Version:** 1.0.0 | **Last Updated:** 2026-03-12
> 
> **Purpose:** Track the current focus area during AI coding sessions

---

## How to Use This File

1. **At session start:** Read this file to understand current focus
2. **During session:** Update as context changes
3. **Before coding:** Confirm the context is correct

---

## Current Session State

> **INSTRUCTIONS:** Update this section at the start of each session or when context changes

```yaml
# SESSION CONTEXT - UPDATE BEFORE CODING
session_date: "YYYY-MM-DD"
current_database: "wms_db | aap_db | UNKNOWN"  # Which DB are we working with?
current_environment: "test | customer | UNKNOWN"  # Test or production?
current_service: "warehouse | application | integration | UNKNOWN"  # Service area?
current_focus: "Brief description of what we're working on"
confirmed_with_user: false  # Set to true after confirming with user
```

---

## Quick Context Checklist

Before starting ANY coding task, confirm:

- [ ] **Database:** Which database? (wms_db = test, aap_db = customer)
- [ ] **Environment:** Test or production?
- [ ] **Service:** Warehouse, application, or integration?
- [ ] **Approval:** If aap_db, do I have explicit approval?
- [ ] **Reference:** Have I read `/ai_context.ts`?

---

## Context Decision Tree

```
                        ┌─────────────────────────┐
                        │   What are you          │
                        │   working on?           │
                        └───────────┬─────────────┘
                                    │
        ┌───────────────────────────┼───────────────────────────┐
        │                           │                           │
        ▼                           ▼                           ▼
┌───────────────┐          ┌───────────────┐          ┌───────────────┐
│   WAREHOUSE   │          │   USER/AUTH   │          │ INTEGRATION   │
│   OPERATIONS  │          │               │          │               │
├───────────────┤          ├───────────────┤          ├───────────────┤
│ • Orders      │          │ • Login       │          │ • NetSuite    │
│ • Picking     │          │ • Permissions │          │ • Shopify     │
│ • Inventory   │          │ • Users       │          │ • Carriers    │
│ • Packing     │          │ • Orgs        │          │ • Sync logs   │
│ • Shipping    │          │               │          │               │
└───────┬───────┘          └───────┬───────┘          └───────┬───────┘
        │                           │                           │
        ▼                           ▼                           ▼
┌───────────────┐          ┌───────────────┐          ┌───────────────┐
│    wms_db     │          │    aap_db     │          │    aap_db     │
│    (TEST)     │          │  (PRODUCTION) │          │  (PRODUCTION) │
└───────────────┘          └───────────────┘          └───────────────┘
```

---

## Session History Template

> Copy and fill out for each significant work session

### Session: YYYY-MM-DD

**Focus:**
- What did we work on?

**Database:**
- Which database(s) were accessed?

**Changes:**
- What files were modified?

**Notes:**
- Any important context for future sessions?

---

## Active Development Areas

### Current Sprint/Feature

```yaml
feature_name: ""
description: ""
target_database: ""
affected_services: []
status: "planning | in_progress | review | complete"
```

### Pending Work

| Task | Database | Status | Notes |
|------|----------|--------|-------|
| - | - | - | - |

---

## Context Verification Script

> Run this mentally before each coding task

```
1. What database am I targeting?
   [ ] wms_db (TEST) - Safe for development
   [ ] aap_db (CUSTOMER) - Requires approval
   [ ] UNKNOWN - STOP and clarify

2. What service area am I in?
   [ ] Warehouse (orders, picking, inventory)
   [ ] Application (auth, users, orgs)
   [ ] Integration (NetSuite, Shopify, carriers)
   [ ] UNKNOWN - STOP and clarify

3. What environment am I in?
   [ ] Test/Development
   [ ] Production/Customer
   [ ] UNKNOWN - STOP and clarify

4. If aap_db or production:
   [ ] I have explicit user approval
   [ ] I understand the risks
   [ ] I am NOT modifying schemas

5. I have read /ai_context.ts:
   [ ] YES
   [ ] NO - READ IT FIRST
```

---

## Common Context Scenarios

### Scenario 1: Order Picking Feature

```yaml
current_database: "wms_db"
current_environment: "test"
current_service: "warehouse"
current_focus: "Adding batch picking capability"
confirmed_with_user: true
```

### Scenario 2: User Authentication

```yaml
current_database: "aap_db"
current_environment: "customer"
current_service: "application"
current_focus: "Adding SSO integration"
confirmed_with_user: true  # REQUIRED - customer DB
```

### Scenario 3: NetSuite Order Sync

```yaml
current_database: "aap_db"
current_environment: "customer"
current_service: "integration"
current_focus: "Syncing orders from NetSuite"
confirmed_with_user: true  # REQUIRED - customer DB
```

---

## Risk Levels

| Database | Environment | Risk Level | Approval Required |
|----------|-------------|------------|-------------------|
| wms_db | Test | Medium | No (standard dev) |
| aap_db | Customer | **HIGH** | **YES - ALWAYS** |

---

## Quick Reference

### Database → Service Mapping

| If working with... | Use database... |
|--------------------|-----------------|
| Orders, picking, inventory, shipping | wms_db |
| User login, permissions, organizations | aap_db |
| NetSuite, Shopify, carrier integrations | aap_db |
| Integration logs, sync history | aap_db |

### Service → Database Mapping

| Service | Database | Access Pattern |
|---------|----------|----------------|
| OrderService | wms_db | Direct |
| InventoryService | wms_db | Direct |
| AuthService | aap_db | Direct |
| IntegrationsService | aap_db | API to WMS |

---

## Session End Checklist

Before ending a session:

- [ ] Update session history with what was done
- [ ] Note any pending work
- [ ] Document any important decisions
- [ ] Update current context if it changed

---

**Related Files:**
- [`/ai_context.ts`](./ai_context.ts) - Machine-readable constants
- [`/DATABASE_BOUNDARIES.md`](./DATABASE_BOUNDARIES.md) - Database separation rules
- [`/AI_STARTUP_PROMPT.md`](./AI_STARTUP_PROMPT.md) - AI session workflow