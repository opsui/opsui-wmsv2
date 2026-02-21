/**
 * Employees Page
 *
 * Manage employee records with NZ HR features.
 *
 * ============================================================================
 * AESTHETIC DIRECTION: CORPORATE ORGANICS
 * ============================================================================
 * Human-centered HR interface with warm, approachable design:
 * - Soft coral/terracotta accents for human touch
 * - Organic curves and gentle shadows
 * - Staggered card animations with scale-in effects
 * - Warm gradient backgrounds with subtle texture
 * - Avatar rings with soft glow effects
 * ============================================================================
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PlusIcon, MagnifyingGlassIcon, PencilIcon, UserIcon, UsersIcon } from '@heroicons/react/24/outline';
import { Header } from '@/components/shared/Header';
import { Breadcrumb } from '@/components/shared';
import { Button } from '@/components/shared/Button';
import { Card } from '@/components/shared/Card';
import { EmployeeFormModal } from '@/components/hr';
import { useEmployees, useDeleteEmployee } from '@/services/api';
import type { HREmployeeWithDetails } from '@opsui/shared/types/hr';

export default function EmployeesPage() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ACTIVE');
  const [selectedEmployee, setSelectedEmployee] = useState<HREmployeeWithDetails | null>(null);
  const [showModal, setShowModal] = useState(false);

  const {
    data: employees = [],
    isLoading,
    refetch,
  } = useEmployees({
    status: statusFilter,
    search: searchTerm || undefined,
  });

  const deleteEmployee = useDeleteEmployee();

  const handleDelete = async (employeeId: string) => {
    if (confirm('Are you sure you want to delete this employee?')) {
      await deleteEmployee.mutateAsync(employeeId);
      refetch();
    }
  };

  const handleEdit = (employee: HREmployeeWithDetails) => {
    setSelectedEmployee(employee);
    setShowModal(true);
  };

  const handleAdd = () => {
    setSelectedEmployee(null);
    setShowModal(true);
  };

  const filteredEmployees = searchTerm
    ? employees.filter(e =>
        `${e.firstName} ${e.lastName} ${e.email} ${e.employeeNumber || ''}`
          .toLowerCase()
          .includes(searchTerm.toLowerCase())
      )
    : employees;

  // Calculate counts
  const activeEmployeesCount = filteredEmployees.filter(e => e.status === 'ACTIVE').length;
  const totalEmployeesCount = filteredEmployees.length;

  return (
    <div className="min-h-screen relative">
      {/* Atmospheric background - Corporate Organics theme */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-gradient-to-br from-orange-500/8 to-rose-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-gradient-to-tl from-amber-500/6 to-orange-600/4 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-0 w-80 h-80 bg-gradient-to-r from-rose-400/4 to-transparent rounded-full blur-3xl" />
        {/* Subtle noise texture */}
        <div
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
          }}
        />
      </div>

      <Header />
      <Breadcrumb />
      <main className="w-full px-4 sm:px-6 lg:px-8 py-8 relative z-10">
        {/* Page Header - Corporate Organics Design */}
        <div className="mb-10">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="flex items-center gap-5">
              <div className="relative">
                {/* Outer ring with warm gradient */}
                <div className="absolute inset-0 bg-gradient-to-br from-orange-400/30 to-rose-400/20 rounded-2xl blur-sm" />
                {/* Main icon container */}
                <div className="relative p-4 bg-gradient-to-br from-orange-500/20 to-rose-500/15 rounded-2xl border border-orange-500/30 shadow-lg shadow-orange-500/10 backdrop-blur-sm">
                  <UsersIcon className="h-9 w-9 text-orange-400" />
                </div>
                {/* Corner accent */}
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-gradient-to-br from-orange-400 to-rose-400 rounded-full shadow-lg shadow-orange-400/50" />
              </div>
              <div>
                <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white tracking-tight">
                  Employees
                </h1>
                <p className="mt-1.5 text-gray-500 dark:text-gray-400 text-sm tracking-wide">
                  Manage your team with care
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              {/* Employee count indicator */}
              <div className="flex items-center gap-3 px-4 py-2.5 bg-gradient-to-r from-orange-500/10 to-transparent rounded-xl border border-orange-500/20">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-gradient-to-r from-orange-400 to-rose-400 rounded-full" />
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
                    {activeEmployeesCount} Active
                  </span>
                </div>
                <div className="w-px h-4 bg-gray-300 dark:bg-gray-700" />
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {totalEmployeesCount} Total
                </span>
              </div>

              <Button
                onClick={handleAdd}
                className="whitespace-nowrap bg-gradient-to-r from-orange-500 to-rose-500 hover:from-orange-600 hover:to-rose-600 shadow-lg shadow-orange-500/20"
              >
                <PlusIcon className="h-5 w-5 mr-2" />
                Add Employee
              </Button>
            </div>
          </div>
        </div>

        {/* Filters and Actions */}
        <div className="mb-8 flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <MagnifyingGlassIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search employees..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-white dark:bg-gray-900/80 border border-gray-200 dark:border-gray-700/50 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/50 transition-all shadow-sm"
            />
          </div>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="px-4 py-3 bg-white dark:bg-gray-900/80 border border-gray-200 dark:border-gray-700/50 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/50 transition-all shadow-sm [&_option]:bg-white dark:[&_option]:bg-gray-900 [&_option]:text-gray-900 dark:[&_option]:text-white"
          >
            <option value="">All Status</option>
            <option value="ACTIVE">Active</option>
            <option value="ON_LEAVE">On Leave</option>
            <option value="TERMINATED">Terminated</option>
            <option value="RESIGNED">Resigned</option>
          </select>
        </div>

        {/* Employee Grid */}
        {isLoading ? (
          <div className="text-center py-16">
            <div className="inline-flex items-center gap-3 px-6 py-3 bg-white dark:bg-gray-900/80 rounded-xl shadow-lg">
              <div className="w-5 h-5 border-2 border-orange-500/30 border-t-orange-500 rounded-full animate-spin" />
              <span className="text-gray-600 dark:text-gray-300">Loading employees...</span>
            </div>
          </div>
        ) : filteredEmployees.length === 0 ? (
          <div className="text-center py-16">
            <div className="inline-flex flex-col items-center p-8 bg-white dark:bg-gray-900/80 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700/50">
              <div className="p-4 bg-gradient-to-br from-gray-100 to-gray-50 dark:from-gray-800 dark:to-gray-900 rounded-2xl mb-4">
                <UserIcon className="h-12 w-12 text-gray-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">No employees found</h3>
              <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-sm">
                {searchTerm
                  ? 'Try adjusting your search criteria'
                  : 'Get started by adding your first team member'}
              </p>
              {!searchTerm && (
                <Button
                  onClick={handleAdd}
                  className="bg-gradient-to-r from-orange-500 to-rose-500 hover:from-orange-600 hover:to-rose-600 shadow-lg shadow-orange-500/20"
                >
                  <PlusIcon className="h-5 w-5 mr-2" />
                  Add Employee
                </Button>
              )}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredEmployees.map((employee, index) => (
              <div
                key={employee.employeeId}
                className="group animate-in fade-in slide-in-from-bottom-4 duration-500"
                style={{ animationDelay: `${Math.min(index * 50, 300)}ms` }}
              >
                <Card variant="glass" className="p-6 card-hover border border-gray-200/50 dark:border-gray-700/30 hover:border-orange-500/30 dark:hover:border-orange-500/20 transition-all hover:shadow-lg hover:shadow-orange-500/5">
                  {/* Employee Header */}
                  <div className="flex items-start justify-between mb-5">
                    <div className="flex items-center gap-4">
                      {/* Avatar with warm gradient ring */}
                      <div className="relative">
                        <div className="absolute inset-0 bg-gradient-to-br from-orange-400 to-rose-400 rounded-full blur-sm opacity-50 group-hover:opacity-75 transition-opacity" />
                        <div className="relative h-14 w-14 rounded-full bg-gradient-to-br from-orange-500 to-rose-500 flex items-center justify-center ring-2 ring-white dark:ring-gray-900 shadow-lg">
                          <span className="text-lg font-bold text-white">
                            {employee.firstName[0]}
                            {employee.lastName[0]}
                          </span>
                        </div>
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900 dark:text-white text-lg">
                          {employee.firstName} {employee.lastName}
                        </h3>
                        {employee.preferredName && (
                          <p className="text-sm text-orange-600 dark:text-orange-400">"{employee.preferredName}"</p>
                        )}
                      </div>
                    </div>
                    {/* Status Badge */}
                    <span
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${
                        employee.status === 'ACTIVE'
                          ? 'bg-gradient-to-r from-emerald-50 to-green-50 dark:from-emerald-900/30 dark:to-green-900/20 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/30'
                          : employee.status === 'ON_LEAVE'
                            ? 'bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-900/30 dark:to-yellow-900/20 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-500/30'
                            : 'bg-gradient-to-r from-gray-50 to-slate-50 dark:from-gray-800 dark:to-slate-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-600'
                      }`}
                    >
                      {employee.status.replace('_', ' ')}
                    </span>
                  </div>

                  {/* Employee Details */}
                  <div className="space-y-3 mb-5">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-500 dark:text-gray-400 text-sm">Employee #</span>
                      <span className="text-gray-900 dark:text-white text-sm font-medium font-mono">
                        {employee.employeeNumber || 'N/A'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-500 dark:text-gray-400 text-sm">Email</span>
                      <span className="text-gray-900 dark:text-white text-sm truncate max-w-[180px]">
                        {employee.email}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-500 dark:text-gray-400 text-sm">Phone</span>
                      <span className="text-gray-900 dark:text-white text-sm">
                        {employee.phone || employee.mobile || 'N/A'}
                      </span>
                    </div>
                    {employee.primaryEmployment && (
                      <>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-500 dark:text-gray-400 text-sm">Position</span>
                          <span className="text-gray-900 dark:text-white text-sm">
                            {employee.primaryEmployment.positionTitle}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-500 dark:text-gray-400 text-sm">Department</span>
                          <span className="text-gray-900 dark:text-white text-sm">
                            {employee.primaryEmployment.department || 'N/A'}
                          </span>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-3 pt-4 border-t border-gray-100 dark:border-gray-800">
                    <Button
                      variant="secondary"
                      size="sm"
                      fullWidth
                      onClick={() => navigate(`/hr/employees/${employee.employeeId}`)}
                      className="hover:bg-orange-50 dark:hover:bg-orange-900/20 hover:text-orange-600 dark:hover:text-orange-400 hover:border-orange-200 dark:hover:border-orange-500/30"
                    >
                      View Details
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(employee)}
                      className="hover:bg-orange-50 dark:hover:bg-orange-900/20 hover:text-orange-600 dark:hover:text-orange-400"
                    >
                      <PencilIcon className="h-4 w-4" />
                    </Button>
                  </div>
                </Card>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Employee Form Modal */}
      {showModal && (
        <EmployeeFormModal
          employee={selectedEmployee}
          onClose={() => {
            setShowModal(false);
            setSelectedEmployee(null);
          }}
          onSuccess={() => {
            setShowModal(false);
            setSelectedEmployee(null);
            refetch();
          }}
        />
      )}
    </div>
  );
}
