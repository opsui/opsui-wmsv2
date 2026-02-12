/**
 * Sales & CRM Module Types
 *
 * Basic customer relationship management and sales pipeline functionality
 */
// ============================================================================
// ENUMS
// ============================================================================
export var CustomerStatus;
(function (CustomerStatus) {
    CustomerStatus["PROSPECT"] = "PROSPECT";
    CustomerStatus["ACTIVE"] = "ACTIVE";
    CustomerStatus["INACTIVE"] = "INACTIVE";
    CustomerStatus["BLOCKED"] = "BLOCKED";
})(CustomerStatus || (CustomerStatus = {}));
export var LeadStatus;
(function (LeadStatus) {
    LeadStatus["NEW"] = "NEW";
    LeadStatus["CONTACTED"] = "CONTACTED";
    LeadStatus["QUALIFIED"] = "QUALIFIED";
    LeadStatus["PROPOSAL"] = "PROPOSAL";
    LeadStatus["NEGOTIATION"] = "NEGOTIATION";
    LeadStatus["WON"] = "WON";
    LeadStatus["LOST"] = "LOST";
})(LeadStatus || (LeadStatus = {}));
export var LeadPriority;
(function (LeadPriority) {
    LeadPriority["LOW"] = "LOW";
    LeadPriority["MEDIUM"] = "MEDIUM";
    LeadPriority["HIGH"] = "HIGH";
    LeadPriority["URGENT"] = "URGENT";
})(LeadPriority || (LeadPriority = {}));
export var OpportunityStage;
(function (OpportunityStage) {
    OpportunityStage["PROSPECTING"] = "PROSPECTING";
    OpportunityStage["QUALIFICATION"] = "QUALIFICATION";
    OpportunityStage["PROPOSAL"] = "PROPOSAL";
    OpportunityStage["NEGOTIATION"] = "NEGOTIATION";
    OpportunityStage["CLOSED_WON"] = "CLOSED_WON";
    OpportunityStage["CLOSED_LOST"] = "CLOSED_LOST";
})(OpportunityStage || (OpportunityStage = {}));
export var QuoteStatus;
(function (QuoteStatus) {
    QuoteStatus["DRAFT"] = "DRAFT";
    QuoteStatus["SENT"] = "SENT";
    QuoteStatus["ACCEPTED"] = "ACCEPTED";
    QuoteStatus["REJECTED"] = "REJECTED";
    QuoteStatus["EXPIRED"] = "EXPIRED";
})(QuoteStatus || (QuoteStatus = {}));
// ============================================================================
// SALES ORDER MANAGEMENT TYPES (Phase 6)
// ============================================================================
/**
 * Sales order status
 */
export var SalesOrderStatus;
(function (SalesOrderStatus) {
    SalesOrderStatus["DRAFT"] = "DRAFT";
    SalesOrderStatus["PENDING"] = "PENDING";
    SalesOrderStatus["CONFIRMED"] = "CONFIRMED";
    SalesOrderStatus["PICKING"] = "PICKING";
    SalesOrderStatus["PICKED"] = "PICKED";
    SalesOrderStatus["PARTIAL"] = "PARTIAL";
    SalesOrderStatus["SHIPPED"] = "SHIPPED";
    SalesOrderStatus["INVOICED"] = "INVOICED";
    SalesOrderStatus["CLOSED"] = "CLOSED";
    SalesOrderStatus["CANCELLED"] = "CANCELLED";
})(SalesOrderStatus || (SalesOrderStatus = {}));
/**
 * Sales order line status
 */
export var SalesOrderLineStatus;
(function (SalesOrderLineStatus) {
    SalesOrderLineStatus["PENDING"] = "PENDING";
    SalesOrderLineStatus["PICKED"] = "PICKED";
    SalesOrderLineStatus["SHIPPED"] = "SHIPPED";
    SalesOrderLineStatus["INVOICED"] = "INVOICED";
    SalesOrderLineStatus["BACKORDERED"] = "BACKORDERED";
    SalesOrderLineStatus["CANCELLED"] = "CANCELLED";
})(SalesOrderLineStatus || (SalesOrderLineStatus = {}));
/**
 * Source channel for orders
 */
export var OrderSourceChannel;
(function (OrderSourceChannel) {
    OrderSourceChannel["WEB"] = "WEB";
    OrderSourceChannel["PHONE"] = "PHONE";
    OrderSourceChannel["EMAIL"] = "EMAIL";
    OrderSourceChannel["FAX"] = "FAX";
    OrderSourceChannel["ECOMMERCE"] = "ECOMMERCE";
    OrderSourceChannel["WALK_IN"] = "WALK_IN";
})(OrderSourceChannel || (OrderSourceChannel = {}));
/**
 * Approval status
 */
export var ApprovalStatus;
(function (ApprovalStatus) {
    ApprovalStatus["PENDING"] = "PENDING";
    ApprovalStatus["APPROVED"] = "APPROVED";
    ApprovalStatus["REJECTED"] = "REJECTED";
})(ApprovalStatus || (ApprovalStatus = {}));
/**
 * Transaction type for commissions
 */
export var CommissionTransactionType;
(function (CommissionTransactionType) {
    CommissionTransactionType["SALE"] = "SALE";
    CommissionTransactionType["PAYMENT"] = "PAYMENT";
    CommissionTransactionType["ADJUSTMENT"] = "ADJUSTMENT";
})(CommissionTransactionType || (CommissionTransactionType = {}));
/**
 * Commission status
 */
export var CommissionStatus;
(function (CommissionStatus) {
    CommissionStatus["EARNED"] = "EARNED";
    CommissionStatus["PAID"] = "PAID";
    CommissionStatus["VOIDED"] = "VOIDED";
})(CommissionStatus || (CommissionStatus = {}));
/**
 * Territory type
 */
export var TerritoryType;
(function (TerritoryType) {
    TerritoryType["REGION"] = "REGION";
    TerritoryType["DISTRICT"] = "DISTRICT";
    TerritoryType["AREA"] = "AREA";
    TerritoryType["ZONE"] = "ZONE";
})(TerritoryType || (TerritoryType = {}));
/**
 * Backorder status
 */
export var BackorderStatus;
(function (BackorderStatus) {
    BackorderStatus["OPEN"] = "OPEN";
    BackorderStatus["PARTIAL"] = "PARTIAL";
    BackorderStatus["FULFILLED"] = "FULFILLED";
    BackorderStatus["CANCELLED"] = "CANCELLED";
})(BackorderStatus || (BackorderStatus = {}));
