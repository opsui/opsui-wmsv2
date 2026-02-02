/**
 * Mock for @opsui/shared package
 *
 * This mock provides default implementations for the shared utilities
 * to allow Jest tests to run without loading the actual ES module dist files.
 */

// ============================================================================
// ENUMS
// ============================================================================

export enum OrderStatus {
  PENDING = 'PENDING',
  PICKING = 'PICKING',
  PICKED = 'PICKED',
  PACKING = 'PACKING',
  PACKED = 'PACKED',
  SHIPPED = 'SHIPPED',
  CANCELLED = 'CANCELLED',
  BACKORDER = 'BACKORDER',
}

export enum OrderPriority {
  LOW = 'LOW',
  NORMAL = 'NORMAL',
  HIGH = 'HIGH',
  URGENT = 'URGENT',
}

export enum OrderItemStatus {
  PENDING = 'PENDING',
  PARTIAL_PICKED = 'PARTIAL_PICKED',
  FULLY_PICKED = 'FULLY_PICKED',
}

export enum TaskStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  SKIPPED = 'SKIPPED',
}

export enum UserRole {
  PICKER = 'PICKER',
  PACKER = 'PACKER',
  STOCK_CONTROLLER = 'STOCK_CONTROLLER',
  INWARDS = 'INWARDS',
  SUPERVISOR = 'SUPERVISOR',
  ADMIN = 'ADMIN',
  PRODUCTION = 'PRODUCTION',
  SALES = 'SALES',
  MAINTENANCE = 'MAINTENANCE',
  RMA = 'RMA',
}

export enum BinType {
  SHELF = 'SHELF',
  FLOOR = 'FLOOR',
  RACK = 'RACK',
  BIN = 'BIN',
}

export enum TransactionType {
  RESERVATION = 'RESERVATION',
  DEDUCTION = 'DEDUCTION',
  CANCELLATION = 'CANCELLATION',
  ADJUSTMENT = 'ADJUSTMENT',
  RECEIPT = 'RECEIPT',
}

export enum ASNStatus {
  PENDING = 'PENDING',
  IN_TRANSIT = 'IN_TRANSIT',
  RECEIVED = 'RECEIVED',
  PARTIALLY_RECEIVED = 'PARTIALLY_RECEIVED',
  CANCELLED = 'CANCELLED',
}

export enum ASNLineStatus {
  PENDING = 'PENDING',
  PARTIALLY_RECEIVED = 'PARTIALLY_RECEIVED',
  FULLY_RECEIVED = 'FULLY_RECEIVED',
  CANCELLED = 'CANCELLED',
}

export enum ReceiptType {
  PO = 'PO',
  RETURN = 'RETURN',
  TRANSFER = 'TRANSFER',
  ADJUSTMENT = 'ADJUSTMENT',
}

export enum ReceiptStatus {
  RECEIVING = 'RECEIVING',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export enum QualityStatus {
  PENDING = 'PENDING',
  PASSED = 'PASSED',
  FAILED = 'FAILED',
  PARTIAL = 'PARTIAL',
}

export enum InspectionStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  PASSED = 'PASSED',
  FAILED = 'FAILED',
  PARTIAL = 'PARTIAL',
}

export enum InspectionType {
  INCOMING = 'INCOMING',
  OUTGOING = 'OUTGOING',
  INVENTORY = 'INVENTORY',
  QUALITY_HOLD = 'QUALITY_HOLD',
}

export enum DefectType {
  DAMAGED = 'DAMAGED',
  DEFECTIVE = 'DEFECTIVE',
  MISSING_PARTS = 'MISSING_PARTS',
  WRONG_ITEM = 'WRONG_ITEM',
}

export enum DispositionAction {
  RETURN_TO_VENDOR = 'RETURN_TO_VENDOR',
  SCRAP = 'SCRAP',
  REWORK = 'REWORK',
  QUARANTINE = 'QUARANTINE',
  SELL_AS_IS = 'SELL_AS_IS',
  DISCOUNT = 'DISCOUNT',
}

export enum PutawayStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export enum ShipmentStatus {
  PENDING = 'PENDING',
  LABEL_CREATED = 'LABEL_CREATED',
  SHIPPED = 'SHIPPED',
  IN_TRANSIT = 'IN_TRANSIT',
  OUT_FOR_DELIVERY = 'OUT_FOR_DELIVERY',
  DELIVERED = 'DELIVERED',
  EXCEPTION = 'EXCEPTION',
  CANCELLED = 'CANCELLED',
}

export enum CycleCountStatus {
  SCHEDULED = 'SCHEDULED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  RECONCILED = 'RECONCILED',
}

export enum CycleCountType {
  ABC = 'ABC',
  BLANKET = 'BLANKET',
  SPOT_CHECK = 'SPOT_CHECK',
  RECEIVING = 'RECEIVING',
  SHIPPING = 'SHIPPING',
  AD_HOC = 'AD_HOC',
}

export enum VarianceStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  AUTO_ADJUSTED = 'AUTO_ADJUSTED',
}

export enum CapacityType {
  WEIGHT = 'WEIGHT',
  VOLUME = 'VOLUME',
  QUANTITY = 'QUANTITY',
}

export enum CapacityUnit {
  LBS = 'LBS',
  KG = 'KG',
  CUBIC_FT = 'CUBIC_FT',
  CUBIC_M = 'CUBIC_M',
  UNITS = 'UNITS',
  PALLET = 'PALLET',
}

export enum CapacityRuleStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  WARNING = 'WARNING',
  EXCEEDED = 'EXCEEDED',
}

export enum ExceptionType {
  UNCLAIM = 'UNCLAIM',
  UNDO_PICK = 'UNDO_PICK',
  SHORT_PICK = 'SHORT_PICK',
  SHORT_PICK_BACKORDER = 'SHORT_PICK_BACKORDER',
  DAMAGE = 'DAMAGE',
  DEFECTIVE = 'DEFECTIVE',
  WRONG_ITEM = 'WRONG_ITEM',
  SUBSTITUTION = 'SUBSTITUTION',
  OUT_OF_STOCK = 'OUT_OF_STOCK',
  BIN_MISMATCH = 'BIN_MISMATCH',
}

export enum ExceptionStatus {
  OPEN = 'OPEN',
  REVIEWING = 'REVIEWING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  RESOLVED = 'RESOLVED',
  CANCELLED = 'CANCELLED',
}

export enum ExceptionResolution {
  BACKORDER = 'BACKORDER',
  SUBSTITUTE = 'SUBSTITUTE',
  CANCEL_ITEM = 'CANCEL_ITEM',
  CANCEL_ORDER = 'CANCEL_ORDER',
  ADJUST_QUANTITY = 'ADJUST_QUANTITY',
  RETURN_TO_STOCK = 'RETURN_TO_STOCK',
  WRITE_OFF = 'WRITE_OFF',
  TRANSFER_BIN = 'TRANSFER_BIN',
  CONTACT_CUSTOMER = 'CONTACT_CUSTOMER',
  MANUAL_OVERRIDE = 'MANUAL_OVERRIDE',
}

export enum AutomationTaskType {
  CYCLE_COUNT = 'CYCLE_COUNT',
  INVENTORY_CHECK = 'INVENTORY_CHECK',
  PICK = 'PICK',
  PUTAWAY = 'PUTAWAY',
  REPLENISHMENT = 'REPLENISHMENT',
}

export enum AutomationTaskStatus {
  PENDING = 'PENDING',
  ASSIGNED = 'ASSIGNED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
}

export enum UnitLevel {
  PALLET = 'PALLET',
  CASE = 'CASE',
  EACH = 'EACH',
}

// Permission enum - common permissions
export enum Permission {
  VIEW_ORDERS = 'view_orders',
  CREATE_ORDERS = 'create_orders',
  EDIT_ORDERS = 'edit_orders',
  DELETE_ORDERS = 'delete_orders',
  ASSIGN_ORDERS = 'assign_orders',
  VIEW_PICK_TASKS = 'view_pick_tasks',
  CLAIM_PICK_TASK = 'claim_pick_task',
  COMPLETE_PICK_TASK = 'complete_pick_task',
  SKIP_PICK_TASK = 'skip_pick_task',
  VIEW_INVENTORY = 'view_inventory',
  ADJUST_INVENTORY = 'adjust_inventory',
}

export enum LabelFormat {
  PDF = 'PDF',
  PNG = 'PNG',
  ZPLII = 'ZPLII',
  EPL2 = 'EPL2',
}

export enum NZCLabelFormat {
  PNG_100X175 = 'LABEL_PNG_100X175',
  PNG_100X150 = 'LABEL_PNG_100X150',
  PDF_100X175 = 'LABEL_PDF_100X175',
  PDF = 'LABEL_PDF',
}

// ============================================================================
// MOCK FUNCTIONS
// ============================================================================

// Mock validators - simple implementations that pass by default
export const validateOrderItems = jest.fn(() => ({ valid: true, errors: [] }));
export const validateSKU = jest.fn(() => ({ valid: true, errors: [] }));
export const validateBinLocation = jest.fn(() => ({ valid: true, errors: [] }));
export const validateQuantity = jest.fn(() => ({ valid: true, errors: [] }));

// Mock generators
export const generateId = jest.fn(() => 'test-id-' + Math.random().toString(36).slice(2, 11));
export const generateSKU = jest.fn(
  () => 'TEST-SKU-' + Math.random().toString(36).slice(2, 8).toUpperCase()
);
export const generateOrderId = jest.fn(() => 'ORD-' + Date.now());

// Mock system constants
export const WAREHOUSE_ZONES = ['A', 'B', 'C', 'D'];
export const PICK_PRIORITIES = ['CRITICAL', 'HIGH', 'NORMAL', 'LOW'];
export const ORDER_STATUSES = ['PENDING', 'PICKING', 'PICKED', 'PACKED', 'SHIPPED'];

// Mock workflow guardrails
export const checkWorkflowGuardrails = jest.fn(() => ({ allowed: true, violations: [] }));
export const recordWorkflowAction = jest.fn(() => ({ success: true }));

// Mock invariants
export const checkInventoryInvariant = jest.fn(() => ({ holds: true, violation: undefined }));
export const checkOrderInvariant = jest.fn(() => ({ holds: true, violation: undefined }));
