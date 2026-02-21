# Enterprise Resource Planning (ERP) System - AI Context Template

**This header is automatically prepended to all AI agent conversations.**

**Last Enhanced**: 2025-01-19
**Context System Version**: 2.0

---

## 🚀 Quick Start for GLM 4.7

**Read these files FIRST (in order)**:

1. [`.project-index.json`](../.project-index.json) - Fast project navigation (30 seconds)
2. [`docs/QUICK_REFERENCE.md`](../docs/QUICK_REFERENCE.md) - Intent recognition patterns (2 minutes)
3. [`docs/DECISIONS.md`](../docs/DECISIONS.md) - Architectural decisions (5 minutes)
4. [`.cline-memory.md`](../.cline-memory.md) - Persistent project knowledge (2 minutes)

**Total time**: ~10 minutes for full context load

---

## Project Overview

**Project**: Enterprise Resource Planning (ERP) System
**Type**: Monorepo (npm workspaces)
**Domain**: Order fulfillment workflow
**Stack**: Node.js/Express + React + PostgreSQL + TypeScript
**Architecture**: Clean architecture, backend owns domain state
**AI-Optimized**: Yes - Comprehensive rules and patterns for GLM 4.7

---

## 🎯 Intent Recognition (How to Understand User)

| User Says     | Intent                  | Action                                        |
| ------------- | ----------------------- | --------------------------------------------- |
| "add feature" | Implement functionality | Use feature pattern from APPROVED_PATTERNS.md |
| "fix bug"     | Something broken        | Debug protocol; check tests                   |
| "optimize"    | Improve performance     | Profile first, then optimize                  |
| "refactor"    | Improve structure       | Maintain behavior, improve code               |
| "test this"   | Generate tests          | Auto-generate with MCP tool                   |
| "explain"     | Learn concepts          | Layered explanation                           |
| "run this"    | Start servers           | Use `npm run dev:restart`                     |
| "reset data"  | Fresh database          | Use `npm run db reset`                        |

**See [`docs/QUICK_REFERENCE.md`](../docs/QUICK_REFERENCE.md) for complete intent patterns**

---

## 📂 Dynamic Context (Auto-Populated)

**Current Session**:

- **Module**: {MODULE_NAME}
- **Owner**: {USER_ID}
- **Branch**: {BRANCH_NAME}
- **Working Directory**: {CWD}

**Recent Changes** (Auto-detected):

```
{RECENT_COMMITS}
{CHANGED_FILES}
```

**Test Status**:

```
{TEST_RESULTS}
{BUILD_STATUS}
```

**Owned Paths**:

```
{OWNED_PATHS}
```

---

## 🔗 Quick File Reference

**Domain Services** (from `.project-index.json`):

- **Orders**: [`packages/backend/src/services/OrderService.ts`](../packages/backend/src/services/OrderService.ts)
- **Inventory**: [`packages/backend/src/services/InventoryService.ts`](../packages/backend/src/services/InventoryService.ts)
- **Auth**: [`packages/backend/src/services/AuthService.ts`](../packages/backend/src/services/AuthService.ts)
- **Users**: [`packages/backend/src/services/UserService.ts`](../packages/backend/src/services/UserService.ts)
- **Metrics**: [`packages/backend/src/services/MetricsService.ts`](../packages/backend/src/services/MetricsService.ts)

**Critical Files**:

- **Rules**: [`.clinerules.md`](../.clinerules.md) (2,494 lines of protocols)
- **Patterns**: [`patterns/APPROVED_PATTERNS.md`](../patterns/APPROVED_PATTERNS.md)
- **Database**: [`packages/backend/src/db/schema.sql`](../packages/backend/src/db/schema.sql)

---

## ⚠️ Critical Constraints (READ THESE FIRST)

### 🚫 NEVER DO These Things

1. **NEVER modify files outside owned paths** without explicit team coordination
2. **NEVER use string literals for enums** - always import from `@wms/shared/types`
3. **NEVER skip transactions** for multi-step database operations
4. **NEVER bypass invariants** - they exist for data integrity
5. **NEVER delete from audit trail tables** (`*_transactions`, `order_state_changes`)
6. **NEVER disable foreign key constraints**
7. **NEVER expose database errors to API clients**
8. **NEVER add business logic to frontend components**

### ✅ ALWAYS DO These Things

1. **ALWAYS check ownership** before modifying files
2. **ALWAYS use imported types** from `@wms/shared/types`
3. **ALWAYS wrap multi-step operations in transactions**
4. **ALWAYS validate state transitions** before changing order status
5. **ALWAYS check inventory availability** before deducting
6. **ALWAYS run tests** before proposing changes
7. **ALWAYS review generated code** for rule violations
8. **ALWAYS follow existing patterns** in the codebase

---

## State Machine (MEMORIZE THIS)

```
PENDING ──────→ PICKING ──→ PICKED ──→ PACKING ──→ PACKED ──→ SHIPPED
   │              │
   ↓              ↓
CANCELLED     CANCELLED

PENDING ──────→ BACKORDER ──→ PENDING
```

### Valid Transitions

- `PENDING → PICKING, CANCELLED, BACKORDER`
- `PICKING → PICKED, CANCELLED`
- `PICKED → PACKING`
- `PACKING → PACKED`
- `PACKED → SHIPPED`
- `BACKORDER → PENDING`

**Terminal states**: `SHIPPED`, `CANCELLED` (no transitions allowed)

---

## Available Imports

### Core Types

```typescript
import { OrderStatus, OrderPriority, OrderItemStatus } from '@wms/shared/types';
import { UserRole, TaskStatus } from '@wms/shared/types';
import { Order, PickTask, User, Inventory } from '@wms/shared/types';
```

### Workflow Guardrails

```typescript
import {
  validateTransition,
  isValidTransition,
  getNextStates,
  isTerminalState,
  isCancellable,
} from '@wms/shared/types/workflow';
```

### Invariants

```typescript
import {
  invariantInventoryNeverNegative,
  invariantReservedNeverExceedsTotal,
  invariantPickedNeverExceedsOrdered,
  invariantQuantityAlwaysPositive,
  invariantPickerRequiredForPickingStates,
  invariantAvailableInventorySufficient,
} from '@wms/shared/types/invariants';
```

### Constants

```typescript
import {
  PICKER_CONFIG,
  PACKER_CONFIG,
  ORDER_CONFIG,
  INVENTORY_CONFIG,
  BIN_LOCATION_CONFIG,
  BACKEND_CONFIG,
  DATABASE_CONFIG,
} from '@wms/shared/constants/system';
```

---

## Business Rules

### Picking Module

- Picker can claim max `PICKER_CONFIG.MAX_ORDERS_PER_PICKER` (10) orders
- Pick timeout after `PICKER_CONFIG.PICK_TIMEOUT_MINUTES` (30) minutes
- Must validate bin location format: `BIN_LOCATION_CONFIG.BIN_ID_PATTERN` (Z-A-S)
- All items must be fully picked before `PICKING → PICKED` transition

### Packing Module

- Packer can handle max `PACKER_CONFIG.MAX_ORDERS_PER_PACKER` (5) orders
- Must have picker assigned before `PICKED → PACKING` transition
- Must have packer assigned before `PACKING` state
- Shipping info required before `PACKED → SHIPPED` transition

### Inventory

- Inventory can never be negative
- Reserved quantity can never exceed total quantity
- Available = quantity - reserved (computed column)
- Low stock threshold = `INVENTORY_CONFIG.LOW_STOCK_THRESHOLD` (10)

---

## Code Patterns

### Service Layer Transaction

```typescript
return await db.transaction(async trx => {
  // All operations here are atomic
  const order = await updateOrderStatus(trx, orderId, newStatus);
  await logStateChange(trx, orderId, oldStatus, newStatus);
  return order;
});
```

### State Transition

```typescript
// Validate before transitioning
await validateTransition(order.status, OrderStatus.PICKING, {
  orderId,
  pickerId: currentUser.id,
  orderItems: order.items,
  maxOrdersPerPicker: PICKER_CONFIG.MAX_ORDERS_PER_PICKER,
  getActiveOrderCount: id => orderService.getActiveCount(id),
  getAvailableInventory: (sku, bin) => inventoryService.getAvailable(sku, bin),
  // ... other context
});

// Then make the change
await db.orders.update({ status: OrderStatus.PICKING });
```

### Error Handling

```typescript
import {
  InventoryError,
  ValidationError,
  NotFoundError,
  ConflictError,
} from '@wms/shared/types';

// Check inventory first
const available = await getAvailableInventory(sku, quantity);
if (available < quantity) {
  throw new InventoryError(`Insufficient inventory for ${sku}`);
}
```

---

## Team Coordination

### Before Modifying Shared Code

```
Post in team chat:
"Planning to modify: {file}
Reason: {why}
Affects: {who}
Anyone working on dependent code?"
```

### Coordination Required For

- `packages/shared/src/types/` - All team members
- `packages/backend/src/db/schema.sql` - All team members
- `packages/backend/src/services/order.ts` - Picking, Packing, Admin
- Any API contract changes

### Module Owners

- **Picking**: @friend1
- **Packing**: @friend2
- **Admin**: @you

---

## Testing

### Before Proposing Changes

```bash
# Run all tests
npm test

# Run module-specific tests
npm test -- packages/frontend/src/pages/picking/
npm test -- packages/backend/src/services/picking/

# Build to verify TypeScript
npm run build
```

### Test Coverage Target

- Unit tests: > 80%
- Integration tests: > 70%
- E2E tests: Critical user flows

---

## File Structure

```
packages/
├── backend/
│   ├── src/
│   │   ├── controllers/     # HTTP request handlers
│   │   ├── services/        # Business logic (THIS IS WHERE DOMAIN LOGIC LIVES)
│   │   ├── repositories/    # Data access layer
│   │   ├── middleware/      # Express middleware
│   │   ├── routes/          # API route definitions
│   │   ├── models/          # Database models
│   │   └── db/              # Database connection and migrations
│   └── .env                 # Environment configuration (NEVER COMMIT)
├── frontend/
│   ├── src/
│   │   ├── pages/           # Page components
│   │   ├── components/      # Reusable components
│   │   ├── services/        # API client calls
│   │   ├── stores/          # Zustand state stores
│   │   └── hooks/           # Custom React hooks
│   └── vite.config.ts       # Build configuration
├── shared/
│   └── src/
│       ├── types/           # Domain types (SINGLE SOURCE OF TRUTH)
│       ├── constants/       # System constants
│       └── utils/           # Shared utilities
└── ml/                      # Machine Learning pipeline
```

---

## Quick Reference Commands

### Ownership Check

```bash
npx ts-node scripts/check-ownership.ts {USER_ID} {file_path}
```

### Find Relevant Code

```bash
# Search for type definitions
grep -r "OrderStatus" packages/shared/src/types/

# Search for usage
grep -r "OrderStatus.PICKING" packages/

# Find service methods
grep -r "async.*Order" packages/backend/src/services/
```

### Database Schema

```bash
# View schema
cat packages/backend/src/db/schema.sql

# Run migration
npm run db:migrate

# Seed database
npm run db:seed
```

---

## Common Mistakes to Avoid

### ❌ Wrong

```typescript
// String literal for enum
const status = 'PICKING';

// No transaction
await updateOrderStatus(id, 'PICKING');
await createPickTask(id);

// No invariant check
inventory.quantity -= requested;

// Business logic in frontend
const available = order.quantity - order.reserved;
```

### ✅ Correct

```typescript
// Imported enum
import { OrderStatus } from '@wms/shared/types';
const status = OrderStatus.PICKING;

// Wrapped in transaction
return await db.transaction(async trx => {
  await updateOrderStatus(trx, id, OrderStatus.PICKING);
  await createPickTask(trx, id);
});

// Invariant validation
invariantInventoryNeverNegative(inventory.quantity - requested);

// Backend provides calculated field
const inventory = await fetchInventory(sku);
const available = inventory.available; // DB computed column
```

---

## Error Codes Reference

```typescript
import { ERROR_CODES } from '@wms/shared/constants/system';

// Inventory
ERROR_CODES.INSUFFICIENT_INVENTORY;
ERROR_CODES.INVENTORY_RESERVED;
ERROR_CODES.BIN_LOCATION_FULL;

// Order
ERROR_CODES.INVALID_ORDER_STATE;
ERROR_CODES.ORDER_ALREADY_CLAIMED;
ERROR_CODES.PICKER_AT_CAPACITY;

// Validation
ERROR_CODES.VALIDATION_ERROR;
ERROR_CODES.INVALID_INPUT;
```

---

## Performance Considerations

- Use database indexes (already defined in schema.sql)
- Use `SELECT FOR UPDATE` to prevent race conditions
- Implement caching for frequently accessed data
- Use pagination for list queries
- Batch operations when possible

---

## Security Rules

- All API endpoints (except login) require authentication
- Input validation using Joi schemas
- Parameterized queries only (no SQL injection)
- Passwords hashed with bcrypt (10+ rounds)
- JWT tokens for authentication
- Role-based access control (check `UserRole`)

---

## When in Doubt

1. **Read existing code** - Follow established patterns
2. **Check database schema** - Constraints are authoritative
3. **Check AI rules** - AI_RULES.md, CLINE_RULES.md
4. **Ask for clarification** - Don't guess on architectural decisions
5. **Run tests** - Verify changes don't break anything

---

## Session End Checklist

Before completing any task, verify:

- [ ] All files modified are within owned paths (or coordinated)
- [ ] All enums imported from `@wms/shared/types`
- [ ] All multi-step operations use transactions
- [ ] All state transitions validated
- [ ] All invariants checked
- [ ] Tests pass (`npm test`)
- [ ] Build succeeds (`npm run build`)
- [ ] No TypeScript errors
- [ ] No lint warnings
- [ ] Code follows existing patterns

---

**Remember**: This is a production system used in warehouse operations. Bugs affect real workers and real customers. Quality matters.

**When in doubt, ask.** Better to coordinate than to break something.

**You've got this!** 🚀
