/**
 * Payroll Dashboard Page
 *
 * Overview of payroll status and recent activity
 */

import { Header } from '@/components/shared/Header';
import { Card } from '@/components/shared/Card';
import { usePayrollPeriods, usePayrollRuns } from '@/services/api';
import { BanknotesIcon, CalendarIcon, UsersIcon } from '@heroicons/react/24/outline';

export default function PayrollDashboardPage() {
  const { data: periods = [] } = usePayrollPeriods();
  const { data: runs = [] } = usePayrollRuns(5);

  const currentPeriod = periods.find(
    (p: any) => !p.payrollRunId && new Date(p.periodStartDate) <= new Date()
  );
  const nextPeriod = periods.find((p: any) => new Date(p.periodStartDate) > new Date());
  const lastRun = runs[0];

  return (
    <div className="min-h-screen">
      <Header />
      <main className="w-full px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Payroll Dashboard</h1>
          <p className="text-gray-400">Overview of payroll processing and status</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card variant="glass" className="p-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-primary-500/20 flex items-center justify-center">
                <CalendarIcon className="h-6 w-6 text-primary-400" />
              </div>
              <div>
                <p className="text-gray-400 text-sm">Current Period</p>
                <p className="text-xl font-semibold text-white">
                  {currentPeriod
                    ? `${currentPeriod.periodStartDate} to ${currentPeriod.periodEndDate}`
                    : 'N/A'}
                </p>
              </div>
            </div>
          </Card>
          <Card variant="glass" className="p-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-green-500/20 flex items-center justify-center">
                <BanknotesIcon className="h-6 w-6 text-green-400" />
              </div>
              <div>
                <p className="text-gray-400 text-sm">Last Pay Run</p>
                <p className="text-xl font-semibold text-white">
                  {lastRun ? `$${lastRun.totalNetPay.toLocaleString()}` : 'N/A'}
                </p>
              </div>
            </div>
          </Card>
          <Card variant="glass" className="p-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-blue-500/20 flex items-center justify-center">
                <UsersIcon className="h-6 w-6 text-blue-400" />
              </div>
              <div>
                <p className="text-gray-400 text-sm">Active Employees</p>
                <p className="text-xl font-semibold text-white">
                  {lastRun ? lastRun.employeeCount : '-'}
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* Payroll Periods */}
        <Card variant="glass" className="p-6 mb-8">
          <h2 className="text-xl font-semibold text-white mb-4">Upcoming Pay Periods</h2>
          <div className="space-y-3">
            {periods.slice(0, 5).map((period: any) => (
              <div
                key={period.periodId}
                className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg"
              >
                <div>
                  <p className="text-white font-medium">{period.periodName}</p>
                  <p className="text-sm text-gray-400">
                    {period.periodStartDate} - {period.periodEndDate} (Pay: {period.payDate})
                  </p>
                </div>
                {period.payrollRunId ? (
                  <span className="px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-sm">
                    Processed
                  </span>
                ) : (
                  <span className="px-3 py-1 bg-yellow-500/20 text-yellow-400 rounded-full text-sm">
                    Pending
                  </span>
                )}
              </div>
            ))}
          </div>
        </Card>

        {/* Recent Payroll Runs */}
        <Card variant="glass" className="p-6">
          <h2 className="text-xl font-semibold text-white mb-4">Recent Payroll Runs</h2>
          <div className="space-y-3">
            {runs.map((run: any) => (
              <div
                key={run.payrollRunId}
                className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg"
              >
                <div>
                  <p className="text-white font-medium">Run #{run.runNumber}</p>
                  <p className="text-sm text-gray-400">
                    {run.employeeCount} employees • ${run.totalGrossPay.toLocaleString()} gross
                  </p>
                </div>
                <span className="px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-sm">
                  {run.status}
                </span>
              </div>
            ))}
            {runs.length === 0 && (
              <p className="text-center text-gray-400 py-8">No payroll runs yet</p>
            )}
          </div>
        </Card>
      </main>
    </div>
  );
}
