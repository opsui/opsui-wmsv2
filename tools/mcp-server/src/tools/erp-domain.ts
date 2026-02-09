/**
 * ERP Domain-Specific Tools
 * Tools specific to Enterprise Resource Planning operations
 *
 * Modules covered:
 * - Accounting & Financials
 * - HR & Payroll
 * - Sales & CRM
 * - Purchasing & Procurement
 * - Manufacturing & MRP
 * - Project Management
 * - Inventory & Warehouse
 * - E-commerce Integration
 */

import type { ToolMetadata, ToolContext, ToolArgs } from '../types/index.js';

export const erpDomainTools: ToolMetadata[] = [
  // ============================================================
  // ACCOUNTING & FINANCIALS
  // ============================================================
  {
    name: 'erp_validate_gl_entry',
    description: 'Validate a General Ledger entry for double-entry accounting compliance',
    inputSchema: {
      type: 'object',
      properties: {
        entries: {
          type: 'array',
          description: 'Array of journal entry line items',
          items: {
            type: 'object',
            properties: {
              accountId: { type: 'string' },
              debit: { type: 'number' },
              credit: { type: 'number' },
            },
          },
        },
        fiscalYear: {
          type: 'number',
          description: 'Fiscal year for the entry',
        },
        fiscalPeriod: {
          type: 'number',
          description: 'Fiscal period (1-12)',
          minimum: 1,
          maximum: 12,
        },
      },
      required: ['entries', 'fiscalYear', 'fiscalPeriod'],
    },
    handler: async (args: ToolArgs) => {
      const { entries, fiscalYear, fiscalPeriod } = args as {
        entries: Array<{ accountId: string; debit: number; credit: number }>;
        fiscalYear: number;
        fiscalPeriod: number;
      };

      const totalDebits = entries.reduce((sum, e) => sum + (e.debit || 0), 0);
      const totalCredits = entries.reduce((sum, e) => sum + (e.credit || 0), 0);
      const isBalanced = Math.abs(totalDebits - totalCredits) < 0.01;

      return {
        isValid: isBalanced,
        totalDebits,
        totalCredits,
        difference: Math.abs(totalDebits - totalCredits),
        fiscalYear,
        fiscalPeriod,
        entries: entries.length,
        recommendations: isBalanced
          ? ['Entry is balanced and ready for posting']
          : [
              'Debits and credits must balance',
              `Current difference: ${Math.abs(totalDebits - totalCredits).toFixed(2)}`,
            ],
      };
    },
    options: { cacheable: true, cacheTTL: 5000 },
  },

  {
    name: 'erp_calculate_tax',
    description: 'Calculate sales tax, VAT, or GST based on jurisdiction and tax rules',
    inputSchema: {
      type: 'object',
      properties: {
        amount: { type: 'number', description: 'Pre-tax amount' },
        taxCode: {
          type: 'string',
          description: 'Tax code/rate (e.g., US-CA-SALES, EU-VAT-DE, CAN-ON-HST)',
        },
        isTaxInclusive: {
          type: 'boolean',
          description: 'Whether amount includes tax',
        },
      },
      required: ['amount', 'taxCode'],
    },
    handler: async (args: ToolArgs) => {
      const {
        amount,
        taxCode,
        isTaxInclusive = false,
      } = args as {
        amount: number;
        taxCode: string;
        isTaxInclusive?: boolean;
      };

      // Simplified tax rate lookup
      const taxRates: Record<string, number> = {
        'US-CA-SALES': 0.0725,
        'US-NY-SALES': 0.08875,
        'EU-VAT-DE': 0.19,
        'EU-VAT-FR': 0.2,
        'CAN-ON-HST': 0.13,
        'UK-VAT': 0.2,
        'AU-GST': 0.1,
      };

      const rate = taxRates[taxCode] || 0;
      const taxAmount = isTaxInclusive ? amount - amount / (1 + rate) : amount * rate;
      const netAmount = isTaxInclusive ? amount / (1 + rate) : amount;
      const grossAmount = isTaxInclusive ? amount : amount + taxAmount;

      return {
        taxCode,
        taxRate: rate,
        netAmount: Number(netAmount.toFixed(2)),
        taxAmount: Number(taxAmount.toFixed(2)),
        grossAmount: Number(grossAmount.toFixed(2)),
        isTaxInclusive,
      };
    },
    options: { cacheable: true, cacheTTL: 10000 },
  },

  {
    name: 'erp_generate_financial_statement',
    description: 'Generate Balance Sheet, Income Statement, or Cash Flow statement structure',
    inputSchema: {
      type: 'object',
      properties: {
        statementType: {
          type: 'string',
          enum: ['balance-sheet', 'income-statement', 'cash-flow'],
          description: 'Type of financial statement',
        },
        asOfDate: {
          type: 'string',
          description: 'As-of date (ISO format)',
        },
        comparative: {
          type: 'boolean',
          description: 'Include prior period comparison',
        },
      },
      required: ['statementType', 'asOfDate'],
    },
    handler: async (args: ToolArgs) => {
      const {
        statementType,
        asOfDate,
        comparative = false,
      } = args as {
        statementType: 'balance-sheet' | 'income-statement' | 'cash-flow';
        asOfDate: string;
        comparative?: boolean;
      };

      const structures: Record<string, { sections: Array<{ name: string; accounts: string[] }> }> =
        {
          'balance-sheet': {
            sections: [
              {
                name: 'Assets',
                accounts: [
                  'Current Assets: Cash, Accounts Receivable, Inventory, Prepaid Expenses',
                  'Fixed Assets: Property, Plant, Equipment, Accumulated Depreciation',
                  'Other Assets: Intangible Assets, Investments',
                ],
              },
              {
                name: 'Liabilities',
                accounts: [
                  'Current Liabilities: Accounts Payable, Accrued Expenses, Short-term Debt',
                  'Long-term Liabilities: Bonds Payable, Long-term Loans, Deferred Revenue',
                ],
              },
              {
                name: 'Equity',
                accounts: [
                  "Shareholder's Equity: Common Stock, Retained Earnings, Additional Paid-in Capital",
                ],
              },
            ],
          },
          'income-statement': {
            sections: [
              {
                name: 'Revenue',
                accounts: ['Sales Revenue, Service Revenue, Other Income'],
              },
              {
                name: 'Cost of Goods Sold',
                accounts: ['Material Costs, Direct Labor, Manufacturing Overhead'],
              },
              {
                name: 'Operating Expenses',
                accounts: [
                  'Selling Expenses: Sales Commissions, Marketing, Shipping',
                  'Administrative: Salaries, Rent, Utilities, Depreciation',
                ],
              },
              {
                name: 'Other Income/Expenses',
                accounts: ['Interest Income, Interest Expense, Gains/Losses'],
              },
              {
                name: 'Taxes',
                accounts: ['Income Tax Expense'],
              },
            ],
          },
          'cash-flow': {
            sections: [
              {
                name: 'Operating Activities',
                accounts: [
                  'Net Income, Depreciation, Changes in Working Capital',
                  'Accounts Receivable, Inventory, Accounts Payable, Accrued Expenses',
                ],
              },
              {
                name: 'Investing Activities',
                accounts: ['Capital Expenditures, Asset Sales/Purchases, Investments'],
              },
              {
                name: 'Financing Activities',
                accounts: ['Debt Issuance/Repayment, Equity Transactions, Dividends Paid'],
              },
            ],
          },
        };

      return {
        statementType,
        asOfDate,
        comparative,
        structure: structures[statementType],
        note: 'Template structure - requires database integration for actual values',
      };
    },
    options: { cacheable: true, cacheTTL: 30000 },
  },

  // ============================================================
  // HR & PAYROLL
  // ============================================================
  {
    name: 'erp_calculate_payroll',
    description: 'Calculate net pay from gross pay with deductions and taxes',
    inputSchema: {
      type: 'object',
      properties: {
        grossPay: { type: 'number', description: 'Gross pay amount' },
        payFrequency: {
          type: 'string',
          enum: ['hourly', 'weekly', 'bi-weekly', 'semi-monthly', 'monthly', 'annual'],
          description: 'Pay frequency',
        },
        federalAllowances: {
          type: 'number',
          description: 'Federal tax allowances (W-4)',
        },
        state: {
          type: 'string',
          description: 'State code for state tax (e.g., CA, NY, TX)',
        },
        benefitsDeductions: {
          type: 'number',
          description: 'Pre-tax benefits deductions',
        },
        retirement401k: {
          type: 'number',
          description: '401(k) contribution percentage',
        },
      },
      required: ['grossPay', 'payFrequency', 'federalAllowances'],
    },
    handler: async (args: ToolArgs) => {
      const {
        grossPay,
        payFrequency,
        federalAllowances,
        state = 'CA',
        benefitsDeductions = 0,
        retirement401k = 0,
      } = args as {
        grossPay: number;
        payFrequency: string;
        federalAllowances: number;
        state?: string;
        benefitsDeductions?: number;
        retirement401k?: number;
      };

      // Simplified tax calculations (for illustration)
      const socialSecurityRate = 0.062;
      const medicareRate = 0.0145;
      const federalTaxRate = 0.22; // Simplified

      let taxableGross = grossPay - benefitsDeductions;

      const retirementDeduction = taxableGross * (retirement401k / 100);
      taxableGross -= retirementDeduction;

      const socialSecurity = taxableGross * socialSecurityRate;
      const medicare = taxableGross * medicareRate;
      const federalTax = (taxableGross - federalAllowances * 100) * federalTaxRate;
      const stateTax =
        state === 'TX' || state === 'FL' || state === 'NV' || state === 'WA'
          ? 0
          : taxableGross * 0.05; // Simplified

      const totalDeductions =
        benefitsDeductions +
        retirementDeduction +
        socialSecurity +
        medicare +
        federalTax +
        stateTax;
      const netPay = grossPay - totalDeductions;

      return {
        grossPay: Number(grossPay.toFixed(2)),
        deductions: {
          benefits: Number(benefitsDeductions.toFixed(2)),
          retirement401k: Number(retirementDeduction.toFixed(2)),
          socialSecurity: Number(socialSecurity.toFixed(2)),
          medicare: Number(medicare.toFixed(2)),
          federalTax: Number(Math.max(0, federalTax).toFixed(2)),
          stateTax: Number(stateTax.toFixed(2)),
        },
        totalDeductions: Number(totalDeductions.toFixed(2)),
        netPay: Number(netPay.toFixed(2)),
        payFrequency,
        effectiveTaxRate: Number(((totalDeductions / grossPay) * 100).toFixed(2)),
      };
    },
    options: { cacheable: true, cacheTTL: 5000 },
  },

  {
    name: 'erp_calculate_pto_balance',
    description: 'Calculate PTO (Paid Time Off) balance based on accrual policy',
    inputSchema: {
      type: 'object',
      properties: {
        hireDate: {
          type: 'string',
          description: 'Hire date (ISO format)',
        },
        accrualRate: {
          type: 'number',
          description: 'Hours accrued per pay period',
        },
        payPeriodsPerYear: {
          type: 'number',
          description: 'Number of pay periods per year (26 for bi-weekly, 24 for semi-monthly)',
        },
        hoursUsed: {
          type: 'number',
          description: 'PTO hours used to date',
        },
        maxAccrual: {
          type: 'number',
          description: 'Maximum accrual cap (hours)',
        },
      },
      required: ['hireDate', 'accrualRate', 'payPeriodsPerYear'],
    },
    handler: async (args: ToolArgs) => {
      const {
        hireDate,
        accrualRate,
        payPeriodsPerYear,
        hoursUsed = 0,
        maxAccrual = 200,
      } = args as {
        hireDate: string;
        accrualRate: number;
        payPeriodsPerYear: number;
        hoursUsed?: number;
        maxAccrual?: number;
      };

      const hire = new Date(hireDate);
      const now = new Date();
      const yearsEmployed = (now.getTime() - hire.getTime()) / (365.25 * 24 * 60 * 60 * 1000);

      const totalPayPeriods = Math.floor(yearsEmployed * payPeriodsPerYear);
      const accruedHours = totalPayPeriods * accrualRate;
      const cappedAccrual = Math.min(accruedHours, maxAccrual);
      const availableBalance = Math.max(0, cappedAccrual - hoursUsed);

      return {
        hireDate,
        currentDate: now.toISOString(),
        yearsEmployed: Number(yearsEmployed.toFixed(2)),
        totalPayPeriods,
        accruedHours: Number(accruedHours.toFixed(2)),
        cappedAccrual: Number(cappedAccrual.toFixed(2)),
        hoursUsed: Number(hoursUsed.toFixed(2)),
        availableBalance: Number(availableBalance.toFixed(2)),
        maxAccrual,
        projectedAnnualAccrual: Number((accrualRate * payPeriodsPerYear).toFixed(2)),
      };
    },
    options: { cacheable: true, cacheTTL: 30000 },
  },

  // ============================================================
  // SALES & CRM
  // ============================================================
  {
    name: 'erp_calculate_sales_commission',
    description: 'Calculate sales commission based on tiered structure',
    inputSchema: {
      type: 'object',
      properties: {
        salesAmount: { type: 'number', description: 'Total sales amount' },
        commissionStructure: {
          type: 'string',
          enum: ['flat', 'tiered', 'accelerated'],
          description: 'Commission structure type',
        },
        baseRate: { type: 'number', description: 'Base commission rate (decimal)' },
        quotaAmount: {
          type: 'number',
          description: 'Sales quota/target amount',
        },
      },
      required: ['salesAmount', 'commissionStructure', 'baseRate'],
    },
    handler: async (args: ToolArgs) => {
      const {
        salesAmount,
        commissionStructure,
        baseRate,
        quotaAmount = 0,
      } = args as {
        salesAmount: number;
        commissionStructure: 'flat' | 'tiered' | 'accelerated';
        baseRate: number;
        quotaAmount?: number;
      };

      let commission = 0;
      let effectiveRate = baseRate;
      const tiers: Array<{ threshold: number; rate: number; amount: number }> = [];

      if (commissionStructure === 'flat') {
        commission = salesAmount * baseRate;
        effectiveRate = baseRate;
      } else if (commissionStructure === 'tiered') {
        // Example tiered: 5% up to 50k, 7% 50-100k, 10% over 100k
        const remaining = salesAmount;
        if (remaining > 100000) {
          const tierAmount = remaining - 100000;
          commission += tierAmount * 0.1;
          tiers.push({ threshold: 100000, rate: 0.1, amount: tierAmount * 0.1 });
        }
        if (remaining > 50000) {
          const tierAmount = Math.min(remaining - 50000, 50000);
          commission += tierAmount * 0.07;
          tiers.push({ threshold: 50000, rate: 0.07, amount: tierAmount * 0.07 });
        }
        const tierAmount = Math.min(remaining, 50000);
        commission += tierAmount * 0.05;
        tiers.push({ threshold: 0, rate: 0.05, amount: tierAmount * 0.05 });
        effectiveRate = commission / salesAmount;
      } else if (commissionStructure === 'accelerated') {
        const quotaAttainment = quotaAmount > 0 ? salesAmount / quotaAmount : 1;
        if (quotaAttainment >= 1.5) {
          effectiveRate = baseRate * 1.5; // 150% accelerator
        } else if (quotaAttainment >= 1.2) {
          effectiveRate = baseRate * 1.25; // 125% accelerator
        } else if (quotaAttainment >= 1.0) {
          effectiveRate = baseRate * 1.1; // 110% accelerator
        }
        commission = salesAmount * effectiveRate;
      }

      const quotaAttainment =
        quotaAmount > 0 ? ((salesAmount / quotaAmount) * 100).toFixed(1) + '%' : 'N/A';

      return {
        salesAmount: Number(salesAmount.toFixed(2)),
        quotaAmount,
        quotaAttainment,
        commissionStructure,
        baseRate,
        effectiveRate: Number(effectiveRate.toFixed(4)),
        commission: Number(commission.toFixed(2)),
        tiers: tiers.length > 0 ? tiers : undefined,
      };
    },
    options: { cacheable: true, cacheTTL: 5000 },
  },

  {
    name: 'erp_score_sales_lead',
    description: 'Score a sales lead based on BANT criteria and other factors',
    inputSchema: {
      type: 'object',
      properties: {
        hasBudget: { type: 'boolean', description: 'Has confirmed budget' },
        hasAuthority: { type: 'boolean', description: 'Contact has decision authority' },
        hasNeed: { type: 'boolean', description: 'Clear need identified' },
        hasTimeline: { type: 'boolean', description: 'Defined timeline for purchase' },
        companySize: {
          type: 'string',
          enum: ['smb', 'mid-market', 'enterprise'],
          description: 'Company size',
        },
        previousPurchases: { type: 'number', description: 'Previous purchase count' },
        engagementScore: {
          type: 'number',
          description: 'Marketing engagement score (0-100)',
          minimum: 0,
          maximum: 100,
        },
      },
      required: ['hasBudget', 'hasAuthority', 'hasNeed', 'hasTimeline'],
    },
    handler: async (args: ToolArgs) => {
      const {
        hasBudget,
        hasAuthority,
        hasNeed,
        hasTimeline,
        companySize = 'smb',
        previousPurchases = 0,
        engagementScore = 50,
      } = args as {
        hasBudget: boolean;
        hasAuthority: boolean;
        hasNeed: boolean;
        hasTimeline: boolean;
        companySize?: 'smb' | 'mid-market' | 'enterprise';
        previousPurchases?: number;
        engagementScore?: number;
      };

      let score = 0;
      const maxScore = 100;

      // BANT criteria (60 points total)
      if (hasBudget) score += 15;
      if (hasAuthority) score += 15;
      if (hasNeed) score += 15;
      if (hasTimeline) score += 15;

      // Company size (20 points)
      const sizeScores = { smb: 5, 'mid-market': 10, enterprise: 20 };
      score += sizeScores[companySize];

      // Previous relationship (10 points)
      score += Math.min(previousPurchases * 2, 10);

      // Engagement (10 points)
      score += (engagementScore / 100) * 10;

      const bantComplete = hasBudget && hasAuthority && hasNeed && hasTimeline;
      let rating = 'Cold';
      if (score >= 80) rating = 'Hot - Close Immediately';
      else if (score >= 60) rating = 'Warm - Active Prospecting';
      else if (score >= 40) rating = 'Cool - Nurture';

      return {
        score: Math.min(Math.round(score), maxScore),
        maxScore,
        rating,
        bantComplete,
        bantDetails: { hasBudget, hasAuthority, hasNeed, hasTimeline },
        companySize,
        previousPurchases,
        engagementScore,
        nextSteps: bantComplete
          ? ['Schedule demo', 'Prepare proposal', 'Set follow-up timeline']
          : ['Complete BANT qualification', 'Identify decision makers', 'Establish timeline'],
      };
    },
    options: { cacheable: true, cacheTTL: 10000 },
  },

  // ============================================================
  // PURCHASING & PROCUREMENT
  // ============================================================
  {
    name: 'erp_calculate_eoq',
    description: 'Calculate Economic Order Quantity (EOQ) for inventory optimization',
    inputSchema: {
      type: 'object',
      properties: {
        annualDemand: {
          type: 'number',
          description: 'Annual demand in units',
          minimum: 1,
        },
        orderCost: {
          type: 'number',
          description: 'Cost per order (setup cost)',
        },
        holdingCostPerUnit: {
          type: 'number',
          description: 'Annual holding cost per unit',
        },
      },
      required: ['annualDemand', 'orderCost', 'holdingCostPerUnit'],
    },
    handler: async (args: ToolArgs) => {
      const { annualDemand, orderCost, holdingCostPerUnit } = args as {
        annualDemand: number;
        orderCost: number;
        holdingCostPerUnit: number;
      };

      // EOQ formula: sqrt(2 * D * S / H)
      const eoq = Math.sqrt((2 * annualDemand * orderCost) / holdingCostPerUnit);
      const ordersPerYear = annualDemand / eoq;
      const daysBetweenOrders = 365 / ordersPerYear;
      const totalOrderingCost = ordersPerYear * orderCost;
      const totalHoldingCost = (eoq / 2) * holdingCostPerUnit;
      const totalCost = totalOrderingCost + totalHoldingCost;

      return {
        annualDemand,
        orderCost,
        holdingCostPerUnit,
        eoq: Math.round(eoq),
        ordersPerYear: Number(ordersPerYear.toFixed(1)),
        daysBetweenOrders: Math.round(daysBetweenOrders),
        totalOrderingCost: Number(totalOrderingCost.toFixed(2)),
        totalHoldingCost: Number(totalHoldingCost.toFixed(2)),
        totalAnnualCost: Number(totalCost.toFixed(2)),
      };
    },
    options: { cacheable: true, cacheTTL: 30000 },
  },

  {
    name: 'erp_evaluate_supplier',
    description: 'Evaluate supplier performance based on multiple criteria',
    inputSchema: {
      type: 'object',
      properties: {
        onTimeDeliveryRate: {
          type: 'number',
          description: 'On-time delivery percentage (0-100)',
          minimum: 0,
          maximum: 100,
        },
        qualityRate: {
          type: 'number',
          description: 'Quality acceptance rate (0-100)',
          minimum: 0,
          maximum: 100,
        },
        priceCompetitiveness: {
          type: 'number',
          description: 'Price score relative to market (0-100)',
          minimum: 0,
          maximum: 100,
        },
        responsivenessRating: {
          type: 'number',
          description: 'Communication responsiveness (1-5)',
          minimum: 1,
          maximum: 5,
        },
      },
      required: ['onTimeDeliveryRate', 'qualityRate', 'priceCompetitiveness'],
    },
    handler: async (args: ToolArgs) => {
      const {
        onTimeDeliveryRate,
        qualityRate,
        priceCompetitiveness,
        responsivenessRating = 3,
      } = args as {
        onTimeDeliveryRate: number;
        qualityRate: number;
        priceCompetitiveness: number;
        responsivenessRating?: number;
      };

      // Weighted score (delivery: 40%, quality: 30%, price: 20%, responsiveness: 10%)
      const deliveryScore = onTimeDeliveryRate * 0.4;
      const qualityScore = qualityRate * 0.3;
      const priceScore = priceCompetitiveness * 0.2;
      const responseScore = (responsivenessRating / 5) * 100 * 0.1;

      const totalScore = deliveryScore + qualityScore + priceScore + responseScore;

      let tier = 'C - Under Review';
      if (totalScore >= 90) tier = 'A+ - Strategic Partner';
      else if (totalScore >= 80) tier = 'A - Preferred';
      else if (totalScore >= 70) tier = 'B - Approved';
      else if (totalScore >= 60) tier = 'C - Conditional';

      return {
        totalScore: Number(totalScore.toFixed(1)),
        tier,
        breakdown: {
          delivery: { score: deliveryScore, weight: '40%', value: onTimeDeliveryRate },
          quality: { score: qualityScore, weight: '30%', value: qualityRate },
          price: { score: priceScore, weight: '20%', value: priceCompetitiveness },
          responsiveness: { score: responseScore, weight: '10%', value: responsivenessRating },
        },
        recommendations:
          totalScore < 70
            ? ['Schedule supplier review', 'Consider diversification', 'Set improvement milestones']
            : ['Maintain relationship', 'Explore volume discounts', 'Consider long-term contract'],
      };
    },
    options: { cacheable: true, cacheTTL: 30000 },
  },

  // ============================================================
  // MANUFACTURING & MRP
  // ============================================================
  {
    name: 'erp_calculate_mrp',
    description: 'Calculate Material Requirements Planning (MRP) for production',
    inputSchema: {
      type: 'object',
      properties: {
        demandQuantity: {
          type: 'number',
          description: 'Gross requirements (demand quantity)',
          minimum: 1,
        },
        inventoryOnHand: {
          type: 'number',
          description: 'Current inventory on hand',
        },
        safetyStock: {
          type: 'number',
          description: 'Safety stock level',
        },
        leadTimeDays: {
          type: 'number',
          description: 'Supplier lead time in days',
        },
        orderQuantity: {
          type: 'number',
          description: 'Standard order quantity (MOQ)',
        },
      },
      required: ['demandQuantity', 'inventoryOnHand', 'leadTimeDays'],
    },
    handler: async (args: ToolArgs) => {
      const {
        demandQuantity,
        inventoryOnHand,
        safetyStock = 0,
        leadTimeDays,
        orderQuantity = 1,
      } = args as {
        demandQuantity: number;
        inventoryOnHand: number;
        safetyStock?: number;
        leadTimeDays: number;
        orderQuantity?: number;
      };

      const netRequirements = Math.max(0, demandQuantity + safetyStock - inventoryOnHand);
      const plannedOrderReceipt =
        netRequirements > 0 ? Math.ceil(netRequirements / orderQuantity) * orderQuantity : 0;
      const plannedOrderRelease = plannedOrderReceipt;
      const orderDate = new Date();
      orderDate.setDate(orderDate.getDate() - leadTimeDays);
      const receiptDate = new Date();
      receiptDate.setDate(receiptDate.getDate() + leadTimeDays);

      return {
        grossRequirements: demandQuantity,
        inventoryOnHand,
        safetyStock,
        projectedAvailable: inventoryOnHand - demandQuantity,
        netRequirements: Number(netRequirements.toFixed(2)),
        plannedOrderReceipt,
        plannedOrderRelease,
        orderDate: orderDate.toISOString().split('T')[0],
        receiptDate: receiptDate.toISOString().split('T')[0],
        leadTimeDays,
        action:
          netRequirements > 0
            ? `Release PO for ${plannedOrderRelease} units by ${orderDate.toISOString().split('T')[0]}`
            : 'No order needed - sufficient inventory',
      };
    },
    options: { cacheable: true, cacheTTL: 5000 },
  },

  {
    name: 'erp_calculate_labor_cost',
    description: 'Calculate labor cost for manufacturing operations',
    inputSchema: {
      type: 'object',
      properties: {
        standardTime: {
          type: 'number',
          description: 'Standard time per unit (minutes)',
        },
        hourlyRate: {
          type: 'number',
          description: 'Hourly labor rate',
        },
        quantity: {
          type: 'number',
          description: 'Quantity to produce',
          minimum: 1,
        },
        overheadRate: {
          type: 'number',
          description: 'Labor overhead rate (decimal, e.g., 0.20 for 20%)',
        },
        efficiency: {
          type: 'number',
          description: 'Efficiency factor (1.0 = 100%, 1.2 = 120% time)',
          minimum: 0.5,
          maximum: 2,
        },
      },
      required: ['standardTime', 'hourlyRate', 'quantity'],
    },
    handler: async (args: ToolArgs) => {
      const {
        standardTime,
        hourlyRate,
        quantity,
        overheadRate = 0.2,
        efficiency = 1.0,
      } = args as {
        standardTime: number;
        hourlyRate: number;
        quantity: number;
        overheadRate?: number;
        efficiency?: number;
      };

      const actualTime = standardTime * efficiency;
      const laborHours = (actualTime * quantity) / 60;
      const directLaborCost = laborHours * hourlyRate;
      const laborOverhead = directLaborCost * overheadRate;
      const totalLaborCost = directLaborCost + laborOverhead;
      const costPerUnit = totalLaborCost / quantity;

      return {
        standardTime,
        efficiency,
        actualTime: Number(actualTime.toFixed(2)),
        laborHours: Number(laborHours.toFixed(2)),
        directLaborCost: Number(directLaborCost.toFixed(2)),
        overheadRate,
        laborOverhead: Number(laborOverhead.toFixed(2)),
        totalLaborCost: Number(totalLaborCost.toFixed(2)),
        quantity,
        costPerUnit: Number(costPerUnit.toFixed(2)),
      };
    },
    options: { cacheable: true, cacheTTL: 5000 },
  },

  // ============================================================
  // PROJECT MANAGEMENT
  // ============================================================
  {
    name: 'erp_calculate_earned_value',
    description: 'Calculate Earned Value Management (EVM) metrics for projects',
    inputSchema: {
      type: 'object',
      properties: {
        plannedValue: {
          type: 'number',
          description: 'Budgeted Cost of Work Scheduled (BCWS or PV)',
        },
        earnedValue: {
          type: 'number',
          description: 'Budgeted Cost of Work Performed (BCWP or EV)',
        },
        actualCost: {
          type: 'number',
          description: 'Actual Cost of Work Performed (ACWP or AC)',
        },
        budgetAtCompletion: {
          type: 'number',
          description: 'Total project budget (BAC)',
        },
      },
      required: ['plannedValue', 'earnedValue', 'actualCost', 'budgetAtCompletion'],
    },
    handler: async (args: ToolArgs) => {
      const { plannedValue, earnedValue, actualCost, budgetAtCompletion } = args as {
        plannedValue: number;
        earnedValue: number;
        actualCost: number;
        budgetAtCompletion: number;
      };

      const scheduleVariance = earnedValue - plannedValue;
      const costVariance = earnedValue - actualCost;
      const schedulePerformanceIndex = plannedValue > 0 ? earnedValue / plannedValue : 0;
      const costPerformanceIndex = actualCost > 0 ? earnedValue / actualCost : 0;

      const estimateAtCompletion =
        actualCost + (budgetAtCompletion - earnedValue) / costPerformanceIndex;
      const estimateToComplete = estimateAtCompletion - actualCost;
      const varianceAtCompletion = budgetAtCompletion - estimateAtCompletion;

      const scheduleStatus = scheduleVariance >= 0 ? 'On Schedule' : 'Behind Schedule';
      const costStatus = costVariance >= 0 ? 'Under Budget' : 'Over Budget';

      return {
        pv: Number(plannedValue.toFixed(2)),
        ev: Number(earnedValue.toFixed(2)),
        ac: Number(actualCost.toFixed(2)),
        bac: Number(budgetAtCompletion.toFixed(2)),
        variances: {
          scheduleVariance: Number(scheduleVariance.toFixed(2)),
          costVariance: Number(costVariance.toFixed(2)),
          scheduleStatus,
          costStatus,
        },
        indices: {
          spi: Number(schedulePerformanceIndex.toFixed(3)),
          cpi: Number(costPerformanceIndex.toFixed(3)),
        },
        forecasts: {
          eac: Number(estimateAtCompletion.toFixed(2)),
          etc: Number(estimateToComplete.toFixed(2)),
          vac: Number(varianceAtCompletion.toFixed(2)),
        },
        interpretation:
          costPerformanceIndex < 1
            ? 'Project over budget - corrective action recommended'
            : 'Project on or under budget - continue monitoring',
      };
    },
    options: { cacheable: true, cacheTTL: 10000 },
  },

  {
    name: 'erp_track_project_resources',
    description: 'Track project resource utilization and allocation',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'Project identifier' },
        totalBudget: { type: 'number', description: 'Total project budget' },
        spentToDate: { type: 'number', description: 'Amount spent to date' },
        estimatedRemaining: {
          type: 'number',
          description: 'Estimated cost to complete',
        },
        totalHoursPlanned: {
          type: 'number',
          description: 'Total planned labor hours',
        },
        hoursUsed: {
          type: 'number',
          description: 'Hours used to date',
        },
      },
      required: ['projectId', 'totalBudget', 'spentToDate'],
    },
    handler: async (args: ToolArgs) => {
      const {
        projectId,
        totalBudget,
        spentToDate,
        estimatedRemaining,
        totalHoursPlanned,
        hoursUsed,
      } = args as {
        projectId: string;
        totalBudget: number;
        spentToDate: number;
        estimatedRemaining?: number;
        totalHoursPlanned?: number;
        hoursUsed?: number;
      };

      const budgetConsumed = (spentToDate / totalBudget) * 100;
      const projectedTotal = estimatedRemaining ? spentToDate + estimatedRemaining : totalBudget;
      const varianceAtCompletion = totalBudget - projectedTotal;
      const budgetStatus =
        budgetConsumed > 90 ? 'Critical' : budgetConsumed > 75 ? 'Warning' : 'On Track';

      let laborUtilization = undefined;
      if (totalHoursPlanned && hoursUsed !== undefined) {
        laborUtilization = {
          planned: totalHoursPlanned,
          used: hoursUsed,
          remaining: totalHoursPlanned - hoursUsed,
          utilizationRate: Number(((hoursUsed / totalHoursPlanned) * 100).toFixed(1)),
        };
      }

      return {
        projectId,
        budget: {
          total: Number(totalBudget.toFixed(2)),
          spent: Number(spentToDate.toFixed(2)),
          consumed: Number(budgetConsumed.toFixed(1)) + '%',
          status: budgetStatus,
        },
        forecast: estimatedRemaining
          ? {
              projectedTotal: Number(projectedTotal.toFixed(2)),
              remaining: Number(estimatedRemaining.toFixed(2)),
              varianceAtCompletion: Number(varianceAtCompletion.toFixed(2)),
            }
          : undefined,
        labor: laborUtilization,
        recommendations:
          budgetConsumed > 90
            ? [
                'Review remaining budget urgently',
                'Identify cost-saving measures',
                'Consider scope reduction',
              ]
            : budgetConsumed > 75
              ? ['Monitor spending closely', 'Review remaining estimates', 'Update forecast']
              : ['Continue monitoring', 'Update progress regularly'],
      };
    },
    options: { cacheable: true, cacheTTL: 15000 },
  },

  // ============================================================
  // INVENTORY & WAREHOUSE
  // ============================================================
  {
    name: 'erp_validate_inventory',
    description: 'Validate inventory levels and check for shortages',
    inputSchema: {
      type: 'object',
      properties: {
        sku: { type: 'string', description: 'SKU to validate' },
        quantity: { type: 'number', description: 'Required quantity', minimum: 1 },
        currentStock: {
          type: 'number',
          description: 'Current stock on hand',
        },
        reorderPoint: {
          type: 'number',
          description: 'Reorder point threshold',
        },
      },
      required: ['sku', 'quantity'],
    },
    handler: async (args: ToolArgs) => {
      const {
        sku,
        quantity,
        currentStock = 0,
        reorderPoint = 10,
      } = args as {
        sku: string;
        quantity: number;
        currentStock?: number;
        reorderPoint?: number;
      };

      const available = currentStock >= quantity;
      const shortage = available ? 0 : quantity - currentStock;
      const needsReorder = currentStock <= reorderPoint;
      const suggestedOrderQuantity =
        shortage > reorderPoint ? shortage + reorderPoint : needsReorder ? reorderPoint * 2 : 0;

      return {
        sku,
        requestedQuantity: quantity,
        currentStock,
        available,
        shortage: Number(shortage.toFixed(2)),
        reorderPoint,
        needsReorder,
        suggestedOrderQuantity,
        status: available
          ? needsReorder
            ? 'Available but reorder recommended'
            : 'Available'
          : 'Shortage - immediate reorder required',
      };
    },
    options: { cacheable: true, cacheTTL: 10000 },
  },

  {
    name: 'erp_optimize_bin_locations',
    description: 'Suggest optimal bin locations for products based on picking frequency',
    inputSchema: {
      type: 'object',
      properties: {
        sku: { type: 'string', description: 'Product SKU' },
        currentLocation: {
          type: 'string',
          description: 'Current bin location (format: A-12-03)',
          pattern: '^[A-Z]-\\d{1,3}-\\d{2}$',
        },
        pickFrequency: {
          type: 'number',
          description: 'How often this item is picked (picks per day)',
          minimum: 0,
        },
      },
      required: ['sku', 'pickFrequency'],
    },
    handler: async (args: ToolArgs) => {
      const { sku, currentLocation, pickFrequency } = args as {
        sku: string;
        currentLocation?: string;
        pickFrequency: number;
      };

      let suggestedZone = 'C'; // Medium priority zone
      let suggestionReason = 'Medium turnover product';

      if (pickFrequency > 50) {
        suggestedZone = 'A'; // High priority zone near packing
        suggestionReason = 'High turnover product - place near shipping area';
      } else if (pickFrequency < 5) {
        suggestedZone = 'D'; // Low priority zone
        suggestionReason = 'Low turnover product - place in back of warehouse';
      }

      return {
        sku,
        currentLocation,
        pickFrequency,
        suggestedLocation: `${suggestedZone}-XX-YY`,
        suggestionReason,
        estimatedTimeSavings: pickFrequency > 20 ? '10-15 minutes per day' : 'Minimal',
      };
    },
    options: { cacheable: true, cacheTTL: 60000 },
  },

  {
    name: 'erp_calculate_pick_path',
    description: 'Calculate optimal pick path through warehouse zones',
    inputSchema: {
      type: 'object',
      properties: {
        locations: {
          type: 'array',
          description: 'Array of bin locations to visit',
          items: {
            type: 'string',
            pattern: '^[A-Z]-\\d{1,3}-\\d{2}$',
          },
        },
        startPoint: {
          type: 'string',
          description: 'Starting point (format: A-01-01)',
          pattern: '^[A-Z]-\\d{1,3}-\\d{2}$',
        },
      },
      required: ['locations'],
    },
    handler: async (args: ToolArgs) => {
      const { locations, startPoint = 'A-01-01' } = args as {
        locations: string[];
        startPoint: string;
      };

      // Simple path optimization: sort by zone, then aisle, then shelf
      const sortedLocations = [...locations].sort((a, b) => {
        const [zoneA, aisleA, shelfA] = a.split('-').map(Number);
        const [zoneB, aisleB, shelfB] = b.split('-').map(Number);

        if (zoneA !== zoneB) return zoneA - zoneB;
        if (aisleA !== aisleB) return aisleA - aisleB;
        return shelfA - shelfB;
      });

      // Calculate estimated distance (simplified)
      let totalDistance = 0;
      let previous = startPoint;

      for (const loc of sortedLocations) {
        const [prevZone, prevAisle, prevShelf] = previous.split('-').map(Number);
        const [currZone, currAisle, currShelf] = loc.split('-').map(Number);

        // Manhattan distance approximation
        const distance =
          Math.abs(currZone - prevZone) * 50 + // Zone distance ~50m
          Math.abs(currAisle - prevAisle) * 10 + // Aisle distance ~10m
          Math.abs(currShelf - prevShelf) * 1; // Shelf distance ~1m

        totalDistance += distance;
        previous = loc;
      }

      // Return to start
      const [prevZone, prevAisle, prevShelf] = previous.split('-').map(Number);
      const [startZone, startAisle, startShelf] = startPoint.split('-').map(Number);
      const returnDistance =
        Math.abs(startZone - prevZone) * 50 +
        Math.abs(startAisle - prevAisle) * 10 +
        Math.abs(startShelf - prevShelf) * 1;
      totalDistance += returnDistance;

      return {
        originalPath: locations,
        optimizedPath: sortedLocations,
        startPoint,
        totalDistance: Math.round(totalDistance),
        estimatedTime: Math.round(totalDistance / 10), // ~10 seconds per 10m
        savings: {
          distanceOptimized: locations.length !== sortedLocations.length,
          message: 'Path optimized by zone/aisle/shelf ordering',
        },
      };
    },
    options: { cacheable: true, cacheTTL: 30000 },
  },

  // ============================================================
  // E-COMMERCE INTEGRATION
  // ============================================================
  {
    name: 'erp_calculate_shipping_cost',
    description: 'Calculate shipping cost based on weight, dimensions, and service level',
    inputSchema: {
      type: 'object',
      properties: {
        weight: { type: 'number', description: 'Weight in pounds' },
        weightUnit: {
          type: 'string',
          enum: ['lb', 'kg', 'oz', 'g'],
          description: 'Weight unit',
        },
        zone: {
          type: 'number',
          description: 'Shipping zone (1-8 for US)',
          minimum: 1,
          maximum: 8,
        },
        serviceLevel: {
          type: 'string',
          enum: ['ground', '3-day', '2-day', 'overnight'],
          description: 'Service level',
        },
        residential: {
          type: 'boolean',
          description: 'Residential delivery',
        },
      },
      required: ['weight', 'serviceLevel'],
    },
    handler: async (args: ToolArgs) => {
      const {
        weight,
        weightUnit = 'lb',
        zone = 1,
        serviceLevel,
        residential = false,
      } = args as {
        weight: number;
        weightUnit?: string;
        zone?: number;
        serviceLevel: 'ground' | '3-day' | '2-day' | 'overnight';
        residential?: boolean;
      };

      // Convert to pounds
      let weightLb = weight;
      if (weightUnit === 'kg') weightLb = weight * 2.20462;
      else if (weightUnit === 'oz') weightLb = weight / 16;
      else if (weightUnit === 'g') weightLb = weight / 453.592;

      // Base rates by service level (for zone 1, 1 lb)
      const baseRates: Record<string, number> = {
        ground: 8.5,
        '3-day': 14.5,
        '2-day': 22.0,
        overnight: 38.0,
      };

      let cost = baseRates[serviceLevel];

      // Zone multiplier (simplified)
      const zoneMultiplier = 1 + (zone - 1) * 0.15;
      cost *= zoneMultiplier;

      // Weight multiplier
      if (weightLb > 1) {
        cost += (weightLb - 1) * (serviceLevel === 'ground' ? 0.5 : 1.0);
      }

      // Residential surcharge
      if (residential) {
        cost += 4.5;
      }

      return {
        weightLb: Number(weightLb.toFixed(2)),
        zone,
        serviceLevel,
        residential,
        baseRate: baseRates[serviceLevel],
        zoneMultiplier: Number(zoneMultiplier.toFixed(2)),
        residentialSurcharge: residential ? 4.5 : 0,
        totalCost: Number(cost.toFixed(2)),
        estimatedDelivery: {
          ground: `${zone * 1 + 1}-${zone * 1 + 3} days`,
          '3-day': '3 business days',
          '2-day': '2 business days',
          overnight: 'next business day',
        }[serviceLevel],
      };
    },
    options: { cacheable: true, cacheTTL: 10000 },
  },

  {
    name: 'erp_sync_ecommerce_order',
    description: 'Prepare e-commerce order data for ERP integration',
    inputSchema: {
      type: 'object',
      properties: {
        channel: {
          type: 'string',
          enum: ['shopify', 'woocommerce', 'amazon', 'ebay', 'magento'],
          description: 'E-commerce channel',
        },
        orderId: { type: 'string', description: 'Channel order ID' },
        customerEmail: { type: 'string', description: 'Customer email' },
        items: {
          type: 'array',
          description: 'Order line items',
          items: {
            type: 'object',
            properties: {
              sku: { type: 'string' },
              quantity: { type: 'number' },
              price: { type: 'number' },
            },
          },
        },
        shippingMethod: { type: 'string', description: 'Shipping method' },
        paymentStatus: {
          type: 'string',
          enum: ['pending', 'paid', 'refunded', 'partial'],
          description: 'Payment status',
        },
      },
      required: ['channel', 'orderId', 'customerEmail', 'items'],
    },
    handler: async (args: ToolArgs) => {
      const {
        channel,
        orderId,
        customerEmail,
        items,
        shippingMethod = 'standard',
        paymentStatus = 'pending',
      } = args as {
        channel: string;
        orderId: string;
        customerEmail: string;
        items: Array<{ sku: string; quantity: number; price: number }>;
        shippingMethod?: string;
        paymentStatus?: string;
      };

      const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
      const estimatedTax = subtotal * 0.08; // Simplified 8%
      const estimatedTotal = subtotal + estimatedTax;

      return {
        source: channel,
        sourceOrderId: orderId,
        erpOrderType: 'Sales Order',
        customer: {
          email: customerEmail,
          customerType: 'E-commerce',
        },
        lineItems: items.map(item => ({
          sku: item.sku,
          quantity: item.quantity,
          unitPrice: item.price,
          extendedPrice: item.price * item.quantity,
        })),
        financials: {
          subtotal: Number(subtotal.toFixed(2)),
          estimatedTax: Number(estimatedTax.toFixed(2)),
          estimatedTotal: Number(estimatedTotal.toFixed(2)),
        },
        shipping: {
          method: shippingMethod,
          status: 'not_shipped',
        },
        payment: {
          status: paymentStatus,
          amount: paymentStatus === 'paid' ? estimatedTotal : 0,
        },
        nextActions: [
          'Create customer record if new',
          'Validate inventory for all SKUs',
          'Process payment if pending',
          'Generate pick list',
          'Update order status',
        ],
        integrationStatus: 'Ready for ERP import',
      };
    },
    options: { cacheable: false },
  },
];
