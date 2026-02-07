/**
 * Accounting & Financial API Routes
 *
 * REST API for financial metrics, inventory valuation, profit/loss reporting,
 * vendor performance, and transaction management
 */

import { Router } from 'express';
import { accountingService } from '../services/AccountingService';
import { asyncHandler, authenticate, authorize } from '../middleware';
import { AuthenticatedRequest } from '../middleware/auth';
import {
  UserRole,
  AccountingPeriod,
  TransactionType,
  AccountType,
  JournalEntryStatus,
} from '@opsui/shared';

const router = Router();

// All accounting routes require authentication
router.use(authenticate);

// Most accounting routes require supervisor, admin, or accounting access
const accountingAuth = authorize(UserRole.SUPERVISOR, UserRole.ADMIN, UserRole.ACCOUNTING);

// ============================================================================
// FINANCIAL METRICS
// ============================================================================

/**
 * GET /api/accounting/metrics
 * Get financial metrics for a period
 */
router.get(
  '/metrics',
  accountingAuth,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const period = req.query.period as AccountingPeriod;
    const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
    const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;

    const metrics = await accountingService.getFinancialMetrics({
      period,
      startDate,
      endDate,
    });

    res.json(metrics);
  })
);

// ============================================================================
// INVENTORY VALUATION
// ============================================================================

/**
 * GET /api/accounting/inventory/valuation
 * Get inventory valuation details
 */
router.get(
  '/inventory/valuation',
  accountingAuth,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const category = req.query.category as string | undefined;
    const zone = req.query.zone as string | undefined;
    const sku = req.query.sku as string | undefined;

    const valuation = await accountingService.getInventoryValuationDetails({
      category,
      zone,
      sku,
    });

    res.json({
      valuation,
      totalValue: valuation.reduce((sum, item) => sum + item.totalValue, 0),
      count: valuation.length,
    });
  })
);

// ============================================================================
// LABOR COSTS
// ============================================================================

/**
 * GET /api/accounting/labor-costs
 * Get labor cost details
 */
router.get(
  '/labor-costs',
  accountingAuth,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const period = req.query.period as AccountingPeriod;
    const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
    const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;
    const userId = req.query.userId as string | undefined;
    const role = req.query.role as UserRole | undefined;

    const start =
      startDate || (period ? undefined : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000));
    const end = endDate || new Date();

    const laborCosts = await accountingService.getLaborCostDetails({
      startDate: start!,
      endDate: end,
      userId,
      role,
    });

    res.json({
      laborCosts,
      totalCost: laborCosts.reduce((sum, item) => sum + item.totalCost, 0),
      totalHours: laborCosts.reduce((sum, item) => sum + item.hoursWorked, 0),
      count: laborCosts.length,
    });
  })
);

// ============================================================================
// PROFIT & LOSS STATEMENT
// ============================================================================

/**
 * GET /api/accounting/profit-loss
 * Generate profit & loss statement
 */
router.get(
  '/profit-loss',
  accountingAuth,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const period = req.query.period as AccountingPeriod;
    const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
    const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;

    const statement = await accountingService.generateProfitLossStatement({
      period,
      startDate,
      endDate,
    });

    res.json(statement);
  })
);

// ============================================================================
// VENDOR PERFORMANCE (FINANCIAL)
// ============================================================================

/**
 * GET /api/accounting/vendors/:vendorId/financial
 * Get financial performance summary for a vendor
 */
router.get(
  '/vendors/:vendorId/financial',
  accountingAuth,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { vendorId } = req.params;
    const period = req.query.period as AccountingPeriod;
    const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
    const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;

    const performance = await accountingService.getVendorPerformanceFinancial(vendorId, {
      period,
      startDate,
      endDate,
    });

    res.json(performance);
  })
);

/**
 * GET /api/accounting/vendors/financial
 * Get financial performance for all vendors
 */
router.get(
  '/vendors/financial',
  accountingAuth,
  asyncHandler(async (_req: AuthenticatedRequest, res) => {
    // This would aggregate all vendors - for now return empty
    res.json({
      vendors: [],
      total: 0,
    });
  })
);

// ============================================================================
// CUSTOMER FINANCIAL SUMMARY
// ============================================================================

/**
 * GET /api/accounting/customers/:customerId/financial
 * Get financial summary for a customer
 */
router.get(
  '/customers/:customerId/financial',
  accountingAuth,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { customerId } = req.params;
    const period = req.query.period as AccountingPeriod;
    const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
    const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;

    const summary = await accountingService.getCustomerFinancialSummary(customerId, {
      period,
      startDate,
      endDate,
    });

    res.json(summary);
  })
);

/**
 * GET /api/accounting/customers/financial
 * Get financial summary for all customers
 */
router.get(
  '/customers/financial',
  accountingAuth,
  asyncHandler(async (_req: AuthenticatedRequest, res) => {
    // This would aggregate all customers - for now return empty
    res.json({
      customers: [],
      total: 0,
    });
  })
);

// ============================================================================
// FINANCIAL TRANSACTIONS
// ============================================================================

/**
 * POST /api/accounting/transactions
 * Create a financial transaction
 */
router.post(
  '/transactions',
  accountingAuth,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const {
      transactionType,
      amount,
      currency,
      referenceType,
      referenceId,
      description,
      customerId,
      vendorId,
      account,
      notes,
    } = req.body;

    if (!transactionType || !amount || !referenceType || !referenceId || !description || !account) {
      res.status(400).json({
        error: 'Missing required fields',
        code: 'MISSING_FIELDS',
      });
      return;
    }

    const transaction = await accountingService.createTransaction({
      transactionType,
      amount: parseFloat(amount),
      currency,
      referenceType,
      referenceId,
      description,
      customerId,
      vendorId,
      createdBy: req.user!.userId,
      account,
      notes,
    });

    res.status(201).json(transaction);
  })
);

/**
 * GET /api/accounting/transactions
 * Get financial transactions
 */
router.get(
  '/transactions',
  accountingAuth,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const transactionType = req.query.type as TransactionType | undefined;
    const referenceType = req.query.referenceType as string | undefined;
    const customerId = req.query.customerId as string | undefined;
    const vendorId = req.query.vendorId as string | undefined;
    const status = req.query.status as string | undefined;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
    const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;

    const result = await accountingService.getTransactions({
      transactionType,
      referenceType,
      customerId,
      vendorId,
      status,
      limit,
      offset,
    });

    res.json(result);
  })
);

// ============================================================================
// ROLE PERMISSIONS MATRIX
// ============================================================================

/**
 * GET /api/accounting/roles/permissions
 * Get role permissions matrix
 */
router.get(
  '/roles/permissions',
  authorize(UserRole.ADMIN),
  asyncHandler(async (_req: AuthenticatedRequest, res) => {
    // This would return the full permissions matrix
    // For now, return a basic structure
    const { UserRole, PERMISSION_GROUPS } = await import('@opsui/shared');

    const matrix = Object.values(UserRole).map(role => ({
      role,
      permissions: [],
      permissionCategories: PERMISSION_GROUPS,
    }));

    res.json({
      matrix,
      permissionGroups: PERMISSION_GROUPS,
      roles: Object.values(UserRole),
    });
  })
);

// ============================================================================
// PHASE 1: CHART OF ACCOUNTS
// ============================================================================

/**
 * GET /api/accounting/chart-of-accounts
 * Get chart of accounts
 */
router.get(
  '/chart-of-accounts',
  accountingAuth,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const accountType = req.query.accountType as AccountType | undefined;
    const isActive =
      req.query.isActive === 'true' ? true : req.query.isActive === 'false' ? false : undefined;

    const accounts = await accountingService.getChartOfAccounts({
      accountType,
      isActive,
    });

    res.json(accounts);
  })
);

/**
 * GET /api/accounting/chart-of-accounts/:accountId
 * Get a single account
 */
router.get(
  '/chart-of-accounts/:accountId',
  accountingAuth,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { accountId } = req.params;
    const account = await accountingService.getAccount(accountId);

    if (!account) {
      res.status(404).json({ error: 'Account not found', code: 'ACCOUNT_NOT_FOUND' });
      return;
    }

    res.json(account);
  })
);

/**
 * POST /api/accounting/chart-of-accounts
 * Create a new account
 */
router.post(
  '/chart-of-accounts',
  accountingAuth,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const {
      accountCode,
      accountName,
      accountType,
      parentAccountId,
      normalBalance,
      isHeader,
      description,
    } = req.body;

    if (!accountCode || !accountName || !accountType || !normalBalance) {
      res.status(400).json({ error: 'Missing required fields', code: 'MISSING_FIELDS' });
      return;
    }

    const account = await accountingService.createAccount({
      accountCode,
      accountName,
      accountType,
      parentAccountId,
      normalBalance,
      isHeader: isHeader || false,
      description,
    });

    res.status(201).json(account);
  })
);

/**
 * PATCH /api/accounting/chart-of-accounts/:accountId
 * Update an account
 */
router.patch(
  '/chart-of-accounts/:accountId',
  accountingAuth,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { accountId } = req.params;
    const { accountName, parentAccountId, isActive, description } = req.body;

    const account = await accountingService.updateAccount(accountId, {
      accountName,
      parentAccountId,
      isActive,
      description,
    });

    res.json(account);
  })
);

/**
 * GET /api/accounting/chart-of-accounts/:accountId/balance
 * Get account balance
 */
router.get(
  '/chart-of-accounts/:accountId/balance',
  accountingAuth,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { accountId } = req.params;
    const asOfDate = req.query.asOfDate ? new Date(req.query.asOfDate as string) : new Date();

    const balance = await accountingService.getAccountBalance(accountId, asOfDate);

    res.json(balance);
  })
);

// ============================================================================
// PHASE 1: JOURNAL ENTRIES
// ============================================================================

/**
 * GET /api/accounting/journal-entries
 * Get journal entries
 */
router.get(
  '/journal-entries',
  accountingAuth,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const status = req.query.status as JournalEntryStatus | undefined;
    const dateFrom = req.query.dateFrom ? new Date(req.query.dateFrom as string) : undefined;
    const dateTo = req.query.dateTo ? new Date(req.query.dateTo as string) : undefined;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
    const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;

    const result = await accountingService.getJournalEntries({
      status,
      dateFrom,
      dateTo,
      limit,
      offset,
    });

    res.json(result);
  })
);

/**
 * GET /api/accounting/journal-entries/:entryId
 * Get a single journal entry
 */
router.get(
  '/journal-entries/:entryId',
  accountingAuth,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { entryId } = req.params;
    const entry = await accountingService.getJournalEntry(entryId);

    if (!entry) {
      res.status(404).json({ error: 'Journal entry not found', code: 'ENTRY_NOT_FOUND' });
      return;
    }

    const lines = await accountingService.getJournalEntryLines(entryId);

    res.json({
      ...entry,
      lines,
    });
  })
);

/**
 * POST /api/accounting/journal-entries
 * Create a new journal entry
 */
router.post(
  '/journal-entries',
  accountingAuth,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { entryNumber, entryDate, fiscalPeriod, description, lines, notes } = req.body;

    if (!entryNumber || !entryDate || !fiscalPeriod || !description || !lines || !lines.length) {
      res.status(400).json({ error: 'Missing required fields', code: 'MISSING_FIELDS' });
      return;
    }

    const entry = await accountingService.createJournalEntry({
      entryNumber,
      entryDate: new Date(entryDate),
      fiscalPeriod,
      description,
      lines,
      createdBy: req.user!.userId,
      notes,
    });

    res.status(201).json(entry);
  })
);

/**
 * POST /api/accounting/journal-entries/:entryId/approve
 * Approve a journal entry
 */
router.post(
  '/journal-entries/:entryId/approve',
  accountingAuth,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { entryId } = req.params;

    const entry = await accountingService.approveJournalEntry(entryId, req.user!.userId);

    res.json(entry);
  })
);

/**
 * POST /api/accounting/journal-entries/:entryId/post
 * Post a journal entry
 */
router.post(
  '/journal-entries/:entryId/post',
  accountingAuth,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { entryId } = req.params;

    const entry = await accountingService.postJournalEntry(entryId);

    res.json(entry);
  })
);

/**
 * POST /api/accounting/journal-entries/:entryId/reverse
 * Reverse a journal entry
 */
router.post(
  '/journal-entries/:entryId/reverse',
  accountingAuth,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { entryId } = req.params;
    const { reason } = req.body;

    if (!reason) {
      res.status(400).json({ error: 'Reason is required', code: 'MISSING_REASON' });
      return;
    }

    const entry = await accountingService.reverseJournalEntry(entryId, reason, req.user!.userId);

    res.json(entry);
  })
);

// ============================================================================
// PHASE 1: TRIAL BALANCE
// ============================================================================

/**
 * GET /api/accounting/trial-balance
 * Generate trial balance
 */
router.get(
  '/trial-balance',
  accountingAuth,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const asOfDate = req.query.asOfDate ? new Date(req.query.asOfDate as string) : new Date();

    const trialBalance = await accountingService.getTrialBalance(asOfDate);
    const lines = await accountingService.getTrialBalanceLines(trialBalance.trialBalanceId);

    res.json({
      ...trialBalance,
      lines,
      totalDebit: lines.reduce((sum, line) => sum + parseFloat(line.debitBalance), 0),
      totalCredit: lines.reduce((sum, line) => sum + parseFloat(line.creditBalance), 0),
    });
  })
);

// ============================================================================
// PHASE 1: BALANCE SHEET
// ============================================================================

/**
 * GET /api/accounting/balance-sheet
 * Generate balance sheet
 */
router.get(
  '/balance-sheet',
  accountingAuth,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const asOfDate = req.query.asOfDate ? new Date(req.query.asOfDate as string) : new Date();

    const balanceSheet = await accountingService.getBalanceSheet(asOfDate);

    res.json(balanceSheet);
  })
);

// ============================================================================
// PHASE 1: CASH FLOW STATEMENT
// ============================================================================

/**
 * GET /api/accounting/cash-flow
 * Generate cash flow statement
 */
router.get(
  '/cash-flow',
  accountingAuth,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const startDate = req.query.startDate
      ? new Date(req.query.startDate as string)
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const endDate = req.query.endDate ? new Date(req.query.endDate as string) : new Date();

    const cashFlow = await accountingService.getCashFlowStatement(startDate, endDate);

    res.json(cashFlow);
  })
);

// ============================================================================
// PHASE 2: ACCOUNTS RECEIVABLE
// ============================================================================

/**
 * GET /api/accounting/ar/aging
 * Get accounts receivable aging report
 */
router.get(
  '/ar/aging',
  accountingAuth,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const asOfDate = req.query.asOfDate ? new Date(req.query.asOfDate as string) : new Date();

    const report = await accountingService.getARAgingReport(asOfDate);

    res.json(report);
  })
);

/**
 * POST /api/accounting/ar/payments
 * Apply a payment to accounts receivable
 */
router.post(
  '/ar/payments',
  accountingAuth,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { receivableId, paymentDate, paymentMethod, amount, referenceNumber, notes } = req.body;

    if (!receivableId || !paymentDate || !amount) {
      res.status(400).json({ error: 'Missing required fields', code: 'MISSING_FIELDS' });
      return;
    }

    const payment = await accountingService.applyARPayment({
      receivableId,
      paymentDate: new Date(paymentDate),
      paymentMethod,
      amount: parseFloat(amount),
      referenceNumber,
      notes,
      createdBy: req.user!.userId,
    });

    res.status(201).json(payment);
  })
);

/**
 * POST /api/accounting/ar/credit-memos
 * Create a credit memo
 */
router.post(
  '/ar/credit-memos',
  accountingAuth,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { receivableId, memoNumber, memoDate, reason, amount } = req.body;

    if (!memoNumber || !memoDate || !reason || amount === undefined) {
      res.status(400).json({ error: 'Missing required fields', code: 'MISSING_FIELDS' });
      return;
    }

    const memo = await accountingService.createCreditMemo({
      receivableId,
      memoNumber,
      memoDate: new Date(memoDate),
      reason,
      amount: parseFloat(amount),
      createdBy: req.user!.userId,
    });

    res.status(201).json(memo);
  })
);

// ============================================================================
// PHASE 2: ACCOUNTS PAYABLE
// ============================================================================

/**
 * GET /api/accounting/ap/aging
 * Get accounts payable aging report
 */
router.get(
  '/ap/aging',
  accountingAuth,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const asOfDate = req.query.asOfDate ? new Date(req.query.asOfDate as string) : new Date();

    const report = await accountingService.getAPAgingReport(asOfDate);

    res.json(report);
  })
);

/**
 * POST /api/accounting/ap/:payableId/approve
 * Approve an invoice for payment
 */
router.post(
  '/ap/:payableId/approve',
  accountingAuth,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { payableId } = req.params;

    const payable = await accountingService.approveAPInvoice(payableId, req.user!.userId);

    res.json(payable);
  })
);

/**
 * POST /api/accounting/ap/:payableId/pay
 * Process a payment to accounts payable
 */
router.post(
  '/ap/:payableId/pay',
  accountingAuth,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { payableId } = req.params;
    const { paymentDate, paymentMethod, amount } = req.body;

    if (!paymentDate || !paymentMethod || !amount) {
      res.status(400).json({ error: 'Missing required fields', code: 'MISSING_FIELDS' });
      return;
    }

    const payment = await accountingService.processAPPayment(payableId, {
      paymentDate: new Date(paymentDate),
      paymentMethod,
      amount: parseFloat(amount),
      createdBy: req.user!.userId,
    });

    res.status(201).json(payment);
  })
);

// ============================================================================
// PHASE 2: CASH MANAGEMENT
// ============================================================================

/**
 * GET /api/accounting/cash-position
 * Get current cash position
 */
router.get(
  '/cash-position',
  accountingAuth,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const asOfDate = req.query.asOfDate ? new Date(req.query.asOfDate as string) : new Date();

    const position = await accountingService.getCashPosition(asOfDate);

    res.json(position);
  })
);

/**
 * POST /api/accounting/bank-reconciliations
 * Create a bank reconciliation
 */
router.post(
  '/bank-reconciliations',
  accountingAuth,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { bankAccountId, statementDate, statementBalance, bookBalance } = req.body;

    if (
      !bankAccountId ||
      !statementDate ||
      statementBalance === undefined ||
      bookBalance === undefined
    ) {
      res.status(400).json({ error: 'Missing required fields', code: 'MISSING_FIELDS' });
      return;
    }

    const reconciliation = await accountingService.createBankReconciliation({
      bankAccountId,
      statementDate: new Date(statementDate),
      statementBalance: parseFloat(statementBalance),
      bookBalance: parseFloat(bookBalance),
      createdBy: req.user!.userId,
    });

    res.status(201).json(reconciliation);
  })
);

// ============================================================================
// PHASE 2: REVENUE RECOGNITION
// ============================================================================

/**
 * POST /api/accounting/revenue-contracts
 * Create a revenue contract
 */
router.post(
  '/revenue-contracts',
  accountingAuth,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const {
      contractNumber,
      customerId,
      contractName,
      totalValue,
      startDate,
      endDate,
      recognitionMethod,
    } = req.body;

    if (
      !contractNumber ||
      !customerId ||
      !totalValue ||
      !startDate ||
      !endDate ||
      !recognitionMethod
    ) {
      res.status(400).json({ error: 'Missing required fields', code: 'MISSING_FIELDS' });
      return;
    }

    const contract = await accountingService.createRevenueContract({
      contractNumber,
      customerId,
      contractName,
      totalValue: parseFloat(totalValue),
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      recognitionMethod,
      createdBy: req.user!.userId,
    });

    res.status(201).json(contract);
  })
);

/**
 * POST /api/accounting/revenue-contracts/:contractId/recognize
 * Recognize revenue for a contract
 */
router.post(
  '/revenue-contracts/:contractId/recognize',
  accountingAuth,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { contractId } = req.params;
    const { milestoneId } = req.body;

    const result = await accountingService.recognizeRevenue(contractId, milestoneId);

    res.json(result);
  })
);

// ============================================================================
// PHASE 3: MULTI-CURRENCY
// ============================================================================

/**
 * GET /api/accounting/currencies
 * Get all supported currencies
 */
router.get(
  '/currencies',
  accountingAuth,
  asyncHandler(async (_req: AuthenticatedRequest, res) => {
    const currencies = await accountingService.getCurrencies();

    res.json(currencies);
  })
);

/**
 * GET /api/accounting/exchange-rates
 * Get exchange rate
 */
router.get(
  '/exchange-rates',
  accountingAuth,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { from, to } = req.query;
    const date = req.query.date ? new Date(req.query.date as string) : new Date();

    if (!from || !to) {
      res.status(400).json({ error: 'Missing from/to currencies', code: 'MISSING_CURRENCIES' });
      return;
    }

    const rate = await accountingService.getExchangeRate(from as string, to as string, date);

    res.json({ from, to, date, rate });
  })
);

/**
 * POST /api/accounting/exchange-rates
 * Set exchange rate
 */
router.post(
  '/exchange-rates',
  authorize(UserRole.ADMIN, UserRole.ACCOUNTING),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { fromCurrency, toCurrency, rateDate, exchangeRate } = req.body;

    if (!fromCurrency || !toCurrency || !rateDate || exchangeRate === undefined) {
      res.status(400).json({ error: 'Missing required fields', code: 'MISSING_FIELDS' });
      return;
    }

    const rate = await accountingService.setExchangeRate({
      fromCurrency,
      toCurrency,
      rateDate: new Date(rateDate),
      exchangeRate: parseFloat(exchangeRate),
      createdBy: req.user!.userId,
    });

    res.status(201).json(rate);
  })
);

// ============================================================================
// PHASE 3: BUDGETING & FORECASTING
// ============================================================================

/**
 * POST /api/accounting/budgets
 * Create a budget
 */
router.post(
  '/budgets',
  accountingAuth,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { budgetName, fiscalYear, budgetType, lines } = req.body;

    if (!budgetName || !fiscalYear || !budgetType || !lines || !lines.length) {
      res.status(400).json({ error: 'Missing required fields', code: 'MISSING_FIELDS' });
      return;
    }

    const budget = await accountingService.createBudget({
      budgetName,
      fiscalYear,
      budgetType,
      lines,
      createdBy: req.user!.userId,
    });

    res.status(201).json(budget);
  })
);

/**
 * GET /api/accounting/budgets/:budgetId/vs-actual
 * Get budget vs actual report
 */
router.get(
  '/budgets/:budgetId/vs-actual',
  accountingAuth,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { budgetId } = req.params;

    const report = await accountingService.getBudgetVsActual(budgetId);

    res.json(report);
  })
);

/**
 * POST /api/accounting/forecasts
 * Create a forecast
 */
router.post(
  '/forecasts',
  accountingAuth,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { forecastName, forecastType, startDate, endDate, lines } = req.body;

    if (!forecastName || !forecastType || !startDate || !endDate || !lines || !lines.length) {
      res.status(400).json({ error: 'Missing required fields', code: 'MISSING_FIELDS' });
      return;
    }

    const forecast = await accountingService.createForecast({
      forecastName,
      forecastType,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      createdBy: req.user!.userId,
      lines,
    });

    res.status(201).json(forecast);
  })
);

// ============================================================================
// PHASE 3: FIXED ASSETS
// ============================================================================

/**
 * POST /api/accounting/fixed-assets
 * Create a fixed asset
 */
router.post(
  '/fixed-assets',
  accountingAuth,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const {
      assetNumber,
      assetName,
      assetCategory,
      serialNumber,
      purchaseDate,
      purchaseCost,
      salvageValue,
      usefulLife,
      depreciationMethod,
      location,
    } = req.body;

    if (
      !assetNumber ||
      !assetName ||
      !purchaseDate ||
      purchaseCost === undefined ||
      !usefulLife ||
      !depreciationMethod
    ) {
      res.status(400).json({ error: 'Missing required fields', code: 'MISSING_FIELDS' });
      return;
    }

    const asset = await accountingService.createFixedAsset({
      assetNumber,
      assetName,
      assetCategory,
      serialNumber,
      purchaseDate: new Date(purchaseDate),
      purchaseCost: parseFloat(purchaseCost),
      salvageValue: parseFloat(salvageValue || 0),
      usefulLife: parseInt(usefulLife),
      depreciationMethod,
      location,
    });

    res.status(201).json(asset);
  })
);

/**
 * GET /api/accounting/fixed-assets/:assetId/depreciation
 * Calculate depreciation schedule for an asset
 */
router.get(
  '/fixed-assets/:assetId/depreciation',
  accountingAuth,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { assetId } = req.params;
    const throughDate = req.query.throughDate
      ? new Date(req.query.throughDate as string)
      : new Date();

    const schedule = await accountingService.calculateDepreciation(assetId, throughDate);

    res.json(schedule);
  })
);

/**
 * GET /api/accounting/asset-register
 * Get asset register
 */
router.get(
  '/asset-register',
  accountingAuth,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const asOfDate = req.query.asOfDate ? new Date(req.query.asOfDate as string) : new Date();

    const register = await accountingService.getAssetRegister(asOfDate);

    res.json(register);
  })
);

// ============================================================================
// PHASE 3: COMPLIANCE & AUDIT TRAIL
// ============================================================================

/**
 * GET /api/accounting/audit-log
 * Get audit log
 */
router.get(
  '/audit-log',
  accountingAuth,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const tableName = req.query.tableName as string | undefined;
    const recordId = req.query.recordId as string | undefined;
    const action = req.query.action as string | undefined;
    const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
    const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 100;

    const log = await accountingService.getAuditLog({
      tableName,
      recordId,
      action,
      startDate,
      endDate,
      limit,
    });

    res.json({ log, total: log.length });
  })
);

/**
 * GET /api/accounting/documents
 * Get documents for a record
 */
router.get(
  '/documents',
  accountingAuth,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { recordType, recordId } = req.query;

    if (!recordType || !recordId) {
      res.status(400).json({ error: 'Missing recordType or recordId', code: 'MISSING_PARAMS' });
      return;
    }

    const documents = await accountingService.getDocuments(
      recordType as string,
      recordId as string
    );

    res.json({ documents, total: documents.length });
  })
);

/**
 * POST /api/accounting/documents
 * Attach a document to a record
 */
router.post(
  '/documents',
  accountingAuth,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { recordType, recordId, documentName, documentType, filePath, fileSize } = req.body;

    if (!recordType || !recordId || !documentName || !documentType || !filePath || !fileSize) {
      res.status(400).json({ error: 'Missing required fields', code: 'MISSING_FIELDS' });
      return;
    }

    const document = await accountingService.attachDocument({
      recordType,
      recordId,
      documentName,
      documentType,
      filePath,
      fileSize: parseInt(fileSize),
      uploadedBy: req.user!.userId,
    });

    res.status(201).json(document);
  })
);

/**
 * POST /api/accounting/approvals
 * Create an approval request
 */
router.post(
  '/approvals',
  accountingAuth,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { approvalType, recordId } = req.body;

    if (!approvalType || !recordId) {
      res.status(400).json({ error: 'Missing required fields', code: 'MISSING_FIELDS' });
      return;
    }

    const approval = await accountingService.createApprovalRequest({
      approvalType,
      recordId,
      requestedBy: req.user!.userId,
    });

    res.status(201).json(approval);
  })
);

/**
 * POST /api/accounting/approvals/:approvalId/approve
 * Approve an approval request
 */
router.post(
  '/approvals/:approvalId/approve',
  accountingAuth,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { approvalId } = req.params;
    const { comments } = req.body;

    const approval = await accountingService.approveRequest(approvalId, req.user!.userId, comments);

    res.json(approval);
  })
);

export default router;
