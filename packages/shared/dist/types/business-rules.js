/**
 * Business Rules Engine Types
 *
 * Defines the domain model for configurable business rules,
 * rule conditions, actions, and allocation logic.
 */
// ============================================================================
// ENUMS
// ============================================================================
export var RuleType;
(function (RuleType) {
    RuleType["ALLOCATION"] = "ALLOCATION";
    RuleType["PICKING"] = "PICKING";
    RuleType["SHIPPING"] = "SHIPPING";
    RuleType["INVENTORY"] = "INVENTORY";
    RuleType["PRICING"] = "PRICING";
    RuleType["VALIDATION"] = "VALIDATION";
    RuleType["NOTIFICATION"] = "NOTIFICATION";
})(RuleType || (RuleType = {}));
export var RuleStatus;
(function (RuleStatus) {
    RuleStatus["DRAFT"] = "DRAFT";
    RuleStatus["ACTIVE"] = "ACTIVE";
    RuleStatus["INACTIVE"] = "INACTIVE";
    RuleStatus["ARCHIVED"] = "ARCHIVED";
})(RuleStatus || (RuleStatus = {}));
export var ConditionOperator;
(function (ConditionOperator) {
    ConditionOperator["EQUALS"] = "EQUALS";
    ConditionOperator["NOT_EQUALS"] = "NOT_EQUALS";
    ConditionOperator["GREATER_THAN"] = "GREATER_THAN";
    ConditionOperator["LESS_THAN"] = "LESS_THAN";
    ConditionOperator["GREATER_THAN_OR_EQUAL"] = "GREATER_THAN_OR_EQUAL";
    ConditionOperator["LESS_THAN_OR_EQUAL"] = "LESS_THAN_OR_EQUAL";
    ConditionOperator["CONTAINS"] = "CONTAINS";
    ConditionOperator["NOT_CONTAINS"] = "NOT_CONTAINS";
    ConditionOperator["STARTS_WITH"] = "STARTS_WITH";
    ConditionOperator["ENDS_WITH"] = "ENDS_WITH";
    ConditionOperator["IN"] = "IN";
    ConditionOperator["NOT_IN"] = "NOT_IN";
    ConditionOperator["BETWEEN"] = "BETWEEN";
    ConditionOperator["IS_NULL"] = "IS_NULL";
    ConditionOperator["IS_NOT_NULL"] = "IS_NOT_NULL";
    ConditionOperator["MATCHES_REGEX"] = "MATCHES_REGEX";
})(ConditionOperator || (ConditionOperator = {}));
export var LogicalOperator;
(function (LogicalOperator) {
    LogicalOperator["AND"] = "AND";
    LogicalOperator["OR"] = "OR";
})(LogicalOperator || (LogicalOperator = {}));
export var ActionType;
(function (ActionType) {
    ActionType["SET_PRIORITY"] = "SET_PRIORITY";
    ActionType["ALLOCATE_LOCATION"] = "ALLOCATE_LOCATION";
    ActionType["ASSIGN_USER"] = "ASSIGN_USER";
    ActionType["SEND_NOTIFICATION"] = "SEND_NOTIFICATION";
    ActionType["CALCULATE_FIELD"] = "CALCULATE_FIELD";
    ActionType["BLOCK_ACTION"] = "BLOCK_ACTION";
    ActionType["REQUIRE_APPROVAL"] = "REQUIRE_APPROVAL";
    ActionType["UPDATE_INVENTORY"] = "UPDATE_INVENTORY";
    ActionType["CREATE_TASK"] = "CREATE_TASK";
    ActionType["MODIFY_FIELD"] = "MODIFY_FIELD";
})(ActionType || (ActionType = {}));
export var RuleEventType;
(function (RuleEventType) {
    RuleEventType["ORDER_CREATED"] = "ORDER_CREATED";
    RuleEventType["ORDER_UPDATED"] = "ORDER_UPDATED";
    RuleEventType["INVENTORY_ADDED"] = "INVENTORY_ADDED";
    RuleEventType["INVENTORY_REMOVED"] = "INVENTORY_REMOVED";
    RuleEventType["LOCATION_CAPACITY_CHANGED"] = "LOCATION_CAPACITY_CHANGED";
    RuleEventType["USER_ASSIGNED"] = "USER_ASSIGNED";
    RuleEventType["SHIPMENT_CREATED"] = "SHIPMENT_CREATED";
    RuleEventType["PICK_TASK_COMPLETED"] = "PICK_TASK_COMPLETED";
})(RuleEventType || (RuleEventType = {}));
// ============================================================================
// ALLOCATION RULE SPECIFIC TYPES
// ============================================================================
export var AllocationStrategy;
(function (AllocationStrategy) {
    AllocationStrategy["FIFO"] = "FIFO";
    AllocationStrategy["LIFO"] = "LIFO";
    AllocationStrategy["FEFO"] = "FEFO";
    AllocationStrategy["LEAST_PICKS"] = "LEAST_PICKS";
    AllocationStrategy["ZONE_PICKING"] = "ZONE_PICKING";
    AllocationStrategy["WAVE_PICKING"] = "WAVE_PICKING";
    AllocationStrategy["BULK_PICKING"] = "BULK_PICKING";
})(AllocationStrategy || (AllocationStrategy = {}));
