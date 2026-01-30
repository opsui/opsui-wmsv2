# MCP (Model Context Protocol) Usage Guidelines

**Purpose**: Rules and expectations for using MCP tools in this Warehouse Management System.

**Version**: 1.0.0
**Last Updated**: 2025-01-12

---

## What is MCP?

MCP (Model Context Protocol) provides tools for AI agents to interact with external systems, databases, and APIs in a standardized way.

---

## MCP Tool Categories in WMS

### Read Operations (SAFE)

- Database queries for inspection
- File reading for analysis
- API calls for information retrieval
- Cache reads

### Write Operations (CAUTION)

- Database modifications
- File writes
- API calls that modify state
- Cache writes

---

## Read vs Write Responsibilities

### MCP Tools MUST Use Read Operations For:

- **Code analysis** - reading files to understand structure
- **Database inspection** - querying schema, checking data integrity
- **Debugging** - reading logs, error states
- **Validation** - verifying invariants before operations

### MCP Tools MUST Use Write Operations For:

- **Business logic execution** - service-layer operations
- **State transitions** - updating order status (with validation)
- **Inventory modifications** - reservation, deduction (with transaction)
- **Audit logging** - writing to transaction tables

### MCP Tools MUST NEVER Use Write Operations For:

- **Schema changes** - use migration scripts instead
- **Configuration changes** - update `.env.example` not `.env`
- **Direct constraint bypass** - never disable foreign keys or checks
- **Audit trail deletion** - never delete from `*_transactions` tables

---

## Idempotency Expectations

### What MUST Be Idempotent

All MCP operations that could be retried MUST be idempotent:

- **Claiming an order** - second claim attempt should fail gracefully, not create duplicate
- **Reserving inventory** - reserving same quantity twice should be safe
- **Updating order status** - setting same status twice should be no-op

### Implementing Idempotency

```typescript
// ❌ NOT IDEMPOTENT
async function claimOrder(orderId: string, pickerId: string) {
  await db.execute('UPDATE orders SET picker_id = $1 WHERE order_id = $2', [
    pickerId,
    orderId,
  ]);
}

// ✅ IDEMPOTENT
async function claimOrder(orderId: string, pickerId: string) {
  const result = await db.execute(
    'UPDATE orders SET picker_id = $1 WHERE order_id = $2 AND picker_id IS NULL',
    [pickerId, orderId]
  );
  if (result.rowCount === 0) {
    throw new ConflictError('Order already claimed or does not exist');
  }
}
```

### Idempotency Checklist

- [ ] Operation safe to retry if network fails
- [ ] No duplicate records created on retry
- [ ] No partial state corruption on failure
- [ ] Database constraints prevent double-application

---

## Error Handling Rules

### MCP Tools MUST Handle These Errors:

1. **Network timeouts** - retry with exponential backoff
2. **Deadlocks** - retry transaction after random delay
3. **Constraint violations** - convert to domain error, do not retry
4. **Not found** - return appropriate error response
5. **Permission denied** - log security event, return error

### Error Recovery Strategy

```typescript
// ✅ CORRECT MCP Error Handling
async function mcpReserveInventory(params: ReserveInventoryParams) {
  const maxRetries = 3;
  let attempt = 0;

  while (attempt < maxRetries) {
    try {
      return await executeInTransaction(async trx => {
        // Validate availability
        const available = await getAvailableInventory(trx, params.sku);
        if (available < params.quantity) {
          throw new InventoryError('Insufficient inventory'); // Non-retryable
        }
        // Reserve
        await reserveInventory(trx, params);
        return { success: true };
      });
    } catch (error) {
      attempt++;
      if (error instanceof InventoryError) {
        throw error; // Don't retry business logic errors
      }
      if (error.code === '40P01') {
        // Deadlock
        await sleep(random(100, 500) * attempt); // Backoff
        continue;
      }
      throw error; // Other errors non-retryable
    }
  }
  throw new Error('Max retries exceeded');
}
```

### NEVER Catch and Suppress Errors

```typescript
// ❌ WRONG - Silently failing
try {
  await riskyOperation();
} catch (e) {
  // Do nothing - error lost!
}

// ✅ CORRECT - Proper error handling
try {
  return await riskyOperation();
} catch (e) {
  logger.error('Operation failed', { error: e, context });
  throw new WMSError('OPERATION_FAILED', 500, 'Operation failed', e);
}
```

---

## When to Use MCP Tools vs Direct Access

### Use MCP Tools When:

- **Operation is complex and reusable** - abstract into tool
- **Operation requires validation** - encapsulate business rules
- **Operation needs error handling** - centralize error recovery
- **Operation is called from multiple places** - DRY principle

### Use Direct Database Access When:

- **Simple query** - single table SELECT with known result
- **Migration script** - schema modification
- **Performance-critical** - need to avoid tool overhead
- **One-off operation** - not reusable

### Use Direct API Access When:

- **External service integration** - calling third-party APIs
- **File operations** - reading config files
- **System operations** - running build scripts

---

## MCP Tool Design Patterns

### Pattern 1: Validated Write

```typescript
// MCP tool for order state transition
async function mcpTransitionOrderState(
  orderId: string,
  toStatus: OrderStatus,
  userId: string
): Promise<Order> {
  // 1. Validate transition
  const order = await getOrder(orderId);
  if (!isValidTransition(order.status, toStatus)) {
    throw new ValidationError(
      `Invalid transition ${order.status} → ${toStatus}`
    );
  }

  // 2. Check prerequisites
  if (toStatus === OrderStatus.PICKING) {
    const pickerOrders = await getActiveOrderCount(userId);
    if (pickerOrders >= MAX_ORDERS_PER_PICKER) {
      throw new ValidationError('Picker at capacity');
    }
  }

  // 3. Execute in transaction
  return await executeInTransaction(async trx => {
    const updated = await trx('orders')
      .where({ order_id: orderId })
      .update({ status: toStatus, updated_at: new Date() })
      .returning('*');

    // Audit log is automatic via DB trigger
    return updated[0];
  });
}
```

### Pattern 2: Idempotent Create

```typescript
// MCP tool for creating order (idempotent)
async function mcpCreateOrder(dto: CreateOrderDTO): Promise<Order> {
  return await executeInTransaction(async trx => {
    // Use deterministic ID based on customer + timestamp
    const orderId = generateOrderId(dto.customerId);

    const existing = await trx('orders').where({ order_id: orderId }).first();
    if (existing) {
      return existing; // Idempotent - return existing
    }

    // Validate inventory
    for (const item of dto.items) {
      const available = await getAvailableInventory(trx, item.sku);
      if (available < item.quantity) {
        throw new InventoryError(`Insufficient inventory for ${item.sku}`);
      }
    }

    // Reserve inventory
    for (const item of dto.items) {
      await reserveInventory(trx, item.sku, item.quantity, orderId);
    }

    // Create order
    return await trx('orders')
      .insert({
        order_id: orderId,
        customer_id: dto.customerId,
        customer_name: dto.customerName,
        priority: dto.priority,
        status: OrderStatus.PENDING,
      })
      .returning('*');
  });
}
```

### Pattern 3: Compensating Transaction

```typescript
// MCP tool with compensating actions
async function mcpProcessShipment(orderId: string): Promise<void> {
  let inventoryReserved: Array<{ sku: string; quantity: number }> = [];

  try {
    await executeInTransaction(async trx => {
      const order = await getOrder(trx, orderId);

      // Stage 1: Reserve additional packing materials
      for (const item of order.items) {
        await reservePackingMaterial(trx, item.sku);
        inventoryReserved.push({ sku: item.sku, quantity: 1 });
      }

      // Stage 2: Generate shipping label
      const label = await generateShippingLabel(order);
      if (!label.valid) {
        throw new Error('Invalid shipping address');
      }

      // Stage 3: Mark as shipped
      await trx('orders')
        .where({ order_id: orderId })
        .update({ status: OrderStatus.SHIPPED, shipped_at: new Date() });
    });
  } catch (error) {
    // Compensating action: release reserved materials
    await executeInTransaction(async trx => {
      for (const item of inventoryReserved) {
        await releasePackingMaterial(trx, item.sku, item.quantity);
      }
    });
    throw error;
  }
}
```

---

## MCP Tool Registration

### Naming Convention

```typescript
// Prefix business logic tools with domain
mcp_wms_order_claim;
mcp_wms_inventory_reserve;
mcp_wms_shipment_process;

// Prefix read-only tools with query
mcp_query_order_by_id;
mcp_query_inventory_available;
```

### Input Validation

```typescript
// Always validate inputs using Joi
const reserveInventorySchema = Joi.object({
  orderId: Joi.string()
    .pattern(/^ORD-\d{8}-\d{6}$/)
    .required(),
  sku: Joi.string().max(50).required(),
  quantity: Joi.number().integer().positive().required(),
  binLocation: Joi.string()
    .pattern(/^[A-Z]-\d{1,3}-\d{2}$/)
    .required(),
});

async function mcpReserveInventory(params: unknown) {
  const { value, error } = reserveInventorySchema.validate(params);
  if (error) {
    throw new ValidationError('Invalid parameters', error.details);
  }
  // ... proceed
}
```

---

## MCP and Database Transactions

### Transaction Boundaries

- **MCP tools should manage transactions** - don't rely on caller
- **Each MCP tool is a transaction unit** - all-or-nothing
- **Nested tools should share transaction** - pass trx object

### Transaction Sharing Pattern

```typescript
// Parent tool
async function mcpProcessOrder(orderId: string) {
  return await executeInTransaction(async trx => {
    // Child tools share transaction
    await mcpReserveInventory(trx, orderId, items);
    await mcpUpdateOrderStatus(trx, orderId, OrderStatus.PICKING);
    await mcpAssignPicker(trx, orderId, pickerId);
  });
}
```

---

## Security Rules for MCP

### Input Sanitization

- **NEVER trust client input** - validate everything
- **Parameterize all queries** - prevent SQL injection
- **Sanitize error messages** - don't expose internals

### Authorization

- **Check user role** - validate permissions
- **Resource ownership** - verify user can access resource
- **Audit all access** - log who did what

```typescript
async function mcpCancelOrder(orderId: string, userId: string) {
  // Check permissions
  const user = await getUser(userId);
  if (user.role !== UserRole.ADMIN && user.role !== UserRole.SUPERVISOR) {
    throw new ForbiddenError('Only admins and supervisors can cancel orders');
  }

  // Audit the action
  await logAuditEvent('ORDER_CANCELLED', {
    orderId,
    userId,
    timestamp: new Date(),
  });

  // Proceed with cancellation
  // ...
}
```

---

## MCP Tool Documentation Template

```typescript
/**
 * MCP: mcp_wms_order_claim
 *
 * Description: Claims an order for a picker, transitioning it from PENDING to PICKING
 *
 * Preconditions:
 * - Order must be in PENDING status
 * - Picker must have < MAX_ORDERS_PER_PICKER active orders
 * - Picker must be active
 *
 * Postconditions:
 * - Order status is PICKING
 * - Order.pickerId is set to pickerId
 * - Order.claimedAt is set to now
 * - Audit trail entry created in order_state_changes
 *
 * Idempotent: No - second claim attempt throws ConflictError
 *
 * Transaction: Yes - entire operation is atomic
 *
 * Errors:
 * - ValidationError: Order not in PENDING, picker at capacity
 * - NotFoundError: Order or picker does not exist
 * - ConflictError: Order already claimed
 *
 * @param orderId - Order ID (format: ORD-YYYYMMDD-SSSSSS)
 * @param pickerId - Picker user ID (format: USR-XXXXXXXX)
 * @returns Updated Order object
 */
async function mcp_wms_order_claim(
  orderId: string,
  pickerId: string
): Promise<Order> {
  // Implementation...
}
```

---

## Summary of MCP Rules

1. **Read operations are safe** - use freely for inspection
2. **Write operations need caution** - validate, transaction, audit
3. **Make tools idempotent** - safe to retry on failure
4. **Handle errors properly** - retry transient errors, fail fast on logic errors
5. **Use transactions** - all-or-nothing for multi-step operations
6. **Validate inputs** - never trust external data
7. **Check permissions** - authorization before action
8. **Audit everything** - log all state changes
9. **Document tools** - clear contract for each tool
10. **Share transactions** - pass trx between related operations

**Key Principle**: MCP tools encapsulate business logic with validation, error handling, and audit trails. They are the "safe API" for AI agents to interact with the system.
