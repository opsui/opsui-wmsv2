/**
 * Manufacturing Module Types
 *
 * Types for advanced manufacturing operations
 * Integrates with Production, Inventory, Purchasing, HR, and Projects modules
 */
// ============================================================================
// ENUMS
// ============================================================================
/**
 * Work Center Status
 */
export var WorkCenterStatus;
(function (WorkCenterStatus) {
    WorkCenterStatus["ACTIVE"] = "ACTIVE";
    WorkCenterStatus["INACTIVE"] = "INACTIVE";
    WorkCenterStatus["MAINTENANCE"] = "MAINTENANCE";
    WorkCenterStatus["DOWN"] = "DOWN";
})(WorkCenterStatus || (WorkCenterStatus = {}));
/**
 * Routing Status
 */
export var RoutingStatus;
(function (RoutingStatus) {
    RoutingStatus["DRAFT"] = "DRAFT";
    RoutingStatus["ACTIVE"] = "ACTIVE";
    RoutingStatus["INACTIVE"] = "INACTIVE";
    RoutingStatus["SUPERSEDED"] = "SUPERSEDED";
})(RoutingStatus || (RoutingStatus = {}));
/**
 * Operation Type
 */
export var OperationType;
(function (OperationType) {
    OperationType["SETUP"] = "SETUP";
    OperationType["MACHINING"] = "MACHINING";
    OperationType["ASSEMBLY"] = "ASSEMBLY";
    OperationType["INSPECTION"] = "INSPECTION";
    OperationType["PACKAGING"] = "PACKAGING";
    OperationType["OUTSIDE_PROCESS"] = "OUTSIDE_PROCESS";
})(OperationType || (OperationType = {}));
/**
 * Production Order Status
 */
export var ProductionOrderStatus;
(function (ProductionOrderStatus) {
    ProductionOrderStatus["DRAFT"] = "DRAFT";
    ProductionOrderStatus["PLANNED"] = "PLANNED";
    ProductionOrderStatus["RELEASED"] = "RELEASED";
    ProductionOrderStatus["IN_PROGRESS"] = "IN_PROGRESS";
    ProductionOrderStatus["COMPLETED"] = "COMPLETED";
    ProductionOrderStatus["CLOSED"] = "CLOSED";
    ProductionOrderStatus["CANCELLED"] = "CANCELLED";
})(ProductionOrderStatus || (ProductionOrderStatus = {}));
/**
 * MPS Status
 */
export var MPSStatus;
(function (MPSStatus) {
    MPSStatus["DRAFT"] = "DRAFT";
    MPSStatus["SUBMITTED"] = "SUBMITTED";
    MPSStatus["APPROVED"] = "APPROVED";
    MPSStatus["FIRM"] = "FIRM";
    MPSStatus["RELEASED"] = "RELEASED";
})(MPSStatus || (MPSStatus = {}));
/**
 * MRP Plan Status
 */
export var MRPPlanStatus;
(function (MRPPlanStatus) {
    MRPPlanStatus["DRAFT"] = "DRAFT";
    MRPPlanStatus["CALCULATING"] = "CALCULATING";
    MRPPlanStatus["COMPLETED"] = "COMPLETED";
    MRPPlanStatus["APPROVED"] = "APPROVED";
    MRPPlanStatus["RELEASED"] = "RELEASED";
    MRPPlanStatus["ARCHIVED"] = "ARCHIVED";
})(MRPPlanStatus || (MRPPlanStatus = {}));
/**
 * MRP Action Type
 */
export var MRPActionType;
(function (MRPActionType) {
    MRPActionType["RELEASE_ORDER"] = "RELEASE_ORDER";
    MRPActionType["RESCHEDULE_IN"] = "RESCHEDULE_IN";
    MRPActionType["RESCHEDULE_OUT"] = "RESCHEDULE_OUT";
    MRPActionType["CANCEL_ORDER"] = "CANCEL_ORDER";
    MRPActionType["ADJUST_QUANTITY"] = "ADJUST_QUANTITY";
    MRPActionType["EXPEDITE"] = "EXPEDITE";
    MRPActionType["DE_EXPEDITE"] = "DE_EXPEDITE";
})(MRPActionType || (MRPActionType = {}));
/**
 * Shop Floor Transaction Type
 */
export var ShopFloorTransactionType;
(function (ShopFloorTransactionType) {
    ShopFloorTransactionType["CLOCK_ON"] = "CLOCK_ON";
    ShopFloorTransactionType["CLOCK_OFF"] = "CLOCK_OFF";
    ShopFloorTransactionType["REPORT_QUANTITY"] = "REPORT_QUANTITY";
    ShopFloorTransactionType["REPORT_SCRAP"] = "REPORT_SCRAP";
    ShopFloorTransactionType["REPORT_REWORK"] = "REPORT_REWORK";
    ShopFloorTransactionType["MOVE_OPERATION"] = "MOVE_OPERATION";
    ShopFloorTransactionType["COMPLETE_OPERATION"] = "COMPLETE_OPERATION";
    ShopFloorTransactionType["SUSPEND"] = "SUSPEND";
    ShopFloorTransactionType["RESUME"] = "RESUME";
})(ShopFloorTransactionType || (ShopFloorTransactionType = {}));
/**
 * Defect Type
 */
export var DefectType;
(function (DefectType) {
    DefectType["DIMENSIONAL"] = "DIMENSIONAL";
    DefectType["COSMETIC"] = "COSMETIC";
    DefectType["FUNCTIONAL"] = "FUNCTIONAL";
    DefectType["MATERIAL"] = "MATERIAL";
    DefectType["ASSEMBLY"] = "ASSEMBLY";
    DefectType["PACKAGING"] = "PACKAGING";
    DefectType["DOCUMENTATION"] = "DOCUMENTATION";
    DefectType["OTHER"] = "OTHER";
})(DefectType || (DefectType = {}));
/**
 * Defect Severity
 */
export var DefectSeverity;
(function (DefectSeverity) {
    DefectSeverity["MINOR"] = "MINOR";
    DefectSeverity["MAJOR"] = "MAJOR";
    DefectSeverity["CRITICAL"] = "CRITICAL";
})(DefectSeverity || (DefectSeverity = {}));
/**
 * Defect Disposition
 */
export var DefectDisposition;
(function (DefectDisposition) {
    DefectDisposition["ACCEPT"] = "ACCEPT";
    DefectDisposition["REWORK"] = "REWORK";
    DefectDisposition["SCRAP"] = "SCRAP";
    DefectDisposition["RETURN_TO_VENDOR"] = "RETURN_TO_VENDOR";
    DefectDisposition["CONCESSION"] = "CONCESSION";
    DefectDisposition["QUARANTINE"] = "QUARANTINE";
})(DefectDisposition || (DefectDisposition = {}));
/**
 * Capacity Plan Status
 */
export var CapacityPlanStatus;
(function (CapacityPlanStatus) {
    CapacityPlanStatus["DRAFT"] = "DRAFT";
    CapacityPlanStatus["SUBMITTED"] = "SUBMITTED";
    CapacityPlanStatus["APPROVED"] = "APPROVED";
    CapacityPlanStatus["ACTIVE"] = "ACTIVE";
    CapacityPlanStatus["COMPLETED"] = "COMPLETED";
})(CapacityPlanStatus || (CapacityPlanStatus = {}));
