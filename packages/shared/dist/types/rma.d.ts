/**
 * RMA (Return Merchandise Authorization) Module Types
 *
 * Comprehensive returns management system for handling customer returns,
 * warranty claims, refurbishments, and exchanges
 */
export declare enum RMAStatus {
    PENDING = "PENDING",
    APPROVED = "APPROVED",
    REJECTED = "REJECTED",
    RECEIVED = "RECEIVED",
    INSPECTING = "INSPECTING",
    AWAITING_DECISION = "AWAITING_DECISION",
    REFUND_APPROVED = "REFUND_APPROVED",
    REFUND_PROCESSING = "REFUND_PROCESSING",
    REFUNDED = "REFUNDED",
    REPLACEMENT_APPROVED = "REPLACEMENT_APPROVED",
    REPLACEMENT_PROCESSING = "REPLACEMENT_PROCESSING",
    REPLACED = "REPLACED",
    REPAIR_APPROVED = "REPAIR_APPROVED",
    REPAIRING = "REPAIRING",
    REPAIRED = "REPAIRED",
    CLOSED = "CLOSED"
}
export declare enum RMAReason {
    DEFECTIVE = "DEFECTIVE",
    DAMAGED_SHIPPING = "DAMAGED_SHIPPING",
    WRONG_ITEM = "WRONG_ITEM",
    NO_LONGER_NEEDED = "NO_LONGER_NEEDED",
    WARRANTY = "WARRANTY",
    QUALITY_ISSUE = "QUALITY_ISSUE",
    MISSING_PARTS = "MISSING_PARTS",
    ARRIVED_LATE = "ARRIVED_LATE",
    ORDER_ERROR = "ORDER_ERROR",
    OTHER = "OTHER"
}
export declare enum RMAPriority {
    LOW = "LOW",
    NORMAL = "NORMAL",
    HIGH = "HIGH",
    URGENT = "URGENT"
}
export declare enum RMAResolutionType {
    REFUND = "REFUND",
    REPLACEMENT = "REPLACEMENT",
    REPAIR = "REPAIR",
    CREDIT = "CREDIT",
    EXCHANGE = "EXCHANGE",
    RESTOCK = "RESTOCK",
    DISPOSE = "DISPOSE"
}
export declare enum RMACondition {
    NEW = "NEW",
    LIKE_NEW = "LIKE_NEW",
    GOOD = "GOOD",
    FAIR = "FAIR",
    POOR = "POOR",
    DAMAGED = "DAMAGED",
    UNSALEABLE = "UNSALEABLE"
}
export declare enum RMADisposition {
    RESALE = "RESALE",
    REFURBISH = "REFURBISH",
    REPAIR = "REPAIR",
    RETURN_TO_VENDOR = "RETURN_TO_VENDOR",
    DISPOSE = "DISPOSE",
    DONATE = "DONATE",
    QUARANTINE = "QUARANTINE"
}
/**
 * RMA Request - Main entity for return requests
 */
export interface RMARequest {
    rmaId: string;
    rmaNumber: string;
    orderId: string;
    orderItemId: string;
    customerId?: string;
    customerName: string;
    customerEmail?: string;
    customerPhone?: string;
    sku: string;
    productName: string;
    quantity: number;
    reason: RMAReason;
    reasonDescription?: string;
    status: RMAStatus;
    priority: RMAPriority;
    condition?: RMACondition;
    resolutionType?: RMAResolutionType;
    disposition?: RMADisposition;
    refundAmount?: number;
    replacementOrderId?: string;
    requestedDate: Date;
    approvedAt?: Date;
    approvedBy?: string;
    receivedAt?: Date;
    receivedBy?: string;
    inspectedAt?: Date;
    inspectedBy?: string;
    resolvedAt?: Date;
    resolvedBy?: string;
    closedAt?: Date;
    closedBy?: string;
    trackingNumber?: string;
    carrier?: string;
    returnLabelUrl?: string;
    customerNotes?: string;
    internalNotes?: string;
    resolutionNotes?: string;
    rejectionReason?: string;
    refundMethod?: 'ORIGINAL' | 'STORE_CREDIT' | 'BANK_TRANSFER' | 'CHECK';
    refundProcessedAt?: Date;
    replacementShippedAt?: Date;
    createdBy: string;
    createdAt: Date;
    updatedAt?: Date;
    updatedBy?: string;
    images?: string[];
    attachments?: string[];
}
/**
 * RMA Inspection Record
 */
export interface RMAInspection {
    inspectionId: string;
    rmaId: string;
    inspectedBy: string;
    inspectedAt: Date;
    condition: RMACondition;
    disposition: RMADisposition;
    findings: string;
    recommendedResolution: RMAResolutionType;
    estimatedRefund?: number;
    repairCost?: number;
    refurbishmentCost?: number;
    images?: string[];
    notes?: string;
    createdAt: Date;
}
/**
 * RMA Activity Log
 */
export interface RMAActivity {
    activityId: string;
    rmaId: string;
    activityType: 'CREATED' | 'APPROVED' | 'REJECTED' | 'RECEIVED' | 'INSPECTED' | 'REFUND_INITIATED' | 'REFUND_PROCESSED' | 'REPLACEMENT_SENT' | 'REPAIRED' | 'CLOSED' | 'NOTE_ADDED' | 'STATUS_CHANGED';
    description: string;
    oldStatus?: RMAStatus;
    newStatus?: RMAStatus;
    userId: string;
    userName: string;
    createdAt: Date;
    metadata?: Record<string, any>;
}
/**
 * RMA Communication
 */
export interface RMACommunication {
    communicationId: string;
    rmaId: string;
    type: 'EMAIL' | 'PHONE' | 'SMS' | 'NOTE';
    direction: 'INBOUND' | 'OUTBOUND';
    subject?: string;
    content: string;
    sentBy?: string;
    sentAt?: Date;
    attachments?: string[];
    createdAt: Date;
}
export interface CreateRMADTO {
    orderId: string;
    orderItemId: string;
    sku: string;
    quantity: number;
    reason: RMAReason;
    reasonDescription?: string;
    customerNotes?: string;
    priority?: RMAPriority;
    images?: string[];
}
export interface UpdateRMAStatusDTO {
    status: RMAStatus;
    notes?: string;
    resolutionType?: RMAResolutionType;
    refundAmount?: number;
    rejectionReason?: string;
}
export interface RMAInspectionDTO {
    condition: RMACondition;
    disposition: RMADisposition;
    findings: string;
    recommendedResolution: RMAResolutionType;
    estimatedRefund?: number;
    repairCost?: number;
    refurbishmentCost?: number;
    notes?: string;
}
export interface ProcessRefundDTO {
    refundMethod: 'ORIGINAL' | 'STORE_CREDIT' | 'BANK_TRANSFER' | 'CHECK';
    amount?: number;
    notes?: string;
}
export interface SendReplacementDTO {
    shippingAddress: {
        name: string;
        street1: string;
        street2?: string;
        city: string;
        state: string;
        postalCode: string;
        country: string;
    };
    shippingMethod: string;
    trackingNumber?: string;
    notes?: string;
}
/**
 * RMA Dashboard Statistics
 */
export interface RMADashboard {
    pendingRequests: number;
    awaitingApproval: number;
    inProgress: number;
    completedToday: number;
    completedThisWeek: number;
    completedThisMonth: number;
    urgent: number;
    overdue: number;
    totalRefundValue: number;
    pendingRefundValue: number;
}
/**
 * RMA List Filters
 */
export interface RMAListFilters {
    status?: RMAStatus;
    reason?: RMAReason;
    priority?: RMAPriority;
    customerId?: string;
    orderId?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
}
/**
 * RMA Summary
 */
export interface RMASummary {
    rmaId: string;
    rmaNumber: string;
    customerName: string;
    productName: string;
    sku: string;
    quantity: number;
    reason: RMAReason;
    status: RMAStatus;
    priority: RMAPriority;
    requestedDate: Date;
    createdAt: Date;
}
//# sourceMappingURL=rma.d.ts.map