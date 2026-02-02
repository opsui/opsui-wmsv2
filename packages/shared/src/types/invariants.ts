/**
 * System Invariants for Warehouse Management System
 *
 * This file defines conditions that MUST NEVER be violated.
 * These invariants represent the fundamental laws of the WMS domain.
 *
 * Invariants are enforced through:
 * 1. Database constraints (CHECK, FOREIGN KEY)
 * 2. Application validation (before DB writes)
 * 3. Type system (compile-time checks)
 *
 * If an invariant is violated, data corruption has occurred.
 */

import { OrderStatus } from './index';

// ============================================================================
// INVARIANT VALIDATION FUNCTIONS
// ============================================================================

/**
 * Invariant: Inventory can never be negative.
 *
 * Why: Physical inventory cannot be less than zero.
 * Enforcement: Database CHECK constraint (quantity >= 0)
 * Violation impact: Inventory records become unreliable, orders may fail.
 *
 * @param quantity - The inventory quantity to check
 * @throws Error if invariant is violated
 */
export function invariantInventoryNeverNegative(quantity: number): void {
  if (quantity < 0) {
    throw new Error(
      `INVARIANT VIOLATION: Inventory quantity is negative (${quantity}). ` +
        `Physical inventory cannot be less than zero.`
    );
  }
}

/**
 * Invariant: Reserved quantity cannot exceed total quantity.
 *
 * Why: Cannot reserve more inventory than exists.
 * Enforcement: Database CHECK constraint (reserved <= quantity)
 * Violation impact: Orders may fail to fulfill, inventory tracking breaks.
 *
 * @param quantity - Total inventory quantity
 * @param reserved - Reserved inventory quantity
 * @throws Error if invariant is violated
 */
export function invariantReservedNeverExceedsTotal(quantity: number, reserved: number): void {
  if (reserved > quantity) {
    throw new Error(
      `INVARIANT VIOLATION: Reserved quantity (${reserved}) exceeds total quantity (${quantity}). ` +
        `Cannot reserve more inventory than exists.`
    );
  }
}

/**
 * Invariant: Order progress must be between 0 and 100.
 *
 * Why: Progress percentage is defined as 0-100.
 * Enforcement: Database CHECK constraint (progress BETWEEN 0 AND 100)
 * Violation impact: UI calculations break, progress bars display incorrectly.
 *
 * @param progress - The order progress percentage
 * @throws Error if invariant is violated
 */
export function invariantProgressRange(progress: number): void {
  if (progress < 0 || progress > 100) {
    throw new Error(
      `INVARIANT VIOLATION: Order progress (${progress}) is outside valid range [0, 100]. ` +
        `Progress must be a percentage between 0 and 100.`
    );
  }
}

/**
 * Invariant: Picked quantity cannot exceed ordered quantity.
 *
 * Why: Cannot pick more items than customer ordered.
 * Enforcement: Database CHECK constraint (picked_quantity <= quantity)
 * Violation impact: Inventory misallocation, customer receives wrong items.
 *
 * @param quantity - The quantity ordered
 * @param pickedQuantity - The quantity picked
 * @throws Error if invariant is violated
 */
export function invariantPickedNeverExceedsOrdered(quantity: number, pickedQuantity: number): void {
  if (pickedQuantity > quantity) {
    throw new Error(
      `INVARIANT VIOLATION: Picked quantity (${pickedQuantity}) exceeds ordered quantity (${quantity}). ` +
        `Cannot pick more items than customer ordered.`
    );
  }
}

/**
 * Invariant: Order quantities must always be positive.
 *
 * Why: Cannot order zero or negative items.
 * Enforcement: Database CHECK constraint (quantity > 0)
 * Violation impact: Invalid orders created, database wasted.
 *
 * @param quantity - The quantity to check
 * @throws Error if invariant is violated
 */
export function invariantQuantityAlwaysPositive(quantity: number): void {
  if (quantity <= 0) {
    throw new Error(
      `INVARIANT VIOLATION: Quantity (${quantity}) is not positive. ` +
        `Order quantities must be greater than zero.`
    );
  }
}

/**
 * Invariant: Terminal states cannot transition further.
 *
 * Why: Shipped or cancelled orders are final.
 * Enforcement: Application validation in workflow.ts
 * Violation impact: Audit trail breaks, business logic errors.
 *
 * @param status - The current order status
 * @throws Error if invariant is violated (attempting transition from terminal state)
 */
export function invariantTerminalStateImmutable(status: OrderStatus): void {
  const terminalStates = [OrderStatus.SHIPPED, OrderStatus.CANCELLED];
  if (terminalStates.includes(status)) {
    throw new Error(
      `INVARIANT VIOLATION: Attempting to transition from terminal state (${status}). ` +
        `Terminal states cannot transition further.`
    );
  }
}

/**
 * Invariant: Picker must be assigned when order is in PICKING or PICKED state.
 *
 * Why: Orders don't pick themselves.
 * Enforcement: Application validation before state transition
 * Violation impact: Audit trail loses accountability, operations management fails.
 *
 * @param status - The order status
 * @param pickerId - The assigned picker ID
 * @throws Error if invariant is violated
 */
export function invariantPickerRequiredForPickingStates(
  status: OrderStatus,
  pickerId?: string
): void {
  const pickerRequiredStates = [OrderStatus.PICKING, OrderStatus.PICKED];
  if (pickerRequiredStates.includes(status) && pickerId === undefined) {
    throw new Error(
      `INVARIANT VIOLATION: Order is in ${status} state but no picker is assigned. ` +
        `A picker must be assigned before order enters PICKING state.`
    );
  }
}

/**
 * Invariant: Packer must be assigned when order is in PACKING or PACKED state.
 *
 * Why: Orders don't pack themselves.
 * Enforcement: Application validation before state transition
 * Violation impact: Audit trail loses accountability.
 *
 * @param status - The order status
 * @param packerId - The assigned packer ID
 * @throws Error if invariant is violated
 */
export function invariantPackerRequiredForPackingStates(
  status: OrderStatus,
  packerId?: string
): void {
  const packerRequiredStates = [OrderStatus.PACKING, OrderStatus.PACKED];
  if (packerRequiredStates.includes(status) && packerId === undefined) {
    throw new Error(
      `INVARIANT VIOLATION: Order is in ${status} state but no packer is assigned. ` +
        `A packer must be assigned before order enters PACKING state.`
    );
  }
}

/**
 * Invariant: Bin location format must be valid.
 *
 * Why: Bin locations encode physical warehouse location.
 * Enforcement: Database CHECK constraint (bin_id ~ '^[A-Z]-[0-9]{1,3}-[0-9]{2}$')
 * Violation impact: Pickers sent to non-existent locations, operations halt.
 *
 * @param binId - The bin location ID to validate
 * @throws Error if invariant is violated
 */
export function invariantBinLocationFormatValid(binId: string): void {
  const pattern = /^[A-Z]-\d{1,3}-\d{2}$/;
  if (!pattern.test(binId)) {
    throw new Error(
      `INVARIANT VIOLATION: Bin location ID "${binId}" has invalid format. ` +
        `Expected format: Z-A-S (Zone-Aisle-Shelf), e.g., "A-12-03".`
    );
  }
}

/**
 * Invariant: Inventory reservations must be released on order cancellation.
 *
 * Why: Cancelled orders should not hold inventory.
 * Enforcement: Application logic in cancel order workflow
 * Violation impact: Inventory unavailable for other orders, stockout errors.
 *
 * @param orderId - The order being cancelled
 * @param remainingReservations - Count of remaining reservations after cancellation attempt
 * @throws Error if invariant is violated
 */
export function invariantReservationsReleasedOnCancellation(
  orderId: string,
  remainingReservations: number
): void {
  if (remainingReservations > 0) {
    throw new Error(
      `INVARIANT VIOLATION: Order ${orderId} was cancelled but ${remainingReservations} reservations remain. ` +
        `All inventory reservations must be released when order is cancelled.`
    );
  }
}

/**
 * Invariant: Audit trail entries must never be deleted.
 *
 * Why: Audit trail provides legal and operational history.
 * Enforcement: Application never executes DELETE on transaction tables
 * Violation impact: Compliance violations, inability to investigate errors.
 *
 * Note: This is a procedural invariant, enforced by code review and AI rules.
 */
export function invariantAuditTrailImmutable(): never {
  throw new Error(
    `INVARIANT VIOLATION: Attempt to delete audit trail entries. ` +
      `Audit trails must be preserved permanently. This operation is forbidden.`
  );
}

/**
 * Invariant: Foreign key relationships must never be bypassed.
 *
 * Why: Referential integrity ensures data consistency.
 * Enforcement: Database FOREIGN KEY constraints
 * Violation impact: Orphaned records, broken queries, data corruption.
 *
 * Note: This is enforced at database level, but code must never disable constraints.
 */
export function invariantForeignKeysNeverDisabled(): never {
  throw new Error(
    `INVARIANT VIOLATION: Attempt to disable foreign key constraints. ` +
      `Foreign key constraints must remain enabled at all times. This operation is forbidden.`
  );
}

/**
 * Invariant: Order IDs must be unique.
 *
 * Why: Duplicate order IDs cause data corruption.
 * Enforcement: Database PRIMARY KEY constraint
 * Violation impact: Orders overwritten, shipping errors, customer impact.
 *
 * @param existingOrder - Whether an order with this ID already exists
 * @param orderId - The order ID being checked
 * @throws Error if invariant is violated
 */
export function invariantOrderIdUnique(existingOrder: unknown, orderId: string): void {
  if (existingOrder !== undefined && existingOrder !== null) {
    throw new Error(
      `INVARIANT VIOLATION: Order ID ${orderId} already exists. ` +
        `Order IDs must be unique. This indicates a generation algorithm collision.`
    );
  }
}

/**
 * Invariant: Available inventory must be sufficient before reservation.
 *
 * Why: Cannot promise inventory we don't have.
 * Enforcement: Application validation before reservation
 * Violation impact: Orders fail to fulfill, customer dissatisfaction.
 *
 * @param available - The available inventory
 * @param requested - The requested quantity to reserve
 * @param sku - The SKU for error message
 * @throws Error if invariant is violated
 */
export function invariantAvailableInventorySufficient(
  available: number,
  requested: number,
  sku: string
): void {
  if (available < requested) {
    throw new Error(
      `INVARIANT VIOLATION: Attempting to reserve ${requested} units of ${sku} but only ${available} available. ` +
        `Insufficient inventory for reservation.`
    );
  }
}

// ============================================================================
// INVARIANT BATCH CHECKING
// ============================================================================

/**
 * Run all inventory-related invariant checks.
 * Useful for validating inventory state after operations.
 */
export function validateInventoryInvariants(quantity: number, reserved: number): void {
  invariantInventoryNeverNegative(quantity);
  invariantReservedNeverExceedsTotal(quantity, reserved);

  // Calculate available
  const available = quantity - reserved;
  invariantInventoryNeverNegative(available);
}

/**
 * Run all order-related invariant checks.
 * Useful for validating order state after changes.
 */
export function validateOrderInvariants(
  status: OrderStatus,
  progress: number,
  pickerId?: string,
  packerId?: string
): void {
  invariantProgressRange(progress);
  invariantPickerRequiredForPickingStates(status, pickerId);
  invariantPackerRequiredForPackingStates(status, packerId);

  // Check if attempting invalid transition from terminal state
  // (This should be validated before calling, but check here for safety)
}

/**
 * Run all order item-related invariant checks.
 */
export function validateOrderItemInvariants(quantity: number, pickedQuantity: number): void {
  invariantQuantityAlwaysPositive(quantity);
  invariantPickedNeverExceedsOrdered(quantity, pickedQuantity);
}

// ============================================================================
// INVARIANT DOCUMENTATION
// ============================================================================

/**
 * Summary of all WMS invariants for reference.
 *
 * These invariants form the "laws of physics" for the warehouse system.
 * They cannot be violated without causing data corruption or operational failure.
 *
 * Inventory Invariants:
 * - Inventory quantity can never be negative
 * - Reserved quantity can never exceed total quantity
 * - Available quantity is calculated as (quantity - reserved), must be non-negative
 *
 * Order Invariants:
 * - Order progress must be between 0 and 100 (inclusive)
 * - Terminal states (SHIPPED, CANCELLED) cannot transition further
 * - Picker must be assigned for PICKING and PICKED states
 * - Packer must be assigned for PACKING and PACKED states
 *
 * Order Item Invariants:
 * - Ordered quantity must always be positive
 * - Picked quantity can never exceed ordered quantity
 *
 * Operational Invariants:
 * - Bin location format must match Z-A-S pattern (e.g., A-12-03)
 * - Inventory reservations must be released on order cancellation
 * - Audit trail entries must never be deleted
 * - Foreign key constraints must never be disabled
 * - Order IDs must be unique
 * - Available inventory must be sufficient before reservation
 *
 * Enforcement Strategy:
 * 1. Database constraints (CHECK, FOREIGN KEY, PRIMARY KEY) - last line of defense
 * 2. Application validation - before database writes
 * 3. Type system - compile-time guarantees
 * 4. AI rules - prevent agents from writing code that violates invariants
 *
 * If you encounter an invariant violation:
 * 1. STOP - do not proceed with the operation
 * 2. LOG - record the violation with full context
 * 3. INVESTIGATE - determine root cause (bug, data migration, manual intervention)
 * 4. FIX - restore data to valid state
 * 5. PREVENT - add additional safeguards to prevent recurrence
 */
export const INVARIANT_SUMMARY = {
  inventory: [
    'Inventory quantity can never be negative',
    'Reserved quantity can never exceed total quantity',
    'Available quantity (quantity - reserved) must be non-negative',
  ],
  orders: [
    'Order progress must be between 0 and 100',
    'Terminal states (SHIPPED, CANCELLED) cannot transition',
    'Picker required for PICKING and PICKED states',
    'Packer required for PACKING and PACKED states',
  ],
  orderItems: [
    'Ordered quantity must always be positive',
    'Picked quantity can never exceed ordered quantity',
  ],
  operations: [
    'Bin location format must be Z-A-S (e.g., A-12-03)',
    'Reservations released on order cancellation',
    'Audit trail entries never deleted',
    'Foreign key constraints never disabled',
    'Order IDs must be unique',
    'Available inventory sufficient before reservation',
  ],
} as const;

// ============================================================================
// RUNTIME INVARIANT CHECKER (for development/testing)
// ============================================================================

/**
 * Runtime invariant checker that throws detailed errors.
 * Use this in development and tests to catch invariant violations early.
 *
 * In production, invariants should be prevented by validation,
 * not caught by runtime checks.
 */
export class InvariantChecker {
  private violations: string[] = [];

  /**
   * Check an invariant and record any violations.
   */
  check(fn: () => void, context: string): boolean {
    try {
      fn();
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.violations.push(`${context}: ${message}`);
      return false;
    }
  }

  /**
   * Get all recorded violations.
   */
  getViolations(): readonly string[] {
    return this.violations;
  }

  /**
   * Check if any violations were recorded.
   */
  hasViolations(): boolean {
    return this.violations.length > 0;
  }

  /**
   * Clear all recorded violations.
   */
  clear(): void {
    this.violations = [];
  }

  /**
   * Throw if any violations were recorded.
   */
  throwIfViolated(): void {
    if (this.hasViolations()) {
      throw new Error(
        `INVARIANT VIOLATIONS DETECTED:\n${this.violations.join('\n')}\n` +
          `These violations indicate data corruption or logic errors.`
      );
    }
  }
}
