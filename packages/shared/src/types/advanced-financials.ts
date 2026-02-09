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
export enum StatementType {
  BALANCE_SHEET = 'BALANCE_SHEET',
  INCOME_STATEMENT = 'INCOME_STATEMENT',
  CASH_FLOW = 'CASH_FLOW',
  RETAINED_EARNINGS = 'RETAINED_EARNINGS',
  EQUITY_CHANGES = 'EQUITY_CHANGES',
}

/**
 * Period types for financial reporting
 */
export enum PeriodType {
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY',
  MONTHLY = 'MONTHLY',
  QUARTERLY = 'QUARTERLY',
  ANNUAL = 'ANNUAL',
  CUSTOM = 'CUSTOM',
}

/**
 * Consolidation methods
 */
export enum ConsolidationMethod {
  FULL = 'FULL',
  PROPORTIONAL = 'PROPORTIONAL',
  EQUITY = 'EQUITY',
}

/**
 * Intercompany transaction types
 */
export enum IntercompanyTransactionType {
  SALE = 'SALE',
  PURCHASE = 'PURCHASE',
  TRANSFER = 'TRANSFER',
  LOAN = 'LOAN',
  DIVIDEND = 'DIVIDEND',
  ROYALTY = 'ROYALTY',
  SERVICE_FEE = 'SERVICE_FEE',
}

/**
 * Intercompany transaction status
 */
export enum IntercompanyStatus {
  PENDING = 'PENDING',
  POSTED = 'POSTED',
  ELIMINATED = 'ELIMINATED',
  PARTIALLY_ELIMINATED = 'PARTIALLY_ELIMINATED',
}

/**
 * Tax types
 */
export enum TaxType {
  INCOME = 'INCOME',
  SALES = 'SALES',
  PAYROLL = 'PAYROLL',
  GST = 'GST',
  VAT = 'VAT',
  PROPERTY = 'PROPERTY',
}

/**
 * Tax compliance status
 */
export enum TaxStatus {
  PENDING = 'PENDING',
  FILED = 'FILED',
  OVERDUE = 'OVERDUE',
  PAID = 'PAID',
}

/**
 * Financial ratio categories
 */
export enum RatioCategory {
  LIQUIDITY = 'LIQUIDITY',
  PROFITABILITY = 'PROFITABILITY',
  EFFICIENCY = 'EFFICIENCY',
  SOLVENCY = 'SOLVENCY',
  COVERAGE = 'COVERAGE',
}

// ============================================================================
// INTERFACES
// ============================================================================

/**
 * Financial statement template
 */
export interface FinancialStatementTemplate {
  templateId: string;
  templateName: string;
  statementType: StatementType;
  description?: string;
  templateConfig: Record<string, unknown>;
  currency: string;
  isDefault: boolean;
  isActive: boolean;
  createdAt: Date;
  createdBy?: string;
  updatedAt: Date;
}

/**
 * Generated financial statement
 */
export interface GeneratedFinancialStatement {
  statementId: string;
  templateId?: string;
  statementType: StatementType;
  statementName: string;
  periodType: PeriodType;
  periodStart: Date;
  periodEnd: Date;
  fiscalYear: number;
  fiscalPeriod?: number;
  entityId?: string;
  currency: string;
  statementData: Record<string, unknown>;
  generatedAt: Date;
  generatedBy?: string;
  isFinalized: boolean;
  finalizedAt?: Date;
  finalizedBy?: string;
}

/**
 * Consolidated financial statement
 */
export interface ConsolidatedStatement {
  consolidationId: string;
  consolidationName: string;
  statementType: StatementType;
  periodStart: Date;
  periodEnd: Date;
  fiscalYear: number;
  fiscalPeriod?: number;
  baseCurrency: string;
  consolidationMethod: ConsolidationMethod;
  eliminationJournalId?: string;
  statementData: Record<string, unknown>;
  entityBreakdown?: Record<string, unknown>;
  intercompanyEliminations: number;
  minorityInterest: number;
  generatedAt: Date;
  generatedBy?: string;
  isFinalized: boolean;
}

/**
 * Budget vs Actual analysis
 */
export interface BudgetActualAnalysis {
  analysisId: string;
  analysisName: string;
  budgetId?: string;
  periodStart: Date;
  periodEnd: Date;
  entityId?: string;
  currency: string;
  totalBudgetAmount: number;
  totalActualAmount: number;
  varianceAmount: number;
  variancePercent: number;
  favorableVariance: number;
  unfavorableVariance: number;
  createdAt: Date;
  createdBy?: string;
}

/**
 * Budget vs Actual detail
 */
export interface BudgetActualDetail {
  detailId: string;
  analysisId: string;
  accountId: string;
  budgetAmount: number;
  actualAmount: number;
  varianceAmount: number;
  variancePercent?: number;
  accountName?: string;
  accountType?: string;
  isFavorable: boolean;
  notes?: string;
}

/**
 * Currency revaluation
 */
export interface CurrencyRevaluation {
  revaluationId: string;
  revaluationDate: Date;
  fromCurrency: string;
  toCurrency: string;
  exchangeRate: number;
  previousRate?: number;
  revaluationMethod: string;
  gainAmount: number;
  lossAmount: number;
  netAmount: number;
  accountsRevalued: number;
  journalEntryId?: string;
  description?: string;
  postedBy?: string;
  postedAt: Date;
  fiscalPeriodId?: string;
  entityId?: string;
}

/**
 * Intercompany transaction
 */
export interface IntercompanyTransaction {
  transactionId: string;
  transactionNumber: string;
  transactionDate: Date;
  fromEntityId: string;
  toEntityId: string;
  transactionType: IntercompanyTransactionType;
  amount: number;
  currency: string;
  description?: string;
  referenceDocument?: string;
  fromEntityJournalId?: string;
  toEntityJournalId?: string;
  eliminationJournalId?: string;
  status: IntercompanyStatus;
  postedDate?: Date;
  eliminatedDate?: Date;
  createdAt: Date;
  createdBy?: string;
}

/**
 * Intercompany transaction line
 */
export interface IntercompanyTransactionLine {
  lineId: string;
  transactionId: string;
  line_number: number;
  accountId: string;
  description?: string;
  amount: number;
  quantity?: number;
  fromPercentage: number;
  toPercentage: number;
  eliminatedAmount: number;
}

/**
 * Tax compliance period
 */
export interface TaxCompliancePeriod {
  periodId: string;
  taxAuthority: string;
  taxType: TaxType;
  periodStart: Date;
  periodEnd: Date;
  filingDueDate: Date;
  filedDate?: Date;
  status: TaxStatus;
  taxLiability: number;
  taxPaid: number;
  balanceDue: number;
  penaltyAmount: number;
  interestAmount: number;
  entityId?: string;
  createdAt: Date;
  createdBy?: string;
}

/**
 * Tax payment
 */
export interface TaxPayment {
  paymentId: string;
  periodId: string;
  paymentDate: Date;
  paymentAmount: number;
  paymentMethod: string;
  referenceNumber?: string;
  bankAccountId?: string;
  journalEntryId?: string;
  notes?: string;
  createdBy?: string;
  createdAt: Date;
}

/**
 * Financial ratio
 */
export interface FinancialRatio {
  ratioId: string;
  entityId?: string;
  periodStart: Date;
  periodEnd: Date;
  ratioCategory: RatioCategory;
  ratioName: string;
  ratioValue: number;
  ratioFormula?: string;
  comparisonValue?: number;
  comparisonType?: string;
  trend?: string;
  notes?: string;
  calculatedAt: Date;
}

/**
 * Balance sheet view data
 */
export interface BalanceSheetView {
  entityId: string;
  entityName?: string;
  periodStart: Date;
  periodEnd: Date;
  currency: string;
  assetsSection: Record<string, unknown>;
  liabilitiesSection: Record<string, unknown>;
  equitySection: Record<string, unknown>;
  totalAssets: number;
  totalLiabilities: number;
  totalEquity: number;
  isFinalized: boolean;
  generatedAt: Date;
}

/**
 * Income statement view data
 */
export interface IncomeStatementView {
  entityId: string;
  entityName?: string;
  periodStart: Date;
  periodEnd: Date;
  currency: string;
  revenueSection: Record<string, unknown>;
  expensesSection: Record<string, unknown>;
  grossProfit?: number;
  operatingIncome?: number;
  netIncome: number;
  isFinalized: boolean;
  generatedAt: Date;
}

/**
 * Cash flow view data
 */
export interface CashFlowView {
  entityId: string;
  entityName?: string;
  periodStart: Date;
  periodEnd: Date;
  currency: string;
  operatingActivities: Record<string, unknown>;
  investingActivities: Record<string, unknown>;
  financingActivities: Record<string, unknown>;
  netCashFlow: number;
  beginningCash: number;
  endingCash: number;
  isFinalized: boolean;
  generatedAt: Date;
}

// ============================================================================
// DTOs
// ============================================================================

/**
 * Create financial statement DTO
 */
export interface CreateFinancialStatementDTO {
  templateId?: string;
  statementType: StatementType;
  statementName: string;
  periodType: PeriodType;
  periodStart: Date;
  periodEnd: Date;
  entityId?: string;
  currency?: string;
  generatedBy: string;
}

/**
 * Generate balance sheet DTO
 */
export interface GenerateBalanceSheetDTO {
  entityId?: string;
  periodStart: Date;
  periodEnd: Date;
  generatedBy: string;
}

/**
 * Create consolidation DTO
 */
export interface CreateConsolidationDTO {
  consolidationName: string;
  statementType: StatementType;
  periodStart: Date;
  periodEnd: Date;
  baseCurrency?: string;
  consolidationMethod?: ConsolidationMethod;
  entityIds: string[];
  generatedBy: string;
}

/**
 * Create budget vs actual analysis DTO
 */
export interface CreateBudgetActualAnalysisDTO {
  analysisName: string;
  budgetId?: string;
  periodStart: Date;
  periodEnd: Date;
  entityId?: string;
  createdBy: string;
}

/**
 * Currency revaluation DTO
 */
export interface CurrencyRevaluationDTO {
  revaluationDate: Date;
  fromCurrency: string;
  toCurrency?: string;
  exchangeRate: number;
  entityId?: string;
  postedBy?: string;
}

/**
 * Create intercompany transaction DTO
 */
export interface CreateIntercompanyTransactionDTO {
  fromEntityId: string;
  toEntityId: string;
  transactionType: IntercompanyTransactionType;
  amount: number;
  description?: string;
  referenceDocument?: string;
  lines?: Array<{
    accountId: string;
    amount: number;
    description?: string;
  }>;
  createdBy: string;
}

/**
 * Record tax payment DTO
 */
export interface RecordTaxPaymentDTO {
  periodId: string;
  paymentAmount: number;
  paymentMethod: string;
  referenceNumber?: string;
  bankAccountId?: string;
  notes?: string;
  createdBy: string;
}

/**
 * Financial ratios calculation DTO
 */
export interface CalculateFinancialRatiosDTO {
  entityId?: string;
  periodStart: Date;
  periodEnd: Date;
  ratioCategories?: RatioCategory[];
  comparisonType?: 'PREVIOUS_PERIOD' | 'BUDGET' | 'INDUSTRY' | 'TARGET';
}
