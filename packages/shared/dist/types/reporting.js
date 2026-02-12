/**
 * Advanced Reporting Types
 *
 * Defines the domain model for custom reports,
 * scheduled reports, and data exports.
 */
// ============================================================================
// ENUMS
// ============================================================================
export var ReportType;
(function (ReportType) {
    ReportType["INVENTORY"] = "INVENTORY";
    ReportType["ORDERS"] = "ORDERS";
    ReportType["SHIPPING"] = "SHIPPING";
    ReportType["RECEIVING"] = "RECEIVING";
    ReportType["PICKING_PERFORMANCE"] = "PICKING_PERFORMANCE";
    ReportType["PACKING_PERFORMANCE"] = "PACKING_PERFORMANCE";
    ReportType["CYCLE_COUNTS"] = "CYCLE_COUNTS";
    ReportType["LOCATION_UTILIZATION"] = "LOCATION_UTILIZATION";
    ReportType["USER_PERFORMANCE"] = "USER_PERFORMANCE";
    ReportType["CUSTOM"] = "CUSTOM";
})(ReportType || (ReportType = {}));
export var ReportFormat;
(function (ReportFormat) {
    ReportFormat["PDF"] = "PDF";
    ReportFormat["EXCEL"] = "EXCEL";
    ReportFormat["CSV"] = "CSV";
    ReportFormat["HTML"] = "HTML";
    ReportFormat["JSON"] = "JSON";
})(ReportFormat || (ReportFormat = {}));
export var ReportStatus;
(function (ReportStatus) {
    ReportStatus["DRAFT"] = "DRAFT";
    ReportStatus["SCHEDULED"] = "SCHEDULED";
    ReportStatus["RUNNING"] = "RUNNING";
    ReportStatus["COMPLETED"] = "COMPLETED";
    ReportStatus["FAILED"] = "FAILED";
    ReportStatus["CANCELLED"] = "CANCELLED";
})(ReportStatus || (ReportStatus = {}));
export var ScheduleFrequency;
(function (ScheduleFrequency) {
    ScheduleFrequency["ON_DEMAND"] = "ON_DEMAND";
    ScheduleFrequency["HOURLY"] = "HOURLY";
    ScheduleFrequency["DAILY"] = "DAILY";
    ScheduleFrequency["WEEKLY"] = "WEEKLY";
    ScheduleFrequency["MONTHLY"] = "MONTHLY";
    ScheduleFrequency["QUARTERLY"] = "QUARTERLY";
    ScheduleFrequency["YEARLY"] = "YEARLY";
})(ScheduleFrequency || (ScheduleFrequency = {}));
export var ChartType;
(function (ChartType) {
    ChartType["TABLE"] = "TABLE";
    ChartType["BAR"] = "BAR";
    ChartType["LINE"] = "LINE";
    ChartType["PIE"] = "PIE";
    ChartType["AREA"] = "AREA";
    ChartType["SCATTER"] = "SCATTER";
    ChartType["GAUGE"] = "GAUGE";
    ChartType["HEATMAP"] = "HEATMAP";
})(ChartType || (ChartType = {}));
export var AggregationType;
(function (AggregationType) {
    AggregationType["COUNT"] = "COUNT";
    AggregationType["SUM"] = "SUM";
    AggregationType["AVG"] = "AVG";
    AggregationType["MIN"] = "MIN";
    AggregationType["MAX"] = "MAX";
    AggregationType["DISTINCT_COUNT"] = "DISTINCT_COUNT";
    AggregationType["MEDIAN"] = "MEDIAN";
    AggregationType["PERCENTILE"] = "PERCENTILE";
})(AggregationType || (AggregationType = {}));
