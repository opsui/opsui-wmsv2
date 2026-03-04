/**
 * Timesheets Page
 *
 * Manage timesheet entry and approval.
 *
 * ============================================================================
 * AESTHETIC DIRECTION: TIME FLOW
 * ============================================================================
 * Time-tracking inspired interface with elegant flow:
 * - Indigo/violet gradients representing time's passage
 * - Clock-inspired accents and calendar grid patterns
 * - Staggered card animations with smooth transitions
 * - Monospace typography for time data precision
 * - Gentle glow effects on interactive elements
 * ============================================================================
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '@/components/shared/Header';
import { Breadcrumb } from '@/components/shared';
import { Button } from '@/components/shared/Button';
import { Card } from '@/components/shared/Card';
import { useTimesheets, useMyTimesheets } from '@/services/api';
import {
  CheckCircleIcon,
  ClockIcon,
  XCircleIcon,
  CalendarDaysIcon,
} from '@heroicons/react/24/outline';

export default function TimesheetsPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'pending' | 'my' | 'all'>('pending');
  const { data: pendingTimesheets = [] } = useTimesheets({ status: 'SUBMITTED' });
  const { data: myTimesheets = [] } = useMyTimesheets();
  const { data: allTimesheets = [] } = useTimesheets();

  const timesheets =
    activeTab === 'pending' ? pendingTimesheets : activeTab === 'my' ? myTimesheets : allTimesheets;

  return (
    <div className="min-h-screen relative">
      {/* Atmospheric background - Time Flow theme */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-gradient-to-bl from-purple-500/8 to-violet-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-1/4 w-[500px] h-[500px] bg-gradient-to-tr from-purple-500/6 to-violet-600/4 rounded-full blur-3xl" />
        <div className="absolute top-1/2 right-1/4 w-80 h-80 bg-gradient-to-l from-fuchsia-400/4 to-transparent rounded-full blur-3xl" />
        {/* Calendar grid pattern overlay */}
        <div
          className="absolute inset-0 opacity-[0.015]"
          style={{
            backgroundImage: `linear-gradient(rgba(168, 85, 247, 0.3) 1px, transparent 1px),
                              linear-gradient(90deg, rgba(168, 85, 247, 0.3) 1px, transparent 1px)`,
            backgroundSize: '48px 48px',
          }}
        />
      </div>

      <Header />
      <Breadcrumb />
      <main className="w-full px-4 sm:px-6 lg:px-8 py-8 relative z-10">
        {/* Page Header - Time Flow Design */}
        <div className="mb-10">
          <div className="flex flex-col mobile:flex-row mobile:items-end justify-between gap-6">
            <div className="flex flex-col mobile:items-center gap-5 mobile:gap-5 w-full mobile:w-auto">
              <div className="flex items-center gap-5">
                <div className="relative">
                  {/* Outer ring animation */}
                  <div className="absolute inset-0 bg-purple-500/20 rounded-2xl animate-pulse" />
                  {/* Main icon container */}
                  <div className="relative p-4 bg-gradient-to-br from-purple-500/25 to-violet-500/15 rounded-2xl border border-purple-500/40 shadow-lg shadow-purple-500/20 backdrop-blur-sm">
                    <CalendarDaysIcon className="h-9 w-9 text-purple-400" />
                  </div>
                  {/* Corner accent */}
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-gradient-to-br from-purple-400 to-violet-400 rounded-full shadow-lg shadow-purple-400/50" />
                </div>
                <div>
                  <h1 className="text-3xl mobile:text-4xl font-bold text-gray-900 dark:text-white tracking-tight">
                    Timesheets
                  </h1>
                  <p className="mt-1.5 text-gray-500 dark:text-gray-400 text-sm tracking-wide">
                    Track time with precision
                  </p>
                </div>
              </div>

              {/* Mobile: Pending indicator and button below title, Desktop: separate */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mobile:hidden w-full">
                {/* Pending indicator */}
                {pendingTimesheets.length > 0 && (
                  <div className="flex items-center gap-3 px-4 py-2.5 bg-gradient-to-r from-amber-500/10 to-transparent rounded-xl border border-amber-500/20">
                    <div className="relative">
                      <div className="w-2.5 h-2.5 bg-amber-400 rounded-full" />
                      <div className="absolute inset-0 w-2.5 h-2.5 bg-amber-400 rounded-full animate-ping" />
                    </div>
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
                      {pendingTimesheets.length} Pending
                    </span>
                  </div>
                )}

                <Button
                  onClick={() => navigate('/hr/timesheets/new')}
                  className="whitespace-nowrap bg-gradient-to-r from-purple-500 to-violet-500 hover:from-purple-600 hover:to-violet-600 shadow-lg shadow-purple-500/20"
                >
                  <ClockIcon className="h-5 w-5 mr-2" />
                  New Timesheet
                </Button>
              </div>
            </div>

            {/* Desktop: Pending indicator and button on the right */}
            <div className="hidden mobile:flex items-center gap-4">
              {/* Pending indicator */}
              {pendingTimesheets.length > 0 && (
                <div className="flex items-center gap-3 px-4 py-2.5 bg-gradient-to-r from-amber-500/10 to-transparent rounded-xl border border-amber-500/20">
                  <div className="relative">
                    <div className="w-2.5 h-2.5 bg-amber-400 rounded-full" />
                    <div className="absolute inset-0 w-2.5 h-2.5 bg-amber-400 rounded-full animate-ping" />
                  </div>
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
                    {pendingTimesheets.length} Pending
                  </span>
                </div>
              )}

              <Button
                onClick={() => navigate('/hr/timesheets/new')}
                className="whitespace-nowrap bg-gradient-to-r from-purple-500 to-violet-500 hover:from-purple-600 hover:to-violet-600 shadow-lg shadow-purple-500/20"
              >
                <ClockIcon className="h-5 w-5 mr-2" />
                New Timesheet
              </Button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-8 border-b border-gray-200 dark:border-gray-800">
          <div className="flex gap-1">
            <button
              onClick={e => {
                e.stopPropagation();
                setActiveTab('pending');
              }}
              className={`relative px-5 py-3 font-medium text-sm transition-all rounded-t-lg ${
                activeTab === 'pending'
                  ? 'text-purple-600 dark:text-purple-400 bg-white dark:bg-gray-900/50 border-b-2 border-purple-500'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/50'
              }`}
            >
              <span className="flex items-center gap-2">
                Pending Approval
                {pendingTimesheets.length > 0 && (
                  <span className="px-2 py-0.5 bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 rounded-full text-xs font-semibold">
                    {pendingTimesheets.length}
                  </span>
                )}
              </span>
            </button>
            <button
              onClick={e => {
                e.stopPropagation();
                setActiveTab('my');
              }}
              className={`relative px-5 py-3 font-medium text-sm transition-all rounded-t-lg ${
                activeTab === 'my'
                  ? 'text-purple-600 dark:text-purple-400 bg-white dark:bg-gray-900/50 border-b-2 border-purple-500'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/50'
              }`}
            >
              My Timesheets
            </button>
            <button
              onClick={e => {
                e.stopPropagation();
                setActiveTab('all');
              }}
              className={`relative px-5 py-3 font-medium text-sm transition-all rounded-t-lg ${
                activeTab === 'all'
                  ? 'text-purple-600 dark:text-purple-400 bg-white dark:bg-gray-900/50 border-b-2 border-purple-500'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/50'
              }`}
            >
              All Timesheets
            </button>
          </div>
        </div>

        {/* Timesheets Grid */}
        {timesheets.length === 0 ? (
          <div className="text-center py-16">
            <div className="inline-flex flex-col items-center p-8 bg-white dark:bg-gray-900/80 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700/50">
              <div className="p-4 bg-gradient-to-br from-purple-100 to-violet-50 dark:from-purple-900/30 dark:to-violet-900/20 rounded-2xl mb-4">
                <ClockIcon className="h-12 w-12 text-purple-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                No timesheets found
              </h3>
              <p className="text-gray-500 dark:text-gray-400 max-w-sm">
                {activeTab === 'pending'
                  ? 'All caught up! No pending timesheets to review.'
                  : 'No timesheets have been recorded yet.'}
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {timesheets.map((timesheet: any, index: number) => (
              <div
                key={timesheet.timesheetId}
                className="group animate-in fade-in slide-in-from-bottom-4 duration-500"
                style={{ animationDelay: `${Math.min(index * 50, 300)}ms` }}
              >
                <Card
                  variant="glass"
                  className="p-6 border border-gray-200/50 dark:border-gray-700/30 hover:border-purple-500/30 dark:hover:border-purple-500/20 transition-all hover:shadow-lg hover:shadow-purple-500/5"
                >
                  {/* Card Header */}
                  <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                      <CalendarDaysIcon className="h-4 w-4 text-purple-400" />
                      <span className="font-medium">
                        {timesheet.periodStartDate} - {timesheet.periodEndDate}
                      </span>
                    </div>
                    {/* Status Badge */}
                    <span
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border ${
                        timesheet.status === 'SUBMITTED'
                          ? 'bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-900/30 dark:to-yellow-900/20 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-500/30'
                          : timesheet.status === 'APPROVED'
                            ? 'bg-gradient-to-r from-emerald-50 to-green-50 dark:from-emerald-900/30 dark:to-green-900/20 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/30'
                            : timesheet.status === 'REJECTED'
                              ? 'bg-gradient-to-r from-red-50 to-rose-50 dark:from-red-900/30 dark:to-rose-900/20 text-red-700 dark:text-red-300 border-red-200 dark:border-red-500/30'
                              : 'bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/20 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-500/30'
                      }`}
                    >
                      {timesheet.status === 'SUBMITTED' && <ClockIcon className="h-3.5 w-3.5" />}
                      {timesheet.status === 'APPROVED' && (
                        <CheckCircleIcon className="h-3.5 w-3.5" />
                      )}
                      {timesheet.status === 'REJECTED' && <XCircleIcon className="h-3.5 w-3.5" />}
                      {timesheet.status}
                    </span>
                  </div>

                  {/* Employee Name */}
                  {timesheet.employeeName && (
                    <div className="mb-4">
                      <span className="text-lg font-semibold text-gray-900 dark:text-white">
                        {timesheet.employeeName}
                      </span>
                    </div>
                  )}

                  {/* Hours Summary */}
                  <div className="space-y-3 mb-5 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-500 dark:text-gray-400 text-sm">
                        Regular Hours
                      </span>
                      <span className="text-gray-900 dark:text-white font-medium font-mono">
                        {timesheet.totalRegularHours?.toFixed(1) || '0.0'}h
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-500 dark:text-gray-400 text-sm">
                        Overtime Hours
                      </span>
                      <span className="text-gray-900 dark:text-white font-medium font-mono">
                        {timesheet.totalOvertimeHours?.toFixed(1) || '0.0'}h
                      </span>
                    </div>
                    <div className="pt-2 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center">
                      <span className="text-gray-600 dark:text-gray-300 text-sm font-medium">
                        Total Hours
                      </span>
                      <span className="text-lg font-bold bg-gradient-to-r from-purple-600 to-violet-600 dark:from-purple-400 dark:to-violet-400 bg-clip-text text-transparent font-mono">
                        {timesheet.totalHours?.toFixed(1) || '0.0'}h
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  {activeTab === 'pending' && (
                    <div className="flex gap-3 pt-4 border-t border-gray-100 dark:border-gray-800">
                      <Button
                        variant="secondary"
                        size="sm"
                        fullWidth
                        className="hover:bg-purple-50 dark:hover:bg-purple-900/20 hover:text-purple-600 dark:hover:text-purple-400 hover:border-purple-200 dark:hover:border-purple-500/30"
                      >
                        Review
                      </Button>
                    </div>
                  )}
                </Card>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
