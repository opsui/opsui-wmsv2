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
