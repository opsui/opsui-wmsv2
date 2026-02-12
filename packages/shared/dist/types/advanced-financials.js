/**
 * Advanced Financials Types
 *
 * Domain model for advanced financial features
 * Financial statements, consolidation, budget vs actual, multi-currency, intercompany, tax
 */
// ============================================================================
// ENUMS
// ============================================================================
/**
 * Financial statement types
 */
export var StatementType;
(function (StatementType) {
    StatementType["BALANCE_SHEET"] = "BALANCE_SHEET";
    StatementType["INCOME_STATEMENT"] = "INCOME_STATEMENT";
    StatementType["CASH_FLOW"] = "CASH_FLOW";
    StatementType["RETAINED_EARNINGS"] = "RETAINED_EARNINGS";
    StatementType["EQUITY_CHANGES"] = "EQUITY_CHANGES";
})(StatementType || (StatementType = {}));
/**
 * Period types for financial reporting
 */
export var PeriodType;
(function (PeriodType) {
    PeriodType["DAILY"] = "DAILY";
    PeriodType["WEEKLY"] = "WEEKLY";
    PeriodType["MONTHLY"] = "MONTHLY";
    PeriodType["QUARTERLY"] = "QUARTERLY";
    PeriodType["ANNUAL"] = "ANNUAL";
    PeriodType["CUSTOM"] = "CUSTOM";
})(PeriodType || (PeriodType = {}));
/**
 * Consolidation methods
 */
export var ConsolidationMethod;
(function (ConsolidationMethod) {
    ConsolidationMethod["FULL"] = "FULL";
    ConsolidationMethod["PROPORTIONAL"] = "PROPORTIONAL";
    ConsolidationMethod["EQUITY"] = "EQUITY";
})(ConsolidationMethod || (ConsolidationMethod = {}));
/**
 * Intercompany transaction types
 */
export var IntercompanyTransactionType;
(function (IntercompanyTransactionType) {
    IntercompanyTransactionType["SALE"] = "SALE";
    IntercompanyTransactionType["PURCHASE"] = "PURCHASE";
    IntercompanyTransactionType["TRANSFER"] = "TRANSFER";
    IntercompanyTransactionType["LOAN"] = "LOAN";
    IntercompanyTransactionType["DIVIDEND"] = "DIVIDEND";
    IntercompanyTransactionType["ROYALTY"] = "ROYALTY";
    IntercompanyTransactionType["SERVICE_FEE"] = "SERVICE_FEE";
})(IntercompanyTransactionType || (IntercompanyTransactionType = {}));
/**
 * Intercompany transaction status
 */
export var IntercompanyStatus;
(function (IntercompanyStatus) {
    IntercompanyStatus["PENDING"] = "PENDING";
    IntercompanyStatus["POSTED"] = "POSTED";
    IntercompanyStatus["ELIMINATED"] = "ELIMINATED";
    IntercompanyStatus["PARTIALLY_ELIMINATED"] = "PARTIALLY_ELIMINATED";
})(IntercompanyStatus || (IntercompanyStatus = {}));
/**
 * Tax types
 */
export var TaxType;
(function (TaxType) {
    TaxType["INCOME"] = "INCOME";
    TaxType["SALES"] = "SALES";
    TaxType["PAYROLL"] = "PAYROLL";
    TaxType["GST"] = "GST";
    TaxType["VAT"] = "VAT";
    TaxType["PROPERTY"] = "PROPERTY";
})(TaxType || (TaxType = {}));
/**
 * Tax compliance status
 */
export var TaxStatus;
(function (TaxStatus) {
    TaxStatus["PENDING"] = "PENDING";
    TaxStatus["FILED"] = "FILED";
    TaxStatus["OVERDUE"] = "OVERDUE";
    TaxStatus["PAID"] = "PAID";
})(TaxStatus || (TaxStatus = {}));
/**
 * Financial ratio categories
 */
export var RatioCategory;
(function (RatioCategory) {
    RatioCategory["LIQUIDITY"] = "LIQUIDITY";
    RatioCategory["PROFITABILITY"] = "PROFITABILITY";
    RatioCategory["EFFICIENCY"] = "EFFICIENCY";
    RatioCategory["SOLVENCY"] = "SOLVENCY";
    RatioCategory["COVERAGE"] = "COVERAGE";
})(RatioCategory || (RatioCategory = {}));
