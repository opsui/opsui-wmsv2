/**
 * Timesheet Entry Page
 *
 * Page for employees and managers to enter and approve timesheets
 * Supports weekly timesheet entry with regular hours, overtime, and break tracking
 */

import { useState, useEffect } from 'react';
import { useNavigate, Link, useParams } from 'react-router-dom';
import {
  ArrowLeftIcon,
  PlusIcon,
  MinusIcon,
  CheckIcon,
  XMarkIcon,
  ClockIcon,
  CalendarIcon,
  UserIcon,
  DocumentTextIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';
import { Header } from '@/components/shared/Header';
import { Card } from '@/components/shared/Card';

interface TimesheetEntry {
  entryId?: string;
  workDate: string;
  regularHours: number;
  overtime1_5Hours: number;
  overtime2_0Hours: number;
  breakMinutes: number;
  notes?: string;
}

interface Timesheet {
  timesheetId: string;
  employeeId: string;
  employeeName: string;
  weekStartDate: string;
  weekEndDate: string;
  totalRegularHours: number;
  totalOvertime1_5Hours: number;
  totalOvertime2_0Hours: number;
  totalHours: number;
  status: 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'PAID';
  submittedDate?: string;
  approvedBy?: string;
  approvedDate?: string;
  rejectionReason?: string;
  entries: TimesheetEntry[];
}

interface Employee {
  employeeId: string;
  firstName: string;
  lastName: string;
  employeeNumber?: string;
}

export default function TimesheetEntryPage() {
  const { timesheetId } = useParams();
  const navigate = useNavigate();
  const [timesheet, setTimesheet] = useState<Timesheet | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [weekStart, setWeekStart] = useState(() => {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const diff = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
    const monday = new Date(now.setDate(diff));
    return monday.toISOString().split('T')[0];
  });
  const [loading, setLoading] = useState(false);
  const [isManager, setIsManager] = useState(false);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');

  useEffect(() => {
    if (timesheetId) {
      fetchTimesheet();
    } else {
      // Check if user is manager
      const userRole = localStorage.getItem('userRole');
      setIsManager(userRole === 'ADMIN' || userRole === 'SUPERVISOR' || userRole === 'ACCOUNTING');
      if (isManager) {
        fetchEmployees();
      }
    }
  }, [timesheetId, weekStart]);

  const fetchTimesheet = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/hr/timesheets/${timesheetId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      if (response.ok) {
        const data = await response.json();
        setTimesheet(data);
      }
    } catch (error) {
      console.error('Error fetching timesheet:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployees = async () => {
    try {
      const response = await fetch('/api/hr/employees?status=ACTIVE', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      if (response.ok) {
        const data = await response.json();
        setEmployees(data);
      }
    } catch (error) {
      console.error('Error fetching employees:', error);
    }
  };

  const loadEmployeeTimesheet = async () => {
    if (!selectedEmployeeId) return;

    setLoading(true);
    try {
      const response = await fetch(
        `/api/hr/timesheets/employee/${selectedEmployeeId}?weekStart=${weekStart}`,
        {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        }
      );
      if (response.ok) {
        const data = await response.json();
        if (data) {
          setTimesheet(data);
        } else {
          // Create new timesheet
          createNewTimesheet();
        }
      } else {
        createNewTimesheet();
      }
    } catch (error) {
      console.error('Error loading timesheet:', error);
    } finally {
      setLoading(false);
    }
  };

  const createNewTimesheet = () => {
    const weekStartObj = new Date(weekStart);
    const weekEndObj = new Date(weekStartObj);
    weekEndObj.setDate(weekEndObj.getDate() + 6);

    const entries: TimesheetEntry[] = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(weekStartObj);
      date.setDate(date.getDate() + i);
      entries.push({
        workDate: date.toISOString().split('T')[0],
        regularHours: 0,
        overtime1_5Hours: 0,
        overtime2_0Hours: 0,
        breakMinutes: 0,
      });
    }

    setTimesheet({
      timesheetId: '',
      employeeId: selectedEmployeeId,
      employeeName:
        employees.find(e => e.employeeId === selectedEmployeeId)?.firstName +
          ' ' +
          employees.find(e => e.employeeId === selectedEmployeeId)?.lastName || '',
      weekStartDate: weekStart,
      weekEndDate: weekEndObj.toISOString().split('T')[0],
      totalRegularHours: 0,
      totalOvertime1_5Hours: 0,
      totalOvertime2_0Hours: 0,
      totalHours: 0,
      status: 'DRAFT',
      entries,
    });
  };

  const updateEntry = (index: number, field: keyof TimesheetEntry, value: string | number) => {
    if (!timesheet || timesheet.status !== 'DRAFT') return;

    const newEntries = [...timesheet.entries];
    newEntries[index] = { ...newEntries[index], [field]: value };

    const totalRegular = newEntries.reduce((sum, e) => sum + (e.regularHours || 0), 0);
    const totalOT1_5 = newEntries.reduce((sum, e) => sum + (e.overtime1_5Hours || 0), 0);
    const totalOT2_0 = newEntries.reduce((sum, e) => sum + (e.overtime2_0Hours || 0), 0);

    setTimesheet({
      ...timesheet,
      entries: newEntries,
      totalRegularHours: totalRegular,
      totalOvertime1_5Hours: totalOT1_5,
      totalOvertime2_0Hours: totalOT2_0,
      totalHours: totalRegular + totalOT1_5 + totalOT2_0,
    });
  };

  const saveTimesheet = async () => {
    if (!timesheet) return;

    setLoading(true);
    try {
      const method = timesheet.timesheetId ? 'PUT' : 'POST';
      const url = timesheet.timesheetId
        ? `/api/hr/timesheets/${timesheet.timesheetId}`
        : '/api/hr/timesheets';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify(timesheet),
      });

      if (response.ok) {
        const data = await response.json();
        setTimesheet(data);
        alert('Timesheet saved successfully');
      }
    } catch (error) {
      console.error('Error saving timesheet:', error);
      alert('Error saving timesheet');
    } finally {
      setLoading(false);
    }
  };

  const submitTimesheet = async () => {
    if (!timesheet || !timesheet.timesheetId) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/hr/timesheets/${timesheet.timesheetId}/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setTimesheet(data);
        alert('Timesheet submitted for approval');
      }
    } catch (error) {
      console.error('Error submitting timesheet:', error);
      alert('Error submitting timesheet');
    } finally {
      setLoading(false);
    }
  };

  const approveTimesheet = async () => {
    if (!timesheet || !timesheet.timesheetId) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/hr/timesheets/${timesheet.timesheetId}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setTimesheet(data);
        alert('Timesheet approved');
      }
    } catch (error) {
      console.error('Error approving timesheet:', error);
      alert('Error approving timesheet');
    } finally {
      setLoading(false);
    }
  };

  const rejectTimesheet = async () => {
    if (!timesheet || !timesheet.timesheetId) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/hr/timesheets/${timesheet.timesheetId}/reject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ rejectionReason }),
      });

      if (response.ok) {
        const data = await response.json();
        setTimesheet(data);
        setRejectModalOpen(false);
        setRejectionReason('');
        alert('Timesheet rejected');
      }
    } catch (error) {
      console.error('Error rejecting timesheet:', error);
      alert('Error rejecting timesheet');
    } finally {
      setLoading(false);
    }
  };

  const getDayName = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { weekday: 'short' });
  };

  const getDayNumber = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.getDate();
  };

  if (loading && !timesheet) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  const isEditable = timesheet?.status === 'DRAFT';
  const canApprove = isManager && timesheet?.status === 'SUBMITTED';
  const canSubmit = timesheet?.status === 'DRAFT';

  return (
    <div className="min-h-screen">
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/hr/timesheets')}
              className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
            >
              <ArrowLeftIcon className="h-5 w-5 text-slate-400" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-white">
                {timesheetId ? 'Edit Timesheet' : 'New Timesheet'}
              </h1>
              {timesheet && <p className="text-slate-400 text-sm">{timesheet.employeeName}</p>}
            </div>
          </div>

          {timesheet && (
            <div className="flex items-center gap-3">
              <span
                className={`px-3 py-1 rounded-full text-sm font-medium ${
                  timesheet.status === 'DRAFT'
                    ? 'bg-slate-500/20 text-slate-400'
                    : timesheet.status === 'SUBMITTED'
                      ? 'bg-amber-500/20 text-amber-400'
                      : timesheet.status === 'APPROVED'
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : timesheet.status === 'REJECTED'
                          ? 'bg-red-500/20 text-red-400'
                          : 'bg-blue-500/20 text-blue-400'
                }`}
              >
                {timesheet.status}
              </span>

              {timesheet.approvedBy && (
                <span className="text-slate-400 text-sm">Approved by {timesheet.approvedBy}</span>
              )}
            </div>
          )}
        </div>

        {/* Manager View - Select Employee and Week */}
        {isManager && !timesheetId && (
          <Card title="Select Timesheet" className="mb-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-slate-400 text-sm mb-2">Employee</label>
                <select
                  value={selectedEmployeeId}
                  onChange={e => setSelectedEmployeeId(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white"
                >
                  <option value="">Select Employee</option>
                  {employees.map(emp => (
                    <option key={emp.employeeId} value={emp.employeeId}>
                      {emp.firstName} {emp.lastName}{' '}
                      {emp.employeeNumber && `(${emp.employeeNumber})`}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-400 text-sm mb-2">Week Start</label>
                <input
                  type="date"
                  value={weekStart}
                  onChange={e => setWeekStart(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white"
                />
              </div>

              <div className="flex items-end">
                <button
                  onClick={loadEmployeeTimesheet}
                  disabled={!selectedEmployeeId}
                  className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 text-white rounded-lg font-medium transition-colors"
                >
                  Load Timesheet
                </button>
              </div>
            </div>
          </Card>
        )}

        {timesheet && (
          <>
            {/* Week Summary */}
            <div className="mb-6 grid grid-cols-1 md:grid-cols-5 gap-4">
              <Card title="Week Period" className="bg-slate-800/50">
                <p className="text-white text-sm font-medium">
                  {new Date(timesheet.weekStartDate).toLocaleDateString()} -{' '}
                  {new Date(timesheet.weekEndDate).toLocaleDateString()}
                </p>
              </Card>

              <Card title="Regular Hours" className="bg-slate-800/50">
                <p className="text-blue-400 text-2xl font-bold">
                  {timesheet.totalRegularHours.toFixed(1)}h
                </p>
              </Card>

              <Card title="Overtime 1.5x" className="bg-slate-800/50">
                <p className="text-amber-400 text-2xl font-bold">
                  {timesheet.totalOvertime1_5Hours.toFixed(1)}h
                </p>
              </Card>

              <Card title="Overtime 2.0x" className="bg-slate-800/50">
                <p className="text-purple-400 text-2xl font-bold">
                  {timesheet.totalOvertime2_0Hours.toFixed(1)}h
                </p>
              </Card>

              <Card title="Total Hours" className="bg-slate-800/50">
                <p className="text-emerald-400 text-2xl font-bold">
                  {timesheet.totalHours.toFixed(1)}h
                </p>
              </Card>
            </div>

            {/* Timesheet Grid */}
            <Card title="Time Entry" className="mb-6">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-left text-slate-400 text-xs border-b border-slate-700/50">
                      <th className="pb-3 font-medium w-24">Day</th>
                      <th className="pb-3 font-medium w-16">Date</th>
                      <th className="pb-3 font-medium">Regular Hours</th>
                      <th className="pb-3 font-medium">OT 1.5x</th>
                      <th className="pb-3 font-medium">OT 2.0x</th>
                      <th className="pb-3 font-medium">Break (min)</th>
                      <th className="pb-3 font-medium">Total</th>
                      <th className="pb-3 font-medium">Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {timesheet.entries.map((entry, index) => {
                      const total =
                        (entry.regularHours || 0) +
                        (entry.overtime1_5Hours || 0) +
                        (entry.overtime2_0Hours || 0);
                      return (
                        <tr key={index} className="border-b border-slate-700/30">
                          <td className="py-3">
                            <span className="text-white font-medium">
                              {getDayName(entry.workDate)}
                            </span>
                          </td>
                          <td className="py-3">
                            <span className="text-slate-400">{getDayNumber(entry.workDate)}</span>
                          </td>
                          <td className="py-3">
                            {isEditable ? (
                              <input
                                type="number"
                                min="0"
                                max="24"
                                step="0.5"
                                value={entry.regularHours || 0}
                                onChange={e =>
                                  updateEntry(
                                    index,
                                    'regularHours',
                                    parseFloat(e.target.value) || 0
                                  )
                                }
                                className="w-20 bg-slate-800 border border-slate-700 rounded px-2 py-1 text-white text-sm"
                              />
                            ) : (
                              <span className="text-slate-300">{entry.regularHours}h</span>
                            )}
                          </td>
                          <td className="py-3">
                            {isEditable ? (
                              <input
                                type="number"
                                min="0"
                                max="12"
                                step="0.5"
                                value={entry.overtime1_5Hours || 0}
                                onChange={e =>
                                  updateEntry(
                                    index,
                                    'overtime1_5Hours',
                                    parseFloat(e.target.value) || 0
                                  )
                                }
                                className="w-20 bg-slate-800 border border-slate-700 rounded px-2 py-1 text-white text-sm"
                              />
                            ) : (
                              <span className="text-slate-300">{entry.overtime1_5Hours}h</span>
                            )}
                          </td>
                          <td className="py-3">
                            {isEditable ? (
                              <input
                                type="number"
                                min="0"
                                max="12"
                                step="0.5"
                                value={entry.overtime2_0Hours || 0}
                                onChange={e =>
                                  updateEntry(
                                    index,
                                    'overtime2_0Hours',
                                    parseFloat(e.target.value) || 0
                                  )
                                }
                                className="w-20 bg-slate-800 border border-slate-700 rounded px-2 py-1 text-white text-sm"
                              />
                            ) : (
                              <span className="text-slate-300">{entry.overtime2_0Hours}h</span>
                            )}
                          </td>
                          <td className="py-3">
                            {isEditable ? (
                              <input
                                type="number"
                                min="0"
                                max="120"
                                step="5"
                                value={entry.breakMinutes || 0}
                                onChange={e =>
                                  updateEntry(index, 'breakMinutes', parseInt(e.target.value) || 0)
                                }
                                className="w-20 bg-slate-800 border border-slate-700 rounded px-2 py-1 text-white text-sm"
                              />
                            ) : (
                              <span className="text-slate-300">{entry.breakMinutes}m</span>
                            )}
                          </td>
                          <td className="py-3">
                            <span className="text-white font-semibold">{total.toFixed(1)}h</span>
                          </td>
                          <td className="py-3">
                            {isEditable ? (
                              <input
                                type="text"
                                value={entry.notes || ''}
                                onChange={e => updateEntry(index, 'notes', e.target.value)}
                                placeholder="Add notes..."
                                className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-white text-sm"
                              />
                            ) : (
                              <span className="text-slate-400 text-sm">{entry.notes || '-'}</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>

            {/* Actions */}
            <div className="flex items-center justify-between">
              <div className="flex gap-3">
                {isEditable && (
                  <>
                    <button
                      onClick={saveTimesheet}
                      disabled={loading}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
                    >
                      <ArrowPathIcon className="h-4 w-4" />
                      Save Draft
                    </button>
                    {canSubmit && (
                      <button
                        onClick={submitTimesheet}
                        disabled={loading}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
                      >
                        <CheckIcon className="h-4 w-4" />
                        Submit for Approval
                      </button>
                    )}
                  </>
                )}
              </div>

              {canApprove && (
                <div className="flex gap-3">
                  <button
                    onClick={() => setRejectModalOpen(true)}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
                  >
                    <XMarkIcon className="h-4 w-4" />
                    Reject
                  </button>
                  <button
                    onClick={approveTimesheet}
                    disabled={loading}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
                  >
                    <CheckIcon className="h-4 w-4" />
                    Approve
                  </button>
                </div>
              )}
            </div>

            {/* Audit Trail */}
            {(timesheet.submittedDate || timesheet.approvedDate) && (
              <Card title="Audit Trail" className="mt-6">
                <div className="space-y-2 text-sm">
                  {timesheet.submittedDate && (
                    <div className="flex items-center gap-2 text-slate-300">
                      <DocumentTextIcon className="h-4 w-4" />
                      <span>Submitted on {new Date(timesheet.submittedDate).toLocaleString()}</span>
                    </div>
                  )}
                  {timesheet.approvedDate && (
                    <div className="flex items-center gap-2 text-slate-300">
                      <CheckIcon className="h-4 w-4" />
                      <span>
                        Approved by {timesheet.approvedBy} on{' '}
                        {new Date(timesheet.approvedDate).toLocaleString()}
                      </span>
                    </div>
                  )}
                  {timesheet.rejectionReason && (
                    <div className="flex items-center gap-2 text-red-400">
                      <XMarkIcon className="h-4 w-4" />
                      <span>Rejection reason: {timesheet.rejectionReason}</span>
                    </div>
                  )}
                </div>
              </Card>
            )}
          </>
        )}

        {/* Reject Modal */}
        {rejectModalOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-slate-800 rounded-lg p-6 max-w-md w-full mx-4 border border-slate-700">
              <h3 className="text-lg font-semibold text-white mb-4">Reject Timesheet</h3>
              <p className="text-slate-400 text-sm mb-4">
                Please provide a reason for rejecting this timesheet.
              </p>
              <textarea
                value={rejectionReason}
                onChange={e => setRejectionReason(e.target.value)}
                placeholder="Enter rejection reason..."
                rows={3}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white mb-4"
              />
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => {
                    setRejectModalOpen(false);
                    setRejectionReason('');
                  }}
                  className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg"
                >
                  Cancel
                </button>
                <button
                  onClick={rejectTimesheet}
                  disabled={!rejectionReason.trim() || loading}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-slate-700 text-white rounded-lg"
                >
                  Reject Timesheet
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
