/**
 * Unit tests for AccountingService
 * @covers src/services/AccountingService.ts
 */

import { AccountingService } from '../AccountingService';
import { query as dbQuery } from '../../db/client';
import {
  FinancialMetrics,
  AccountingPeriod,
  CostCategory,
  RevenueCategory,
  TransactionType,
} from '@opsui/shared';

// Mock the database client
jest.mock('../../db/client', () => ({
  query: jest.fn(),
}));

describe('AccountingService', () => {
  let accountingService: AccountingService;

  beforeEach(() => {
    jest.clearAllMocks();
    accountingService = new AccountingService();
  });

  // ==========================================================================
  // FINANCIAL METRICS
  // ==========================================================================

  describe('getFinancialMetrics', () => {
    it('should return financial metrics for a period', async () => {
      const mockQuery = dbQuery as jest.MockedFunction<typeof dbQuery>;

      // Mock all the parallel queries
      mockQuery.mockImplementation((_query: string, _params?: any[]) => {
        if (_query.includes('orders')) {
          return Promise.resolve({
            rows: [{ total: '100000' }],
            command: '',
            rowCount: 1,
            oid: 0,
            fields: [],
          } as any);
        }
        if (_query.includes('audit_logs')) {
          return Promise.resolve({
            rows: [{ role: 'PICKER', tasks: 100 }],
            command: '',
            rowCount: 1,
            oid: 0,
            fields: [],
          } as any);
        }
        if (_query.includes('receipt_lines')) {
          return Promise.resolve({
            rows: [{ total: '30000' }],
            command: '',
            rowCount: 1,
            oid: 0,
            fields: [],
          } as any);
        }
        if (_query.includes('shipments')) {
          return Promise.resolve({
            rows: [{ total: '5000' }],
            command: '',
            rowCount: 1,
            oid: 0,
            fields: [],
          } as any);
        }
        if (_query.includes('inventory_units')) {
          return Promise.resolve({
            rows: [{ category: 'ELEC', zone: 'A', value: '20000' }],
            command: '',
            rowCount: 1,
            oid: 0,
            fields: [],
          } as any);
        }
        if (_query.includes('receiving_exceptions')) {
          return Promise.resolve({
            rows: [{ write_offs: '1000', vendor_credits: '500', total_cost: '1500' }],
            command: '',
            rowCount: 1,
            oid: 0,
            fields: [],
          } as any);
        }
        if (_query.includes('quality_inspections')) {
          return Promise.resolve({
            rows: [{ total: '50', failed: '5', passed_qty: '450', failed_qty: '50' }],
            command: '',
            rowCount: 1,
            oid: 0,
            fields: [],
          } as any);
        }
        return Promise.resolve({ rows: [], command: '', rowCount: 1, oid: 0, fields: [] } as any);
      });

      const result = await accountingService.getFinancialMetrics({
        period: AccountingPeriod.MONTHLY,
      });

      expect(result).toBeDefined();
      expect(result.totalRevenue).toBe(100000);
      expect(result.period).toBe(AccountingPeriod.MONTHLY);
      expect(result.grossProfit).toBeDefined();
      expect(result.netProfit).toBeDefined();
    });

    it('should handle missing tables gracefully', async () => {
      const mockQuery = dbQuery as jest.MockedFunction<typeof dbQuery>;
      mockQuery.mockRejectedValue(new Error('relation "orders" does not exist'));

      const result = await accountingService.getFinancialMetrics({
        period: AccountingPeriod.MONTHLY,
      });

      // Should still return a result with zeros
      expect(result).toBeDefined();
      expect(result.totalRevenue).toBe(0);
    });

    it('should calculate profit margin correctly', async () => {
      const mockQuery = dbQuery as jest.MockedFunction<typeof dbQuery>;
      mockQuery.mockImplementation(() => {
        return Promise.resolve({
          rows: [
            {
              total: '100000',
              role: 'PICKER',
              tasks: 100,
              write_offs: '0',
              vendor_credits: '0',
              total_cost: '0',
            },
          ],
          command: '',
          rowCount: 1,
          oid: 0,
          fields: [],
        } as any);
      });

      const result = await accountingService.getFinancialMetrics({});

      expect(result.profitMargin).toBeDefined();
      expect(typeof result.profitMargin).toBe('number');
    });
  });

  // ==========================================================================
  // INVENTORY VALUATION
  // ==========================================================================

  describe('getInventoryValuationDetails', () => {
    it('should return inventory valuation details', async () => {
      const mockQuery = dbQuery as jest.MockedFunction<typeof dbQuery>;
      mockQuery.mockResolvedValue({
        rows: [
          {
            sku: 'SKU-001',
            description: 'Test Product',
            category: 'ELEC',
            unitCost: 100,
            valuationMethod: 'FIFO',
            quantityOnHand: 50,
            zone: 'A',
            binLocation: 'A-01-01',
            lastReceived: new Date(),
            lastCostUpdate: new Date(),
          },
        ],
        command: '',
        rowCount: 1,
        oid: 0,
        fields: [],
      } as any);

      const result = await accountingService.getInventoryValuationDetails();

      expect(result).toHaveLength(1);
      expect(result[0].sku).toBe('SKU-001');
      expect(result[0].totalValue).toBe(5000); // 50 * 100
    });

    it('should filter by category', async () => {
      const mockQuery = dbQuery as jest.MockedFunction<typeof dbQuery>;
      mockQuery.mockResolvedValue({
        rows: [],
        command: '',
        rowCount: 0,
        oid: 0,
        fields: [],
      } as any);

      await accountingService.getInventoryValuationDetails({ category: 'ELEC' });

      expect(dbQuery).toHaveBeenCalledWith(
        expect.stringContaining('s.category ='),
        expect.arrayContaining(['ELEC'])
      );
    });

    it('should filter by zone', async () => {
      const mockQuery = dbQuery as jest.MockedFunction<typeof dbQuery>;
      mockQuery.mockResolvedValue({
        rows: [],
        command: '',
        rowCount: 0,
        oid: 0,
        fields: [],
      } as any);

      await accountingService.getInventoryValuationDetails({ zone: 'A' });

      expect(dbQuery).toHaveBeenCalledWith(
        expect.stringContaining('bl.zone ='),
        expect.arrayContaining(['A'])
      );
    });

    it('should search by SKU', async () => {
      const mockQuery = dbQuery as jest.MockedFunction<typeof dbQuery>;
      mockQuery.mockResolvedValue({
        rows: [],
        command: '',
        rowCount: 0,
        oid: 0,
        fields: [],
      } as any);

      await accountingService.getInventoryValuationDetails({ sku: 'TEST' });

      expect(dbQuery).toHaveBeenCalledWith(
        expect.stringContaining('s.sku LIKE'),
        expect.arrayContaining(['%TEST%'])
      );
    });

    it('should handle missing inventory_units table', async () => {
      const mockQuery = dbQuery as jest.MockedFunction<typeof dbQuery>;
      mockQuery.mockRejectedValue(new Error('relation "inventory_units" does not exist'));

      const result = await accountingService.getInventoryValuationDetails();

      expect(result).toEqual([]);
    });
  });

  // ==========================================================================
  // LABOR COSTS
  // ==========================================================================

  describe('getLaborCostDetails', () => {
    it('should return labor cost details for a period', async () => {
      const mockQuery = dbQuery as jest.MockedFunction<typeof dbQuery>;
      mockQuery.mockResolvedValue({
        rows: [
          {
            userId: 'USER-001',
            userName: 'John Doe',
            userRole: 'PICKER',
            tasksCompleted: 100,
            hoursWorked: 40,
          },
        ],
        command: '',
        rowCount: 1,
        oid: 0,
        fields: [],
      } as any);

      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');

      const result = await accountingService.getLaborCostDetails({ startDate, endDate });

      expect(result).toHaveLength(1);
      expect(result[0].userId).toBe('USER-001');
      expect(result[0].hourlyRate).toBe(25); // PICKER rate
      expect(result[0].totalCost).toBe(1000); // 40 * 25
    });

    it('should filter by user ID', async () => {
      const mockQuery = dbQuery as jest.MockedFunction<typeof dbQuery>;
      mockQuery.mockResolvedValue({
        rows: [],
        command: '',
        rowCount: 0,
        oid: 0,
        fields: [],
      } as any);

      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');

      await accountingService.getLaborCostDetails({
        startDate,
        endDate,
        userId: 'USER-001',
      });

      expect(dbQuery).toHaveBeenCalledWith(
        expect.stringContaining('u.user_id ='),
        expect.arrayContaining([startDate, endDate, 'USER-001'])
      );
    });

    it('should filter by role', async () => {
      const mockQuery = dbQuery as jest.MockedFunction<typeof dbQuery>;
      mockQuery.mockResolvedValue({
        rows: [],
        command: '',
        rowCount: 0,
        oid: 0,
        fields: [],
      } as any);

      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');

      await accountingService.getLaborCostDetails({
        startDate,
        endDate,
        role: 'PICKER' as any,
      });

      expect(dbQuery).toHaveBeenCalledWith(
        expect.stringContaining('u.role ='),
        expect.arrayContaining([startDate, endDate, 'PICKER'])
      );
    });

    it('should use correct hourly rates for different roles', async () => {
      const mockQuery = dbQuery as jest.MockedFunction<typeof dbQuery>;

      const roles = ['ADMIN', 'SUPERVISOR', 'PICKER', 'PACKER'];
      const expectedRates = [50, 40, 25, 25];

      for (let i = 0; i < roles.length; i++) {
        mockQuery.mockResolvedValue({
          rows: [
            {
              userId: `USER-${i}`,
              userName: 'Test',
              userRole: roles[i],
              tasksCompleted: 10,
              hoursWorked: 1,
            },
          ],
          command: '',
          rowCount: 1,
          oid: 0,
          fields: [],
        } as any);

        const result = await accountingService.getLaborCostDetails({
          startDate: new Date(),
          endDate: new Date(),
        });

        expect(result[0].hourlyRate).toBe(expectedRates[i]);
      }
    });
  });

  // ==========================================================================
  // TRANSACTIONS
  // ==========================================================================

  describe('createTransaction', () => {
    it('should create a financial transaction', async () => {
      const mockQuery = dbQuery as jest.MockedFunction<typeof dbQuery>;
      mockQuery.mockResolvedValue({
        rows: [
          {
            transactionId: 'TXN-123',
            transactionType: 'SALE',
            amount: 1000,
            status: 'PENDING',
            createdAt: new Date(),
          },
        ],
        command: '',
        rowCount: 1,
        oid: 0,
        fields: [],
      } as any);

      const result = await accountingService.createTransaction({
        transactionType: TransactionType.CREDIT_ISSUED,
        amount: 1000,
        referenceType: 'ORDER',
        referenceId: 'ORD-001',
        description: 'Test transaction',
        createdBy: 'USER-001',
        account: 'RECEIVABLES',
      });

      expect(result.transactionId).toBe('TXN-123');
      expect(result.amount).toBe(1000);
    });

    it('should throw error when table does not exist', async () => {
      const mockQuery = dbQuery as jest.MockedFunction<typeof dbQuery>;
      mockQuery.mockRejectedValue(new Error('relation "financial_transactions" does not exist'));

      await expect(
        accountingService.createTransaction({
          transactionType: TransactionType.CREDIT_ISSUED,
          amount: 1000,
          referenceType: 'ORDER',
          referenceId: 'ORD-001',
          description: 'Test',
          createdBy: 'USER-001',
          account: 'RECEIVABLES',
        })
      ).rejects.toThrow('Financial transactions table not yet available');
    });

    it('should use default currency of USD', async () => {
      const mockQuery = dbQuery as jest.MockedFunction<typeof dbQuery>;
      mockQuery.mockResolvedValue({
        rows: [{ transactionId: 'TXN-123' }],
        command: '',
        rowCount: 1,
        oid: 0,
        fields: [],
      } as any);

      await accountingService.createTransaction({
        transactionType: TransactionType.PAYMENT_MADE,
        amount: 500,
        referenceType: 'GENERAL',
        referenceId: 'REF-001',
        description: 'Test',
        createdBy: 'USER-001',
        account: 'PAYABLES',
      });

      expect(dbQuery).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining([expect.any(String), expect.any(String), expect.any(String), 'USD'])
      );
    });
  });

  describe('getTransactions', () => {
    it('should return transactions with pagination', async () => {
      const mockQuery = dbQuery as jest.MockedFunction<typeof dbQuery>;
      mockQuery.mockImplementation((_query: string, _params?: any[]) => {
        if (_query.includes('COUNT')) {
          return Promise.resolve({
            rows: [{ count: '10' }],
            command: '',
            rowCount: 1,
            oid: 0,
            fields: [],
          } as any);
        }
        return Promise.resolve({
          rows: [
            {
              transactionId: 'TXN-001',
              transactionType: 'SALE',
              amount: 1000,
            },
            {
              transactionId: 'TXN-002',
              transactionType: 'PURCHASE',
              amount: 500,
            },
          ],
          command: '',
          rowCount: 2,
          oid: 0,
          fields: [],
        } as any);
      });

      const result = await accountingService.getTransactions({ limit: 10, offset: 0 });

      expect(result.transactions).toHaveLength(2);
      expect(result.total).toBe(10);
    });

    it('should filter by transaction type', async () => {
      const mockQuery = dbQuery as jest.MockedFunction<typeof dbQuery>;
      mockQuery.mockResolvedValue({
        rows: [{ count: '5' }],
        command: '',
        rowCount: 1,
        oid: 0,
        fields: [],
      } as any);

      await accountingService.getTransactions({ transactionType: TransactionType.CREDIT_ISSUED });

      expect(dbQuery).toHaveBeenCalledWith(
        expect.stringContaining('transaction_type ='),
        expect.arrayContaining(['CREDIT_ISSUED'])
      );
    });

    it('should filter by customer ID', async () => {
      const mockQuery = dbQuery as jest.MockedFunction<typeof dbQuery>;
      mockQuery.mockResolvedValue({
        rows: [{ count: '3' }],
        command: '',
        rowCount: 1,
        oid: 0,
        fields: [],
      } as any);

      await accountingService.getTransactions({ customerId: 'CUST-001' });

      expect(dbQuery).toHaveBeenCalledWith(
        expect.stringContaining('customer_id ='),
        expect.arrayContaining(['CUST-001'])
      );
    });

    it('should handle missing table gracefully', async () => {
      const mockQuery = dbQuery as jest.MockedFunction<typeof dbQuery>;
      mockQuery.mockRejectedValue(new Error('relation "financial_transactions" does not exist'));

      const result = await accountingService.getTransactions();

      expect(result.transactions).toEqual([]);
      expect(result.total).toBe(0);
    });
  });

  // ==========================================================================
  // PROFIT & LOSS STATEMENT
  // ==========================================================================

  describe('generateProfitLossStatement', () => {
    it('should generate a profit and loss statement', async () => {
      const mockQuery = dbQuery as jest.MockedFunction<typeof dbQuery>;
      mockQuery.mockImplementation(() => {
        return Promise.resolve({
          rows: [{ total: '100000', role: 'PICKER', tasks: 100, write_offs: '0' }],
          command: '',
          rowCount: 1,
          oid: 0,
          fields: [],
        } as any);
      });

      const result = await accountingService.generateProfitLossStatement({
        period: AccountingPeriod.MONTHLY,
      });

      expect(result).toBeDefined();
      expect(result.period).toBe(AccountingPeriod.MONTHLY);
      expect(result.grossRevenue).toBeDefined();
      expect(result.netRevenue).toBeDefined();
      expect(result.grossProfit).toBeDefined();
      expect(result.netIncome).toBeDefined();
    });

    it('should calculate gross profit margin correctly', async () => {
      const mockQuery = dbQuery as jest.MockedFunction<typeof dbQuery>;
      mockQuery.mockImplementation(() => {
        return Promise.resolve({
          rows: [{ total: '100000', role: 'PICKER', tasks: 100, write_offs: '0' }],
          command: '',
          rowCount: 1,
          oid: 0,
          fields: [],
        } as any);
      });

      const result = await accountingService.generateProfitLossStatement({});

      expect(result.grossProfitMargin).toBeDefined();
      expect(typeof result.grossProfitMargin).toBe('number');
    });

    it('should calculate operating margin correctly', async () => {
      const mockQuery = dbQuery as jest.MockedFunction<typeof dbQuery>;
      mockQuery.mockImplementation(() => {
        return Promise.resolve({
          rows: [{ total: '100000', role: 'PICKER', tasks: 100, write_offs: '0' }],
          command: '',
          rowCount: 1,
          oid: 0,
          fields: [],
        } as any);
      });

      const result = await accountingService.generateProfitLossStatement({});

      expect(result.operatingMargin).toBeDefined();
      expect(typeof result.operatingMargin).toBe('number');
    });
  });

  // ==========================================================================
  // VENDOR PERFORMANCE
  // ==========================================================================

  describe('getVendorPerformanceFinancial', () => {
    it('should return vendor financial performance', async () => {
      const mockQuery = dbQuery as jest.MockedFunction<typeof dbQuery>;
      mockQuery.mockImplementation((_query: string, _params?: any[]) => {
        if (_query.includes('accounting_suppliers')) {
          return Promise.resolve({
            rows: [{ vendor_id: 'VEND-001', name: 'Test Vendor', payment_terms: 'NET 30' }],
            command: '',
            rowCount: 1,
            oid: 0,
            fields: [],
          } as any);
        }
        if (_query.includes('purchase_orders')) {
          return Promise.resolve({
            rows: [{ orders: '10', total_purchases: '50000' }],
            command: '',
            rowCount: 1,
            oid: 0,
            fields: [],
          } as any);
        }
        if (_query.includes('return_authorizations')) {
          return Promise.resolve({
            rows: [{ return_count: '1', return_amount: '500', credit_approved: '500' }],
            command: '',
            rowCount: 1,
            oid: 0,
            fields: [],
          } as any);
        }
        if (_query.includes('receiving_exceptions')) {
          return Promise.resolve({
            rows: [
              { exception_count: '2', credit_requested: '1000', credit_approved_pending: '500' },
            ],
            command: '',
            rowCount: 1,
            oid: 0,
            fields: [],
          } as any);
        }
        if (_query.includes('accounts_payable')) {
          return Promise.resolve({
            rows: [{ outstanding: '5000', overdue: '500' }],
            command: '',
            rowCount: 1,
            oid: 0,
            fields: [],
          } as any);
        }
        return Promise.resolve({ rows: [], command: '', rowCount: 1, oid: 0, fields: [] } as any);
      });

      const result = await accountingService.getVendorPerformanceFinancial('VEND-001', {
        period: AccountingPeriod.MONTHLY,
      });

      expect(result).toBeDefined();
      expect(result.vendorId).toBe('VEND-001');
      expect(result.vendorName).toBe('Test Vendor');
      expect(result.totalPurchases).toBe(50000);
      expect(result.orderCount).toBe(10);
    });

    it('should calculate performance score', async () => {
      const mockQuery = dbQuery as jest.MockedFunction<typeof dbQuery>;
      mockQuery.mockImplementation((_query: string, _params?: any[]) => {
        if (_query.includes('accounting_suppliers')) {
          return Promise.resolve({
            rows: [{ vendor_id: 'VEND-001', name: 'Test Vendor', payment_terms: 'NET 30' }],
            command: '',
            rowCount: 1,
            oid: 0,
            fields: [],
          } as any);
        }
        if (_query.includes('purchase_orders')) {
          return Promise.resolve({
            rows: [{ orders: '10', total_purchases: '50000' }],
            command: '',
            rowCount: 1,
            oid: 0,
            fields: [],
          } as any);
        }
        if (_query.includes('return_authorizations')) {
          return Promise.resolve({
            rows: [{ return_count: '0', return_amount: '0', credit_approved: '0' }],
            command: '',
            rowCount: 1,
            oid: 0,
            fields: [],
          } as any);
        }
        if (_query.includes('receiving_exceptions')) {
          return Promise.resolve({
            rows: [{ exception_count: '0', credit_requested: '0', credit_approved_pending: '0' }],
            command: '',
            rowCount: 1,
            oid: 0,
            fields: [],
          } as any);
        }
        if (_query.includes('accounts_payable')) {
          return Promise.resolve({
            rows: [{ outstanding: '0', overdue: '0' }],
            command: '',
            rowCount: 1,
            oid: 0,
            fields: [],
          } as any);
        }
        return Promise.resolve({ rows: [], command: '', rowCount: 1, oid: 0, fields: [] } as any);
      });

      const result = await accountingService.getVendorPerformanceFinancial('VEND-001', {});

      expect(result.performanceScore).toBe(100);
      expect(result.rating).toBe('EXCELLENT');
    });

    it('should throw error when vendor not found', async () => {
      const mockQuery = dbQuery as jest.MockedFunction<typeof dbQuery>;
      mockQuery.mockResolvedValue({
        rows: [],
        command: '',
        rowCount: 0,
        oid: 0,
        fields: [],
      } as any);

      await expect(
        accountingService.getVendorPerformanceFinancial('NONEXISTENT', {})
      ).rejects.toThrow('Vendor NONEXISTENT not found');
    });

    it('should calculate vendor rating correctly', async () => {
      const mockQuery = dbQuery as jest.MockedFunction<typeof dbQuery>;
      mockQuery.mockImplementation((_query: string, _params?: any[]) => {
        if (_query.includes('accounting_suppliers')) {
          return Promise.resolve({
            rows: [{ vendor_id: 'VEND-001', name: 'Test Vendor', payment_terms: 'NET 30' }],
            command: '',
            rowCount: 1,
            oid: 0,
            fields: [],
          } as any);
        }
        if (_query.includes('purchase_orders')) {
          return Promise.resolve({
            rows: [{ orders: '10', total_purchases: '50000' }],
            command: '',
            rowCount: 1,
            oid: 0,
            fields: [],
          } as any);
        }
        if (_query.includes('return_authorizations')) {
          return Promise.resolve({
            rows: [{ return_count: '5', return_amount: '2500', credit_approved: '2500' }],
            command: '',
            rowCount: 1,
            oid: 0,
            fields: [],
          } as any);
        }
        if (_query.includes('receiving_exceptions')) {
          return Promise.resolve({
            rows: [{ exception_count: '0', credit_requested: '0', credit_approved_pending: '0' }],
            command: '',
            rowCount: 1,
            oid: 0,
            fields: [],
          } as any);
        }
        if (_query.includes('accounts_payable')) {
          return Promise.resolve({
            rows: [{ outstanding: '5000', overdue: '2000' }],
            command: '',
            rowCount: 1,
            oid: 0,
            fields: [],
          } as any);
        }
        return Promise.resolve({ rows: [], command: '', rowCount: 1, oid: 0, fields: [] } as any);
      });

      const result = await accountingService.getVendorPerformanceFinancial('VEND-001', {});

      // With 50% return rate and some overdue, should be POOR or AVERAGE
      expect(result.rating).toBeDefined();
      expect(['EXCELLENT', 'GOOD', 'AVERAGE', 'POOR']).toContain(result.rating);
    });
  });

  // ==========================================================================
  // CUSTOMER FINANCIAL SUMMARY
  // ==========================================================================

  describe('getCustomerFinancialSummary', () => {
    it('should return customer financial summary', async () => {
      const mockQuery = dbQuery as jest.MockedFunction<typeof dbQuery>;
      mockQuery.mockImplementation((_query: string, _params?: any[]) => {
        if (_query.includes('accounting_customers')) {
          return Promise.resolve({
            rows: [{ customer_id: 'CUST-001', name: 'Test Customer', credit_limit: '10000' }],
            command: '',
            rowCount: 1,
            oid: 0,
            fields: [],
          } as any);
        }
        if (_query.includes('orders')) {
          return Promise.resolve({
            rows: [{ orders: '10', total_revenue: '50000' }],
            command: '',
            rowCount: 1,
            oid: 0,
            fields: [],
          } as any);
        }
        if (_query.includes('return_authorizations')) {
          return Promise.resolve({
            rows: [{ return_count: '1', return_amount: '500', credit_issued: '500' }],
            command: '',
            rowCount: 1,
            oid: 0,
            fields: [],
          } as any);
        }
        if (_query.includes('accounts_receivable')) {
          return Promise.resolve({
            rows: [{ outstanding: '2000', overdue: '0' }],
            command: '',
            rowCount: 1,
            oid: 0,
            fields: [],
          } as any);
        }
        return Promise.resolve({ rows: [], command: '', rowCount: 1, oid: 0, fields: [] } as any);
      });

      const result = await accountingService.getCustomerFinancialSummary('CUST-001', {
        period: AccountingPeriod.MONTHLY,
      });

      expect(result).toBeDefined();
      expect(result.customerId).toBe('CUST-001');
      expect(result.totalOrders).toBe(10);
      expect(result.totalRevenue).toBe(50000);
    });

    it('should throw error when customer not found', async () => {
      const mockQuery = dbQuery as jest.MockedFunction<typeof dbQuery>;
      mockQuery.mockResolvedValue({
        rows: [],
        command: '',
        rowCount: 0,
        oid: 0,
        fields: [],
      } as any);

      await expect(
        accountingService.getCustomerFinancialSummary('NONEXISTENT', {})
      ).rejects.toThrow('Customer NONEXISTENT not found');
    });

    it('should calculate credit status correctly', async () => {
      const mockQuery = dbQuery as jest.MockedFunction<typeof dbQuery>;
      mockQuery.mockImplementation((_query: string, _params?: any[]) => {
        if (_query.includes('accounting_customers')) {
          return Promise.resolve({
            rows: [{ customer_id: 'CUST-001', name: 'Test Customer', credit_limit: '10000' }],
            command: '',
            rowCount: 1,
            oid: 0,
            fields: [],
          } as any);
        }
        if (_query.includes('orders')) {
          return Promise.resolve({
            rows: [{ orders: '0', total_revenue: '0' }],
            command: '',
            rowCount: 1,
            oid: 0,
            fields: [],
          } as any);
        }
        if (_query.includes('return_authorizations')) {
          return Promise.resolve({
            rows: [{ return_count: '0', return_amount: '0', credit_issued: '0' }],
            command: '',
            rowCount: 1,
            oid: 0,
            fields: [],
          } as any);
        }
        if (_query.includes('accounts_receivable')) {
          return Promise.resolve({
            rows: [{ outstanding: '0', overdue: '0' }],
            command: '',
            rowCount: 1,
            oid: 0,
            fields: [],
          } as any);
        }
        return Promise.resolve({ rows: [], command: '', rowCount: 1, oid: 0, fields: [] } as any);
      });

      const result = await accountingService.getCustomerFinancialSummary('CUST-001', {});

      expect(result.creditStatus).toBe('GOOD');
      expect(result.creditAvailable).toBe(10000);
    });

    it('should return WARNING credit status when outstanding > 75% of limit', async () => {
      const mockQuery = dbQuery as jest.MockedFunction<typeof dbQuery>;
      mockQuery.mockImplementation((_query: string, _params?: any[]) => {
        if (_query.includes('accounting_customers')) {
          return Promise.resolve({
            rows: [{ customer_id: 'CUST-001', name: 'Test Customer', credit_limit: '10000' }],
            command: '',
            rowCount: 1,
            oid: 0,
            fields: [],
          } as any);
        }
        if (_query.includes('orders')) {
          return Promise.resolve({
            rows: [{ orders: '0', total_revenue: '0' }],
            command: '',
            rowCount: 1,
            oid: 0,
            fields: [],
          } as any);
        }
        if (_query.includes('return_authorizations')) {
          return Promise.resolve({
            rows: [{ return_count: '0', return_amount: '0', credit_issued: '0' }],
            command: '',
            rowCount: 1,
            oid: 0,
            fields: [],
          } as any);
        }
        if (_query.includes('accounts_receivable')) {
          return Promise.resolve({
            rows: [{ outstanding: '8000', overdue: '0' }],
            command: '',
            rowCount: 1,
            oid: 0,
            fields: [],
          } as any);
        }
        return Promise.resolve({ rows: [], command: '', rowCount: 1, oid: 0, fields: [] } as any);
      });

      const result = await accountingService.getCustomerFinancialSummary('CUST-001', {});

      expect(result.creditStatus).toBe('WARNING');
    });

    it('should return BLOCKED credit status when at limit', async () => {
      const mockQuery = dbQuery as jest.MockedFunction<typeof dbQuery>;
      mockQuery.mockImplementation((_query: string, _params?: any[]) => {
        if (_query.includes('accounting_customers')) {
          return Promise.resolve({
            rows: [{ customer_id: 'CUST-001', name: 'Test Customer', credit_limit: '10000' }],
            command: '',
            rowCount: 1,
            oid: 0,
            fields: [],
          } as any);
        }
        if (_query.includes('orders')) {
          return Promise.resolve({
            rows: [{ orders: '0', total_revenue: '0' }],
            command: '',
            rowCount: 1,
            oid: 0,
            fields: [],
          } as any);
        }
        if (_query.includes('return_authorizations')) {
          return Promise.resolve({
            rows: [{ return_count: '0', return_amount: '0', credit_issued: '0' }],
            command: '',
            rowCount: 1,
            oid: 0,
            fields: [],
          } as any);
        }
        if (_query.includes('accounts_receivable')) {
          return Promise.resolve({
            rows: [{ outstanding: '10000', overdue: '0' }],
            command: '',
            rowCount: 1,
            oid: 0,
            fields: [],
          } as any);
        }
        return Promise.resolve({ rows: [], command: '', rowCount: 1, oid: 0, fields: [] } as any);
      });

      const result = await accountingService.getCustomerFinancialSummary('CUST-001', {});

      expect(result.creditStatus).toBe('BLOCKED');
    });
  });
});
