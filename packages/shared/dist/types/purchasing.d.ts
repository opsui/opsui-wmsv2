/**
 * Purchasing Module Types
 *
 * Types for purchase requisitions, RFQ management, three-way matching,
 * vendor catalogs, and vendor performance tracking
 *
 * Integrates with Inventory, Accounting, Projects, and Multi-Entity modules
 */
/**
 * Requisition Status
 */
export declare enum RequisitionStatus {
    DRAFT = "DRAFT",
    SUBMITTED = "SUBMITTED",
    PENDING_APPROVAL = "PENDING_APPROVAL",
    APPROVED = "APPROVED",
    REJECTED = "REJECTED",
    CANCELLED = "CANCELLED",
    CONVERTED_TO_PO = "CONVERTED_TO_PO"
}
/**
 * RFQ Status
 */
export declare enum RFQStatus {
    DRAFT = "DRAFT",
    SENT = "SENT",
    RESPONSES_PENDING = "RESPONSES_PENDING",
    RESPONSES_RECEIVED = "RESPONSES_RECEIVED",
    UNDER_REVIEW = "UNDER_REVIEW",
    AWARDED = "AWARDED",
    CANCELLED = "CANCELLED"
}
/**
 * Vendor Response Status
 */
export declare enum VendorResponseStatus {
    PENDING = "PENDING",
    RECEIVED = "RECEIVED",
    ACCEPTED = "ACCEPTED",
    REJECTED = "REJECTED",
    WITHDRAWN = "WITHDRAWN"
}
/**
 * Three-Way Match Status
 */
export declare enum ThreeWayMatchStatus {
    PENDING_RECEIPT = "PENDING_RECEIPT",
    PARTIALLY_RECEIVED = "PARTIALLY_RECEIVED",
    FULLY_RECEIVED = "FULLY_RECEIVED",
    PENDING_INVOICE = "PENDING_INVOICE",
    INVOICE_RECEIVED = "INVOICE_RECEIVED",
    MATCHED = "MATCHED",
    VARIANCE_DETECTED = "VARIANCE_DETECTED",
    DISCREPANCY_RESOLVED = "DISCREPANCY_RESOLVED",
    READY_TO_PAY = "READY_TO_PAY",
    PAID = "PAID"
}
/**
 * Purchase Order Status
 */
export declare enum PurchaseOrderStatus {
    DRAFT = "DRAFT",
    SUBMITTED = "SUBMITTED",
    ACKNOWLEDGED = "ACKNOWLEDGED",
    PARTIAL = "PARTIAL",
    RECEIVED = "RECEIVED",
    CLOSED = "CLOSED",
    CANCELLED = "CANCELLED"
}
/**
 * Receipt Status
 */
export declare enum ReceiptStatus {
    OPEN = "OPEN",
    PARTIALLY_PUTAWAY = "PARTIALLY_PUTAWAY",
    PUTAWAY = "PUTAWAY",
    CLOSED = "CLOSED"
}
/**
 * Quality Status
 */
export declare enum QualityStatus {
    PENDING = "PENDING",
    PASSED = "PASSED",
    FAILED = "FAILED",
    QUARANTINED = "QUARANTINED"
}
/**
 * Vendor Rating Category
 */
export declare enum VendorRatingCategory {
    QUALITY = "QUALITY",
    DELIVERY = "DELIVERY",
    COMMUNICATION = "COMMUNICATION",
    PRICE = "PRICE",
    OVERALL = "OVERALL"
}
/**
 * Vendor Performance Rank
 */
export declare enum VendorPerformanceRank {
    EXCELLENT = "EXCELLENT",
    GOOD = "GOOD",
    AVERAGE = "AVERAGE",
    NEEDS_IMPROVEMENT = "NEEDS_IMPROVEMENT",
    UNSATISFACTORY = "UNSATISFACTORY",
    CRITICAL = "CRITICAL"
}
/**
 * Scorecard Status
 */
export declare enum ScorecardStatus {
    DRAFT = "DRAFT",
    SUBMITTED = "SUBMITTED",
    APPROVED = "APPROVED",
    REJECTED = "REJECTED"
}
/**
 * Requisition Source Type
 */
export declare enum RequisitionSourceType {
    STOCK_REQUEST = "STOCK_REQUEST",
    PROJECT = "PROJECT",
    PRODUCTION = "PRODUCTION",
    SALES_ORDER = "SALES_ORDER",
    MANUAL = "MANUAL"
}
/**
 * Purchase Requisition interface
 */
export interface PurchaseRequisition {
    requisition_id: string;
    requisition_number: string;
    entity_id: string | null;
    requested_by: string;
    request_date: Date;
    department: string;
    cost_center: string | null;
    job_number: string | null;
    approval_status: RequisitionStatus;
    approved_by: string | null;
    approved_at: Date | null;
    rejection_reason: string | null;
    converted_to_po_id: string | null;
    converted_at: Date | null;
    required_by: Date;
    created_at: Date;
    updated_at: Date;
    justification: string | null;
    delivery_instructions: string | null;
    notes: string | null;
}
/**
 * Purchase Requisition with details
 */
export interface PurchaseRequisitionWithDetails extends PurchaseRequisition {
    requester: {
        user_id: string;
        email: string;
        first_name: string;
        last_name: string;
    };
    lines: PurchaseRequisitionLine[];
    approvals: RequisitionApproval[];
    total_estimated_cost: number;
}
/**
 * Purchase Requisition Line interface
 */
export interface PurchaseRequisitionLine {
    line_id: string;
    requisition_id: string;
    line_number: number;
    sku: string | null;
    item_description: string;
    quantity: number;
    uom: string;
    suggested_vendor_id: string | null;
    suggested_vendor_item_code: string | null;
    estimated_unit_cost: number | null;
    estimated_total_cost: number | null;
    notes: string | null;
    attachment_url: string | null;
    created_at: Date;
    updated_at: Date;
}
/**
 * Requisition Approval interface
 */
export interface RequisitionApproval {
    approval_id: string;
    requisition_id: string;
    approval_level: number;
    approver_id: string;
    approval_status: string;
    approved_at: Date | null;
    comments: string | null;
    created_at: Date;
    approver?: {
        user_id: string;
        email: string;
        first_name: string;
        last_name: string;
    };
}
/**
 * Create Purchase Requisition DTO
 */
export interface CreatePurchaseRequisitionDTO {
    entity_id?: string;
    requested_by: string;
    department: string;
    cost_center?: string;
    job_number?: string;
    required_by: Date;
    justification?: string;
    delivery_instructions?: string;
    notes?: string;
    lines: Array<{
        sku?: string;
        item_description: string;
        quantity: number;
        uom?: string;
        suggested_vendor_id?: string;
        suggested_vendor_item_code?: string;
        estimated_unit_cost?: number;
        notes?: string;
        attachment_url?: string;
    }>;
}
/**
 * Update Purchase Requisition DTO
 */
export interface UpdatePurchaseRequisitionDTO {
    department?: string;
    cost_center?: string;
    required_by?: Date;
    justification?: string;
    delivery_instructions?: string;
    notes?: string;
    lines?: Array<{
        line_id?: string;
        sku?: string;
        item_description: string;
        quantity: number;
        uom?: string;
        suggested_vendor_id?: string;
        suggested_vendor_item_code?: string;
        estimated_unit_cost?: number;
        notes?: string;
        attachment_url?: string;
    }>;
}
/**
 * Approve/Reject Requisition DTO
 */
export interface RequisitionApprovalDTO {
    requisition_id: string;
    approval_status: 'APPROVED' | 'REJECTED';
    rejection_reason?: string;
}
/**
 * RFQ Header interface
 */
export interface RFQHeader {
    rfq_id: string;
    rfq_number: string;
    entity_id: string | null;
    source_type: string;
    source_id: string | null;
    source_line_id: string | null;
    created_date: Date;
    quote_due_date: Date;
    response_by_date: Date;
    rfq_status: RFQStatus;
    awarded_to_vendor_id: string | null;
    awarded_at: Date | null;
    awarded_amount: number | null;
    awarded_notes: string | null;
    created_by: string;
    delivery_location: string | null;
    payment_terms: string | null;
    freight_terms: string | null;
    incoterms: string | null;
    notes: string | null;
    special_instructions: string | null;
    attachments: Record<string, unknown> | null;
    created_at: Date;
    updated_at: Date;
}
/**
 * RFQ Header with details
 */
export interface RFQHeaderWithDetails extends RFQHeader {
    lines: RFQLine[];
    vendors: RFQVendor[];
    response_count: number;
    lowest_bid_amount: number | null;
}
/**
 * RFQ Line interface
 */
export interface RFQLine {
    line_id: string;
    rfq_id: string;
    line_number: number;
    sku: string | null;
    item_description: string;
    quantity: number;
    uom: string;
    specifications: string | null;
    technical_requirements: string | null;
    quality_requirements: string | null;
    attachment_url: string | null;
    budgeted_unit_cost: number | null;
    budgeted_total_cost: number | null;
    created_at: Date;
}
/**
 * RFQ Vendor interface
 */
export interface RFQVendor {
    rfq_vendor_id: string;
    rfq_id: string;
    vendor_id: string;
    vendor_contact_id: string | null;
    status: VendorResponseStatus;
    sent_at: Date | null;
    response_received_at: Date | null;
    is_awarded: boolean;
    awarded_at: Date | null;
    awarded_amount: number | null;
    email_sent: boolean;
    email_sent_at: Date | null;
    email_count: number;
    last_contacted_at: Date | null;
    notes: string | null;
    created_at: Date;
    vendor?: {
        vendor_id: string;
        vendor_name: string;
    };
    response?: RFQVendorResponse;
}
/**
 * RFQ Vendor Response interface
 */
export interface RFQVendorResponse {
    response_id: string;
    rfq_vendor_id: string;
    rfq_id: string;
    vendor_id: string;
    response_date: Date;
    quote_number: string | null;
    quote_valid_until: Date | null;
    contact_person: string | null;
    contact_email: string | null;
    contact_phone: string | null;
    total_amount: number;
    total_tax: number;
    total_freight: number;
    grand_total: number;
    payment_terms: string | null;
    delivery_terms: string | null;
    estimated_delivery_date: Date | null;
    lead_time_days: number | null;
    quote_document_url: string | null;
    additional_attachments: Record<string, unknown> | null;
    notes: string | null;
    terms_conditions: string | null;
    created_at: Date;
    updated_at: Date;
    lines: RFQResponseLine[];
}
/**
 * RFQ Response Line interface
 */
export interface RFQResponseLine {
    response_line_id: string;
    response_id: string;
    rfq_line_id: string;
    line_number: number;
    vendor_item_code: string | null;
    item_description: string;
    quantity: number;
    uom: string | null;
    unit_price: number;
    line_total: number;
    discount_percent: number;
    discount_amount: number;
    net_amount: number;
    lead_time_days: number | null;
    availability_date: Date | null;
    notes: string | null;
    substitution_notes: string | null;
    created_at: Date;
}
/**
 * Create RFQ DTO
 */
export interface CreateRFQDTO {
    entity_id?: string;
    source_type: string;
    source_id?: string;
    source_line_id?: string;
    quote_due_date: Date;
    response_by_date: Date;
    delivery_location?: string;
    payment_terms?: string;
    freight_terms?: string;
    incoterms?: string;
    notes?: string;
    special_instructions?: string;
    vendor_ids: string[];
    lines: Array<{
        sku?: string;
        item_description: string;
        quantity: number;
        uom?: string;
        specifications?: string;
        technical_requirements?: string;
        quality_requirements?: string;
        attachment_url?: string;
        budgeted_unit_cost?: number;
    }>;
}
/**
 * Award RFQ DTO
 */
export interface AwardRFQDTO {
    rfq_id: string;
    rfq_vendor_id: string;
    awarded_amount: number;
    awarded_notes?: string;
    convert_to_po: boolean;
}
/**
 * Vendor Item Catalog interface
 */
export interface VendorItemCatalog {
    catalog_id: string;
    vendor_id: string;
    entity_id: string | null;
    internal_sku: string | null;
    vendor_sku: string;
    item_name: string | null;
    item_description: string | null;
    list_price: number | null;
    contract_price: number | null;
    minimum_order_quantity: number;
    price_break_quantity: number | null;
    price_break_price: number | null;
    standard_lead_time_days: number | null;
    current_lead_time_days: number | null;
    is_preferred: boolean;
    is_active: boolean;
    last_ordered_date: Date | null;
    last_price_update: Date | null;
    vendor_category: string | null;
    internal_category: string | null;
    uom: string | null;
    weight: number | null;
    dimensions: string | null;
    product_url: string | null;
    spec_sheet_url: string | null;
    created_at: Date;
    updated_at: Date;
}
/**
 * Create Vendor Catalog Item DTO
 */
export interface CreateVendorCatalogItemDTO {
    vendor_id: string;
    entity_id?: string;
    internal_sku?: string;
    vendor_sku: string;
    item_name?: string;
    item_description?: string;
    list_price?: number;
    contract_price?: number;
    minimum_order_quantity?: number;
    price_break_quantity?: number;
    price_break_price?: number;
    standard_lead_time_days?: number;
    is_preferred?: boolean;
    vendor_category?: string;
    internal_category?: string;
    uom?: string;
    product_url?: string;
    spec_sheet_url?: string;
}
/**
 * Purchase Order Header interface
 */
export interface PurchaseOrderHeader {
    po_id: string;
    po_number: string;
    entity_id: string | null;
    vendor_id: string;
    vendor_name: string;
    vendor_contact_id: string | null;
    vendor_address: string | null;
    source_type: string | null;
    source_id: string | null;
    rfq_response_id: string | null;
    order_date: Date;
    requested_delivery_date: Date;
    promised_delivery_date: Date | null;
    actual_delivery_date: Date | null;
    po_status: PurchaseOrderStatus;
    three_way_match_status: ThreeWayMatchStatus;
    subtotal: number;
    tax_amount: number;
    freight_amount: number;
    other_charges: number;
    total_amount: number;
    quantity_ordered: number;
    quantity_received: number;
    quantity_invoiced: number;
    amount_invoiced: number;
    amount_paid: number;
    payment_terms: string | null;
    payment_terms_days: number;
    freight_terms: string | null;
    incoterms: string | null;
    currency: string;
    exchange_rate: number;
    approved_by: string | null;
    approved_at: Date | null;
    created_by: string;
    notes: string | null;
    shipping_instructions: string | null;
    vendor_notes: string | null;
    internal_notes: string | null;
    attachments: Record<string, unknown> | null;
    created_at: Date;
    updated_at: Date;
}
/**
 * Purchase Order with details
 */
export interface PurchaseOrderWithDetails extends PurchaseOrderHeader {
    lines: PurchaseOrderLine[];
    vendor?: {
        vendor_id: string;
        vendor_name: string;
    };
}
/**
 * Purchase Order Line interface
 */
export interface PurchaseOrderLine {
    pol_id: string;
    po_id: string;
    line_number: number;
    sku: string | null;
    item_description: string;
    vendor_sku: string | null;
    quantity_ordered: number;
    quantity_received: number;
    quantity_invoiced: number;
    quantity_rejected: number;
    quantity_open: number;
    unit_price: number;
    line_total: number;
    tax_amount: number;
    freight_amount: number;
    total_amount: number;
    amount_received: number;
    amount_invoiced: number | null;
    three_way_match_status: ThreeWayMatchStatus;
    promised_date: Date | null;
    requested_date: Date | null;
    notes: string | null;
    job_number: string | null;
    created_at: Date;
    updated_at: Date;
}
/**
 * Create Purchase Order DTO
 */
export interface CreatePurchaseOrderDTO {
    entity_id?: string;
    vendor_id: string;
    vendor_contact_id?: string;
    source_type?: string;
    source_id?: string;
    rfq_response_id?: string;
    requested_delivery_date: Date;
    payment_terms?: string;
    payment_terms_days?: number;
    freight_terms?: string;
    incoterms?: string;
    currency?: string;
    notes?: string;
    shipping_instructions?: string;
    vendor_notes?: string;
    lines: Array<{
        sku?: string;
        item_description: string;
        vendor_sku?: string;
        quantity_ordered: number;
        unit_price: number;
        promised_date?: Date;
        requested_date?: Date;
        notes?: string;
        job_number?: string;
    }>;
}
/**
 * Update Purchase Order DTO
 */
export interface UpdatePurchaseOrderDTO {
    requested_delivery_date?: Date;
    promised_delivery_date?: Date;
    payment_terms?: string;
    freight_terms?: string;
    incoterms?: string;
    notes?: string;
    shipping_instructions?: string;
    vendor_notes?: string;
    lines?: Array<{
        pol_id?: string;
        sku?: string;
        item_description: string;
        vendor_sku?: string;
        quantity_ordered?: number;
        unit_price?: number;
        promised_date?: Date;
        requested_date?: Date;
        notes?: string;
        job_number?: string;
    }>;
}
/**
 * Convert Requisition to PO DTO
 */
export interface ConvertRequisitionToPODTO {
    requisition_id: string;
    vendor_id?: string;
    requested_delivery_date: Date;
    payment_terms?: string;
    freight_terms?: string;
    notes?: string;
}
/**
 * Purchase Receipt interface
 */
export interface PurchaseReceipt {
    receipt_id: string;
    receipt_number: string;
    po_id: string | null;
    entity_id: string | null;
    vendor_id: string;
    vendor_name: string;
    vendor_document_number: string | null;
    receipt_date: Date;
    received_by: string;
    warehouse_location: string | null;
    dock_door: string | null;
    receipt_status: ReceiptStatus;
    notes: string | null;
    carrier: string | null;
    tracking_number: string | null;
    bill_of_lading: string | null;
    created_at: Date;
    updated_at: Date;
}
/**
 * Purchase Receipt with details
 */
export interface PurchaseReceiptWithDetails extends PurchaseReceipt {
    lines: PurchaseReceiptLine[];
}
/**
 * Purchase Receipt Line interface
 */
export interface PurchaseReceiptLine {
    receipt_line_id: string;
    receipt_id: string;
    po_line_id: string | null;
    line_number: number;
    sku: string;
    item_description: string | null;
    vendor_sku: string | null;
    quantity_ordered: number | null;
    quantity_shipped: number | null;
    quantity_received: number;
    quantity_rejected: number;
    quantity_accepted: number;
    uom: string | null;
    conversion_factor: number;
    lot_number: string | null;
    expiration_date: Date | null;
    serial_numbers: Record<string, unknown> | null;
    quality_status: QualityStatus;
    inspected_by: string | null;
    inspected_at: Date | null;
    putaway_location: string | null;
    putaway_at: Date | null;
    putaway_by: string | null;
    notes: string | null;
    created_at: Date;
    updated_at: Date;
}
/**
 * Create Purchase Receipt DTO
 */
export interface CreatePurchaseReceiptDTO {
    po_id: string;
    entity_id?: string;
    vendor_document_number?: string;
    receipt_date?: Date;
    received_by: string;
    warehouse_location?: string;
    dock_door?: string;
    notes?: string;
    carrier?: string;
    tracking_number?: string;
    bill_of_lading?: string;
    lines: Array<{
        po_line_id: string;
        sku: string;
        item_description?: string;
        vendor_sku?: string;
        quantity_shipped: number;
        quantity_received: number;
        quantity_rejected?: number;
        uom?: string;
        conversion_factor?: number;
        lot_number?: string;
        expiration_date?: Date;
        serial_numbers?: string[];
        notes?: string;
    }>;
}
/**
 * Update Receipt Line Quality DTO
 */
export interface UpdateReceiptQualityDTO {
    receipt_line_id: string;
    quality_status: QualityStatus;
    quantity_rejected?: number;
    putaway_location?: string;
    notes?: string;
}
/**
 * Three-Way Match Details interface
 */
export interface ThreeWayMatchDetails {
    match_id: string;
    po_id: string;
    po_line_id: string | null;
    receipt_id: string | null;
    receipt_line_id: string | null;
    invoice_id: string | null;
    invoice_line_id: string | null;
    po_quantity: number | null;
    receipt_quantity: number | null;
    invoice_quantity: number | null;
    po_amount: number | null;
    receipt_amount: number | null;
    invoice_amount: number | null;
    quantity_variance: number | null;
    amount_variance: number | null;
    variance_percent: number | null;
    tolerance_percent: number;
    match_status: ThreeWayMatchStatus;
    is_match_ok: boolean;
    hold_reason: string | null;
    variance_resolved: boolean;
    resolved_by: string | null;
    resolved_at: Date | null;
    resolution_notes: string | null;
    created_at: Date;
    updated_at: Date;
}
/**
 * Resolve Three-Way Variance DTO
 */
export interface ResolveVarianceDTO {
    match_id: string;
    variance_resolved: boolean;
    resolution_notes?: string;
    resolved_by: string;
}
/**
 * Three-Way Match Summary
 */
export interface ThreeWayMatchSummary {
    po_id: string;
    po_number: string;
    vendor_name: string;
    total_amount: number;
    quantity_ordered: number;
    quantity_received: number;
    quantity_invoiced: number;
    amount_invoiced: number;
    match_status: ThreeWayMatchStatus;
    variance_count: number;
    total_variance: number;
    lines_with_variance: ThreeWayMatchDetails[];
}
/**
 * Vendor Performance Summary interface
 */
export interface VendorPerformanceSummary {
    performance_id: string;
    vendor_id: string;
    entity_id: string | null;
    period_start: Date;
    period_end: Date;
    last_updated: Date;
    overall_rating: number | null;
    overall_rank: VendorPerformanceRank | null;
    total_orders: number;
    on_time_deliveries: number;
    on_time_delivery_percent: number | null;
    average_lead_time_days: number | null;
    late_deliveries: number;
    total_receipts: number;
    receipts_with_defects: number;
    defect_rate_percent: number | null;
    total_quantity_received: number;
    total_quantity_rejected: number;
    rejection_rate_percent: number | null;
    total_spend: number;
    average_order_value: number | null;
    cost_variance_percent: number | null;
    competitive_score: number | null;
    communication_rating: number | null;
    responsiveness_rating: number | null;
    problem_resolution_rating: number | null;
    average_response_time_hours: number | null;
    total_returns: number;
    return_rate_percent: number | null;
    total_credits_issued: number;
    documentation_quality: number | null;
    on_time_invoices_percent: number | null;
    invoice_accuracy_percent: number | null;
    created_at: Date;
    updated_at: Date;
}
/**
 * Vendor Performance Event interface
 */
export interface VendorPerformanceEvent {
    event_id: string;
    vendor_id: string;
    entity_id: string | null;
    event_type: string;
    event_category: string;
    reference_type: string | null;
    reference_id: string | null;
    reference_line_id: string | null;
    event_date: Date;
    event_description: string;
    severity: string;
    impact_amount: number | null;
    score_impact: number;
    rating_after: number | null;
    resolved: boolean;
    resolved_by: string | null;
    resolved_at: Date | null;
    resolution_notes: string | null;
    credit_issued: number | null;
    reported_by: string | null;
    acknowledged_by_vendor: boolean;
    vendor_response: string | null;
    created_at: Date;
}
/**
 * Vendor Scorecard interface
 */
export interface VendorScorecard {
    scorecard_id: string;
    vendor_id: string;
    entity_id: string | null;
    review_period_start: Date;
    review_period_end: Date;
    review_date: Date;
    reviewed_by: string;
    approved_by: string | null;
    approved_at: Date | null;
    delivery_score: number | null;
    quality_score: number | null;
    cost_score: number | null;
    service_score: number | null;
    communication_score: number | null;
    documentation_score: number | null;
    overall_score: number | null;
    overall_rating: VendorPerformanceRank | null;
    status: ScorecardStatus;
    strengths: string | null;
    weaknesses: string | null;
    improvement_required: string | null;
    corrective_actions: string | null;
    follow_up_date: Date | null;
    requires_development_plan: boolean;
    development_plan: string | null;
    development_plan_approved: boolean;
    notes: string | null;
    created_at: Date;
    updated_at: Date;
}
/**
 * Create Vendor Event DTO
 */
export interface CreateVendorEventDTO {
    vendor_id: string;
    entity_id?: string;
    event_type: string;
    event_category: string;
    reference_type?: string;
    reference_id?: string;
    reference_line_id?: string;
    event_date: Date;
    event_description: string;
    severity: string;
    impact_amount?: number;
    score_impact: number;
    reported_by: string;
}
/**
 * Create Vendor Scorecard DTO
 */
export interface CreateVendorScorecardDTO {
    vendor_id: string;
    entity_id?: string;
    review_period_start: Date;
    review_period_end: Date;
    review_date?: Date;
    reviewed_by: string;
    delivery_score?: number;
    quality_score?: number;
    cost_score?: number;
    service_score?: number;
    communication_score?: number;
    documentation_score?: number;
    strengths?: string;
    weaknesses?: string;
    improvement_required?: string;
    corrective_actions?: string;
    follow_up_date?: Date;
    requires_development_plan?: boolean;
    development_plan?: string;
    notes?: string;
}
/**
 * Requisition Query Filters
 */
export interface RequisitionQueryFilters {
    entity_id?: string;
    requested_by?: string;
    department?: string;
    approval_status?: RequisitionStatus;
    date_from?: Date;
    date_to?: Date;
    required_by_from?: Date;
    required_by_to?: Date;
    job_number?: string;
    search?: string;
}
/**
 * RFQ Query Filters
 */
export interface RFQQueryFilters {
    entity_id?: string;
    rfq_status?: RFQStatus;
    created_by?: string;
    date_from?: Date;
    date_to?: Date;
    due_date_from?: Date;
    due_date_to?: Date;
    source_type?: string;
    source_id?: string;
    vendor_id?: string;
    search?: string;
}
/**
 * Purchase Order Query Filters
 */
export interface PurchaseOrderQueryFilters {
    entity_id?: string;
    vendor_id?: string;
    po_status?: PurchaseOrderStatus;
    three_way_match_status?: ThreeWayMatchStatus;
    date_from?: Date;
    date_to?: Date;
    source_type?: string;
    source_id?: string;
    created_by?: string;
    search?: string;
}
/**
 * Vendor Performance Query Filters
 */
export interface VendorPerformanceQueryFilters {
    entity_id?: string;
    vendor_id?: string;
    period_start?: Date;
    period_end?: Date;
    overall_rank?: VendorPerformanceRank;
    min_rating?: number;
    max_rating?: number;
}
/**
 * Purchasing Dashboard Metrics
 */
export interface PurchasingDashboardMetrics {
    pending_requisitions: number;
    requisitions_awaiting_approval: number;
    approved_requisitions_this_month: number;
    active_rfqs: number;
    rfqs_awaiting_response: number;
    rfqs_awarded_this_month: number;
    open_orders: number;
    orders_past_due: number;
    orders_ready_to_pay: number;
    total_open_order_value: number;
    pending_receipts: number;
    receipts_today: number;
    receipts_this_month: number;
    match_exceptions: number;
    pending_invoices: number;
    matched_this_month: number;
    vendors_at_risk: number;
    new_vendors_this_month: number;
    top_performers: VendorPerformanceSummary[];
}
/**
 * Vendor Performance Report
 */
export interface VendorPerformanceReport {
    vendor_id: string;
    vendor_name: string;
    period_start: Date;
    period_end: Date;
    overall_rating: number;
    overall_rank: VendorPerformanceRank;
    total_spend: number;
    total_orders: number;
    on_time_delivery_percent: number;
    quality_rating: number;
    defect_rate_percent: number;
    average_lead_time_days: number;
    return_rate_percent: number;
    cost_competitiveness: number;
    communication_score: number;
    trend: 'IMPROVING' | 'STABLE' | 'DECLINING';
}
/**
 * Spend Analysis Report
 */
export interface SpendAnalysisReport {
    vendor_id: string;
    vendor_name: string;
    entity_id: string | null;
    total_spend: number;
    spend_percent: number;
    order_count: number;
    average_order_value: number;
    top_skus: Array<{
        sku: string;
        description: string;
        quantity: number;
        amount: number;
    }>;
    spend_by_month: Array<{
        month: string;
        amount: number;
    }>;
}
/**
 * Requisition to PO Cycle Time
 */
export interface RequisitionToPOCycleTime {
    department: string;
    average_hours: number;
    median_hours: number;
    min_hours: number;
    max_hours: number;
    count: number;
}
/**
 * Batch Approve Requisitions DTO
 */
export interface BatchApproveRequisitionsDTO {
    requisition_ids: string[];
    approve: boolean;
    rejection_reason?: string;
}
/**
 * Batch Update Receipt Quality DTO
 */
export interface BatchUpdateReceiptQualityDTO {
    receipt_line_ids: string[];
    quality_status: QualityStatus;
    putaway_location?: string;
    notes?: string;
}
/**
 * Batch Resolve Variances DTO
 */
export interface BatchResolveVariancesDTO {
    match_ids: string[];
    variance_resolved: boolean;
    resolution_notes?: string;
}
//# sourceMappingURL=purchasing.d.ts.map