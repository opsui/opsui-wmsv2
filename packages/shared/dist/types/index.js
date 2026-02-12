/**
 * Core domain types for the Warehouse Management System
 *
 * This file defines the canonical domain model.
 * All types here must align with the database schema.
 */
// ============================================================================
// ENUMS
// ============================================================================
export var OrderStatus;
(function (OrderStatus) {
    OrderStatus["PENDING"] = "PENDING";
    OrderStatus["PICKING"] = "PICKING";
    OrderStatus["PICKED"] = "PICKED";
    OrderStatus["PACKING"] = "PACKING";
    OrderStatus["PACKED"] = "PACKED";
    OrderStatus["SHIPPED"] = "SHIPPED";
    OrderStatus["CANCELLED"] = "CANCELLED";
    OrderStatus["BACKORDER"] = "BACKORDER";
})(OrderStatus || (OrderStatus = {}));
export var OrderPriority;
(function (OrderPriority) {
    OrderPriority["LOW"] = "LOW";
    OrderPriority["NORMAL"] = "NORMAL";
    OrderPriority["HIGH"] = "HIGH";
    OrderPriority["URGENT"] = "URGENT";
})(OrderPriority || (OrderPriority = {}));
export var OrderItemStatus;
(function (OrderItemStatus) {
    OrderItemStatus["PENDING"] = "PENDING";
    OrderItemStatus["PARTIAL_PICKED"] = "PARTIAL_PICKED";
    OrderItemStatus["FULLY_PICKED"] = "FULLY_PICKED";
})(OrderItemStatus || (OrderItemStatus = {}));
export var TaskStatus;
(function (TaskStatus) {
    TaskStatus["NOT_STARTED"] = "NOT_STARTED";
    TaskStatus["PENDING"] = "PENDING";
    TaskStatus["IN_PROGRESS"] = "IN_PROGRESS";
    TaskStatus["COMPLETED"] = "COMPLETED";
    TaskStatus["ON_HOLD"] = "ON_HOLD";
    TaskStatus["CANCELLED"] = "CANCELLED";
    TaskStatus["SKIPPED"] = "SKIPPED";
})(TaskStatus || (TaskStatus = {}));
export var WorkType;
(function (WorkType) {
    WorkType["REGULAR"] = "REGULAR";
    WorkType["OVERTIME_1_5"] = "OVERTIME_1_5";
    WorkType["OVERTIME_2_0"] = "OVERTIME_2_0";
    WorkType["TRAVEL"] = "TRAVEL";
    WorkType["TRAINING"] = "TRAINING";
})(WorkType || (WorkType = {}));
export var UserRole;
(function (UserRole) {
    UserRole["PICKER"] = "PICKER";
    UserRole["PACKER"] = "PACKER";
    UserRole["STOCK_CONTROLLER"] = "STOCK_CONTROLLER";
    UserRole["INWARDS"] = "INWARDS";
    UserRole["DISPATCH"] = "DISPATCH";
    UserRole["SUPERVISOR"] = "SUPERVISOR";
    UserRole["ADMIN"] = "ADMIN";
    UserRole["PRODUCTION"] = "PRODUCTION";
    UserRole["SALES"] = "SALES";
    UserRole["MAINTENANCE"] = "MAINTENANCE";
    UserRole["RMA"] = "RMA";
    UserRole["ACCOUNTING"] = "ACCOUNTING";
    UserRole["HR_MANAGER"] = "HR_MANAGER";
    UserRole["HR_ADMIN"] = "HR_ADMIN";
})(UserRole || (UserRole = {}));
/**
 * Permissions - Granular access control for custom roles
 * Each permission represents a specific capability in the system
 */
export var Permission;
(function (Permission) {
    // Order Management
    Permission["VIEW_ORDERS"] = "view_orders";
    Permission["CREATE_ORDERS"] = "create_orders";
    Permission["EDIT_ORDERS"] = "edit_orders";
    Permission["DELETE_ORDERS"] = "delete_orders";
    Permission["ASSIGN_ORDERS"] = "assign_orders";
    // Picking Operations
    Permission["VIEW_PICK_TASKS"] = "view_pick_tasks";
    Permission["CLAIM_PICK_TASK"] = "claim_pick_task";
    Permission["COMPLETE_PICK_TASK"] = "complete_pick_task";
    Permission["SKIP_PICK_TASK"] = "skip_pick_task";
    // Packing Operations
    Permission["VIEW_PACK_TASKS"] = "view_pack_tasks";
    Permission["CLAIM_PACK_TASK"] = "claim_pack_task";
    Permission["COMPLETE_PACK_TASK"] = "complete_pack_task";
    // Inventory Management
    Permission["VIEW_INVENTORY"] = "view_inventory";
    Permission["ADJUST_INVENTORY"] = "adjust_inventory";
    Permission["VIEW_STOCK_MOVEMENTS"] = "view_stock_movements";
    // Stock Control
    Permission["PERFORM_CYCLE_COUNTS"] = "perform_cycle_counts";
    Permission["APPROVE_CYCLE_COUNTS"] = "approve_cycle_counts";
    Permission["MANAGE_LOCATIONS"] = "manage_locations";
    Permission["VIEW_LOCATION_CAPACITY"] = "view_location_capacity";
    // Inwards/Receiving
    Permission["PROCESS_RECEIPTS"] = "process_receipts";
    Permission["MANAGE_PUTAWAYS"] = "manage_putaways";
    // Reporting & Analytics
    Permission["VIEW_REPORTS"] = "view_reports";
    Permission["GENERATE_REPORTS"] = "generate_reports";
    Permission["EXPORT_DATA"] = "export_data";
    // User Management
    Permission["VIEW_USERS"] = "view_users";
    Permission["CREATE_USERS"] = "create_users";
    Permission["EDIT_USERS"] = "edit_users";
    Permission["DELETE_USERS"] = "delete_users";
    Permission["MANAGE_USER_ROLES"] = "manage_user_roles";
    Permission["MANAGE_CUSTOM_ROLES"] = "manage_custom_roles";
    // Exceptions Management
    Permission["VIEW_EXCEPTIONS"] = "view_exceptions";
    Permission["RESOLVE_EXCEPTIONS"] = "resolve_exceptions";
    Permission["APPROVE_EXCEPTION_RESOLUTIONS"] = "approve_exception_resolutions";
    // Business Rules
    Permission["VIEW_BUSINESS_RULES"] = "view_business_rules";
    Permission["MANAGE_BUSINESS_RULES"] = "manage_business_rules";
    // Settings & Configuration
    Permission["VIEW_SETTINGS"] = "view_settings";
    Permission["MANAGE_INTEGRATIONS"] = "manage_integrations";
    // Quality Control
    Permission["PERFORM_QC_CHECKS"] = "perform_qc_checks";
    Permission["APPROVE_QC_RESULTS"] = "approve_qc_results";
    // Production
    Permission["VIEW_PRODUCTION_TASKS"] = "view_production_tasks";
    Permission["MANAGE_PRODUCTION"] = "manage_production";
    // Sales
    Permission["VIEW_SALES_ORDERS"] = "view_sales_orders";
    Permission["MANAGE_SALES"] = "manage_sales";
    // Maintenance
    Permission["VIEW_MAINTENANCE_TASKS"] = "view_maintenance_tasks";
    Permission["MANAGE_MAINTENANCE"] = "manage_maintenance";
    // RMA (Returns)
    Permission["VIEW_RMA_REQUESTS"] = "view_rma_requests";
    Permission["PROCESS_RMA"] = "process_rma";
    // Dispatch/Shipping
    Permission["VIEW_SHIPMENTS"] = "view_shipments";
    Permission["CREATE_SHIPMENTS"] = "create_shipments";
    Permission["CANCEL_SHIPMENTS"] = "cancel_shipments";
    // Accounting/Financials
    Permission["VIEW_FINANCIALS"] = "view_financials";
    Permission["MANAGE_FINANCIALS"] = "manage_financials";
    Permission["EXPORT_FINANCIALS"] = "export_financials";
    Permission["MANAGE_TRANSACTIONS"] = "manage_transactions";
    // HR & Payroll
    Permission["VIEW_EMPLOYEES"] = "view_employees";
    Permission["MANAGE_EMPLOYEES"] = "manage_employees";
    Permission["VIEW_TIMESHEETS"] = "view_timesheets";
    Permission["SUBMIT_TIMESHEETS"] = "submit_timesheets";
    Permission["APPROVE_TIMESHEETS"] = "approve_timesheets";
    Permission["VIEW_PAYROLL"] = "view_payroll";
    Permission["PROCESS_PAYROLL"] = "process_payroll";
    Permission["VIEW_LEAVE_REQUESTS"] = "view_leave_requests";
    Permission["MANAGE_LEAVE_REQUESTS"] = "manage_leave_requests";
    Permission["MANAGE_LEAVE_BALANCES"] = "manage_leave_balances";
    Permission["VIEW_HR_REPORTS"] = "view_hr_reports";
    Permission["MANAGE_HR_SETTINGS"] = "manage_hr_settings";
    // Admin Full Access
    Permission["ADMIN_FULL_ACCESS"] = "admin_full_access";
})(Permission || (Permission = {}));
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
    HR: [
        Permission.VIEW_EMPLOYEES,
        Permission.MANAGE_EMPLOYEES,
        Permission.VIEW_TIMESHEETS,
        Permission.APPROVE_TIMESHEETS,
        Permission.VIEW_PAYROLL,
        Permission.PROCESS_PAYROLL,
        Permission.VIEW_LEAVE_REQUESTS,
        Permission.MANAGE_LEAVE_REQUESTS,
        Permission.MANAGE_LEAVE_BALANCES,
        Permission.VIEW_HR_REPORTS,
        Permission.MANAGE_HR_SETTINGS,
    ],
};
/**
 * Default permissions for each predefined role
 */
export const DEFAULT_ROLE_PERMISSIONS = {
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
    [UserRole.HR_MANAGER]: [
        Permission.VIEW_EMPLOYEES,
        Permission.MANAGE_EMPLOYEES,
        Permission.VIEW_TIMESHEETS,
        Permission.APPROVE_TIMESHEETS,
        Permission.VIEW_PAYROLL,
        Permission.PROCESS_PAYROLL,
        Permission.VIEW_LEAVE_REQUESTS,
        Permission.MANAGE_LEAVE_REQUESTS,
        Permission.MANAGE_LEAVE_BALANCES,
        Permission.VIEW_HR_REPORTS,
        Permission.VIEW_REPORTS,
    ],
    [UserRole.HR_ADMIN]: [
        Permission.VIEW_EMPLOYEES,
        Permission.MANAGE_EMPLOYEES,
        Permission.VIEW_TIMESHEETS,
        Permission.APPROVE_TIMESHEETS,
        Permission.VIEW_PAYROLL,
        Permission.PROCESS_PAYROLL,
        Permission.VIEW_LEAVE_REQUESTS,
        Permission.MANAGE_LEAVE_REQUESTS,
        Permission.MANAGE_LEAVE_BALANCES,
        Permission.VIEW_HR_REPORTS,
        Permission.MANAGE_HR_SETTINGS,
        Permission.VIEW_REPORTS,
        Permission.EXPORT_DATA,
    ],
};
export var BinType;
(function (BinType) {
    BinType["SHELF"] = "SHELF";
    BinType["FLOOR"] = "FLOOR";
    BinType["RACK"] = "RACK";
    BinType["BIN"] = "BIN";
})(BinType || (BinType = {}));
export var TransactionType;
(function (TransactionType) {
    TransactionType["RESERVATION"] = "RESERVATION";
    TransactionType["DEDUCTION"] = "DEDUCTION";
    TransactionType["CANCELLATION"] = "CANCELLATION";
    TransactionType["ADJUSTMENT"] = "ADJUSTMENT";
    TransactionType["RECEIPT"] = "RECEIPT";
})(TransactionType || (TransactionType = {}));
/**
 * Order Exception Types
 * Categories of issues that can occur during order fulfillment
 */
export var ExceptionType;
(function (ExceptionType) {
    ExceptionType["UNCLAIM"] = "UNCLAIM";
    ExceptionType["UNDO_PICK"] = "UNDO_PICK";
    ExceptionType["SHORT_PICK"] = "SHORT_PICK";
    ExceptionType["SHORT_PICK_BACKORDER"] = "SHORT_PICK_BACKORDER";
    ExceptionType["DAMAGE"] = "DAMAGE";
    ExceptionType["DEFECTIVE"] = "DEFECTIVE";
    ExceptionType["WRONG_ITEM"] = "WRONG_ITEM";
    ExceptionType["SUBSTITUTION"] = "SUBSTITUTION";
    ExceptionType["OUT_OF_STOCK"] = "OUT_OF_STOCK";
    ExceptionType["BIN_MISMATCH"] = "BIN_MISMATCH";
    ExceptionType["BARCODE_MISMATCH"] = "BARCODE_MISMATCH";
    ExceptionType["EXPIRED"] = "EXPIRED";
    ExceptionType["OTHER"] = "OTHER";
})(ExceptionType || (ExceptionType = {}));
/**
 * Order Exception Status
 * Lifecycle states for exception handling
 */
export var ExceptionStatus;
(function (ExceptionStatus) {
    ExceptionStatus["OPEN"] = "OPEN";
    ExceptionStatus["REVIEWING"] = "REVIEWING";
    ExceptionStatus["APPROVED"] = "APPROVED";
    ExceptionStatus["REJECTED"] = "REJECTED";
    ExceptionStatus["RESOLVED"] = "RESOLVED";
    ExceptionStatus["CANCELLED"] = "CANCELLED";
})(ExceptionStatus || (ExceptionStatus = {}));
/**
 * Exception Resolution Actions
 * Standard actions for resolving exceptions
 */
export var ExceptionResolution;
(function (ExceptionResolution) {
    ExceptionResolution["BACKORDER"] = "BACKORDER";
    ExceptionResolution["SUBSTITUTE"] = "SUBSTITUTE";
    ExceptionResolution["CANCEL_ITEM"] = "CANCEL_ITEM";
    ExceptionResolution["CANCEL_ORDER"] = "CANCEL_ORDER";
    ExceptionResolution["ADJUST_QUANTITY"] = "ADJUST_QUANTITY";
    ExceptionResolution["RETURN_TO_STOCK"] = "RETURN_TO_STOCK";
    ExceptionResolution["WRITE_OFF"] = "WRITE_OFF";
    ExceptionResolution["TRANSFER_BIN"] = "TRANSFER_BIN";
    ExceptionResolution["CONTACT_CUSTOMER"] = "CONTACT_CUSTOMER";
    ExceptionResolution["MANUAL_OVERRIDE"] = "MANUAL_OVERRIDE";
})(ExceptionResolution || (ExceptionResolution = {}));
// ============================================================================
// ERROR TYPES
// ============================================================================
export class WMSError extends Error {
    code;
    statusCode;
    details;
    constructor(code, statusCode, message, details) {
        super(message);
        this.code = code;
        this.statusCode = statusCode;
        this.details = details;
        this.name = 'WMSError';
    }
}
export class InventoryError extends WMSError {
    constructor(message, details) {
        super('INVENTORY_ERROR', 409, message, details);
    }
}
export class ValidationError extends WMSError {
    constructor(message, details) {
        super('VALIDATION_ERROR', 400, message, details);
    }
}
export class NotFoundError extends WMSError {
    constructor(resource, id) {
        super('NOT_FOUND', 404, `${resource}${id !== undefined ? ` (${id})` : ''} not found`);
    }
}
export class ConflictError extends WMSError {
    constructor(message, details) {
        super('CONFLICT', 409, message, details);
    }
}
export class UnauthorizedError extends WMSError {
    constructor(message = 'Unauthorized') {
        super('UNAUTHORIZED', 401, message);
    }
}
export class ForbiddenError extends WMSError {
    constructor(message = 'Forbidden') {
        super('FORBIDDEN', 403, message);
    }
}
// ============================================================================
// INBOUND RECEIVING TYPES
// ============================================================================
/**
 * ASN Status - Advance Shipping Notice lifecycle
 */
export var ASNStatus;
(function (ASNStatus) {
    ASNStatus["PENDING"] = "PENDING";
    ASNStatus["IN_TRANSIT"] = "IN_TRANSIT";
    ASNStatus["RECEIVED"] = "RECEIVED";
    ASNStatus["PARTIALLY_RECEIVED"] = "PARTIALLY_RECEIVED";
    ASNStatus["CANCELLED"] = "CANCELLED";
})(ASNStatus || (ASNStatus = {}));
/**
 * Receipt Type - Type of receipt
 */
export var ReceiptType;
(function (ReceiptType) {
    ReceiptType["PO"] = "PO";
    ReceiptType["RETURN"] = "RETURN";
    ReceiptType["TRANSFER"] = "TRANSFER";
    ReceiptType["ADJUSTMENT"] = "ADJUSTMENT";
})(ReceiptType || (ReceiptType = {}));
/**
 * Receipt Status - Receipt lifecycle
 */
export var ReceiptStatus;
(function (ReceiptStatus) {
    ReceiptStatus["RECEIVING"] = "RECEIVING";
    ReceiptStatus["COMPLETED"] = "COMPLETED";
    ReceiptStatus["CANCELLED"] = "CANCELLED";
})(ReceiptStatus || (ReceiptStatus = {}));
/**
 * Quality Status - Quality check status for received items
 */
export var QualityStatus;
(function (QualityStatus) {
    QualityStatus["PENDING"] = "PENDING";
    QualityStatus["PASSED"] = "PASSED";
    QualityStatus["FAILED"] = "FAILED";
    QualityStatus["PARTIAL"] = "PARTIAL";
})(QualityStatus || (QualityStatus = {}));
/**
 * Putaway Status - Putaway task lifecycle
 */
export var PutawayStatus;
(function (PutawayStatus) {
    PutawayStatus["PENDING"] = "PENDING";
    PutawayStatus["IN_PROGRESS"] = "IN_PROGRESS";
    PutawayStatus["COMPLETED"] = "COMPLETED";
    PutawayStatus["CANCELLED"] = "CANCELLED";
})(PutawayStatus || (PutawayStatus = {}));
/**
 * ASN Line Status - Receiving status for ASN line items
 */
export var ASNLineStatus;
(function (ASNLineStatus) {
    ASNLineStatus["PENDING"] = "PENDING";
    ASNLineStatus["PARTIALLY_RECEIVED"] = "PARTIALLY_RECEIVED";
    ASNLineStatus["FULLY_RECEIVED"] = "FULLY_RECEIVED";
    ASNLineStatus["CANCELLED"] = "CANCELLED";
})(ASNLineStatus || (ASNLineStatus = {}));
// ============================================================================
// LICENSE PLATING TYPES
// ============================================================================
/**
 * License Plate Status
 */
export var LicensePlateStatus;
(function (LicensePlateStatus) {
    LicensePlateStatus["OPEN"] = "OPEN";
    LicensePlateStatus["SEALED"] = "SEALED";
    LicensePlateStatus["IN_QC"] = "IN_QC";
    LicensePlateStatus["QC_PASSED"] = "QC_PASSED";
    LicensePlateStatus["QC_FAILED"] = "QC_FAILED";
    LicensePlateStatus["IN_STAGING"] = "IN_STAGING";
    LicensePlateStatus["PUTAWAY_PARTIAL"] = "PUTAWAY_PARTIAL";
    LicensePlateStatus["PUTAWAY_COMPLETE"] = "PUTAWAY_COMPLETE";
    LicensePlateStatus["CLOSED"] = "CLOSED";
})(LicensePlateStatus || (LicensePlateStatus = {}));
// ============================================================================
// STAGING LOCATION TYPES
// ============================================================================
/**
 * Staging Location Status
 */
export var StagingLocationStatus;
(function (StagingLocationStatus) {
    StagingLocationStatus["AVAILABLE"] = "AVAILABLE";
    StagingLocationStatus["OCCUPIED"] = "OCCUPIED";
    StagingLocationStatus["RESERVED"] = "RESERVED";
    StagingLocationStatus["BLOCKED"] = "BLOCKED";
})(StagingLocationStatus || (StagingLocationStatus = {}));
// ============================================================================
// RECEIVING EXCEPTION TYPES
// ============================================================================
/**
 * Receiving Exception Type - Categories of receiving discrepancies
 */
export var ReceivingExceptionType;
(function (ReceivingExceptionType) {
    ReceivingExceptionType["SHORT_RECEIPT"] = "SHORT_RECEIPT";
    ReceivingExceptionType["OVER_RECEIPT"] = "OVER_RECEIPT";
    ReceivingExceptionType["DAMAGED"] = "DAMAGED";
    ReceivingExceptionType["DEFECTIVE"] = "DEFECTIVE";
    ReceivingExceptionType["WRONG_ITEM"] = "WRONG_ITEM";
    ReceivingExceptionType["NO_ASN"] = "NO_ASN";
    ReceivingExceptionType["LABEL_MISMATCH"] = "LABEL_MISMATCH";
    ReceivingExceptionType["EXPIRED"] = "EXPIRED";
    ReceivingExceptionType["NEAR_EXPIRY"] = "NEAR_EXPIRY";
    ReceivingExceptionType["MISSING_SERIAL"] = "MISSING_SERIAL";
    ReceivingExceptionType["DUPLICATE_SERIAL"] = "DUPLICATE_SERIAL";
    ReceivingExceptionType["WRONG_LOT"] = "WRONG_LOT";
    ReceivingExceptionType["OTHER"] = "OTHER";
})(ReceivingExceptionType || (ReceivingExceptionType = {}));
/**
 * Receiving Exception Status
 */
export var ReceivingExceptionStatus;
(function (ReceivingExceptionStatus) {
    ReceivingExceptionStatus["OPEN"] = "OPEN";
    ReceivingExceptionStatus["INVESTIGATING"] = "INVESTIGATING";
    ReceivingExceptionStatus["AWAITING_DECISION"] = "AWAITING_DECISION";
    ReceivingExceptionStatus["RESOLVED"] = "RESOLVED";
    ReceivingExceptionStatus["CANCELLED"] = "CANCELLED";
})(ReceivingExceptionStatus || (ReceivingExceptionStatus = {}));
/**
 * Receiving Exception Resolution
 */
export var ReceivingExceptionResolution;
(function (ReceivingExceptionResolution) {
    ReceivingExceptionResolution["ACCEPT_QUANTITY"] = "ACCEPT_QUANTITY";
    ReceivingExceptionResolution["RETURN_TO_VENDOR"] = "RETURN_TO_VENDOR";
    ReceivingExceptionResolution["WRITE_OFF"] = "WRITE_OFF";
    ReceivingExceptionResolution["REQUEST_CREDIT"] = "REQUEST_CREDIT";
    ReceivingExceptionResolution["KEEP_AT_DISCOUNT"] = "KEEP_AT_DISCOUNT";
    ReceivingExceptionResolution["QUARANTINE"] = "QUARANTINE";
    ReceivingExceptionResolution["REJECT_SHIPMENT"] = "REJECT_SHIPMENT";
    ReceivingExceptionResolution["ADJUST_PO"] = "ADJUST_PO";
})(ReceivingExceptionResolution || (ReceivingExceptionResolution = {}));
// ============================================================================
// SHIPPING TYPES
// ============================================================================
/**
 * Shipment Status - Lifecycle states for shipments
 */
export var ShipmentStatus;
(function (ShipmentStatus) {
    ShipmentStatus["PENDING"] = "PENDING";
    ShipmentStatus["LABEL_CREATED"] = "LABEL_CREATED";
    ShipmentStatus["SHIPPED"] = "SHIPPED";
    ShipmentStatus["IN_TRANSIT"] = "IN_TRANSIT";
    ShipmentStatus["OUT_FOR_DELIVERY"] = "OUT_FOR_DELIVERY";
    ShipmentStatus["DELIVERED"] = "DELIVERED";
    ShipmentStatus["EXCEPTION"] = "EXCEPTION";
    ShipmentStatus["CANCELLED"] = "CANCELLED";
})(ShipmentStatus || (ShipmentStatus = {}));
/**
 * Label Format - Format types for shipping labels
 */
export var LabelFormat;
(function (LabelFormat) {
    LabelFormat["PDF"] = "PDF";
    LabelFormat["PNG"] = "PNG";
    LabelFormat["ZPLII"] = "ZPLII";
    LabelFormat["EPL2"] = "EPL2";
})(LabelFormat || (LabelFormat = {}));
// ============================================================================
// CYCLE COUNTING TYPES
// ============================================================================
/**
 * Cycle Count Status - Lifecycle states for cycle counts
 */
export var CycleCountStatus;
(function (CycleCountStatus) {
    CycleCountStatus["SCHEDULED"] = "SCHEDULED";
    CycleCountStatus["IN_PROGRESS"] = "IN_PROGRESS";
    CycleCountStatus["COMPLETED"] = "COMPLETED";
    CycleCountStatus["CANCELLED"] = "CANCELLED";
    CycleCountStatus["RECONCILED"] = "RECONCILED";
})(CycleCountStatus || (CycleCountStatus = {}));
/**
 * Cycle Count Type - Different types of cycle counts
 */
export var CycleCountType;
(function (CycleCountType) {
    CycleCountType["ABC"] = "ABC";
    CycleCountType["BLANKET"] = "BLANKET";
    CycleCountType["SPOT_CHECK"] = "SPOT_CHECK";
    CycleCountType["RECEIVING"] = "RECEIVING";
    CycleCountType["SHIPPING"] = "SHIPPING";
    CycleCountType["AD_HOC"] = "AD_HOC";
})(CycleCountType || (CycleCountType = {}));
/**
 * Count Variance Status - Status of variance resolution
 */
export var VarianceStatus;
(function (VarianceStatus) {
    VarianceStatus["PENDING"] = "PENDING";
    VarianceStatus["APPROVED"] = "APPROVED";
    VarianceStatus["REJECTED"] = "REJECTED";
    VarianceStatus["AUTO_ADJUSTED"] = "AUTO_ADJUSTED";
})(VarianceStatus || (VarianceStatus = {}));
/**
 * Automation Task Type
 */
export var AutomationTaskType;
(function (AutomationTaskType) {
    AutomationTaskType["CYCLE_COUNT"] = "CYCLE_COUNT";
    AutomationTaskType["INVENTORY_CHECK"] = "INVENTORY_CHECK";
    AutomationTaskType["PICK"] = "PICK";
    AutomationTaskType["PUTAWAY"] = "PUTAWAY";
    AutomationTaskType["REPLENISHMENT"] = "REPLENISHMENT";
})(AutomationTaskType || (AutomationTaskType = {}));
/**
 * Automation Task Status
 */
export var AutomationTaskStatus;
(function (AutomationTaskStatus) {
    AutomationTaskStatus["PENDING"] = "PENDING";
    AutomationTaskStatus["ASSIGNED"] = "ASSIGNED";
    AutomationTaskStatus["IN_PROGRESS"] = "IN_PROGRESS";
    AutomationTaskStatus["COMPLETED"] = "COMPLETED";
    AutomationTaskStatus["FAILED"] = "FAILED";
    AutomationTaskStatus["CANCELLED"] = "CANCELLED";
})(AutomationTaskStatus || (AutomationTaskStatus = {}));
// ============================================================================
// UNIT HIERARCHY TYPES
// ============================================================================
/**
 * Unit Level - Hierarchy level for inventory units
 */
export var UnitLevel;
(function (UnitLevel) {
    UnitLevel["PALLET"] = "PALLET";
    UnitLevel["CASE"] = "CASE";
    UnitLevel["EACH"] = "EACH";
})(UnitLevel || (UnitLevel = {}));
// ============================================================================
// LOCATION CAPACITY TYPES
// ============================================================================
/**
 * Capacity Type - Type of capacity constraint
 */
export var CapacityType;
(function (CapacityType) {
    CapacityType["WEIGHT"] = "WEIGHT";
    CapacityType["VOLUME"] = "VOLUME";
    CapacityType["QUANTITY"] = "QUANTITY";
})(CapacityType || (CapacityType = {}));
/**
 * Capacity Unit - Units for capacity measurement
 */
export var CapacityUnit;
(function (CapacityUnit) {
    CapacityUnit["LBS"] = "LBS";
    CapacityUnit["KG"] = "KG";
    CapacityUnit["CUBIC_FT"] = "CUBIC_FT";
    CapacityUnit["CUBIC_M"] = "CUBIC_M";
    CapacityUnit["UNITS"] = "UNITS";
    CapacityUnit["PALLET"] = "PALLET";
})(CapacityUnit || (CapacityUnit = {}));
/**
 * Capacity Rule Status - Status of capacity rule
 */
export var CapacityRuleStatus;
(function (CapacityRuleStatus) {
    CapacityRuleStatus["ACTIVE"] = "ACTIVE";
    CapacityRuleStatus["INACTIVE"] = "INACTIVE";
    CapacityRuleStatus["WARNING"] = "WARNING";
    CapacityRuleStatus["EXCEEDED"] = "EXCEEDED";
})(CapacityRuleStatus || (CapacityRuleStatus = {}));
// ============================================================================
// QUALITY CONTROL TYPES
// ============================================================================
/**
 * Inspection Status - Quality inspection lifecycle
 */
export var InspectionStatus;
(function (InspectionStatus) {
    InspectionStatus["PENDING"] = "PENDING";
    InspectionStatus["IN_PROGRESS"] = "IN_PROGRESS";
    InspectionStatus["PASSED"] = "PASSED";
    InspectionStatus["FAILED"] = "FAILED";
    InspectionStatus["CONDITIONAL_PASSED"] = "CONDITIONAL_PASSED";
    InspectionStatus["CANCELLED"] = "CANCELLED";
})(InspectionStatus || (InspectionStatus = {}));
/**
 * Inspection Type - Type of quality inspection
 */
export var InspectionType;
(function (InspectionType) {
    InspectionType["INCOMING"] = "INCOMING";
    InspectionType["OUTGOING"] = "OUTGOING";
    InspectionType["INVENTORY"] = "INVENTORY";
    InspectionType["QUALITY_HOLD"] = "QUALITY_HOLD";
    InspectionType["RETURN"] = "RETURN";
    InspectionType["DAMAGE"] = "DAMAGE";
    InspectionType["EXPIRATION"] = "EXPIRATION";
    InspectionType["SPECIAL"] = "SPECIAL";
})(InspectionType || (InspectionType = {}));
/**
 * Defect Type - Types of quality defects
 */
export var DefectType;
(function (DefectType) {
    DefectType["DAMAGED"] = "DAMAGED";
    DefectType["DEFECTIVE"] = "DEFECTIVE";
    DefectType["MISSING_PARTS"] = "MISSING_PARTS";
    DefectType["WRONG_ITEM"] = "WRONG_ITEM";
    DefectType["EXPIRED"] = "EXPIRED";
    DefectType["NEAR_EXPIRY"] = "NEAR_EXPIRY";
    DefectType["MISLABELED"] = "MISLABELED";
    DefectType["PACKAGING"] = "PACKAGING";
    DefectType["CONTAMINATED"] = "CONTAMINATED";
    DefectType["OTHER"] = "OTHER";
})(DefectType || (DefectType = {}));
/**
 * Disposition Action - Actions for failed inspections
 */
export var DispositionAction;
(function (DispositionAction) {
    DispositionAction["RETURN_TO_VENDOR"] = "RETURN_TO_VENDOR";
    DispositionAction["SCRAP"] = "SCRAP";
    DispositionAction["REWORK"] = "REWORK";
    DispositionAction["QUARANTINE"] = "QUARANTINE";
    DispositionAction["SELL_AS_IS"] = "SELL_AS_IS";
    DispositionAction["DISCOUNT"] = "DISCOUNT";
    DispositionAction["DONATE"] = "DONATE";
    DispositionAction["CUSTOMER_RETURN"] = "CUSTOMER_RETURN";
    DispositionAction["OTHER"] = "OTHER";
})(DispositionAction || (DispositionAction = {}));
// ============================================================================
// NZC (NZ COURIERS) API TYPES
// ============================================================================
/**
 * NZC Label Format options
 */
export var NZCLabelFormat;
(function (NZCLabelFormat) {
    NZCLabelFormat["PNG_100X175"] = "LABEL_PNG_100X175";
    NZCLabelFormat["PNG_100X150"] = "LABEL_PNG_100X150";
    NZCLabelFormat["PDF_100X175"] = "LABEL_PDF_100X175";
    NZCLabelFormat["PDF"] = "LABEL_PDF";
})(NZCLabelFormat || (NZCLabelFormat = {}));
// ============================================================================
// PHASE 3: ADVANCED FEATURES - EXPORTS
// ============================================================================
// Export all Phase 3 types
export * from './business-rules.js';
export * from './reporting.js';
export * from './integrations.js';
// ============================================================================
// ADD-ON MODULES - EXPORTS
// ============================================================================
// Export all add-on module types
export * from './production.js';
export * from './sales-crm.js';
export * from './maintenance.js';
// ============================================================================
// ENHANCED INBOUND FEATURES EXPORTS
// ============================================================================
// Note: All new inbound types are already exported via their original declarations
// ============================================================================
// NOTIFICATION SYSTEM - EXPORTS
// ============================================================================
// Export notification types
export * from './notifications.js';
// ============================================================================
// ACCOUNTING & FINANCIAL TYPES
// ============================================================================
/**
 * Accounting Period
 */
export var AccountingPeriod;
(function (AccountingPeriod) {
    AccountingPeriod["DAILY"] = "DAILY";
    AccountingPeriod["WEEKLY"] = "WEEKLY";
    AccountingPeriod["MONTHLY"] = "MONTHLY";
    AccountingPeriod["QUARTERLY"] = "QUARTERLY";
    AccountingPeriod["YEARLY"] = "YEARLY";
})(AccountingPeriod || (AccountingPeriod = {}));
/**
 * Cost Category
 */
export var CostCategory;
(function (CostCategory) {
    CostCategory["LABOR"] = "LABOR";
    CostCategory["MATERIALS"] = "MATERIALS";
    CostCategory["SHIPPING"] = "SHIPPING";
    CostCategory["STORAGE"] = "STORAGE";
    CostCategory["OVERHEAD"] = "OVERHEAD";
    CostCategory["EXCEPTIONS"] = "EXCEPTIONS";
    CostCategory["QUALITY_CONTROL"] = "QUALITY_CONTROL";
    CostCategory["MAINTENANCE"] = "MAINTENANCE";
})(CostCategory || (CostCategory = {}));
/**
 * Revenue Category
 */
export var RevenueCategory;
(function (RevenueCategory) {
    RevenueCategory["SALES"] = "SALES";
    RevenueCategory["RESTOCKING_FEES"] = "RESTOCKING_FEES";
    RevenueCategory["SERVICE_FEES"] = "SERVICE_FEES";
    RevenueCategory["OTHER"] = "OTHER";
})(RevenueCategory || (RevenueCategory = {}));
/**
 * Transaction Log
 */
(function (TransactionType) {
    TransactionType["SALE"] = "SALE";
    TransactionType["REFUND"] = "REFUND";
    TransactionType["CREDIT_RECEIVED"] = "CREDIT_RECEIVED";
    TransactionType["CREDIT_ISSUED"] = "CREDIT_ISSUED";
    TransactionType["WRITE_OFF"] = "WRITE_OFF";
    TransactionType["PAYMENT_RECEIVED"] = "PAYMENT_RECEIVED";
    TransactionType["PAYMENT_MADE"] = "PAYMENT_MADE";
    TransactionType["JOURNAL_ENTRY"] = "JOURNAL_ENTRY";
})(TransactionType || (TransactionType = {}));
// ============================================================================
// ROLE PERMISSIONS MATRIX TYPES
// ============================================================================
/**
 * Permission Category
 */
export var PermissionCategory;
(function (PermissionCategory) {
    PermissionCategory["ORDERS"] = "ORDERS";
    PermissionCategory["INVENTORY"] = "INVENTORY";
    PermissionCategory["INBOUND"] = "INBOUND";
    PermissionCategory["OUTBOUND"] = "OUTBOUND";
    PermissionCategory["QC"] = "QC";
    PermissionCategory["SHIPPING"] = "SHIPPING";
    PermissionCategory["USERS"] = "USERS";
    PermissionCategory["ROLES"] = "ROLES";
    PermissionCategory["SETTINGS"] = "SETTINGS";
    PermissionCategory["REPORTS"] = "REPORTS";
    PermissionCategory["ACCOUNTING"] = "ACCOUNTING";
    PermissionCategory["INTEGRATIONS"] = "INTEGRATIONS";
})(PermissionCategory || (PermissionCategory = {}));
// ============================================================================
// FULL ERP ACCOUNTING TYPES (PHASE 1-3)
// ============================================================================
/**
 * Account Type Enum - Standard accounting account types
 */
export var AccountType;
(function (AccountType) {
    AccountType["ASSET"] = "ASSET";
    AccountType["LIABILITY"] = "LIABILITY";
    AccountType["EQUITY"] = "EQUITY";
    AccountType["REVENUE"] = "REVENUE";
    AccountType["EXPENSE"] = "EXPENSE";
})(AccountType || (AccountType = {}));
/**
 * Journal Entry Status Enum
 */
export var JournalEntryStatus;
(function (JournalEntryStatus) {
    JournalEntryStatus["DRAFT"] = "DRAFT";
    JournalEntryStatus["SUBMITTED"] = "SUBMITTED";
    JournalEntryStatus["APPROVED"] = "APPROVED";
    JournalEntryStatus["POSTED"] = "POSTED";
    JournalEntryStatus["REVERSED"] = "REVERSED";
})(JournalEntryStatus || (JournalEntryStatus = {}));
/**
 * Revenue Recognition Method Enum
 */
export var RevenueRecognitionMethod;
(function (RevenueRecognitionMethod) {
    RevenueRecognitionMethod["INSTANT"] = "INSTANT";
    RevenueRecognitionMethod["MILESTONE"] = "MILESTONE";
    RevenueRecognitionMethod["RATABLE"] = "RATABLE";
    RevenueRecognitionMethod["DEFERRED"] = "DEFERRED";
})(RevenueRecognitionMethod || (RevenueRecognitionMethod = {}));
/**
 * Depreciation Method Enum
 */
export var DepreciationMethod;
(function (DepreciationMethod) {
    DepreciationMethod["STRAIGHT_LINE"] = "STRAIGHT_LINE";
    DepreciationMethod["DECLINING_BALANCE"] = "DECLINING_BALANCE";
    DepreciationMethod["DOUBLE_DECLINING"] = "DOUBLE_DECLINING";
    DepreciationMethod["UNITS_OF_PRODUCTION"] = "UNITS_OF_PRODUCTION";
})(DepreciationMethod || (DepreciationMethod = {}));
// ============================================================================
// RMA TYPES - Re-export from dedicated RMA types module
// ============================================================================
export * from './rma.js';
// ============================================================================
// HR & PAYROLL TYPES - Re-export from dedicated HR types module
// ============================================================================
export * from './hr.js';
// ============================================================================
// MULTI-ENTITY TYPES - Re-export from dedicated multi-entity types module
// ============================================================================
export * from './multi-entity.js';
// ============================================================================
// PROJECTS TYPES - Re-export from dedicated projects types module
// ============================================================================
export * from './projects.js';
// ============================================================================
// PURCHASING TYPES - Re-export from dedicated purchasing types module
// ============================================================================
export * from './purchasing.js';
// ============================================================================
// MANUFACTURING TYPES - Re-export from dedicated manufacturing types module
// Note: Some types renamed to avoid conflicts with production.ts
// ============================================================================
export { WorkCenterStatus, RoutingStatus, OperationType, ProductionOrderStatus as ManufacturingOrderStatus, MPSStatus, MRPPlanStatus, MRPActionType, ShopFloorTransactionType, 
// DefectType excluded - already defined in main index.ts for quality inspections
DefectSeverity, DefectDisposition, CapacityPlanStatus, } from './manufacturing.js';
// ============================================================================
// E-COMMERCE TYPES - Re-export from dedicated e-commerce types module
// ============================================================================
export * from './ecommerce.js';
// ============================================================================
// ADVANCED INVENTORY TYPES - Re-export from dedicated advanced inventory types module
// ============================================================================
export * from './advanced-inventory.js';
// ============================================================================
// ADVANCED FINANCIALS TYPES - Re-export from dedicated advanced financials types module
// Note: Some types renamed to avoid conflicts with multi-entity and advanced-inventory
// ============================================================================
export { StatementType, PeriodType as FinancialPeriodType, ConsolidationMethod as FinancialConsolidationMethod, IntercompanyTransactionType as FinancialIntercompanyTransactionType, IntercompanyStatus, TaxType, TaxStatus, RatioCategory, } from './advanced-financials.js';
