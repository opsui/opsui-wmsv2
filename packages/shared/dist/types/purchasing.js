/**
 * Purchasing Module Types
 *
 * Types for purchase requisitions, RFQ management, three-way matching,
 * vendor catalogs, and vendor performance tracking
 *
 * Integrates with Inventory, Accounting, Projects, and Multi-Entity modules
 */
// ============================================================================
// ENUMS
// ============================================================================
/**
 * Requisition Status
 */
export var RequisitionStatus;
(function (RequisitionStatus) {
    RequisitionStatus["DRAFT"] = "DRAFT";
    RequisitionStatus["SUBMITTED"] = "SUBMITTED";
    RequisitionStatus["PENDING_APPROVAL"] = "PENDING_APPROVAL";
    RequisitionStatus["APPROVED"] = "APPROVED";
    RequisitionStatus["REJECTED"] = "REJECTED";
    RequisitionStatus["CANCELLED"] = "CANCELLED";
    RequisitionStatus["CONVERTED_TO_PO"] = "CONVERTED_TO_PO";
})(RequisitionStatus || (RequisitionStatus = {}));
/**
 * RFQ Status
 */
export var RFQStatus;
(function (RFQStatus) {
    RFQStatus["DRAFT"] = "DRAFT";
    RFQStatus["SENT"] = "SENT";
    RFQStatus["RESPONSES_PENDING"] = "RESPONSES_PENDING";
    RFQStatus["RESPONSES_RECEIVED"] = "RESPONSES_RECEIVED";
    RFQStatus["UNDER_REVIEW"] = "UNDER_REVIEW";
    RFQStatus["AWARDED"] = "AWARDED";
    RFQStatus["CANCELLED"] = "CANCELLED";
})(RFQStatus || (RFQStatus = {}));
/**
 * Vendor Response Status
 */
export var VendorResponseStatus;
(function (VendorResponseStatus) {
    VendorResponseStatus["PENDING"] = "PENDING";
    VendorResponseStatus["RECEIVED"] = "RECEIVED";
    VendorResponseStatus["ACCEPTED"] = "ACCEPTED";
    VendorResponseStatus["REJECTED"] = "REJECTED";
    VendorResponseStatus["WITHDRAWN"] = "WITHDRAWN";
})(VendorResponseStatus || (VendorResponseStatus = {}));
/**
 * Three-Way Match Status
 */
export var ThreeWayMatchStatus;
(function (ThreeWayMatchStatus) {
    ThreeWayMatchStatus["PENDING_RECEIPT"] = "PENDING_RECEIPT";
    ThreeWayMatchStatus["PARTIALLY_RECEIVED"] = "PARTIALLY_RECEIVED";
    ThreeWayMatchStatus["FULLY_RECEIVED"] = "FULLY_RECEIVED";
    ThreeWayMatchStatus["PENDING_INVOICE"] = "PENDING_INVOICE";
    ThreeWayMatchStatus["INVOICE_RECEIVED"] = "INVOICE_RECEIVED";
    ThreeWayMatchStatus["MATCHED"] = "MATCHED";
    ThreeWayMatchStatus["VARIANCE_DETECTED"] = "VARIANCE_DETECTED";
    ThreeWayMatchStatus["DISCREPANCY_RESOLVED"] = "DISCREPANCY_RESOLVED";
    ThreeWayMatchStatus["READY_TO_PAY"] = "READY_TO_PAY";
    ThreeWayMatchStatus["PAID"] = "PAID";
})(ThreeWayMatchStatus || (ThreeWayMatchStatus = {}));
/**
 * Purchase Order Status
 */
export var PurchaseOrderStatus;
(function (PurchaseOrderStatus) {
    PurchaseOrderStatus["DRAFT"] = "DRAFT";
    PurchaseOrderStatus["SUBMITTED"] = "SUBMITTED";
    PurchaseOrderStatus["ACKNOWLEDGED"] = "ACKNOWLEDGED";
    PurchaseOrderStatus["PARTIAL"] = "PARTIAL";
    PurchaseOrderStatus["RECEIVED"] = "RECEIVED";
    PurchaseOrderStatus["CLOSED"] = "CLOSED";
    PurchaseOrderStatus["CANCELLED"] = "CANCELLED";
})(PurchaseOrderStatus || (PurchaseOrderStatus = {}));
/**
 * Receipt Status
 */
export var ReceiptStatus;
(function (ReceiptStatus) {
    ReceiptStatus["OPEN"] = "OPEN";
    ReceiptStatus["PARTIALLY_PUTAWAY"] = "PARTIALLY_PUTAWAY";
    ReceiptStatus["PUTAWAY"] = "PUTAWAY";
    ReceiptStatus["CLOSED"] = "CLOSED";
})(ReceiptStatus || (ReceiptStatus = {}));
/**
 * Quality Status
 */
export var QualityStatus;
(function (QualityStatus) {
    QualityStatus["PENDING"] = "PENDING";
    QualityStatus["PASSED"] = "PASSED";
    QualityStatus["FAILED"] = "FAILED";
    QualityStatus["QUARANTINED"] = "QUARANTINED";
})(QualityStatus || (QualityStatus = {}));
/**
 * Vendor Rating Category
 */
export var VendorRatingCategory;
(function (VendorRatingCategory) {
    VendorRatingCategory["QUALITY"] = "QUALITY";
    VendorRatingCategory["DELIVERY"] = "DELIVERY";
    VendorRatingCategory["COMMUNICATION"] = "COMMUNICATION";
    VendorRatingCategory["PRICE"] = "PRICE";
    VendorRatingCategory["OVERALL"] = "OVERALL";
})(VendorRatingCategory || (VendorRatingCategory = {}));
/**
 * Vendor Performance Rank
 */
export var VendorPerformanceRank;
(function (VendorPerformanceRank) {
    VendorPerformanceRank["EXCELLENT"] = "EXCELLENT";
    VendorPerformanceRank["GOOD"] = "GOOD";
    VendorPerformanceRank["AVERAGE"] = "AVERAGE";
    VendorPerformanceRank["NEEDS_IMPROVEMENT"] = "NEEDS_IMPROVEMENT";
    VendorPerformanceRank["UNSATISFACTORY"] = "UNSATISFACTORY";
    VendorPerformanceRank["CRITICAL"] = "CRITICAL";
})(VendorPerformanceRank || (VendorPerformanceRank = {}));
/**
 * Scorecard Status
 */
export var ScorecardStatus;
(function (ScorecardStatus) {
    ScorecardStatus["DRAFT"] = "DRAFT";
    ScorecardStatus["SUBMITTED"] = "SUBMITTED";
    ScorecardStatus["APPROVED"] = "APPROVED";
    ScorecardStatus["REJECTED"] = "REJECTED";
})(ScorecardStatus || (ScorecardStatus = {}));
/**
 * Requisition Source Type
 */
export var RequisitionSourceType;
(function (RequisitionSourceType) {
    RequisitionSourceType["STOCK_REQUEST"] = "STOCK_REQUEST";
    RequisitionSourceType["PROJECT"] = "PROJECT";
    RequisitionSourceType["PRODUCTION"] = "PRODUCTION";
    RequisitionSourceType["SALES_ORDER"] = "SALES_ORDER";
    RequisitionSourceType["MANUAL"] = "MANUAL";
})(RequisitionSourceType || (RequisitionSourceType = {}));
