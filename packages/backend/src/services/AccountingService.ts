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
    return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
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
}

export const accountingService = new AccountingService();
