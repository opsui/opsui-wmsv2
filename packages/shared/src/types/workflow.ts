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
export const VALID_ORDER_TRANSITIONS: Readonly<Record<OrderStatus, readonly OrderStatus[]>> = {
  [OrderStatus.PENDING]: [
    OrderStatus.PICKING, // Normal flow
    OrderStatus.CANCELLED, // Customer cancellation
    OrderStatus.BACKORDER, // Insufficient inventory
  ] as const,

  [OrderStatus.PICKING]: [
    OrderStatus.PICKED, // All items picked
    OrderStatus.CANCELLED, // Emergency cancellation
  ] as const,

  [OrderStatus.PICKED]: [
    OrderStatus.PACKING, // Ready for packing
  ] as const,

  [OrderStatus.PACKING]: [
    OrderStatus.PACKED, // All items packed
  ] as const,

  [OrderStatus.PACKED]: [
    OrderStatus.SHIPPED, // Shipment confirmed
  ] as const,

  [OrderStatus.SHIPPED]: [
    // Terminal state - no transitions allowed
  ] as const,

  [OrderStatus.CANCELLED]: [
    // Terminal state - no transitions allowed
  ] as const,

  [OrderStatus.BACKORDER]: [
    OrderStatus.PENDING, // Inventory replenished, retry order
  ] as const,
} as const;

/**
 * Terminal states - once reached, orders cannot transition further.
 */
export const TERMINAL_ORDER_STATES: ReadonlySet<OrderStatus> = new Set([
  OrderStatus.SHIPPED,
  OrderStatus.CANCELLED,
]) as ReadonlySet<OrderStatus>;

/**
 * Cancellable states - orders can only be cancelled from these states.
 */
export const CANCELLABLE_ORDER_STATES: ReadonlySet<OrderStatus> = new Set([
  OrderStatus.PENDING,
  OrderStatus.PICKING,
]) as ReadonlySet<OrderStatus>;

/**
 * States that require an assigned picker.
 */
export const PICKER_REQUIRED_STATES: ReadonlySet<OrderStatus> = new Set([
  OrderStatus.PICKING,
  OrderStatus.PICKED,
]) as ReadonlySet<OrderStatus>;

/**
 * States that require an assigned packer.
 */
export const PACKER_REQUIRED_STATES: ReadonlySet<OrderStatus> = new Set([
  OrderStatus.PACKING,
  OrderStatus.PACKED,
]) as ReadonlySet<OrderStatus>;

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
export function isValidTransition(fromStatus: OrderStatus, toStatus: OrderStatus): boolean {
  const allowedTransitions = VALID_ORDER_TRANSITIONS[fromStatus];
  return allowedTransitions.includes(toStatus);
}

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
export function getNextStates(fromStatus: OrderStatus): readonly OrderStatus[] {
  return VALID_ORDER_TRANSITIONS[fromStatus];
}

/**
 * Checks if an order is in a terminal state.
 *
 * @param status - Order status to check
 * @returns true if status is terminal
 */
export function isTerminalState(status: OrderStatus): boolean {
  return TERMINAL_ORDER_STATES.has(status);
}

/**
 * Checks if an order can be cancelled from its current state.
 *
 * @param status - Current order status
 * @returns true if order can be cancelled
 */
export function isCancellable(status: OrderStatus): boolean {
  return CANCELLABLE_ORDER_STATES.has(status);
}

/**
 * Checks if a picker must be assigned for the given state.
 *
 * @param status - Order status to check
 * @returns true if picker is required
 */
export function isPickerRequired(status: OrderStatus): boolean {
  return PICKER_REQUIRED_STATES.has(status);
}

/**
 * Checks if a packer must be assigned for the given state.
 *
 * @param status - Order status to check
 * @returns true if packer is required
 */
export function isPackerRequired(status: OrderStatus): boolean {
  return PACKER_REQUIRED_STATES.has(status);
}

/**
 * Prerequisites that must be met before each state transition.
 * These are checked by the service layer before allowing transitions.
 */
export const TRANSITION_PREREQUISITES = {
  [OrderStatus.PICKING]: {
    // Before: PENDING → PICKING
    check: async (context: TransitionContext) => {
      // 1. Picker must have < MAX_ORDERS_PER_PICKER active orders
      if (!context.pickerId) {
        throw new Error('Picker ID is required for picking transition');
      }
      const activeOrderCount = await context.getActiveOrderCount(context.pickerId);
      if (activeOrderCount >= context.maxOrdersPerPicker) {
        throw new Error(`Picker has reached maximum active orders (${context.maxOrdersPerPicker})`);
      }

      // 2. All order items must have available inventory
      for (const item of context.orderItems) {
        const available = await context.getAvailableInventory(item.sku, item.binLocation);
        if (available < item.quantity) {
          throw new Error(`Insufficient inventory for ${item.sku} at ${item.binLocation}`);
        }
      }

      // 3. Picker must be active
      const picker = await context.getPicker(context.pickerId);
      if (!picker.active) {
        throw new Error(`Picker ${context.pickerId} is not active`);
      }
    },
  },

  [OrderStatus.PICKED]: {
    // Before: PICKING → PICKED
    check: async (context: TransitionContext) => {
      // 1. All items must be fully picked
      const unpickedItems = context.orderItems.filter(item => item.pickedQuantity < item.quantity);
      if (unpickedItems.length > 0) {
        throw new Error(`${unpickedItems.length} items not fully picked`);
      }

      // 2. All pick tasks must be completed
      const incompleteTasks = await context.getIncompletePickTasks(context.orderId);
      if (incompleteTasks.length > 0) {
        throw new Error(`${incompleteTasks.length} pick tasks not completed`);
      }
    },
  },

  [OrderStatus.PACKING]: {
    // Before: PICKED → PACKING
    check: async (context: TransitionContext) => {
      // 1. Packer must be assigned
      if (!context.packerId) {
        throw new Error('Packer must be assigned before packing');
      }

      // 2. Packer must be active
      const packer = await context.getPacker(context.packerId);
      if (!packer.active) {
        throw new Error(`Packer ${context.packerId} is not active`);
      }
    },
  },

  [OrderStatus.PACKED]: {
    // Before: PACKING → PACKED
    check: async () => {
      // 1. All items must be packed
      // (Implementation depends on packing workflow)
    },
  },

  [OrderStatus.SHIPPED]: {
    // Before: PACKED → SHIPPED
    check: async (context: TransitionContext) => {
      // 1. Shipping information must be provided
      if (!context.shippingInfo) {
        throw new Error('Shipping information required');
      }

      // 2. Carrier must be confirmed
      if (!context.carrier) {
        throw new Error('Carrier must be assigned');
      }
    },
  },

  [OrderStatus.CANCELLED]: {
    // Before: ANY → CANCELLED
    check: async (context: TransitionContext) => {
      // 1. Must be in cancellable state (validated before calling this)
      // 2. Reserved inventory must be released
      await context.releaseReservedInventory(context.orderId);
    },
  },

  [OrderStatus.BACKORDER]: {
    // Before: PENDING → BACKORDER
    check: async (context: TransitionContext) => {
      // 1. Reason for backorder must be provided
      if (!context.backorderReason) {
        throw new Error('Backorder reason must be provided');
      }
    },
  },
} as const;

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

  // Async methods provided by service layer
  getActiveOrderCount(pickerId: string): Promise<number>;
  getAvailableInventory(sku: string, binLocation: string): Promise<number>;
  getPicker(pickerId: string): Promise<{ active: boolean }>;
  getPacker(packerId: string): Promise<{ active: boolean }>;
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
export async function validateTransition(
  fromStatus: OrderStatus,
  toStatus: OrderStatus,
  context: TransitionContext
): Promise<void> {
  // 1. Check if transition is allowed
  if (!isValidTransition(fromStatus, toStatus)) {
    throw new Error(
      `Invalid state transition: ${fromStatus} → ${toStatus}. ` +
        `Valid transitions from ${fromStatus}: ${getNextStates(fromStatus).join(', ')}`
    );
  }

  // 2. Check prerequisites
  const prerequisiteCheck =
    TRANSITION_PREREQUISITES[toStatus as keyof typeof TRANSITION_PREREQUISITES];
  if (prerequisiteCheck) {
    await prerequisiteCheck.check(context);
  }
}

/**
 * State transition metadata for UI display and logging.
 */
export const STATE_METADATA: Readonly<
  Record<
    OrderStatus,
    {
      label: string;
      description: string;
      color: string;
      requiresPicker: boolean;
      requiresPacker: boolean;
    }
  >
> = {
  [OrderStatus.PENDING]: {
    label: 'Pending',
    description: 'Order created, waiting to be picked',
    color: 'gray',
    requiresPicker: false,
    requiresPacker: false,
  },
  [OrderStatus.PICKING]: {
    label: 'Picking',
    description: 'Picker is actively gathering items',
    color: 'blue',
    requiresPicker: true,
    requiresPacker: false,
  },
  [OrderStatus.PICKED]: {
    label: 'Picked',
    description: 'All items gathered, ready for packing',
    color: 'indigo',
    requiresPicker: true,
    requiresPacker: false,
  },
  [OrderStatus.PACKING]: {
    label: 'Packing',
    description: 'Packer is preparing shipment',
    color: 'purple',
    requiresPicker: true,
    requiresPacker: true,
  },
  [OrderStatus.PACKED]: {
    label: 'Packed',
    description: 'Shipment prepared, awaiting carrier',
    color: 'orange',
    requiresPicker: true,
    requiresPacker: true,
  },
  [OrderStatus.SHIPPED]: {
    label: 'Shipped',
    description: 'Order has been shipped to customer',
    color: 'green',
    requiresPicker: true,
    requiresPacker: true,
  },
  [OrderStatus.CANCELLED]: {
    label: 'Cancelled',
    description: 'Order has been cancelled',
    color: 'red',
    requiresPicker: false,
    requiresPacker: false,
  },
  [OrderStatus.BACKORDER]: {
    label: 'Backorder',
    description: 'Order delayed due to insufficient inventory',
    color: 'yellow',
    requiresPicker: false,
    requiresPacker: false,
  },
} as const;
