/**
 * Employees Page
 *
 * Manage employee records with NZ HR features
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PlusIcon, MagnifyingGlassIcon, PencilIcon, UserIcon } from '@heroicons/react/24/outline';
import { Header } from '@/components/shared/Header';
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <Header />
      <main className="w-full px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Employees</h1>
          <p className="text-gray-400">Manage employee records and HR information</p>
        </div>

        {/* Filters and Actions */}
        <div className="mb-6 flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search employees..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-800/50 border border-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="px-4 py-2 bg-slate-800/50 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="">All Status</option>
            <option value="ACTIVE">Active</option>
            <option value="ON_LEAVE">On Leave</option>
            <option value="TERMINATED">Terminated</option>
            <option value="RESIGNED">Resigned</option>
          </select>
          <Button onClick={handleAdd} className="whitespace-nowrap">
            <PlusIcon className="h-5 w-5 mr-2" />
            Add Employee
          </Button>
        </div>

        {/* Employee Grid */}
        {isLoading ? (
          <div className="text-center py-12 text-gray-400">Loading employees...</div>
        ) : filteredEmployees.length === 0 ? (
          <Card className="p-12 text-center">
            <UserIcon className="h-16 w-16 mx-auto mb-4 text-gray-600" />
            <h3 className="text-xl font-semibold text-white mb-2">No employees found</h3>
            <p className="text-gray-400 mb-4">
              {searchTerm
                ? 'Try a different search term'
                : 'Add your first employee to get started'}
            </p>
            {!searchTerm && (
              <Button onClick={handleAdd}>
                <PlusIcon className="h-5 w-5 mr-2" />
                Add Employee
              </Button>
            )}
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredEmployees.map(employee => (
              <Card key={employee.employeeId} variant="glass" className="p-5 card-hover">
                {/* Employee Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-full bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center">
                      <span className="text-lg font-bold text-white">
                        {employee.firstName[0]}
                        {employee.lastName[0]}
                      </span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-white">
                        {employee.firstName} {employee.lastName}
                      </h3>
                      {employee.preferredName && (
                        <p className="text-sm text-gray-400">"{employee.preferredName}"</p>
                      )}
                    </div>
                  </div>
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-medium ${
                      employee.status === 'ACTIVE'
                        ? 'bg-green-500/20 text-green-400'
                        : employee.status === 'ON_LEAVE'
                          ? 'bg-yellow-500/20 text-yellow-400'
                          : 'bg-red-500/20 text-red-400'
                    }`}
                  >
                    {employee.status}
                  </span>
                </div>

                {/* Employee Details */}
                <div className="space-y-2 mb-4">
                  <div className="flex justify-between">
                    <span className="text-gray-400 text-sm">Employee #:</span>
                    <span className="text-white text-sm font-medium">
                      {employee.employeeNumber || 'N/A'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400 text-sm">Email:</span>
                    <span className="text-white text-sm">{employee.email}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400 text-sm">Phone:</span>
                    <span className="text-white text-sm">
                      {employee.phone || employee.mobile || 'N/A'}
                    </span>
                  </div>
                  {employee.primaryEmployment && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-gray-400 text-sm">Position:</span>
                        <span className="text-white text-sm">
                          {employee.primaryEmployment.positionTitle}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400 text-sm">Department:</span>
                        <span className="text-white text-sm">
                          {employee.primaryEmployment.department || 'N/A'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400 text-sm">Employment:</span>
                        <span className="text-white text-sm">
                          {employee.primaryEmployment.employmentType}
                        </span>
                      </div>
                    </>
                  )}
                  {employee.taxDetails && (
                    <div className="flex justify-between">
                      <span className="text-gray-400 text-sm">Tax Code:</span>
                      <span className="text-white text-sm">{employee.taxDetails.taxCode}</span>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-4 border-t border-white/10">
                  <Button
                    variant="secondary"
                    size="sm"
                    fullWidth
                    onClick={() => navigate(`/hr/employees/${employee.employeeId}`)}
                  >
                    View Details
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleEdit(employee)}>
                    <PencilIcon className="h-4 w-4" />
                  </Button>
                </div>
              </Card>
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
