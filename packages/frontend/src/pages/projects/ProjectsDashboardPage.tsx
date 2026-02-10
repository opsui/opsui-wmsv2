/**
 * Projects Dashboard Page
 *
 * Main page for project management with metrics, project list, filters, and actions
 */

import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Header,
  Button,
  Badge,
  Breadcrumb,
  LoadingSpinner,
  Modal,
  FormInput,
  FormTextarea,
  FormSelect,
} from '@/components/shared';
import {
  FolderIcon,
  PlusIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  ChartBarIcon,
  CurrencyDollarIcon,
  ClockIcon,
  UserGroupIcon,
  BuildingOfficeIcon,
  CalendarIcon,
  ArrowPathIcon,
  DocumentTextIcon,
} from '@heroicons/react/24/outline';
import { CreateProjectModal } from '@/components/projects/CreateProjectModal';
import type {
  Project,
  ProjectStatus,
  ProjectType,
  ProjectDashboardMetrics,
  BillingType,
} from '@opsui/shared';

// ============================================================================
// TYPES
// ============================================================================

interface Customer {
  id: string;
  name: string;
}

interface User {
  user_id: string;
  email: string;
  first_name: string;
  last_name: string;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function ProjectsDashboardPage() {
  const navigate = useNavigate();

  // State
  const [isLoading, setIsLoading] = useState(true);
  const [metrics, setMetrics] = useState<ProjectDashboardMetrics | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [users, setUsers] = useState<User[]>([]);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [customerFilter, setCustomerFilter] = useState<string>('');
  const [managerFilter, setManagerFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Load data on mount
  useEffect(() => {
    loadData();
  }, []);

  // Load filtered data when filters change
  useEffect(() => {
    loadProjects();
  }, [statusFilter, typeFilter, customerFilter, managerFilter, searchQuery]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      await Promise.all([loadMetrics(), loadProjects(), loadCustomers(), loadUsers()]);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadMetrics = async () => {
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams();
      if (statusFilter) params.append('status', statusFilter);
      if (typeFilter) params.append('type', typeFilter);
      if (customerFilter) params.append('customer_id', customerFilter);
      if (managerFilter) params.append('project_manager_id', managerFilter);

      const response = await fetch(`/api/projects/dashboard/metrics?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setMetrics(data);
      }
    } catch (error) {
      console.error('Failed to load metrics:', error);
    }
  };

  const loadProjects = async () => {
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams();
      if (statusFilter) params.append('status', statusFilter);
      if (typeFilter) params.append('type', typeFilter);
      if (customerFilter) params.append('customer_id', customerFilter);
      if (managerFilter) params.append('project_manager_id', managerFilter);
      if (searchQuery) params.append('search', searchQuery);

      const response = await fetch(`/api/projects?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setProjects(data);
      }
    } catch (error) {
      console.error('Failed to load projects:', error);
    }
  };

  const loadCustomers = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/sales/customers', {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setCustomers(data.customers || data);
      }
    } catch (error) {
      console.error('Failed to load customers:', error);
    }
  };

  const loadUsers = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/users/assignable', {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setUsers(data);
      }
    } catch (error) {
      console.error('Failed to load users:', error);
    }
  };

  // Status badge colors
  const getStatusColor = (status: ProjectStatus) => {
    switch (status) {
      case 'ACTIVE':
        return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
      case 'DRAFT':
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
      case 'PLANNING':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'ON_HOLD':
        return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
      case 'COMPLETED':
        return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'CANCELLED':
        return 'bg-rose-500/20 text-rose-400 border-rose-500/30';
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  // Project type badge colors
  const getTypeColor = (type: ProjectType) => {
    switch (type) {
      case 'FIXED_BID':
        return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
      case 'TIME_MATERIALS':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'COST_PLUS':
        return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'RETAINER':
        return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
      case 'INTERNAL':
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  const clearFilters = () => {
    setStatusFilter('');
    setTypeFilter('');
    setCustomerFilter('');
    setManagerFilter('');
    setSearchQuery('');
  };

  const hasActiveFilters =
    statusFilter || typeFilter || customerFilter || managerFilter || searchQuery;

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div className="min-h-screen">
      <Header />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb */}
        <Breadcrumb items={[{ label: 'Projects' }]} />

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">Projects</h1>
            <p className="text-gray-400 mt-1">Manage your projects and track progress</p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={() => loadData()}>
              <ArrowPathIcon className="h-4 w-4 mr-1" />
              Refresh
            </Button>
            <Button onClick={() => setShowCreateModal(true)}>
              <PlusIcon className="h-4 w-4 mr-1" />
              New Project
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <LoadingSpinner />
          </div>
        ) : (
          <>
            {/* Metrics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <Card variant="glass">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-500/20 rounded-lg">
                      <FolderIcon className="h-5 w-5 text-blue-400" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-white">
                        {metrics?.total_projects || 0}
                      </p>
                      <p className="text-xs text-gray-400">Total Projects</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card variant="glass">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-emerald-500/20 rounded-lg">
                      <ChartBarIcon className="h-5 w-5 text-emerald-400" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-white">
                        {metrics?.active_projects || 0}
                      </p>
                      <p className="text-xs text-gray-400">Active</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card variant="glass">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-500/20 rounded-lg">
                      <CurrencyDollarIcon className="h-5 w-5 text-green-400" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-white">
                        ${(metrics?.total_value || 0).toLocaleString()}
                      </p>
                      <p className="text-xs text-gray-400">Total Value</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card variant="glass">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-500/20 rounded-lg">
                      <ClockIcon className="h-5 w-5 text-purple-400" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-white">
                        {metrics?.hours_this_period || 0}
                      </p>
                      <p className="text-xs text-gray-400">Hours This Period</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Filters */}
            <Card variant="glass" className="mb-6">
              <CardContent className="p-4">
                <div className="flex flex-wrap items-center gap-4">
                  <div className="relative flex-1 min-w-[200px]">
                    <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                    <input
                      type="text"
                      placeholder="Search projects..."
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      className="pl-9 pr-3 py-2 w-full bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                    />
                  </div>

                  <select
                    value={statusFilter}
                    onChange={e => setStatusFilter(e.target.value)}
                    className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  >
                    <option value="">All Statuses</option>
                    <option value="DRAFT">Draft</option>
                    <option value="PLANNING">Planning</option>
                    <option value="ACTIVE">Active</option>
                    <option value="ON_HOLD">On Hold</option>
                    <option value="COMPLETED">Completed</option>
                    <option value="CANCELLED">Cancelled</option>
                  </select>

                  <select
                    value={typeFilter}
                    onChange={e => setTypeFilter(e.target.value)}
                    className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  >
                    <option value="">All Types</option>
                    <option value="FIXED_BID">Fixed Bid</option>
                    <option value="TIME_MATERIALS">Time & Materials</option>
                    <option value="COST_PLUS">Cost Plus</option>
                    <option value="RETAINER">Retainer</option>
                    <option value="INTERNAL">Internal</option>
                  </select>

                  <select
                    value={customerFilter}
                    onChange={e => setCustomerFilter(e.target.value)}
                    className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  >
                    <option value="">All Customers</option>
                    {customers.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>

                  <select
                    value={managerFilter}
                    onChange={e => setManagerFilter(e.target.value)}
                    className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  >
                    <option value="">All Managers</option>
                    {users.map(u => (
                      <option key={u.user_id} value={u.user_id}>
                        {u.first_name} {u.last_name}
                      </option>
                    ))}
                  </select>

                  {hasActiveFilters && (
                    <Button variant="ghost" size="sm" onClick={clearFilters}>
                      Clear Filters
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Projects Table */}
            <Card variant="glass">
              <CardHeader>
                <CardTitle>Projects ({projects.length})</CardTitle>
              </CardHeader>
              <CardContent>
                {projects.length === 0 ? (
                  <div className="text-center py-12 text-gray-400">
                    <FolderIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p className="text-lg font-medium">No projects found</p>
                    <p className="text-sm mt-1">Create a new project to get started</p>
                    <Button className="mt-4" onClick={() => setShowCreateModal(true)}>
                      <PlusIcon className="h-4 w-4 mr-1" />
                      New Project
                    </Button>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-700">
                      <thead className="bg-gray-900/50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                            Project
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                            Customer
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                            Status
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                            Type
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                            Progress
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                            Budget
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                            Manager
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                            Dates
                          </th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-700">
                        {projects.map(project => (
                          <tr key={project.project_id} className="hover:bg-white/5">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <div className="flex-shrink-0 h-10 w-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                                  <DocumentTextIcon className="h-5 w-5 text-white" />
                                </div>
                                <div className="ml-4">
                                  <Link
                                    to={`/projects/${project.project_id}`}
                                    className="text-sm font-medium text-white hover:text-blue-400"
                                  >
                                    {project.project_name}
                                  </Link>
                                  <p className="text-xs text-gray-500">{project.project_number}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                              {project.customer_id || '-'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <Badge className={getStatusColor(project.project_status)} size="sm">
                                {project.project_status.replace(/_/g, ' ')}
                              </Badge>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <Badge className={getTypeColor(project.project_type)} size="sm">
                                {project.project_type.replace(/_/g, ' ')}
                              </Badge>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="w-full bg-gray-700 rounded-full h-2">
                                <div
                                  className="bg-blue-500 h-2 rounded-full"
                                  style={{ width: `${project.progress_percent}%` }}
                                />
                              </div>
                              <p className="text-xs text-gray-500 mt-1">
                                {project.progress_percent}%
                              </p>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                              ${project.estimated_budget.toLocaleString()}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                              {project.project_manager_id || '-'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                              <div className="flex items-center gap-1">
                                <CalendarIcon className="h-3 w-3" />
                                {new Date(project.start_date).toLocaleDateString()}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right">
                              <Link
                                to={`/projects/${project.project_id}`}
                                className="text-blue-400 hover:text-blue-300 text-sm"
                              >
                                View
                              </Link>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Create Project Modal */}
      <CreateProjectModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={() => {
          setShowCreateModal(false);
          loadData();
        }}
        customers={customers}
        users={users}
      />
    </div>
  );
}
