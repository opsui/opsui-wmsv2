/**
 * Maintenance & Assets Module Types
 *
 * Basic equipment maintenance scheduling and asset tracking functionality
 */
// ============================================================================
// ENUMS
// ============================================================================
export var AssetStatus;
(function (AssetStatus) {
    AssetStatus["OPERATIONAL"] = "OPERATIONAL";
    AssetStatus["IN_MAINTENANCE"] = "IN_MAINTENANCE";
    AssetStatus["OUT_OF_SERVICE"] = "OUT_OF_SERVICE";
    AssetStatus["RETIRED"] = "RETIRED";
})(AssetStatus || (AssetStatus = {}));
export var AssetType;
(function (AssetType) {
    AssetType["MACHINERY"] = "MACHINERY";
    AssetType["VEHICLE"] = "VEHICLE";
    AssetType["EQUIPMENT"] = "EQUIPMENT";
    AssetType["FACILITY"] = "FACILITY";
    AssetType["TOOL"] = "TOOL";
    AssetType["OTHER"] = "OTHER";
})(AssetType || (AssetType = {}));
export var MaintenanceStatus;
(function (MaintenanceStatus) {
    MaintenanceStatus["SCHEDULED"] = "SCHEDULED";
    MaintenanceStatus["IN_PROGRESS"] = "IN_PROGRESS";
    MaintenanceStatus["COMPLETED"] = "COMPLETED";
    MaintenanceStatus["CANCELLED"] = "CANCELLED";
    MaintenanceStatus["OVERDUE"] = "OVERDUE";
})(MaintenanceStatus || (MaintenanceStatus = {}));
export var MaintenancePriority;
(function (MaintenancePriority) {
    MaintenancePriority["LOW"] = "LOW";
    MaintenancePriority["MEDIUM"] = "MEDIUM";
    MaintenancePriority["HIGH"] = "HIGH";
    MaintenancePriority["EMERGENCY"] = "EMERGENCY";
})(MaintenancePriority || (MaintenancePriority = {}));
export var MaintenanceType;
(function (MaintenanceType) {
    MaintenanceType["PREVENTIVE"] = "PREVENTIVE";
    MaintenanceType["CORRECTIVE"] = "CORRECTIVE";
    MaintenanceType["EMERGENCY"] = "EMERGENCY";
    MaintenanceType["PREDICTIVE"] = "PREDICTIVE";
})(MaintenanceType || (MaintenanceType = {}));
