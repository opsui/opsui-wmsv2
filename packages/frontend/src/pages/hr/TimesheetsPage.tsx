/**
 * Timesheets Page
 *
 * Manage timesheet entry and approval
 */

import { useState } from 'react';
import { Header } from '@/components/shared/Header';
import { Button } from '@/components/shared/Button';
import { Card } from '@/components/shared/Card';
import { useTimesheets, useMyTimesheets } from '@/services/api';
import { CheckCircleIcon, ClockIcon, XCircleIcon } from '@heroicons/react/24/outline';

export default function TimesheetsPage() {
  const [activeTab, setActiveTab] = useState<'pending' | 'my' | 'all'>('pending');
  const { data: pendingTimesheets = [] } = useTimesheets({ status: 'SUBMITTED' });
  const { data: myTimesheets = [] } = useMyTimesheets();
  const { data: allTimesheets = [] } = useTimesheets();

  const timesheets =
    activeTab === 'pending' ? pendingTimesheets : activeTab === 'my' ? myTimesheets : allTimesheets;

  return (
    <div className="min-h-screen">
      <Header />
      <main className="w-full px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Timesheets</h1>
          <p className="text-gray-400">Manage time tracking and timesheet approval</p>
        </div>

        {/* Tabs */}
        <div className="mb-6 border-b border-white/10">
          <div className="flex gap-4">
            <button
              onClick={() => setActiveTab('pending')}
              className={`px-4 py-2 border-b-2 font-medium transition-colors ${
                activeTab === 'pending'
                  ? 'border-primary-500 text-white'
                  : 'border-transparent text-gray-400 hover:text-white'
              }`}
            >
              Pending Approval ({pendingTimesheets.length})
            </button>
            <button
              onClick={() => setActiveTab('my')}
              className={`px-4 py-2 border-b-2 font-medium transition-colors ${
                activeTab === 'my'
                  ? 'border-primary-500 text-white'
                  : 'border-transparent text-gray-400 hover:text-white'
              }`}
            >
              My Timesheets
            </button>
            <button
              onClick={() => setActiveTab('all')}
              className={`px-4 py-2 border-b-2 font-medium transition-colors ${
                activeTab === 'all'
                  ? 'border-primary-500 text-white'
                  : 'border-transparent text-gray-400 hover:text-white'
              }`}
            >
              All Timesheets
            </button>
          </div>
        </div>

        {/* Timesheets */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {timesheets.map((timesheet: any) => (
            <Card key={timesheet.timesheetId} variant="glass" className="p-5">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm text-gray-400">
                  {timesheet.periodStartDate} - {timesheet.periodEndDate}
                </span>
                <span
                  className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                    timesheet.status === 'SUBMITTED'
                      ? 'bg-yellow-500/20 text-yellow-400'
                      : timesheet.status === 'APPROVED'
                        ? 'bg-green-500/20 text-green-400'
                        : timesheet.status === 'REJECTED'
                          ? 'bg-red-500/20 text-red-400'
                          : 'bg-blue-500/20 text-blue-400'
                  }`}
                >
                  {timesheet.status === 'SUBMITTED' && <ClockIcon className="h-3 w-3" />}
                  {timesheet.status === 'APPROVED' && <CheckCircleIcon className="h-3 w-3" />}
                  {timesheet.status === 'REJECTED' && <XCircleIcon className="h-3 w-3" />}
                  {timesheet.status}
                </span>
              </div>
              <div className="space-y-2 mb-4">
                <div className="flex justify-between">
                  <span className="text-gray-400">Regular Hours:</span>
                  <span className="text-white">{timesheet.totalRegularHours}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Overtime Hours:</span>
                  <span className="text-white">{timesheet.totalOvertimeHours}</span>
                </div>
                <div className="flex justify-between font-semibold">
                  <span className="text-gray-400">Total Hours:</span>
                  <span className="text-primary-400">{timesheet.totalHours}</span>
                </div>
              </div>
              {activeTab === 'pending' && (
                <div className="flex gap-2 pt-4 border-t border-white/10">
                  <Button variant="secondary" size="sm" fullWidth>
                    Review
                  </Button>
                </div>
              )}
            </Card>
          ))}
        </div>

        {timesheets.length === 0 && (
          <Card className="p-12 text-center">
            <ClockIcon className="h-16 w-16 mx-auto mb-4 text-gray-600" />
            <h3 className="text-xl font-semibold text-white mb-2">No timesheets found</h3>
            <p className="text-gray-400">
              {activeTab === 'pending'
                ? 'No pending timesheets to review'
                : 'No timesheets available'}
            </p>
          </Card>
        )}
      </main>
    </div>
  );
}
