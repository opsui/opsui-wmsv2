# Undo/Revert Principles for WMS

**Purpose**: Ensure every user action can be reversed. Optimize for user error.

**Version**: 1.0.0
**Last Updated**: 2025-01-12

---

## Core Principle

**"Every Action Must Be Reversible"**

Users make mistakes. The system must gracefully handle:

- Wrong item selected
- Wrong quantity entered
- Accidental skip
- Wrong bin location
- Cancelled operations
- Changed mind mid-flow

---

## The Golden Rule

> **If a user can do it, they must be able to undo it.**

**No exceptions.**

---

## Reversible Actions Checklist

Before implementing any feature, ask:

- [ ] Can user undo this action?
- [ ] Can user correct wrong input?
- [ ] Can user backtrack from any state?
- [ ] Can user recover from mistakes?
- [ ] Is undo intuitive and discoverable?

**If any answer is "NO", the feature is incomplete.**

---

## Universal Undo Patterns

### Pattern 1: Soft Delete with Restore

**When**: User "deletes" something
**Problem**: Hard delete = permanent
**Solution**: Mark as deleted, allow restore

```typescript
// ❌ WRONG - Hard delete
async function deletePickTask(taskId: string) {
  await db('pick_tasks').where({ task_id: taskId }).delete();
}

// ✅ CORRECT - Soft delete
async function deletePickTask(taskId: string) {
  await db('pick_tasks').where({ task_id: taskId }).update({
    deleted_at: new Date(),
    deleted_by: currentUser.id,
  });
}

async function restorePickTask(taskId: string) {
  await db('pick_tasks').where({ task_id: taskId }).update({
    deleted_at: null,
    deleted_by: null,
  });
}
```

### Pattern 2: State History Navigation

**When**: User progresses through workflow
**Problem**: Can't go back
**Solution**: Allow navigation to any previous state

```typescript
// ❌ WRONG - Linear only
PENDING → PICKING → PICKED → PACKING → SHIPPED
(Once you move forward, can't go back)

// ✅ CORRECT - Bidirectional where allowed
PENDING → PICKING → PICKED → PACKING → PACKED → SHIPPED
  ↑         ↑         ↑                  ↑
  └─────────┴─────────┴──────────────────┘
  (Can undo back to previous state)
```

**Valid Undo Transitions**:

- `PICKING → PENDING` (unclaim order)
- `PICKED → PICKING` (reopen for picking)
- `PACKING → PICKED` (return to picked)
- `PACKED → PACKING` (reopen for packing)
- `CANCELLED → PENDING` (restore cancelled order)

### Pattern 3: Edit Anything, Anytime

**When**: User enters data
**Problem**: Locked after submit
**Solution**: Allow edit until final state

```typescript
// ❌ WRONG - Read-only after submit
function OrderDetails({ order }) {
  return (
    <div>
      <p>Quantity: {order.quantity}</p>
      {/* Can't edit! */}
    </div>
  );
}

// ✅ CORRECT - Editable until locked
function OrderDetails({ order }) {
  const isLocked = order.status === OrderStatus.SHIPPED;

  return (
    <div>
      {isLocked ? (
        <p>Quantity: {order.quantity}</p>
      ) : (
        <EditableField
          value={order.quantity}
          onSave={(newValue) => updateQuantity(order.id, newValue)}
        />
      )}
    </div>
  );
}
```

### Pattern 4: Confirmation Before Destructive Actions

**When**: User does something permanent
**Problem**: Accidental click
**Solution**: Always confirm

```typescript
// ❌ WRONG - Instant destruction
<button onClick={() => deleteOrder(orderId)}>
  Delete Order
</button>

// ✅ CORRECT - Confirmation required
<button onClick={() => confirmDelete(orderId)}>
  Delete Order
</button>

function confirmDelete(orderId: string) {
  if (confirm('Are you sure you want to delete this order? This can be undone.')) {
    softDeleteOrder(orderId);
  }
}
```

### Pattern 5: Explicit Undo Button

**When**: User completes action
**Problem**: No way to undo
**Solution**: Show undo option

```typescript
// ✅ CORRECT - Always show undo
function ActionComplete({ action, onUndo }) {
  return (
    <div className="toast">
      <span>{action} completed</span>
      <button onClick={onUndo}>Undo</button>
    </div>
  );
}

// Usage:
<ActionComplete
  action="Item picked"
  onUndo={() => undoPickItem(itemId)}
/>
```

---

## Module-Specific Undo Patterns

### Picking Module

#### Problem: Accidentally Skipped Item

**❌ WRONG**:

```typescript
// Skip is permanent
async function skipPickTask(taskId: string) {
  await updateTaskStatus(taskId, TaskStatus.SKIPPED);
}
```

**✅ CORRECT**:

```typescript
// Skip can be undone
async function skipPickTask(taskId: string) {
  await updateTaskStatus(taskId, TaskStatus.SKIPPED);
  // Show "Undo" button
}

async function unskipPickTask(taskId: string) {
  await updateTaskStatus(taskId, TaskStatus.PENDING);
}
```

**UI Pattern**:

```typescript
function PickTaskItem({ task }) {
  const [skipped, setSkipped] = useState(task.status === TaskStatus.SKIPPED);

  return (
    <div>
      <button onClick={() => markPicked(task.id)}>
        Mark Picked
      </button>
      <button onClick={() => skipTask(task.id)}>
        {skipped ? 'Unskip' : 'Skip'}
      </button>
    </div>
  );
}
```

#### Problem: Wrong Quantity Entered

**✅ CORRECT**:

```typescript
function PickTaskItem({ task }) {
  const [quantity, setQuantity] = useState(task.quantity);
  const [pickedQuantity, setPickedQuantity] = useState(task.picked_quantity);

  const handlePick = () => {
    const newPicked = pickedQuantity + quantity;
    pickItem(task.id, newPicked);
  };

  const handleUndo = () => {
    // Reduce picked quantity
    const newPicked = Math.max(0, pickedQuantity - quantity);
    updatePickedQuantity(task.id, newPicked);
  };

  return (
    <div>
      <input
        type="number"
        value={quantity}
        onChange={(e) => setQuantity(Number(e.target.value))}
      />
      <button onClick={handlePick}>Pick</button>
      {pickedQuantity > 0 && (
        <button onClick={handleUndo}>Undo Last Pick</button>
      )}
    </div>
  );
}
```

#### Problem: Wrong Bin Location

**✅ CORRECT**:

```typescript
function BinLocationScanner({ task }) {
  const [currentBin, setCurrentBin] = useState(task.bin_location);

  const handleScan = (scannedBin: string) => {
    updateBinLocation(task.id, scannedBin);
    setCurrentBin(scannedBin);
    // Show undo option
  };

  const handleUndo = () => {
    // Revert to previous bin
    updateBinLocation(task.id, currentBin);
  };

  return (
    <div>
      <BinScanner onScan={handleScan} />
      {task.bin_location !== currentBin && (
        <button onClick={handleUndo}>Undo Bin Change</button>
      )}
    </div>
  );
}
```

### Packing Module

#### Problem: Wrong Item Added to Shipment

**✅ CORRECT**:

```typescript
function PackingList({ order }) {
  const [packedItems, setPackedItems] = useState(order.items);

  const addItemToShipment = (item) => {
    setPackedItems([...packedItems, item]);
    showUndoToast('Item added', () => removeItemFromShipment(item.id));
  };

  const removeItemFromShipment = (itemId) => {
    setPackedItems(packedItems.filter(i => i.id !== itemId));
  };

  return (
    <div>
      {packedItems.map(item => (
        <PackedItem
          key={item.id}
          item={item}
          onRemove={() => removeItemFromShipment(item.id)}
        />
      ))}
    </div>
  );
}
```

#### Problem: Wrong Weight Entered

**✅ CORRECT**:

```typescript
function WeightInput({ shipment }) {
  const [weight, setWeight] = useState(shipment.weight);
  const [history, setHistory] = useState([shipment.weight]);

  const handleUpdate = (newWeight) => {
    setHistory([...history, weight]); // Save previous
    setWeight(newWeight);
    updateShipmentWeight(shipment.id, newWeight);
  };

  const handleUndo = () => {
    const previous = history[history.length - 2];
    setHistory(history.slice(0, -1));
    setWeight(previous);
    updateShipmentWeight(shipment.id, previous);
  };

  return (
    <div>
      <input
        type="number"
        value={weight}
        onChange={(e) => handleUpdate(Number(e.target.value))}
      />
      {history.length > 1 && (
        <button onClick={handleUndo}>Undo Weight Change</button>
      )}
    </div>
  );
}
```

### Admin Module

#### Problem: Wrong Settings Applied

**✅ CORRECT**:

```typescript
function SettingsPanel({ settings }) {
  const [currentSettings, setCurrentSettings] = useState(settings);
  const [previousSettings, setPreviousSettings] = useState(settings);

  const handleSave = async (newSettings) => {
    setPreviousSettings(currentSettings); // Save current as previous
    await updateSettings(newSettings);
    setCurrentSettings(newSettings);
    showUndoToast('Settings updated', () => restoreSettings(previousSettings));
  };

  const restoreSettings = async (oldSettings) => {
    await updateSettings(oldSettings);
    setCurrentSettings(oldSettings);
  };

  return (
    <div>
      <SettingsForm
        settings={currentSettings}
        onSave={handleSave}
      />
    </div>
  );
}
```

---

## Technical Implementation

### Database Schema for Undo

**Every table that tracks user actions needs these columns**:

```sql
-- For all transactional tables
ALTER TABLE pick_tasks ADD COLUMN deleted_at TIMESTAMP;
ALTER TABLE pick_tasks ADD COLUMN deleted_by UUID;

ALTER TABLE pack_tasks ADD COLUMN deleted_at TIMESTAMP;
ALTER TABLE pack_tasks ADD COLUMN deleted_by UUID;

ALTER TABLE shipments ADD COLUMN deleted_at TIMESTAMP;
ALTER TABLE shipments ADD COLUMN deleted_by UUID;

-- For tracking changes
CREATE TABLE task_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_type VARCHAR(50), -- 'pick', 'pack', etc.
  task_id UUID,
  old_status VARCHAR(50),
  new_status VARCHAR(50),
  changed_by UUID,
  changed_at TIMESTAMP DEFAULT NOW(),
  undoable BOOLEAN DEFAULT TRUE
);

-- For restoring state
CREATE TABLE state_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type VARCHAR(50),
  entity_id UUID,
  snapshot JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  created_by UUID
);
```

### Service Layer for Undo

```typescript
/**
 * Undo Service
 * Handles all undo operations
 */
export class UndoService {
  /**
   * Get undoable actions for a user
   */
  async getUndoableActions(userId: string): Promise<UndoableAction[]> {
    return await db('task_history')
      .where({ changed_by: userId, undoable: true })
      .orderBy('changed_at', 'desc')
      .limit(50);
  }

  /**
   * Undo a specific action
   */
  async undoAction(historyId: string, userId: string): Promise<void> {
    const history = await getHistory(historyId);

    // Verify user owns this action
    if (history.changed_by !== userId) {
      throw new ForbiddenError("Cannot undo another user's action");
    }

    // Restore previous state
    await this.restoreState(history);

    // Mark as undone
    await db('task_history')
      .where({ id: historyId })
      .update({ undoable: false });
  }

  /**
   * Record an action for potential undo
   */
  async recordAction(action: {
    taskType: string;
    taskId: string;
    oldStatus: string;
    newStatus: string;
    userId: string;
  }): Promise<void> {
    await db('task_history').insert({
      task_type: action.taskType,
      task_id: action.taskId,
      old_status: action.oldStatus,
      new_status: action.newStatus,
      changed_by: action.userId,
      changed_at: new Date(),
      undoable: true,
    });
  }
}
```

### React Hook for Undo

```typescript
/**
 * useUndo Hook
 * Provides undo functionality for any action
 */
export function useUndo<T>() {
  const [past, setPast] = useState<T[][]>([]);
  const [present, setPresent] = useState<T | null>(null);
  const [future, setFuture] = useState<T[][]>([]);

  const undo = useCallback(() => {
    if (past.length === 0) return;

    const previous = past[past.length - 1];
    const newPast = past.slice(0, past.length - 1);

    setPast(newPast);
    setPresent(previous);
    setFuture([present, ...future]);
  }, [past, present, future]);

  const redo = useCallback(() => {
    if (future.length === 0) return;

    const next = future[0];
    const newFuture = future.slice(1);

    setPast([...past, present]);
    setPresent(next);
    setFuture(newFuture);
  }, [past, present, future]);

  const set = useCallback((newPresent: T) => {
    if (present !== null) {
      setPast([...past, present]);
    }
    setPresent(newPresent);
    setFuture([]);
  }, [past, present]);

  return {
    state: present,
    set,
    undo,
    redo,
    canUndo: past.length > 0,
    canRedo: future.length > 0
  };
}

// Usage:
function MyComponent() {
  const { state, set, undo, canUndo } = useUndo<Order>();

  const handleUpdate = (newOrder: Order) => {
    set(newOrder);
    showUndoToast('Order updated', undo);
  };

  return (
    <div>
      <button disabled={!canUndo} onClick={undo}>
        Undo
      </button>
    </div>
  );
}
```

---

## UI Patterns for Undo

### Toast with Undo

```typescript
function UndoToast({ message, onUndo, onDismiss }) {
  useEffect(() => {
    // Auto-dismiss after 5 seconds
    const timer = setTimeout(onDismiss, 5000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  return (
    <div className="undo-toast">
      <span>{message}</span>
      <button onClick={onUndo}>Undo</button>
      <button onClick={onDismiss}>✕</button>
    </div>
  );
}
```

### Keyboard Shortcuts

```typescript
useEffect(() => {
  const handleKeyPress = (e: KeyboardEvent) => {
    // Ctrl+Z or Cmd+Z for undo
    if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
      e.preventDefault();
      undo();
    }

    // Ctrl+Shift+Z or Cmd+Shift+Z for redo
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'z') {
      e.preventDefault();
      redo();
    }
  };

  window.addEventListener('keydown', handleKeyPress);
  return () => window.removeEventListener('keydown', handleKeyPress);
}, [undo, redo]);
```

### Confirmation Dialogs

```typescript
function ConfirmDialog({
  title,
  message,
  onConfirm,
  onCancel,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel'
}) {
  return (
    <div className="confirm-dialog">
      <h2>{title}</h2>
      <p>{message}</p>
      <div className="actions">
        <button onClick={onCancel}>{cancelLabel}</button>
        <button
          onClick={onConfirm}
          className="danger"
        >
          {confirmLabel}
        </button>
      </div>
    </div>
  );
}
```

---

## Testing Undo Functionality

### Test Cases

```typescript
describe('Undo Functionality', () => {
  it('should undo pick task skip', async () => {
    const task = await createPickTask();

    // Skip task
    await skipPickTask(task.id);
    let updated = await getPickTask(task.id);
    expect(updated.status).toBe(TaskStatus.SKIPPED);

    // Undo skip
    await undoSkipPickTask(task.id);
    updated = await getPickTask(task.id);
    expect(updated.status).toBe(TaskStatus.PENDING);
  });

  it('should undo quantity change', async () => {
    const item = await createOrderItem({ quantity: 10, picked_quantity: 5 });

    // Update picked quantity
    await updatePickedQuantity(item.id, 8);
    let updated = await getOrderItem(item.id);
    expect(updated.picked_quantity).toBe(8);

    // Undo update
    await undoPickedQuantity(item.id);
    updated = await getOrderItem(item.id);
    expect(updated.picked_quantity).toBe(5);
  });

  it('should preserve history for multiple undos', async () => {
    const task = await createPickTask();

    // Make multiple changes
    await updateTaskStatus(task.id, TaskStatus.IN_PROGRESS);
    await updateTaskStatus(task.id, TaskStatus.COMPLETED);
    await updateTaskStatus(task.id, TaskStatus.SKIPPED);

    // Undo multiple times
    await undoLastAction(task.id);
    expect((await getPickTask(task.id)).status).toBe(TaskStatus.COMPLETED);

    await undoLastAction(task.id);
    expect((await getPickTask(task.id)).status).toBe(TaskStatus.IN_PROGRESS);
  });
});
```

---

## Undo Rules for AI Agents

### When Implementing Features

AI agents MUST ensure:

1. **Every state change is undoable**

   ```typescript
   // ❌ WRONG
   await updateStatus(id, newStatus);

   // ✅ CORRECT
   await updateStatus(id, newStatus);
   await recordUndoHistory({
     entity: 'order',
     entityId: id,
     oldStatus: currentStatus,
     newStatus: newStatus,
   });
   ```

2. **Every deletion is soft delete**

   ```typescript
   // ❌ WRONG
   await db.delete().where({ id });

   // ✅ CORRECT
   await db.update({ deleted_at: now() }).where({ id });
   ```

3. **Every mutation shows undo option**

   ```typescript
   // ✅ CORRECT
   function onActionComplete() {
     showToast('Action complete', {
       undo: () => undoLastAction(),
     });
   }
   ```

4. **Every input can be corrected**
   ```typescript
   // ✅ CORRECT
   <EditableField
     value={value}
     onSave={updateValue}
     canEdit={status !== FINAL_STATUS}
   />
   ```

### Undo Checklist for AI

Before completing any feature, verify:

- [ ] Can user undo every action?
- [ ] Can user edit every input until locked?
- [ ] Can user restore deleted items?
- [ ] Can user navigate back to previous states?
- [ ] Is there an undo button visible?
- [ ] Are keyboard shortcuts supported?
- [ ] Is there a confirmation before permanent actions?
- [ ] Does undo work for all edge cases?

---

## Summary

### Principles

1. **Every action must be reversible**
2. **Show undo option immediately after action**
3. **Use soft deletes, not hard deletes**
4. **Allow edit until final state**
5. **Confirm before permanent actions**
6. **Preserve history for navigation**

### Implementation

1. **Database**: Add `deleted_at`, `deleted_by` columns
2. **Service**: Record all actions in history table
3. **UI**: Show undo buttons and toasts
4. **UX**: Keyboard shortcuts (Ctrl+Z)
5. **Testing**: Test all undo paths

### Success Metrics

- ✅ Zero permanent destructive actions
- ✅ Undo available for all mutations
- ✅ User can recover from any mistake
- ✅ Intuitive and discoverable undo
- ✅ Fast undo response (< 100ms)

---

**Remember**: Users WILL make mistakes. Your job is to make those mistakes recoverable.

**When in doubt**: Add undo. It's always better to have it and not need it, than need it and not have it.
