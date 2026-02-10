/**
 * HR Reports Page
 *
 * Analytics and reporting dashboard for HR operations
 * Includes employee metrics, leave analytics, payroll summaries, and compliance reports
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeftIcon,
  ChartBarIcon,
  UserGroupIcon,
  CalendarIcon,
  CurrencyDollarIcon,
  DocumentTextIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  ArrowPathIcon,
  ArrowDownTrayIcon,
} from '@heroicons/react/24/outline';
import { Header } from '@/components/shared/Header';
import { Card } from '@/components/shared/Card';

interface EmployeeMetrics {
  totalEmployees: number;
  activeEmployees: number;
  newHiresThisMonth: number;
  newHiresThisYear: number;
  terminationsThisMonth: number;
  terminationsThisYear: number;
  turnoverRate: number;
  avgTenure: number;
}

interface DepartmentMetrics {
  department: string;
  headcount: number;
  openPositions: number;
  avgSalary: number;
  budgetVariance: number;
}

interface LeaveAnalytics {
  leaveType: string;
  totalEntitlement: number;
  totalTaken: number;
  totalPending: number;
  utilizationRate: number;
  avgDaysPerEmployee: number;
}

interface PayrollSummary {
  period: string;
  grossPayroll: number;
  netPayroll: number;
  taxDeductions: number;
  kiwiSaverDeductions: number;
  otherDeductions: number;
  employeeCount: number;
  avgGrossPay: number;
}

interface ComplianceAlert {
  alertId: string;
  type: 'EXPIRING_CERT' | 'PAYROLL_ERROR' | 'LEAVE_BALANCE' | 'TAX_CODE';
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
  description: string;
  affectedEmployees: number;
  dueDate?: string;
}

export default function HRReportsPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState('month');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());

  // Data
  const [employeeMetrics, setEmployeeMetrics] = useState<EmployeeMetrics | null>(null);
  const [departmentMetrics, setDepartmentMetrics] = useState<DepartmentMetrics[]>([]);
  const [leaveAnalytics, setLeaveAnalytics] = useState<LeaveAnalytics[]>([]);
  const [payrollSummaries, setPayrollSummaries] = useState<PayrollSummary[]>([]);
  const [complianceAlerts, setComplianceAlerts] = useState<ComplianceAlert[]>([]);

  useEffect(() => {
    fetchHRData();
  }, [selectedPeriod, selectedYear]);

  const fetchHRData = async () => {
    setLoading(true);
    try {
      // Fetch employee metrics
      const empMetricsRes = await fetch(
        `/api/hr/reports/employee-metrics?period=${selectedPeriod}`,
        {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        }
      );
      if (empMetricsRes.ok) {
        setEmployeeMetrics(await empMetricsRes.json());
      }

      // Fetch department metrics
      const deptMetricsRes = await fetch('/api/hr/reports/department-metrics', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      if (deptMetricsRes.ok) {
        setDepartmentMetrics(await deptMetricsRes.json());
      }

      // Fetch leave analytics
      const leaveRes = await fetch(`/api/hr/reports/leave-analytics?year=${selectedYear}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      if (leaveRes.ok) {
        setLeaveAnalytics(await leaveRes.json());
      }

      // Fetch payroll summaries
      const payrollRes = await fetch(
        `/api/hr/reports/payroll-summary?period=${selectedPeriod}&year=${selectedYear}`,
        {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        }
      );
      if (payrollRes.ok) {
        setPayrollSummaries(await payrollRes.json());
      }

      // Fetch compliance alerts
      const complianceRes = await fetch('/api/hr/reports/compliance-alerts', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      if (complianceRes.ok) {
        setComplianceAlerts(await complianceRes.json());
      }
    } catch (error) {
      console.error('Error fetching HR data:', error);
    } finally {
      setLoading(false);
    }
  };

  const exportReport = async (reportType: string) => {
    try {
      const response = await fetch(
        `/api/hr/reports/export/${reportType}?period=${selectedPeriod}&year=${selectedYear}`,
        {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        }
      );

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${reportType}-${selectedPeriod}-${selectedYear}.xlsx`;
        a.click();
      }
    } catch (error) {
      console.error('Error exporting report:', error);
    }
  };

  if (loading && !employeeMetrics) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/hr')}
              className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
            >
              <ArrowLeftIcon className="h-5 w-5 text-slate-400" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-white">HR Reports & Analytics</h1>
              <p className="text-slate-400 text-sm">Comprehensive HR metrics and insights</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <select
              value={selectedPeriod}
              onChange={e => setSelectedPeriod(e.target.value)}
              className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm"
            >
              <option value="month">This Month</option>
              <option value="quarter">This Quarter</option>
              <option value="year">This Year</option>
            </select>
            <select
              value={selectedYear}
              onChange={e => setSelectedYear(e.target.value)}
              className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm"
            >
              <option value={String(new Date().getFullYear())}>{new Date().getFullYear()}</option>
              <option value={String(new Date().getFullYear() - 1)}>
                {new Date().getFullYear() - 1}
              </option>
              <option value={String(new Date().getFullYear() - 2)}>
                {new Date().getFullYear() - 2}
              </option>
            </select>
            <button
              onClick={fetchHRData}
              className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
            >
              <ArrowPathIcon className="h-5 w-5 text-slate-400" />
            </button>
          </div>
        </div>

        {/* Employee Metrics */}
        <div className="mb-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card title="Total Employees" className="bg-slate-800/50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-3xl font-bold text-white">
                  {employeeMetrics?.totalEmployees || 0}
                </p>
                <p className="text-slate-400 text-xs">Active workforce</p>
              </div>
              <UserGroupIcon className="h-10 w-10 text-blue-400/20" />
            </div>
          </Card>

          <Card title="New Hires" className="bg-slate-800/50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-3xl font-bold text-emerald-400">
                  +{employeeMetrics?.newHiresThisMonth || 0}
                </p>
                <p className="text-slate-400 text-xs">
                  {employeeMetrics?.newHiresThisYear || 0} this year
                </p>
              </div>
              <ArrowTrendingUpIcon className="h-10 w-10 text-emerald-400/20" />
            </div>
          </Card>

          <Card title="Turnover Rate" className="bg-slate-800/50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-3xl font-bold text-amber-400">
                  {(employeeMetrics?.turnoverRate || 0).toFixed(1)}%
                </p>
                <p className="text-slate-400 text-xs">
                  {employeeMetrics?.terminationsThisYear || 0} departures
                </p>
              </div>
              <ArrowTrendingDownIcon className="h-10 w-10 text-amber-400/20" />
            </div>
          </Card>

          <Card title="Avg Tenure" className="bg-slate-800/50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-3xl font-bold text-purple-400">
                  {(employeeMetrics?.avgTenure || 0).toFixed(1)}y
                </p>
                <p className="text-slate-400 text-xs">Years of service</p>
              </div>
              <CalendarIcon className="h-10 w-10 text-purple-400/20" />
            </div>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Department Metrics */}
          <Card title="Department Overview" className="lg:col-span-1">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-slate-400 text-xs border-b border-slate-700/50">
                    <th className="pb-3 font-medium">Department</th>
                    <th className="pb-3 font-medium text-right">Headcount</th>
                    <th className="pb-3 font-medium text-right">Open Roles</th>
                    <th className="pb-3 font-medium text-right">Avg Salary</th>
                    <th className="pb-3 font-medium text-right">Budget</th>
                  </tr>
                </thead>
                <tbody>
                  {departmentMetrics.map((dept, index) => (
                    <tr key={index} className="border-b border-slate-700/30">
                      <td className="py-3 text-white font-medium">{dept.department}</td>
                      <td className="py-3 text-right text-slate-300">{dept.headcount}</td>
                      <td className="py-3 text-right text-amber-400">{dept.openPositions}</td>
                      <td className="py-3 text-right text-slate-300">
                        ${dept.avgSalary.toLocaleString()}
                      </td>
                      <td
                        className={`py-3 text-right font-semibold ${
                          dept.budgetVariance > 0
                            ? 'text-red-400'
                            : dept.budgetVariance < 0
                              ? 'text-emerald-400'
                              : 'text-slate-400'
                        }`}
                      >
                        {dept.budgetVariance > 0 ? '+' : ''}
                        {dept.budgetVariance.toFixed(1)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Leave Analytics */}
          <Card title="Leave Analytics" className="lg:col-span-1">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-slate-400 text-xs border-b border-slate-700/50">
                    <th className="pb-3 font-medium">Leave Type</th>
                    <th className="pb-3 font-medium text-right">Entitled</th>
                    <th className="pb-3 font-medium text-right">Taken</th>
                    <th className="pb-3 font-medium text-right">Pending</th>
                    <th className="pb-3 font-medium text-right">Utilization</th>
                  </tr>
                </thead>
                <tbody>
                  {leaveAnalytics.map((leave, index) => (
                    <tr key={index} className="border-b border-slate-700/30">
                      <td className="py-3 text-white font-medium">{leave.leaveType}</td>
                      <td className="py-3 text-right text-slate-300">{leave.totalEntitlement}d</td>
                      <td className="py-3 text-right text-slate-300">{leave.totalTaken}d</td>
                      <td className="py-3 text-right text-amber-400">{leave.totalPending}d</td>
                      <td className="py-3">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-slate-700 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full ${
                                leave.utilizationRate > 90
                                  ? 'bg-red-500'
                                  : leave.utilizationRate > 70
                                    ? 'bg-amber-500'
                                    : 'bg-blue-500'
                              }`}
                              style={{ width: `${Math.min(leave.utilizationRate, 100)}%` }}
                            />
                          </div>
                          <span className="text-slate-300 text-xs">
                            {leave.utilizationRate.toFixed(0)}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        {/* Payroll Summary */}
        <Card title="Payroll Summary" className="mb-6">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-slate-400 text-xs border-b border-slate-700/50">
                  <th className="pb-3 font-medium">Period</th>
                  <th className="pb-3 font-medium text-right">Gross Payroll</th>
                  <th className="pb-3 font-medium text-right">Net Payroll</th>
                  <th className="pb-3 font-medium text-right">Tax Deductions</th>
                  <th className="pb-3 font-medium text-right">KiwiSaver</th>
                  <th className="pb-3 font-medium text-right">Employees</th>
                  <th className="pb-3 font-medium text-right">Avg Gross</th>
                </tr>
              </thead>
              <tbody>
                {payrollSummaries.map((payroll, index) => (
                  <tr key={index} className="border-b border-slate-700/30">
                    <td className="py-3 text-white font-medium">{payroll.period}</td>
                    <td className="py-3 text-right text-slate-300">
                      ${payroll.grossPayroll.toLocaleString()}
                    </td>
                    <td className="py-3 text-right text-emerald-400 font-semibold">
                      ${payroll.netPayroll.toLocaleString()}
                    </td>
                    <td className="py-3 text-right text-slate-300">
                      ${payroll.taxDeductions.toLocaleString()}
                    </td>
                    <td className="py-3 text-right text-slate-300">
                      ${payroll.kiwiSaverDeductions.toLocaleString()}
                    </td>
                    <td className="py-3 text-right text-slate-300">{payroll.employeeCount}</td>
                    <td className="py-3 text-right text-slate-300">
                      ${payroll.avgGrossPay.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Compliance Alerts */}
        {complianceAlerts.length > 0 && (
          <Card title="Compliance Alerts" className="mb-6">
            <div className="space-y-3">
              {complianceAlerts.map(alert => (
                <div
                  key={alert.alertId}
                  className={`p-4 rounded-lg border ${
                    alert.severity === 'HIGH'
                      ? 'bg-red-500/10 border-red-500/30'
                      : alert.severity === 'MEDIUM'
                        ? 'bg-amber-500/10 border-amber-500/30'
                        : 'bg-slate-700/30 border-slate-600/30'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className={`px-2 py-0.5 rounded text-xs font-medium ${
                            alert.severity === 'HIGH'
                              ? 'bg-red-500/20 text-red-400'
                              : alert.severity === 'MEDIUM'
                                ? 'bg-amber-500/20 text-amber-400'
                                : 'bg-slate-600/20 text-slate-400'
                          }`}
                        >
                          {alert.severity}
                        </span>
                        <span className="text-white font-medium">{alert.type}</span>
                      </div>
                      <p className="text-slate-300 text-sm">{alert.description}</p>
                      <p className="text-slate-400 text-xs mt-1">
                        {alert.affectedEmployees} employee{alert.affectedEmployees !== 1 ? 's' : ''}{' '}
                        affected
                        {alert.dueDate && ` • Due: ${new Date(alert.dueDate).toLocaleDateString()}`}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Export Options */}
        <Card title="Export Reports">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button
              onClick={() => exportReport('employee-metrics')}
              className="flex items-center justify-between p-4 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors group"
            >
              <div className="flex items-center gap-3">
                <UserGroupIcon className="h-5 w-5 text-blue-400" />
                <span className="text-white font-medium">Employee Metrics</span>
              </div>
              <ArrowDownTrayIcon className="h-5 w-5 text-slate-400 group-hover:text-white transition-colors" />
            </button>

            <button
              onClick={() => exportReport('leave-analytics')}
              className="flex items-center justify-between p-4 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors group"
            >
              <div className="flex items-center gap-3">
                <CalendarIcon className="h-5 w-5 text-emerald-400" />
                <span className="text-white font-medium">Leave Analytics</span>
              </div>
              <ArrowDownTrayIcon className="h-5 w-5 text-slate-400 group-hover:text-white transition-colors" />
            </button>

            <button
              onClick={() => exportReport('payroll-summary')}
              className="flex items-center justify-between p-4 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors group"
            >
              <div className="flex items-center gap-3">
                <CurrencyDollarIcon className="h-5 w-5 text-purple-400" />
                <span className="text-white font-medium">Payroll Summary</span>
              </div>
              <ArrowDownTrayIcon className="h-5 w-5 text-slate-400 group-hover:text-white transition-colors" />
            </button>
          </div>
        </Card>
      </main>
    </div>
  );
}
