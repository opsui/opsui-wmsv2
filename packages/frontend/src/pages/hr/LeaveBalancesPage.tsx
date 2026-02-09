/**
 * Leave Balances Page
 *
 * Page for viewing and managing employee leave balances
 * Shows leave entitlements, taken, pending requests, and available balances
 */

import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeftIcon,
  PlusIcon,
  CalendarIcon,
  ClockIcon,
  CheckIcon,
  XMarkIcon,
  UserIcon,
  ChartBarIcon,
} from '@heroicons/react/24/outline';
import { Header } from '@/components/shared/Header';
import { Card } from '@/components/shared/Card';

interface LeaveBalance {
  leaveType: string;
  leaveTypeId: string;
  annualEntitlement: number;
  taken: number;
  pending: number;
  available: number;
  accrualRate: number;
  yearToDate: number;
}

interface LeaveRequest {
  requestId: string;
  employeeId: string;
  employeeName: string;
  leaveTypeId: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  days: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
  requestedDate: string;
  reason?: string;
  notes?: string;
}

interface Employee {
  employeeId: string;
  firstName: string;
  lastName: string;
  employeeNumber?: string;
  department?: string;
  status: string;
}

export default function LeaveBalancesPage() {
  const navigate = useNavigate();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [leaveBalances, setLeaveBalances] = useState<LeaveBalance[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'balances' | 'requests'>('balances');
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [isManager, setIsManager] = useState(false);

  // New request form
  const [newRequest, setNewRequest] = useState({
    leaveTypeId: '',
    startDate: '',
    endDate: '',
    reason: '',
  });

  useEffect(() => {
    const userRole = localStorage.getItem('userRole');
    setIsManager(userRole === 'ADMIN' || userRole === 'SUPERVISOR' || userRole === 'ACCOUNTING');

    fetchEmployees();
  }, []);

  useEffect(() => {
    if (selectedEmployeeId) {
      fetchLeaveBalances();
      fetchLeaveRequests();
    }
  }, [selectedEmployeeId]);

  const fetchEmployees = async () => {
    try {
      const response = await fetch('/api/hr/employees?status=ACTIVE', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      if (response.ok) {
        const data = await response.json();
        setEmployees(data);
        // Auto-select current user's employee record if not manager
        const currentUserId = localStorage.getItem('userId');
        const currentUser = data.find((e: Employee) => e.userId === currentUserId);
        if (currentUser && !isManager) {
          setSelectedEmployeeId(currentUser.employeeId);
        }
      }
    } catch (error) {
      console.error('Error fetching employees:', error);
    }
  };

  const fetchLeaveBalances = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/hr/employees/${selectedEmployeeId}/leave-balances`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      if (response.ok) {
        const data = await response.json();
        setLeaveBalances(data);
      }
    } catch (error) {
      console.error('Error fetching leave balances:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchLeaveRequests = async () => {
    try {
      const response = await fetch(`/api/hr/employees/${selectedEmployeeId}/leave-requests`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      if (response.ok) {
        const data = await response.json();
        setLeaveRequests(data);
      }
    } catch (error) {
      console.error('Error fetching leave requests:', error);
    }
  };

  const createLeaveRequest = async () => {
    if (
      !selectedEmployeeId ||
      !newRequest.leaveTypeId ||
      !newRequest.startDate ||
      !newRequest.endDate
    ) {
      alert('Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/hr/leave-requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          employeeId: selectedEmployeeId,
          leaveTypeId: newRequest.leaveTypeId,
          startDate: newRequest.startDate,
          endDate: newRequest.endDate,
          reason: newRequest.reason,
        }),
      });

      if (response.ok) {
        alert('Leave request submitted successfully');
        setShowRequestModal(false);
        setNewRequest({ leaveTypeId: '', startDate: '', endDate: '', reason: '' });
        fetchLeaveBalances();
        fetchLeaveRequests();
      } else {
        const error = await response.json();
        alert(error.error || 'Error creating leave request');
      }
    } catch (error) {
      console.error('Error creating leave request:', error);
      alert('Error creating leave request');
    } finally {
      setLoading(false);
    }
  };

  const approveRequest = async (requestId: string) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/hr/leave-requests/${requestId}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (response.ok) {
        fetchLeaveBalances();
        fetchLeaveRequests();
      }
    } catch (error) {
      console.error('Error approving request:', error);
    } finally {
      setLoading(false);
    }
  };

  const rejectRequest = async (requestId: string) => {
    const reason = prompt('Enter rejection reason:');
    if (!reason) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/hr/leave-requests/${requestId}/reject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ rejectionReason: reason }),
      });

      if (response.ok) {
        fetchLeaveBalances();
        fetchLeaveRequests();
      }
    } catch (error) {
      console.error('Error rejecting request:', error);
    } finally {
      setLoading(false);
    }
  };

  const cancelRequest = async (requestId: string) => {
    if (!confirm('Are you sure you want to cancel this leave request?')) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/hr/leave-requests/${requestId}/cancel`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });

      if (response.ok) {
        fetchLeaveBalances();
        fetchLeaveRequests();
      }
    } catch (error) {
      console.error('Error cancelling request:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateDays = () => {
    if (!newRequest.startDate || !newRequest.endDate) return 0;
    const start = new Date(newRequest.startDate);
    const end = new Date(newRequest.endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return diffDays;
  };

  const selectedEmployee = employees.find(e => e.employeeId === selectedEmployeeId);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
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
              <h1 className="text-2xl font-bold text-white">Leave Management</h1>
              <p className="text-slate-400 text-sm">View balances and manage leave requests</p>
            </div>
          </div>

          {selectedEmployeeId && (
            <button
              onClick={() => setShowRequestModal(true)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
            >
              <PlusIcon className="h-4 w-4" />
              New Request
            </button>
          )}
        </div>

        {/* Employee Selection */}
        <Card className="mb-6">
          <div className="flex items-center gap-4">
            <UserIcon className="h-5 w-5 text-slate-400" />
            <select
              value={selectedEmployeeId}
              onChange={e => setSelectedEmployeeId(e.target.value)}
              className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white"
            >
              <option value="">Select Employee</option>
              {employees.map(emp => (
                <option key={emp.employeeId} value={emp.employeeId}>
                  {emp.firstName} {emp.lastName} {emp.employeeNumber && `(${emp.employeeNumber})`}
                  {emp.department && ` - ${emp.department}`}
                </option>
              ))}
            </select>
          </div>
        </Card>

        {selectedEmployeeId && (
          <>
            {/* Quick Stats */}
            <div className="mb-6 grid grid-cols-1 md:grid-cols-4 gap-4">
              {leaveBalances.slice(0, 4).map(balance => (
                <Card
                  key={balance.leaveTypeId}
                  title={balance.leaveType}
                  className="bg-slate-800/50"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p
                        className={`text-3xl font-bold ${
                          balance.available > 0 ? 'text-emerald-400' : 'text-red-400'
                        }`}
                      >
                        {balance.available}
                      </p>
                      <p className="text-slate-400 text-xs">days available</p>
                    </div>
                    <div className="text-right">
                      <p className="text-slate-400 text-xs">
                        Entitled: {balance.annualEntitlement}
                      </p>
                      <p className="text-slate-400 text-xs">Taken: {balance.taken}</p>
                      {balance.pending > 0 && (
                        <p className="text-amber-400 text-xs">Pending: {balance.pending}</p>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>

            {/* Tabs */}
            <div className="border-b border-slate-700/50 mb-6">
              <div className="flex gap-2">
                <button
                  onClick={() => setActiveTab('balances')}
                  className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === 'balances'
                      ? 'border-blue-500 text-blue-400'
                      : 'border-transparent text-slate-400 hover:text-slate-300'
                  }`}
                >
                  Leave Balances
                </button>
                <button
                  onClick={() => setActiveTab('requests')}
                  className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === 'requests'
                      ? 'border-blue-500 text-blue-400'
                      : 'border-transparent text-slate-400 hover:text-slate-300'
                  }`}
                >
                  Leave Requests
                  {leaveRequests.filter(r => r.status === 'PENDING').length > 0 && (
                    <span className="ml-2 px-2 py-0.5 bg-amber-500 text-white text-xs rounded-full">
                      {leaveRequests.filter(r => r.status === 'PENDING').length}
                    </span>
                  )}
                </button>
              </div>
            </div>

            {/* Balances Tab */}
            {activeTab === 'balances' && (
              <Card title="Leave Balance Summary">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="text-left text-slate-400 text-xs border-b border-slate-700/50">
                        <th className="pb-3 font-medium">Leave Type</th>
                        <th className="pb-3 font-medium text-right">Annual Entitlement</th>
                        <th className="pb-3 font-medium text-right">Taken</th>
                        <th className="pb-3 font-medium text-right">Pending</th>
                        <th className="pb-3 font-medium text-right">Available</th>
                        <th className="pb-3 font-medium text-right">YTD</th>
                        <th className="pb-3 font-medium">Usage</th>
                      </tr>
                    </thead>
                    <tbody>
                      {leaveBalances.map(balance => {
                        const usagePercent =
                          balance.annualEntitlement > 0
                            ? (balance.taken / balance.annualEntitlement) * 100
                            : 0;
                        const totalPercent =
                          balance.annualEntitlement > 0
                            ? ((balance.taken + balance.pending) / balance.annualEntitlement) * 100
                            : 0;

                        return (
                          <tr key={balance.leaveTypeId} className="border-b border-slate-700/30">
                            <td className="py-4">
                              <span className="text-white font-medium">{balance.leaveType}</span>
                            </td>
                            <td className="py-4 text-right text-slate-300">
                              {balance.annualEntitlement} days
                            </td>
                            <td className="py-4 text-right text-slate-300">{balance.taken} days</td>
                            <td className="py-4 text-right text-amber-400">
                              {balance.pending} days
                            </td>
                            <td
                              className={`py-4 text-right font-semibold ${
                                balance.available > 0 ? 'text-emerald-400' : 'text-red-400'
                              }`}
                            >
                              {balance.available} days
                            </td>
                            <td className="py-4 text-right text-slate-300">
                              {balance.yearToDate} days
                            </td>
                            <td className="py-4">
                              <div className="w-full bg-slate-700 rounded-full h-2">
                                <div
                                  className={`h-2 rounded-full ${
                                    totalPercent > 90
                                      ? 'bg-red-500'
                                      : totalPercent > 70
                                        ? 'bg-amber-500'
                                        : 'bg-blue-500'
                                  }`}
                                  style={{ width: `${Math.min(totalPercent, 100)}%` }}
                                />
                              </div>
                              <p className="text-slate-400 text-xs mt-1">
                                {usagePercent.toFixed(0)}% used
                              </p>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}

            {/* Requests Tab */}
            {activeTab === 'requests' && (
              <div className="space-y-6">
                <Card title="Leave Requests">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="text-left text-slate-400 text-xs border-b border-slate-700/50">
                          <th className="pb-3 font-medium">Type</th>
                          <th className="pb-3 font-medium">Period</th>
                          <th className="pb-3 font-medium text-right">Days</th>
                          <th className="pb-3 font-medium">Status</th>
                          <th className="pb-3 font-medium">Requested</th>
                          <th className="pb-3 font-medium text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {leaveRequests.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="py-8 text-center text-slate-400">
                              No leave requests found
                            </td>
                          </tr>
                        ) : (
                          leaveRequests.map(request => (
                            <tr key={request.requestId} className="border-b border-slate-700/30">
                              <td className="py-3">
                                <span className="text-white font-medium">{request.leaveType}</span>
                                {request.reason && (
                                  <p className="text-slate-400 text-xs mt-1">{request.reason}</p>
                                )}
                              </td>
                              <td className="py-3 text-slate-300">
                                <div className="flex items-center gap-2">
                                  <CalendarIcon className="h-4 w-4" />
                                  <span>
                                    {new Date(request.startDate).toLocaleDateString()} -{' '}
                                    {new Date(request.endDate).toLocaleDateString()}
                                  </span>
                                </div>
                              </td>
                              <td className="py-3 text-right text-white font-medium">
                                {request.days} days
                              </td>
                              <td className="py-3">
                                <span
                                  className={`px-2 py-1 rounded text-xs ${
                                    request.status === 'APPROVED'
                                      ? 'bg-emerald-500/20 text-emerald-400'
                                      : request.status === 'PENDING'
                                        ? 'bg-amber-500/20 text-amber-400'
                                        : request.status === 'REJECTED'
                                          ? 'bg-red-500/20 text-red-400'
                                          : 'bg-slate-700/30 text-slate-400'
                                  }`}
                                >
                                  {request.status}
                                </span>
                              </td>
                              <td className="py-3 text-slate-400 text-sm">
                                {new Date(request.requestedDate).toLocaleDateString()}
                              </td>
                              <td className="py-3 text-right">
                                <div className="flex gap-2 justify-end">
                                  {request.status === 'PENDING' && (
                                    <>
                                      {isManager && (
                                        <>
                                          <button
                                            onClick={() => approveRequest(request.requestId)}
                                            className="p-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 rounded transition-colors"
                                            title="Approve"
                                          >
                                            <CheckIcon className="h-4 w-4" />
                                          </button>
                                          <button
                                            onClick={() => rejectRequest(request.requestId)}
                                            className="p-1.5 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded transition-colors"
                                            title="Reject"
                                          >
                                            <XMarkIcon className="h-4 w-4" />
                                          </button>
                                        </>
                                      )}
                                      <button
                                        onClick={() => cancelRequest(request.requestId)}
                                        className="p-1.5 bg-slate-600/20 hover:bg-slate-600/30 text-slate-400 rounded transition-colors"
                                        title="Cancel"
                                      >
                                        <XMarkIcon className="h-4 w-4" />
                                      </button>
                                    </>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </Card>
              </div>
            )}
          </>
        )}

        {/* New Request Modal */}
        {showRequestModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-slate-800 rounded-lg p-6 max-w-md w-full mx-4 border border-slate-700">
              <h3 className="text-lg font-semibold text-white mb-4">New Leave Request</h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-slate-400 text-sm mb-2">Leave Type</label>
                  <select
                    value={newRequest.leaveTypeId}
                    onChange={e => setNewRequest({ ...newRequest, leaveTypeId: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white"
                  >
                    <option value="">Select leave type</option>
                    {leaveBalances.map(balance => (
                      <option key={balance.leaveTypeId} value={balance.leaveTypeId}>
                        {balance.leaveType} ({balance.available} days available)
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-slate-400 text-sm mb-2">Start Date</label>
                    <input
                      type="date"
                      value={newRequest.startDate}
                      onChange={e => setNewRequest({ ...newRequest, startDate: e.target.value })}
                      min={new Date().toISOString().split('T')[0]}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 text-sm mb-2">End Date</label>
                    <input
                      type="date"
                      value={newRequest.endDate}
                      onChange={e => setNewRequest({ ...newRequest, endDate: e.target.value })}
                      min={newRequest.startDate || new Date().toISOString().split('T')[0]}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white"
                    />
                  </div>
                </div>

                {calculateDays() > 0 && (
                  <div className="bg-slate-900 rounded-lg p-3">
                    <p className="text-slate-400 text-sm">
                      Total days requested:{' '}
                      <span className="text-white font-semibold">{calculateDays()}</span>
                    </p>
                  </div>
                )}

                <div>
                  <label className="block text-slate-400 text-sm mb-2">Reason (optional)</label>
                  <textarea
                    value={newRequest.reason}
                    onChange={e => setNewRequest({ ...newRequest, reason: e.target.value })}
                    placeholder="Provide reason for leave request..."
                    rows={2}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white"
                  />
                </div>
              </div>

              <div className="flex gap-3 justify-end mt-6">
                <button
                  onClick={() => {
                    setShowRequestModal(false);
                    setNewRequest({ leaveTypeId: '', startDate: '', endDate: '', reason: '' });
                  }}
                  className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg"
                >
                  Cancel
                </button>
                <button
                  onClick={createLeaveRequest}
                  disabled={
                    !newRequest.leaveTypeId ||
                    !newRequest.startDate ||
                    !newRequest.endDate ||
                    loading
                  }
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 text-white rounded-lg"
                >
                  Submit Request
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
