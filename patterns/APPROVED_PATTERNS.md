# Approved Code Patterns for ERP Development

**Purpose**: Library of approved patterns that AI agents should follow.

**Version**: 1.0.0
**Last Updated**: 2025-01-12

---

## Pattern: Service Layer Transaction

**Category**: Data Integrity
**When**: Any multi-step database operation
**Why**: Ensures atomicity - all changes succeed or all fail together

### ❌ WRONG - No Transaction

```typescript
async function claimOrder(orderId: string, pickerId: string) {
  // If this fails, order is updated but pick task isn't created
  await db.orders.update({ order_id: orderId, status: 'PICKING' });
  await db.pick_tasks.create({ order_id: orderId, picker_id: pickerId });
}
```

**Problem**: Partial updates if second operation fails → data corruption

### ✅ CORRECT - Wrapped in Transaction

```typescript
async function claimOrder(orderId: string, pickerId: string): Promise<Order> {
  return await db.transaction(async trx => {
    const order = await trx('orders')
      .where({ order_id: orderId })
      .update({ status: OrderStatus.PICKING })
      .returning('*')
      .first();

    await trx('pick_tasks').insert({
      order_id: orderId,
      picker_id: pickerId,
      status: TaskStatus.PENDING,
    });

    return order;
  });
}
```

**Benefit**: Atomic operation - either both succeed or both roll back

---

## Pattern: Enum Usage

**Category**: Type Safety
**When**: Any reference to order status, user role, priority, etc.
**Why**: Prevents typos, enables autocomplete, catches errors at compile time

### ❌ WRONG - String Literal

```typescript
const status = 'PICKING';
if (order.status === 'PICKED') { ... }

// Typos not caught until runtime
const badStatus = 'PICKEING';  // Oops!
```

**Problem**: Typos cause runtime bugs, no autocomplete

### ✅ CORRECT - Imported Enum

```typescript
import { OrderStatus } from '@wms/shared/types';

const status = OrderStatus.PICKING;
if (order.status === OrderStatus.PICKED) { ... }

// Compile-time error if typo
const badStatus = OrderStatus.PICKEING;  // Error: Property 'PICKEING' does not exist
```

**Benefit**: Type-safe, autocomplete, compile-time error checking

---

## Pattern: Invariant Validation

**Category**: Data Integrity
**When**: Modifying inventory or order state
**Why**: Enforces business rules that must never be violated

### ❌ WRONG - No Validation

```typescript
async function deductInventory(sku: string, quantity: number) {
  const current = await getInventory(sku);
  const newQuantity = current.quantity - quantity;

  // What if this goes negative?
  await updateInventory(sku, { quantity: newQuantity });
}
```

**Problem**: Can create negative inventory → data corruption

### ✅ CORRECT - Validate Invariant

```typescript
import { invariantInventoryNeverNegative } from '@wms/shared/types/invariants';

async function deductInventory(sku: string, quantity: number) {
  const current = await getInventory(sku);
  const newQuantity = current.quantity - quantity;

  // Validate invariant before making change
  invariantInventoryNeverNegative(newQuantity);

  await updateInventory(sku, { quantity: newQuantity });
}
```

**Benefit**: Throws error before data corruption occurs

---

## Pattern: State Transition Validation

**Category**: Business Logic
**When**: Changing order status
**Why**: Ensures only valid state transitions occur

### ❌ WRONG - Unvalidated Transition

```typescript
async function transitionToPicking(orderId: string) {
  // What if order is already SHIPPED?
  await updateOrderStatus(orderId, OrderStatus.PICKING);
}
```

**Problem**: Invalid transitions break audit trail and business logic

### ✅ CORRECT - Validate Transition

```typescript
import { validateTransition, OrderStatus } from '@wms/shared/types/workflow';

async function transitionToPicking(orderId: string, pickerId: string) {
  const order = await getOrder(orderId);

  // Validate transition before making change
  await validateTransition(order.status, OrderStatus.PICKING, {
    orderId,
    pickerId,
    orderItems: order.items,
    maxOrdersPerPicker: PICKER_CONFIG.MAX_ORDERS_PER_PICKER,
    getActiveOrderCount: id => getActiveOrderCount(id),
    getAvailableInventory: (sku, bin) => getInventory(sku, bin),
    getPicker: id => getUser(id),
    getIncompletePickTasks: id => getPickTasks(id),
    releaseReservedInventory: id => {},
  });

  // Then make the change
  return await updateOrderStatus(orderId, OrderStatus.PICKING);
}
```

**Benefit**: Only valid transitions allowed, prerequisites checked

---

## Pattern: Error Handling

**Category**: API Design
**When**: API endpoint or service method
**Why**: Don't expose internals, map to domain errors

### ❌ WRONG - Exposing Database Errors

```typescript
app.get('/orders/:id', async (req, res) => {
  try {
    const order = await getOrder(req.params.id);
    res.json(order);
  } catch (error) {
    // Exposes database internals to client
    res.status(500).json({ error: error.message });
  }
});
```

**Problem**: Security risk, confusing error messages for users

### ✅ CORRECT - Map to Domain Errors

```typescript
import { NotFoundError, WMSError } from '@wms/shared/types';

app.get('/orders/:id', async (req, res, next) => {
  try {
    const order = await orderService.getOrderById(req.params.id);
    res.json(order);
  } catch (error) {
    // Map database errors to domain errors
    if (error.code === '23503') {  // Foreign key violation
      return next(new ValidationError('Related resource not found'));
    }
    if (error.code === '23505') {  // Unique violation
      return next(new ConflictError('Resource already exists'));
    }

    // Pass through domain errors as-is
    if (error instanceof WMSError) {
      return next(error);
    }

    // Unknown errors become 500
    next new InternalServerError();
  }
});
```

**Benefit**: Clean error messages, no internal exposure

---

## Pattern: Type Import from Shared

**Category**: Code Organization
**When**: Any type definition used in multiple places
**Why**: Single source of truth, prevents drift

### ❌ WRONG - Duplicating Type Definitions

```typescript
// In frontend:
interface Order {
  id: string;
  status: string;
  items: OrderItem[];
}

// In backend:
interface Order {
  id: string;
  status: string;
  items: OrderItem[];
}

// Drift occurs when one is updated but not the other!
```

**Problem**: Types drift apart, bugs at integration boundaries

### ✅ CORRECT - Import from Shared

```typescript
// In both frontend and backend:
import { Order, OrderStatus } from '@wms/shared/types';

// Single source of truth
```

**Benefit**: Guaranteed consistency across codebase

---

## Pattern: Inventory Reservation

**Category**: Business Logic
**When**: Order is created or claimed
**Why**: Prevents overselling, ensures availability

### ❌ WRONG - No Reservation

```typescript
async function createOrder(items: OrderItem[]) {
  // Check availability
  for (const item of items) {
    const available = await getAvailableInventory(item.sku);
    if (available < item.quantity) {
      throw new Error('Insufficient inventory');
    }
  }

  // Create order
  const order = await db.orders.insert({ items, status: 'PENDING' });

  // But inventory isn't reserved! Someone else could take it.
  return order;
}
```

**Problem**: Race condition - two orders can claim same inventory

### ✅ CORRECT - Reserve in Transaction

```typescript
async function createOrder(items: OrderItem[]) {
  return await db.transaction(async trx => {
    // Check and reserve in same transaction
    for (const item of items) {
      const available = await getAvailableInventory(
        trx,
        item.sku,
        item.binLocation
      );

      if (available < item.quantity) {
        throw new InventoryError(`Insufficient inventory for ${item.sku}`);
      }

      // Reserve immediately
      await trx('inventory')
        .where({ sku: item.sku, bin_location: item.binLocation })
        .increment('reserved', item.quantity);
    }

    // Create order
    const order = await trx('orders')
      .insert({
        items,
        status: OrderStatus.PENDING,
      })
      .returning('*');

    return order;
  });
}
```

**Benefit**: No race conditions, inventory guaranteed

---

## Pattern: Controller-Service-Repository

**Category**: Architecture
**When**: Handling API requests
**Why**: Separation of concerns, testability

### ❌ WRONG - Everything in Controller

```typescript
router.post('/orders/:id/claim', async (req, res) => {
  // Business logic in controller
  const order = await db('orders').where({ id: req.params.id }).first();
  const picker = await db('users').where({ id: req.body.pickerId }).first();
  const activeCount = await db('orders').where({ picker_id: req.body.pickerId, status: 'PICKING' }).count();
  if (activeCount > 10) throw new Error('Too many orders');

  // Data access in controller
  await db('orders').update({ status: 'PICKING' });
  await db('pick_tasks').insert({ ... });

  res.json({ success: true });
});
```

**Problem**: Untestable, hard to reuse, mixed concerns

### ✅ CORRECT - Layered Architecture

```typescript
// Controller - handles HTTP
router.post('/orders/:id/claim', async (req, res, next) => {
  try {
    const result = await orderService.claimOrder(
      req.params.id,
      req.body.pickerId
    );
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// Service - business logic
async function claimOrder(orderId: string, pickerId: string) {
  // All business logic here
  const order = await orderRepository.findById(orderId);
  if (!order) throw new NotFoundError('Order not found');

  const activeCount = await orderRepository.getActiveOrderCount(pickerId);
  if (activeCount >= PICKER_CONFIG.MAX_ORDERS_PER_PICKER) {
    throw new ValidationError('Picker at capacity');
  }

  return await orderRepository.claimOrder(orderId, pickerId);
}

// Repository - data access
async function claimOrder(orderId: string, pickerId: string) {
  return await db.transaction(async trx => {
    return await trx('orders')
      .where({ order_id: orderId })
      .update({ status: OrderStatus.PICKING, picker_id: pickerId })
      .returning('*')
      .first();
  });
}
```

**Benefit**: Testable, reusable, clear separation

---

## Pattern: Audit Logging

**Category**: Compliance
**When**: Any state change or inventory modification
**Why**: Legal requirement, debugging, accountability

### ❌ WRONG - No Audit Trail

```typescript
async function updateOrderStatus(orderId: string, status: OrderStatus) {
  await db('orders').where({ order_id: orderId }).update({ status });
}
```

**Problem**: No history, can't debug issues, compliance violation

### ✅ CORRECT - Automatic Audit via Database Trigger

```typescript
// Application code - clean and simple
async function updateOrderStatus(orderId: string, status: OrderStatus) {
  await db('orders').where({ order_id: orderId }).update({ status });
  // Audit trail is automatic via database trigger!
}
```

**Database trigger handles audit**:

```sql
CREATE TRIGGER log_order_state_change
AFTER UPDATE ON orders
FOR EACH ROW
WHEN (OLD.status IS DISTINCT FROM NEW.status)
BEGIN
  INSERT INTO order_state_changes (order_id, old_status, new_status, changed_at)
  VALUES (NEW.order_id, OLD.status, NEW.status, NOW());
END;
```

**Benefit**: Automatic audit trail, can't be bypassed

---

## Pattern: Idempotent Operations

**Category**: Reliability
**When**: Operations that might be retried
**Why**: Safe to retry on network failures

### ❌ WRONG - Not Idempotent

```typescript
async function claimOrder(orderId: string, pickerId: string) {
  // Claiming twice creates duplicate pick tasks
  await db('orders')
    .where({ order_id: orderId })
    .update({ picker_id: pickerId });
  await db('pick_tasks').insert({ order_id: orderId, picker_id: pickerId });
}
```

**Problem**: Retry creates duplicates

### ✅ CORRECT - Idempotent

```typescript
async function claimOrder(orderId: string, pickerId: string) {
  const result = await db('orders')
    .where({ order_id: orderId, picker_id: null }) // Only claim if unclaimed
    .update({ picker_id: pickerId });

  if (result === 0) {
    throw new ConflictError('Order already claimed');
  }

  // Insert with unique constraint on (order_id, picker_id)
  await db('pick_tasks')
    .insert({ order_id: orderId, picker_id: pickerId })
    .onConflict('order_id, picker_id')
    .ignore(); // Ignore if already exists
}
```

**Benefit**: Safe to retry, no duplicates

---

## Pattern: Validation Before Database

**Category**: Performance
**When**: Complex business rules
**Why**: Better error messages, avoid wasted DB work

### ❌ WRONG - Let Database Reject

```typescript
async function claimOrder(orderId: string, pickerId: string) {
  // Database might reject with cryptic error
  await db('orders').insert({
    order_id: orderId,
    picker_id: pickerId,
    status: OrderStatus.PICKING,
  });
}
```

**Problem**: Poor error messages, wasted work

### ✅ CORRECT - Validate First

```typescript
async function claimOrder(orderId: string, pickerId: string) {
  // Validate first
  const order = await getOrder(orderId);
  if (!order) {
    throw new NotFoundError('Order not found');
  }
  if (order.status !== OrderStatus.PENDING) {
    throw new ValidationError(`Order must be PENDING, current status: ${order.status}`);
  }

  const picker = await getPicker(pickerId);
  if (!picker.active) {
    throw new ValidationError('Picker is not active');
  }

  const activeCount = await getActiveOrderCount(pickerId);
  if (activeCount >= PICKER_CONFIG.MAX_ORDERS_PER_PICKER) {
    throw new ValidationError('Picker has reached maximum active orders');
  }

  // Now do the database operation
  await db('orders').insert({ ... });
}
```

**Benefit**: Clear error messages, fail fast

---

## Pattern: Null Safety

**Category**: Type Safety
**When**: Handling potentially undefined values
**Why**: Prevents runtime null reference errors

### ❌ WRONG - Unsafe Null Access

```typescript
async function getOrderPicker(orderId: string) {
  const order = await getOrder(orderId);
  const picker = await getUser(order.pickerId); // Could be undefined!
  return picker.name; // Crash if picker is undefined!
}
```

**Problem**: Runtime crash on null reference

### ✅ CORRECT - Null Safe

```typescript
async function getOrderPicker(orderId: string) {
  const order = await getOrder(orderId);

  if (!order.pickerId) {
    throw new ValidationError('Order has no picker assigned');
  }

  const picker = await getUser(order.pickerId);
  if (!picker) {
    throw new NotFoundError(`Picker not found: ${order.pickerId}`);
  }

  return picker.name;
}
```

**Benefit**: No crashes, clear error handling

---

## Pattern: Pagination

**Category**: Performance
**When**: Returning list of items
**Why**: Prevents memory issues, slow queries

### ❌ WRONG - No Pagination

```typescript
async function getAllOrders() {
  // Could return millions of rows!
  return await db('orders').select('*');
}
```

**Problem**: Memory issues, slow responses

### ✅ CORRECT - Paginated

```typescript
async function getOrders(page: number = 1, limit: number = 50) {
  const offset = (page - 1) * limit;

  const [orders, totalCount] = await Promise.all([
    db('orders')
      .select('*')
      .limit(limit)
      .offset(offset)
      .orderBy('created_at', 'desc'),
    db('orders').count('* as count').first(),
  ]);

  return {
    data: orders,
    pagination: {
      page,
      limit,
      total: totalCount.count,
      totalPages: Math.ceil(totalCount.count / limit),
    },
  };
}
```

**Benefit**: Predictable memory, fast responses

---

## Pattern: Undo/Revert for User Actions

**Category**: User Experience
**When**: ANY user action that modifies state
**Why**: Users make mistakes - everything must be reversible

### ❌ WRONG - Permanent Actions

```typescript
// Skip is permanent - user is stuck!
async function skipPickTask(taskId: string) {
  await db('pick_tasks')
    .where({ task_id: taskId })
    .update({ status: TaskStatus.SKIPPED });
}

// Hard delete - cannot recover!
async function deleteItem(itemId: string) {
  await db('items').where({ item_id: itemId }).delete();
}

// No way to correct wrong quantity
async function updateQuantity(itemId: string, quantity: number) {
  await db('items').where({ item_id: itemId }).update({ quantity });
}
```

**Problem**: User mistakes are permanent, no recovery

### ✅ CORRECT - Everything Reversible

```typescript
// 1. Soft delete with restore
async function softDeletePickTask(taskId: string) {
  await db('pick_tasks')
    .where({ task_id: taskId })
    .update({
      deleted_at: new Date(),
      deleted_by: currentUser.id
    });
}

async function restorePickTask(taskId: string) {
  await db('pick_tasks')
    .where({ task_id: taskId })
    .update({
      deleted_at: null,
      deleted_by: null
    });
}

// 2. Record history for undo
async function updateQuantity(itemId: string, newQuantity: number) {
  const current = await getItem(itemId);

  // Save old state
  await db('item_history').insert({
    item_id: itemId,
    old_quantity: current.quantity,
    new_quantity: newQuantity,
    changed_at: new Date()
  });

  // Make the change
  await db('items').where({ item_id: itemId }).update({ quantity: newQuantity });
}

async function undoQuantityChange(itemId: string) {
  const history = await db('item_history')
    .where({ item_id: itemId })
    .orderBy('changed_at', 'desc')
    .first();

  if (history) {
    await db('items').where({ item_id: itemId }).update({
      quantity: history.old_quantity
    });
  }
}

// 3. Show undo option in UI
function ActionComplete({ message, onUndo }) {
  return (
    <div className="toast">
      <span>{message}</span>
      <button onClick={onUndo}>Undo</button>
    </div>
  );
}

// Usage:
await updateQuantity(itemId, newQuantity);
showToast(<ActionComplete
  message="Quantity updated"
  onUndo={() => undoQuantityChange(itemId)}
/>);
```

**Benefit**: Users can recover from any mistake

### Undo Checklist

Before implementing any feature, ensure:

- [ ] Can user undo this action?
- [ ] Can user correct wrong input?
- [ ] Can user backtrack from state?
- [ ] Is there an undo button visible?
- [ ] Are keyboard shortcuts supported? (Ctrl+Z)

---

## Quick Reference

| Pattern               | When                    | Why                       |
| --------------------- | ----------------------- | ------------------------- |
| Service Transaction   | Multi-step DB ops       | Atomicity                 |
| Enum Usage            | Status/role refs        | Type safety               |
| Invariant Validation  | State/inventory changes | Data integrity            |
| State Transition      | Order status changes    | Valid transitions         |
| Error Handling        | API endpoints           | Clean errors              |
| Shared Types          | Cross-module types      | Consistency               |
| Inventory Reservation | Order creation          | No overselling            |
| Layered Architecture  | API requests            | Separation                |
| Audit Logging         | State changes           | Compliance                |
| Idempotent Operations | Retry-prone ops         | Safe to retry             |
| Validate Before DB    | Business rules          | Better errors             |
| Null Safety           | Undefined values        | No crashes                |
| Pagination            | List queries            | Performance               |
| **Undo/Revert**       | **User actions**        | **Recover from mistakes** |

---

**Remember**: These patterns exist for a reason. Follow them consistently.

**Critical**: Every user action MUST be reversible. See [UNDO_REVERT_PRINCIPLES.md](../UNDO_REVERT_PRINCIPLES.md).

**When in doubt**: Read existing code to see how it's done.
