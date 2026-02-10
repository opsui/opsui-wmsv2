/**
 * Commission Report Page
 *
 * Page for viewing and managing sales commissions
 * Shows commission summaries by sales person, payment status, and detailed reports
 */

import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeftIcon,
  CalendarIcon,
  CurrencyDollarIcon,
  UserIcon,
  ChartBarIcon,
  CheckIcon,
  ClockIcon,
  ArrowDownTrayIcon,
} from '@heroicons/react/24/outline';
import { Header } from '@/components/shared/Header';
import { Card } from '@/components/shared/Card';

interface CommissionSummary {
  salesPersonId: string;
  salesPersonName: string;
  totalEarned: number;
  totalPaid: number;
  pendingPayment: number;
  transactionCount: number;
  payRate: number;
}

interface CommissionDetail {
  commissionId: string;
  orderId: string;
  orderNumber: string;
  orderDate: string;
  transactionType: string;
  baseAmount: number;
  commissionRate: number;
  commissionAmount: number;
  status: string;
  paidDate?: string;
}

export default function CommissionReportPage() {
  const navigate = useNavigate();
  const [summaries, setSummaries] = useState<CommissionSummary[]>([]);
  const [selectedSalesPerson, setSelectedSalesPerson] = useState('');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [details, setDetails] = useState<CommissionDetail[]>([]);
  const [showDetails, setShowDetails] = useState(false);
  const [loading, setLoading] = useState(true);

  // Available years
  const years = [
    new Date().getFullYear(),
    new Date().getFullYear() - 1,
    new Date().getFullYear() - 2,
  ];

  useEffect(() => {
    fetchCommissionSummaries();
  }, [selectedYear]);

  useEffect(() => {
    if (selectedSalesPerson) {
      fetchCommissionDetails();
      setShowDetails(true);
    } else {
      setShowDetails(false);
      setDetails([]);
    }
  }, [selectedSalesPerson]);

  const fetchCommissionSummaries = async () => {
    setLoading(true);
    try {
      // Fetch all sales people and their commission summaries
      const response = await fetch('/api/hr/employees?status=ACTIVE', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });

      if (response.ok) {
        const employees = await response.json();

        // Fetch commission summary for each employee
        const summariesWithData = await Promise.all(
          employees.map(async (emp: any) => {
            const commResponse = await fetch(
              `/api/sales/commissions/${emp.employeeId}/summary?year=${selectedYear}`,
              {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
              }
            );

            if (commResponse.ok) {
              const data = await commResponse.json();
              return {
                salesPersonId: emp.employeeId,
                salesPersonName: `${emp.firstName} ${emp.lastName}`,
                ...data,
              };
            }
            return null;
          })
        );

        setSummaries(summariesWithData.filter(s => s !== null && s.totalEarned > 0));
      }
    } catch (error) {
      console.error('Error fetching commission summaries:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCommissionDetails = async () => {
    try {
      const response = await fetch(
        `/api/sales/commissions?salesPersonId=${selectedSalesPerson}&year=${selectedYear}`,
        {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setDetails(data || []);
      }
    } catch (error) {
      console.error('Error fetching commission details:', error);
    }
  };

  const payCommissions = async () => {
    const pendingCommissions = details.filter(d => d.status === 'EARNED').map(d => d.commissionId);

    if (pendingCommissions.length === 0) {
      alert('No pending commissions to pay');
      return;
    }

    if (
      !confirm(
        `Pay ${pendingCommissions.length} pending commissions totaling $${details
          .filter(d => d.status === 'EARNED')
          .reduce((sum, d) => sum + d.commissionAmount, 0)
          .toFixed(2)}?`
      )
    ) {
      return;
    }

    try {
      const response = await fetch('/api/sales/commissions/pay', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          commissionIds: pendingCommissions,
          paymentDate: new Date().toISOString(),
        }),
      });

      if (response.ok) {
        fetchCommissionSummaries();
        fetchCommissionDetails();
      }
    } catch (error) {
      console.error('Error paying commissions:', error);
    }
  };

  const exportReport = () => {
    // Generate CSV content
    const headers = [
      'Sales Person',
      'Total Earned',
      'Total Paid',
      'Pending Payment',
      'Transaction Count',
    ];
    const rows = summaries.map(s => [
      s.salesPersonName,
      s.totalEarned.toFixed(2),
      s.totalPaid.toFixed(2),
      s.pendingPayment.toFixed(2),
      s.transactionCount.toString(),
    ]);

    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `commission-report-${selectedYear}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const totals = summaries.reduce(
    (acc, s) => ({
      totalEarned: acc.totalEarned + s.totalEarned,
      totalPaid: acc.totalPaid + s.totalPaid,
      pendingPayment: acc.pendingPayment + s.pendingPayment,
      transactionCount: acc.transactionCount + s.transactionCount,
    }),
    { totalEarned: 0, totalPaid: 0, pendingPayment: 0, transactionCount: 0 }
  );

  return (
    <div className="min-h-screen">
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/sales')}
              className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            >
              <ArrowLeftIcon className="h-5 w-5 text-gray-400 dark:text-slate-400" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Commission Reports
              </h1>
              <p className="text-gray-600 dark:text-slate-400 text-sm">
                View and manage sales commissions
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <select
              value={selectedYear}
              onChange={e => setSelectedYear(e.target.value)}
              className="bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg px-3 py-2 text-gray-900 dark:text-white"
            >
              {years.map(year => (
                <option key={year} value={year.toString()}>
                  {year}
                </option>
              ))}
            </select>
            <button
              onClick={exportReport}
              className="px-4 py-2 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-700 dark:text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
            >
              <ArrowDownTrayIcon className="h-4 w-4" />
              Export
            </button>
          </div>
        </div>

        {/* Summary Metrics */}
        <div className="mb-6 grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card
            title="Total Earned"
            className="bg-white dark:bg-slate-800/50 border border-gray-200 dark:border-0"
          >
            <p className="text-3xl font-bold text-blue-500 dark:text-blue-400">
              ${totals.totalEarned.toLocaleString()}
            </p>
          </Card>
          <Card
            title="Total Paid"
            className="bg-white dark:bg-slate-800/50 border border-gray-200 dark:border-0"
          >
            <p className="text-3xl font-bold text-emerald-500 dark:text-emerald-400">
              ${totals.totalPaid.toLocaleString()}
            </p>
          </Card>
          <Card
            title="Pending Payment"
            className="bg-white dark:bg-slate-800/50 border border-gray-200 dark:border-0"
          >
            <p className="text-3xl font-bold text-amber-500 dark:text-amber-400">
              ${totals.pendingPayment.toLocaleString()}
            </p>
          </Card>
          <Card
            title="Transactions"
            className="bg-white dark:bg-slate-800/50 border border-gray-200 dark:border-0"
          >
            <p className="text-3xl font-bold text-purple-500 dark:text-purple-400">
              {totals.transactionCount}
            </p>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Commission Summary by Sales Person */}
          <Card
            title="Commission Summary by Sales Person"
            className="lg:col-span-1 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700"
          >
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
              </div>
            ) : summaries.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-slate-400">
                No commission data found for {selectedYear}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-left text-gray-500 dark:text-slate-400 text-xs border-b border-gray-200 dark:border-slate-700/50">
                      <th className="pb-3 font-medium">Sales Person</th>
                      <th className="pb-3 font-medium text-right">Earned</th>
                      <th className="pb-3 font-medium text-right">Paid</th>
                      <th className="pb-3 font-medium text-right">Pending</th>
                      <th className="pb-3 font-medium text-right">Trans.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summaries.map(summary => (
                      <tr
                        key={summary.salesPersonId}
                        className={`border-b border-gray-100 dark:border-slate-700/30 cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-800/30 ${
                          selectedSalesPerson === summary.salesPersonId
                            ? 'bg-blue-50 dark:bg-blue-500/10'
                            : ''
                        }`}
                        onClick={() => setSelectedSalesPerson(summary.salesPersonId)}
                      >
                        <td className="py-3">
                          <div className="flex items-center gap-2">
                            <UserIcon className="h-4 w-4 text-gray-400 dark:text-slate-400" />
                            <span className="text-gray-900 dark:text-white font-medium">
                              {summary.salesPersonName}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 text-right text-blue-500 dark:text-blue-400 font-semibold">
                          ${summary.totalEarned.toLocaleString()}
                        </td>
                        <td className="py-3 text-right text-emerald-500 dark:text-emerald-400">
                          ${summary.totalPaid.toLocaleString()}
                        </td>
                        <td className="py-3 text-right text-amber-500 dark:text-amber-400 font-semibold">
                          ${summary.pendingPayment.toLocaleString()}
                        </td>
                        <td className="py-3 text-right text-gray-500 dark:text-slate-400">
                          {summary.transactionCount}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          {/* Commission Details */}
          {showDetails && (
            <Card
              title="Commission Details"
              className="lg:col-span-1 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-gray-900 dark:text-white font-semibold">
                  {summaries.find(s => s.salesPersonId === selectedSalesPerson)?.salesPersonName}
                </h3>
                {details.some(d => d.status === 'EARNED') && (
                  <button
                    onClick={payCommissions}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                  >
                    <CheckIcon className="h-4 w-4" />
                    Pay Pending
                  </button>
                )}
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-left text-gray-500 dark:text-slate-400 text-xs border-b border-gray-200 dark:border-slate-700/50">
                      <th className="pb-3 font-medium">Order</th>
                      <th className="pb-3 font-medium">Date</th>
                      <th className="pb-3 font-medium text-right">Base</th>
                      <th className="pb-3 font-medium text-right">Rate</th>
                      <th className="pb-3 font-medium text-right">Commission</th>
                      <th className="pb-3 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {details.map(detail => (
                      <tr
                        key={detail.commissionId}
                        className="border-b border-gray-100 dark:border-slate-700/30"
                      >
                        <td className="py-2">
                          <Link
                            to={`/sales/orders/${detail.orderId}`}
                            className="text-blue-500 dark:text-blue-400 hover:text-blue-600 dark:hover:text-blue-300 text-sm"
                          >
                            {detail.orderNumber}
                          </Link>
                        </td>
                        <td className="py-2 text-gray-500 dark:text-slate-400 text-sm">
                          {new Date(detail.orderDate).toLocaleDateString()}
                        </td>
                        <td className="py-2 text-right text-gray-600 dark:text-slate-300 text-sm">
                          ${detail.baseAmount.toLocaleString()}
                        </td>
                        <td className="py-2 text-right text-gray-500 dark:text-slate-400 text-sm">
                          {detail.commissionRate}%
                        </td>
                        <td className="py-2 text-right text-gray-900 dark:text-white font-semibold text-sm">
                          ${detail.commissionAmount.toLocaleString()}
                        </td>
                        <td className="py-2">
                          <span
                            className={`px-2 py-0.5 rounded text-xs ${
                              detail.status === 'PAID'
                                ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                                : detail.status === 'EARNED'
                                  ? 'bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400'
                                  : 'bg-slate-100 dark:bg-slate-500/20 text-slate-600 dark:text-slate-400'
                            }`}
                          >
                            {detail.status === 'PAID' && detail.paidDate
                              ? `Paid ${new Date(detail.paidDate).toLocaleDateString()}`
                              : detail.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </div>

        {/* Visual Charts */}
        {summaries.length > 0 && (
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card
              title="Commission Distribution"
              className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700"
            >
              <div className="space-y-3">
                {summaries.slice(0, 5).map((summary, index) => {
                  const percent =
                    totals.totalEarned > 0 ? (summary.totalEarned / totals.totalEarned) * 100 : 0;
                  return (
                    <div key={summary.salesPersonId}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-gray-900 dark:text-white text-sm">
                          {summary.salesPersonName}
                        </span>
                        <span className="text-gray-500 dark:text-slate-400 text-xs">
                          ${summary.totalEarned.toLocaleString()} ({percent.toFixed(1)}%)
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-2">
                        <div
                          className="h-2 rounded-full bg-gradient-to-r from-blue-500 to-purple-500"
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>

            <Card
              title="Payment Status"
              className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700"
            >
              <div className="flex items-center justify-center h-48">
                <div className="relative w-40 h-40">
                  <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                    <circle
                      cx="50"
                      cy="50"
                      r="40"
                      fill="none"
                      stroke="#e5e7eb"
                      className="dark:[stroke:#334155]"
                      strokeWidth="12"
                    />
                    <circle
                      cx="50"
                      cy="50"
                      r="40"
                      fill="none"
                      stroke="#10b981"
                      strokeWidth="12"
                      strokeDasharray={`${(totals.totalPaid / totals.totalEarned) * 251.2} 251.2`}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-emerald-500 dark:text-emerald-400">
                        {totals.totalEarned > 0
                          ? ((totals.totalPaid / totals.totalEarned) * 100).toFixed(0)
                          : 0}
                        %
                      </p>
                      <p className="text-gray-500 dark:text-slate-400 text-xs">Paid</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="mt-4 flex justify-center gap-6 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-emerald-500 rounded-full"></div>
                  <span className="text-gray-500 dark:text-slate-400">
                    Paid (${totals.totalPaid.toLocaleString()})
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-gray-300 dark:bg-slate-600 rounded-full"></div>
                  <span className="text-gray-500 dark:text-slate-400">
                    Pending (${totals.pendingPayment.toLocaleString()})
                  </span>
                </div>
              </div>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}
