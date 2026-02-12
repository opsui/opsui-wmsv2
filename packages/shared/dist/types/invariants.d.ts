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
export declare function invariantInventoryNeverNegative(quantity: number): void;
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
export declare function invariantReservedNeverExceedsTotal(quantity: number, reserved: number): void;
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
export declare function invariantProgressRange(progress: number): void;
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
export declare function invariantPickedNeverExceedsOrdered(quantity: number, pickedQuantity: number): void;
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
export declare function invariantQuantityAlwaysPositive(quantity: number): void;
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
export declare function invariantTerminalStateImmutable(status: OrderStatus): void;
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
export declare function invariantPickerRequiredForPickingStates(status: OrderStatus, pickerId?: string): void;
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
export declare function invariantPackerRequiredForPackingStates(status: OrderStatus, packerId?: string): void;
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
export declare function invariantBinLocationFormatValid(binId: string): void;
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
export declare function invariantReservationsReleasedOnCancellation(orderId: string, remainingReservations: number): void;
/**
 * Invariant: Audit trail entries must never be deleted.
 *
 * Why: Audit trail provides legal and operational history.
 * Enforcement: Application never executes DELETE on transaction tables
 * Violation impact: Compliance violations, inability to investigate errors.
 *
 * Note: This is a procedural invariant, enforced by code review and AI rules.
 */
export declare function invariantAuditTrailImmutable(): never;
/**
 * Invariant: Foreign key relationships must never be bypassed.
 *
 * Why: Referential integrity ensures data consistency.
 * Enforcement: Database FOREIGN KEY constraints
 * Violation impact: Orphaned records, broken queries, data corruption.
 *
 * Note: This is enforced at database level, but code must never disable constraints.
 */
export declare function invariantForeignKeysNeverDisabled(): never;
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
export declare function invariantOrderIdUnique(existingOrder: unknown, orderId: string): void;
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
export declare function invariantAvailableInventorySufficient(available: number, requested: number, sku: string): void;
/**
 * Run all inventory-related invariant checks.
 * Useful for validating inventory state after operations.
 */
export declare function validateInventoryInvariants(quantity: number, reserved: number): void;
/**
 * Run all order-related invariant checks.
 * Useful for validating order state after changes.
 */
export declare function validateOrderInvariants(status: OrderStatus, progress: number, pickerId?: string, packerId?: string): void;
/**
 * Run all order item-related invariant checks.
 */
export declare function validateOrderItemInvariants(quantity: number, pickedQuantity: number): void;
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
export declare const INVARIANT_SUMMARY: {
    readonly inventory: readonly ["Inventory quantity can never be negative", "Reserved quantity can never exceed total quantity", "Available quantity (quantity - reserved) must be non-negative"];
    readonly orders: readonly ["Order progress must be between 0 and 100", "Terminal states (SHIPPED, CANCELLED) cannot transition", "Picker required for PICKING and PICKED states", "Packer required for PACKING and PACKED states"];
    readonly orderItems: readonly ["Ordered quantity must always be positive", "Picked quantity can never exceed ordered quantity"];
    readonly operations: readonly ["Bin location format must be Z-A-S (e.g., A-12-03)", "Reservations released on order cancellation", "Audit trail entries never deleted", "Foreign key constraints never disabled", "Order IDs must be unique", "Available inventory sufficient before reservation"];
};
/**
 * Runtime invariant checker that throws detailed errors.
 * Use this in development and tests to catch invariant violations early.
 *
 * In production, invariants should be prevented by validation,
 * not caught by runtime checks.
 */
export declare class InvariantChecker {
    private violations;
    /**
     * Check an invariant and record any violations.
     */
    check(fn: () => void, context: string): boolean;
    /**
     * Get all recorded violations.
     */
    getViolations(): readonly string[];
    /**
     * Check if any violations were recorded.
     */
    hasViolations(): boolean;
    /**
     * Clear all recorded violations.
     */
    clear(): void;
    /**
     * Throw if any violations were recorded.
     */
    throwIfViolated(): void;
}
//# sourceMappingURL=invariants.d.ts.map