/**
 * Business Rules Engine Types
 *
 * Defines the domain model for configurable business rules,
 * rule conditions, actions, and allocation logic.
 */

// ============================================================================
// ENUMS
// ============================================================================

export enum RuleType {
  ALLOCATION = 'ALLOCATION',
  PICKING = 'PICKING',
  SHIPPING = 'SHIPPING',
  INVENTORY = 'INVENTORY',
  PRICING = 'PRICING',
  VALIDATION = 'VALIDATION',
  NOTIFICATION = 'NOTIFICATION',
}

export enum RuleStatus {
  DRAFT = 'DRAFT',
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  ARCHIVED = 'ARCHIVED',
}

export enum ConditionOperator {
  EQUALS = 'EQUALS',
  NOT_EQUALS = 'NOT_EQUALS',
  GREATER_THAN = 'GREATER_THAN',
  LESS_THAN = 'LESS_THAN',
  GREATER_THAN_OR_EQUAL = 'GREATER_THAN_OR_EQUAL',
  LESS_THAN_OR_EQUAL = 'LESS_THAN_OR_EQUAL',
  CONTAINS = 'CONTAINS',
  NOT_CONTAINS = 'NOT_CONTAINS',
  STARTS_WITH = 'STARTS_WITH',
  ENDS_WITH = 'ENDS_WITH',
  IN = 'IN',
  NOT_IN = 'NOT_IN',
  BETWEEN = 'BETWEEN',
  IS_NULL = 'IS_NULL',
  IS_NOT_NULL = 'IS_NOT_NULL',
  MATCHES_REGEX = 'MATCHES_REGEX',
}

export enum LogicalOperator {
  AND = 'AND',
  OR = 'OR',
}

export enum ActionType {
  SET_PRIORITY = 'SET_PRIORITY',
  ALLOCATE_LOCATION = 'ALLOCATE_LOCATION',
  ASSIGN_USER = 'ASSIGN_USER',
  SEND_NOTIFICATION = 'SEND_NOTIFICATION',
  CALCULATE_FIELD = 'CALCULATE_FIELD',
  BLOCK_ACTION = 'BLOCK_ACTION',
  REQUIRE_APPROVAL = 'REQUIRE_APPROVAL',
  UPDATE_INVENTORY = 'UPDATE_INVENTORY',
  CREATE_TASK = 'CREATE_TASK',
  MODIFY_FIELD = 'MODIFY_FIELD',
}

export enum RuleEventType {
  ORDER_CREATED = 'ORDER_CREATED',
  ORDER_UPDATED = 'ORDER_UPDATED',
  INVENTORY_ADDED = 'INVENTORY_ADDED',
  INVENTORY_REMOVED = 'INVENTORY_REMOVED',
  LOCATION_CAPACITY_CHANGED = 'LOCATION_CAPACITY_CHANGED',
  USER_ASSIGNED = 'USER_ASSIGNED',
  SHIPMENT_CREATED = 'SHIPMENT_CREATED',
  PICK_TASK_COMPLETED = 'PICK_TASK_COMPLETED',
}

// ============================================================================
// INTERFACES
// ============================================================================

/**
 * Represents a single condition in a business rule
 */
export interface RuleCondition {
  conditionId: string;
  ruleId: string;
  field: string; // e.g., "order.total", "item.quantity", "user.role"
  operator: ConditionOperator;
  value: string | number | boolean | null;
  value2?: string | number | null; // For BETWEEN operations
  logicalOperator?: LogicalOperator; // How this condition combines with the next one
  order: number; // Execution order for conditions
}

/**
 * Represents an action to be executed when rule conditions are met
 */
export interface RuleAction {
  actionId: string;
  ruleId: string;
  actionType: ActionType;
  parameters: Record<string, unknown>; // Action-specific parameters
  order: number; // Execution order for actions
}

/**
 * A business rule that defines conditional logic
 */
export interface BusinessRule {
  ruleId: string;
  name: string;
  description: string;
  ruleType: RuleType;
  status: RuleStatus;
  priority: number; // Higher priority rules execute first
  triggerEvents: RuleEventType[]; // Events that trigger this rule
  conditions: RuleCondition[];
  actions: RuleAction[];
  startDate?: Date;
  endDate?: Date;
  createdBy: string;
  createdAt: Date;
  updatedBy?: string;
  updatedAt?: Date;
  version: number; // For rule versioning
  lastExecutedAt?: Date;
  executionCount: number;
}

/**
 * Rule execution log for auditing and debugging
 */
export interface RuleExecutionLog {
  logId: string;
  ruleId: string;
  eventType: RuleEventType;
  entityId: string; // ID of the entity that triggered the rule
  entityType: string; // Type of entity (order, item, etc.)
  triggeredAt: Date;
  triggeredBy: string;
  conditionsMet: boolean;
  executionResults: RuleActionResult[];
  executionTimeMs: number;
  errorMessage?: string;
}

/**
 * Result of a rule action execution
 */
export interface RuleActionResult {
  actionId: string;
  actionType: ActionType;
  success: boolean;
  result?: unknown;
  errorMessage?: string;
}

/**
 * Rule template for quick rule creation
 */
export interface RuleTemplate {
  templateId: string;
  name: string;
  description: string;
  ruleType: RuleType;
  category: string;
  conditions: Omit<RuleCondition, 'ruleId' | 'conditionId' | 'order'>[];
  actions: Omit<RuleAction, 'ruleId' | 'actionId' | 'order'>[];
  isSystemTemplate: boolean;
  createdAt: Date;
}

// ============================================================================
// ALLOCATION RULE SPECIFIC TYPES
// ============================================================================

export enum AllocationStrategy {
  FIFO = 'FIFO', // First In, First Out
  LIFO = 'LIFO', // Last In, First Out
  FEFO = 'FEFO', // First Expired, First Out
  LEAST_PICKS = 'LEAST_PICKS', // Minimize picks per location
  ZONE_PICKING = 'ZONE_PICKING', // Zone-based picking
  WAVE_PICKING = 'WAVE_PICKING', // Batch/wave picking
  BULK_PICKING = 'BULK_PICKING', // Bulk/batch picking
}

export interface AllocationRule {
  ruleId: string;
  name: string;
  description: string;
  status: RuleStatus;
  priority: number;
  strategy: AllocationStrategy;
  conditions: RuleCondition[];
  // Allocation-specific settings
  allowPartialAllocation: boolean;
  reserveInventory: boolean;
  maxLocationsPerItem: number;
  preferSameZone: boolean;
  consolidateInventory: boolean;
  createdBy: string;
  createdAt: Date;
  updatedBy?: string;
  updatedAt?: Date;
}

export interface AllocationResult {
  allocationId: string;
  orderId: string;
  items: ItemAllocation[];
  allocatedAt: Date;
  allocatedBy: string;
  rulesApplied: string[];
  totalLocationsUsed: number;
}

export interface ItemAllocation {
  orderItemId: string;
  sku: string;
  quantityRequested: number;
  quantityAllocated: number;
  allocations: LocationAllocation[];
  status: 'FULLY_ALLOCATED' | 'PARTIALLY_ALLOCATED' | 'NOT_ALLOCATED';
}

export interface LocationAllocation {
  location: string;
  quantity: number;
  lotNumber?: string;
  expiryDate?: Date;
}
