/**
 * Employee Detail Page
 *
 * Detailed view of an individual employee with all HR information
 * Including personal info, employment, compensation, leave balances, timesheets, and pay history
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeftIcon,
  PencilIcon,
  EnvelopeIcon,
  PhoneIcon,
  CalendarIcon,
  DocumentTextIcon,
  ClockIcon,
  UserIcon,
  BriefcaseIcon,
  AcademicCapIcon,
  ChartBarIcon,
} from '@heroicons/react/24/outline';
import { Header } from '@/components/shared/Header';
import { Card } from '@/components/shared/Card';

interface Employee {
  employeeId: string;
  userId: string | null;
  firstName: string;
  lastName: string;
  preferredName: string | null;
  dateOfBirth: Date | null;
  gender: string | null;
  nationalId: string | null;
  email: string;
  phone: string | null;
  mobile: string | null;
  address: string | null;
  city: string | null;
  postalCode: string | null;
  country: string;
  employeeNumber: string | null;
  status: string;
  hireDate: Date;
  terminationDate: Date | null;
  department: string | null;
  position: string | null;
  employmentType: string;
  payFrequency: string;
  salary: number | null;
  hourlyRate: number | null;
  taxCode: string | null;
  kiwiSaverRate: string | null;
}

interface LeaveBalance {
  leaveType: string;
  annualEntitlement: number;
  taken: number;
  pending: number;
  available: number;
}

interface TimesheetEntry {
  timesheetId: string;
  workDate: Date;
  regularHours: number;
  overtime1_5Hours: number;
  overtime2_0Hours: number;
  totalHours: number;
  status: string;
}

interface PayStub {
  payStubId: string;
  payPeriod: string;
  grossPay: number;
  netPay: number;
  payDate: Date;
}

export default function EmployeeDetailPage() {
  const { employeeId } = useParams();
  const navigate = useNavigate();
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [leaveBalances, setLeaveBalances] = useState<LeaveBalance[]>([]);
  const [recentTimesheets, setRecentTimesheets] = useState<TimesheetEntry[]>([]);
  const [recentPayStubs, setRecentPayStubs] = useState<PayStub[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState<
    'overview' | 'employment' | 'compensation' | 'leave' | 'timesheets' | 'pay-history'
  >('overview');

  useEffect(() => {
    if (employeeId) {
      fetchEmployeeDetails();
    }
  }, [employeeId]);

  const fetchEmployeeDetails = async () => {
    setLoading(true);
    try {
      // Fetch employee
      const empResponse = await fetch(`/api/hr/employees/${employeeId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      if (empResponse.ok) {
        setEmployee(await empResponse.json());
      }

      // Fetch leave balances
      const leaveResponse = await fetch(`/api/hr/employees/${employeeId}/leave-balances`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      if (leaveResponse.ok) {
        setLeaveBalances(await leaveResponse.json());
      }

      // Fetch timesheets
      const timesheetResponse = await fetch(`/api/hr/employees/${employeeId}/timesheets?limit=5`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      if (timesheetResponse.ok) {
        setRecentTimesheets(await timesheetResponse.json());
      }

      // Fetch pay stubs
      const payStubResponse = await fetch(`/api/hr/employees/${employeeId}/pay-stubs?limit=5`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      if (payStubResponse.ok) {
        setRecentPayStubs(await payStubResponse.json());
      }
    } catch (error) {
      console.error('Error fetching employee details:', error);
    } finally {
      setLoading(false);
    }
  };

  const InfoItem = ({ label, value, icon: Icon }: any) => (
    <div className="flex items-center gap-3 py-2">
      {Icon && <Icon className="h-5 w-5 text-slate-400" />}
      <div className="flex-1">
        <p className="text-slate-400 text-xs">{label}</p>
        <p className="text-white text-sm font-medium">{value || '-'}</p>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Employee Not Found</h1>
          <p className="text-slate-400 mb-6">The requested employee could not be found.</p>
          <button
            onClick={() => navigate('/hr/employees')}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
          >
            Back to Employees
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/hr/employees')}
              className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
            >
              <ArrowLeftIcon className="h-5 w-5 text-slate-400" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-white">
                {employee.firstName} {employee.lastName}
                {employee.preferredName &&
                  employee.preferredName !== `${employee.firstName} ${employee.lastName}` && (
                    <span className="text-slate-400 ml-2">({employee.preferredName})</span>
                  )}
              </h1>
              <p className="text-slate-400 text-sm">
                {employee.position || employee.employeeNumber || employee.employeeId}
              </p>
            </div>
          </div>
          <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2">
            <PencilIcon className="h-4 w-4" />
            Edit Employee
          </button>
        </div>

        {/* Status Badge */}
        <div className="mb-6">
          <span
            className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
              employee.status === 'ACTIVE'
                ? 'bg-emerald-500/20 text-emerald-400'
                : employee.status === 'TERMINATED'
                  ? 'bg-red-500/20 text-red-400'
                  : employee.status === 'ON_LEAVE'
                    ? 'bg-amber-500/20 text-amber-400'
                    : 'bg-slate-700/30 text-slate-400'
            }`}
          >
            {employee.status}
          </span>
        </div>

        {/* Tabs */}
        <div className="border-b border-slate-700/50 mb-6">
          <div className="flex gap-2">
            {[
              { id: 'overview', label: 'Overview' },
              { id: 'employment', label: 'Employment' },
              { id: 'compensation', label: 'Compensation' },
              { id: 'leave', label: 'Leave Balances' },
              { id: 'timesheets', label: 'Timesheets' },
              { id: 'pay-history', label: 'Pay History' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setSelectedTab(tab.id as any)}
                className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  selectedTab === tab.id
                    ? 'border-blue-500 text-blue-400'
                    : 'border-transparent text-slate-400 hover:text-slate-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div className="space-y-6">
          {/* Overview Tab */}
          {selectedTab === 'overview' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Personal Information */}
              <Card title="Personal Information">
                <div className="space-y-1">
                  <InfoItem label="Email" value={employee.email} icon={EnvelopeIcon} />
                  <InfoItem label="Phone" value={employee.phone} icon={PhoneIcon} />
                  <InfoItem label="Mobile" value={employee.mobile} icon={PhoneIcon} />
                  <InfoItem
                    label="Address"
                    value={[employee.addressLine1, employee.city, employee.postalCode]
                      .filter(Boolean)
                      .join(', ')}
                    icon={UserIcon}
                  />
                  <InfoItem
                    label="Date of Birth"
                    value={
                      employee.dateOfBirth
                        ? new Date(employee.dateOfBirth).toLocaleDateString()
                        : ''
                    }
                    icon={CalendarIcon}
                  />
                  <InfoItem label="Gender" value={employee.gender || ''} />
                  <InfoItem label="National ID" value={employee.nationalId || ''} />
                </div>
              </Card>

              {/* Quick Stats */}
              <Card title="Quick Stats">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-4 bg-slate-700/30 rounded-lg">
                    <p className="text-3xl font-bold text-blue-400">
                      {leaveBalances.filter(l => l.available > 0).length}
                    </p>
                    <p className="text-slate-400 text-xs">Leave Types</p>
                  </div>
                  <div className="text-center p-4 bg-slate-700/30 rounded-lg">
                    <p className="text-3xl font-bold text-emerald-400">
                      {recentTimesheets.filter(t => t.status === 'APPROVED').length}
                    </p>
                    <p className="text-slate-400 text-xs">Timesheets This Month</p>
                  </div>
                  <div className="text-center p-4 bg-slate-700/30 rounded-lg">
                    <p className="text-3xl font-bold text-purple-400">
                      {employee.salary || employee.hourlyRate
                        ? '$' + (employee.salary || employee.hourlyRate * 2080).toLocaleString()
                        : '-'}
                    </p>
                    <p className="text-slate-400 text-xs">Annual Salary</p>
                  </div>
                  <div className="text-center p-4 bg-slate-700/30 rounded-lg">
                    <p className="text-3xl font-bold text-amber-400">
                      {new Date(employee.hireDate).toLocaleDateString()}
                    </p>
                    <p className="text-slate-400 text-xs">Hire Date</p>
                  </div>
                </div>
              </Card>
            </div>
          )}

          {/* Employment Tab */}
          {selectedTab === 'employment' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card title="Employment Details">
                <div className="space-y-1">
                  <InfoItem
                    label="Employee Number"
                    value={employee.employeeNumber || ''}
                    icon={BriefcaseIcon}
                  />
                  <InfoItem label="Department" value={employee.department || ''} />
                  <InfoItem label="Position" value={employee.position || ''} />
                  <InfoItem label="Employment Type" value={employee.employmentType || ''} />
                  <InfoItem
                    label="Hire Date"
                    value={new Date(employee.hireDate).toLocaleDateString()}
                    icon={CalendarIcon}
                  />
                  {employee.terminationDate && (
                    <InfoItem
                      label="Termination Date"
                      value={new Date(employee.terminationDate).toLocaleDateString()}
                    />
                  )}
                  <InfoItem
                    label="User Account"
                    value={employee.userId ? 'Linked' : 'Not Linked'}
                  />
                </div>
              </Card>

              <Card title="Job Information">
                <div className="space-y-1">
                  <InfoItem label="Department" value={employee.department || ''} />
                  <InfoItem label="Position" value={employee.position || ''} />
                  <InfoItem label="Employment Type" value={employee.employmentType || ''} />
                </div>
              </Card>
            </div>
          )}

          {/* Compensation Tab */}
          {selectedTab === 'compensation' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card title="Salary & Compensation">
                <div className="space-y-1">
                  <InfoItem label="Pay Frequency" value={employee.payFrequency || ''} />
                  <InfoItem
                    label="Salary"
                    value={
                      employee.salary
                        ? `$${employee.salary.toLocaleString()}/year`
                        : employee.hourlyRate
                          ? `$${employee.hourlyRate}/hour`
                          : ''
                    }
                  />
                </div>
              </Card>

              <Card title="Tax Information">
                <div className="space-y-1">
                  <InfoItem label="Tax Code" value={employee.taxCode || 'M'} />
                  <InfoItem
                    label="KiwiSaver"
                    value={
                      employee.kiwiSaverRate ? `Rate ${employee.kiwiSaverRate}` : 'Not enrolled'
                    }
                  />
                </div>
              </Card>
            </div>
          )}

          {/* Leave Balances Tab */}
          {selectedTab === 'leave' && (
            <Card title="Leave Balances">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-left text-slate-400 text-xs border-b border-slate-700/50">
                      <th className="pb-3 font-medium">Leave Type</th>
                      <th className="pb-3 font-medium">Entitled</th>
                      <th className="pb-3 font-medium">Taken</th>
                      <th className="pb-3 font-medium">Pending</th>
                      <th className="pb-3 font-medium">Available</th>
                      <th className="pb-3 font-medium">Usage %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leaveBalances.map((balance, index) => {
                      const usagePercent =
                        balance.annualEntitlement > 0
                          ? (balance.taken / balance.annualEntitlement) * 100
                          : 0;
                      return (
                        <tr key={index} className="border-b border-slate-700/30">
                          <td className="py-3 text-sm text-white">{balance.leaveType}</td>
                          <td className="py-3 text-sm text-slate-300">
                            {balance.annualEntitlement} days
                          </td>
                          <td className="py-3 text-sm text-slate-300">{balance.taken} days</td>
                          <td className="py-3 text-sm text-slate-300">{balance.pending} days</td>
                          <td
                            className={`py-3 text-sm font-semibold ${
                              balance.available > 0 ? 'text-emerald-400' : 'text-red-400'
                            }`}
                          >
                            {balance.available} days
                          </td>
                          <td className="py-3 text-sm">
                            <div className="flex items-center gap-2">
                              <div className="flex-1 bg-slate-700 rounded-full h-2">
                                <div
                                  className="h-2 rounded-full bg-blue-500"
                                  style={{ width: `${Math.min(usagePercent, 100)}%` }}
                                />
                              </div>
                              <span className="text-slate-300 text-xs">
                                {usagePercent.toFixed(0)}%
                              </span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {/* Timesheets Tab */}
          {selectedTab === 'timesheets' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-white">Recent Timesheets</h2>
                <Link
                  to={`/hr/employees/${employeeId}/timesheets`}
                  className="text-blue-400 text-sm hover:text-blue-300"
                >
                  View All
                </Link>
              </div>

              <Card>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="text-left text-slate-400 text-xs border-b border-slate-700/50">
                        <th className="pb-3 font-medium">Period</th>
                        <th className="pb-3 font-medium">Regular</th>
                        <th className="pb-3 font-medium">OT 1.5x</th>
                        <th className="pb-3 font-medium">OT 2.0x</th>
                        <th className="pb-3 font-medium">Total</th>
                        <th className="pb-3 font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentTimesheets.map((timesheet, index) => (
                        <tr key={index} className="border-b border-slate-700/30">
                          <td className="py-3 text-sm text-white">
                            {new Date(timesheet.workDate).toLocaleDateString()}
                          </td>
                          <td className="py-3 text-sm text-slate-300">{timesheet.regularHours}h</td>
                          <td className="py-3 text-sm text-slate-300">
                            {timesheet.overtime1_5Hours}h
                          </td>
                          <td className="py-3 text-sm text-slate-300">
                            {timesheet.overtime2_0Hours}h
                          </td>
                          <td className="py-3 text-sm text-white font-medium">
                            {timesheet.totalHours}h
                          </td>
                          <td className="py-3 text-sm">
                            <span
                              className={`px-2 py-1 rounded text-xs ${
                                timesheet.status === 'APPROVED'
                                  ? 'bg-emerald-500/20 text-emerald-400'
                                  : timesheet.status === 'PAID'
                                    ? 'bg-blue-500/20 text-blue-400'
                                    : 'bg-slate-700/30 text-slate-400'
                              }`}
                            >
                              {timesheet.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>
          )}

          {/* Pay History Tab */}
          {selectedTab === 'pay-history' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-white">Recent Pay Stubs</h2>
                <Link
                  to={`/hr/employees/${employeeId}/pay-stubs`}
                  className="text-blue-400 text-sm hover:text-blue-300"
                >
                  View All
                </Link>
              </div>

              <Card>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="text-left text-slate-400 text-xs border-b border-slate-700/50">
                        <th className="pb-3 font-medium">Pay Period</th>
                        <th className="pb-3 font-medium">Gross Pay</th>
                        <th className="pb-3 font-medium">Net Pay</th>
                        <th className="pb-3 font-medium">Pay Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentPayStubs.map((payStub, index) => (
                        <tr key={index} className="border-b border-slate-700/30">
                          <td className="py-3 text-sm text-white">{payStub.payPeriod}</td>
                          <td className="py-3 text-sm text-slate-300">
                            ${payStub.grossPay.toLocaleString()}
                          </td>
                          <td className="py-3 text-sm text-emerald-400 font-semibold">
                            ${payStub.netPay.toLocaleString()}
                          </td>
                          <td className="py-3 text-sm text-slate-300">
                            {new Date(payStub.payDate).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
