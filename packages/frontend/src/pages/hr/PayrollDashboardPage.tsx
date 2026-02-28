/**
 * Payroll Dashboard Page
 *
 * Overview of payroll status and recent activity.
 *
 * ============================================================================
 * AESTHETIC DIRECTION: FINANCIAL ELEGANCE
 * ============================================================================
 * Professional financial dashboard with refined design:
 * - Purple gradients for consistent brand identity
 * - Currency-inspired accents and subtle patterns
 * - Clean typography with monospace for financial figures
 * - Staggered card animations with elegant transitions
 * - Gradient status indicators for visual clarity
 * ============================================================================
 */

import { useNavigate } from 'react-router-dom';
import { Header } from '@/components/shared/Header';
import { Breadcrumb, Button } from '@/components/shared';
import { Card } from '@/components/shared/Card';
import { usePayrollPeriods, usePayrollRuns } from '@/services/api';
import {
  BanknotesIcon,
  CalendarIcon,
  UsersIcon,
  ChartBarIcon,
  ArrowRightIcon,
} from '@heroicons/react/24/outline';

export default function PayrollDashboardPage() {
  const navigate = useNavigate();
  const { data: periods = [] } = usePayrollPeriods();
  const { data: runs = [] } = usePayrollRuns(5);

  const currentPeriod = periods.find(
    (p: any) => !p.payrollRunId && new Date(p.periodStartDate) <= new Date()
  );
  const nextPeriod = periods.find((p: any) => new Date(p.periodStartDate) > new Date());
  const lastRun = runs[0];

  // Calculate pending periods count
  const pendingPeriodsCount = periods.filter((p: any) => !p.payrollRunId).length;

  return (
    <div className="min-h-screen relative">
      {/* Atmospheric background - Financial Elegance theme */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/3 w-[600px] h-[600px] bg-gradient-to-br from-purple-500/8 to-violet-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-gradient-to-tl from-fuchsia-500/6 to-purple-600/4 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-0 w-80 h-80 bg-gradient-to-r from-violet-400/4 to-transparent rounded-full blur-3xl" />
        {/* Subtle geometric pattern overlay */}
        <div
          className="absolute inset-0 opacity-[0.012]"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, rgba(168, 85, 247, 0.3) 1px, transparent 0)`,
            backgroundSize: '32px 32px',
          }}
        />
      </div>

      <Header />
      <Breadcrumb />
      <main className="w-full px-4 sm:px-6 lg:px-8 py-8 relative z-10">
        {/* Page Header - Financial Elegance Design */}
        <div className="mb-10">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="flex items-center gap-5">
              <div className="relative">
                {/* Outer ring animation */}
                <div className="absolute inset-0 bg-purple-500/20 rounded-2xl animate-pulse" />
                {/* Main icon container */}
                <div className="relative p-4 bg-gradient-to-br from-purple-500/25 to-violet-500/15 rounded-2xl border border-purple-500/40 shadow-lg shadow-purple-500/20 backdrop-blur-sm">
                  <BanknotesIcon className="h-9 w-9 text-purple-400" />
                </div>
                {/* Corner accent */}
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-gradient-to-br from-purple-400 to-violet-400 rounded-full shadow-lg shadow-purple-400/50" />
              </div>
              <div>
                <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white tracking-tight">
                  Payroll Dashboard
                </h1>
                <p className="mt-1.5 text-gray-500 dark:text-gray-400 text-sm tracking-wide">
                  Financial overview at a glance
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              {/* Pending indicator */}
              {pendingPeriodsCount > 0 && (
                <div className="flex items-center gap-3 px-4 py-2.5 bg-gradient-to-r from-amber-500/10 to-transparent rounded-xl border border-amber-500/20">
                  <div className="relative">
                    <div className="w-2.5 h-2.5 bg-amber-400 rounded-full" />
                    <div className="absolute inset-0 w-2.5 h-2.5 bg-amber-400 rounded-full animate-ping" />
                  </div>
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
                    {pendingPeriodsCount} Pending
                  </span>
                </div>
              )}

              <Button
                onClick={() => navigate('/hr/payroll/process')}
                className="whitespace-nowrap bg-gradient-to-r from-purple-500 to-violet-500 hover:from-purple-600 hover:to-violet-600 shadow-lg shadow-purple-500/20"
              >
                <ChartBarIcon className="h-5 w-5 mr-2" />
                Process Payroll
              </Button>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          {/* Current Period Card */}
          <div
            className="group animate-in fade-in slide-in-from-bottom-4 duration-500"
            style={{ animationDelay: '0ms' }}
          >
            <Card
              variant="glass"
              className="p-6 border border-gray-200/50 dark:border-gray-700/30 hover:border-purple-500/30 dark:hover:border-purple-500/20 transition-all hover:shadow-lg hover:shadow-purple-500/5"
            >
              <div className="flex items-start gap-4">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-purple-400 to-violet-400 rounded-xl blur-sm opacity-50 group-hover:opacity-75 transition-opacity" />
                  <div className="relative h-14 w-14 rounded-xl bg-gradient-to-br from-purple-500 to-violet-500 flex items-center justify-center ring-2 ring-white dark:ring-gray-900 shadow-lg">
                    <CalendarIcon className="h-7 w-7 text-white" />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">
                    Current Period
                  </p>
                  <p className="text-xl font-bold text-gray-900 dark:text-white mt-1 truncate">
                    {currentPeriod
                      ? `${currentPeriod.periodStartDate} → ${currentPeriod.periodEndDate}`
                      : 'N/A'}
                  </p>
                  {currentPeriod && (
                    <p className="text-sm text-purple-600 dark:text-purple-400 mt-1">
                      Pay: {currentPeriod.payDate}
                    </p>
                  )}
                </div>
              </div>
            </Card>
          </div>

          {/* Last Pay Run Card */}
          <div
            className="group animate-in fade-in slide-in-from-bottom-4 duration-500"
            style={{ animationDelay: '50ms' }}
          >
            <Card
              variant="glass"
              className="p-6 border border-gray-200/50 dark:border-gray-700/30 hover:border-purple-500/30 dark:hover:border-purple-500/20 transition-all hover:shadow-lg hover:shadow-purple-500/5"
            >
              <div className="flex items-start gap-4">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-fuchsia-400 to-purple-400 rounded-xl blur-sm opacity-50 group-hover:opacity-75 transition-opacity" />
                  <div className="relative h-14 w-14 rounded-xl bg-gradient-to-br from-fuchsia-500 to-purple-500 flex items-center justify-center ring-2 ring-white dark:ring-gray-900 shadow-lg">
                    <BanknotesIcon className="h-7 w-7 text-white" />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">
                    Last Pay Run
                  </p>
                  <p className="text-xl font-bold bg-gradient-to-r from-fuchsia-600 to-purple-600 dark:from-fuchsia-400 dark:to-purple-400 bg-clip-text text-transparent mt-1 font-mono">
                    {lastRun ? `$${lastRun.totalNetPay?.toLocaleString() || '0'}` : 'N/A'}
                  </p>
                  {lastRun && (
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      Net pay • {lastRun.employeeCount} employees
                    </p>
                  )}
                </div>
              </div>
            </Card>
          </div>

          {/* Active Employees Card */}
          <div
            className="group animate-in fade-in slide-in-from-bottom-4 duration-500"
            style={{ animationDelay: '100ms' }}
          >
            <Card
              variant="glass"
              className="p-6 border border-gray-200/50 dark:border-gray-700/30 hover:border-violet-500/30 dark:hover:border-violet-500/20 transition-all hover:shadow-lg hover:shadow-violet-500/5"
            >
              <div className="flex items-start gap-4">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-violet-400 to-purple-400 rounded-xl blur-sm opacity-50 group-hover:opacity-75 transition-opacity" />
                  <div className="relative h-14 w-14 rounded-xl bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center ring-2 ring-white dark:ring-gray-900 shadow-lg">
                    <UsersIcon className="h-7 w-7 text-white" />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">
                    Active Employees
                  </p>
                  <p className="text-xl font-bold text-gray-900 dark:text-white mt-1 font-mono">
                    {lastRun ? lastRun.employeeCount : '-'}
                  </p>
                  {lastRun?.totalGrossPay && (
                    <p className="text-sm text-violet-600 dark:text-violet-400 mt-1">
                      ${lastRun.totalGrossPay.toLocaleString()} gross
                    </p>
                  )}
                </div>
              </div>
            </Card>
          </div>
        </div>

        {/* Payroll Periods */}
        <div className="mb-10">
          <Card variant="glass" className="p-6 border border-gray-200/50 dark:border-gray-700/30">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Upcoming Pay Periods
              </h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/hr/payroll/process')}
                className="text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20"
              >
                Process
                <ArrowRightIcon className="h-4 w-4 ml-1" />
              </Button>
            </div>
            <div className="space-y-3">
              {periods.slice(0, 5).map((period: any, index: number) => (
                <div
                  key={period.periodId}
                  className="group flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-700/50 hover:border-purple-200 dark:hover:border-purple-500/30 transition-all"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-gradient-to-br from-gray-100 to-gray-50 dark:from-gray-700 dark:to-gray-800 text-gray-600 dark:text-gray-300 font-mono text-sm font-semibold">
                      #{index + 1}
                    </div>
                    <div>
                      <p className="text-gray-900 dark:text-white font-semibold">
                        {period.periodName}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {period.periodStartDate} → {period.periodEndDate}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right hidden sm:block">
                      <p className="text-sm text-gray-500 dark:text-gray-400">Pay Date</p>
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        {period.payDate}
                      </p>
                    </div>
                    {period.payrollRunId ? (
                      <span className="px-3 py-1.5 bg-gradient-to-r from-emerald-50 to-green-50 dark:from-emerald-900/30 dark:to-green-900/20 text-emerald-700 dark:text-emerald-300 rounded-full text-xs font-semibold border border-emerald-200 dark:border-emerald-500/30">
                        Processed
                      </span>
                    ) : (
                      <span className="px-3 py-1.5 bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-900/30 dark:to-yellow-900/20 text-amber-700 dark:text-amber-300 rounded-full text-xs font-semibold border border-amber-200 dark:border-amber-500/30">
                        Pending
                      </span>
                    )}
                  </div>
                </div>
              ))}
              {periods.length === 0 && (
                <div className="text-center py-8">
                  <p className="text-gray-400 dark:text-gray-500">No pay periods configured</p>
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Recent Payroll Runs */}
        <div>
          <Card variant="glass" className="p-6 border border-gray-200/50 dark:border-gray-700/30">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Recent Payroll Runs
              </h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/hr/payroll/runs')}
                className="text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20"
              >
                View All
                <ArrowRightIcon className="h-4 w-4 ml-1" />
              </Button>
            </div>
            <div className="space-y-3">
              {runs.map((run: any) => (
                <div
                  key={run.payrollRunId}
                  className="group flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-700/50 hover:border-purple-200 dark:hover:border-purple-500/30 transition-all cursor-pointer"
                  onClick={() => navigate(`/hr/payroll/runs/${run.payrollRunId}`)}
                >
                  <div className="flex items-center gap-4">
                    <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-gradient-to-br from-purple-100 to-violet-50 dark:from-purple-900/30 dark:to-violet-900/20 text-purple-600 dark:text-purple-400">
                      <BanknotesIcon className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-gray-900 dark:text-white font-semibold">
                        Run #{run.runNumber}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {run.employeeCount} employees
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-lg font-bold font-mono bg-gradient-to-r from-purple-600 to-violet-600 dark:from-purple-400 dark:to-violet-400 bg-clip-text text-transparent">
                        ${run.totalGrossPay?.toLocaleString() || '0'}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">gross pay</p>
                    </div>
                    <span className="px-3 py-1.5 bg-gradient-to-r from-emerald-50 to-green-50 dark:from-emerald-900/30 dark:to-green-900/20 text-emerald-700 dark:text-emerald-300 rounded-full text-xs font-semibold border border-emerald-200 dark:border-emerald-500/30">
                      {run.status}
                    </span>
                  </div>
                </div>
              ))}
              {runs.length === 0 && (
                <div className="text-center py-12">
                  <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-2xl inline-block mb-4">
                    <BanknotesIcon className="h-10 w-10 text-gray-400" />
                  </div>
                  <p className="text-gray-500 dark:text-gray-400 font-medium">
                    No payroll runs yet
                  </p>
                  <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                    Process your first payroll to see history here
                  </p>
                </div>
              )}
            </div>
          </Card>
        </div>
      </main>
    </div>
  );
}
