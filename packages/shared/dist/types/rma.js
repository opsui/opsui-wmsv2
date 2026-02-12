/**
 * RMA (Return Merchandise Authorization) Module Types
 *
 * Comprehensive returns management system for handling customer returns,
 * warranty claims, refurbishments, and exchanges
 */
// ============================================================================
// ENUMS
// ============================================================================
export var RMAStatus;
(function (RMAStatus) {
    RMAStatus["PENDING"] = "PENDING";
    RMAStatus["APPROVED"] = "APPROVED";
    RMAStatus["REJECTED"] = "REJECTED";
    RMAStatus["RECEIVED"] = "RECEIVED";
    RMAStatus["INSPECTING"] = "INSPECTING";
    RMAStatus["AWAITING_DECISION"] = "AWAITING_DECISION";
    RMAStatus["REFUND_APPROVED"] = "REFUND_APPROVED";
    RMAStatus["REFUND_PROCESSING"] = "REFUND_PROCESSING";
    RMAStatus["REFUNDED"] = "REFUNDED";
    RMAStatus["REPLACEMENT_APPROVED"] = "REPLACEMENT_APPROVED";
    RMAStatus["REPLACEMENT_PROCESSING"] = "REPLACEMENT_PROCESSING";
    RMAStatus["REPLACED"] = "REPLACED";
    RMAStatus["REPAIR_APPROVED"] = "REPAIR_APPROVED";
    RMAStatus["REPAIRING"] = "REPAIRING";
    RMAStatus["REPAIRED"] = "REPAIRED";
    RMAStatus["CLOSED"] = "CLOSED";
})(RMAStatus || (RMAStatus = {}));
export var RMAReason;
(function (RMAReason) {
    RMAReason["DEFECTIVE"] = "DEFECTIVE";
    RMAReason["DAMAGED_SHIPPING"] = "DAMAGED_SHIPPING";
    RMAReason["WRONG_ITEM"] = "WRONG_ITEM";
    RMAReason["NO_LONGER_NEEDED"] = "NO_LONGER_NEEDED";
    RMAReason["WARRANTY"] = "WARRANTY";
    RMAReason["QUALITY_ISSUE"] = "QUALITY_ISSUE";
    RMAReason["MISSING_PARTS"] = "MISSING_PARTS";
    RMAReason["ARRIVED_LATE"] = "ARRIVED_LATE";
    RMAReason["ORDER_ERROR"] = "ORDER_ERROR";
    RMAReason["OTHER"] = "OTHER";
})(RMAReason || (RMAReason = {}));
export var RMAPriority;
(function (RMAPriority) {
    RMAPriority["LOW"] = "LOW";
    RMAPriority["NORMAL"] = "NORMAL";
    RMAPriority["HIGH"] = "HIGH";
    RMAPriority["URGENT"] = "URGENT";
})(RMAPriority || (RMAPriority = {}));
export var RMAResolutionType;
(function (RMAResolutionType) {
    RMAResolutionType["REFUND"] = "REFUND";
    RMAResolutionType["REPLACEMENT"] = "REPLACEMENT";
    RMAResolutionType["REPAIR"] = "REPAIR";
    RMAResolutionType["CREDIT"] = "CREDIT";
    RMAResolutionType["EXCHANGE"] = "EXCHANGE";
    RMAResolutionType["RESTOCK"] = "RESTOCK";
    RMAResolutionType["DISPOSE"] = "DISPOSE";
})(RMAResolutionType || (RMAResolutionType = {}));
export var RMACondition;
(function (RMACondition) {
    RMACondition["NEW"] = "NEW";
    RMACondition["LIKE_NEW"] = "LIKE_NEW";
    RMACondition["GOOD"] = "GOOD";
    RMACondition["FAIR"] = "FAIR";
    RMACondition["POOR"] = "POOR";
    RMACondition["DAMAGED"] = "DAMAGED";
    RMACondition["UNSALEABLE"] = "UNSALEABLE";
})(RMACondition || (RMACondition = {}));
export var RMADisposition;
(function (RMADisposition) {
    RMADisposition["RESALE"] = "RESALE";
    RMADisposition["REFURBISH"] = "REFURBISH";
    RMADisposition["REPAIR"] = "REPAIR";
    RMADisposition["RETURN_TO_VENDOR"] = "RETURN_TO_VENDOR";
    RMADisposition["DISPOSE"] = "DISPOSE";
    RMADisposition["DONATE"] = "DONATE";
    RMADisposition["QUARANTINE"] = "QUARANTINE";
})(RMADisposition || (RMADisposition = {}));
