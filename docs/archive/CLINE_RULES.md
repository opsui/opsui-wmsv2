# Cline-Specific Rules for Warehouse Management System

**Purpose**: Execution rules and constraints specifically for Cline agents using GLM-4.7.

**Version**: 1.0.0
**Last Updated**: 2025-01-12

---

## Execution-Only Behavior

### What "Execution-Only" Means

Cline operates as an **execution agent**, not an architect. Your role is to:

1. **Implement requested features** following existing patterns
2. **Fix identified bugs** with minimal scoped changes
3. **Apply requested refactorings** within architectural boundaries
4. **NEVER redesign the system** unless explicitly instructed

### Red Flags That Require User Confirmation

- "I think we should rewrite..." → **STOP**, ask user
- "This architecture would be better if..." → **STOP**, ask user
- "Let's restructure this module..." → **STOP**, ask user
- "I'm going to create a new pattern for..." → **STOP**, ask user

**Rule**: When in doubt, implement exactly what was asked, nothing more.

---

## Architectural Rewrite Restrictions

### FORBIDDEN Rewrites (Without Explicit Instruction)

- **DO NOT** change the order state machine
- **DO NOT** restructure the monorepo layout
- **DO NOT** replace the database schema
- **DO NOT** switch from PostgreSQL to another database
- **DO NOT** replace React with another framework
- **DO NOT** change the service layer architecture
- **DO NOT** remove the audit trail system
- **DO NOT** eliminate foreign key constraints

### ALLOWED Refactorings (Within Reason)

- Extract repeated code into helper functions
- Improve type safety by adding proper typing
- Optimize database queries (without changing schema)
- Improve error messages
- Add missing validation

**Rule**: Refactorings must preserve all existing behavior and constraints.

---

## Enum, Constant, and Workflow State Rules

### ALWAYS Use Enums from Shared Types

```typescript
// ❌ WRONG - Using string literals
const status = 'PICKING';

// ✅ CORRECT - Using imported enum
import { OrderStatus } from '@wms/shared/types';
const status = OrderStatus.PICKING;
```

### NEVER Extend Enum Values

```typescript
// ❌ WRONG - Adding new status to enum
export enum OrderStatus {
  // ... existing values ...
  MY_NEW_STATUS = 'MY_NEW_STATUS', // FORBIDDEN
}

// ✅ CORRECT - Ask user to add it to shared/types/index.ts first
```

### NEVER Invent Data Not Present in Backend

```typescript
// ❌ WRONG - Assuming field exists
const order = await fetchOrder(id);
const myInventedField = order.someNewField; // Does not exist in DB

// ✅ CORRECT - Check database schema first
// If field doesn't exist in schema.sql, don't use it
```

### ALWAYS Validate Against Database Schema

Before adding or modifying any field:

1. Check `packages/backend/src/db/schema.sql`
2. Verify the column exists (or ask user to add migration)
3. Update TypeScript types in `packages/shared/src/types/index.ts`
4. Update both frontend and backend code

---

## Frontend-Backend Schema Synchronization

### The Golden Rule

**Frontend and backend types MUST match at all times.**

### How to Maintain Sync

#### When Adding a New Field to Backend

```typescript
// 1. Update shared types (packages/shared/src/types/index.ts)
export interface Order {
  // ... existing fields ...
  newField: string;  // Add here first
}

// 2. Update database schema (packages/backend/src/db/schema.sql)
ALTER TABLE orders ADD COLUMN new_field VARCHAR(255);

// 3. Update backend service/repository to handle new field

// 4. Update frontend component to use new field
import { Order } from '@wms/shared/types';
const field = order.newField;  // Type-safe
```

#### When Adding a New API Endpoint

```typescript
// 1. Define DTO in shared types
export interface NewFeatureDTO {
  param1: string;
  param2: number;
}

// 2. Implement backend controller/service
// Use the DTO for request validation

// 3. Update frontend API client
import { NewFeatureDTO } from '@wms/shared/types';

// 4. Update frontend component to call API
```

### Synchronization Checklist

Before completing any task:

- [ ] Shared types updated
- [ ] Backend code compiles with new types
- [ ] Frontend code compiles with new types
- [ ] Database schema matches types (if applicable)
- [ ] Tests pass for both frontend and backend

---

## Workflow State Respect

### Order State Machine (COPY TO MEMORY)

```
PENDING → PICKING → PICKED → PACKING → PACKED → SHIPPED
   ↓         ↓
CANCELLED CANCELLED

Additional states: BACKORDER (from PENDING only)
```

### State Transition Validation

Before changing order status:

```typescript
// ❌ WRONG - Unvalidated transition
order.status = OrderStatus.SHIPPED; // From PICKING? Invalid!

// ✅ CORRECT - Validate transition
function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  const validTransitions = {
    [OrderStatus.PENDING]: [
      OrderStatus.PICKING,
      OrderStatus.CANCELLED,
      OrderStatus.BACKORDER,
    ],
    [OrderStatus.PICKING]: [OrderStatus.PICKED, OrderStatus.CANCELLED],
    [OrderStatus.PICKED]: [OrderStatus.PACKING],
    [OrderStatus.PACKING]: [OrderStatus.PACKED],
    [OrderStatus.PACKED]: [OrderStatus.SHIPPED],
    [OrderStatus.SHIPPED]: [], // Terminal state
    [OrderStatus.CANCELLED]: [], // Terminal state
    [OrderStatus.BACKORDER]: [OrderStatus.PENDING],
  };

  return validTransitions[from]?.includes(to) ?? false;
}
```

### State Change Requirements

1. **Validate transition is allowed** (use the rules above)
2. **Verify prerequisites** (e.g., inventory reserved before PICKING)
3. **Use database transaction** (atomic state change)
4. **Let DB trigger handle logging** (automatic audit trail in `order_state_changes`)

---

## Common Mistakes to Avoid

### Mistake 1: Adding Business Logic to Frontend

```typescript
// ❌ WRONG - Frontend calculating inventory
const available = inventory.quantity - inventory.reserved;

// ✅ CORRECT - Backend provides calculated field
const inventory = await fetchInventory(sku);
const available = inventory.available; // DB computed column
```

### Mistake 2: Bypassing Service Layer

```typescript
// ❌ WRONG - Controller querying DB directly
router.get('/orders/:id', async (req, res) => {
  const order = await db.query('SELECT * FROM orders WHERE order_id = $1', [
    req.params.id,
  ]);
  res.json(order);
});

// ✅ CORRECT - Controller calls service
router.get('/orders/:id', async (req, res) => {
  const order = await orderService.getOrderById(req.params.id);
  res.json(order);
});
```

### Mistake 3: Not Checking Inventory Before Operations

```typescript
// ❌ WRONG - Assuming inventory exists
await deductInventory(sku, quantity);

// ✅ CORRECT - Check availability first
const available = await getAvailableInventory(sku);
if (available < quantity) {
  throw new InventoryError(`Insufficient inventory for ${sku}`);
}
await deductInventory(sku, quantity);
```

### Mistake 4: Using String Literals for Enum Values

```typescript
// ❌ WRONG - String literal in query
db.query('SELECT * FROM orders WHERE status = $1', ['PICKING']);

// ✅ CORRECT - Using enum value
db.query('SELECT * FROM orders WHERE status = $1', [OrderStatus.PICKING]);
```

### Mistake 5: Forgetting Transaction Rollback

```typescript
// ❌ WRONG - No error handling
await db.query('UPDATE inventory SET reserved = reserved + $1', [qty]);
await db.query('INSERT INTO orders ...');

// ✅ CORRECT - Transaction with rollback
await db.transaction(async (trx) => {
  await trx('inventory').increment('reserved', qty);
  await trx('orders').insert({...});
});
```

---

## Code Style Consistency

### Follow Existing Patterns

- **Controller pattern**: See `packages/backend/src/controllers/` for examples
- **Service pattern**: See `packages/backend/src/services/` for examples
- **Repository pattern**: See `packages/backend/src/repositories/` for examples
- **Component pattern**: See `packages/frontend/src/components/` for examples

### Naming Conventions

- **Files**: `kebab-case.ts` (e.g., `order-service.ts`)
- **Classes**: `PascalCase` (e.g., `OrderService`)
- **Functions/Variables**: `camelCase` (e.g., `getOrderById`)
- **Constants**: `UPPER_SNAKE_CASE` (e.g., `MAX_ORDERS_PER_PICKER`)
- **Types/Interfaces**: `PascalCase` (e.g., `Order`, `CreateOrderDTO`)

---

## Testing Requirements

### Write Tests For

- All new business logic in services
- All new API endpoints
- All new UI components
- Bug fixes (add regression test)

### Test Structure

```typescript
// Unit test example
describe('OrderService', () => {
  it('should claim order for picker', async () => {
    // Arrange
    const orderId = 'ORD-12345';
    const pickerId = 'USR-001';

    // Act
    const result = await orderService.claimOrder(orderId, pickerId);

    // Assert
    expect(result.status).toBe(OrderStatus.PICKING);
    expect(result.pickerId).toBe(pickerId);
  });
});
```

---

## When You're Unsure

### Decision Tree

```
Is the change clearly described?
├─ No → Ask user for clarification
└─ Yes → Continue

Does the change follow existing patterns?
├─ No → Ask user if you should refactor
└─ Yes → Continue

Does the change require schema modification?
├─ Yes → Ask user to approve migration
└─ Yes → Continue

Does the change risk breaking audit trail?
├─ Yes → STOP and ask user
└─ No → Implement
```

### Questions to Ask User

- "This change requires modifying the database schema. Should I create a migration?"
- "The existing pattern is X, but the request suggests Y. Should I follow the existing pattern?"
- "This change affects the order state machine. Please confirm the new transition is valid."
- "I need to add a new field. Should this be in the shared types package?"

---

## Final Reminders

1. **Backend is authoritative** - frontend displays what backend provides
2. **Database constraints are law** - never bypass them
3. **Types must sync** - frontend and backend use same shared types
4. **Use the enums** - never use string literals for state values
5. **Transactions for multi-step** - all-or-nothing database changes
6. **Audit trails are sacred** - never skip logging
7. **Follow patterns** - consistency over cleverness
8. **Ask when unsure** - it's better to ask than to break things

**Remember**: You're executing instructions, not redesigning the system. When in doubt, stick to existing patterns and ask for clarification.
