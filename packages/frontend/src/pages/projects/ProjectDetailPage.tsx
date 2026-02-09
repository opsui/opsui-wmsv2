/**
 * Project Detail Page
 *
 * Detailed view of a project with tabs for Overview, Tasks, Time, Expenses, Billing, Resources, and Issues
 */

import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
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
  ArrowLeftIcon,
  PencilIcon,
  TrashIcon,
  UserIcon,
  CalendarIcon,
  CurrencyDollarIcon,
  ClockIcon,
  DocumentTextIcon,
  CheckCircleIcon,
  ChartBarIcon,
  PlusIcon,
  PlayIcon,
  PauseIcon,
} from '@heroicons/react/24/outline';
import { TimeEntryModal } from '@/components/projects/TimeEntryModal';
import type {
  ProjectWithDetails,
  ProjectTask,
  ProjectTimeEntry,
  ProjectExpense,
  ProjectMilestone,
  ProjectResource,
  ProjectIssue,
  ProjectStatus,
  TaskStatus,
  IssueStatus,
  WorkType,
  ExpenseCategory,
  BillingType,
} from '@opsui/shared';

// ============================================================================
// TAB TYPES
// ============================================================================

type TabType = 'overview' | 'tasks' | 'time' | 'expenses' | 'billing' | 'resources' | 'issues';

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function ProjectDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  // State
  const [isLoading, setIsLoading] = useState(true);
  const [project, setProject] = useState<ProjectWithDetails | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('overview');

  // Tab-specific data
  const [tasks, setTasks] = useState<ProjectTask[]>([]);
  const [timeEntries, setTimeEntries] = useState<ProjectTimeEntry[]>([]);
  const [expenses, setExpenses] = useState<ProjectExpense[]>([]);
  const [milestones, setMilestones] = useState<ProjectMilestone[]>([]);
  const [resources, setResources] = useState<ProjectResource[]>([]);
  const [issues, setIssues] = useState<ProjectIssue[]>([]);

  // Modals
  const [showTimeEntryModal, setShowTimeEntryModal] = useState(false);

  // Load data on mount
  useEffect(() => {
    if (id) {
      loadProject();
    }
  }, [id]);

  // Load tab-specific data when tab changes
  useEffect(() => {
    if (!id || !project) return;

    switch (activeTab) {
      case 'tasks':
        loadTasks();
        break;
      case 'time':
        loadTimeEntries();
        break;
      case 'expenses':
        loadExpenses();
        break;
      case 'billing':
        loadMilestones();
        break;
      case 'resources':
        loadResources();
        break;
      case 'issues':
        loadIssues();
        break;
    }
  }, [activeTab, id, project]);

  const loadProject = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/projects/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setProject(data);
      } else {
        console.error('Failed to load project');
      }
    } catch (error) {
      console.error('Failed to load project:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadTasks = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/projects/${id}/tasks`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setTasks(data);
      }
    } catch (error) {
      console.error('Failed to load tasks:', error);
    }
  };

  const loadTimeEntries = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/projects/${id}/time-entries`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setTimeEntries(data);
      }
    } catch (error) {
      console.error('Failed to load time entries:', error);
    }
  };

  const loadExpenses = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/projects/${id}/expenses`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setExpenses(data);
      }
    } catch (error) {
      console.error('Failed to load expenses:', error);
    }
  };

  const loadMilestones = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/projects/${id}/milestones`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setMilestones(data);
      }
    } catch (error) {
      console.error('Failed to load milestones:', error);
    }
  };

  const loadResources = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/projects/${id}/resources`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setResources(data);
      }
    } catch (error) {
      console.error('Failed to load resources:', error);
    }
  };

  const loadIssues = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/projects/${id}/issues`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setIssues(data);
      }
    } catch (error) {
      console.error('Failed to load issues:', error);
    }
  };

  // Status badge colors
  const getProjectStatusColor = (status: ProjectStatus) => {
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

  const getTaskStatusColor = (status: TaskStatus) => {
    switch (status) {
      case 'COMPLETED':
        return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
      case 'IN_PROGRESS':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'NOT_STARTED':
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
      case 'ON_HOLD':
        return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
      case 'CANCELLED':
        return 'bg-rose-500/20 text-rose-400 border-rose-500/30';
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  const getIssueStatusColor = (status: IssueStatus) => {
    switch (status) {
      case 'OPEN':
        return 'bg-rose-500/20 text-rose-400 border-rose-500/30';
      case 'IN_PROGRESS':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'RESOLVED':
        return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
      case 'CLOSED':
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  // Tabs configuration
  const tabs = [
    { id: 'overview' as TabType, label: 'Overview', icon: ChartBarIcon },
    { id: 'tasks' as TabType, label: 'Tasks', icon: CheckCircleIcon },
    { id: 'time' as TabType, label: 'Time Entries', icon: ClockIcon },
    { id: 'expenses' as TabType, label: 'Expenses', icon: CurrencyDollarIcon },
    { id: 'billing' as TabType, label: 'Billing', icon: DocumentTextIcon },
    { id: 'resources' as TabType, label: 'Resources', icon: UserIcon },
    { id: 'issues' as TabType, label: 'Issues', icon: PlayIcon },
  ];

  // ============================================================================
  // RENDER TABS
  // ============================================================================

  const renderOverviewTab = () => (
    <div className="space-y-6">
      {/* Project Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card variant="glass">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/20 rounded-lg">
                <CurrencyDollarIcon className="h-5 w-5 text-blue-400" />
              </div>
              <div>
                <p className="text-xs text-gray-400">Estimated Budget</p>
                <p className="text-xl font-bold text-white">
                  ${project?.estimated_budget.toLocaleString() || 0}
                </p>
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
                <p className="text-xs text-gray-400">Actual Cost</p>
                <p className="text-xl font-bold text-white">
                  ${project?.actual_cost.toLocaleString() || 0}
                </p>
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
                <p className="text-xs text-gray-400">Revenue</p>
                <p className="text-xl font-bold text-white">
                  ${project?.actual_revenue.toLocaleString() || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card variant="glass">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-500/20 rounded-lg">
                <ChartBarIcon className="h-5 w-5 text-purple-400" />
              </div>
              <div>
                <p className="text-xs text-gray-400">Profit</p>
                <p className="text-xl font-bold text-white">
                  ${project?.profit_amount.toLocaleString() || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Progress Bars */}
      <Card variant="glass">
        <CardHeader>
          <CardTitle>Project Progress</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-400">Overall Progress</span>
                <span className="text-white font-medium">{project?.progress_percent || 0}%</span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-3">
                <div
                  className="bg-gradient-to-r from-blue-500 to-purple-600 h-3 rounded-full transition-all"
                  style={{ width: `${project?.progress_percent || 0}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-400">Budget Used</span>
                <span className="text-white font-medium">
                  {project?.estimated_budget
                    ? `${((project.actual_cost / project.estimated_budget) * 100).toFixed(1)}%`
                    : '0%'}
                </span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-3">
                <div
                  className={`h-3 rounded-full transition-all ${
                    project?.budget_variance && project.budget_variance < 0
                      ? 'bg-rose-500'
                      : 'bg-green-500'
                  }`}
                  style={{
                    width: `${project?.estimated_budget ? (project.actual_cost / project.estimated_budget) * 100 : 0}%`,
                  }}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Project Details */}
      <Card variant="glass">
        <CardHeader>
          <CardTitle>Project Details</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <dt className="text-sm text-gray-400">Project Number</dt>
              <dd className="text-sm text-white mt-1">{project?.project_number}</dd>
            </div>
            <div>
              <dt className="text-sm text-gray-400">Customer</dt>
              <dd className="text-sm text-white mt-1">{project?.customer?.name || '-'}</dd>
            </div>
            <div>
              <dt className="text-sm text-gray-400">Project Manager</dt>
              <dd className="text-sm text-white mt-1">
                {project?.project_manager
                  ? `${project.project_manager.first_name} ${project.project_manager.last_name}`
                  : '-'}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-gray-400">Account Manager</dt>
              <dd className="text-sm text-white mt-1">
                {project?.account_manager
                  ? `${project.account_manager.first_name} ${project.account_manager.last_name}`
                  : '-'}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-gray-400">Start Date</dt>
              <dd className="text-sm text-white mt-1">
                {project?.start_date ? new Date(project.start_date).toLocaleDateString() : '-'}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-gray-400">End Date</dt>
              <dd className="text-sm text-white mt-1">
                {project?.end_date ? new Date(project.end_date).toLocaleDateString() : '-'}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-gray-400">Contract Number</dt>
              <dd className="text-sm text-white mt-1">{project?.contract_number || '-'}</dd>
            </div>
            <div>
              <dt className="text-sm text-gray-400">Purchase Order</dt>
              <dd className="text-sm text-white mt-1">{project?.purchase_order_number || '-'}</dd>
            </div>
          </dl>
          {project?.project_description && (
            <div className="mt-4">
              <dt className="text-sm text-gray-400">Description</dt>
              <dd className="text-sm text-white mt-1">{project.project_description}</dd>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );

  const renderTasksTab = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-white">Tasks</h3>
        <Button>
          <PlusIcon className="h-4 w-4 mr-1" />
          Add Task
        </Button>
      </div>

      {tasks.length === 0 ? (
        <Card variant="glass">
          <CardContent className="p-12 text-center text-gray-400">
            <CheckCircleIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium">No tasks found</p>
            <p className="text-sm mt-1">Create tasks to track project work</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {tasks.map(task => (
            <Card key={task.task_id} variant="glass" className="hover:bg-white/5">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-medium text-white">{task.task_name}</h4>
                      <Badge className={getTaskStatusColor(task.task_status)} size="sm">
                        {task.task_status.replace(/_/g, ' ')}
                      </Badge>
                      {task.is_milestone && (
                        <Badge
                          className="bg-purple-500/20 text-purple-400 border-purple-500/30"
                          size="sm"
                        >
                          Milestone
                        </Badge>
                      )}
                    </div>
                    {task.task_description && (
                      <p className="text-xs text-gray-400 mt-1">{task.task_description}</p>
                    )}
                    <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                      <span>Est: {task.estimated_hours || 0}h</span>
                      <span>Actual: {task.actual_hours}h</span>
                      {task.due_date && (
                        <span>Due: {new Date(task.due_date).toLocaleDateString()}</span>
                      )}
                    </div>
                  </div>
                  <div className="ml-4">
                    <div className="w-16">
                      <div className="w-full bg-gray-700 rounded-full h-1.5">
                        <div
                          className="bg-blue-500 h-1.5 rounded-full"
                          style={{ width: `${task.progress_percent}%` }}
                        />
                      </div>
                      <p className="text-xs text-gray-500 mt-1 text-center">
                        {task.progress_percent}%
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );

  const renderTimeEntriesTab = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-white">Time Entries</h3>
        <Button onClick={() => setShowTimeEntryModal(true)}>
          <PlusIcon className="h-4 w-4 mr-1" />
          Add Time
        </Button>
      </div>

      {timeEntries.length === 0 ? (
        <Card variant="glass">
          <CardContent className="p-12 text-center text-gray-400">
            <ClockIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium">No time entries found</p>
            <p className="text-sm mt-1">Log time to track project work</p>
          </CardContent>
        </Card>
      ) : (
        <Card variant="glass">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-700">
                <thead className="bg-gray-900/50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">
                      Employee
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">
                      Task
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">
                      Hours
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">
                      Billable
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {timeEntries.map(entry => (
                    <tr key={entry.time_entry_id} className="hover:bg-white/5">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                        {new Date(entry.work_date).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                        {entry.employee_id}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                        {entry.task_id || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                        {entry.work_type.replace(/_/g, ' ')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                        {entry.total_hours}h
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {entry.billable ? (
                          <CheckCircleIcon className="h-5 w-5 text-green-400" />
                        ) : (
                          <span className="text-gray-500">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge
                          className={
                            entry.approved
                              ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                              : 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                          }
                          size="sm"
                        >
                          {entry.approved ? 'Approved' : 'Pending'}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );

  const renderExpensesTab = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-white">Expenses</h3>
        <Button>
          <PlusIcon className="h-4 w-4 mr-1" />
          Add Expense
        </Button>
      </div>

      {expenses.length === 0 ? (
        <Card variant="glass">
          <CardContent className="p-12 text-center text-gray-400">
            <CurrencyDollarIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium">No expenses found</p>
            <p className="text-sm mt-1">Track project-related expenses</p>
          </CardContent>
        </Card>
      ) : (
        <Card variant="glass">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-700">
                <thead className="bg-gray-900/50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">
                      Category
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">
                      Description
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">
                      Amount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">
                      Vendor
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {expenses.map(expense => (
                    <tr key={expense.expense_id} className="hover:bg-white/5">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                        {new Date(expense.expense_date).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                        {expense.expense_category.replace(/_/g, ' ')}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-300 max-w-xs truncate">
                        {expense.description}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                        ${expense.amount.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                        {expense.vendor_name || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge
                          className={
                            expense.approved
                              ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                              : 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                          }
                          size="sm"
                        >
                          {expense.approved ? 'Approved' : 'Pending'}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );

  const renderBillingTab = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-white">Billing Schedule</h3>
        <Button>
          <PlusIcon className="h-4 w-4 mr-1" />
          Add Milestone
        </Button>
      </div>

      {milestones.length === 0 ? (
        <Card variant="glass">
          <CardContent className="p-12 text-center text-gray-400">
            <DocumentTextIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium">No billing milestones found</p>
            <p className="text-sm mt-1">Create milestones to track project billing</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {milestones.map(milestone => (
            <Card key={milestone.milestone_id} variant="glass">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-medium text-white">{milestone.milestone_name}</h4>
                      {milestone.is_met ? (
                        <Badge
                          className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                          size="sm"
                        >
                          Completed
                        </Badge>
                      ) : (
                        <Badge
                          className="bg-amber-500/20 text-amber-400 border-amber-500/30"
                          size="sm"
                        >
                          Pending
                        </Badge>
                      )}
                    </div>
                    {milestone.milestone_description && (
                      <p className="text-xs text-gray-400 mt-1">
                        {milestone.milestone_description}
                      </p>
                    )}
                    <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                      <span>Due: {new Date(milestone.milestone_date).toLocaleDateString()}</span>
                      {milestone.billing_amount && (
                        <span>Amount: ${milestone.billing_amount.toLocaleString()}</span>
                      )}
                      {milestone.billing_percentage && (
                        <span>{milestone.billing_percentage}% of project</span>
                      )}
                    </div>
                  </div>
                  <div className="ml-4">
                    <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30" size="sm">
                      #{milestone.milestone_number}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );

  const renderResourcesTab = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-white">Team Resources</h3>
        <Button>
          <PlusIcon className="h-4 w-4 mr-1" />
          Assign Resource
        </Button>
      </div>

      {resources.length === 0 ? (
        <Card variant="glass">
          <CardContent className="p-12 text-center text-gray-400">
            <UserIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium">No resources assigned</p>
            <p className="text-sm mt-1">Assign team members to this project</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {resources.map(resource => (
            <Card key={resource.resource_id} variant="glass">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                    <UserIcon className="h-5 w-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-white">{resource.user_id}</p>
                    <p className="text-xs text-gray-400">{resource.role || 'Team Member'}</p>
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between text-xs text-gray-400">
                  <span>{resource.allocation_percent}% allocated</span>
                  {resource.hourly_rate && <span>${resource.hourly_rate}/hr</span>}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );

  const renderIssuesTab = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-white">Issues & Risks</h3>
        <Button>
          <PlusIcon className="h-4 w-4 mr-1" />
          Report Issue
        </Button>
      </div>

      {issues.length === 0 ? (
        <Card variant="glass">
          <CardContent className="p-12 text-center text-gray-400">
            <PlayIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium">No issues reported</p>
            <p className="text-sm mt-1">Track project issues and risks here</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {issues.map(issue => (
            <Card key={issue.issue_id} variant="glass">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-medium text-white">{issue.issue_title}</h4>
                      <Badge className={getIssueStatusColor(issue.status)} size="sm">
                        {issue.status.replace(/_/g, ' ')}
                      </Badge>
                      <Badge
                        className={
                          issue.severity === 'CRITICAL'
                            ? 'bg-rose-500/20 text-rose-400 border-rose-500/30'
                            : issue.severity === 'HIGH'
                              ? 'bg-orange-500/20 text-orange-400 border-orange-500/30'
                              : 'bg-blue-500/20 text-blue-400 border-blue-500/30'
                        }
                        size="sm"
                      >
                        {issue.severity}
                      </Badge>
                      <Badge
                        className="bg-purple-500/20 text-purple-400 border-purple-500/30"
                        size="sm"
                      >
                        {issue.issue_type.replace(/_/g, ' ')}
                      </Badge>
                    </div>
                    {issue.issue_description && (
                      <p className="text-xs text-gray-400 mt-1">{issue.issue_description}</p>
                    )}
                    <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                      <span>Reported: {new Date(issue.reported_date).toLocaleDateString()}</span>
                      {issue.assigned_to && <span>Assigned to: {issue.assigned_to}</span>}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );

  // ============================================================================
  // MAIN RENDER
  // ============================================================================

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <Header />
        <div className="flex justify-center items-center h-[50vh]">
          <LoadingSpinner />
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <Header />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Card variant="glass">
            <CardContent className="p-12 text-center text-gray-400">
              <DocumentTextIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">Project not found</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <Header />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb */}
        <Breadcrumb
          items={[{ label: 'Projects', href: '/projects' }, { label: project.project_name }]}
        />

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(-1)}
              className="p-2 hover:bg-white/5 rounded-lg transition-colors"
            >
              <ArrowLeftIcon className="h-5 w-5 text-gray-400" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-white">{project.project_name}</h1>
                <Badge className={getProjectStatusColor(project.project_status)} size="sm">
                  {project.project_status.replace(/_/g, ' ')}
                </Badge>
              </div>
              <p className="text-gray-400 mt-1">{project.project_number}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm">
              <PencilIcon className="h-4 w-4 mr-1" />
              Edit
            </Button>
            <Button variant="outline" size="sm">
              <DocumentTextIcon className="h-4 w-4 mr-1" />
              Reports
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                activeTab === tab.id
                  ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                  : 'bg-white/5 text-gray-400 hover:bg-white/10'
              }`}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="min-h-[400px]">
          {activeTab === 'overview' && renderOverviewTab()}
          {activeTab === 'tasks' && renderTasksTab()}
          {activeTab === 'time' && renderTimeEntriesTab()}
          {activeTab === 'expenses' && renderExpensesTab()}
          {activeTab === 'billing' && renderBillingTab()}
          {activeTab === 'resources' && renderResourcesTab()}
          {activeTab === 'issues' && renderIssuesTab()}
        </div>
      </div>

      {/* Time Entry Modal */}
      {project && (
        <TimeEntryModal
          isOpen={showTimeEntryModal}
          onClose={() => setShowTimeEntryModal(false)}
          onSuccess={() => {
            setShowTimeEntryModal(false);
            loadTimeEntries();
          }}
          projectId={project.project_id}
          tasks={tasks}
        />
      )}
    </div>
  );
}
