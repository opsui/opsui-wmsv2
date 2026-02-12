/**
 * Workflow State Machine Guardrails
 *
 * This file defines the VALID state transitions for the WMS workflow.
 * These rules enforce business invariants and prevent invalid state changes.
 *
 * CRITICAL: These rules must match the database constraints and triggers.
 * See: packages/backend/src/db/schema.sql
 */
import { OrderStatus } from './index';
/**
 * Valid state transitions for orders.
 *
 * Key: Current state
 * Value: Array of valid next states
 *
 * Visual representation:
 *
 *     PENDING ──────→ PICKING ──→ PICKED ──→ PACKING ──→ PACKED ──→ SHIPPED
 *        │                │
 *        ↓                ↓
 *    CANCELLED       CANCELLED
 *
 *     PENDING ──────→ BACKORDER ──→ PENDING
 */
export declare const VALID_ORDER_TRANSITIONS: Readonly<Record<OrderStatus, readonly OrderStatus[]>>;
/**
 * Terminal states - once reached, orders cannot transition further.
 */
export declare const TERMINAL_ORDER_STATES: ReadonlySet<OrderStatus>;
/**
 * Cancellable states - orders can only be cancelled from these states.
 */
export declare const CANCELLABLE_ORDER_STATES: ReadonlySet<OrderStatus>;
/**
 * States that require an assigned picker.
 */
export declare const PICKER_REQUIRED_STATES: ReadonlySet<OrderStatus>;
/**
 * States that require an assigned packer.
 */
export declare const PACKER_REQUIRED_STATES: ReadonlySet<OrderStatus>;
/**
 * Validates if a state transition is allowed.
 *
 * @param fromStatus - Current order status
 * @param toStatus - Desired next status
 * @returns true if transition is valid, false otherwise
 *
 * @example
 * isValidTransition(OrderStatus.PENDING, OrderStatus.PICKING); // true
 * isValidTransition(OrderStatus.PICKING, OrderStatus.SHIPPED); // false
 */
export declare function isValidTransition(fromStatus: OrderStatus, toStatus: OrderStatus): boolean;
/**
 * Gets all valid next states for a given current state.
 *
 * @param fromStatus - Current order status
 * @returns Array of valid next states (empty if terminal state)
 *
 * @example
 * getNextStates(OrderStatus.PENDING);
 * // Returns: [OrderStatus.PICKING, OrderStatus.CANCELLED, OrderStatus.BACKORDER]
 */
export declare function getNextStates(fromStatus: OrderStatus): readonly OrderStatus[];
/**
 * Checks if an order is in a terminal state.
 *
 * @param status - Order status to check
 * @returns true if status is terminal
 */
export declare function isTerminalState(status: OrderStatus): boolean;
/**
 * Checks if an order can be cancelled from its current state.
 *
 * @param status - Current order status
 * @returns true if order can be cancelled
 */
export declare function isCancellable(status: OrderStatus): boolean;
/**
 * Checks if a picker must be assigned for the given state.
 *
 * @param status - Order status to check
 * @returns true if picker is required
 */
export declare function isPickerRequired(status: OrderStatus): boolean;
/**
 * Checks if a packer must be assigned for the given state.
 *
 * @param status - Order status to check
 * @returns true if packer is required
 */
export declare function isPackerRequired(status: OrderStatus): boolean;
/**
 * Prerequisites that must be met before each state transition.
 * These are checked by the service layer before allowing transitions.
 */
export declare const TRANSITION_PREREQUISITES: {
    readonly PICKING: {
        readonly check: (context: TransitionContext) => Promise<void>;
    };
    readonly PICKED: {
        readonly check: (context: TransitionContext) => Promise<void>;
    };
    readonly PACKING: {
        readonly check: (context: TransitionContext) => Promise<void>;
    };
    readonly PACKED: {
        readonly check: () => Promise<void>;
    };
    readonly SHIPPED: {
        readonly check: (context: TransitionContext) => Promise<void>;
    };
    readonly CANCELLED: {
        readonly check: (context: TransitionContext) => Promise<void>;
    };
    readonly BACKORDER: {
        readonly check: (context: TransitionContext) => Promise<void>;
    };
};
/**
 * Context interface for transition prerequisite checks.
 * Services must provide this context when validating transitions.
 */
export interface TransitionContext {
    orderId: string;
    pickerId?: string;
    packerId?: string;
    orderItems: Array<{
        sku: string;
        quantity: number;
        pickedQuantity: number;
        binLocation: string;
    }>;
    maxOrdersPerPicker: number;
    shippingInfo?: unknown;
    carrier?: string;
    backorderReason?: string;
    getActiveOrderCount(pickerId: string): Promise<number>;
    getAvailableInventory(sku: string, binLocation: string): Promise<number>;
    getPicker(pickerId: string): Promise<{
        active: boolean;
    }>;
    getPacker(packerId: string): Promise<{
        active: boolean;
    }>;
    getIncompletePickTasks(orderId: string): Promise<unknown[]>;
    releaseReservedInventory(orderId: string): Promise<void>;
}
/**
 * Validates a state transition with all prerequisites.
 *
 * This is the main entry point for services to validate transitions.
 *
 * @param fromStatus - Current order status
 * @param toStatus - Desired next status
 * @param context - Transition context with order details
 * @throws Error if transition is invalid or prerequisites not met
 *
 * @example
 * await validateTransition(
 *   OrderStatus.PENDING,
 *   OrderStatus.PICKING,
 *   {
 *     orderId: 'ORD-20250112-123456',
 *     pickerId: 'USR-001',
 *     orderItems: [...],
 *     maxOrdersPerPicker: 10,
 *     getActiveOrderCount: async (id) => db.count(...),
 *     ...
 *   }
 * );
 */
export declare function validateTransition(fromStatus: OrderStatus, toStatus: OrderStatus, context: TransitionContext): Promise<void>;
/**
 * State transition metadata for UI display and logging.
 */
export declare const STATE_METADATA: Readonly<Record<OrderStatus, {
    label: string;
    description: string;
    color: string;
    requiresPicker: boolean;
    requiresPacker: boolean;
}>>;
//# sourceMappingURL=workflow.d.ts.map