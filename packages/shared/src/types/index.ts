/**
 * Core domain types for the Warehouse Management System
 *
 * This file defines the canonical domain model.
 * All types here must align with the database schema.
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
  DISPATCH = 'DISPATCH',
  SUPERVISOR = 'SUPERVISOR',
  ADMIN = 'ADMIN',
  PRODUCTION = 'PRODUCTION',
  SALES = 'SALES',
  MAINTENANCE = 'MAINTENANCE',
  RMA = 'RMA',
  ACCOUNTING = 'ACCOUNTING',
}

// String literal type for backward compatibility
export type UserRoleValue =
  | 'PICKER'
  | 'PACKER'
  | 'STOCK_CONTROLLER'
  | 'INWARDS'
  | 'DISPATCH'
  | 'SUPERVISOR'
  | 'ADMIN'
  | 'PRODUCTION'
  | 'SALES'
  | 'MAINTENANCE'
  | 'RMA'
  | 'ACCOUNTING';

/**
 * Permissions - Granular access control for custom roles
 * Each permission represents a specific capability in the system
 */
export enum Permission {
  // Order Management
  VIEW_ORDERS = 'view_orders',
  CREATE_ORDERS = 'create_orders',
  EDIT_ORDERS = 'edit_orders',
  DELETE_ORDERS = 'delete_orders',
  ASSIGN_ORDERS = 'assign_orders',

  // Picking Operations
  VIEW_PICK_TASKS = 'view_pick_tasks',
  CLAIM_PICK_TASK = 'claim_pick_task',
  COMPLETE_PICK_TASK = 'complete_pick_task',
  SKIP_PICK_TASK = 'skip_pick_task',

  // Packing Operations
  VIEW_PACK_TASKS = 'view_pack_tasks',
  CLAIM_PACK_TASK = 'claim_pack_task',
  COMPLETE_PACK_TASK = 'complete_pack_task',

  // Inventory Management
  VIEW_INVENTORY = 'view_inventory',
  ADJUST_INVENTORY = 'adjust_inventory',
  VIEW_STOCK_MOVEMENTS = 'view_stock_movements',

  // Stock Control
  PERFORM_CYCLE_COUNTS = 'perform_cycle_counts',
  APPROVE_CYCLE_COUNTS = 'approve_cycle_counts',
  MANAGE_LOCATIONS = 'manage_locations',
  VIEW_LOCATION_CAPACITY = 'view_location_capacity',

  // Inwards/Receiving
  PROCESS_RECEIPTS = 'process_receipts',
  MANAGE_PUTAWAYS = 'manage_putaways',

  // Reporting & Analytics
  VIEW_REPORTS = 'view_reports',
  GENERATE_REPORTS = 'generate_reports',
  EXPORT_DATA = 'export_data',

  // User Management
  VIEW_USERS = 'view_users',
  CREATE_USERS = 'create_users',
  EDIT_USERS = 'edit_users',
  DELETE_USERS = 'delete_users',
  MANAGE_USER_ROLES = 'manage_user_roles',
  MANAGE_CUSTOM_ROLES = 'manage_custom_roles',

  // Exceptions Management
  VIEW_EXCEPTIONS = 'view_exceptions',
  RESOLVE_EXCEPTIONS = 'resolve_exceptions',
  APPROVE_EXCEPTION_RESOLUTIONS = 'approve_exception_resolutions',

  // Business Rules
  VIEW_BUSINESS_RULES = 'view_business_rules',
  MANAGE_BUSINESS_RULES = 'manage_business_rules',

  // Settings & Configuration
  VIEW_SETTINGS = 'view_settings',
  MANAGE_INTEGRATIONS = 'manage_integrations',

  // Quality Control
  PERFORM_QC_CHECKS = 'perform_qc_checks',
  APPROVE_QC_RESULTS = 'approve_qc_results',

  // Production
  VIEW_PRODUCTION_TASKS = 'view_production_tasks',
  MANAGE_PRODUCTION = 'manage_production',

  // Sales
  VIEW_SALES_ORDERS = 'view_sales_orders',
  MANAGE_SALES = 'manage_sales',

  // Maintenance
  VIEW_MAINTENANCE_TASKS = 'view_maintenance_tasks',
  MANAGE_MAINTENANCE = 'manage_maintenance',

  // RMA (Returns)
  VIEW_RMA_REQUESTS = 'view_rma_requests',
  PROCESS_RMA = 'process_rma',

  // Dispatch/Shipping
  VIEW_SHIPMENTS = 'view_shipments',
  CREATE_SHIPMENTS = 'create_shipments',
  CANCEL_SHIPMENTS = 'cancel_shipments',

  // Accounting/Financials
  VIEW_FINANCIALS = 'view_financials',
  MANAGE_FINANCIALS = 'manage_financials',
  EXPORT_FINANCIALS = 'export_financials',
  MANAGE_TRANSACTIONS = 'manage_transactions',

  // Admin Full Access
  ADMIN_FULL_ACCESS = 'admin_full_access',
}

/**
 * Permission Groups - Logical grouping of permissions
 */
export const PERMISSION_GROUPS = {
  ORDERS: [
    Permission.VIEW_ORDERS,
    Permission.CREATE_ORDERS,
    Permission.EDIT_ORDERS,
    Permission.DELETE_ORDERS,
    Permission.ASSIGN_ORDERS,
  ],
  PICKING: [
    Permission.VIEW_PICK_TASKS,
    Permission.CLAIM_PICK_TASK,
    Permission.COMPLETE_PICK_TASK,
    Permission.SKIP_PICK_TASK,
  ],
  PACKING: [Permission.VIEW_PACK_TASKS, Permission.CLAIM_PACK_TASK, Permission.COMPLETE_PACK_TASK],
  INVENTORY: [
    Permission.VIEW_INVENTORY,
    Permission.ADJUST_INVENTORY,
    Permission.VIEW_STOCK_MOVEMENTS,
  ],
  STOCK_CONTROL: [
    Permission.PERFORM_CYCLE_COUNTS,
    Permission.APPROVE_CYCLE_COUNTS,
    Permission.MANAGE_LOCATIONS,
    Permission.VIEW_LOCATION_CAPACITY,
  ],
  INWARDS: [Permission.PROCESS_RECEIPTS, Permission.MANAGE_PUTAWAYS],
  REPORTS: [Permission.VIEW_REPORTS, Permission.GENERATE_REPORTS, Permission.EXPORT_DATA],
  USERS: [
    Permission.VIEW_USERS,
    Permission.CREATE_USERS,
    Permission.EDIT_USERS,
    Permission.DELETE_USERS,
    Permission.MANAGE_USER_ROLES,
    Permission.MANAGE_CUSTOM_ROLES,
  ],
  EXCEPTIONS: [
    Permission.VIEW_EXCEPTIONS,
    Permission.RESOLVE_EXCEPTIONS,
    Permission.APPROVE_EXCEPTION_RESOLUTIONS,
  ],
  SETTINGS: [
    Permission.VIEW_SETTINGS,
    Permission.MANAGE_INTEGRATIONS,
    Permission.MANAGE_BUSINESS_RULES,
  ],
  QUALITY_CONTROL: [Permission.PERFORM_QC_CHECKS, Permission.APPROVE_QC_RESULTS],
  PRODUCTION: [Permission.VIEW_PRODUCTION_TASKS, Permission.MANAGE_PRODUCTION],
  SALES: [Permission.VIEW_SALES_ORDERS, Permission.MANAGE_SALES],
  MAINTENANCE: [Permission.VIEW_MAINTENANCE_TASKS, Permission.MANAGE_MAINTENANCE],
  RMA: [Permission.VIEW_RMA_REQUESTS, Permission.PROCESS_RMA],
  DISPATCH: [Permission.VIEW_SHIPMENTS, Permission.CREATE_SHIPMENTS, Permission.CANCEL_SHIPMENTS],
  ACCOUNTING: [
    Permission.VIEW_FINANCIALS,
    Permission.MANAGE_FINANCIALS,
    Permission.EXPORT_FINANCIALS,
    Permission.MANAGE_TRANSACTIONS,
  ],
} as const;

/**
 * Default permissions for each predefined role
 */
export const DEFAULT_ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  [UserRole.PICKER]: [
    Permission.VIEW_ORDERS,
    Permission.VIEW_PICK_TASKS,
    Permission.CLAIM_PICK_TASK,
    Permission.COMPLETE_PICK_TASK,
    Permission.SKIP_PICK_TASK,
    Permission.VIEW_INVENTORY,
  ],
  [UserRole.PACKER]: [
    Permission.VIEW_ORDERS,
    Permission.VIEW_PACK_TASKS,
    Permission.CLAIM_PACK_TASK,
    Permission.COMPLETE_PACK_TASK,
    Permission.VIEW_INVENTORY,
  ],
  [UserRole.STOCK_CONTROLLER]: [
    Permission.VIEW_INVENTORY,
    Permission.ADJUST_INVENTORY,
    Permission.VIEW_STOCK_MOVEMENTS,
    Permission.PERFORM_CYCLE_COUNTS,
    Permission.APPROVE_CYCLE_COUNTS,
    Permission.MANAGE_LOCATIONS,
    Permission.VIEW_LOCATION_CAPACITY,
  ],
  [UserRole.INWARDS]: [
    Permission.VIEW_INVENTORY,
    Permission.PROCESS_RECEIPTS,
    Permission.MANAGE_PUTAWAYS,
    Permission.VIEW_STOCK_MOVEMENTS,
  ],
  [UserRole.SUPERVISOR]: [
    Permission.VIEW_ORDERS,
    Permission.ASSIGN_ORDERS,
    Permission.VIEW_PICK_TASKS,
    Permission.VIEW_PACK_TASKS,
    Permission.VIEW_INVENTORY,
    Permission.VIEW_EXCEPTIONS,
    Permission.RESOLVE_EXCEPTIONS,
    Permission.APPROVE_EXCEPTION_RESOLUTIONS,
    Permission.VIEW_REPORTS,
    Permission.PERFORM_CYCLE_COUNTS,
    Permission.APPROVE_CYCLE_COUNTS,
  ],
  [UserRole.ADMIN]: [
    // Order Management
    Permission.VIEW_ORDERS,
    Permission.CREATE_ORDERS,
    Permission.EDIT_ORDERS,
    Permission.DELETE_ORDERS,
    Permission.ASSIGN_ORDERS,
    // Picking Operations
    Permission.VIEW_PICK_TASKS,
    Permission.CLAIM_PICK_TASK,
    Permission.COMPLETE_PICK_TASK,
    Permission.SKIP_PICK_TASK,
    // Packing Operations
    Permission.VIEW_PACK_TASKS,
    Permission.CLAIM_PACK_TASK,
    Permission.COMPLETE_PACK_TASK,
    // Inventory Management
    Permission.VIEW_INVENTORY,
    Permission.ADJUST_INVENTORY,
    Permission.VIEW_STOCK_MOVEMENTS,
    // Stock Control
    Permission.PERFORM_CYCLE_COUNTS,
    Permission.APPROVE_CYCLE_COUNTS,
    Permission.MANAGE_LOCATIONS,
    Permission.VIEW_LOCATION_CAPACITY,
    // Inwards/Receiving
    Permission.PROCESS_RECEIPTS,
    Permission.MANAGE_PUTAWAYS,
    // Reporting & Analytics
    Permission.VIEW_REPORTS,
    Permission.GENERATE_REPORTS,
    Permission.EXPORT_DATA,
    // User Management
    Permission.VIEW_USERS,
    Permission.CREATE_USERS,
    Permission.EDIT_USERS,
    Permission.DELETE_USERS,
    Permission.MANAGE_USER_ROLES,
    Permission.MANAGE_CUSTOM_ROLES,
    // Exceptions Management
    Permission.VIEW_EXCEPTIONS,
    Permission.RESOLVE_EXCEPTIONS,
    Permission.APPROVE_EXCEPTION_RESOLUTIONS,
    // Business Rules
    Permission.VIEW_BUSINESS_RULES,
    Permission.MANAGE_BUSINESS_RULES,
    // Settings & Configuration
    Permission.VIEW_SETTINGS,
    Permission.MANAGE_INTEGRATIONS,
    // Quality Control
    Permission.PERFORM_QC_CHECKS,
    Permission.APPROVE_QC_RESULTS,
    // Production
    Permission.VIEW_PRODUCTION_TASKS,
    Permission.MANAGE_PRODUCTION,
    // Sales
    Permission.VIEW_SALES_ORDERS,
    Permission.MANAGE_SALES,
    // Maintenance
    Permission.VIEW_MAINTENANCE_TASKS,
    Permission.MANAGE_MAINTENANCE,
    // RMA (Returns)
    Permission.VIEW_RMA_REQUESTS,
    Permission.PROCESS_RMA,
    // Admin Full Access
    Permission.ADMIN_FULL_ACCESS,
  ],
  [UserRole.PRODUCTION]: [
    Permission.VIEW_PRODUCTION_TASKS,
    Permission.MANAGE_PRODUCTION,
    Permission.VIEW_INVENTORY,
  ],
  [UserRole.SALES]: [
    Permission.VIEW_SALES_ORDERS,
    Permission.MANAGE_SALES,
    Permission.VIEW_ORDERS,
    Permission.VIEW_REPORTS,
  ],
  [UserRole.MAINTENANCE]: [Permission.VIEW_MAINTENANCE_TASKS, Permission.MANAGE_MAINTENANCE],
  [UserRole.RMA]: [
    Permission.VIEW_RMA_REQUESTS,
    Permission.PROCESS_RMA,
    Permission.VIEW_ORDERS,
    Permission.VIEW_INVENTORY,
  ],
  [UserRole.DISPATCH]: [
    Permission.VIEW_SHIPMENTS,
    Permission.CREATE_SHIPMENTS,
    Permission.CANCEL_SHIPMENTS,
    Permission.VIEW_ORDERS,
    Permission.VIEW_PACK_TASKS,
    Permission.VIEW_INVENTORY,
  ],
  [UserRole.ACCOUNTING]: [
    Permission.VIEW_FINANCIALS,
    Permission.MANAGE_FINANCIALS,
    Permission.EXPORT_FINANCIALS,
    Permission.MANAGE_TRANSACTIONS,
    Permission.VIEW_REPORTS,
    Permission.VIEW_INVENTORY,
  ],
};

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

/**
 * Order Exception Types
 * Categories of issues that can occur during order fulfillment
 */
export enum ExceptionType {
  UNCLAIM = 'UNCLAIM', // Picker/packer unclaimed the order
  UNDO_PICK = 'UNDO_PICK', // Picker undid a pick (reduced picked quantity)
  SHORT_PICK = 'SHORT_PICK', // Less quantity picked than ordered
  SHORT_PICK_BACKORDER = 'SHORT_PICK_BACKORDER', // Short pick that triggers backorder
  DAMAGE = 'DAMAGE', // Item damaged during picking/handling
  DEFECTIVE = 'DEFECTIVE', // Item found defective (quality issue)
  WRONG_ITEM = 'WRONG_ITEM', // Wrong item picked
  SUBSTITUTION = 'SUBSTITUTION', // Item substituted with alternative
  OUT_OF_STOCK = 'OUT_OF_STOCK', // Item unavailable in inventory
  BIN_MISMATCH = 'BIN_MISMATCH', // Item not in expected bin location
  BARCODE_MISMATCH = 'BARCODE_MISMATCH', // Scanned barcode doesn't match expected
  EXPIRED = 'EXPIRED', // Item past expiration date
  OTHER = 'OTHER', // Other exception
}

/**
 * Order Exception Status
 * Lifecycle states for exception handling
 */
export enum ExceptionStatus {
  OPEN = 'OPEN', // Exception logged, awaiting resolution
  REVIEWING = 'REVIEWING', // Under review by supervisor
  APPROVED = 'APPROVED', // Resolution approved
  REJECTED = 'REJECTED', // Resolution rejected
  RESOLVED = 'RESOLVED', // Exception resolved and closed
  CANCELLED = 'CANCELLED', // Order cancelled due to exception
}

/**
 * Exception Resolution Actions
 * Standard actions for resolving exceptions
 */
export enum ExceptionResolution {
  BACKORDER = 'BACKORDER', // Place item on backorder
  SUBSTITUTE = 'SUBSTITUTE', // Substitute with alternative SKU
  CANCEL_ITEM = 'CANCEL_ITEM', // Cancel line item
  CANCEL_ORDER = 'CANCEL_ORDER', // Cancel entire order
  ADJUST_QUANTITY = 'ADJUST_QUANTITY', // Adjust ordered quantity
  RETURN_TO_STOCK = 'RETURN_TO_STOCK', // Return damaged item to stock
  WRITE_OFF = 'WRITE_OFF', // Write off damaged/lost item
  TRANSFER_BIN = 'TRANSFER_BIN', // Transfer from different bin location
  CONTACT_CUSTOMER = 'CONTACT_CUSTOMER', // Await customer decision
  MANUAL_OVERRIDE = 'MANUAL_OVERRIDE', // Manual supervisor override
}

// ============================================================================
// DOMAIN ENTITIES
// ============================================================================

/**
 * Order - Container for items a customer has purchased
 *
 * State transitions:
 * PENDING → PICKING → PICKED → PACKING → PACKED → SHIPPED
 *      ↓         ↓
 *  CANCELLED CANCELLED
 */
export interface Order {
  orderId: string;
  customerId: string;
  customerName: string;
  priority: OrderPriority;
  status: OrderStatus;
  createdAt: Date;
  updatedAt: Date;
  claimedAt?: Date;
  pickedAt?: Date;
  packedAt?: Date;
  shippedAt?: Date;
  cancelledAt?: Date;
  items?: OrderItem[]; // Optional for queue responses
  pickerId?: string;
  packerId?: string;
  progress: number; // 0-100, calculated server-side
  // Pricing fields
  subtotal?: number; // Sum of all line item totals
  taxAmount?: number; // Total tax for the order
  shippingCost?: number; // Shipping cost
  discountAmount?: number; // Total discount applied
  totalAmount?: number; // Final total (subtotal + tax + shipping - discount)
  currency?: string; // Currency code for the order
}

/**
 * OrderItem - Line item representing quantity of SKU to fulfill
 *
 * Note: When order is in PICKING status, items are pick tasks and use TaskStatus enum.
 * Otherwise, they use OrderItemStatus enum.
 */
export interface OrderItem {
  orderItemId: string;
  orderId: string;
  sku: string;
  name: string;
  quantity: number;
  pickedQuantity: number;
  verifiedQuantity?: number; // For packing stage - quantity verified by packer
  binLocation: string;
  status: OrderItemStatus | TaskStatus; // Can be either enum depending on order state
  barcode?: string; // EAN/UPC barcode from SKU
  skipReason?: string; // Reason for skipping (only present when status is SKIPPED)
  unitPrice?: number; // Price per unit at time of order
  lineTotal?: number; // Total for this line item (quantity * unitPrice)
  currency?: string; // Currency code for this line item
}

/**
 * SKU/Product - Master catalog of sellable items
 */
export interface SKU {
  sku: string;
  name: string;
  description: string;
  image?: string;
  category: string;
  barcode?: string; // EAN/UPC barcode
  binLocations: string[];
  unitPrice?: number; // Selling price per unit
  unitCost?: number; // Cost price for inventory valuation
  currency?: string; // Currency code (e.g., USD, EUR, NZD)
  createdAt: Date;
  updatedAt: Date;
  active: boolean;
}

/**
 * InventoryUnit - Physical stock tracking at a specific bin location
 */
export interface InventoryUnit {
  unitId: string;
  sku: string;
  binLocation: string;
  quantity: number;
  reserved: number;
  available: number; // quantity - reserved
  lastUpdated: Date;
  // Lot tracking fields
  lotNumber?: string;
  expirationDate?: Date;
  serialNumbers?: string[];
}

/**
 * Location (Bin) - Physical warehouse position
 */
export interface BinLocation {
  binId: string;
  zone: string;
  aisle: string;
  shelf: string;
  type: BinType;
  active: boolean;
}

// ============================================================================
// BIN LOCATION MANAGEMENT DTOs
// ============================================================================

/**
 * Create Bin Location DTO
 */
export interface CreateBinLocationDTO {
  binId: string;
  zone: string;
  aisle: string;
  shelf: string;
  type: BinType;
}

/**
 * Update Bin Location DTO
 */
export interface UpdateBinLocationDTO {
  zone?: string;
  aisle?: string;
  shelf?: string;
  type?: BinType;
  active?: boolean;
}

/**
 * PickTask - Atomic unit of work for a picker
 */
export interface PickTask {
  pickTaskId: string;
  orderId: string;
  orderItemId: string;
  sku: string;
  name: string;
  targetBin: string;
  quantity: number;
  pickedQuantity: number;
  status: TaskStatus;
  pickerId?: string;
  startedAt?: Date;
  completedAt?: Date;
  skippedAt?: Date;
  skipReason?: string;
}

/**
 * User - System actors
 */
export interface User {
  userId: string;
  name: string;
  email: string;
  role: UserRole;
  active: boolean;
  activeRole?: UserRole | null; // Active role for multi-role users (e.g., admin acting as picker)
  additionalRoles?: UserRole[]; // Additional roles granted to this user (e.g., picker can also pack)
  currentTaskId?: string;
  createdAt: Date;
  lastLoginAt?: Date;
  deletedAt?: Date | null; // Timestamp when user was marked for deletion (soft delete)
}

/**
 * CustomRole - Custom user-defined roles with specific permissions
 */
export interface CustomRole {
  roleId: string;
  name: string;
  description: string;
  permissions: Permission[];
  isSystem: boolean; // System roles are the predefined ones (PICKER, PACKER, etc.)
  createdAt: Date;
  updatedAt: Date;
}

/**
 * RolePermission - Junction table for role-permission mapping
 */
export interface RolePermission {
  rolePermissionId: string;
  roleId: string; // References either CustomRole or maps to UserRole enum
  permission: Permission;
  grantedAt: Date;
  grantedBy: string; // User ID who granted this permission
}

/**
 * InventoryTransaction - Audit trail for all inventory changes
 */
export interface InventoryTransaction {
  transactionId: string;
  type: TransactionType;
  sku: string;
  quantity: number; // positive for addition, negative for deduction
  orderId?: string;
  userId: string;
  timestamp: Date;
  reason: string;
  binLocation?: string;
}

/**
 * OrderStateChange - Audit trail for order status transitions
 */
export interface OrderStateChange {
  changeId: string;
  orderId: string;
  fromStatus: OrderStatus;
  toStatus: OrderStatus;
  userId: string;
  timestamp: Date;
}

/**
 * OrderException - Exception logged during order fulfillment
 */
export interface OrderException {
  exceptionId: string;
  orderId: string;
  orderItemId: string;
  sku: string;
  type: ExceptionType;
  status: ExceptionStatus;
  resolution?: ExceptionResolution;
  quantityExpected: number;
  quantityActual: number;
  quantityShort: number;
  reason: string;
  reportedBy: string;
  reportedAt: Date;
  reviewedBy?: string;
  reviewedAt?: Date;
  resolvedBy?: string;
  resolvedAt?: Date;
  resolutionNotes?: string;
  substituteSku?: string; // For substitutions
}

// ============================================================================
// DTOs (Data Transfer Objects)
// ============================================================================

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  user: User;
}

export interface CreateOrderDTO {
  customerId: string;
  customerName: string;
  priority: OrderPriority;
  items: Array<{
    sku: string;
    quantity: number;
  }>;
}

export interface ClaimOrderDTO {
  pickerId: string;
}

export interface PickItemDTO {
  sku: string;
  quantity: number;
  binLocation: string;
  pickTaskId: string;
}

export interface CompleteOrderDTO {
  orderId: string;
  pickerId: string;
}

export interface CancelOrderDTO {
  orderId: string;
  userId: string;
  reason: string;
}

/**
 * Log Exception DTO - Report an exception during picking
 */
export interface LogExceptionDTO {
  orderId: string;
  orderItemId: string;
  sku: string;
  type: ExceptionType;
  quantityExpected: number;
  quantityActual: number;
  reason: string;
  reportedBy: string;
  substituteSku?: string; // For substitution exceptions
}

/**
 * Resolve Exception DTO - Supervisor action to resolve an exception
 */
export interface ResolveExceptionDTO {
  exceptionId: string;
  resolution: ExceptionResolution;
  notes?: string;
  resolvedBy: string;
  // For substitutions
  substituteSku?: string;
  // For quantity adjustments
  newQuantity?: number;
  // For bin transfers
  newBinLocation?: string;
}

// ============================================================================
// API RESPONSES
// ============================================================================

export interface OrderQueueResponse {
  orders: Order[];
  total: number;
  page: number;
  limit: number;
}

export interface OrderDetailResponse {
  order: Order;
  pickTasks: PickTask[];
}

export interface PickActionResponse {
  success: boolean;
  order: Order;
  pickTask: PickTask;
  message?: string;
}

export interface DashboardMetricsResponse {
  activePickers: number;
  ordersPickedPerHour: number;
  queueDepth: number;
  exceptions: number;
  throughput: {
    today: number;
    week: number;
    month: number;
  };
}

export interface PickerActivity {
  pickerId: string;
  pickerName: string;
  currentOrderId: string | null;
  orderProgress: number;
  currentTask: string | null;
  lastViewedAt: Date | null;
  status: 'ACTIVE' | 'IDLE' | 'PICKING' | 'INACTIVE';
}

export interface PackerActivity {
  packerId: string;
  packerName: string;
  currentOrderId: string | null;
  orderProgress: number;
  currentTask: string | null;
  lastViewedAt: Date | null;
  status: 'ACTIVE' | 'IDLE' | 'PACKING' | 'INACTIVE';
  currentView: string | null;
}

export interface StockControllerActivity {
  controllerId: string;
  controllerName: string;
  lastViewedAt: Date | null;
  status: 'ACTIVE' | 'IDLE' | 'INACTIVE';
  currentView: string | null;
}

// ============================================================================
// ERROR TYPES
// ============================================================================

export class WMSError extends Error {
  constructor(
    public code: string,
    public statusCode: number,
    message: string,
    public details?: unknown
  ) {
    super(message);
    this.name = 'WMSError';
  }
}

export class InventoryError extends WMSError {
  constructor(message: string, details?: unknown) {
    super('INVENTORY_ERROR', 409, message, details);
  }
}

export class ValidationError extends WMSError {
  constructor(message: string, details?: unknown) {
    super('VALIDATION_ERROR', 400, message, details);
  }
}

export class NotFoundError extends WMSError {
  constructor(resource: string, id?: string) {
    super('NOT_FOUND', 404, `${resource}${id !== undefined ? ` (${id})` : ''} not found`);
  }
}

export class ConflictError extends WMSError {
  constructor(message: string, details?: unknown) {
    super('CONFLICT', 409, message, details);
  }
}

export class UnauthorizedError extends WMSError {
  constructor(message: string = 'Unauthorized') {
    super('UNAUTHORIZED', 401, message);
  }
}

export class ForbiddenError extends WMSError {
  constructor(message: string = 'Forbidden') {
    super('FORBIDDEN', 403, message);
  }
}

// ============================================================================
// ROLE ASSIGNMENT TYPES
// ============================================================================

/**
 * Role Assignment - Represents an additional role granted to a user
 */
export interface RoleAssignment {
  assignmentId: string;
  userId: string;
  role: UserRole;
  grantedBy: string;
  grantedAt: Date;
  active: boolean;
}

/**
 * Grant Role DTO - Request to grant a role to a user
 */
export interface GrantRoleDTO {
  userId: string;
  role: UserRole;
}

/**
 * Revoke Role DTO - Request to revoke a role from a user
 */
export interface RevokeRoleDTO {
  userId: string;
  role: UserRole;
}

// ============================================================================
// INBOUND RECEIVING TYPES
// ============================================================================

/**
 * ASN Status - Advance Shipping Notice lifecycle
 */
export enum ASNStatus {
  PENDING = 'PENDING',
  IN_TRANSIT = 'IN_TRANSIT',
  RECEIVED = 'RECEIVED',
  PARTIALLY_RECEIVED = 'PARTIALLY_RECEIVED',
  CANCELLED = 'CANCELLED',
}

/**
 * Receipt Type - Type of receipt
 */
export enum ReceiptType {
  PO = 'PO', // Purchase Order
  RETURN = 'RETURN', // Customer Return
  TRANSFER = 'TRANSFER', // Warehouse Transfer
  ADJUSTMENT = 'ADJUSTMENT', // Inventory Adjustment
}

/**
 * Receipt Status - Receipt lifecycle
 */
export enum ReceiptStatus {
  RECEIVING = 'RECEIVING',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

/**
 * Quality Status - Quality check status for received items
 */
export enum QualityStatus {
  PENDING = 'PENDING',
  PASSED = 'PASSED',
  FAILED = 'FAILED',
  PARTIAL = 'PARTIAL',
}

/**
 * Putaway Status - Putaway task lifecycle
 */
export enum PutawayStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

/**
 * ASN Line Status - Receiving status for ASN line items
 */
export enum ASNLineStatus {
  PENDING = 'PENDING',
  PARTIALLY_RECEIVED = 'PARTIALLY_RECEIVED',
  FULLY_RECEIVED = 'FULLY_RECEIVED',
  CANCELLED = 'CANCELLED',
}

/**
 * Advance Shipping Notice (ASN)
 * Expected inbound shipment from supplier
 */
export interface AdvanceShippingNotice {
  asnId: string;
  supplierId: string;
  purchaseOrderNumber: string;
  status: ASNStatus;
  expectedArrivalDate: Date;
  actualArrivalDate?: Date;
  carrier?: string;
  trackingNumber?: string;
  shipmentNotes?: string;
  createdAt: Date;
  updatedAt: Date;
  receivedAt?: Date;
  createdBy: string;
  lineItems?: ASNLineItem[];
}

/**
 * ASN Line Item
 * Individual item expected in an ASN
 */
export interface ASNLineItem {
  lineItemId: string;
  asnId: string;
  sku: string;
  expectedQuantity: number;
  receivedQuantity: number;
  unitCost: number;
  lotNumber?: string;
  expirationDate?: Date;
  receivingStatus: ASNLineStatus;
  lineNotes?: string;
}

/**
 * Receipt
 * Record of goods received from shipment
 */
export interface Receipt {
  receiptId: string;
  asnId?: string;
  receiptDate: Date;
  receiptType: ReceiptType;
  status: ReceiptStatus;
  createdAt: Date;
  completedAt?: Date;
  receivedBy: string;
  lineItems?: ReceiptLineItem[];
}

/**
 * Receipt Line Item
 * Individual item received in a receipt
 */
export interface ReceiptLineItem {
  receiptLineId: string;
  receiptId: string;
  asnLineItemId?: string;
  sku: string;
  quantityOrdered: number;
  quantityReceived: number;
  quantityDamaged: number;
  qualityStatus: QualityStatus;
  putawayStatus: PutawayStatus;
  unitCost?: number;
  totalCost: number;
  lotNumber?: string;
  expirationDate?: Date;
  notes?: string;
}

/**
 * Putaway Task
 * Task to move received goods to storage location
 */
export interface PutawayTask {
  putawayTaskId: string;
  receiptLineId: string;
  sku: string;
  quantityToPutaway: number;
  quantityPutaway: number;
  targetBinLocation: string;
  status: PutawayStatus;
  assignedTo?: string;
  assignedAt?: Date;
  completedAt?: Date;
  completedBy?: string;
  priority: OrderPriority;
  createdAt: Date;
  updatedAt: Date;
  notes?: string;
}

// ============================================================================
// INBOUND RECEIVING DTOs
// ============================================================================

/**
 * Create ASN DTO
 */
export interface CreateASNDTO {
  supplierId: string;
  purchaseOrderNumber: string;
  expectedArrivalDate: Date;
  carrier?: string;
  trackingNumber?: string;
  shipmentNotes?: string;
  createdBy: string;
  lineItems: Array<{
    sku: string;
    expectedQuantity: number;
    unitCost: number;
    lotNumber?: string;
    expirationDate?: Date;
    lineNotes?: string;
  }>;
}

/**
 * Create Receipt DTO
 */
export interface CreateReceiptDTO {
  asnId?: string;
  receiptType: ReceiptType;
  receivedBy: string;
  lineItems: Array<{
    asnLineItemId?: string;
    sku: string;
    quantityOrdered: number;
    quantityReceived: number;
    quantityDamaged: number;
    unitCost?: number;
    lotNumber?: string;
    expirationDate?: Date;
    notes?: string;
  }>;
}

/**
 * Create Putaway Task DTO
 */
export interface CreatePutawayTaskDTO {
  receiptLineId: string;
  quantityToPutaway: number;
  targetBinLocation: string;
  priority: OrderPriority;
  notes?: string;
}

/**
 * Update Putaway Task DTO
 */
export interface UpdatePutawayTaskDTO {
  putawayTaskId: string;
  quantityPutaway: number;
  userId: string;
  status?: PutawayStatus;
}

// ============================================================================
// LICENSE PLATING TYPES
// ============================================================================

/**
 * License Plate Status
 */
export enum LicensePlateStatus {
  OPEN = 'OPEN',
  SEALED = 'SEALED',
  IN_QC = 'IN_QC',
  QC_PASSED = 'QC_PASSED',
  QC_FAILED = 'QC_FAILED',
  IN_STAGING = 'IN_STAGING',
  PUTAWAY_PARTIAL = 'PUTAWAY_PARTIAL',
  PUTAWAY_COMPLETE = 'PUTAWAY_COMPLETE',
  CLOSED = 'CLOSED',
}

/**
 * License Plate - Container for grouping received items
 * Used to track items through the receiving process
 */
export interface LicensePlate {
  licensePlateId: string;
  receiptId: string;
  receiptLineId: string;
  barcode: string; // Scannable barcode on the license plate
  status: LicensePlateStatus;
  sku: string;
  quantity: number;
  quantityPutaway: number;
  lotNumber?: string;
  expirationDate?: Date;
  serialNumbers?: string[]; // For serialized items
  stagingLocation?: string;
  sealedAt?: Date;
  sealedBy?: string;
  qcCompletedAt?: Date;
  qcCompletedBy?: string;
  movedToStagingAt?: Date;
  movedToStagingBy?: string;
  putawayCompletedAt?: Date;
  closedAt?: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// STAGING LOCATION TYPES
// ============================================================================

/**
 * Staging Location Status
 */
export enum StagingLocationStatus {
  AVAILABLE = 'AVAILABLE',
  OCCUPIED = 'OCCUPIED',
  RESERVED = 'RESERVED',
  BLOCKED = 'BLOCKED',
}

/**
 * Staging Location - Temporary holding area for received goods
 */
export interface StagingLocation {
  stagingLocationId: string;
  locationCode: string; // e.g., "STAGE-A01", "STAGE-B12"
  zone: string; // e.g., "RECEIVING", "QC", "PUTAWAY"
  locationType: 'FLOOR' | 'RACK' | 'CART' | 'CONVEYOR';
  status: StagingLocationStatus;
  currentOccupancy: number; // Number of license plates currently occupying
  capacity: number; // Maximum number of license plates
  assignedTo?: string; // User or team this area is assigned to
  lastUpdated: Date;
}

/**
 * Staging Location Assignment - Links license plates to staging locations
 */
export interface StagingLocationAssignment {
  assignmentId: string;
  stagingLocationId: string;
  licensePlateId: string;
  assignedAt: Date;
  assignedBy: string;
  releasedAt?: Date;
  releasedBy?: string;
  notes?: string;
}

// ============================================================================
// RECEIVING EXCEPTION TYPES
// ============================================================================

/**
 * Receiving Exception Type - Categories of receiving discrepancies
 */
export enum ReceivingExceptionType {
  SHORT_RECEIPT = 'SHORT_RECEIPT', // Received less than ordered
  OVER_RECEIPT = 'OVER_RECEIPT', // Received more than ordered
  DAMAGED = 'DAMAGED', // Items damaged on arrival
  DEFECTIVE = 'DEFECTIVE', // Quality defects
  WRONG_ITEM = 'WRONG_ITEM', // Wrong SKU received
  NO_ASN = 'NO_ASN', // Shipment arrived without ASN
  LABEL_MISMATCH = 'LABEL_MISMATCH', // Label doesn't match expected
  EXPIRED = 'EXPIRED', // Items past expiration
  NEAR_EXPIRY = 'NEAR_EXPIRY', // Items approaching expiration
  MISSING_SERIAL = 'MISSING_SERIAL', // Expected serial numbers missing
  DUPLICATE_SERIAL = 'DUPLICATE_SERIAL', // Duplicate serial numbers
  WRONG_LOT = 'WRONG_LOT', // Wrong lot number received
  OTHER = 'OTHER',
}

/**
 * Receiving Exception Status
 */
export enum ReceivingExceptionStatus {
  OPEN = 'OPEN',
  INVESTIGATING = 'INVESTIGATING',
  AWAITING_DECISION = 'AWAITING_DECISION',
  RESOLVED = 'RESOLVED',
  CANCELLED = 'CANCELLED',
}

/**
 * Receiving Exception Resolution
 */
export enum ReceivingExceptionResolution {
  ACCEPT_QUANTITY = 'ACCEPT_QUANTITY', // Accept actual received quantity
  RETURN_TO_VENDOR = 'RETURN_TO_VENDOR',
  WRITE_OFF = 'WRITE_OFF',
  REQUEST_CREDIT = 'REQUEST_CREDIT',
  KEEP_AT_DISCOUNT = 'KEEP_AT_DISCOUNT',
  QUARANTINE = 'QUARANTINE',
  REJECT_SHIPMENT = 'REJECT_SHIPMENT',
  ADJUST_PO = 'ADJUST_PO',
}

/**
 * Receiving Exception - Discrepancy during receiving
 */
export interface ReceivingException {
  exceptionId: string;
  receiptId: string;
  receiptLineId: string;
  asnId?: string;
  exceptionType: ReceivingExceptionType;
  status: ReceivingExceptionStatus;
  resolution?: ReceivingExceptionResolution;
  sku: string;
  expectedQuantity: number;
  actualQuantity: number;
  variance: number;
  lotNumber?: string;
  expirationDate?: Date;
  description: string;
  reportedBy: string;
  reportedAt: Date;
  investigatedBy?: string;
  investigatedAt?: Date;
  resolvedBy?: string;
  resolvedAt?: Date;
  resolutionNotes?: string;
  images?: string[]; // URLs to photos of damaged goods, etc.
  vendorNotified: boolean;
  vendorNotifiedAt?: Date;
  creditRequested: number; // Credit amount requested
  creditApproved: number; // Credit amount approved
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// ENHANCED RECEIPT DTOs WITH NEW FIELDS
// ============================================================================

/**
 * Enhanced Create Receipt DTO with license plate and exception support
 */
export interface CreateReceiptEnhancedDTO {
  asnId?: string;
  receiptType: ReceiptType;
  receivedBy: string;
  lineItems: Array<{
    asnLineItemId?: string;
    sku: string;
    quantityOrdered: number;
    quantityReceived: number;
    quantityDamaged: number;
    unitCost?: number;
    lotNumber?: string;
    expirationDate?: Date;
    serialNumbers?: string[]; // Captured serial numbers
    notes?: string;
    exceptions?: Array<{
      exceptionType: ReceivingExceptionType;
      description: string;
      actualQuantity: number;
    }>;
  }>;
  createLicensePlates?: boolean; // Auto-create license plates
}

/**
 * Create License Plate DTO
 */
export interface CreateLicensePlateDTO {
  receiptId: string;
  receiptLineId: string;
  barcode: string;
  sku: string;
  quantity: number;
  lotNumber?: string;
  expirationDate?: Date;
  serialNumbers?: string[];
  stagingLocation?: string;
  sealedBy: string;
  notes?: string;
}

/**
 * Assign to Staging DTO
 */
export interface AssignToStagingDTO {
  licensePlateId: string;
  stagingLocationId: string;
  assignedBy: string;
  notes?: string;
}

/**
 * Receiving Exception DTO
 */
export interface CreateReceivingExceptionDTO {
  receiptId: string;
  receiptLineId: string;
  asnId?: string;
  exceptionType: ReceivingExceptionType;
  sku: string;
  expectedQuantity: number;
  actualQuantity: number;
  lotNumber?: string;
  expirationDate?: Date;
  description: string;
  reportedBy: string;
  images?: string[];
}

/**
 * Resolve Receiving Exception DTO
 */
export interface ResolveReceivingExceptionDTO {
  exceptionId: string;
  resolution: ReceivingExceptionResolution;
  resolutionNotes?: string;
  resolvedBy: string;
  creditAmount?: number;
}

// ============================================================================
// SHIPPING TYPES
// ============================================================================

/**
 * Shipment Status - Lifecycle states for shipments
 */
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

/**
 * Label Format - Format types for shipping labels
 */
export enum LabelFormat {
  PDF = 'PDF',
  PNG = 'PNG',
  ZPLII = 'ZPLII',
  EPL2 = 'EPL2',
}

/**
 * Address interface for shipping
 */
export interface Address {
  name: string;
  company?: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  phone?: string;
  email?: string;
}

/**
 * Package dimensions
 */
export interface PackageDimensions {
  length: number;
  width: number;
  height: number;
  unit: 'IN' | 'CM';
}

/**
 * Carrier - Shipping carrier company
 */
export interface Carrier {
  carrierId: string;
  name: string;
  carrierCode: string;
  serviceTypes: string[];
  contactEmail?: string;
  contactPhone?: string;
  apiEndpoint?: string;
  isActive: boolean;
  requiresAccountNumber: boolean;
  requiresPackageDimensions: boolean;
  requiresWeight: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Shipment - A shipment for an order
 */
export interface Shipment {
  shipmentId: string;
  orderId: string;
  carrierId?: string;
  serviceType: string;
  shippingMethod: string;
  trackingNumber?: string;
  trackingUrl?: string;
  shipFromAddress: Address;
  shipToAddress: Address;
  totalWeight: number; // in pounds
  totalPackages: number;
  dimensions?: PackageDimensions;
  shippingCost?: number;
  insuranceCost?: number;
  totalCost: number;
  status: ShipmentStatus;
  shipDate?: Date;
  estimatedDeliveryDate?: Date;
  actualDeliveryDate?: Date;
  carrierShipmentId?: string;
  carrierResponse?: unknown;
  createdAt: Date;
  updatedAt: Date;
  shippedAt?: Date;
  deliveredAt?: Date;
  createdBy: string;
  shippedBy?: string;
  labels?: ShippingLabel[];
}

/**
 * Shipping Label - Individual label for packages in a shipment
 */
export interface ShippingLabel {
  labelId: string;
  shipmentId: string;
  labelFormat: LabelFormat;
  labelUrl?: string;
  labelData?: string; // Base64 encoded
  packageNumber: number;
  packageWeight: number;
  packageDimensions?: PackageDimensions;
  carrierTrackingNumber?: string;
  createdAt: Date;
  printedAt?: Date;
  createdBy: string;
}

/**
 * Shipment Tracking Event - Tracking update from carrier
 */
export interface ShipmentTrackingEvent {
  eventId: string;
  shipmentId: string;
  eventCode: string;
  eventDescription: string;
  eventLocation?: string;
  eventDate: Date;
  eventSource: string;
  rawEventData?: unknown;
}

// ============================================================================
// SHIPPING DTOs
// ============================================================================

/**
 * Create Shipment DTO
 */
export interface CreateShipmentDTO {
  orderId: string;
  carrierId: string;
  serviceType: string;
  shippingMethod: string;
  shipFromAddress: Address;
  shipToAddress: Address;
  totalWeight: number;
  totalPackages: number;
  dimensions?: PackageDimensions;
  insuranceValue?: number;
  shipDate?: Date;
  createdBy: string;
}

/**
 * Create Shipping Label DTO
 */
export interface CreateShippingLabelDTO {
  shipmentId: string;
  packageNumber: number;
  packageWeight: number;
  packageDimensions?: PackageDimensions;
  createdBy: string;
}

/**
 * Add Tracking Event DTO
 */
export interface AddTrackingEventDTO {
  shipmentId: string;
  eventCode: string;
  eventDescription: string;
  eventLocation?: string;
  eventDate: Date;
  eventSource: string;
  rawEventData?: unknown;
}

// ============================================================================
// CYCLE COUNTING TYPES
// ============================================================================

/**
 * Cycle Count Status - Lifecycle states for cycle counts
 */
export enum CycleCountStatus {
  SCHEDULED = 'SCHEDULED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  RECONCILED = 'RECONCILED',
}

/**
 * Cycle Count Type - Different types of cycle counts
 */
export enum CycleCountType {
  ABC = 'ABC', // ABC analysis based counting (high-value items more frequently)
  BLANKET = 'BLANKET', // Count all items in a location
  SPOT_CHECK = 'SPOT_CHECK', // Random spot checks
  RECEIVING = 'RECEIVING', // Count during receiving
  SHIPPING = 'SHIPPING', // Count during shipping
  AD_HOC = 'AD_HOC', // Unscheduled counts
}

/**
 * Count Variance Status - Status of variance resolution
 */
export enum VarianceStatus {
  PENDING = 'PENDING', // Variance detected, awaiting review
  APPROVED = 'APPROVED', // Adjustment approved
  REJECTED = 'REJECTED', // Adjustment rejected
  AUTO_ADJUSTED = 'AUTO_ADJUSTED', // Automatically adjusted within tolerance
}

/**
 * Cycle Count Plan - Scheduled cycle count
 */
export interface CycleCountPlan {
  planId: string;
  planName: string;
  countType: CycleCountType;
  status: CycleCountStatus;
  scheduledDate: Date;
  startedAt?: Date;
  completedAt?: Date;
  reconciledAt?: Date;
  location?: string; // Optional: specific location to count
  sku?: string; // Optional: specific SKU to count
  countBy: string; // User who will perform or performed the count
  createdBy: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
  countEntries?: CycleCountEntry[];
}

/**
 * Cycle Count Entry - Individual item count result
 */
export interface CycleCountEntry {
  entryId: string;
  planId: string;
  sku: string;
  binLocation: string;
  systemQuantity: number; // Expected quantity from system
  countedQuantity: number; // Actual quantity counted
  variance: number; // Difference (counted - system)
  variancePercent?: number; // Percentage variance
  varianceStatus: VarianceStatus;
  countedAt: Date;
  countedBy: string;
  reviewedBy?: string;
  reviewedAt?: Date;
  adjustmentTransactionId?: string; // Link to inventory transaction if adjusted
  notes?: string;
}

/**
 * Cycle Count Tolerance - Allowed variance thresholds
 */
export interface CycleCountTolerance {
  toleranceId: string;
  toleranceName: string;
  sku?: string; // Optional: SKU-specific tolerance
  abcCategory?: string; // Optional: ABC category (A, B, C)
  locationZone?: string; // Optional: Zone-specific tolerance
  allowableVariancePercent: number;
  allowableVarianceAmount: number;
  autoAdjustThreshold: number; // Variance below this is auto-adjusted
  requiresApprovalThreshold: number; // Variance above this requires approval
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// CYCLE COUNTING DTOs
// ============================================================================

/**
 * Create Cycle Count Plan DTO
 */
export interface CreateCycleCountPlanDTO {
  planName: string;
  countType: CycleCountType;
  scheduledDate: Date;
  location?: string;
  sku?: string;
  countBy: string;
  createdBy: string;
  notes?: string;
}

/**
 * Create Cycle Count Entry DTO
 */
export interface CreateCycleCountEntryDTO {
  planId: string;
  sku: string;
  binLocation: string;
  countedQuantity: number;
  countedBy: string;
  notes?: string;
}

/**
 * Update Variance Status DTO
 */
export interface UpdateVarianceStatusDTO {
  entryId: string;
  status: VarianceStatus;
  reviewedBy: string;
  notes?: string;
}

/**
 * Reconcile Cycle Count DTO
 */
export interface ReconcileCycleCountDTO {
  planId: string;
  reconciledBy: string;
  notes?: string;
}

// ============================================================================
// CYCLE COUNT KPI TYPES
// ============================================================================

/**
 * Cycle Count KPI Summary
 */
export interface CycleCountKPI {
  totalCounts: number;
  completedCounts: number;
  inProgressCounts: number;
  scheduledCounts: number;
  completionRate: number;
  averageAccuracy: number;
  totalItemsCounted: number;
  totalVariances: number;
  pendingVariances: number;
  highValueVarianceCount: number;
}

/**
 * Accuracy Trend Data Point
 */
export interface AccuracyTrend {
  period: string;
  accuracy: number;
  totalCounts: number;
}

/**
 * Top Discrepancy SKU
 */
export interface TopDiscrepancySKU {
  sku: string;
  name: string;
  varianceCount: number;
  totalVariance: number;
  averageVariancePercent: number;
}

/**
 * Count Performance by User
 */
export interface CountByUser {
  userId: string;
  name: string;
  countsCompleted: number;
  itemsCounted: number;
  averageAccuracy: number;
}

/**
 * Zone Performance Metrics
 */
export interface ZonePerformance {
  zone: string;
  countsCompleted: number;
  itemsCounted: number;
  averageAccuracy: number;
  totalVariance: number;
}

/**
 * Count Type Effectiveness
 */
export interface CountTypeEffectiveness {
  countType: string;
  countsCompleted: number;
  averageAccuracy: number;
  averageDuration: number;
  varianceDetectionRate: number;
}

/**
 * Daily Statistics
 */
export interface DailyStats {
  date: string;
  countsCompleted: number;
  itemsCounted: number;
  variancesFound: number;
  accuracyRate: number;
}

/**
 * Cycle Count Dashboard Data
 */
export interface CycleCountDashboard {
  overallKPIs: CycleCountKPI;
  accuracyTrend: AccuracyTrend[];
  topDiscrepancies: TopDiscrepancySKU[];
  userPerformance: CountByUser[];
  zonePerformance: ZonePerformance[];
  countTypeEffectiveness: CountTypeEffectiveness[];
  dailyStats: DailyStats[];
}

// ============================================================================
// INTERLEAVED COUNTING TYPES
// ============================================================================

/**
 * Micro Count Result
 */
export interface MicroCount {
  microCountId: string;
  planId: string;
  cycleCountEntryId: string;
  sku: string;
  binLocation: string;
  systemQuantity: number;
  countedQuantity: number;
  variance: number;
  variancePercent: number;
  varianceStatus: 'MATCHED' | 'WITHIN_TOLERANCE' | 'REQUIRES_REVIEW';
  autoAdjusted: boolean;
  createdAt: Date;
}

/**
 * Create Micro Count DTO
 */
export interface CreateMicroCountDTO {
  sku: string;
  binLocation: string;
  countedQuantity: number;
  userId: string;
  orderId?: string;
  notes?: string;
}

/**
 * Micro Count Statistics
 */
export interface MicroCountStats {
  totalMicroCounts: number;
  accurateCounts: number;
  varianceCounts: number;
  autoAdjustedCounts: number;
  averageAccuracy: number;
}

// ============================================================================
// CYCLE COUNTING ENHANCEMENT TYPES
// ============================================================================

/**
 * Variance Severity Configuration
 * Configurable severity thresholds for variance categorization
 */
export interface VarianceSeverityConfig {
  configId: string;
  severityLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  minVariancePercent: number;
  maxVariancePercent: number;
  requiresApproval: boolean;
  requiresManagerApproval: boolean;
  autoAdjust: boolean;
  colorCode: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Variance Severity Determination Result
 */
export interface VarianceSeverityDetermination {
  configId: string;
  severityLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  requiresApproval: boolean;
  requiresManagerApproval: boolean;
  autoAdjust: boolean;
  colorCode: string;
}

/**
 * Recurring Count Schedule
 * Automated recurring cycle count schedules
 */
export interface RecurringCountSchedule {
  scheduleId: string;
  scheduleName: string;
  countType: CycleCountType;
  frequencyType: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'QUARTERLY';
  frequencyInterval: number;
  location?: string;
  sku?: string;
  assignedTo: string;
  nextRunDate: Date;
  lastRunDate?: Date;
  isActive: boolean;
  createdBy: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Root Cause Category
 * Reference categories for variance root cause analysis
 */
export interface RootCauseCategory {
  categoryId: string;
  categoryName: string;
  categoryCode: string;
  description?: string;
  displayOrder: number;
  isActive: boolean;
  createdAt: Date;
}

/**
 * Variance Root Cause
 * Links variance entries to root cause categories
 */
export interface VarianceRootCause {
  rootCauseId: string;
  entryId: string;
  categoryId: string;
  additionalNotes?: string;
  createdBy: string;
  createdAt: Date;
}

/**
 * Root Cause Pareto Data
 * Pareto analysis (80/20 rule) of root causes
 */
export interface RootCauseParetoData {
  category: string;
  categoryId: string;
  count: number;
  cumulativePercent: number;
  totalVariance: number;
  averageVariancePercent: number;
}

/**
 * Category Breakdown
 * Root cause breakdown with trend analysis
 */
export interface CategoryBreakdown {
  category: string;
  categoryId: string;
  varianceCount: number;
  averageVariancePercent: number;
  totalVariance: number;
  trend: 'INCREASING' | 'DECREASING' | 'STABLE';
  trendPercent?: number;
}

/**
 * Trending Root Cause
 * Root causes that are trending (increasing problems)
 */
export interface TrendingRootCause {
  category: string;
  categoryId: string;
  currentPeriodCount: number;
  previousPeriodCount: number;
  percentChange: number;
  trendDirection: 'UP' | 'DOWN';
  averageVariancePercent: number;
}

/**
 * SKU Root Cause Analysis
 * Root cause analysis for a specific SKU
 */
export interface SKURootCauseAnalysis {
  sku: string;
  skuName?: string;
  totalVariances: number;
  rootCauses: Array<{
    category: string;
    count: number;
    percentOfTotal: number;
  }>;
  averageVariancePercent: number;
  mostCommonCause: string;
}

/**
 * Zone Root Cause Analysis
 * Root cause analysis for a specific zone
 */
export interface ZoneRootCauseAnalysis {
  zone: string;
  totalVariances: number;
  rootCauses: Array<{
    category: string;
    count: number;
    percentOfTotal: number;
  }>;
  averageVariancePercent: number;
  mostCommonCause: string;
  topSKUs: Array<{
    sku: string;
    varianceCount: number;
  }>;
}

// ============================================================================
// CYCLE COUNTING ENHANCEMENT DTOs
// ============================================================================

/**
 * Create Variance Severity Config DTO
 */
export interface CreateVarianceSeverityConfigDTO {
  severityLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  minVariancePercent: number;
  maxVariancePercent: number;
  requiresApproval: boolean;
  requiresManagerApproval: boolean;
  autoAdjust: boolean;
  colorCode: string;
}

/**
 * Update Variance Severity Config DTO
 */
export interface UpdateVarianceSeverityConfigDTO {
  severityLevel?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  minVariancePercent?: number;
  maxVariancePercent?: number;
  requiresApproval?: boolean;
  requiresManagerApproval?: boolean;
  autoAdjust?: boolean;
  colorCode?: string;
  isActive?: boolean;
}

/**
 * Create Recurring Schedule DTO
 */
export interface CreateRecurringScheduleDTO {
  scheduleName: string;
  countType: CycleCountType;
  frequencyType: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'QUARTERLY';
  frequencyInterval: number;
  location?: string;
  sku?: string;
  assignedTo: string;
  nextRunDate: Date;
  notes?: string;
  createdBy: string;
}

/**
 * Update Recurring Schedule DTO
 */
export interface UpdateRecurringScheduleDTO {
  scheduleName?: string;
  countType?: CycleCountType;
  frequencyType?: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'QUARTERLY';
  frequencyInterval?: number;
  location?: string;
  sku?: string;
  assignedTo?: string;
  nextRunDate?: Date;
  isActive?: boolean;
  notes?: string;
}

/**
 * Record Root Cause DTO
 */
export interface RecordRootCauseDTO {
  entryId: string;
  categoryId: string;
  additionalNotes?: string;
  createdBy: string;
}

/**
 * Create Root Cause Category DTO
 */
export interface CreateRootCauseCategoryDTO {
  categoryName: string;
  categoryCode: string;
  description?: string;
  displayOrder?: number;
}

// ============================================================================
// RFID & AUTOMATION TYPES
// ============================================================================

/**
 * RFID Tag Data
 */
export interface RFIDTag {
  tagId: string;
  epc: string;
  sku?: string;
  binLocation?: string;
  lastScanned?: Date;
  scanCount: number;
}

/**
 * RFID Scan Result
 */
export interface RFIDScanResult {
  tags: RFIDTag[];
  scanDuration: number;
  scanLocation: string;
  scannedBy: string;
  scannedAt: Date;
}

/**
 * Automation Task Type
 */
export enum AutomationTaskType {
  CYCLE_COUNT = 'CYCLE_COUNT',
  INVENTORY_CHECK = 'INVENTORY_CHECK',
  PICK = 'PICK',
  PUTAWAY = 'PUTAWAY',
  REPLENISHMENT = 'REPLENISHMENT',
}

/**
 * Automation Task Status
 */
export enum AutomationTaskStatus {
  PENDING = 'PENDING',
  ASSIGNED = 'ASSIGNED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
}

/**
 * Automation Task
 */
export interface AutomationTask {
  taskId: string;
  taskType: AutomationTaskType;
  status: AutomationTaskStatus;
  assignedTo: string; // Robot ID, ASRS system, or automation equipment
  priority: number;
  location: string;
  sku?: string;
  quantity?: number;
  metadata?: Record<string, unknown>;
  result?: {
    countedQuantity?: number;
    variance?: number;
    notes?: string;
    completedAt?: Date;
  };
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
}

/**
 * Create Automation Task DTO
 */
export interface CreateAutomationTaskDTO {
  taskType: AutomationTaskType;
  assignedTo: string;
  priority: number;
  location: string;
  sku?: string;
  quantity?: number;
  metadata?: Record<string, unknown>;
  createdBy: string;
}

// ============================================================================
// UNIT HIERARCHY TYPES
// ============================================================================

/**
 * Unit Level - Hierarchy level for inventory units
 */
export enum UnitLevel {
  PALLET = 'PALLET',
  CASE = 'CASE',
  EACH = 'EACH', // Individual item
}

/**
 * Unit Conversion - Conversion rates between unit levels
 */
export interface UnitConversion {
  sku: string;
  fromLevel: UnitLevel;
  toLevel: UnitLevel;
  conversionFactor: number; // How many "to" units are in one "from" unit
  // example: 1 PALLET = 48 CASES, 1 CASE = 12 EACH
}

/**
 * Inventory Unit with Hierarchy
 */
export interface InventoryUnitWithHierarchy {
  unitId: string;
  sku: string;
  binLocation: string;
  quantity: number;
  unitLevel: UnitLevel;
  parentUnitId?: string; // For case items, which pallet they belong to
  childUnitIds?: string[]; // For pallets, which cases belong to them
  conversionFactor?: number; // If this is a CASE or PALLET, how many child units
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// LOCATION CAPACITY TYPES
// ============================================================================

/**
 * Capacity Type - Type of capacity constraint
 */
export enum CapacityType {
  WEIGHT = 'WEIGHT',
  VOLUME = 'VOLUME',
  QUANTITY = 'QUANTITY',
}

/**
 * Capacity Unit - Units for capacity measurement
 */
export enum CapacityUnit {
  LBS = 'LBS', // Pounds
  KG = 'KG', // Kilograms
  CUBIC_FT = 'CUBIC_FT', // Cubic feet
  CUBIC_M = 'CUBIC_M', // Cubic meters
  UNITS = 'UNITS', // Individual units
  PALLET = 'PALLET', // Pallet positions
}

/**
 * Capacity Rule Status - Status of capacity rule
 */
export enum CapacityRuleStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  WARNING = 'WARNING',
  EXCEEDED = 'EXCEEDED',
}

/**
 * Location Capacity - Capacity limits for a bin location
 */
export interface LocationCapacity {
  capacityId: string;
  binLocation: string;
  capacityType: CapacityType;
  maximumCapacity: number;
  currentUtilization: number;
  availableCapacity: number;
  utilizationPercent: number;
  capacityUnit: CapacityUnit;
  status: CapacityRuleStatus;
  warningThreshold: number; // Percentage to trigger warning
  exceededAt?: Date;
  lastUpdated: Date;
  updatedAt: Date;
}

/**
 * Capacity Rule - Business rules for capacity management
 */
export interface CapacityRule {
  ruleId: string;
  ruleName: string;
  description?: string;
  capacityType: CapacityType;
  capacityUnit: CapacityUnit;
  appliesTo: 'ALL' | 'ZONE' | 'LOCATION_TYPE' | 'SPECIFIC_LOCATION';
  zone?: string;
  locationType?: BinType;
  specificLocation?: string;
  maximumCapacity: number;
  warningThreshold: number; // Percentage
  allowOverfill: boolean;
  overfillThreshold?: number; // Maximum overfill percentage
  isActive: boolean;
  priority: number; // Higher priority rules take precedence
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Capacity Alert - Alert when capacity is exceeded or approaching limit
 */
export interface CapacityAlert {
  alertId: string;
  binLocation: string;
  capacityType: CapacityType;
  currentUtilization: number;
  maximumCapacity: number;
  utilizationPercent: number;
  alertType: 'WARNING' | 'EXCEEDED' | 'CRITICAL';
  alertMessage: string;
  acknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: Date;
  resolvedAt?: Date;
  createdAt: Date;
}

// ============================================================================
// LOCATION CAPACITY DTOs
// ============================================================================

/**
 * Create Capacity Rule DTO
 */
export interface CreateCapacityRuleDTO {
  ruleName: string;
  description?: string;
  capacityType: CapacityType;
  capacityUnit: CapacityUnit;
  appliesTo: 'ALL' | 'ZONE' | 'LOCATION_TYPE' | 'SPECIFIC_LOCATION';
  zone?: string;
  locationType?: BinType;
  specificLocation?: string;
  maximumCapacity: number;
  warningThreshold: number;
  allowOverfill: boolean;
  overfillThreshold?: number;
  priority: number;
  createdBy: string;
}

/**
 * Acknowledge Capacity Alert DTO
 */
export interface AcknowledgeCapacityAlertDTO {
  alertId: string;
  acknowledgedBy: string;
}

// ============================================================================
// QUALITY CONTROL TYPES
// ============================================================================

/**
 * Inspection Status - Quality inspection lifecycle
 */
export enum InspectionStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  PASSED = 'PASSED',
  FAILED = 'FAILED',
  CONDITIONAL_PASSED = 'CONDITIONAL_PASSED', // Passed with conditions
  CANCELLED = 'CANCELLED',
}

/**
 * Inspection Type - Type of quality inspection
 */
export enum InspectionType {
  INCOMING = 'INCOMING', // Inspect incoming goods
  OUTGOING = 'OUTGOING', // Inspect outgoing goods
  INVENTORY = 'INVENTORY', // Regular inventory inspection
  QUALITY_HOLD = 'QUALITY_HOLD', // Items placed on quality hold
  RETURN = 'RETURN', // Returned items inspection
  DAMAGE = 'DAMAGE', // Damage inspection
  EXPIRATION = 'EXPIRATION', // Expiration date check
  SPECIAL = 'SPECIAL', // Special inspection request
}

/**
 * Defect Type - Types of quality defects
 */
export enum DefectType {
  DAMAGED = 'DAMAGED',
  DEFECTIVE = 'DEFECTIVE',
  MISSING_PARTS = 'MISSING_PARTS',
  WRONG_ITEM = 'WRONG_ITEM',
  EXPIRED = 'EXPIRED',
  NEAR_EXPIRY = 'NEAR_EXPIRY',
  MISLABELED = 'MISLABELED',
  PACKAGING = 'PACKAGING',
  CONTAMINATED = 'CONTAMINATED',
  OTHER = 'OTHER',
}

/**
 * Disposition Action - Actions for failed inspections
 */
export enum DispositionAction {
  RETURN_TO_VENDOR = 'RETURN_TO_VENDOR',
  SCRAP = 'SCRAP',
  REWORK = 'REWORK',
  QUARANTINE = 'QUARANTINE',
  SELL_AS_IS = 'SELL_AS_IS',
  DISCOUNT = 'DISCOUNT',
  DONATE = 'DONATE',
  CUSTOMER_RETURN = 'CUSTOMER_RETURN',
  OTHER = 'OTHER',
}

/**
 * Quality Inspection - Quality control inspection record
 */
export interface QualityInspection {
  inspectionId: string;
  inspectionType: InspectionType;
  status: InspectionStatus;
  referenceType: 'ASN' | 'RECEIPT' | 'ORDER' | 'INVENTORY' | 'RETURN';
  referenceId: string;
  sku: string;
  quantityInspected: number;
  quantityPassed: number;
  quantityFailed: number;
  defectType?: DefectType;
  defectDescription?: string;
  dispositionAction?: DispositionAction;
  dispositionNotes?: string;
  inspectorId: string;
  inspectorName: string;
  startedAt?: Date;
  completedAt?: Date;
  location?: string;
  lotNumber?: string;
  expirationDate?: Date;
  images?: string[]; // URLs to inspection photos
  attachments?: string[]; // URLs to additional documents
  approvedBy?: string;
  approvedAt?: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Inspection Checklist - Template for inspection criteria
 */
export interface InspectionChecklist {
  checklistId: string;
  checklistName: string;
  description?: string;
  inspectionType: InspectionType;
  sku?: string; // Optional: SKU-specific checklist
  category?: string; // Optional: Category-specific checklist
  isActive: boolean;
  items: InspectionChecklistItem[];
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Inspection Checklist Item - Individual checklist item
 */
export interface InspectionChecklistItem {
  itemId: string;
  checklistId: string;
  itemDescription: string;
  itemType: 'CHECKBOX' | 'TEXT' | 'NUMBER' | 'PHOTO' | 'PASS_FAIL';
  isRequired: boolean;
  displayOrder: number;
  options?: string[]; // For multiple choice items
}

/**
 * Inspection Result - Results from checklist completion
 */
export interface InspectionResult {
  resultId: string;
  inspectionId: string;
  checklistItemId: string;
  result: string; // The actual result value
  passed: boolean;
  notes?: string;
  imageUrl?: string;
}

/**
 * Return Authorization - Customer return authorization
 */
export interface ReturnAuthorization {
  returnId: string;
  orderId: string;
  customerId: string;
  customerName: string;
  returnReason: string;
  returnDate: Date;
  status:
    | 'PENDING'
    | 'APPROVED'
    | 'RECEIVED'
    | 'INSPECTED'
    | 'PROCESSED'
    | 'REJECTED'
    | 'COMPLETED';
  authorizedBy: string;
  receivedBy?: string;
  inspectedBy?: string;
  totalRefundAmount: number;
  restockingFee?: number;
  notes?: string;
  items?: ReturnItem[];
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Return Item - Individual item in a return
 */
export interface ReturnItem {
  returnItemId: string;
  returnId: string;
  orderItemId: string;
  sku: string;
  name: string;
  quantity: number;
  returnReason: string;
  condition: 'NEW' | 'OPENED' | 'DAMAGED' | 'DEFECTIVE';
  disposition?: DispositionAction;
  refundAmount: number;
  inspectionId?: string;
}

// ============================================================================
// QUALITY CONTROL DTOs
// ============================================================================

/**
 * Create Inspection DTO
 */
export interface CreateInspectionDTO {
  inspectionType: InspectionType;
  referenceType: 'ASN' | 'RECEIPT' | 'ORDER' | 'INVENTORY' | 'RETURN';
  referenceId: string;
  sku: string;
  quantityInspected: number;
  inspectorId: string;
  location?: string;
  lotNumber?: string;
  expirationDate?: Date;
  checklistId?: string;
  notes?: string;
}

/**
 * Update Inspection Status DTO
 */
export interface UpdateInspectionStatusDTO {
  inspectionId: string;
  status: InspectionStatus;
  quantityPassed?: number;
  quantityFailed?: number;
  defectType?: DefectType;
  defectDescription?: string;
  dispositionAction?: DispositionAction;
  dispositionNotes?: string;
  approvedBy?: string;
  notes?: string;
}

/**
 * Create Return Authorization DTO
 */
export interface CreateReturnAuthorizationDTO {
  orderId: string;
  customerId: string;
  customerName: string;
  returnReason: string;
  items: Array<{
    orderItemId: string;
    sku: string;
    name: string;
    quantity: number;
    returnReason: string;
    condition: 'NEW' | 'OPENED' | 'DAMAGED' | 'DEFECTIVE';
    refundAmount: number;
  }>;
  authorizedBy: string;
  totalRefundAmount: number;
  restockingFee?: number;
}

// ============================================================================
// NZC (NZ COURIERS) API TYPES
// ============================================================================

/**
 * NZC Label Format options
 */
export enum NZCLabelFormat {
  PNG_100X175 = 'LABEL_PNG_100X175',
  PNG_100X150 = 'LABEL_PNG_100X150',
  PDF_100X175 = 'LABEL_PDF_100X175',
  PDF = 'LABEL_PDF',
}

/**
 * NZC Quote from rate response
 */
export interface NZCQuote {
  QuoteId: string;
  Carrier: string;
  Service: string;
  TotalPrice: number;
  TransitDays?: number;
  Description?: string;
}

/**
 * NZC Rate Request DTO
 */
export interface NZCRateRequest {
  destination: {
    name?: string;
    company?: string;
    addressLine1: string;
    city: string;
    state?: string;
    postalCode: string;
    country: string;
    phone?: string;
    email?: string;
  };
  packages: Array<{
    length?: number; // cm
    width?: number; // cm
    height?: number; // cm
    weight: number; // kg (required)
    units?: number;
  }>;
}

/**
 * NZC Rate Response
 */
export interface NZCRateResponse {
  Quotes: NZCQuote[];
  Suppressed: unknown[];
  Rejected: Array<{
    Carrier: string;
    Reason: string;
  }>;
  ValidationErrors: Record<string, string>;
}

/**
 * NZC Shipment Request DTO
 */
export interface NZCShipmentRequest extends NZCRateRequest {
  quoteId: string;
}

/**
 * NZC Shipment Response
 */
export interface NZCShipmentResponse {
  ConsignmentNo: string;
  ConsignmentId: string;
  Packages: Array<{
    ConsignmentNo: string;
    ConsignmentId: string;
  }>;
}

/**
 * NZC Label Response
 */
export interface NZCLabelResponse {
  connote: string;
  format: string;
  contentType: string;
  data: string; // base64 encoded
}

// ============================================================================
// PHASE 3: ADVANCED FEATURES - EXPORTS
// ============================================================================

// Export all Phase 3 types
export * from './business-rules';
export * from './reporting';
export * from './integrations';

// ============================================================================
// ADD-ON MODULES - EXPORTS
// ============================================================================

// Export all add-on module types
export * from './production';
export * from './sales-crm';
export * from './maintenance';

// ============================================================================
// UTILITY TYPES - For type-safe replacements of 'any'
// ============================================================================

/**
 * Deep partial type - makes all nested properties optional
 * Useful for partial updates and patches
 */
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

/**
 * Database record with ID and timestamps
 */
export type DbRecord = {
  id: string;
  created_at: Date;
  updated_at: Date;
};

/**
 * Pagination parameters
 */
export type PaginationParams = {
  page?: number;
  limit?: number;
  offset?: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
};

/**
 * Paginated response
 */
export type PaginatedResponse<T> = {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

/**
 * Generic API response wrapper
 */
export type ApiResponse<T> = {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
};

/**
 * JSON-serializable type for database values
 */
export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

/**
 * Generic query result type
 */
export type QueryResult<T> = {
  rows: T[];
  rowCount: number;
};

/**
 * Common error response type
 */
export type ErrorResponse = {
  success: false;
  error: string;
  message?: string;
  code?: string;
  details?: Record<string, unknown>;
};

/**
 * Type for database transaction client
 */
export type TransactionClient = {
  query: (text: string, params?: unknown[]) => Promise<QueryResult<unknown>>;
  release: () => void;
};

/**
 * Generic filter type for queries
 */
export type Filter<T> = {
  [K in keyof T]?: T[K] | { $in: T[K][] } | { $like: string } | { $gte: T[K] } | { $lte: T[K] };
};

// ============================================================================
// ENHANCED INBOUND FEATURES EXPORTS
// ============================================================================
// Note: All new inbound types are already exported via their original declarations

// ============================================================================
// NOTIFICATION SYSTEM - EXPORTS
// ============================================================================

// Export notification types
export * from './notifications';

// ============================================================================
// ACCOUNTING & FINANCIAL TYPES
// ============================================================================

/**
 * Accounting Period
 */
export enum AccountingPeriod {
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY',
  MONTHLY = 'MONTHLY',
  QUARTERLY = 'QUARTERLY',
  YEARLY = 'YEARLY',
}

/**
 * Cost Category
 */
export enum CostCategory {
  LABOR = 'LABOR',
  MATERIALS = 'MATERIALS',
  SHIPPING = 'SHIPPING',
  STORAGE = 'STORAGE',
  OVERHEAD = 'OVERHEAD',
  EXCEPTIONS = 'EXCEPTIONS',
  QUALITY_CONTROL = 'QUALITY_CONTROL',
  MAINTENANCE = 'MAINTENANCE',
}

/**
 * Revenue Category
 */
export enum RevenueCategory {
  SALES = 'SALES',
  RESTOCKING_FEES = 'RESTOCKING_FEES',
  SERVICE_FEES = 'SERVICE_FEES',
  OTHER = 'OTHER',
}

/**
 * Financial Metrics Summary
 */
export interface FinancialMetrics {
  period: AccountingPeriod;
  startDate: Date;
  endDate: Date;

  // Revenue
  totalRevenue: number;
  revenueByCategory: Record<RevenueCategory, number>;
  revenueByCustomer: Array<{ customerId: string; customerName: string; amount: number }>;

  // Costs
  totalCost: number;
  costByCategory: Record<CostCategory, number>;
  laborCosts: number;
  materialCosts: number;
  shippingCosts: number;
  storageCosts: number;

  // Inventory Valuation
  inventoryValue: number;
  inventoryValueByCategory: Record<string, number>;
  inventoryValueByZone: Record<string, number>;

  // Profitability
  grossProfit: number;
  netProfit: number;
  profitMargin: number;

  // Exception Costs
  totalExceptionCost: number;
  writeOffs: number;
  vendorCredits: number;
  customerRefunds: number;

  // QC Metrics
  qcFailureRate: number;
  qcCost: number;
  returnRate: number;
  returnCost: number;

  // Operating Metrics
  ordersProcessed: number;
  costPerOrder: number;
  averageOrderValue: number;

  // Receivables/Payables
  outstandingReceivables: number;
  outstandingPayables: number;
  overdueReceivables: number;

  previousPeriod?: {
    revenue: number;
    cost: number;
    profit: number;
  };
}

/**
 * Inventory Valuation Detail
 */
export interface InventoryValuation {
  sku: string;
  description: string;
  category: string;
  quantityOnHand: number;
  unitCost: number;
  totalValue: number;
  zone: string;
  binLocation: string;
  lastReceived: Date;
  lastCostUpdate: Date;
  valuationMethod: 'FIFO' | 'LIFO' | 'WEIGHTED_AVERAGE' | 'STANDARD_COST';
}

/**
 * Labor Cost Detail
 */
export interface LaborCostDetail {
  userId: string;
  userName: string;
  userRole: UserRole;
  hoursWorked: number;
  hourlyRate: number;
  totalCost: number;
  tasksCompleted: number;
  costPerTask: number;
  period: AccountingPeriod;
  date: Date;
}

/**
 * Transaction Log
 */
export enum TransactionType {
  SALE = 'SALE',
  REFUND = 'REFUND',
  CREDIT_RECEIVED = 'CREDIT_RECEIVED',
  CREDIT_ISSUED = 'CREDIT_ISSUED',
  WRITE_OFF = 'WRITE_OFF',
  PAYMENT_RECEIVED = 'PAYMENT_RECEIVED',
  PAYMENT_MADE = 'PAYMENT_MADE',
  JOURNAL_ENTRY = 'JOURNAL_ENTRY',
}

export interface FinancialTransaction {
  transactionId: string;
  transactionType: TransactionType;
  amount: number;
  currency: string;
  referenceType: 'ORDER' | 'RETURN' | 'EXCEPTION' | 'GENERAL';
  referenceId: string;
  description: string;
  customerId?: string;
  vendorId?: string;
  createdAt: Date;
  createdBy: string;
  approvedBy?: string;
  approvedAt?: Date;
  status: 'PENDING' | 'APPROVED' | 'RECONCILED' | 'CANCELLED';
  account: string;
  notes?: string;
}

/**
 * Cost Analysis Report
 */
export interface CostAnalysisReport {
  reportId: string;
  period: AccountingPeriod;
  startDate: Date;
  endDate: Date;
  generatedAt: Date;

  // Cost breakdown
  totalCost: number;
  costCategories: Array<{
    category: CostCategory;
    amount: number;
    percentage: number;
    previousPeriod: number;
    change: number;
    changePercent: number;
  }>;

  // Trends
  costTrends: Array<{
    period: string;
    amount: number;
  }>;

  // Top cost drivers
  topCostDrivers: Array<{
    description: string;
    amount: number;
    percentage: number;
    trend: 'UP' | 'DOWN' | 'STABLE';
  }>;

  // Recommendations
  recommendations: string[];
}

/**
 * Profit & Loss Statement
 */
export interface ProfitLossStatement {
  statementId: string;
  period: AccountingPeriod;
  startDate: Date;
  endDate: Date;
  generatedAt: Date;

  // Revenue
  grossRevenue: number;
  returns: number;
  netRevenue: number;

  // Cost of Goods Sold
  materialCosts: number;
  laborCosts: number;
  otherDirectCosts: number;
  totalCOGS: number;

  // Gross Profit
  grossProfit: number;
  grossProfitMargin: number;

  // Operating Expenses
  operatingExpenses: Record<string, number>;
  totalOperatingExpenses: number;

  // Operating Income
  operatingIncome: number;
  operatingMargin: number;

  // Other Income/Expenses
  otherIncome: number;
  otherExpenses: number;

  // Net Income
  netIncome: number;
  netMargin: number;

  // Comparison with previous period
  previousPeriod?: {
    netRevenue: number;
    grossProfit: number;
    netIncome: number;
  };
}

/**
 * Vendor Performance Summary
 */
export interface VendorPerformanceFinancial {
  vendorId: string;
  vendorName: string;
  period: AccountingPeriod;
  startDate: Date;
  endDate: Date;

  // Purchases
  totalPurchases: number;
  orderCount: number;
  averageOrderValue: number;

  // Quality & Returns
  returnRate: number;
  returnCost: number;
  defectRate: number;
  creditRequested: number;
  creditApproved: number;
  creditPending: number;

  // Payment Terms
  paymentTerms: string;
  outstandingBalance: number;
  overdueAmount: number;
  onTimePaymentRate: number;

  // Performance Score
  performanceScore: number;
  rating: 'EXCELLENT' | 'GOOD' | 'AVERAGE' | 'POOR';
}

/**
 * Customer Financial Summary
 */
export interface CustomerFinancialSummary {
  customerId: string;
  customerName: string;
  period: AccountingPeriod;
  startDate: Date;
  endDate: Date;

  // Sales
  totalOrders: number;
  totalRevenue: number;
  averageOrderValue: number;

  // Returns & Credits
  returnCount: number;
  returnRate: number;
  returnAmount: number;
  creditIssued: number;

  // Outstanding
  outstandingBalance: number;
  overdueAmount: number;
  daysPaymentOutstanding: number;

  // Profitability
  grossProfit: number;
  netProfit: number;
  profitMargin: number;

  // Status
  creditStatus: 'GOOD' | 'WARNING' | 'RESTRICTED' | 'BLOCKED';
  creditLimit?: number;
  creditAvailable?: number;
}

// ============================================================================
// INVENTORY ANALYTICS TYPES
// ============================================================================

/**
 * Inventory Aging Item - Items grouped by how long they've been in warehouse
 */
export interface InventoryAgingItem {
  sku: string;
  name: string;
  binLocation: string;
  quantity: number;
  daysInWarehouse: number;
  lastReceivedDate: Date;
  lotNumber?: string;
  expirationDate?: Date;
}

/**
 * Aging Bucket Summary - Aggregate counts by age range
 */
export interface AgingBucketSummary {
  range: string; // e.g., "0-30 days", "31-60 days", etc.
  itemCount: number;
  totalQuantity: number;
  totalValue: number;
  percentageOfInventory: number;
}

/**
 * Lot Information - Tracking for lot/batch numbers
 */
export interface LotInfo {
  lotNumber: string;
  expirationDate?: Date;
  quantity: number;
  available: number;
  binLocations: string[];
  daysUntilExpiration?: number;
  status: 'OK' | 'EXPIRING_SOON' | 'EXPIRED';
}

/**
 * Inventory Turnover Metrics
 */
export interface InventoryTurnover {
  sku: string;
  name: string;
  period: string; // e.g., "2026-01", "Q1-2026"
  receiptsQuantity: number;
  deductionsQuantity: number;
  averageInventory: number;
  turnoverCount: number; // cost of goods sold / average inventory
  turnoverRate: 'HIGH' | 'NORMAL' | 'LOW' | 'STAGNANT';
}

/**
 * Bin Utilization - Capacity tracking per bin
 */
export interface BinUtilization {
  binLocation: string;
  zone: string;
  capacityType: 'WEIGHT' | 'VOLUME' | 'QUANTITY';
  maximumCapacity: number;
  currentUtilization: number;
  availableCapacity: number;
  utilizationPercent: number;
  status: 'OK' | 'WARNING' | 'OVER_CAPACITY';
  itemsCount: number;
}

/**
 * Zone Utilization Summary - Aggregate by warehouse zone
 */
export interface ZoneUtilizationSummary {
  zone: string;
  totalBins: number;
  occupiedBins: number;
  emptyBins: number;
  averageUtilization: number;
  overCapacityBins: number;
}

/**
 * Expiring Inventory Report
 */
export interface ExpiringInventoryItem {
  sku: string;
  name: string;
  lotNumber: string;
  expirationDate: Date;
  daysUntilExpiration: number;
  quantity: number;
  binLocation: string;
  urgency: 'CRITICAL' | 'WARNING' | 'INFO';
}

// ============================================================================
// ROLE PERMISSIONS MATRIX TYPES
// ============================================================================

/**
 * Permission Category
 */
export enum PermissionCategory {
  ORDERS = 'ORDERS',
  INVENTORY = 'INVENTORY',
  INBOUND = 'INBOUND',
  OUTBOUND = 'OUTBOUND',
  QC = 'QC',
  SHIPPING = 'SHIPPING',
  USERS = 'USERS',
  ROLES = 'ROLES',
  SETTINGS = 'SETTINGS',
  REPORTS = 'REPORTS',
  ACCOUNTING = 'ACCOUNTING',
  INTEGRATIONS = 'INTEGRATIONS',
}

/**
 * Role Permission Matrix Entry
 */
export interface RolePermissionEntry {
  role: UserRole;
  permissions: Permission[];
  permissionCategories: Partial<Record<PermissionCategory, Permission[]>>;
}

/**
 * Permission Definition
 */
export interface PermissionDefinition {
  permission: Permission;
  category: PermissionCategory;
  description: string;
  applicableRoles: UserRole[];
}

// ============================================================================
// FULL ERP ACCOUNTING TYPES (PHASE 1-3)
// ============================================================================

/**
 * Account Type Enum - Standard accounting account types
 */
export enum AccountType {
  ASSET = 'ASSET',
  LIABILITY = 'LIABILITY',
  EQUITY = 'EQUITY',
  REVENUE = 'REVENUE',
  EXPENSE = 'EXPENSE',
}

/**
 * Journal Entry Status Enum
 */
export enum JournalEntryStatus {
  DRAFT = 'DRAFT',
  SUBMITTED = 'SUBMITTED',
  APPROVED = 'APPROVED',
  POSTED = 'POSTED',
  REVERSED = 'REVERSED',
}

/**
 * Revenue Recognition Method Enum
 */
export enum RevenueRecognitionMethod {
  INSTANT = 'INSTANT',
  MILESTONE = 'MILESTONE',
  RATABLE = 'RATABLE',
  DEFERRED = 'DEFERRED',
}

/**
 * Depreciation Method Enum
 */
export enum DepreciationMethod {
  STRAIGHT_LINE = 'STRAIGHT_LINE',
  DECLINING_BALANCE = 'DECLINING_BALANCE',
  DOUBLE_DECLINING = 'DOUBLE_DECLINING',
  UNITS_OF_PRODUCTION = 'UNITS_OF_PRODUCTION',
}

// ============================================================================
// PHASE 1: FOUNDATION TYPES
// ============================================================================

/**
 * Chart of Accounts
 */
export interface ChartOfAccounts {
  accountId: string;
  accountCode: string;
  accountName: string;
  accountType: AccountType;
  parentAccountId?: string;
  normalBalance: 'D' | 'C';
  isActive: boolean;
  isHeader: boolean;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Journal Entry
 */
export interface JournalEntry {
  journalEntryId: string;
  entryNumber: string;
  entryDate: Date;
  fiscalPeriod: string;
  description: string;
  status: JournalEntryStatus;
  totalDebit: number;
  totalCredit: number;
  createdBy?: string;
  approvedBy?: string;
  approvedAt?: Date;
  postedAt?: Date;
  reversalEntryId?: string;
  notes?: string;
  lines?: JournalEntryLine[];
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Journal Entry Line
 */
export interface JournalEntryLine {
  lineId: string;
  journalEntryId: string;
  lineNumber: number;
  accountId: string;
  description?: string;
  debitAmount: number;
  creditAmount: number;
  costCenter?: string;
  referenceType?: string;
  referenceId?: string;
}

/**
 * Trial Balance
 */
export interface TrialBalance {
  trialBalanceId: string;
  asOfDate: Date;
  fiscalPeriod: string;
  generatedAt: Date;
  lines?: TrialBalanceLine[];
}

/**
 * Trial Balance Line
 */
export interface TrialBalanceLine {
  lineId: string;
  trialBalanceId: string;
  accountId: string;
  accountCode: string;
  accountName: string;
  accountType: AccountType;
  debitBalance: number;
  creditBalance: number;
  netBalance: number;
}

/**
 * Account Balance
 */
export interface AccountBalance {
  accountId: string;
  accountCode: string;
  accountName: string;
  accountType: AccountType;
  normalBalance: 'D' | 'C';
  debitBalance: number;
  creditBalance: number;
  netBalance: number;
}

/**
 * Balance Sheet
 */
export interface BalanceSheet {
  asOfDate: Date;
  generatedAt: Date;
  assets: BalanceSheetSection;
  liabilities: BalanceSheetSection;
  equity: BalanceSheetEquitySection;
  totalAssetsLiabilitiesEquity: number;
}

/**
 * Balance Sheet Section
 */
export interface BalanceSheetSection {
  current: BalanceSheetItem[];
  nonCurrent: BalanceSheetItem[];
  total: number;
}

/**
 * Balance Sheet Item
 */
export interface BalanceSheetItem {
  accountId: string;
  accountCode: string;
  accountName: string;
  amount: number;
}

/**
 * Balance Sheet Equity Section
 */
export interface BalanceSheetEquitySection {
  total: number;
  breakdown: BalanceSheetItem[];
}

/**
 * Cash Flow Statement
 */
export interface CashFlowStatement {
  period: {
    startDate: Date;
    endDate: Date;
  };
  operating: CashFlowCategory;
  investing: CashFlowCategory;
  financing: CashFlowCategory;
  netCashFlow: number;
  beginningCash: number;
  endingCash: number;
}

/**
 * Cash Flow Category
 */
export interface CashFlowCategory {
  total: number;
  items: CashFlowItem[];
}

/**
 * Cash Flow Item
 */
export interface CashFlowItem {
  description: string;
  amount: number;
}

// ============================================================================
// PHASE 2: OPERATIONAL TYPES
// ============================================================================

/**
 * AR Payment
 */
export interface ARPayment {
  paymentId: string;
  receivableId: string;
  paymentDate: Date;
  paymentMethod?: string;
  amount: number;
  referenceNumber?: string;
  notes?: string;
  createdBy?: string;
  createdAt: Date;
}

/**
 * Credit Memo
 */
export interface CreditMemo {
  memoId: string;
  receivableId?: string;
  memoNumber: string;
  memoDate: Date;
  reason: string;
  amount: number;
  status: string;
  approvedBy?: string;
  approvedAt?: Date;
  createdAt: Date;
}

/**
 * Collection Activity
 */
export interface CollectionActivity {
  activityId: string;
  receivableId: string;
  activityType: 'CALL' | 'EMAIL' | 'LETTER' | 'VISIT';
  activityDate: Date;
  notes?: string;
  outcome?: string;
  followUpDate?: Date;
  createdBy?: string;
  createdAt: Date;
}

/**
 * AP Payment
 */
export interface APPayment {
  paymentId: string;
  payableId: string;
  paymentDate: Date;
  paymentMethod?: string;
  amount: number;
  referenceNumber?: string;
  notes?: string;
  createdBy?: string;
  createdAt: Date;
}

/**
 * Vendor Credit Memo
 */
export interface VendorCreditMemo {
  memoId: string;
  payableId?: string;
  memoNumber: string;
  memoDate: Date;
  reason: string;
  amount: number;
  status: string;
  approvedBy?: string;
  approvedAt?: Date;
  createdAt: Date;
}

/**
 * Payment Schedule
 */
export interface PaymentSchedule {
  scheduleId: string;
  payableId: string;
  scheduledPaymentDate: Date;
  amount: number;
  status: string;
  paidAmount: number;
  paidDate?: Date;
  createdAt: Date;
}

/**
 * Bank Account
 */
export interface BankAccount {
  bankAccountId: string;
  accountNumber: string;
  accountName: string;
  bankName: string;
  routingNumber?: string;
  accountType: string;
  currency: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Bank Reconciliation
 */
export interface BankReconciliation {
  reconciliationId: string;
  bankAccountId: string;
  statementDate: Date;
  statementBalance: number;
  bookBalance: number;
  difference: number;
  status: string;
  reconciledBy?: string;
  reconciledAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Reconciliation Item
 */
export interface ReconciliationItem {
  itemId: string;
  reconciliationId: string;
  transactionType: string;
  transactionDate: Date;
  description: string;
  amount: number;
  isCleared: boolean;
  referenceNumber?: string;
  createdAt: Date;
}

/**
 * Cash Position
 */
export interface CashPosition {
  positionId: string;
  asOfDate: Date;
  cashOnHand: number;
  cashInBank: number;
  totalCash: number;
  accountsReceivable: number;
  accountsPayable: number;
  netCash: number;
  createdAt: Date;
}

/**
 * Cash Flow Forecast
 */
export interface CashFlowForecast {
  forecastId: string;
  forecastDate: Date;
  category: 'OPERATING' | 'INVESTING' | 'FINANCING';
  forecastedInflow: number;
  forecastedOutflow: number;
  netFlow: number;
  notes?: string;
  createdAt: Date;
}

/**
 * Revenue Contract
 */
export interface RevenueContract {
  contractId: string;
  contractNumber: string;
  customerId: string;
  contractName: string;
  totalValue: number;
  startDate: Date;
  endDate: Date;
  recognitionMethod: RevenueRecognitionMethod;
  status: string;
  createdBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Revenue Milestone
 */
export interface RevenueMilestone {
  milestoneId: string;
  contractId: string;
  milestoneName: string;
  description?: string;
  targetAmount: number;
  achievedAmount: number;
  percentage: number;
  targetDate?: Date;
  achievedDate?: Date;
  status: string;
  createdAt: Date;
}

/**
 * Revenue Schedule
 */
export interface RevenueSchedule {
  scheduleId: string;
  contractId: string;
  revenueDate: Date;
  amount: number;
  recognizedAmount: number;
  remainingAmount: number;
  status: string;
  recognizedAt?: Date;
  createdAt: Date;
}

/**
 * Deferred Revenue
 */
export interface DeferredRevenue {
  deferralId: string;
  contractId?: string;
  originalAmount: number;
  remainingAmount: number;
  recognizedAmount: number;
  recognitionStartDate: Date;
  recognitionEndDate: Date;
  monthlyRecognitionAmount?: number;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// PHASE 3: ADVANCED TYPES
// ============================================================================

/**
 * Currency
 */
export interface Currency {
  currencyCode: string;
  currencyName: string;
  symbol: string;
  isActive: boolean;
  createdAt: Date;
}

/**
 * Exchange Rate
 */
export interface ExchangeRate {
  rateId: string;
  fromCurrency: string;
  toCurrency: string;
  rateDate: Date;
  exchangeRate: number;
  isActive: boolean;
  createdAt: Date;
}

/**
 * Currency Revaluation
 */
export interface CurrencyRevaluation {
  revaluationId: string;
  revaluationDate: Date;
  accountId: string;
  originalAmount: number;
  originalCurrency: string;
  baseCurrencyAmount: number;
  exchangeRate: number;
  gainLoss: number;
  createdBy?: string;
  createdAt: Date;
}

/**
 * Budget
 */
export interface Budget {
  budgetId: string;
  budgetName: string;
  fiscalYear: number;
  budgetType: string;
  status: string;
  createdBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Budget Line
 */
export interface BudgetLine {
  lineId: string;
  budgetId: string;
  accountId: string;
  period: string;
  budgetedAmount: number;
  actualAmount: number;
  variance: number;
  variancePercent: number;
  lastUpdated: Date;
  createdAt: Date;
}

/**
 * Forecast
 */
export interface Forecast {
  forecastId: string;
  forecastName: string;
  forecastType: string;
  startDate: Date;
  endDate: Date;
  createdBy?: string;
  createdAt: Date;
}

/**
 * Forecast Line
 */
export interface ForecastLine {
  lineId: string;
  forecastId: string;
  accountId: string;
  period: string;
  forecastedAmount: number;
  confidenceLevel: string;
  notes?: string;
  createdAt: Date;
}

/**
 * Fixed Asset
 */
export interface FixedAsset {
  assetId: string;
  assetNumber: string;
  assetName: string;
  assetCategory?: string;
  serialNumber?: string;
  purchaseDate: Date;
  purchaseCost: number;
  salvageValue: number;
  usefulLife: number;
  depreciationMethod: DepreciationMethod;
  currentBookValue?: number;
  accumulatedDepreciation: number;
  status: string;
  location?: string;
  assignedTo?: string;
  disposalDate?: Date;
  disposalValue?: number;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Depreciation Schedule
 */
export interface DepreciationSchedule {
  scheduleId: string;
  assetId: string;
  fiscalYear: number;
  fiscalPeriod: string;
  depreciationAmount: number;
  bookValueBeginning: number;
  bookValueEnding: number;
  accumulatedDepreciation: number;
  isDepreciated: boolean;
  calculatedAt: Date;
  createdAt: Date;
}

/**
 * Asset Disposal
 */
export interface AssetDisposal {
  disposalId: string;
  assetId: string;
  disposalDate: Date;
  disposalType: string;
  disposalValue: number;
  gainLoss: number;
  soldTo?: string;
  referenceNumber?: string;
  notes?: string;
  createdBy?: string;
  createdAt: Date;
}

/**
 * Audit Log
 */
export interface AuditLog {
  auditId: string;
  tableName: string;
  recordId: string;
  action: string;
  oldValues?: Record<string, unknown>;
  newValues?: Record<string, unknown>;
  changedBy?: string;
  changedAt: Date;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Document Attachment
 */
export interface DocumentAttachment {
  attachmentId: string;
  recordType: string;
  recordId: string;
  documentName: string;
  documentType?: string;
  filePath: string;
  fileSize?: number;
  mimeType?: string;
  uploadedBy?: string;
  uploadedAt: Date;
}

/**
 * Approval
 */
export interface Approval {
  approvalId: string;
  approvalType: string;
  recordId: string;
  status: string;
  requestedBy?: string;
  requestedAt: Date;
  approvedBy?: string;
  approvedAt?: Date;
  rejectedBy?: string;
  rejectedAt?: Date;
  comments?: string;
  createdAt: Date;
}

/**
 * Signature
 */
export interface Signature {
  signatureId: string;
  recordType: string;
  recordId: string;
  signedBy?: string;
  signatureData: string;
  signedAt: Date;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Fiscal Period
 */
export interface FiscalPeriod {
  periodId: string;
  fiscalYear: number;
  periodNumber: number;
  periodName: string;
  startDate: Date;
  endDate: Date;
  isClosed: boolean;
  closedBy?: string;
  closedAt?: Date;
  createdAt: Date;
}

/**
 * Closing Entry
 */
export interface ClosingEntry {
  closingId: string;
  periodId: string;
  journalEntryId?: string;
  entryType: 'OPENING' | 'CLOSING' | 'ADJUSTING';
  createdAt: Date;
}

// ============================================================================
// ERP ACCOUNTING DTOs
// ============================================================================

/**
 * Create Account DTO
 */
export interface CreateAccountDTO {
  accountCode: string;
  accountName: string;
  accountType: AccountType;
  parentAccountId?: string;
  normalBalance: 'D' | 'C';
  isHeader: boolean;
  description?: string;
}

/**
 * Update Account DTO
 */
export interface UpdateAccountDTO {
  accountName?: string;
  parentAccountId?: string;
  isActive?: boolean;
  description?: string;
}

/**
 * Create Journal Entry DTO
 */
export interface CreateJournalEntryDTO {
  entryNumber: string;
  entryDate: Date;
  fiscalPeriod: string;
  description: string;
  lines: Array<{
    lineNumber: number;
    accountId: string;
    description?: string;
    debitAmount: number;
    creditAmount: number;
    costCenter?: string;
    referenceType?: string;
    referenceId?: string;
  }>;
  createdBy?: string;
  notes?: string;
}

/**
 * Approve Journal Entry DTO
 */
export interface ApproveJournalEntryDTO {
  entryId: string;
  approvedBy: string;
}

/**
 * Post Journal Entry DTO
 */
export interface PostJournalEntryDTO {
  entryId: string;
}

/**
 * Reverse Journal Entry DTO
 */
export interface ReverseJournalEntryDTO {
  entryId: string;
  reason: string;
  reversedBy: string;
}

/**
 * Get Trial Balance DTO
 */
export interface GetTrialBalanceDTO {
  asOfDate: Date;
}

/**
 * Get Balance Sheet DTO
 */
export interface GetBalanceSheetDTO {
  asOfDate: Date;
}

/**
 * Get Cash Flow DTO
 */
export interface GetCashFlowDTO {
  startDate: Date;
  endDate: Date;
}

/**
 * Apply Payment DTO
 */
export interface ApplyPaymentDTO {
  receivableId: string;
  paymentDate: Date;
  paymentMethod?: string;
  amount: number;
  referenceNumber?: string;
  notes?: string;
  createdBy: string;
}

/**
 * Create Credit Memo DTO
 */
export interface CreateCreditMemoDTO {
  receivableId?: string;
  memoNumber: string;
  memoDate: Date;
  reason: string;
  amount: number;
  createdBy: string;
}

/**
 * Create Bank Reconciliation DTO
 */
export interface CreateBankReconciliationDTO {
  bankAccountId: string;
  statementDate: Date;
  statementBalance: number;
  bookBalance: number;
  createdBy: string;
}

/**
 * Create Revenue Contract DTO
 */
export interface CreateRevenueContractDTO {
  contractNumber: string;
  customerId: string;
  contractName: string;
  totalValue: number;
  startDate: Date;
  endDate: Date;
  recognitionMethod: RevenueRecognitionMethod;
  createdBy: string;
}

/**
 * Create Fixed Asset DTO
 */
export interface CreateFixedAssetDTO {
  assetNumber: string;
  assetName: string;
  assetCategory?: string;
  serialNumber?: string;
  purchaseDate: Date;
  purchaseCost: number;
  salvageValue: number;
  usefulLife: number;
  depreciationMethod: DepreciationMethod;
  location?: string;
  assignedTo?: string;
}

/**
 * Create Budget DTO
 */
export interface CreateBudgetDTO {
  budgetName: string;
  fiscalYear: number;
  budgetType: string;
  lines: Array<{
    accountId: string;
    period: string;
    budgetedAmount: number;
  }>;
  createdBy: string;
}

/**
 * Create Forecast DTO
 */
export interface CreateForecastDTO {
  forecastName: string;
  forecastType: string;
  startDate: Date;
  endDate: Date;
  lines: Array<{
    accountId: string;
    period: string;
    forecastedAmount: number;
    confidenceLevel: string;
    notes?: string;
  }>;
  createdBy: string;
}
