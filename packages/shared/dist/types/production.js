/**
 * Production Management Module Types
 *
 * Basic manufacturing and production workflow functionality
 */
// ============================================================================
// ENUMS
// ============================================================================
export var ProductionOrderStatus;
(function (ProductionOrderStatus) {
    ProductionOrderStatus["DRAFT"] = "DRAFT";
    ProductionOrderStatus["PLANNED"] = "PLANNED";
    ProductionOrderStatus["RELEASED"] = "RELEASED";
    ProductionOrderStatus["IN_PROGRESS"] = "IN_PROGRESS";
    ProductionOrderStatus["ON_HOLD"] = "ON_HOLD";
    ProductionOrderStatus["COMPLETED"] = "COMPLETED";
    ProductionOrderStatus["CANCELLED"] = "CANCELLED";
})(ProductionOrderStatus || (ProductionOrderStatus = {}));
export var ProductionOrderPriority;
(function (ProductionOrderPriority) {
    ProductionOrderPriority["LOW"] = "LOW";
    ProductionOrderPriority["MEDIUM"] = "MEDIUM";
    ProductionOrderPriority["HIGH"] = "HIGH";
    ProductionOrderPriority["URGENT"] = "URGENT";
})(ProductionOrderPriority || (ProductionOrderPriority = {}));
export var BillOfMaterialStatus;
(function (BillOfMaterialStatus) {
    BillOfMaterialStatus["DRAFT"] = "DRAFT";
    BillOfMaterialStatus["ACTIVE"] = "ACTIVE";
    BillOfMaterialStatus["ARCHIVED"] = "ARCHIVED";
})(BillOfMaterialStatus || (BillOfMaterialStatus = {}));
