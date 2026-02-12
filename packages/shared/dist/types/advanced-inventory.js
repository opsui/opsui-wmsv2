/**
 * Advanced Inventory Types
 *
 * Domain model for advanced inventory management features
 * Landed cost, ABC analysis, demand planning, cycle count optimization
 */
// ============================================================================
// ENUMS
// ============================================================================
/**
 * Landed cost component types
 */
export var LandedCostComponentType;
(function (LandedCostComponentType) {
    LandedCostComponentType["FREIGHT"] = "FREIGHT";
    LandedCostComponentType["DUTY"] = "DUTY";
    LandedCostComponentType["INSURANCE"] = "INSURANCE";
    LandedCostComponentType["HANDLING"] = "HANDLING";
    LandedCostComponentType["OTHER"] = "OTHER";
})(LandedCostComponentType || (LandedCostComponentType = {}));
/**
 * Allocation method for landed costs
 */
export var AllocationMethod;
(function (AllocationMethod) {
    AllocationMethod["PROPORTIONAL"] = "PROPORTIONAL";
    AllocationMethod["EQUAL"] = "EQUAL";
    AllocationMethod["WEIGHT"] = "WEIGHT";
    AllocationMethod["VOLUME"] = "VOLUME";
})(AllocationMethod || (AllocationMethod = {}));
/**
 * ABC classification
 */
export var ABCClass;
(function (ABCClass) {
    ABCClass["A"] = "A";
    ABCClass["B"] = "B";
    ABCClass["C"] = "C";
    ABCClass["D"] = "D";
})(ABCClass || (ABCClass = {}));
/**
 * Inventory layer transaction types
 */
export var LayerTransactionType;
(function (LayerTransactionType) {
    LayerTransactionType["RECEIPT"] = "RECEIPT";
    LayerTransactionType["TRANSFER"] = "TRANSFER";
    LayerTransactionType["ADJUSTMENT"] = "ADJUSTMENT";
    LayerTransactionType["RETURN"] = "RETURN";
})(LayerTransactionType || (LayerTransactionType = {}));
/**
 * Depletion transaction types
 */
export var DepletionTransactionType;
(function (DepletionTransactionType) {
    DepletionTransactionType["SHIPMENT"] = "SHIPMENT";
    DepletionTransactionType["TRANSFER_OUT"] = "TRANSFER_OUT";
    DepletionTransactionType["ADJUSTMENT"] = "ADJUSTMENT";
    DepletionTransactionType["DAMAGE"] = "DAMAGE";
})(DepletionTransactionType || (DepletionTransactionType = {}));
/**
 * Forecast methods
 */
export var ForecastMethod;
(function (ForecastMethod) {
    ForecastMethod["MOVING_AVERAGE"] = "MOVING_AVERAGE";
    ForecastMethod["EXPONENTIAL_SMOOTHING"] = "EXPONENTIAL_SMOOTHING";
    ForecastMethod["TREND"] = "TREND";
    ForecastMethod["SEASONAL"] = "SEASONAL";
    ForecastMethod["ML"] = "ML";
})(ForecastMethod || (ForecastMethod = {}));
/**
 * Period types for forecasting
 */
export var PeriodType;
(function (PeriodType) {
    PeriodType["DAILY"] = "DAILY";
    PeriodType["WEEKLY"] = "WEEKLY";
    PeriodType["MONTHLY"] = "MONTHLY";
    PeriodType["QUARTERLY"] = "QUARTERLY";
})(PeriodType || (PeriodType = {}));
/**
 * Cycle count strategies
 */
export var CycleCountStrategy;
(function (CycleCountStrategy) {
    CycleCountStrategy["ABC_BASED"] = "ABC_BASED";
    CycleCountStrategy["RANDOM"] = "RANDOM";
    CycleCountStrategy["VELOCITY"] = "VELOCITY";
    CycleCountStrategy["LOCATION"] = "LOCATION";
    CycleCountStrategy["ZONE"] = "ZONE";
})(CycleCountStrategy || (CycleCountStrategy = {}));
/**
 * Count priority
 */
export var CountPriority;
(function (CountPriority) {
    CountPriority["HIGH"] = "HIGH";
    CountPriority["MEDIUM"] = "MEDIUM";
    CountPriority["LOW"] = "LOW";
})(CountPriority || (CountPriority = {}));
/**
 * Safety stock calculation method
 */
export var SafetyStockMethod;
(function (SafetyStockMethod) {
    SafetyStockMethod["SERVICE_LEVEL"] = "SERVICE_LEVEL";
    SafetyStockMethod["FIXED_PERIOD"] = "FIXED_PERIOD";
    SafetyStockMethod["MIN_MAX"] = "MIN_MAX";
})(SafetyStockMethod || (SafetyStockMethod = {}));
/**
 * Inventory velocity category
 */
export var VelocityCategory;
(function (VelocityCategory) {
    VelocityCategory["FAST"] = "FAST";
    VelocityCategory["SLOW"] = "SLOW";
    VelocityCategory["OBSOLETE"] = "OBSOLETE";
    VelocityCategory["DEAD"] = "DEAD";
})(VelocityCategory || (VelocityCategory = {}));
