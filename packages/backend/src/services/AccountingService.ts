/**
 * Accounting & Financial Service
 *
 * Business logic for financial metrics, cost analysis, profit/loss reporting,
 * inventory valuation, and transaction logging
 */

import { query as dbQuery } from '../db/client';
import {
  FinancialMetrics,
  AccountingPeriod,
  CostCategory,
  RevenueCategory,
  InventoryValuation,
  LaborCostDetail,
  TransactionType,
  FinancialTransaction,
  ProfitLossStatement,
  VendorPerformanceFinancial,
  CustomerFinancialSummary,
  UserRole,
  AccountType,
  JournalEntryStatus,
  ChartOfAccounts,
  JournalEntry,
  JournalEntryLine,
  TrialBalance,
  AccountBalance,
  BalanceSheet,
  CashFlowStatement,
  CreateAccountDTO,
  UpdateAccountDTO,
  CreateJournalEntryDTO,
  // Phase 2 & 3 Types
  ARPayment,
  CreditMemo,
  APPayment,
  VendorCreditMemo,
  BankReconciliation,
  RevenueContract,
  ExchangeRate,
  Currency,
  Budget,
  BudgetLine,
  Forecast,
  FixedAsset,
  DepreciationSchedule,
  AuditLog,
  DocumentAttachment,
  Approval,
  CashPosition,
  RevenueMilestone,
  RevenueSchedule,
  DeferredRevenue,
  DepreciationMethod,
  RevenueRecognitionMethod,
  ApplyPaymentDTO,
  CreateCreditMemoDTO,
  CreateBankReconciliationDTO,
  CreateRevenueContractDTO,
  CreateBudgetDTO,
  CreateFixedAssetDTO,
  CreateForecastDTO,
} from '@opsui/shared';

export class AccountingService {
  // ========================================================================
  // FINANCIAL METRICS
  // ========================================================================

  async getFinancialMetrics(filters: {
    period?: AccountingPeriod;
    startDate?: Date;
    endDate?: Date;
    includePreviousPeriod?: boolean;
  }): Promise<FinancialMetrics> {
    const {
      period = AccountingPeriod.MONTHLY,
      startDate,
      endDate,
      includePreviousPeriod = true,
    } = filters;

    // Determine date range
    const start = startDate || this.getPeriodStartDate(period);
    const end = endDate || new Date();

    // Execute parallel queries for better performance
    const [
      revenueData,
      costData,
      inventoryData,
      exceptionData,
      qcData,
      ordersData,
      transactionsData,
    ] = await Promise.all([
      this.getRevenueMetrics(start, end),
      this.getCostMetrics(start, end),
      this.getInventoryValuation(start, end),
      this.getExceptionMetrics(start, end),
      this.getQCMetrics(start, end),
      this.getOrderMetrics(start, end),
      this.getTransactionMetrics(start, end),
    ]);

    const totalRevenue = Object.values(revenueData.byCategory).reduce((sum, val) => sum + val, 0);
    const totalCost = Object.values(costData.byCategory).reduce((sum, val) => sum + val, 0);
    const grossProfit = totalRevenue - costData.materials - costData.labor;
    const netProfit = grossProfit - totalCost;

    // Get previous period data for comparison (only if not already in a recursive call)
    const previousPeriod = includePreviousPeriod
      ? await this.getPreviousPeriodMetrics(start, period)
      : undefined;

    return {
      period,
      startDate: start,
      endDate: end,
      totalRevenue,
      revenueByCategory: revenueData.byCategory,
      revenueByCustomer: revenueData.byCustomer,
      totalCost,
      costByCategory: costData.byCategory,
      laborCosts: costData.labor,
      materialCosts: costData.materials,
      shippingCosts: costData.shipping,
      storageCosts: costData.storage,
      inventoryValue: inventoryData.totalValue,
      inventoryValueByCategory: inventoryData.byCategory,
      inventoryValueByZone: inventoryData.byZone,
      grossProfit,
      netProfit,
      profitMargin: totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0,
      totalExceptionCost: exceptionData.totalCost,
      writeOffs: exceptionData.writeOffs,
      vendorCredits: exceptionData.vendorCredits,
      customerRefunds: exceptionData.customerRefunds,
      qcFailureRate: qcData.failureRate,
      qcCost: qcData.totalCost,
      returnRate: qcData.returnRate,
      returnCost: qcData.returnCost,
      ordersProcessed: ordersData.count,
      costPerOrder: ordersData.count > 0 ? totalCost / ordersData.count : 0,
      averageOrderValue: ordersData.count > 0 ? totalRevenue / ordersData.count : 0,
      outstandingReceivables: transactionsData.receivables,
      outstandingPayables: transactionsData.payables,
      overdueReceivables: transactionsData.overdueReceivables,
      previousPeriod,
    };
  }

  // ========================================================================
  // INVENTORY VALUATION
  // ========================================================================

  async getInventoryValuationDetails(filters?: {
    category?: string;
    zone?: string;
    sku?: string;
  }): Promise<InventoryValuation[]> {
    try {
      let query = `
        SELECT
          s.sku,
          s.description,
          s.category,
          COALESCE(s.unit_cost, 0) as "unitCost",
          s.valuation_method as "valuationMethod",
          COALESCE(SUM(iu.quantity), 0) as "quantityOnHand",
          bl.zone,
          iu.bin_location as "binLocation",
          s.last_received as "lastReceived",
          s.last_cost_update as "lastCostUpdate"
        FROM skus s
        LEFT JOIN inventory_units iu ON iu.sku = s.sku
        LEFT JOIN bin_locations bl ON bl.bin_id = iu.bin_location
        WHERE 1=1
      `;

      const params: any[] = [];

      if (filters?.category) {
        params.push(filters.category);
        query += ` AND s.category = $${params.length}`;
      }
      if (filters?.zone) {
        params.push(filters.zone);
        query += ` AND bl.zone = $${params.length}`;
      }
      if (filters?.sku) {
        params.push(`%${filters.sku}%`);
        query += ` AND s.sku LIKE $${params.length}`;
      }

      query += ` GROUP BY s.sku, s.description, s.category, s.unit_cost, s.valuation_method, bl.zone, iu.bin_location, s.last_received, s.last_cost_update`;
      query += ` HAVING COALESCE(SUM(iu.quantity), 0) > 0`;
      query += ` ORDER BY s.sku`;

      const result = await dbQuery(query, params);

      return result.rows.map((row: any) => ({
        ...row,
        totalValue: row.quantityOnHand * row.unitCost,
      }));
    } catch (error: any) {
      // Table doesn't exist or other error - return empty data
      if (error.message?.includes('does not exist')) {
        console.log(
          '[AccountingService] inventory_units table does not exist, returning empty valuation details'
        );
        return [];
      }
      throw error;
    }
  }

  // ========================================================================
  // LABOR COSTS
  // ========================================================================

  async getLaborCostDetails(filters: {
    startDate: Date;
    endDate: Date;
    userId?: string;
    role?: UserRole;
  }): Promise<LaborCostDetail[]> {
    let query = `
      SELECT
        u.user_id as "userId",
        u.name as "userName",
        u.role as "userRole",
        COUNT(DISTINCT a.activity_id) as "tasksCompleted",
        EXTRACT(EPOCH FROM (
          COALESCE(MAX(a.completed_at), NOW()) - MIN(a.created_at)
        )) / 3600 as "hoursWorked"
      FROM users u
      INNER JOIN audit_logs a ON a.user_id = u.user_id
      WHERE a.created_at >= $1
        AND a.created_at <= $2
    `;

    const params: any[] = [filters.startDate, filters.endDate];

    if (filters.userId) {
      params.push(filters.userId);
      query += ` AND u.user_id = $${params.length}`;
    }
    if (filters.role) {
      params.push(filters.role);
      query += ` AND u.role = $${params.length}`;
    }

    query += ` GROUP BY u.user_id, u.name, u.role`;
    query += ` ORDER BY "hoursWorked" DESC`;

    const result = await dbQuery(query, params);

    // Hourly rates by role (can be moved to config table)
    const hourlyRates: Partial<Record<UserRole, number>> = {
      [UserRole.ADMIN]: 50,
      [UserRole.SUPERVISOR]: 40,
      [UserRole.PICKER]: 25,
      [UserRole.PACKER]: 25,
      [UserRole.STOCK_CONTROLLER]: 30,
      [UserRole.INWARDS]: 28,
      [UserRole.DISPATCH]: 28,
      [UserRole.PRODUCTION]: 30,
      [UserRole.SALES]: 35,
      [UserRole.MAINTENANCE]: 32,
      [UserRole.RMA]: 28,
      [UserRole.ACCOUNTING]: 45,
    };

    return result.rows.map((row: any) => {
      const hourlyRate = hourlyRates[row.userRole as UserRole] || 25;
      const totalCost = row.hoursWorked * hourlyRate;

      return {
        ...row,
        hourlyRate,
        totalCost,
        costPerTask: row.tasksCompleted > 0 ? totalCost / row.tasksCompleted : 0,
        period: AccountingPeriod.MONTHLY,
        date: filters.startDate,
      };
    });
  }

  // ========================================================================
  // TRANSACTIONS
  // ========================================================================

  async createTransaction(data: {
    transactionType: TransactionType;
    amount: number;
    currency?: string;
    referenceType: 'ORDER' | 'RETURN' | 'EXCEPTION' | 'GENERAL';
    referenceId: string;
    description: string;
    customerId?: string;
    vendorId?: string;
    createdBy: string;
    account: string;
    notes?: string;
  }): Promise<FinancialTransaction> {
    try {
      const transactionId = this.generateId('TXN');

      const result = await dbQuery(
        `INSERT INTO financial_transactions (
          transaction_id, transaction_type, amount, currency,
          reference_type, reference_id, description, customer_id, vendor_id,
          created_by, account, notes, status, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'PENDING', NOW())
        RETURNING *`,
        [
          transactionId,
          data.transactionType,
          data.amount,
          data.currency || 'USD',
          data.referenceType,
          data.referenceId,
          data.description,
          data.customerId || null,
          data.vendorId || null,
          data.createdBy,
          data.account,
          data.notes || null,
        ]
      );

      return result.rows[0] as FinancialTransaction;
    } catch (error: any) {
      // Table doesn't exist - throw a more helpful error
      if (error.message?.includes('does not exist')) {
        throw new Error(
          'Financial transactions table not yet available. This feature is coming soon.'
        );
      }
      throw error;
    }
  }

  async getTransactions(filters?: {
    transactionType?: TransactionType;
    referenceType?: string;
    customerId?: string;
    vendorId?: string;
    status?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ transactions: FinancialTransaction[]; total: number }> {
    try {
      let query = `SELECT * FROM financial_transactions WHERE 1=1`;
      const params: any[] = [];
      let paramCount = 0;

      if (filters?.transactionType) {
        paramCount++;
        query += ` AND transaction_type = $${paramCount}`;
        params.push(filters.transactionType);
      }
      if (filters?.referenceType) {
        paramCount++;
        query += ` AND reference_type = $${paramCount}`;
        params.push(filters.referenceType);
      }
      if (filters?.customerId) {
        paramCount++;
        query += ` AND customer_id = $${paramCount}`;
        params.push(filters.customerId);
      }
      if (filters?.vendorId) {
        paramCount++;
        query += ` AND vendor_id = $${paramCount}`;
        params.push(filters.vendorId);
      }
      if (filters?.status) {
        paramCount++;
        query += ` AND status = $${paramCount}`;
        params.push(filters.status);
      }

      query += ` ORDER BY created_at DESC`;

      // Get total count
      const countResult = await dbQuery(query.replace('SELECT *', 'SELECT COUNT(*)'), params);
      const total = parseInt(countResult.rows[0].count);

      // Add pagination
      if (filters?.limit) {
        paramCount++;
        query += ` LIMIT $${paramCount}`;
        params.push(filters.limit);
      }
      if (filters?.offset) {
        paramCount++;
        query += ` OFFSET $${paramCount}`;
        params.push(filters.offset);
      }

      const result = await dbQuery(query, params);

      return {
        transactions: result.rows as FinancialTransaction[],
        total,
      };
    } catch (error: any) {
      // Table doesn't exist or other error - return empty data
      if (error.message?.includes('does not exist')) {
        console.log(
          '[AccountingService] financial_transactions table does not exist, returning empty transactions'
        );
        return { transactions: [], total: 0 };
      }
      throw error;
    }
  }

  // ========================================================================
  // PROFIT & LOSS STATEMENT
  // ========================================================================

  async generateProfitLossStatement(filters: {
    period?: AccountingPeriod;
    startDate?: Date;
    endDate?: Date;
  }): Promise<ProfitLossStatement> {
    const metrics = await this.getFinancialMetrics(filters);
    const { period, startDate, endDate } = filters;

    return {
      statementId: this.generateId('PLS'),
      period: period || AccountingPeriod.MONTHLY,
      startDate: startDate || this.getPeriodStartDate(period),
      endDate: endDate || new Date(),
      generatedAt: new Date(),
      grossRevenue: metrics.totalRevenue + metrics.customerRefunds,
      returns: metrics.customerRefunds,
      netRevenue: metrics.totalRevenue,
      materialCosts: metrics.materialCosts,
      laborCosts: metrics.laborCosts,
      otherDirectCosts: metrics.shippingCosts,
      totalCOGS: metrics.materialCosts + metrics.laborCosts + metrics.shippingCosts,
      grossProfit: metrics.grossProfit,
      grossProfitMargin:
        metrics.totalRevenue > 0 ? (metrics.grossProfit / metrics.totalRevenue) * 100 : 0,
      operatingExpenses: {
        [CostCategory.STORAGE]: metrics.storageCosts,
        [CostCategory.OVERHEAD]: metrics.costByCategory[CostCategory.OVERHEAD] || 0,
        [CostCategory.EXCEPTIONS]: metrics.totalExceptionCost,
        [CostCategory.QUALITY_CONTROL]: metrics.qcCost,
      },
      totalOperatingExpenses: metrics.storageCosts + metrics.totalExceptionCost + metrics.qcCost,
      operatingIncome: metrics.netProfit - metrics.storageCosts - metrics.totalExceptionCost,
      operatingMargin:
        metrics.totalRevenue > 0
          ? ((metrics.netProfit - metrics.storageCosts - metrics.totalExceptionCost) /
              metrics.totalRevenue) *
            100
          : 0,
      otherIncome: 0,
      otherExpenses: metrics.totalExceptionCost,
      netIncome: metrics.netProfit - metrics.storageCosts,
      netMargin: metrics.profitMargin,
      previousPeriod: metrics.previousPeriod
        ? {
            netRevenue: metrics.previousPeriod.revenue,
            grossProfit: metrics.previousPeriod.profit,
            netIncome: metrics.previousPeriod.profit - metrics.storageCosts,
          }
        : undefined,
    };
  }

  // ========================================================================
  // VENDOR PERFORMANCE (FINANCIAL)
  // ========================================================================

  async getVendorPerformanceFinancial(
    vendorId: string,
    filters: {
      period?: AccountingPeriod;
      startDate?: Date;
      endDate?: Date;
    }
  ): Promise<VendorPerformanceFinancial> {
    const { period = AccountingPeriod.MONTHLY, startDate, endDate } = filters;
    const start = startDate || this.getPeriodStartDate(period);
    const end = endDate || new Date();

    // Get vendor info
    const vendorResult = await dbQuery(
      `SELECT supplier_id as vendor_id, name, payment_terms FROM accounting_suppliers WHERE supplier_id = $1`,
      [vendorId]
    );

    if (vendorResult.rows.length === 0) {
      throw new Error(`Vendor ${vendorId} not found`);
    }

    const vendor = vendorResult.rows[0];

    // Get purchase data
    const purchaseResult = await dbQuery(
      `SELECT
        COUNT(*) as orders,
        COALESCE(SUM(total_amount), 0) as total_purchases
      FROM purchase_orders
      WHERE vendor_id = $1
        AND created_at >= $2
        AND created_at <= $3`,
      [vendorId, start, end]
    );

    // Get returns and credits
    const returnsResult = await dbQuery(
      `SELECT
        COUNT(*) as return_count,
        COALESCE(SUM(total_refund_amount), 0) as return_amount,
        COALESCE(SUM(credit_approved), 0) as credit_approved
      FROM return_authorizations ra
      INNER JOIN order_items oi ON oi.order_id = ra.order_id
      INNER JOIN purchase_orders po ON po.po_number = oi.po_number
      WHERE po.vendor_id = $1
        AND ra.created_at >= $2
        AND ra.created_at <= $3`,
      [vendorId, start, end]
    );

    // Get exceptions
    const exceptionsResult = await dbQuery(
      `SELECT
        COUNT(*) as exception_count,
        COALESCE(SUM(credit_requested), 0) as credit_requested,
        COALESCE(SUM(credit_approved), 0) as credit_approved_pending
      FROM receiving_exceptions re
      INNER JOIN advance_shipping_notices asn ON asn.asn_id = re.asn_id
      WHERE asn.supplier_id = $1
        AND re.created_at >= $2
        AND re.created_at <= $3`,
      [vendorId, start, end]
    );

    // Get outstanding balance
    const balanceResult = await dbQuery(
      `SELECT
        COALESCE(SUM(CASE WHEN status = 'OPEN' THEN amount ELSE 0 END), 0) as outstanding,
        COALESCE(SUM(CASE WHEN status = 'OPEN' AND due_date < NOW() THEN amount ELSE 0 END), 0) as overdue
      FROM accounts_payable
      WHERE vendor_id = $1`,
      [vendorId]
    );

    const orders = parseInt(purchaseResult.rows[0]?.orders) || 0;
    const totalPurchases = parseFloat(purchaseResult.rows[0]?.total_purchases) || 0;
    const returnCount = parseInt(returnsResult.rows[0]?.return_count) || 0;
    const returnAmount = parseFloat(returnsResult.rows[0]?.return_amount) || 0;
    const creditApproved = parseFloat(returnsResult.rows[0]?.credit_approved) || 0;
    const creditRequested = parseFloat(exceptionsResult.rows[0]?.credit_requested) || 0;
    const outstanding = parseFloat(balanceResult.rows[0]?.outstanding) || 0;
    const overdue = parseFloat(balanceResult.rows[0]?.overdue) || 0;

    const returnRate = orders > 0 ? (returnCount / orders) * 100 : 0;
    const performanceScore = this.calculateVendorScore({
      totalPurchases,
      returnRate,
      outstanding,
      overdue,
    });

    return {
      vendorId,
      vendorName: vendor.name,
      period,
      startDate: start,
      endDate: end,
      totalPurchases,
      orderCount: orders,
      averageOrderValue: orders > 0 ? totalPurchases / orders : 0,
      returnRate,
      returnCost: returnAmount,
      defectRate: returnRate, // Using same metric for now
      creditRequested,
      creditApproved:
        creditApproved + (parseFloat(exceptionsResult.rows[0]?.credit_approved_pending) || 0),
      creditPending: creditRequested - creditApproved,
      paymentTerms: vendor.payment_terms || 'NET 30',
      outstandingBalance: outstanding,
      overdueAmount: overdue,
      onTimePaymentRate: overdue > 0 ? ((outstanding - overdue) / outstanding) * 100 : 100,
      performanceScore,
      rating: this.getVendorRating(performanceScore),
    };
  }

  // ========================================================================
  // CUSTOMER FINANCIAL SUMMARY
  // ========================================================================

  async getCustomerFinancialSummary(
    customerId: string,
    filters: {
      period?: AccountingPeriod;
      startDate?: Date;
      endDate?: Date;
    }
  ): Promise<CustomerFinancialSummary> {
    const { period = AccountingPeriod.MONTHLY, startDate, endDate } = filters;
    const start = startDate || this.getPeriodStartDate(period);
    const end = endDate || new Date();

    // Get customer info
    const customerResult = await dbQuery(
      `SELECT customer_id, name, credit_limit FROM accounting_customers WHERE customer_id = $1`,
      [customerId]
    );

    if (customerResult.rows.length === 0) {
      throw new Error(`Customer ${customerId} not found`);
    }

    const customer = customerResult.rows[0];

    // Get order data
    const orderResult = await dbQuery(
      `SELECT
        COUNT(*) as orders,
        COALESCE(SUM(total_amount), 0) as total_revenue
      FROM orders
      WHERE customer_id = $1
        AND created_at >= $2
        AND created_at <= $3`,
      [customerId, start, end]
    );

    // Get returns
    const returnsResult = await dbQuery(
      `SELECT
        COUNT(*) as return_count,
        COALESCE(SUM(total_refund_amount), 0) as return_amount,
        COALESCE(SUM(credit_approved), 0) as credit_issued
      FROM return_authorizations
      WHERE customer_id = $1
        AND created_at >= $2
        AND created_at <= $3`,
      [customerId, start, end]
    );

    // Get outstanding balance
    const balanceResult = await dbQuery(
      `SELECT
        COALESCE(SUM(CASE WHEN status = 'OPEN' THEN amount ELSE 0 END), 0) as outstanding,
        COALESCE(SUM(CASE WHEN status = 'OPEN' AND due_date < NOW() THEN amount ELSE 0 END), 0) as overdue
      FROM accounts_receivable
      WHERE customer_id = $1`,
      [customerId]
    );

    const orders = parseInt(orderResult.rows[0]?.orders) || 0;
    const totalRevenue = parseFloat(orderResult.rows[0]?.total_revenue) || 0;
    const returnCount = parseInt(returnsResult.rows[0]?.return_count) || 0;
    const returnAmount = parseFloat(returnsResult.rows[0]?.return_amount) || 0;
    const creditIssued = parseFloat(returnsResult.rows[0]?.credit_issued) || 0;
    const outstanding = parseFloat(balanceResult.rows[0]?.outstanding) || 0;
    const overdue = parseFloat(balanceResult.rows[0]?.overdue) || 0;
    const creditLimit = parseFloat(customer.credit_limit) || 0;

    const returnRate = orders > 0 ? (returnCount / orders) * 100 : 0;

    // Simplified profit calculation (would need more data for accurate calculation)
    const grossProfit = totalRevenue * 0.3; // Assuming 30% gross margin
    const netProfit = grossProfit - returnAmount;
    const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

    const creditAvailable = creditLimit - outstanding;
    const creditStatus = this.getCreditStatus(outstanding, overdue, creditLimit);

    return {
      customerId,
      customerName: customer.name,
      period,
      startDate: start,
      endDate: end,
      totalOrders: orders,
      totalRevenue,
      averageOrderValue: orders > 0 ? totalRevenue / orders : 0,
      returnCount,
      returnRate,
      returnAmount,
      creditIssued,
      outstandingBalance: outstanding,
      overdueAmount: overdue,
      daysPaymentOutstanding: outstanding > 0 ? 30 : 0, // Simplified
      grossProfit,
      netProfit,
      profitMargin,
      creditStatus,
      creditLimit: creditLimit > 0 ? creditLimit : undefined,
      creditAvailable: creditLimit > 0 ? Math.max(0, creditAvailable) : undefined,
    };
  }

  // ========================================================================
  // HELPER METHODS
  // ========================================================================

  private getPeriodStartDate(period: AccountingPeriod = AccountingPeriod.MONTHLY): Date {
    const now = new Date();
    switch (period) {
      case AccountingPeriod.DAILY:
        return new Date(now.getFullYear(), now.getMonth(), now.getDate());
      case AccountingPeriod.WEEKLY:
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - now.getDay());
        return weekStart;
      case AccountingPeriod.MONTHLY:
        return new Date(now.getFullYear(), now.getMonth(), 1);
      case AccountingPeriod.QUARTERLY:
        const quarter = Math.floor(now.getMonth() / 3);
        return new Date(now.getFullYear(), quarter * 3, 1);
      case AccountingPeriod.YEARLY:
        return new Date(now.getFullYear(), 0, 1);
    }
  }

  private generateId(prefix: string): string {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
  }

  private async getPreviousPeriodMetrics(currentStart: Date, period: AccountingPeriod) {
    // Calculate previous period dates
    let previousStart: Date;
    let previousEnd: Date;

    switch (period) {
      case AccountingPeriod.DAILY:
        previousEnd = new Date(currentStart.getTime() - 24 * 60 * 60 * 1000);
        previousStart = new Date(previousEnd.getTime() - 24 * 60 * 60 * 1000);
        break;
      case AccountingPeriod.WEEKLY:
        previousEnd = new Date(currentStart.getTime() - 7 * 24 * 60 * 60 * 1000);
        previousStart = new Date(previousEnd.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case AccountingPeriod.MONTHLY:
        previousStart = new Date(currentStart);
        previousStart.setMonth(previousStart.getMonth() - 1);
        previousEnd = new Date(currentStart.getTime() - 1);
        break;
      default:
        return undefined;
    }

    // Get previous period metrics (without recursion)
    const metrics = await this.getFinancialMetrics({
      period,
      startDate: previousStart,
      endDate: previousEnd,
      includePreviousPeriod: false, // Prevent infinite recursion
    });

    return {
      revenue: metrics.totalRevenue,
      cost: metrics.totalCost,
      profit: metrics.netProfit,
    };
  }

  private calculateVendorScore(metrics: {
    totalPurchases: number;
    returnRate: number;
    outstanding: number;
    overdue: number;
  }): number {
    let score = 100;

    // Deduct for returns
    score -= Math.min(metrics.returnRate * 2, 30);

    // Deduct for overdue payments
    if (metrics.totalPurchases > 0) {
      const overdueRate = (metrics.overdue / metrics.totalPurchases) * 100;
      score -= Math.min(overdueRate * 5, 40);
    }

    return Math.max(0, score);
  }

  private getVendorRating(score: number): 'EXCELLENT' | 'GOOD' | 'AVERAGE' | 'POOR' {
    if (score >= 90) return 'EXCELLENT';
    if (score >= 75) return 'GOOD';
    if (score >= 60) return 'AVERAGE';
    return 'POOR';
  }

  private getCreditStatus(
    outstanding: number,
    overdue: number,
    limit: number
  ): 'GOOD' | 'WARNING' | 'RESTRICTED' | 'BLOCKED' {
    if (limit > 0 && outstanding >= limit) return 'BLOCKED';
    if (overdue > limit * 0.25) return 'RESTRICTED';
    if (overdue > 0 || outstanding > limit * 0.75) return 'WARNING';
    return 'GOOD';
  }

  private async getRevenueMetrics(startDate: Date, endDate: Date) {
    try {
      const result = await dbQuery(
        `SELECT
          COALESCE(SUM(o.total_amount), 0) as total
        FROM orders o
        WHERE o.created_at >= $1 AND o.created_at <= $2`,
        [startDate, endDate]
      );

      const total = parseFloat(result.rows[0]?.total) || 0;

      return {
        byCategory: {
          [RevenueCategory.SALES]: total,
          [RevenueCategory.RESTOCKING_FEES]: 0,
          [RevenueCategory.SERVICE_FEES]: 0,
          [RevenueCategory.OTHER]: 0,
        },
        byCustomer: [],
      };
    } catch (error: any) {
      if (error.message?.includes('does not exist')) {
        console.log('[AccountingService] orders table does not exist, returning zero revenue');
        return {
          byCategory: {
            [RevenueCategory.SALES]: 0,
            [RevenueCategory.RESTOCKING_FEES]: 0,
            [RevenueCategory.SERVICE_FEES]: 0,
            [RevenueCategory.OTHER]: 0,
          },
          byCustomer: [],
        };
      }
      throw error;
    }
  }

  private async getCostMetrics(startDate: Date, endDate: Date) {
    try {
      // Get labor costs from user activities
      const laborResult = await dbQuery(
        `SELECT
          u.role,
          COUNT(DISTINCT a.activity_id) as tasks
        FROM audit_logs a
        INNER JOIN users u ON u.user_id = a.user_id
        WHERE a.created_at >= $1 AND a.created_at <= $2
        GROUP BY u.role`,
        [startDate, endDate]
      );

      const hourlyRates: Partial<Record<UserRole, number>> = {
        [UserRole.ADMIN]: 50,
        [UserRole.SUPERVISOR]: 40,
        [UserRole.PICKER]: 25,
        [UserRole.PACKER]: 25,
        [UserRole.STOCK_CONTROLLER]: 30,
        [UserRole.INWARDS]: 28,
        [UserRole.DISPATCH]: 28,
        [UserRole.PRODUCTION]: 30,
        [UserRole.SALES]: 35,
        [UserRole.MAINTENANCE]: 32,
        [UserRole.RMA]: 28,
        [UserRole.ACCOUNTING]: 45,
      };

      let labor = 0;
      for (const row of laborResult.rows) {
        const rate = hourlyRates[row.role as UserRole] || 25;
        labor += row.tasks * rate;
      }

      // Get material costs from receipts
      const materialResult = await dbQuery(
        `SELECT
          COALESCE(SUM(rl.quantity_received * rl.unit_cost), 0) as total
        FROM receipt_lines rl
        INNER JOIN receipts r ON r.receipt_id = rl.receipt_id
        WHERE r.created_at >= $1 AND r.created_at <= $2`,
        [startDate, endDate]
      );

      const materials = parseFloat(materialResult.rows[0]?.total) || 0;

      // Get shipping costs
      const shippingResult = await dbQuery(
        `SELECT
          COALESCE(SUM(shipping_cost), 0) as total
        FROM shipments
        WHERE created_at >= $1 AND created_at <= $2`,
        [startDate, endDate]
      );

      const shipping = parseFloat(shippingResult.rows[0]?.total) || 0;

      return {
        byCategory: {
          [CostCategory.LABOR]: labor,
          [CostCategory.MATERIALS]: materials,
          [CostCategory.SHIPPING]: shipping,
          [CostCategory.STORAGE]: 0,
          [CostCategory.OVERHEAD]: 0,
          [CostCategory.EXCEPTIONS]: 0,
          [CostCategory.QUALITY_CONTROL]: 0,
          [CostCategory.MAINTENANCE]: 0,
        },
        labor,
        materials,
        shipping,
        storage: 0,
      };
    } catch (error: any) {
      if (error.message?.includes('does not exist')) {
        console.log('[AccountingService] cost tables do not exist, returning zero costs');
        return {
          byCategory: {
            [CostCategory.LABOR]: 0,
            [CostCategory.MATERIALS]: 0,
            [CostCategory.SHIPPING]: 0,
            [CostCategory.STORAGE]: 0,
            [CostCategory.OVERHEAD]: 0,
            [CostCategory.EXCEPTIONS]: 0,
            [CostCategory.QUALITY_CONTROL]: 0,
            [CostCategory.MAINTENANCE]: 0,
          },
          labor: 0,
          materials: 0,
          shipping: 0,
          storage: 0,
        };
      }
      throw error;
    }
  }

  private async getInventoryValuation(_startDate: Date, _endDate: Date) {
    try {
      const result = await dbQuery(
        `SELECT
          s.category,
          bl.zone,
          SUM(iu.quantity * COALESCE(s.unit_cost, iu.unit_cost, 0)) as value
        FROM inventory_units iu
        INNER JOIN skus s ON s.sku = iu.sku
        LEFT JOIN bin_locations bl ON bl.bin_id = iu.bin_location
        GROUP BY s.category, bl.zone`
      );

      let totalValue = 0;
      const byCategory: Record<string, number> = {};
      const byZone: Record<string, number> = {};

      for (const row of result.rows) {
        const value = parseFloat(row.value) || 0;
        totalValue += value;
        byCategory[row.category] = (byCategory[row.category] || 0) + value;
        byZone[row.zone] = (byZone[row.zone] || 0) + value;
      }

      return { totalValue, byCategory, byZone };
    } catch (error: any) {
      // Table doesn't exist or other error - return empty data
      if (error.message?.includes('does not exist')) {
        console.log(
          '[AccountingService] inventory table does not exist, returning empty valuation'
        );
        return { totalValue: 0, byCategory: {}, byZone: {} };
      }
      throw error;
    }
  }

  private async getExceptionMetrics(startDate: Date, endDate: Date) {
    try {
      const result = await dbQuery(
        `SELECT
          COALESCE(SUM(CASE WHEN resolution = 'WRITE_OFF' THEN variance * unit_cost ELSE 0 END), 0) as write_offs,
          COALESCE(SUM(credit_approved), 0) as vendor_credits,
          COALESCE(SUM(variance * unit_cost), 0) as total_cost
        FROM receiving_exceptions
        WHERE created_at >= $1 AND created_at <= $2`,
        [startDate, endDate]
      );

      const row = result.rows[0] || {};

      return {
        totalCost: parseFloat(row.total_cost) || 0,
        writeOffs: parseFloat(row.write_offs) || 0,
        vendorCredits: parseFloat(row.vendor_credits) || 0,
        customerRefunds: 0, // Would query return_authorizations
      };
    } catch (error: any) {
      if (error.message?.includes('does not exist')) {
        console.log(
          '[AccountingService] receiving_exceptions table does not exist, returning zero exception metrics'
        );
        return {
          totalCost: 0,
          writeOffs: 0,
          vendorCredits: 0,
          customerRefunds: 0,
        };
      }
      throw error;
    }
  }

  private async getQCMetrics(startDate: Date, endDate: Date) {
    try {
      const result = await dbQuery(
        `SELECT
          COUNT(*) as total,
          COALESCE(SUM(CASE WHEN status = 'FAILED' THEN 1 ELSE 0 END), 0) as failed,
          COALESCE(SUM(CASE WHEN status = 'PASSED' THEN quantity_passed ELSE 0 END), 0) as passed_qty,
          COALESCE(SUM(CASE WHEN status = 'FAILED' THEN quantity_failed ELSE 0 END), 0) as failed_qty
        FROM quality_inspections
        WHERE created_at >= $1 AND created_at <= $2`,
        [startDate, endDate]
      );

      const row = result.rows[0] || {};
      const total = parseInt(row.total) || 0;
      const failed = parseInt(row.failed) || 0;
      const failedQty = parseFloat(row.failed_qty) || 0;

      return {
        failureRate: total > 0 ? (failed / total) * 100 : 0,
        totalCost: failedQty * 10, // Assuming $10 per failed unit
        returnRate: failed / total,
        returnCost: failedQty * 10,
      };
    } catch (error: any) {
      if (error.message?.includes('does not exist')) {
        console.log(
          '[AccountingService] quality_inspections table does not exist, returning zero QC metrics'
        );
        return {
          failureRate: 0,
          totalCost: 0,
          returnRate: 0,
          returnCost: 0,
        };
      }
      throw error;
    }
  }

  private async getOrderMetrics(startDate: Date, endDate: Date) {
    try {
      const result = await dbQuery(
        `SELECT COUNT(*) as count FROM orders WHERE created_at >= $1 AND created_at <= $2`,
        [startDate, endDate]
      );

      return {
        count: parseInt(result.rows[0]?.count) || 0,
      };
    } catch (error: any) {
      if (error.message?.includes('does not exist')) {
        console.log('[AccountingService] orders table does not exist, returning zero order count');
        return {
          count: 0,
        };
      }
      throw error;
    }
  }

  private async getTransactionMetrics(startDate: Date, endDate: Date) {
    try {
      const result = await dbQuery(
        `SELECT
          COALESCE(SUM(CASE WHEN account = 'RECEIVABLES' AND status = 'OPEN' THEN amount ELSE 0 END), 0) as receivables,
          COALESCE(SUM(CASE WHEN account = 'PAYABLES' AND status = 'OPEN' THEN amount ELSE 0 END), 0) as payables,
          COALESCE(SUM(CASE WHEN account = 'RECEIVABLES' AND status = 'OPEN' AND due_date < NOW() THEN amount ELSE 0 END), 0) as overdue_receivables
        FROM financial_transactions
        WHERE created_at >= $1 AND created_at <= $2`,
        [startDate, endDate]
      );

      const row = result.rows[0] || {};

      return {
        receivables: parseFloat(row.receivables) || 0,
        payables: parseFloat(row.payables) || 0,
        overdueReceivables: parseFloat(row.overdue_receivables) || 0,
      };
    } catch (error: any) {
      // Table doesn't exist or other error - return empty data
      if (error.message?.includes('does not exist')) {
        console.log(
          '[AccountingService] financial_transactions table does not exist, returning empty metrics'
        );
        return {
          receivables: 0,
          payables: 0,
          overdueReceivables: 0,
        };
      }
      throw error;
    }
  }

  // ========================================================================
  // PHASE 1: CHART OF ACCOUNTS
  // ========================================================================

  async getChartOfAccounts(filters?: {
    accountType?: AccountType;
    isActive?: boolean;
  }): Promise<ChartOfAccounts[]> {
    try {
      let query = `
        SELECT
          account_id as "accountId",
          account_code as "accountCode",
          account_name as "accountName",
          account_type as "accountType",
          parent_account_id as "parentAccountId",
          normal_balance as "normalBalance",
          is_active as "isActive",
          is_header as "isHeader",
          description,
          created_at as "createdAt",
          updated_at as "updatedAt"
        FROM acct_chart_of_accounts
        WHERE 1=1
      `;
      const params: any[] = [];

      if (filters?.accountType) {
        params.push(filters.accountType);
        query += ` AND account_type = $${params.length}`;
      }
      if (filters?.isActive !== undefined) {
        params.push(filters.isActive);
        query += ` AND is_active = $${params.length}`;
      }

      query += ` ORDER BY account_code`;

      const result = await dbQuery(query, params);
      return result.rows as ChartOfAccounts[];
    } catch (error: any) {
      if (error.message?.includes('does not exist')) {
        console.log(
          '[AccountingService] acct_chart_of_accounts table does not exist, returning empty accounts'
        );
        return [];
      }
      throw error;
    }
  }

  async getAccount(accountId: string): Promise<ChartOfAccounts | null> {
    try {
      const result = await dbQuery(
        `SELECT
          account_id as "accountId",
          account_code as "accountCode",
          account_name as "accountName",
          account_type as "accountType",
          parent_account_id as "parentAccountId",
          normal_balance as "normalBalance",
          is_active as "isActive",
          is_header as "isHeader",
          description,
          created_at as "createdAt",
          updated_at as "updatedAt"
        FROM acct_chart_of_accounts
        WHERE account_id = $1`,
        [accountId]
      );

      return (result.rows[0] as ChartOfAccounts) || null;
    } catch (error: any) {
      if (error.message?.includes('does not exist')) {
        return null;
      }
      throw error;
    }
  }

  async createAccount(data: CreateAccountDTO): Promise<ChartOfAccounts> {
    const accountId = this.generateId('ACT');

    const result = await dbQuery(
      `INSERT INTO acct_chart_of_accounts (
        account_id, account_code, account_name, account_type,
        parent_account_id, normal_balance, is_header, description,
        created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
      RETURNING *`,
      [
        accountId,
        data.accountCode,
        data.accountName,
        data.accountType,
        data.parentAccountId || null,
        data.normalBalance,
        data.isHeader,
        data.description || null,
      ]
    );

    return {
      accountId: result.rows[0].account_id,
      accountCode: result.rows[0].account_code,
      accountName: result.rows[0].account_name,
      accountType: result.rows[0].account_type,
      parentAccountId: result.rows[0].parent_account_id,
      normalBalance: result.rows[0].normal_balance,
      isActive: result.rows[0].is_active,
      isHeader: result.rows[0].is_header,
      description: result.rows[0].description,
      createdAt: result.rows[0].created_at,
      updatedAt: result.rows[0].updated_at,
    };
  }

  async updateAccount(accountId: string, data: UpdateAccountDTO): Promise<ChartOfAccounts> {
    const updates: string[] = [];
    const params: any[] = [];
    let paramCount = 0;

    if (data.accountName !== undefined) {
      paramCount++;
      updates.push(`account_name = $${paramCount}`);
      params.push(data.accountName);
    }
    if (data.parentAccountId !== undefined) {
      paramCount++;
      updates.push(`parent_account_id = $${paramCount}`);
      params.push(data.parentAccountId);
    }
    if (data.isActive !== undefined) {
      paramCount++;
      updates.push(`is_active = $${paramCount}`);
      params.push(data.isActive);
    }
    if (data.description !== undefined) {
      paramCount++;
      updates.push(`description = $${paramCount}`);
      params.push(data.description);
    }

    if (updates.length === 0) {
      return this.getAccount(accountId) as Promise<ChartOfAccounts>;
    }

    updates.push(`updated_at = NOW()`);
    params.push(accountId);

    const result = await dbQuery(
      `UPDATE acct_chart_of_accounts SET ${updates.join(', ')} WHERE account_id = $${params.length} RETURNING *`,
      params
    );

    return {
      accountId: result.rows[0].account_id,
      accountCode: result.rows[0].account_code,
      accountName: result.rows[0].account_name,
      accountType: result.rows[0].account_type,
      parentAccountId: result.rows[0].parent_account_id,
      normalBalance: result.rows[0].normal_balance,
      isActive: result.rows[0].is_active,
      isHeader: result.rows[0].is_header,
      description: result.rows[0].description,
      createdAt: result.rows[0].created_at,
      updatedAt: result.rows[0].updated_at,
    };
  }

  async getAccountBalance(accountId: string, asOfDate: Date): Promise<AccountBalance> {
    try {
      const account = await this.getAccount(accountId);
      if (!account) {
        throw new Error(`Account ${accountId} not found`);
      }

      const result = await dbQuery(
        `SELECT
          COALESCE(SUM(
            CASE WHEN coa.normal_balance = 'D' THEN jel.debit_amount - jel.credit_amount
            ELSE jel.credit_amount - jel.debit_amount
            END
          ), 0) as net_balance,
          COALESCE(SUM(jel.debit_amount), 0) as debit_balance,
          COALESCE(SUM(jel.credit_amount), 0) as credit_balance
        FROM acct_chart_of_accounts coa
        LEFT JOIN acct_journal_entry_lines jel ON jel.account_id = coa.account_id
        LEFT JOIN acct_journal_entries je ON je.journal_entry_id = jel.journal_entry_id
        WHERE coa.account_id = $1
          AND je.entry_date <= $2
          AND je.status = 'POSTED'
        GROUP BY coa.account_id, coa.account_code, coa.account_name, coa.account_type, coa.normal_balance`,
        [accountId, asOfDate]
      );

      const row = result.rows[0] || { net_balance: 0, debit_balance: 0, credit_balance: 0 };

      return {
        accountId: account.accountId,
        accountCode: account.accountCode,
        accountName: account.accountName,
        accountType: account.accountType,
        normalBalance: account.normalBalance,
        debitBalance: parseFloat(row.debit_balance) || 0,
        creditBalance: parseFloat(row.credit_balance) || 0,
        netBalance: parseFloat(row.net_balance) || 0,
      };
    } catch (error: any) {
      if (error.message?.includes('does not exist')) {
        throw new Error('Accounting tables not yet available');
      }
      throw error;
    }
  }

  // ========================================================================
  // PHASE 1: JOURNAL ENTRIES
  // ========================================================================

  async getJournalEntries(filters?: {
    status?: JournalEntryStatus;
    dateFrom?: Date;
    dateTo?: Date;
    limit?: number;
    offset?: number;
  }): Promise<{ entries: JournalEntry[]; total: number }> {
    try {
      let query = `
        SELECT
          journal_entry_id as "journalEntryId",
          entry_number as "entryNumber",
          entry_date as "entryDate",
          fiscal_period as "fiscalPeriod",
          description,
          status,
          total_debit as "totalDebit",
          total_credit as "totalCredit",
          created_by as "createdBy",
          approved_by as "approvedBy",
          approved_at as "approvedAt",
          posted_at as "postedAt",
          reversal_entry_id as "reversalEntryId",
          notes,
          created_at as "createdAt",
          updated_at as "updatedAt"
        FROM acct_journal_entries
        WHERE 1=1
      `;
      const params: any[] = [];
      let paramCount = 0;

      if (filters?.status) {
        paramCount++;
        query += ` AND status = $${paramCount}`;
        params.push(filters.status);
      }
      if (filters?.dateFrom) {
        paramCount++;
        query += ` AND entry_date >= $${paramCount}`;
        params.push(filters.dateFrom);
      }
      if (filters?.dateTo) {
        paramCount++;
        query += ` AND entry_date <= $${paramCount}`;
        params.push(filters.dateTo);
      }

      query += ` ORDER BY entry_date DESC, created_at DESC`;

      // Get total count
      const countResult = await dbQuery(query.replace('SELECT *', 'SELECT COUNT(*)'), params);
      const total = parseInt(countResult.rows[0].count);

      // Add pagination
      if (filters?.limit) {
        paramCount++;
        query += ` LIMIT $${paramCount}`;
        params.push(filters.limit);
      }
      if (filters?.offset) {
        paramCount++;
        query += ` OFFSET $${paramCount}`;
        params.push(filters.offset);
      }

      const result = await dbQuery(query, params);

      return {
        entries: result.rows as JournalEntry[],
        total,
      };
    } catch (error: any) {
      if (error.message?.includes('does not exist')) {
        console.log(
          '[AccountingService] acct_journal_entries table does not exist, returning empty entries'
        );
        return { entries: [], total: 0 };
      }
      throw error;
    }
  }

  async getJournalEntry(entryId: string): Promise<JournalEntry | null> {
    try {
      const result = await dbQuery(
        `SELECT
          journal_entry_id as "journalEntryId",
          entry_number as "entryNumber",
          entry_date as "entryDate",
          fiscal_period as "fiscalPeriod",
          description,
          status,
          total_debit as "totalDebit",
          total_credit as "totalCredit",
          created_by as "createdBy",
          approved_by as "approvedBy",
          approved_at as "approvedAt",
          posted_at as "postedAt",
          reversal_entry_id as "reversalEntryId",
          notes,
          created_at as "createdAt",
          updated_at as "updatedAt"
        FROM acct_journal_entries
        WHERE journal_entry_id = $1`,
        [entryId]
      );

      return (result.rows[0] as JournalEntry) || null;
    } catch (error: any) {
      if (error.message?.includes('does not exist')) {
        return null;
      }
      throw error;
    }
  }

  async getJournalEntryLines(journalEntryId: string): Promise<JournalEntryLine[]> {
    try {
      const result = await dbQuery(
        `SELECT
          line_id as "lineId",
          journal_entry_id as "journalEntryId",
          line_number as "lineNumber",
          account_id as "accountId",
          description,
          debit_amount as "debitAmount",
          credit_amount as "creditAmount",
          cost_center as "costCenter",
          reference_type as "referenceType",
          reference_id as "referenceId"
        FROM acct_journal_entry_lines
        WHERE journal_entry_id = $1
        ORDER BY line_number`,
        [journalEntryId]
      );

      return result.rows as JournalEntryLine[];
    } catch (error: any) {
      if (error.message?.includes('does not exist')) {
        return [];
      }
      throw error;
    }
  }

  async createJournalEntry(data: CreateJournalEntryDTO): Promise<JournalEntry> {
    const journalEntryId = this.generateId('JE');

    // Calculate totals
    const totalDebit = data.lines.reduce((sum, line) => sum + line.debitAmount, 0);
    const totalCredit = data.lines.reduce((sum, line) => sum + line.creditAmount, 0);

    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      throw new Error('Debits and credits must be equal');
    }

    // Insert journal entry header
    await dbQuery(
      `INSERT INTO acct_journal_entries (
        journal_entry_id, entry_number, entry_date, fiscal_period,
        description, status, total_debit, total_credit,
        created_by, notes, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, 'DRAFT', $6, $7, $8, $9, NOW(), NOW())`,
      [
        journalEntryId,
        data.entryNumber,
        data.entryDate,
        data.fiscalPeriod,
        data.description,
        totalDebit,
        totalCredit,
        data.createdBy || null,
        data.notes || null,
      ]
    );

    // Insert journal entry lines
    for (const line of data.lines) {
      const lineId = this.generateId('JEL');
      await dbQuery(
        `INSERT INTO acct_journal_entry_lines (
          line_id, journal_entry_id, line_number, account_id,
          description, debit_amount, credit_amount, cost_center,
          reference_type, reference_id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          lineId,
          journalEntryId,
          line.lineNumber,
          line.accountId,
          line.description || null,
          line.debitAmount,
          line.creditAmount,
          line.costCenter || null,
          line.referenceType || null,
          line.referenceId || null,
        ]
      );
    }

    return this.getJournalEntry(journalEntryId) as Promise<JournalEntry>;
  }

  async approveJournalEntry(entryId: string, approvedBy: string): Promise<JournalEntry> {
    const result = await dbQuery(
      `UPDATE acct_journal_entries
      SET status = 'APPROVED', approved_by = $1, approved_at = NOW(), updated_at = NOW()
      WHERE journal_entry_id = $2 AND status = 'DRAFT'
      RETURNING *`,
      [approvedBy, entryId]
    );

    if (result.rows.length === 0) {
      throw new Error('Journal entry not found or not in DRAFT status');
    }

    return this.getJournalEntry(entryId) as Promise<JournalEntry>;
  }

  async postJournalEntry(entryId: string): Promise<JournalEntry> {
    const result = await dbQuery(
      `UPDATE acct_journal_entries
      SET status = 'POSTED', posted_at = NOW(), updated_at = NOW()
      WHERE journal_entry_id = $1 AND status = 'APPROVED'
      RETURNING *`,
      [entryId]
    );

    if (result.rows.length === 0) {
      throw new Error('Journal entry not found or not approved');
    }

    return this.getJournalEntry(entryId) as Promise<JournalEntry>;
  }

  async reverseJournalEntry(
    entryId: string,
    reason: string,
    reversedBy: string
  ): Promise<JournalEntry> {
    const originalEntry = await this.getJournalEntry(entryId);
    if (!originalEntry) {
      throw new Error('Journal entry not found');
    }

    if (originalEntry.status !== 'POSTED') {
      throw new Error('Only posted entries can be reversed');
    }

    const lines = await this.getJournalEntryLines(entryId);

    // Create reversal entry
    const reversalEntryId = this.generateId('JE');
    await dbQuery(
      `INSERT INTO acct_journal_entries (
        journal_entry_id, entry_number, entry_date, fiscal_period,
        description, status, total_debit, total_credit,
        reversal_entry_id, created_by, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, 'POSTED', $6, $7, $8, $9, NOW(), NOW())`,
      [
        reversalEntryId,
        `${originalEntry.entryNumber}-REV`,
        new Date(),
        originalEntry.fiscalPeriod,
        `REVERSAL: ${originalEntry.description} - ${reason}`,
        originalEntry.totalCredit, // Swap debit/credit
        originalEntry.totalDebit,
        entryId,
        reversedBy,
      ]
    );

    // Create reversal lines (swapped debit/credit)
    for (const line of lines) {
      const lineId = this.generateId('JEL');
      await dbQuery(
        `INSERT INTO acct_journal_entry_lines (
          line_id, journal_entry_id, line_number, account_id,
          description, debit_amount, credit_amount
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          lineId,
          reversalEntryId,
          line.lineNumber,
          line.accountId,
          `REVERSAL: ${line.description || ''}`,
          line.creditAmount, // Swap
          line.debitAmount, // Swap
        ]
      );
    }

    // Update original entry status
    await dbQuery(
      `UPDATE acct_journal_entries
      SET status = 'REVERSED', updated_at = NOW()
      WHERE journal_entry_id = $1`,
      [entryId]
    );

    return this.getJournalEntry(reversalEntryId) as Promise<JournalEntry>;
  }

  // ========================================================================
  // PHASE 1: TRIAL BALANCE
  // ========================================================================

  async getTrialBalance(asOfDate: Date): Promise<TrialBalance> {
    const fiscalPeriod = `${asOfDate.getFullYear()}-${String(asOfDate.getMonth() + 1).padStart(2, '0')}`;

    const trialBalanceId = this.generateId('TB');

    // Create trial balance snapshot
    await dbQuery(
      `INSERT INTO acct_trial_balance (trial_balance_id, as_of_date, fiscal_period, generated_at)
      VALUES ($1, $2, $3, NOW())`,
      [trialBalanceId, asOfDate, fiscalPeriod]
    );

    // Get all account balances
    const accounts = await this.getChartOfAccounts({ isActive: true });

    for (const account of accounts) {
      const balance = await this.getAccountBalance(account.accountId, asOfDate);
      if (balance.debitBalance > 0 || balance.creditBalance > 0) {
        const lineId = this.generateId('TBL');
        await dbQuery(
          `INSERT INTO acct_trial_balance_lines (
            line_id, trial_balance_id, account_id, debit_balance, credit_balance
          ) VALUES ($1, $2, $3, $4, $5)`,
          [lineId, trialBalanceId, account.accountId, balance.debitBalance, balance.creditBalance]
        );
      }
    }

    return {
      trialBalanceId,
      asOfDate,
      fiscalPeriod,
      generatedAt: new Date(),
    };
  }

  async getTrialBalanceLines(trialBalanceId: string): Promise<any[]> {
    try {
      const result = await dbQuery(
        `SELECT
          tbl.line_id as "lineId",
          tbl.trial_balance_id as "trialBalanceId",
          tbl.account_id as "accountId",
          coa.account_code as "accountCode",
          coa.account_name as "accountName",
          coa.account_type as "accountType",
          tbl.debit_balance as "debitBalance",
          tbl.credit_balance as "creditBalance",
          tbl.net_balance as "netBalance"
        FROM acct_trial_balance_lines tbl
        JOIN acct_chart_of_accounts coa ON coa.account_id = tbl.account_id
        WHERE tbl.trial_balance_id = $1
        ORDER BY coa.account_code`,
        [trialBalanceId]
      );

      return result.rows;
    } catch (error: any) {
      if (error.message?.includes('does not exist')) {
        return [];
      }
      throw error;
    }
  }

  // ========================================================================
  // PHASE 1: BALANCE SHEET
  // ========================================================================

  async getBalanceSheet(asOfDate: Date): Promise<BalanceSheet> {
    const accounts = await this.getChartOfAccounts({ isActive: true });

    const assetAccounts = accounts.filter(a => a.accountType === AccountType.ASSET);
    const liabilityAccounts = accounts.filter(a => a.accountType === AccountType.LIABILITY);
    const equityAccounts = accounts.filter(a => a.accountType === AccountType.EQUITY);

    // Current assets (account codes 1000-1999, typically 1000-1199)
    const currentAssets = await this.getBalanceSheetItems(assetAccounts, asOfDate, [1000, 1199]);
    // Non-current assets (1200-1999)
    const nonCurrentAssets = await this.getBalanceSheetItems(assetAccounts, asOfDate, [1200, 1999]);

    // Current liabilities (2000-2999, typically 2000-2199)
    const currentLiabilities = await this.getBalanceSheetItems(
      liabilityAccounts,
      asOfDate,
      [2000, 2199]
    );
    // Non-current liabilities (2200-2999)
    const nonCurrentLiabilities = await this.getBalanceSheetItems(
      liabilityAccounts,
      asOfDate,
      [2200, 2999]
    );

    // Equity
    const equityItems = await this.getBalanceSheetItems(equityAccounts, asOfDate, [3000, 3999]);

    const totalAssets =
      currentAssets.reduce((sum, item) => sum + item.amount, 0) +
      nonCurrentAssets.reduce((sum, item) => sum + item.amount, 0);
    const totalLiabilities =
      currentLiabilities.reduce((sum, item) => sum + item.amount, 0) +
      nonCurrentLiabilities.reduce((sum, item) => sum + item.amount, 0);
    const totalEquity = equityItems.reduce((sum, item) => sum + item.amount, 0);

    return {
      asOfDate,
      generatedAt: new Date(),
      assets: {
        current: currentAssets,
        nonCurrent: nonCurrentAssets,
        total: totalAssets,
      },
      liabilities: {
        current: currentLiabilities,
        nonCurrent: nonCurrentLiabilities,
        total: totalLiabilities,
      },
      equity: {
        total: totalEquity,
        breakdown: equityItems,
      },
      totalAssetsLiabilitiesEquity: totalAssets,
    };
  }

  private async getBalanceSheetItems(
    accounts: ChartOfAccounts[],
    asOfDate: Date,
    codeRange: [number, number]
  ): Promise<any[]> {
    const items: any[] = [];

    for (const account of accounts) {
      const code = parseInt(account.accountCode);
      if (code < codeRange[0] || code > codeRange[1]) continue;

      const balance = await this.getAccountBalance(account.accountId, asOfDate);
      if (balance.netBalance !== 0) {
        items.push({
          accountId: account.accountId,
          accountCode: account.accountCode,
          accountName: account.accountName,
          amount: Math.abs(balance.netBalance),
        });
      }
    }

    return items;
  }

  // ========================================================================
  // PHASE 1: CASH FLOW STATEMENT
  // ========================================================================

  async getCashFlowStatement(startDate: Date, endDate: Date): Promise<CashFlowStatement> {
    const operating = await this.getOperatingCashFlow(startDate, endDate);
    const investing = await this.getInvestingCashFlow(startDate, endDate);
    const financing = await this.getFinancingCashFlow(startDate, endDate);

    return {
      period: { startDate, endDate },
      operating,
      investing,
      financing,
      netCashFlow: operating.total + investing.total + financing.total,
      beginningCash: 0, // Would need beginning balance calculation
      endingCash: 0, // Would need ending balance calculation
    };
  }

  private async getOperatingCashFlow(startDate: Date, endDate: Date): Promise<any> {
    // Cash from operations = Revenue - COGS - Operating Expenses
    const metrics = await this.getFinancialMetrics({
      startDate,
      endDate,
      includePreviousPeriod: false,
    });

    const items = [
      { description: 'Net Income', amount: metrics.netProfit },
      { description: 'Depreciation', amount: 0 }, // Would need depreciation data
      { description: 'Change in Accounts Receivable', amount: -metrics.outstandingReceivables },
      { description: 'Change in Accounts Payable', amount: metrics.outstandingPayables },
    ];

    return {
      total: items.reduce((sum, item) => sum + item.amount, 0),
      items,
    };
  }

  private async getInvestingCashFlow(_startDate: Date, _endDate: Date): Promise<any> {
    // Placeholder for investing activities
    // TODO: Implement actual cash flow from investing activities
    return {
      total: 0,
      items: [],
    };
  }

  private async getFinancingCashFlow(_startDate: Date, _endDate: Date): Promise<any> {
    // Placeholder for financing activities
    // TODO: Implement actual cash flow from financing activities
    return {
      total: 0,
      items: [],
    };
  }

  // ========================================================================
  // PHASE 2: ENHANCED ACCOUNTS RECEIVABLE
  // ========================================================================

  async getARAgingReport(asOfDate: Date): Promise<{
    asOfDate: Date;
    buckets: Array<{ days: number; label: string; amount: number; count: number }>;
    totalOutstanding: number;
  }> {
    try {
      const result = await dbQuery(
        `SELECT
          SUM(amount - COALESCE(paid_amount, 0)) as total_outstanding
        FROM accounts_receivable
        WHERE status = 'OPEN' AND invoice_date <= $1`,
        [asOfDate]
      );

      const totalOutstanding = parseFloat(result.rows[0]?.total_outstanding) || 0;

      return {
        asOfDate,
        buckets: [
          { days: 30, label: 'Current (0-30)', amount: 0, count: 0 },
          { days: 60, label: '31-60 Days', amount: 0, count: 0 },
          { days: 90, label: '61-90 Days', amount: 0, count: 0 },
          { days: 120, label: '91-120 Days', amount: 0, count: 0 },
          { days: 999, label: 'Over 120 Days', amount: 0, count: 0 },
        ],
        totalOutstanding,
      };
    } catch (error: any) {
      if (error.message?.includes('does not exist')) {
        return {
          asOfDate,
          buckets: [],
          totalOutstanding: 0,
        };
      }
      throw error;
    }
  }

  async applyARPayment(data: ApplyPaymentDTO): Promise<ARPayment> {
    const paymentId = this.generateId('ARP');

    await dbQuery(
      `INSERT INTO acct_ar_payments (
        payment_id, receivable_id, payment_date, payment_method,
        amount, reference_number, notes, created_by, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
      RETURNING *`,
      [
        paymentId,
        data.receivableId,
        data.paymentDate,
        data.paymentMethod || 'CASH',
        data.amount,
        data.referenceNumber || null,
        data.notes || null,
        data.createdBy,
      ]
    );

    // Update the receivable
    await dbQuery(
      `UPDATE accounts_receivable
      SET paid_amount = COALESCE(paid_amount, 0) + $1,
          last_payment_date = $2,
          updated_at = NOW()
      WHERE receivable_id = $3`,
      [data.amount, data.paymentDate, data.receivableId]
    );

    const result = await dbQuery(
      `SELECT
        payment_id as "paymentId",
        receivable_id as "receivableId",
        payment_date as "paymentDate",
        payment_method as "paymentMethod",
        amount,
        reference_number as "referenceNumber",
        notes,
        created_by as "createdBy",
        created_at as "createdAt"
      FROM acct_ar_payments
      WHERE payment_id = $1`,
      [paymentId]
    );

    return result.rows[0] as ARPayment;
  }

  async createCreditMemo(data: CreateCreditMemoDTO): Promise<CreditMemo> {
    const memoId = this.generateId('CM');

    await dbQuery(
      `INSERT INTO acct_credit_memos (
        memo_id, receivable_id, memo_number, memo_date,
        reason, amount, status, approved_by, approved_at, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, 'APPROVED', NULL, NULL, NOW())
      RETURNING *`,
      [memoId, data.receivableId || null, data.memoNumber, data.memoDate, data.reason, data.amount]
    );

    const result = await dbQuery(
      `SELECT
        memo_id as "memoId",
        receivable_id as "receivableId",
        memo_number as "memoNumber",
        memo_date as "memoDate",
        reason,
        amount,
        status,
        approved_by as "approvedBy",
        approved_at as "approvedAt",
        created_at as "createdAt"
      FROM acct_credit_memos
      WHERE memo_id = $1`,
      [memoId]
    );

    return result.rows[0] as CreditMemo;
  }

  // ========================================================================
  // PHASE 2: ENHANCED ACCOUNTS PAYABLE
  // ========================================================================

  async getAPAgingReport(asOfDate: Date): Promise<{
    asOfDate: Date;
    buckets: Array<{ days: number; label: string; amount: number; count: number }>;
    totalOutstanding: number;
  }> {
    try {
      const result = await dbQuery(
        `SELECT
          SUM(amount - COALESCE(paid_amount, 0)) as total_outstanding
        FROM accounts_payable
        WHERE status = 'OPEN' AND invoice_date <= $1`,
        [asOfDate]
      );

      const totalOutstanding = parseFloat(result.rows[0]?.total_outstanding) || 0;

      return {
        asOfDate,
        buckets: [
          { days: 30, label: 'Current (0-30)', amount: 0, count: 0 },
          { days: 60, label: '31-60 Days', amount: 0, count: 0 },
          { days: 90, label: '61-90 Days', amount: 0, count: 0 },
          { days: 120, label: '91-120 Days', amount: 0, count: 0 },
          { days: 999, label: 'Over 120 Days', amount: 0, count: 0 },
        ],
        totalOutstanding,
      };
    } catch (error: any) {
      if (error.message?.includes('does not exist')) {
        return {
          asOfDate,
          buckets: [],
          totalOutstanding: 0,
        };
      }
      throw error;
    }
  }

  async approveAPInvoice(payableId: string, approvedBy: string): Promise<any> {
    const result = await dbQuery(
      `UPDATE accounts_payable
      SET approved_by = $1, approved_at = NOW(), updated_at = NOW()
      WHERE payable_id = $2
      RETURNING *`,
      [approvedBy, payableId]
    );

    if (result.rows.length === 0) {
      throw new Error('Payable not found');
    }

    return result.rows[0];
  }

  async processAPPayment(
    payableId: string,
    paymentData: {
      paymentDate: Date;
      paymentMethod: string;
      amount: number;
      createdBy: string;
    }
  ): Promise<APPayment> {
    const paymentId = this.generateId('APP');

    await dbQuery(
      `INSERT INTO acct_ap_payments (
        payment_id, payable_id, payment_date, payment_method,
        amount, reference_number, notes, created_by, created_at
      ) VALUES ($1, $2, $3, $4, $5, NULL, NULL, $6, NOW())
      RETURNING *`,
      [
        paymentId,
        payableId,
        paymentData.paymentDate,
        paymentData.paymentMethod,
        paymentData.amount,
        paymentData.createdBy,
      ]
    );

    // Update the payable
    await dbQuery(
      `UPDATE accounts_payable
      SET paid_amount = COALESCE(paid_amount, 0) + $1,
          status = CASE WHEN (amount - (paid_amount + $1)) <= 0.01 THEN 'PAID' ELSE status END,
          updated_at = NOW()
      WHERE payable_id = $2`,
      [paymentData.amount, payableId]
    );

    const result = await dbQuery(
      `SELECT
        payment_id as "paymentId",
        payable_id as "payableId",
        payment_date as "paymentDate",
        payment_method as "paymentMethod",
        amount,
        reference_number as "referenceNumber",
        notes,
        created_by as "createdBy",
        created_at as "createdAt"
      FROM acct_ap_payments
      WHERE payment_id = $1`,
      [paymentId]
    );

    return result.rows[0] as APPayment;
  }

  // ========================================================================
  // PHASE 2: CASH MANAGEMENT
  // ========================================================================

  async getCashPosition(asOfDate: Date): Promise<CashPosition> {
    try {
      // Get cash from cash accounts
      const cashResult = await dbQuery(
        `SELECT
          COALESCE(SUM(CASE WHEN normal_balance = 'D' THEN jel.debit_amount - jel.credit_amount
            ELSE jel.credit_amount - jel.debit_amount END), 0) as cash_balance
        FROM acct_chart_of_accounts coa
        LEFT JOIN acct_journal_entry_lines jel ON jel.account_id = coa.account_id
        LEFT JOIN acct_journal_entries je ON je.journal_entry_id = jel.journal_entry_id
        WHERE coa.account_code LIKE '11%' AND je.status = 'POSTED' AND je.entry_date <= $1`,
        [asOfDate]
      );

      const cashOnHand = parseFloat(cashResult.rows[0]?.cash_balance) || 0;

      // Get AR
      const arResult = await dbQuery(
        `SELECT COALESCE(SUM(amount - COALESCE(paid_amount, 0)), 0) as ar_balance
        FROM accounts_receivable
        WHERE status = 'OPEN' AND invoice_date <= $1`,
        [asOfDate]
      );

      const accountsReceivable = parseFloat(arResult.rows[0]?.ar_balance) || 0;

      // Get AP
      const apResult = await dbQuery(
        `SELECT COALESCE(SUM(amount - COALESCE(paid_amount, 0)), 0) as ap_balance
        FROM accounts_payable
        WHERE status = 'OPEN' AND invoice_date <= $1`,
        [asOfDate]
      );

      const accountsPayable = parseFloat(apResult.rows[0]?.ap_balance) || 0;
      const totalCash = cashOnHand + cashOnHand;

      return {
        positionId: this.generateId('CP'),
        asOfDate,
        cashOnHand,
        cashInBank: cashOnHand,
        totalCash,
        accountsReceivable,
        accountsPayable,
        netCash: totalCash + accountsReceivable - accountsPayable,
        createdAt: new Date(),
      };
    } catch (error: any) {
      if (error.message?.includes('does not exist')) {
        return {
          positionId: this.generateId('CP'),
          asOfDate,
          cashOnHand: 0,
          cashInBank: 0,
          totalCash: 0,
          accountsReceivable: 0,
          accountsPayable: 0,
          netCash: 0,
          createdAt: new Date(),
        };
      }
      throw error;
    }
  }

  async createBankReconciliation(data: CreateBankReconciliationDTO): Promise<BankReconciliation> {
    const reconciliationId = this.generateId('BR');

    await dbQuery(
      `INSERT INTO acct_bank_reconciliations (
        reconciliation_id, bank_account_id, statement_date,
        statement_balance, book_balance, difference,
        status, reconciled_by, reconciled_at, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, 'IN_PROGRESS', NULL, NULL, NOW())
      RETURNING *`,
      [
        reconciliationId,
        data.bankAccountId,
        data.statementDate,
        data.statementBalance,
        data.bookBalance,
        Math.abs(data.statementBalance - data.bookBalance),
      ]
    );

    const result = await dbQuery(
      `SELECT
        reconciliation_id as "reconciliationId",
        bank_account_id as "bankAccountId",
        statement_date as "statementDate",
        statement_balance as "statementBalance",
        book_balance as "bookBalance",
        difference,
        status,
        reconciled_by as "reconciledBy",
        reconciled_at as "reconciledAt",
        created_at as "createdAt"
      FROM acct_bank_reconciliations
      WHERE reconciliation_id = $1`,
      [reconciliationId]
    );

    return result.rows[0] as BankReconciliation;
  }

  // ========================================================================
  // PHASE 2: REVENUE RECOGNITION
  // ========================================================================

  async createRevenueContract(data: CreateRevenueContractDTO): Promise<RevenueContract> {
    const contractId = this.generateId('RC');

    await dbQuery(
      `INSERT INTO acct_revenue_contracts (
        contract_id, contract_number, customer_id, contract_name,
        total_value, start_date, end_date,
        recognition_method, status, created_by, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'ACTIVE', $9, NOW(), NOW())
      RETURNING *`,
      [
        contractId,
        data.contractNumber,
        data.customerId,
        data.contractName || data.contractNumber,
        data.totalValue,
        data.startDate,
        data.endDate,
        data.recognitionMethod,
        data.createdBy,
      ]
    );

    const result = await dbQuery(
      `SELECT
        contract_id as "contractId",
        contract_number as "contractNumber",
        customer_id as "customerId",
        contract_name as "contractName",
        total_value as "totalValue",
        start_date as "startDate",
        end_date as "endDate",
        recognition_method as "recognitionMethod",
        status,
        created_by as "createdBy",
        created_at as "createdAt",
        updated_at as "updatedAt"
      FROM acct_revenue_contracts
      WHERE contract_id = $1`,
      [contractId]
    );

    return result.rows[0] as RevenueContract;
  }

  async recognizeRevenue(
    contractId: string,
    milestoneId?: string
  ): Promise<{ recognized: boolean; amount: number; date: Date }> {
    const contract = await dbQuery(`SELECT * FROM acct_revenue_contracts WHERE contract_id = $1`, [
      contractId,
    ]);

    if (contract.rows.length === 0) {
      throw new Error('Contract not found');
    }

    const contractData = contract.rows[0];

    // For milestone-based recognition
    if (milestoneId) {
      const milestone = await dbQuery(
        `UPDATE acct_revenue_milestones
        SET achieved_amount = target_amount, achieved_date = NOW(), status = 'ACHIEVED'
        WHERE milestone_id = $1 AND contract_id = $2
        RETURNING *`,
        [milestoneId, contractId]
      );

      if (milestone.rows.length === 0) {
        throw new Error('Milestone not found');
      }

      return {
        recognized: true,
        amount: parseFloat(milestone.rows[0].target_amount),
        date: milestone.rows[0].achieved_date,
      };
    }

    // For instant recognition
    if (contractData.recognition_method === 'INSTANT') {
      return {
        recognized: true,
        amount: parseFloat(contractData.total_value),
        date: new Date(),
      };
    }

    return {
      recognized: false,
      amount: 0,
      date: new Date(),
    };
  }

  // ========================================================================
  // PHASE 3: MULTI-CURRENCY
  // ========================================================================

  async getCurrencies(): Promise<Currency[]> {
    try {
      const result = await dbQuery(
        `SELECT
          currency_code as "currencyCode",
          currency_name as "currencyName",
          symbol,
          is_active as "isActive",
          created_at as "createdAt"
        FROM acct_currencies
        WHERE is_active = true
        ORDER BY currency_code`
      );

      return result.rows as Currency[];
    } catch (error: any) {
      if (error.message?.includes('does not exist')) {
        return [];
      }
      throw error;
    }
  }

  async getExchangeRate(fromCurrency: string, toCurrency: string, date: Date): Promise<number> {
    try {
      const result = await dbQuery(
        `SELECT exchange_rate
        FROM acct_exchange_rates
        WHERE from_currency = $1 AND to_currency = $2 AND rate_date = $3 AND is_active = true`,
        [fromCurrency, toCurrency, date]
      );

      if (result.rows.length === 0) {
        throw new Error('Exchange rate not found');
      }

      return parseFloat(result.rows[0].exchange_rate);
    } catch (error: any) {
      if (error.message?.includes('does not exist')) {
        return 1; // Default to 1:1
      }
      throw error;
    }
  }

  async setExchangeRate(data: {
    fromCurrency: string;
    toCurrency: string;
    rateDate: Date;
    exchangeRate: number;
    createdBy: string;
  }): Promise<ExchangeRate> {
    const rateId = this.generateId('XR');

    await dbQuery(
      `INSERT INTO acct_exchange_rates (
        rate_id, from_currency, to_currency, rate_date,
        exchange_rate, is_active, created_at
      ) VALUES ($1, $2, $3, $4, $5, true, NOW())
      ON CONFLICT (from_currency, to_currency, rate_date)
      DO UPDATE SET exchange_rate = EXCLUDED.exchange_rate, is_active = true
      RETURNING *`,
      [rateId, data.fromCurrency, data.toCurrency, data.rateDate, data.exchangeRate]
    );

    const result = await dbQuery(
      `SELECT
        rate_id as "rateId",
        from_currency as "fromCurrency",
        to_currency as "toCurrency",
        rate_date as "rateDate",
        exchange_rate as "exchangeRate",
        is_active as "isActive",
        created_at as "createdAt"
      FROM acct_exchange_rates
      WHERE rate_id = $1`,
      [rateId]
    );

    return result.rows[0] as ExchangeRate;
  }

  // ========================================================================
  // PHASE 3: BUDGETING & FORECASTING
  // ========================================================================

  async createBudget(data: CreateBudgetDTO): Promise<Budget> {
    const budgetId = this.generateId('BG');

    await dbQuery(
      `INSERT INTO acct_budgets (
        budget_id, budget_name, fiscal_year, budget_type,
        status, created_by, created_at
      ) VALUES ($1, $2, $3, $4, 'ACTIVE', $5, NOW())
      RETURNING *`,
      [budgetId, data.budgetName, data.fiscalYear, data.budgetType, data.createdBy]
    );

    // Insert budget lines
    for (const line of data.lines) {
      const lineId = this.generateId('BGL');
      await dbQuery(
        `INSERT INTO acct_budget_lines (
          line_id, budget_id, account_id, period, budgeted_amount
        ) VALUES ($1, $2, $3, $4, $5)`,
        [lineId, budgetId, line.accountId, line.period, line.budgetedAmount]
      );
    }

    const result = await dbQuery(
      `SELECT
        budget_id as "budgetId",
        budget_name as "budgetName",
        fiscal_year as "fiscalYear",
        budget_type as "budgetType",
        status,
        created_by as "createdBy",
        created_at as "createdAt"
      FROM acct_budgets
      WHERE budget_id = $1`,
      [budgetId]
    );

    return result.rows[0] as Budget;
  }

  async getBudgetVsActual(budgetId: string): Promise<{
    budget: Budget;
    lines: Array<{
      accountId: string;
      accountName: string;
      period: string;
      budgetedAmount: number;
      actualAmount: number;
      variance: number;
      variancePercent: number;
    }>;
  }> {
    try {
      const budgetResult = await dbQuery(
        `SELECT
          budget_id as "budgetId",
          budget_name as "budgetName",
          fiscal_year as "fiscalYear",
          budget_type as "budgetType",
          status,
          created_by as "createdBy",
          created_at as "createdAt"
        FROM acct_budgets
        WHERE budget_id = $1`,
        [budgetId]
      );

      if (budgetResult.rows.length === 0) {
        throw new Error('Budget not found');
      }

      const linesResult = await dbQuery(
        `SELECT
          bl.account_id as "accountId",
          COALESCE(coa.account_name, 'Unknown') as "accountName",
          bl.period,
          bl.budgeted_amount as "budgetedAmount",
          COALESCE(bl.actual_amount, 0) as "actualAmount",
          bl.budgeted_amount - COALESCE(bl.actual_amount, 0) as variance,
          CASE WHEN bl.budgeted_amount > 0
            THEN ((bl.budgeted_amount - COALESCE(bl.actual_amount, 0)) / bl.budgeted_amount * 100)
            ELSE 0 END as "variancePercent"
        FROM acct_budget_lines bl
        LEFT JOIN acct_chart_of_accounts coa ON coa.account_id = bl.account_id
        WHERE bl.budget_id = $1
        ORDER BY bl.period, coa.account_code`,
        [budgetId]
      );

      return {
        budget: budgetResult.rows[0] as Budget,
        lines: linesResult.rows.map((row: any) => ({
          accountId: row.accountId,
          accountName: row.accountName,
          period: row.period,
          budgetedAmount: parseFloat(row.budgetedAmount) || 0,
          actualAmount: parseFloat(row.actualAmount) || 0,
          variance: parseFloat(row.variance) || 0,
          variancePercent: parseFloat(row.variancePercent) || 0,
        })),
      };
    } catch (error: any) {
      if (error.message?.includes('does not exist')) {
        throw new Error('Budget tables not yet available');
      }
      throw error;
    }
  }

  async createForecast(data: {
    forecastName: string;
    forecastType: string;
    startDate: Date;
    endDate: Date;
    createdBy: string;
    lines: Array<{ accountId: string; period: string; forecastedAmount: number }>;
  }): Promise<Forecast> {
    const forecastId = this.generateId('FC');

    await dbQuery(
      `INSERT INTO acct_forecasts (
        forecast_id, forecast_name, forecast_type,
        start_date, end_date, created_by, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, NOW())
      RETURNING *`,
      [
        forecastId,
        data.forecastName,
        data.forecastType,
        data.startDate,
        data.endDate,
        data.createdBy,
      ]
    );

    // Insert forecast lines
    for (const line of data.lines) {
      const lineId = this.generateId('FCL');
      await dbQuery(
        `INSERT INTO acct_forecast_lines (
          line_id, forecast_id, account_id, period, forecasted_amount
        ) VALUES ($1, $2, $3, $4, $5)`,
        [lineId, forecastId, line.accountId, line.period, line.forecastedAmount]
      );
    }

    const result = await dbQuery(
      `SELECT
        forecast_id as "forecastId",
        forecast_name as "forecastName",
        forecast_type as "forecastType",
        start_date as "startDate",
        end_date as "endDate",
        created_by as "createdBy",
        created_at as "createdAt"
      FROM acct_forecasts
      WHERE forecast_id = $1`,
      [forecastId]
    );

    return result.rows[0] as Forecast;
  }

  // ========================================================================
  // PHASE 3: FIXED ASSETS
  // ========================================================================

  async createFixedAsset(data: CreateFixedAssetDTO): Promise<FixedAsset> {
    const assetId = this.generateId('FA');

    await dbQuery(
      `INSERT INTO acct_fixed_assets (
        asset_id, asset_number, asset_name, asset_category,
        serial_number, purchase_date, purchase_cost, salvage_value,
        useful_life, depreciation_method, current_book_value,
        accumulated_depreciation, status, location, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $7, 0, 'ACTIVE', $11, NOW(), NOW())
      RETURNING *`,
      [
        assetId,
        data.assetNumber,
        data.assetName,
        data.assetCategory || null,
        data.serialNumber || null,
        data.purchaseDate,
        data.purchaseCost,
        data.salvageValue,
        data.usefulLife,
        data.depreciationMethod,
        data.location || null,
      ]
    );

    const result = await dbQuery(
      `SELECT
        asset_id as "assetId",
        asset_number as "assetNumber",
        asset_name as "assetName",
        asset_category as "assetCategory",
        serial_number as "serialNumber",
        purchase_date as "purchaseDate",
        purchase_cost as "purchaseCost",
        salvage_value as "salvageValue",
        useful_life as "usefulLife",
        depreciation_method as "depreciationMethod",
        current_book_value as "currentBookValue",
        accumulated_depreciation as "accumulatedDepreciation",
        status,
        location,
        created_at as "createdAt",
        updated_at as "updatedAt"
      FROM acct_fixed_assets
      WHERE asset_id = $1`,
      [assetId]
    );

    return result.rows[0] as FixedAsset;
  }

  async calculateDepreciation(assetId: string, throughDate: Date): Promise<DepreciationSchedule[]> {
    try {
      const asset = await dbQuery(`SELECT * FROM acct_fixed_assets WHERE asset_id = $1`, [assetId]);

      if (asset.rows.length === 0) {
        throw new Error('Asset not found');
      }

      const assetData = asset.rows[0];
      const purchaseDate = new Date(assetData.purchase_date);
      const purchaseCost = parseFloat(assetData.purchase_cost);
      const salvageValue = parseFloat(assetData.salvage_value);
      const usefulLife = parseInt(assetData.useful_life);
      const method = assetData.depreciation_method;

      const schedules: DepreciationSchedule[] = [];
      let accumulatedDepreciation = parseFloat(assetData.accumulated_depreciation) || 0;
      let bookValue = parseFloat(assetData.current_book_value) || purchaseCost;

      // Calculate depreciation for each period
      const currentDate = new Date(purchaseDate);
      while (currentDate <= throughDate && bookValue > salvageValue) {
        const year = currentDate.getFullYear();
        const period = `${year}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;

        let depreciationAmount = 0;

        switch (method) {
          case 'STRAIGHT_LINE':
            depreciationAmount = (purchaseCost - salvageValue) / usefulLife / 12;
            break;
          case 'DOUBLE_DECLINING':
            depreciationAmount = (bookValue * 2) / usefulLife / 12;
            break;
          default:
            depreciationAmount = (purchaseCost - salvageValue) / usefulLife / 12;
        }

        // Don't depreciate below salvage value
        if (bookValue - depreciationAmount < salvageValue) {
          depreciationAmount = bookValue - salvageValue;
        }

        accumulatedDepreciation += depreciationAmount;
        bookValue -= depreciationAmount;

        schedules.push({
          scheduleId: this.generateId('DS'),
          assetId,
          fiscalYear: year,
          fiscalPeriod: period,
          depreciationAmount,
          bookValueBeginning: bookValue + depreciationAmount,
          bookValueEnding: bookValue,
          accumulatedDepreciation,
          isDepreciated: currentDate <= throughDate,
          calculatedAt: new Date(),
          createdAt: new Date(),
        } as DepreciationSchedule);

        currentDate.setMonth(currentDate.getMonth() + 1);
      }

      return schedules;
    } catch (error: any) {
      if (error.message?.includes('does not exist')) {
        throw new Error('Fixed assets tables not yet available');
      }
      throw error;
    }
  }

  async getAssetRegister(asOfDate: Date): Promise<{
    asOfDate: Date;
    assets: FixedAsset[];
    totalOriginalCost: number;
    totalAccumulatedDepreciation: number;
    totalNetBookValue: number;
  }> {
    try {
      const result = await dbQuery(
        `SELECT
          asset_id as "assetId",
          asset_number as "assetNumber",
          asset_name as "assetName",
          asset_category as "assetCategory",
          serial_number as "serialNumber",
          purchase_date as "purchaseDate",
          purchase_cost as "purchaseCost",
          salvage_value as "salvageValue",
          useful_life as "usefulLife",
          depreciation_method as "depreciationMethod",
          current_book_value as "currentBookValue",
          accumulated_depreciation as "accumulatedDepreciation",
          status,
          location,
          created_at as "createdAt",
          updated_at as "updatedAt"
        FROM acct_fixed_assets
        WHERE status = 'ACTIVE'
        ORDER BY asset_number`
      );

      const assets = result.rows as FixedAsset[];
      const totalOriginalCost = assets.reduce((sum, a) => sum + a.purchaseCost, 0);
      const totalAccumulatedDepreciation = assets.reduce(
        (sum, a) => sum + (a.accumulatedDepreciation || 0),
        0
      );
      const totalNetBookValue = assets.reduce((sum, a) => sum + (a.currentBookValue || 0), 0);

      return {
        asOfDate,
        assets,
        totalOriginalCost,
        totalAccumulatedDepreciation,
        totalNetBookValue,
      };
    } catch (error: any) {
      if (error.message?.includes('does not exist')) {
        return {
          asOfDate,
          assets: [],
          totalOriginalCost: 0,
          totalAccumulatedDepreciation: 0,
          totalNetBookValue: 0,
        };
      }
      throw error;
    }
  }

  // ========================================================================
  // PHASE 3: COMPLIANCE & AUDIT TRAIL
  // ========================================================================

  async getAuditLog(filters?: {
    tableName?: string;
    recordId?: string;
    action?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  }): Promise<AuditLog[]> {
    try {
      let query = `
        SELECT
          audit_id as "auditId",
          table_name as "tableName",
          record_id as "recordId",
          action,
          old_values as "oldValues",
          new_values as "newValues",
          changed_by as "changedBy",
          changed_at as "changedAt",
          ip_address as "ipAddress",
          user_agent as "userAgent"
        FROM acct_audit_log
        WHERE 1=1
      `;
      const params: any[] = [];
      let paramCount = 0;

      if (filters?.tableName) {
        paramCount++;
        query += ` AND table_name = $${paramCount}`;
        params.push(filters.tableName);
      }
      if (filters?.recordId) {
        paramCount++;
        query += ` AND record_id = $${paramCount}`;
        params.push(filters.recordId);
      }
      if (filters?.action) {
        paramCount++;
        query += ` AND action = $${paramCount}`;
        params.push(filters.action);
      }
      if (filters?.startDate) {
        paramCount++;
        query += ` AND changed_at >= $${paramCount}`;
        params.push(filters.startDate);
      }
      if (filters?.endDate) {
        paramCount++;
        query += ` AND changed_at <= $${paramCount}`;
        params.push(filters.endDate);
      }

      query += ` ORDER BY changed_at DESC`;

      if (filters?.limit) {
        paramCount++;
        query += ` LIMIT $${paramCount}`;
        params.push(filters.limit);
      }

      const result = await dbQuery(query, params);
      return result.rows as AuditLog[];
    } catch (error: any) {
      if (error.message?.includes('does not exist')) {
        return [];
      }
      throw error;
    }
  }

  async getDocuments(recordType: string, recordId: string): Promise<DocumentAttachment[]> {
    try {
      const result = await dbQuery(
        `SELECT
          attachment_id as "attachmentId",
          record_type as "recordType",
          record_id as "recordId",
          document_name as "documentName",
          document_type as "documentType",
          file_path as "filePath",
          file_size as "fileSize",
          uploaded_by as "uploadedBy",
          uploaded_at as "uploadedAt"
        FROM acct_document_attachments
        WHERE record_type = $1 AND record_id = $2
        ORDER BY uploaded_at DESC`,
        [recordType, recordId]
      );

      return result.rows as DocumentAttachment[];
    } catch (error: any) {
      if (error.message?.includes('does not exist')) {
        return [];
      }
      throw error;
    }
  }

  async attachDocument(data: {
    recordType: string;
    recordId: string;
    documentName: string;
    documentType: string;
    filePath: string;
    fileSize: number;
    uploadedBy: string;
  }): Promise<DocumentAttachment> {
    const attachmentId = this.generateId('DOC');

    await dbQuery(
      `INSERT INTO acct_document_attachments (
        attachment_id, record_type, record_id, document_name,
        document_type, file_path, file_size, uploaded_by, uploaded_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
      RETURNING *`,
      [
        attachmentId,
        data.recordType,
        data.recordId,
        data.documentName,
        data.documentType,
        data.filePath,
        data.fileSize,
        data.uploadedBy,
      ]
    );

    const result = await dbQuery(
      `SELECT
        attachment_id as "attachmentId",
        record_type as "recordType",
        record_id as "recordId",
        document_name as "documentName",
        document_type as "documentType",
        file_path as "filePath",
        file_size as "fileSize",
        uploaded_by as "uploadedBy",
        uploaded_at as "uploadedAt"
      FROM acct_document_attachments
      WHERE attachment_id = $1`,
      [attachmentId]
    );

    return result.rows[0] as DocumentAttachment;
  }

  async createApprovalRequest(data: {
    approvalType: string;
    recordId: string;
    requestedBy: string;
  }): Promise<Approval> {
    const approvalId = this.generateId('APR');

    await dbQuery(
      `INSERT INTO acct_approvals (
        approval_id, approval_type, record_id, status,
        requested_by, created_at
      ) VALUES ($1, $2, $3, 'PENDING', $4, NOW())
      RETURNING *`,
      [approvalId, data.approvalType, data.recordId, data.requestedBy]
    );

    const result = await dbQuery(
      `SELECT
        approval_id as "approvalId",
        approval_type as "approvalType",
        record_id as "recordId",
        status,
        requested_by as "requestedBy",
        approved_by as "approvedBy",
        approved_at as "approvedAt",
        comments,
        created_at as "createdAt"
      FROM acct_approvals
      WHERE approval_id = $1`,
      [approvalId]
    );

    return result.rows[0] as Approval;
  }

  async approveRequest(
    approvalId: string,
    approvedBy: string,
    comments?: string
  ): Promise<Approval> {
    const result = await dbQuery(
      `UPDATE acct_approvals
      SET status = 'APPROVED', approved_by = $1, approved_at = NOW(), comments = $2
      WHERE approval_id = $3 AND status = 'PENDING'
      RETURNING *`,
      [approvedBy, comments || null, approvalId]
    );

    if (result.rows.length === 0) {
      throw new Error('Approval request not found or already processed');
    }

    return {
      approvalId: result.rows[0].approval_id,
      approvalType: result.rows[0].approval_type,
      recordId: result.rows[0].record_id,
      status: result.rows[0].status,
      requestedBy: result.rows[0].requested_by,
      approvedBy: result.rows[0].approved_by,
      approvedAt: result.rows[0].approved_at,
      comments: result.rows[0].comments,
      createdAt: result.rows[0].created_at,
    } as Approval;
  }

  // ========================================================================
  // PAYROLL INTEGRATION
  // ========================================================================

  /**
   * Create journal entries for a processed payroll run
   * Called by HRService after payroll is processed
   *
   * Journal Entry Structure:
   * Debit: Wages Expense (gross pay + employer contributions)
   * Credit: Wages Payable (net pay)
   * Credit: PAYE Payable (PAYE tax)
   * Credit: KiwiSaver Payable (employee + employer KS)
   * Credit: ACC Payable (ACC levy)
   * Credit: Student Loan Payable (if applicable)
   */
  async createPayrollJournalEntry(payrollRun: {
    payrollRunId: string;
    periodStartDate: string;
    periodEndDate: string;
    totalGrossPay: number;
    totalNetPay: number;
    totalTax: number;
    totalKiwiSaver: number;
    totalACC: number;
    totalEmployerContributions: number;
    employeeCount: number;
  }): Promise<string> {
    // Generate journal entry ID
    const entryId = `JE-PAY-${new Date().getFullYear()}-${Date.now()}`;

    // Create journal entry lines
    const lines = [
      // Debit: Wages Expense - Gross pay + Employer contributions
      {
        accountId: 'WAGES_EXPENSE',
        description: `Payroll for ${payrollRun.periodStartDate} to ${payrollRun.periodEndDate}`,
        debitAmount: payrollRun.totalGrossPay + payrollRun.totalEmployerContributions,
        creditAmount: 0,
      },
      // Credit: Wages Payable - Net pay to employees
      {
        accountId: 'WAGES_PAYABLE',
        description: 'Net wages payable to employees',
        debitAmount: 0,
        creditAmount: payrollRun.totalNetPay,
      },
      // Credit: PAYE Payable - Income tax deducted
      {
        accountId: 'PAYE_PAYABLE',
        description: 'PAYE income tax deducted',
        debitAmount: 0,
        creditAmount: payrollRun.totalTax,
      },
      // Credit: KiwiSaver Payable - Employee + Employer contributions
      {
        accountId: 'KIWISAVER_PAYABLE',
        description: 'KiwiSaver contributions',
        debitAmount: 0,
        creditAmount: payrollRun.totalKiwiSaver,
      },
      // Credit: ACC Payable - ACC earners levy
      {
        accountId: 'ACC_PAYABLE',
        description: 'ACC earners levy',
        debitAmount: 0,
        creditAmount: payrollRun.totalACC,
      },
    ];

    // Calculate total debits and credits
    const totalDebit = lines.reduce((sum, line) => sum + line.debitAmount, 0);
    const totalCredit = lines.reduce((sum, line) => sum + line.creditAmount, 0);

    // Create the journal entry
    await dbQuery(
      `INSERT INTO acct_journal_entries (
        entry_id, entry_number, entry_date, description,
        total_debit, total_credit, status, created_by, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
      RETURNING *`,
      [
        entryId,
        `PAY-${new Date().getFullYear()}-${Math.floor(Math.random() * 10000)}`,
        payrollRun.periodEndDate,
        `Payroll: ${payrollRun.employeeCount} employees for ${payrollRun.periodStartDate} to ${payrollRun.periodEndDate}`,
        totalDebit,
        totalCredit,
        'POSTED',
        'SYSTEM',
      ]
    );

    // Insert journal entry lines
    for (const line of lines) {
      if (line.debitAmount > 0 || line.creditAmount > 0) {
        await dbQuery(
          `INSERT INTO acct_journal_entry_lines (
            line_id, entry_id, account_id, description,
            debit_amount, credit_amount
          ) VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            `JEL-${entryId}-${Math.random().toString(36).substring(2, 11)}`,
            entryId,
            line.accountId,
            line.description,
            line.debitAmount,
            line.creditAmount,
          ]
        );
      }
    }

    return entryId;
  }
}

export const accountingService = new AccountingService();
