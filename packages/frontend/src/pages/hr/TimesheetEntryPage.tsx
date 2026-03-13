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
import { Card, CardHeader, CardTitle } from '@/components/shared/Card';
import { hrApi } from '@/services/api';
import { useUIStore } from '@/stores/uiStore';

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

/**
 * Transform database entries (with workType) to UI format (separate hour fields)
 */
const transformDbEntriesToUiFormat = (dbEntries: any[]): TimesheetEntry[] => {
  const entriesByDate: Record<string, TimesheetEntry> = {};

  for (const dbEntry of dbEntries) {
    const dateKey = new Date(dbEntry.workDate).toISOString().split('T')[0];

    if (!entriesByDate[dateKey]) {
      entriesByDate[dateKey] = {
        workDate: dateKey,
        regularHours: 0,
        overtime1_5Hours: 0,
        overtime2_0Hours: 0,
        breakMinutes: dbEntry.breakHours ? Math.round(dbEntry.breakHours * 60) : 0,
        notes: dbEntry.description || '',
      };
    }

    switch (dbEntry.workType) {
      case 'REGULAR':
        entriesByDate[dateKey].regularHours += dbEntry.hoursWorked;
        break;
      case 'OVERTIME_1_5':
        entriesByDate[dateKey].overtime1_5Hours += dbEntry.hoursWorked;
        break;
      case 'OVERTIME_2_0':
        entriesByDate[dateKey].overtime2_0Hours += dbEntry.hoursWorked;
        break;
    }
  }

  return Object.values(entriesByDate).sort((a, b) =>
    a.workDate.localeCompare(b.workDate)
  );
};

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

  // Get theme from UI store
  const theme = useUIStore(state => state.theme);

  // Helper to determine if we're in light mode
  const isLightMode = () => {
    if (theme === 'light') return true;
    if (theme === 'dark') return false;
    // Auto mode - check system preference
    return window.matchMedia('(prefers-color-scheme: light)').matches;
  };

  useEffect(() => {
    const initPage = async () => {
      if (timesheetId) {
        await fetchTimesheet();
      } else {
        // Check if user is manager
        const userRole = localStorage.getItem('userRole');
        const isMgr = userRole === 'ADMIN' || userRole === 'HR_MANAGER' || userRole === 'HR_ADMIN';
        setIsManager(isMgr);

        if (isMgr) {
          await fetchEmployees();
        } else {
          // Regular employee - auto-load their timesheet for current week
          await loadCurrentUserTimesheet();
        }
      }
    };

    initPage();
  }, [timesheetId, weekStart]);

  const fetchTimesheet = async () => {
    setLoading(true);
    try {
      const data = await hrApi.getTimesheet(timesheetId);
      const uiEntries = transformDbEntriesToUiFormat(data.entries || []);
      setTimesheet({
        ...data,
        entries: uiEntries,
      });
    } catch (error) {
      console.error('Error fetching timesheet:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployees = async () => {
    try {
      const data = await hrApi.getEmployees({ status: 'ACTIVE' });
      setEmployees(data);
    } catch (error) {
      console.error('Error fetching employees:', error);
    }
  };

  const loadCurrentUserTimesheet = async () => {
    setLoading(true);
    try {
      // Get current user's email from auth storage
      let userEmail = '';
      try {
        const storage = localStorage.getItem('wms-auth-storage');
        if (storage) {
          const parsed = JSON.parse(storage);
          userEmail = parsed.state.user?.email || '';
        }
      } catch (e) {
        // Ignore storage parsing errors
      }

      // Get current user's employee ID
      const employees = await hrApi.getEmployees({ status: 'ACTIVE' });
      const currentEmployee = employees.find((e: any) => e.email === userEmail);

      let currentEmployeeId = '';
      if (currentEmployee) {
        currentEmployeeId = currentEmployee.employeeId;
        setSelectedEmployeeId(currentEmployeeId);
      }

      // Then try to load the timesheet
      const data = await hrApi.getMyCurrentTimesheet(weekStart);
      if (data && data.timesheetId) {
        const uiEntries = transformDbEntriesToUiFormat(data.entries || []);
        setTimesheet({
          ...data,
          entries: uiEntries,
        });
      } else {
        createNewTimesheet();
      }
    } catch (error) {
      console.error('Error loading timesheet:', error);
      createNewTimesheet();
    } finally {
      setLoading(false);
    }
  };

  const loadEmployeeTimesheet = async () => {
    if (!selectedEmployeeId) return;

    setLoading(true);
    try {
      const data = await hrApi.getEmployeeTimesheetForWeek(selectedEmployeeId, weekStart);
      if (data && data.timesheetId) {
        const uiEntries = transformDbEntriesToUiFormat(data.entries || []);
        setTimesheet({
          ...data,
          entries: uiEntries,
        });
      } else {
        createNewTimesheet();
      }
    } catch (error) {
      console.error('Error loading timesheet:', error);
      createNewTimesheet();
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
      employeeId: selectedEmployeeId || '',
      employeeName: isManager
        ? (employees.find(e => e.employeeId === selectedEmployeeId)?.firstName +
            ' ' +
            employees.find(e => e.employeeId === selectedEmployeeId)?.lastName || '')
        : 'My Timesheet',
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
      const data = await hrApi.saveDraftTimesheet({
        timesheetId: timesheet.timesheetId || undefined,
        employeeId: timesheet.employeeId,
        weekStartDate: timesheet.weekStartDate,
        entries: timesheet.entries,
      });
      const uiEntries = transformDbEntriesToUiFormat(data.entries || []);
      setTimesheet({
        ...data,
        entries: uiEntries,
      });
      alert('Timesheet saved successfully');
    } catch (error) {
      console.error('Error saving timesheet:', error);
      alert(`Error saving timesheet: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const submitTimesheet = async () => {
    if (!timesheet) return;

    setLoading(true);
    try {
      // First save the draft
      const savedData = await hrApi.saveDraftTimesheet({
        timesheetId: timesheet.timesheetId || undefined,
        employeeId: timesheet.employeeId,
        weekStartDate: timesheet.weekStartDate,
        entries: timesheet.entries,
      });

      // Then submit it for approval
      if (savedData.timesheetId) {
        const data = await hrApi.submitDraftTimesheet(savedData.timesheetId);
        const uiEntries = transformDbEntriesToUiFormat(data.entries || []);
        setTimesheet({
          ...data,
          entries: uiEntries,
        });
        alert('Timesheet submitted for approval');
      }
    } catch (error) {
      console.error('Error submitting timesheet:', error);
      alert(`Error submitting timesheet: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const approveTimesheet = async () => {
    if (!timesheet || !timesheet.timesheetId) return;

    setLoading(true);
    try {
      const data = await hrApi.approveTimesheet(timesheet.timesheetId);
      setTimesheet(data);
      alert('Timesheet approved');
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
      const data = await hrApi.rejectTimesheet(timesheet.timesheetId, rejectionReason);
      setTimesheet(data);
      setRejectModalOpen(false);
      setRejectionReason('');
      alert('Timesheet rejected');
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

  const goToPreviousWeek = () => {
    const currentWeekStart = new Date(weekStart);
    currentWeekStart.setDate(currentWeekStart.getDate() - 7);
    setWeekStart(currentWeekStart.toISOString().split('T')[0]);
  };

  const goToNextWeek = () => {
    const currentWeekStart = new Date(weekStart);
    currentWeekStart.setDate(currentWeekStart.getDate() + 7);
    setWeekStart(currentWeekStart.toISOString().split('T')[0]);
  };

  const goToToday = () => {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const diff = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
    const monday = new Date(now.setDate(diff));
    setWeekStart(monday.toISOString().split('T')[0]);
  };

  if (loading && !timesheet) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  const isEditable = timesheet?.status === 'DRAFT';
  const canApprove = isManager && timesheet?.status === 'SUBMITTED';
  const canSubmit = timesheet?.status === 'DRAFT';

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/hr/timesheets')}
              className="p-2 hover:bg-gray-200 dark:hover:bg-slate-800 rounded-lg transition-colors"
            >
              <ArrowLeftIcon className="h-5 w-5 text-gray-500 dark:text-slate-400" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                {timesheetId ? 'Edit Timesheet' : 'New Timesheet'}
              </h1>
              {timesheet && <p className="text-gray-500 dark:text-slate-400 text-sm">{timesheet.employeeName}</p>}
            </div>
          </div>

          {timesheet && (
            <div className="flex items-center gap-3">
              <span
                className={`px-3 py-1 rounded-full text-sm font-medium ${
                  timesheet.status === 'DRAFT'
                    ? 'bg-gray-200 dark:bg-slate-500/20 text-gray-600 dark:text-slate-400'
                    : timesheet.status === 'SUBMITTED'
                      ? 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400'
                      : timesheet.status === 'APPROVED'
                        ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400'
                        : timesheet.status === 'REJECTED'
                          ? 'bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400'
                          : 'bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400'
                }`}
              >
                {timesheet.status}
              </span>

              {timesheet.approvedBy && (
                <span className="text-gray-500 dark:text-slate-400 text-sm">Approved by {timesheet.approvedBy}</span>
              )}
            </div>
          )}
        </div>

        {/* Manager View - Select Employee and Week */}
        {isManager && !timesheetId && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Select Timesheet</CardTitle>
            </CardHeader>
            <div className="space-y-4">
              <div>
                <label className="block text-gray-600 dark:text-slate-400 text-sm mb-2">Employee</label>
                <select
                  value={selectedEmployeeId}
                  onChange={e => setSelectedEmployeeId(e.target.value)}
                  className="w-full bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-lg px-4 py-2 text-gray-900 dark:text-white"
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
                <label className="block text-gray-600 dark:text-slate-400 text-sm mb-2">Week Start (includes future weeks)</label>
                <div className="flex gap-2">
                  <button
                    onClick={goToPreviousWeek}
                    className="px-3 py-2 bg-gray-200 dark:bg-slate-700 hover:bg-gray-300 dark:hover:bg-slate-600 text-gray-900 dark:text-white rounded-lg transition-colors"
                    title="Previous week"
                  >
                    <MinusIcon className="h-4 w-4" />
                  </button>
                  <input
                    type="date"
                    value={weekStart}
                    onChange={e => setWeekStart(e.target.value)}
                    className="flex-1 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-lg px-4 py-2 text-gray-900 dark:text-white"
                  />
                  <button
                    onClick={goToNextWeek}
                    className="px-3 py-2 bg-gray-200 dark:bg-slate-700 hover:bg-gray-300 dark:hover:bg-slate-600 text-gray-900 dark:text-white rounded-lg transition-colors"
                    title="Next week"
                  >
                    <PlusIcon className="h-4 w-4" />
                  </button>
                  <button
                    onClick={goToToday}
                    className="px-3 py-2 bg-gray-200 dark:bg-slate-700 hover:bg-gray-300 dark:hover:bg-slate-600 text-gray-900 dark:text-white rounded-lg transition-colors text-sm"
                    title="Go to current week"
                  >
                    Today
                  </button>
                </div>
              </div>

              <button
                onClick={loadEmployeeTimesheet}
                disabled={!selectedEmployeeId}
                className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 dark:disabled:bg-slate-700 text-white rounded-lg font-medium transition-colors"
              >
                Load Timesheet
              </button>
            </div>
          </Card>
        )}

        {timesheet && (
          <>
            {/* Week Navigator - for easy navigation between weeks including future weeks */}
            {!timesheetId && (
              <div className="mb-6 flex items-center justify-center gap-4">
                <button
                  onClick={goToPreviousWeek}
                  className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-900 dark:text-white rounded-lg transition-colors border border-gray-300 dark:border-slate-700"
                >
                  <MinusIcon className="h-4 w-4" />
                  Previous Week
                </button>
                <button
                  onClick={goToToday}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                >
                  <CalendarIcon className="h-4 w-4" />
                  Current Week
                </button>
                <button
                  onClick={goToNextWeek}
                  className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-900 dark:text-white rounded-lg transition-colors border border-gray-300 dark:border-slate-700"
                >
                  Next Week
                  <PlusIcon className="h-4 w-4" />
                </button>
              </div>
            )}

            {/* Week Summary */}
            <div className="mb-6 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
              {/* Week Period - no navigation buttons */}
              <Card className="bg-gray-100 dark:bg-slate-800/50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-gray-600 dark:text-slate-400">Week Period</CardTitle>
                </CardHeader>
                <p className="text-gray-900 dark:text-white text-sm font-medium text-center">
                  {new Date(timesheet.weekStartDate).toLocaleDateString()} -{' '}
                  {new Date(timesheet.weekEndDate).toLocaleDateString()}
                </p>
              </Card>

              <Card className="bg-gray-100 dark:bg-slate-800/50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-gray-600 dark:text-slate-400">Regular Hours</CardTitle>
                </CardHeader>
                <p className="!text-blue-600 dark:!text-blue-400 text-2xl font-bold">
                  {timesheet.totalRegularHours.toFixed(1)}h
                </p>
              </Card>

              <Card className="bg-gray-100 dark:bg-slate-800/50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-gray-600 dark:text-slate-400">Overtime 1.5x</CardTitle>
                </CardHeader>
                <p className="!text-amber-600 dark:!text-amber-400 text-2xl font-bold">
                  {timesheet.totalOvertime1_5Hours.toFixed(1)}h
                </p>
              </Card>

              <Card className="bg-gray-100 dark:bg-slate-800/50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-gray-600 dark:text-slate-400">Overtime 2.0x</CardTitle>
                </CardHeader>
                <p className="!text-purple-600 dark:!text-purple-400 text-2xl font-bold">
                  {timesheet.totalOvertime2_0Hours.toFixed(1)}h
                </p>
              </Card>

              <Card className="bg-gray-100 dark:bg-slate-800/50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-gray-600 dark:text-slate-400">Total Hours</CardTitle>
                </CardHeader>
                <p className="!text-emerald-600 dark:!text-emerald-400 text-2xl font-bold">
                  {timesheet.totalHours.toFixed(1)}h
                </p>
              </Card>
            </div>

            {/* Timesheet Grid */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Time Entry</CardTitle>
              </CardHeader>

              {/* Timesheet Table - Horizontal scroll for all screen sizes */}
              <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
                <table className="min-w-[550px] w-full">
                  <thead>
                    <tr className="text-left text-gray-500 dark:text-slate-400 text-xs border-b border-gray-200 dark:border-slate-700/50">
                      <th className="pb-3 pr-3 font-medium whitespace-nowrap">Day</th>
                      <th className="pb-3 pr-3 font-medium whitespace-nowrap">Date</th>
                      <th className="pb-3 pr-3 font-medium !text-blue-600 dark:!text-blue-400 whitespace-nowrap">Regular</th>
                      <th className="pb-3 pr-3 font-medium !text-amber-600 dark:!text-amber-400 whitespace-nowrap">OT 1.5x</th>
                      <th className="pb-3 pr-3 font-medium !text-purple-600 dark:!text-purple-400 whitespace-nowrap">OT 2.0x</th>
                      <th className="pb-3 pr-3 font-medium whitespace-nowrap">Break</th>
                      <th className="pb-3 pr-3 font-medium !text-emerald-600 dark:!text-emerald-400 whitespace-nowrap">Total</th>
                      <th className="pb-3 font-medium whitespace-nowrap">Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {timesheet.entries.map((entry, index) => {
                      const total =
                        (entry.regularHours || 0) +
                        (entry.overtime1_5Hours || 0) +
                        (entry.overtime2_0Hours || 0);
                      return (
                        <tr key={index} className="border-b border-gray-200 dark:border-slate-700/30">
                          <td className="py-3 pr-3 whitespace-nowrap">
                            <span className="text-gray-900 dark:text-white font-medium">
                              {getDayName(entry.workDate)}
                            </span>
                          </td>
                          <td className="py-3 pr-3 whitespace-nowrap">
                            <span className="text-gray-500 dark:text-slate-400">{getDayNumber(entry.workDate)}</span>
                          </td>
                          <td className="py-3 pr-3 whitespace-nowrap">
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
                                onFocus={e => {
                                  if (e.target.value === '0') e.target.value = '';
                                }}
                                onBlur={e => {
                                  if (e.target.value === '') {
                                    e.target.value = '0';
                                    updateEntry(index, 'regularHours', 0);
                                  }
                                }}
                                className="w-12 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded px-1 py-2 text-gray-900 dark:text-white text-sm text-center"
                              />
                            ) : (
                              <span className="text-gray-700 dark:text-slate-300">{entry.regularHours}h</span>
                            )}
                          </td>
                          <td className="py-3 pr-3 whitespace-nowrap">
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
                                onFocus={e => {
                                  if (e.target.value === '0') e.target.value = '';
                                }}
                                onBlur={e => {
                                  if (e.target.value === '') {
                                    e.target.value = '0';
                                    updateEntry(index, 'overtime1_5Hours', 0);
                                  }
                                }}
                                className="w-12 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded px-1 py-2 text-gray-900 dark:text-white text-sm text-center"
                              />
                            ) : (
                              <span className="text-gray-700 dark:text-slate-300">{entry.overtime1_5Hours}h</span>
                            )}
                          </td>
                          <td className="py-3 pr-3 whitespace-nowrap">
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
                                onFocus={e => {
                                  if (e.target.value === '0') e.target.value = '';
                                }}
                                onBlur={e => {
                                  if (e.target.value === '') {
                                    e.target.value = '0';
                                    updateEntry(index, 'overtime2_0Hours', 0);
                                  }
                                }}
                                className="w-12 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded px-1 py-2 text-gray-900 dark:text-white text-sm text-center"
                              />
                            ) : (
                              <span className="text-gray-700 dark:text-slate-300">{entry.overtime2_0Hours}h</span>
                            )}
                          </td>
                          <td className="py-3 pr-3 whitespace-nowrap">
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
                                onFocus={e => {
                                  if (e.target.value === '0') e.target.value = '';
                                }}
                                onBlur={e => {
                                  if (e.target.value === '') {
                                    e.target.value = '0';
                                    updateEntry(index, 'breakMinutes', 0);
                                  }
                                }}
                                className="w-12 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded px-1 py-2 text-gray-900 dark:text-white text-sm text-center"
                              />
                            ) : (
                              <span className="text-gray-700 dark:text-slate-300">{entry.breakMinutes}m</span>
                            )}
                          </td>
                          <td className="py-3 pr-3 whitespace-nowrap">
                            <span className="text-gray-900 dark:text-white font-semibold">{total.toFixed(1)}h</span>
                          </td>
                          <td className="py-3 whitespace-nowrap">
                            {isEditable ? (
                              <input
                                type="text"
                                value={entry.notes || ''}
                                onChange={e => updateEntry(index, 'notes', e.target.value)}
                                placeholder="Add notes..."
                                className="w-24 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded px-2 py-2 text-gray-900 dark:text-white text-sm"
                              />
                            ) : (
                              <span className="text-gray-500 dark:text-slate-400 text-sm">{entry.notes || '-'}</span>
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
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 dark:disabled:bg-slate-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
                    >
                      <ArrowPathIcon className="h-4 w-4" />
                      Save Draft
                    </button>
                    {canSubmit && (
                      <button
                        onClick={submitTimesheet}
                        disabled={loading}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 dark:disabled:bg-slate-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
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
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 dark:disabled:bg-slate-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
                  >
                    <CheckIcon className="h-4 w-4" />
                    Approve
                  </button>
                </div>
              )}
            </div>

            {/* Audit Trail */}
            {(timesheet.submittedDate || timesheet.approvedDate) && (
              <Card className="mt-6">
                <CardHeader>
                  <CardTitle>Audit Trail</CardTitle>
                </CardHeader>
                <div className="space-y-2 text-sm">
                  {timesheet.submittedDate && (
                    <div className="flex items-center gap-2 text-gray-700 dark:text-slate-300">
                      <DocumentTextIcon className="h-4 w-4" />
                      <span>Submitted on {new Date(timesheet.submittedDate).toLocaleString()}</span>
                    </div>
                  )}
                  {timesheet.approvedDate && (
                    <div className="flex items-center gap-2 text-gray-700 dark:text-slate-300">
                      <CheckIcon className="h-4 w-4" />
                      <span>
                        Approved by {timesheet.approvedBy} on{' '}
                        {new Date(timesheet.approvedDate).toLocaleString()}
                      </span>
                    </div>
                  )}
                  {timesheet.rejectionReason && (
                    <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
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
            <div className="bg-white dark:bg-slate-800 rounded-lg p-6 max-w-md w-full mx-4 border border-gray-200 dark:border-slate-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Reject Timesheet</h3>
              <p className="text-gray-600 dark:text-slate-400 text-sm mb-4">
                Please provide a reason for rejecting this timesheet.
              </p>
              <textarea
                value={rejectionReason}
                onChange={e => setRejectionReason(e.target.value)}
                placeholder="Enter rejection reason..."
                rows={3}
                className="w-full bg-gray-50 dark:bg-slate-900 border border-gray-300 dark:border-slate-700 rounded-lg px-3 py-2 text-gray-900 dark:text-white mb-4"
              />
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => {
                    setRejectModalOpen(false);
                    setRejectionReason('');
                  }}
                  className="px-4 py-2 bg-gray-200 dark:bg-slate-700 hover:bg-gray-300 dark:hover:bg-slate-600 text-gray-900 dark:text-white rounded-lg"
                >
                  Cancel
                </button>
                <button
                  onClick={rejectTimesheet}
                  disabled={!rejectionReason.trim() || loading}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-300 dark:disabled:bg-slate-700 text-white rounded-lg"
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
