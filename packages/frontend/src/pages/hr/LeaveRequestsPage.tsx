/**
 * Leave Requests Page
 *
 * Manage leave requests and approvals
 */

import { useState } from 'react';
import { Header } from '@/components/shared/Header';
import { Button } from '@/components/shared/Button';
import { Card } from '@/components/shared/Card';
import { useLeaveRequests, useLeaveBalances } from '@/services/api';
import { CalendarDaysIcon, CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline';

export default function LeaveRequestsPage() {
  const [activeTab, setActiveTab] = useState<'pending' | 'balances'>('pending');
  const { data: requests = [] } = useLeaveRequests({ status: 'PENDING' });
  const { data: balances = [] } = useLeaveBalances();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <Header />
      <main className="w-full px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Leave Management</h1>
          <p className="text-gray-400">Manage leave requests and balances</p>
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
              Pending Requests ({requests.length})
            </button>
            <button
              onClick={() => setActiveTab('balances')}
              className={`px-4 py-2 border-b-2 font-medium transition-colors ${
                activeTab === 'balances'
                  ? 'border-primary-500 text-white'
                  : 'border-transparent text-gray-400 hover:text-white'
              }`}
            >
              Leave Balances
            </button>
          </div>
        </div>

        {activeTab === 'pending' ? (
          // Pending Requests
          <>
            {requests.length === 0 ? (
              <Card className="p-12 text-center">
                <CalendarDaysIcon className="h-16 w-16 mx-auto mb-4 text-gray-600" />
                <h3 className="text-xl font-semibold text-white mb-2">No pending requests</h3>
                <p className="text-gray-400">All leave requests have been processed</p>
              </Card>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                {requests.map((request: any) => (
                  <Card key={request.requestId} variant="glass" className="p-5">
                    <div className="mb-4">
                      <p className="text-white font-medium">
                        {request.startDate} - {request.endDate}
                      </p>
                      <p className="text-sm text-gray-400">
                        {request.totalDays} days ({request.totalHours} hours)
                      </p>
                    </div>
                    <div className="mb-4">
                      <p className="text-gray-400 text-sm">Reason:</p>
                      <p className="text-white">{request.reason || 'No reason provided'}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        fullWidth
                        onClick={() => {
                          /* Approve */
                        }}
                      >
                        <CheckCircleIcon className="h-4 w-4 mr-1" />
                        Approve
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          /* Decline */
                        }}
                      >
                        <XCircleIcon className="h-4 w-4 text-red-400" />
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </>
        ) : (
          // Leave Balances
          <>
            {balances.length === 0 ? (
              <Card className="p-12 text-center">
                <CalendarDaysIcon className="h-16 w-16 mx-auto mb-4 text-gray-600" />
                <h3 className="text-xl font-semibold text-white mb-2">No leave balances</h3>
                <p className="text-gray-400">Leave balance information not available</p>
              </Card>
            ) : (
              <Card variant="glass" className="p-6">
                <h2 className="text-xl font-semibold text-white mb-4">Leave Balances</h2>
                <div className="space-y-3">
                  {balances.map((balance: any) => (
                    <div
                      key={balance.balanceId}
                      className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg"
                    >
                      <div>
                        <p className="text-white font-medium">
                          {balance.leaveType?.name || 'Leave Type'}
                        </p>
                        <p className="text-sm text-gray-400">
                          YTD: {balance.ytdAccrued} accrued / {balance.ytdTaken} taken
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-primary-400">
                          {balance.currentBalance}
                        </p>
                        <p className="text-xs text-gray-400">hours remaining</p>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </>
        )}
      </main>
    </div>
  );
}
