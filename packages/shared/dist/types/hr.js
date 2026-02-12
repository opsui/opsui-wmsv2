/**
 * HR & Payroll Types
 *
 * Types for the Human Resources and Payroll module with NZ tax compliance
 * All types align with the database schema in migrations 046 and 047
 */
// ============================================================================
// ENUMS
// ============================================================================
export var HREmployeeStatus;
(function (HREmployeeStatus) {
    HREmployeeStatus["ACTIVE"] = "ACTIVE";
    HREmployeeStatus["ON_LEAVE"] = "ON_LEAVE";
    HREmployeeStatus["TERMINATED"] = "TERMINATED";
    HREmployeeStatus["RESIGNED"] = "RESIGNED";
})(HREmployeeStatus || (HREmployeeStatus = {}));
export var HREmploymentType;
(function (HREmploymentType) {
    HREmploymentType["FULL_TIME"] = "FULL_TIME";
    HREmploymentType["PART_TIME"] = "PART_TIME";
    HREmploymentType["CASUAL"] = "CASUAL";
    HREmploymentType["CONTRACT"] = "CONTRACT";
    HREmploymentType["FIXED_TERM"] = "FIXED_TERM";
})(HREmploymentType || (HREmploymentType = {}));
export var HRPayFrequency;
(function (HRPayFrequency) {
    HRPayFrequency["WEEKLY"] = "WEEKLY";
    HRPayFrequency["FORTNIGHTLY"] = "FORTNIGHTLY";
    HRPayFrequency["MONTHLY"] = "MONTHLY";
    HRPayFrequency["BI_MONTHLY"] = "BI_MONTHLY";
})(HRPayFrequency || (HRPayFrequency = {}));
export var HRNZTaxCode;
(function (HRNZTaxCode) {
    // Main income
    HRNZTaxCode["M"] = "M";
    HRNZTaxCode["ME"] = "ME";
    HRNZTaxCode["ML"] = "ML";
    // Secondary income
    HRNZTaxCode["L"] = "L";
    HRNZTaxCode["SL"] = "SL";
    HRNZTaxCode["SH"] = "SH";
    HRNZTaxCode["S"] = "S";
    HRNZTaxCode["ST"] = "ST";
    // Special codes
    HRNZTaxCode["WA"] = "WA";
    HRNZTaxCode["WT"] = "WT";
    HRNZTaxCode["CAE"] = "CAE";
    HRNZTaxCode["EDW"] = "EDW";
    HRNZTaxCode["NSW"] = "NSW";
})(HRNZTaxCode || (HRNZTaxCode = {}));
export var HRKiwiSaverRate;
(function (HRKiwiSaverRate) {
    HRKiwiSaverRate["RATE_3"] = "RATE_3";
    HRKiwiSaverRate["RATE_4"] = "RATE_4";
    HRKiwiSaverRate["RATE_6"] = "RATE_6";
    HRKiwiSaverRate["RATE_8"] = "RATE_8";
    HRKiwiSaverRate["RATE_10"] = "RATE_10";
})(HRKiwiSaverRate || (HRKiwiSaverRate = {}));
export var HRTimesheetStatus;
(function (HRTimesheetStatus) {
    HRTimesheetStatus["DRAFT"] = "DRAFT";
    HRTimesheetStatus["SUBMITTED"] = "SUBMITTED";
    HRTimesheetStatus["APPROVED"] = "APPROVED";
    HRTimesheetStatus["REJECTED"] = "REJECTED";
    HRTimesheetStatus["PAID"] = "PAID";
})(HRTimesheetStatus || (HRTimesheetStatus = {}));
export var HRWorkType;
(function (HRWorkType) {
    HRWorkType["REGULAR"] = "REGULAR";
    HRWorkType["OVERTIME_1_5"] = "OVERTIME_1_5";
    HRWorkType["OVERTIME_2_0"] = "OVERTIME_2_0";
    HRWorkType["DOUBLE_TIME"] = "DOUBLE_TIME";
    HRWorkType["SUNDAY"] = "SUNDAY";
    HRWorkType["PUBLIC_HOLIDAY"] = "PUBLIC_HOLIDAY";
    HRWorkType["ON_CALL"] = "ON_CALL";
    HRWorkType["TRAVEL"] = "TRAVEL";
    HRWorkType["OTHER"] = "OTHER";
})(HRWorkType || (HRWorkType = {}));
export var HRPayrollStatus;
(function (HRPayrollStatus) {
    HRPayrollStatus["DRAFT"] = "DRAFT";
    HRPayrollStatus["CALCULATED"] = "CALCULATED";
    HRPayrollStatus["PROCESSING"] = "PROCESSING";
    HRPayrollStatus["PROCESSED"] = "PROCESSED";
    HRPayrollStatus["PAID"] = "PAID";
    HRPayrollStatus["CANCELLED"] = "CANCELLED";
})(HRPayrollStatus || (HRPayrollStatus = {}));
export var HRDeductionCategory;
(function (HRDeductionCategory) {
    HRDeductionCategory["TAX"] = "TAX";
    HRDeductionCategory["KIWISAVER"] = "KIWISAVER";
    HRDeductionCategory["ACC"] = "ACC";
    HRDeductionCategory["UNION"] = "UNION";
    HRDeductionCategory["MEDICAL"] = "MEDICAL";
    HRDeductionCategory["INSURANCE"] = "INSURANCE";
    HRDeductionCategory["LOAN"] = "LOAN";
    HRDeductionCategory["GARNISHMENT"] = "GARNISHMENT";
    HRDeductionCategory["OTHER"] = "OTHER";
})(HRDeductionCategory || (HRDeductionCategory = {}));
export var HRLeaveStatus;
(function (HRLeaveStatus) {
    HRLeaveStatus["PENDING"] = "PENDING";
    HRLeaveStatus["APPROVED"] = "APPROVED";
    HRLeaveStatus["DECLINED"] = "DECLINED";
    HRLeaveStatus["CANCELLED"] = "CANCELLED";
    HRLeaveStatus["COMPLETED"] = "COMPLETED";
})(HRLeaveStatus || (HRLeaveStatus = {}));
export var HRLeaveTypeEnum;
(function (HRLeaveTypeEnum) {
    HRLeaveTypeEnum["ANNUAL"] = "ANNUAL";
    HRLeaveTypeEnum["SICK"] = "SICK";
    HRLeaveTypeEnum["BEREAVEMENT"] = "BEREAVEMENT";
    HRLeaveTypeEnum["PARENTAL"] = "PARENTAL";
    HRLeaveTypeEnum["UNPAID"] = "UNPAID";
    HRLeaveTypeEnum["COMP_TIME"] = "COMP_TIME";
    HRLeaveTypeEnum["JURY_DUTY"] = "JURY_DUTY";
    HRLeaveTypeEnum["DOMESTIC_VIOLENCE"] = "DOMESTIC_VIOLENCE";
    HRLeaveTypeEnum["LONG_SERVICE"] = "LONG_SERVICE";
    HRLeaveTypeEnum["OTHER"] = "OTHER";
})(HRLeaveTypeEnum || (HRLeaveTypeEnum = {}));
