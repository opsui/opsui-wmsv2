/**
 * Projects Module Types
 *
 * Types for project management, time/expense tracking, billing, and resource allocation
 * Integrates with Accounting, HR, Inventory, and Sales modules
 */
// ============================================================================
// ENUMS
// ============================================================================
/**
 * Project contract/billing type
 */
export var ProjectType;
(function (ProjectType) {
    ProjectType["FIXED_BID"] = "FIXED_BID";
    ProjectType["TIME_MATERIALS"] = "TIME_MATERIALS";
    ProjectType["COST_PLUS"] = "COST_PLUS";
    ProjectType["RETAINER"] = "RETAINER";
    ProjectType["INTERNAL"] = "INTERNAL";
})(ProjectType || (ProjectType = {}));
/**
 * Project status
 */
export var ProjectStatus;
(function (ProjectStatus) {
    ProjectStatus["DRAFT"] = "DRAFT";
    ProjectStatus["PLANNING"] = "PLANNING";
    ProjectStatus["ACTIVE"] = "ACTIVE";
    ProjectStatus["ON_HOLD"] = "ON_HOLD";
    ProjectStatus["COMPLETED"] = "COMPLETED";
    ProjectStatus["CANCELLED"] = "CANCELLED";
})(ProjectStatus || (ProjectStatus = {}));
/**
 * Task status
 */
export var TaskStatus;
(function (TaskStatus) {
    TaskStatus["NOT_STARTED"] = "NOT_STARTED";
    TaskStatus["IN_PROGRESS"] = "IN_PROGRESS";
    TaskStatus["COMPLETED"] = "COMPLETED";
    TaskStatus["ON_HOLD"] = "ON_HOLD";
    TaskStatus["CANCELLED"] = "CANCELLED";
})(TaskStatus || (TaskStatus = {}));
/**
 * Task priority
 */
export var TaskPriority;
(function (TaskPriority) {
    TaskPriority["LOW"] = "LOW";
    TaskPriority["MEDIUM"] = "MEDIUM";
    TaskPriority["HIGH"] = "HIGH";
    TaskPriority["URGENT"] = "URGENT";
})(TaskPriority || (TaskPriority = {}));
/**
 * Work type for time entries
 */
export var WorkType;
(function (WorkType) {
    WorkType["REGULAR"] = "REGULAR";
    WorkType["OVERTIME_1_5"] = "OVERTIME_1_5";
    WorkType["OVERTIME_2_0"] = "OVERTIME_2_0";
    WorkType["TRAVEL"] = "TRAVEL";
    WorkType["TRAINING"] = "TRAINING";
})(WorkType || (WorkType = {}));
/**
 * Expense category
 */
export var ExpenseCategory;
(function (ExpenseCategory) {
    ExpenseCategory["TRAVEL"] = "TRAVEL";
    ExpenseCategory["MATERIALS"] = "MATERIALS";
    ExpenseCategory["SUBCONTRACTOR"] = "SUBCONTRACTOR";
    ExpenseCategory["EQUIPMENT"] = "EQUIPMENT";
    ExpenseCategory["SOFTWARE"] = "SOFTWARE";
    ExpenseCategory["OTHER"] = "OTHER";
})(ExpenseCategory || (ExpenseCategory = {}));
/**
 * Billing type
 */
export var BillingType;
(function (BillingType) {
    BillingType["MILESTONE"] = "MILESTONE";
    BillingType["PROGRESS"] = "PROGRESS";
    BillingType["TIME_MATERIAL"] = "TIME_MATERIAL";
    BillingType["FIXED_INTERVAL"] = "FIXED_INTERVAL";
    BillingType["COMPLETION"] = "COMPLETION";
})(BillingType || (BillingType = {}));
/**
 * Billing schedule status
 */
export var BillingScheduleStatus;
(function (BillingScheduleStatus) {
    BillingScheduleStatus["PENDING"] = "PENDING";
    BillingScheduleStatus["BILLED"] = "BILLED";
    BillingScheduleStatus["PAID"] = "PAID";
    BillingScheduleStatus["OVERDUE"] = "OVERDUE";
})(BillingScheduleStatus || (BillingScheduleStatus = {}));
/**
 * Issue type
 */
export var IssueType;
(function (IssueType) {
    IssueType["ISSUE"] = "ISSUE";
    IssueType["RISK"] = "RISK";
    IssueType["DEFECT"] = "DEFECT";
    IssueType["CHANGE_REQUEST"] = "CHANGE_REQUEST";
})(IssueType || (IssueType = {}));
/**
 * Issue severity
 */
export var IssueSeverity;
(function (IssueSeverity) {
    IssueSeverity["LOW"] = "LOW";
    IssueSeverity["MEDIUM"] = "MEDIUM";
    IssueSeverity["HIGH"] = "HIGH";
    IssueSeverity["CRITICAL"] = "CRITICAL";
})(IssueSeverity || (IssueSeverity = {}));
/**
 * Issue status
 */
export var IssueStatus;
(function (IssueStatus) {
    IssueStatus["OPEN"] = "OPEN";
    IssueStatus["IN_PROGRESS"] = "IN_PROGRESS";
    IssueStatus["RESOLVED"] = "RESOLVED";
    IssueStatus["CLOSED"] = "CLOSED";
})(IssueStatus || (IssueStatus = {}));
