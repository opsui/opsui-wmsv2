/**
 * PayStubViewer Component
 *
 * Component for displaying detailed pay stub information
 * Shows earnings, deductions, taxes, and net pay breakdown
 */

import { useState } from 'react';
import {
  DocumentTextIcon,
  CurrencyDollarIcon,
  CalculatorIcon,
  HashtagIcon,
  ArrowDownIcon,
  ArrowUpIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  PrinterIcon,
  ArrowDownTrayIcon,
} from '@heroicons/react/24/outline';

export interface PayStubLine {
  lineId: string;
  lineNumber: string;
  description: string;
  quantity?: number;
  rate?: number;
  amount: number;
  ytdAmount: number;
}

export interface PayStubDeduction {
  deductionId: string;
  deductionType: string;
  description: string;
  amount: number;
  ytdAmount: number;
  isEmployer?: boolean;
}

export interface PayStubTax {
  taxId: string;
  taxType: string;
  description: string;
  amount: number;
  ytdAmount: number;
}

export interface PayStub {
  payStubId: string;
  payPeriodStartDate: string;
  payPeriodEndDate: string;
  payDate: string;
  checkNumber?: string;

  employeeId: string;
  employeeName: string;
  employeeNumber?: string;
  employeeAddress?: string;

  // Earnings
  grossPay: number;
  regularPay: number;
  overtimePay: number;
  bonusPay: number;
  commissionPay: number;
  otherPay: number;

  // Taxes
  federalTax: number;
  stateTax: number;
  socialSecurity: number;
  medicare: number;
  otherTaxes: number;
  totalTaxes: number;

  // Deductions
  healthInsurance: number;
  dentalInsurance: number;
  retirement401k: number;
  kiwiSaver: number;
  otherDeductions: number;
  totalDeductions: number;

  // Employer contributions
  employerSocialSecurity: number;
  employerMedicare: number;
  employerKiwiSaver: number;
  employerOther: number;
  totalEmployer: number;

  // Net
  netPay: number;
  ytdGross: number;
  ytdNet: number;

  // Details
  earningsLines?: PayStubLine[];
  deductionLines?: PayStubDeduction[];
  taxLines?: PayStubTax[];
}

export interface PayStubViewerProps {
  payStub: PayStub;
  showPrint?: boolean;
}

export function PayStubViewer({ payStub, showPrint = true }: PayStubViewerProps) {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(['earnings', 'taxes', 'deductions', 'employer'])
  );

  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-NZ', {
      style: 'currency',
      currency: 'NZD',
    }).format(amount);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    // Generate CSV content
    const lines = [
      ['PAY STUB', ''],
      ['Employee', payStub.employeeName],
      [
        'Pay Period',
        `${new Date(payStub.payPeriodStartDate).toLocaleDateString()} - ${new Date(payStub.payPeriodEndDate).toLocaleDateString()}`,
      ],
      ['Pay Date', new Date(payStub.payDate).toLocaleDateString()],
      [''],
      ['EARNINGS', 'Current', 'YTD'],
      ['Regular Pay', formatCurrency(payStub.regularPay), formatCurrency(payStub.ytdGross * 0.7)], // Approximate
      ['Overtime Pay', formatCurrency(payStub.overtimePay), ''],
      ['Bonus Pay', formatCurrency(payStub.bonusPay), ''],
      ['Gross Pay', formatCurrency(payStub.grossPay), formatCurrency(payStub.ytdGross)],
      [''],
      ['TAXES', 'Current', 'YTD'],
      ['Income Tax', formatCurrency(payStub.federalTax), ''],
      ['Social Security', formatCurrency(payStub.socialSecurity), ''],
      ['Medicare', formatCurrency(payStub.medicare), ''],
      ['Total Taxes', formatCurrency(payStub.totalTaxes), ''],
      [''],
      ['DEDUCTIONS', 'Current', 'YTD'],
      ['Health Insurance', formatCurrency(payStub.healthInsurance), ''],
      ['KiwiSaver', formatCurrency(payStub.kiwiSaver), ''],
      ['Total Deductions', formatCurrency(payStub.totalDeductions), ''],
      [''],
      ['NET PAY', formatCurrency(payStub.netPay), formatCurrency(payStub.ytdNet)],
    ];

    const csvContent = lines.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `paystub-${payStub.payDate}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-slate-900 border border-slate-700 rounded-lg overflow-hidden print:bg-white print:border-black">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-800 to-slate-700 px-6 py-4 print:bg-gray-200 print:border-b print:border-black">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <DocumentTextIcon className="h-8 w-8 text-blue-400 print:text-black" />
            <div>
              <h2 className="text-lg font-bold text-white print:text-black">Pay Stub</h2>
              <p className="text-slate-300 text-sm print:text-black">
                Check #: {payStub.checkNumber || 'N/A'}
              </p>
            </div>
          </div>

          {showPrint && (
            <div className="flex gap-2">
              <button
                onClick={handlePrint}
                className="p-2 hover:bg-slate-600 rounded-lg transition-colors print:hidden"
                title="Print"
              >
                <PrinterIcon className="h-5 w-5 text-slate-300" />
              </button>
              <button
                onClick={handleDownload}
                className="p-2 hover:bg-slate-600 rounded-lg transition-colors print:hidden"
                title="Download CSV"
              >
                <ArrowDownTrayIcon className="h-5 w-5 text-slate-300" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Employee and Period Info */}
      <div className="px-6 py-4 border-b border-slate-700 print:border-b print:border-black">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <p className="text-slate-400 text-xs uppercase tracking-wide print:text-black">
              Employee
            </p>
            <p className="text-white font-semibold print:text-black">{payStub.employeeName}</p>
            {payStub.employeeNumber && (
              <p className="text-slate-400 text-sm print:text-black">
                ID: {payStub.employeeNumber}
              </p>
            )}
          </div>
          <div>
            <p className="text-slate-400 text-xs uppercase tracking-wide print:text-black">
              Pay Period
            </p>
            <p className="text-white font-medium print:text-black">
              {new Date(payStub.payPeriodStartDate).toLocaleDateString()} -{' '}
              {new Date(payStub.payPeriodEndDate).toLocaleDateString()}
            </p>
          </div>
          <div>
            <p className="text-slate-400 text-xs uppercase tracking-wide print:text-black">
              Pay Date
            </p>
            <p className="text-white font-medium print:text-black">
              {new Date(payStub.payDate).toLocaleDateString()}
            </p>
          </div>
        </div>
      </div>

      {/* Summary */}
      <div className="px-6 py-4 bg-slate-800/30 print:bg-gray-100">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-3 bg-slate-800 rounded-lg print:bg-white print:border print:border-black">
            <p className="text-slate-400 text-xs uppercase tracking-wide mb-1 print:text-black">
              Gross Pay
            </p>
            <p className="text-xl font-bold text-blue-400 print:text-black">
              {formatCurrency(payStub.grossPay)}
            </p>
            <p className="text-slate-500 text-xs print:text-black">
              YTD: {formatCurrency(payStub.ytdGross)}
            </p>
          </div>

          <div className="text-center p-3 bg-slate-800 rounded-lg print:bg-white print:border print:border-black">
            <p className="text-slate-400 text-xs uppercase tracking-wide mb-1 print:text-black">
              Taxes
            </p>
            <p className="text-xl font-bold text-red-400 print:text-black">
              {formatCurrency(payStub.totalTaxes)}
            </p>
            <p className="text-slate-500 text-xs print:text-black">
              {((payStub.totalTaxes / payStub.grossPay) * 100).toFixed(1)}% of gross
            </p>
          </div>

          <div className="text-center p-3 bg-slate-800 rounded-lg print:bg-white print:border print:border-black">
            <p className="text-slate-400 text-xs uppercase tracking-wide mb-1 print:text-black">
              Deductions
            </p>
            <p className="text-xl font-bold text-amber-400 print:text-black">
              {formatCurrency(payStub.totalDeductions)}
            </p>
            <p className="text-slate-500 text-xs print:text-black">
              {((payStub.totalDeductions / payStub.grossPay) * 100).toFixed(1)}% of gross
            </p>
          </div>

          <div className="text-center p-3 bg-emerald-900/30 rounded-lg print:bg-white print:border print:border-black">
            <p className="text-slate-400 text-xs uppercase tracking-wide mb-1 print:text-black">
              Net Pay
            </p>
            <p className="text-xl font-bold text-emerald-400 print:text-black">
              {formatCurrency(payStub.netPay)}
            </p>
            <p className="text-slate-500 text-xs print:text-black">
              YTD: {formatCurrency(payStub.ytdNet)}
            </p>
          </div>
        </div>
      </div>

      {/* Detailed Sections */}
      <div className="divide-y divide-slate-700 print:divide-y print:divide-black">
        {/* Earnings */}
        <div>
          <button
            onClick={() => toggleSection('earnings')}
            className="w-full px-6 py-3 flex items-center justify-between hover:bg-slate-800/50 transition-colors print:hover:bg-transparent"
          >
            <div className="flex items-center gap-2">
              <CurrencyDollarIcon className="h-5 w-5 text-blue-400 print:text-black" />
              <span className="font-semibold text-white print:text-black">Earnings</span>
            </div>
            {expandedSections.has('earnings') ? (
              <ChevronDownIcon className="h-5 w-5 text-slate-400 print:text-black" />
            ) : (
              <ChevronRightIcon className="h-5 w-5 text-slate-400 print:text-black" />
            )}
          </button>

          {expandedSections.has('earnings') && (
            <div className="px-6 pb-4 print:pb-4">
              {payStub.earningsLines && payStub.earningsLines.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-slate-400 text-xs border-b border-slate-700 print:border-black">
                        <th className="pb-2 text-left font-medium print:text-black">Description</th>
                        <th className="pb-2 text-right font-medium print:text-black">Hours</th>
                        <th className="pb-2 text-right font-medium print:text-black">Rate</th>
                        <th className="pb-2 text-right font-medium print:text-black">Current</th>
                        <th className="pb-2 text-right font-medium print:text-black">YTD</th>
                      </tr>
                    </thead>
                    <tbody>
                      {payStub.earningsLines.map(line => (
                        <tr
                          key={line.lineId}
                          className="border-b border-slate-700/50 print:border-black"
                        >
                          <td className="py-2 text-white print:text-black">{line.description}</td>
                          <td className="py-2 text-right text-slate-300 print:text-black">
                            {line.quantity || '-'}
                          </td>
                          <td className="py-2 text-right text-slate-300 print:text-black">
                            {line.rate ? formatCurrency(line.rate) : '-'}
                          </td>
                          <td className="py-2 text-right text-white font-medium print:text-black">
                            {formatCurrency(line.amount)}
                          </td>
                          <td className="py-2 text-right text-slate-400 print:text-black">
                            {formatCurrency(line.ytdAmount)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                  <div className="flex justify-between p-2 bg-slate-800 rounded print:bg-gray-100 print:border print:border-black">
                    <span className="text-slate-400 print:text-black">Regular</span>
                    <span className="text-white print:text-black">
                      {formatCurrency(payStub.regularPay)}
                    </span>
                  </div>
                  <div className="flex justify-between p-2 bg-slate-800 rounded print:bg-gray-100 print:border print:border-black">
                    <span className="text-slate-400 print:text-black">Overtime</span>
                    <span className="text-white print:text-black">
                      {formatCurrency(payStub.overtimePay)}
                    </span>
                  </div>
                  <div className="flex justify-between p-2 bg-slate-800 rounded print:bg-gray-100 print:border print:border-black">
                    <span className="text-slate-400 print:text-black">Bonus</span>
                    <span className="text-white print:text-black">
                      {formatCurrency(payStub.bonusPay)}
                    </span>
                  </div>
                  <div className="flex justify-between p-2 bg-slate-800 rounded print:bg-gray-100 print:border print:border-black">
                    <span className="text-slate-400 print:text-black">Other</span>
                    <span className="text-white print:text-black">
                      {formatCurrency(payStub.otherPay)}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Taxes */}
        <div>
          <button
            onClick={() => toggleSection('taxes')}
            className="w-full px-6 py-3 flex items-center justify-between hover:bg-slate-800/50 transition-colors print:hover:bg-transparent"
          >
            <div className="flex items-center gap-2">
              <HashtagIcon className="h-5 w-5 text-red-400 print:text-black" />
              <span className="font-semibold text-white print:text-black">Taxes</span>
            </div>
            {expandedSections.has('taxes') ? (
              <ChevronDownIcon className="h-5 w-5 text-slate-400 print:text-black" />
            ) : (
              <ChevronRightIcon className="h-5 w-5 text-slate-400 print:text-black" />
            )}
          </button>

          {expandedSections.has('taxes') && (
            <div className="px-6 pb-4">
              {payStub.taxLines && payStub.taxLines.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-slate-400 text-xs border-b border-slate-700 print:border-black">
                        <th className="pb-2 text-left font-medium print:text-black">Description</th>
                        <th className="pb-2 text-right font-medium print:text-black">Current</th>
                        <th className="pb-2 text-right font-medium print:text-black">YTD</th>
                      </tr>
                    </thead>
                    <tbody>
                      {payStub.taxLines.map(tax => (
                        <tr
                          key={tax.taxId}
                          className="border-b border-slate-700/50 print:border-black"
                        >
                          <td className="py-2 text-white print:text-black">{tax.description}</td>
                          <td className="py-2 text-right text-white print:text-black">
                            {formatCurrency(tax.amount)}
                          </td>
                          <td className="py-2 text-right text-slate-400 print:text-black">
                            {formatCurrency(tax.ytdAmount)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                  <div className="flex justify-between p-2 bg-slate-800 rounded print:bg-gray-100 print:border print:border-black">
                    <span className="text-slate-400 print:text-black">Income Tax</span>
                    <span className="text-white print:text-black">
                      {formatCurrency(payStub.federalTax)}
                    </span>
                  </div>
                  <div className="flex justify-between p-2 bg-slate-800 rounded print:bg-gray-100 print:border print:border-black">
                    <span className="text-slate-400 print:text-black">Social Security</span>
                    <span className="text-white print:text-black">
                      {formatCurrency(payStub.socialSecurity)}
                    </span>
                  </div>
                  <div className="flex justify-between p-2 bg-slate-800 rounded print:bg-gray-100 print:border print:border-black">
                    <span className="text-slate-400 print:text-black">Medicare</span>
                    <span className="text-white print:text-black">
                      {formatCurrency(payStub.medicare)}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Deductions */}
        <div>
          <button
            onClick={() => toggleSection('deductions')}
            className="w-full px-6 py-3 flex items-center justify-between hover:bg-slate-800/50 transition-colors print:hover:bg-transparent"
          >
            <div className="flex items-center gap-2">
              <ArrowDownIcon className="h-5 w-5 text-amber-400 print:text-black" />
              <span className="font-semibold text-white print:text-black">Deductions</span>
            </div>
            {expandedSections.has('deductions') ? (
              <ChevronDownIcon className="h-5 w-5 text-slate-400 print:text-black" />
            ) : (
              <ChevronRightIcon className="h-5 w-5 text-slate-400 print:text-black" />
            )}
          </button>

          {expandedSections.has('deductions') && (
            <div className="px-6 pb-4">
              {payStub.deductionLines && payStub.deductionLines.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-slate-400 text-xs border-b border-slate-700 print:border-black">
                        <th className="pb-2 text-left font-medium print:text-black">Description</th>
                        <th className="pb-2 text-right font-medium print:text-black">Current</th>
                        <th className="pb-2 text-right font-medium print:text-black">YTD</th>
                      </tr>
                    </thead>
                    <tbody>
                      {payStub.deductionLines.map(ded => (
                        <tr
                          key={ded.deductionId}
                          className="border-b border-slate-700/50 print:border-black"
                        >
                          <td className="py-2 text-white print:text-black">{ded.description}</td>
                          <td className="py-2 text-right text-white print:text-black">
                            {formatCurrency(ded.amount)}
                          </td>
                          <td className="py-2 text-right text-slate-400 print:text-black">
                            {formatCurrency(ded.ytdAmount)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                  <div className="flex justify-between p-2 bg-slate-800 rounded print:bg-gray-100 print:border print:border-black">
                    <span className="text-slate-400 print:text-black">Health Insurance</span>
                    <span className="text-white print:text-black">
                      {formatCurrency(payStub.healthInsurance)}
                    </span>
                  </div>
                  <div className="flex justify-between p-2 bg-slate-800 rounded print:bg-gray-100 print:border print:border-black">
                    <span className="text-slate-400 print:text-black">KiwiSaver</span>
                    <span className="text-white print:text-black">
                      {formatCurrency(payStub.kiwiSaver)}
                    </span>
                  </div>
                  <div className="flex justify-between p-2 bg-slate-800 rounded print:bg-gray-100 print:border print:border-black">
                    <span className="text-slate-400 print:text-black">Retirement (401k)</span>
                    <span className="text-white print:text-black">
                      {formatCurrency(payStub.retirement401k)}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Employer Contributions */}
        <div>
          <button
            onClick={() => toggleSection('employer')}
            className="w-full px-6 py-3 flex items-center justify-between hover:bg-slate-800/50 transition-colors print:hover:bg-transparent"
          >
            <div className="flex items-center gap-2">
              <ArrowUpIcon className="h-5 w-5 text-purple-400 print:text-black" />
              <span className="font-semibold text-white print:text-black">
                Employer Contributions
              </span>
            </div>
            {expandedSections.has('employer') ? (
              <ChevronDownIcon className="h-5 w-5 text-slate-400 print:text-black" />
            ) : (
              <ChevronRightIcon className="h-5 w-5 text-slate-400 print:text-black" />
            )}
          </button>

          {expandedSections.has('employer') && (
            <div className="px-6 pb-4">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                <div className="flex justify-between p-2 bg-slate-800 rounded print:bg-gray-100 print:border print:border-black">
                  <span className="text-slate-400 print:text-black">Employer SS</span>
                  <span className="text-white print:text-black">
                    {formatCurrency(payStub.employerSocialSecurity)}
                  </span>
                </div>
                <div className="flex justify-between p-2 bg-slate-800 rounded print:bg-gray-100 print:border print:border-black">
                  <span className="text-slate-400 print:text-black">Employer Medicare</span>
                  <span className="text-white print:text-black">
                    {formatCurrency(payStub.employerMedicare)}
                  </span>
                </div>
                <div className="flex justify-between p-2 bg-slate-800 rounded print:bg-gray-100 print:border print:border-black">
                  <span className="text-slate-400 print:text-black">Employer KiwiSaver</span>
                  <span className="text-white print:text-black">
                    {formatCurrency(payStub.employerKiwiSaver)}
                  </span>
                </div>
              </div>
              <div className="mt-3 flex justify-between p-3 bg-purple-900/20 rounded-lg print:bg-gray-200 print:border print:border-black">
                <span className="font-semibold text-purple-400 print:text-black">
                  Total Employer Contributions
                </span>
                <span className="font-bold text-purple-400 print:text-black">
                  {formatCurrency(payStub.totalEmployer)}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="px-6 py-4 bg-slate-800/30 border-t border-slate-700 print:bg-gray-200 print:border-t print:border-black">
        <div className="flex justify-between items-center">
          <div className="text-sm text-slate-400 print:text-black">
            <p>Pay Stub ID: {payStub.payStubId}</p>
            <p className="text-xs mt-1">
              This is an electronically generated pay stub. No signature required.
            </p>
          </div>
          <div className="text-right">
            <p className="text-slate-400 text-sm uppercase tracking-wide print:text-black">
              Net Pay
            </p>
            <p className="text-3xl font-bold text-emerald-400 print:text-black">
              {formatCurrency(payStub.netPay)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
