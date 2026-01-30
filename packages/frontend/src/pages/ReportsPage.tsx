/**
 * Reports Page
 *
 * Advanced reporting interface for creating custom reports,
 * viewing dashboards, and exporting data.
 */

import { useState, useEffect } from 'react';
import {
  DocumentTextIcon,
  ChartBarIcon,
  ArrowDownTrayIcon,
  PlusIcon,
  PlayIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  XMarkIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline';
import {
  Report,
  ReportType,
  ReportStatus,
  ReportFormat,
  Dashboard,
  ExportJob,
} from '@opsui/shared';
import { Header, Pagination, useToast, ConfirmDialog } from '@/components/shared';
import { ReportExecutionModal, DashboardBuilder } from '@/components/reports';
import {
  useReports,
  useDashboards,
  useExportJobs,
  useCreateReport,
  useUpdateReport,
  useDeleteReport,
  useExecuteReport,
  useExportReport,
  useCreateDashboard,
  useUpdateDashboard,
  useDeleteDashboard,
  useCreateExportJob,
} from '@/services/api';
import { cn } from '@/lib/utils';
import { useFormValidation } from '@/hooks/useFormValidation';

// ============================================================================
// MAIN PAGE COMPONENT
// ============================================================================

export function ReportsPage() {
    const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<'reports' | 'dashboards' | 'exports'>('reports');
  const [selectedReport, setSelectedReport] = useState<Report | undefined>();
  const [selectedDashboard, setSelectedDashboard] = useState<Dashboard | undefined>();
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [dashboardModalOpen, setDashboardModalOpen] = useState(false);
  const [executionModalOpen, setExecutionModalOpen] = useState(false);
  const [reportFilter, setReportFilter] = useState<ReportType | 'ALL'>('ALL');
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; type: 'report' | 'dashboard'; id: string }>({
    isOpen: false,
    type: 'report',
    id: '',
  });

  // Pagination state
  const [reportsCurrentPage, setReportsCurrentPage] = useState(1);
  const [reportsPageSize] = useState(10);
  const [dashboardsCurrentPage, setDashboardsCurrentPage] = useState(1);
  const [dashboardsPageSize] = useState(10);

  // Search state
  const [reportsSearchTerm, setReportsSearchTerm] = useState('');
  const [dashboardsSearchTerm, setDashboardsSearchTerm] = useState('');

  // API hooks
  const { data: reportsData, isLoading: reportsLoading, error: reportsError, refetch: refetchReports } = useReports();
  const { data: dashboardsData, isLoading: dashboardsLoading, refetch: refetchDashboards } = useDashboards();
  const { data: exportsData, refetch: refetchExports } = useExportJobs();

  const createReport = useCreateReport();
  const updateReport = useUpdateReport();
  const deleteReport = useDeleteReport();
  const executeReport = useExecuteReport();
  const exportReport = useExportReport();
  const createDashboard = useCreateDashboard();
  const updateDashboard = useUpdateDashboard();
  const deleteDashboard = useDeleteDashboard();
  const createExportJob = useCreateExportJob();

  const reports = reportsData?.reports || [];
  const dashboards = dashboardsData || [];
  const exportJobs = exportsData?.jobs || [];

  // Filter reports by type
  const filteredReports = reportFilter === 'ALL' ? reports : reports.filter(r => r.reportType === reportFilter);

  // Search and paginate reports
  const searchedReports = filteredReports.filter(report =>
    !reportsSearchTerm.trim() ||
    report.name.toLowerCase().includes(reportsSearchTerm.toLowerCase()) ||
    report.reportId.toLowerCase().includes(reportsSearchTerm.toLowerCase())
  );
  const reportsTotalPages = Math.ceil(searchedReports.length / reportsPageSize);
  const paginatedReports = searchedReports.slice(
    (reportsCurrentPage - 1) * reportsPageSize,
    reportsCurrentPage * reportsPageSize
  );

  // Search and paginate dashboards
  const searchedDashboards = dashboards.filter(dashboard =>
    !dashboardsSearchTerm.trim() ||
    dashboard.name.toLowerCase().includes(dashboardsSearchTerm.toLowerCase()) ||
    dashboard.dashboardId.toLowerCase().includes(dashboardsSearchTerm.toLowerCase())
  );
  const dashboardsTotalPages = Math.ceil(searchedDashboards.length / dashboardsPageSize);
  const paginatedDashboards = searchedDashboards.slice(
    (dashboardsCurrentPage - 1) * dashboardsPageSize,
    dashboardsCurrentPage * dashboardsPageSize
  );

  // Reset page when search changes
  useEffect(() => {
    setReportsCurrentPage(1);
  }, [reportsSearchTerm]);
  useEffect(() => {
    setDashboardsCurrentPage(1);
  }, [dashboardsSearchTerm]);

  const handleSaveReport = async (reportData: Omit<Report, 'reportId' | 'createdAt' | 'updatedAt' | 'createdBy'>) => {
    if (selectedReport) {
      await updateReport.mutateAsync({
        reportId: selectedReport.reportId,
        updates: reportData,
      });
    } else {
      await createReport.mutateAsync(reportData);
    }
    refetchReports();
  };

  const handleDeleteReport = async (reportId: string) => {
    setDeleteConfirm({ isOpen: true, type: 'report', id: reportId });
  };

  const handleDeleteDashboard = async (dashboardId: string) => {
    setDeleteConfirm({ isOpen: true, type: 'dashboard', id: dashboardId });
  };

  const confirmDelete = async () => {
    const { type, id } = deleteConfirm;
    try {
      if (type === 'report') {
        await deleteReport.mutateAsync(id);
        refetchReports();
        showToast('Report deleted successfully', 'success');
      } else {
        await deleteDashboard.mutateAsync(id);
        refetchDashboards();
        showToast('Dashboard deleted successfully', 'success');
      }
    } catch (error: any) {
      showToast(error?.message || 'Failed to delete', 'error');
    } finally {
      setDeleteConfirm({ isOpen: false, type: 'report', id: '' });
    }
  };

  const handleExecuteReportWrapper = async (reportId: string, parameters?: Record<string, any>) => {
    const result = await executeReport.mutateAsync({ reportId, parameters });
    return result;
  };

  const handleExportReportWrapper = async (executionId: string, format: ReportFormat) => {
    await exportReport.mutateAsync({ executionId, format });
  };

  const handleSaveDashboard = async (dashboardData: Omit<Dashboard, 'dashboardId' | 'createdAt' | 'updatedAt' | 'createdBy'>) => {
    if (selectedDashboard) {
      await updateDashboard.mutateAsync({
        dashboardId: selectedDashboard.dashboardId,
        updates: dashboardData,
      });
    } else {
      await createDashboard.mutateAsync(dashboardData);
    }
    refetchDashboards();
  };

  const handleCreateExport = async (entityType: string, format: ReportFormat) => {
    await createExportJob.mutateAsync({
      name: `${entityType} Export`,
      entityType,
      format,
      filters: [],
      fields: [],
      status: ReportStatus.DRAFT,
      createdBy: 'current-user',
      createdAt: new Date(),
    });
    refetchExports();
  };

  return (
    <div className="min-h-screen">
      <Header />
      <main className="w-full px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">Reports & Analytics</h1>
          <p className="mt-2 text-gray-400">
            Create custom reports, view dashboards, and export data
          </p>
        </div>

        {/* Tabs */}
        <div className="mb-6 border-b border-white/[0.08]">
          <nav className="flex space-x-8">
            <button
              onClick={() => setActiveTab('reports')}
              className={cn(
                'py-4 px-1 border-b-2 font-medium text-sm transition-colors flex items-center gap-2',
                activeTab === 'reports'
                  ? 'border-primary-500 text-primary-400'
                  : 'border-transparent text-gray-400 hover:text-gray-200'
              )}
            >
              <DocumentTextIcon className="h-5 w-5" />
              Reports
            </button>
            <button
              onClick={() => setActiveTab('dashboards')}
              className={cn(
                'py-4 px-1 border-b-2 font-medium text-sm transition-colors flex items-center gap-2',
                activeTab === 'dashboards'
                  ? 'border-primary-500 text-primary-400'
                  : 'border-transparent text-gray-400 hover:text-gray-200'
              )}
            >
              <ChartBarIcon className="h-5 w-5" />
              Dashboards
            </button>
            <button
              onClick={() => setActiveTab('exports')}
              className={cn(
                'py-4 px-1 border-b-2 font-medium text-sm transition-colors flex items-center gap-2',
                activeTab === 'exports'
                  ? 'border-primary-500 text-primary-400'
                  : 'border-transparent text-gray-400 hover:text-gray-200'
              )}
            >
              <ArrowDownTrayIcon className="h-5 w-5" />
              Exports
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === 'reports' && (
          <ReportsTab
            reports={paginatedReports}
            isLoading={reportsLoading}
            error={reportsError}
            filter={reportFilter}
            onFilterChange={setReportFilter}
            onSelectReport={(report) => {
              setSelectedReport(report);
              setExecutionModalOpen(true);
            }}
            onEditReport={(report) => {
              setSelectedReport(report);
              setReportModalOpen(true);
            }}
            onDeleteReport={handleDeleteReport}
            onCreateReport={() => {
              setSelectedReport(undefined);
              setReportModalOpen(true);
            }}
            searchTerm={reportsSearchTerm}
            onSearchChange={setReportsSearchTerm}
            currentPage={reportsCurrentPage}
            totalPages={reportsTotalPages}
            onPageChange={setReportsCurrentPage}
          />
        )}

        {activeTab === 'dashboards' && (
          <DashboardsTab
            dashboards={paginatedDashboards}
            reports={reports}
            isLoading={dashboardsLoading}
            onSelectDashboard={(dashboard) => {
              setSelectedDashboard(dashboard);
              setDashboardModalOpen(true);
            }}
            onCreateDashboard={() => {
              setSelectedDashboard(undefined);
              setDashboardModalOpen(true);
            }}
            onDeleteDashboard={handleDeleteDashboard}
            searchTerm={dashboardsSearchTerm}
            onSearchChange={setDashboardsSearchTerm}
            currentPage={dashboardsCurrentPage}
            totalPages={dashboardsTotalPages}
            onPageChange={setDashboardsCurrentPage}
          />
        )}

        {activeTab === 'exports' && (
          <ExportsTab
            exportJobs={exportJobs}
            onCreateExport={handleCreateExport}
          />
        )}

        {/* Report Execution Modal */}
        {executionModalOpen && selectedReport && (
          <ReportExecutionModal
            report={selectedReport}
            onClose={() => {
              setExecutionModalOpen(false);
              setSelectedReport(undefined);
            }}
            onExecute={async (parameters) => await handleExecuteReportWrapper(selectedReport.reportId, parameters)}
          />
        )}

        {/* Report Edit/Create Modal */}
        {reportModalOpen && (
          <ReportModal
            report={selectedReport}
            onClose={() => {
              setReportModalOpen(false);
              setSelectedReport(undefined);
            }}
            onSave={handleSaveReport}
          />
        )}

        {/* Dashboard Builder Modal */}
        {dashboardModalOpen && (
          <DashboardBuilderModal
            dashboard={selectedDashboard}
            reports={reports}
            onClose={() => {
              setDashboardModalOpen(false);
              setSelectedDashboard(undefined);
            }}
            onSave={handleSaveDashboard}
          />
        )}

        <ConfirmDialog
          isOpen={deleteConfirm.isOpen}
          onClose={() => setDeleteConfirm({ isOpen: false, type: 'report', id: '' })}
          onConfirm={confirmDelete}
          title={deleteConfirm.type === 'report' ? 'Delete Report' : 'Delete Dashboard'}
          message={`Are you sure you want to delete this ${deleteConfirm.type}? This action cannot be undone.`}
          confirmText="Delete"
          cancelText="Cancel"
          variant="danger"
          isLoading={deleteReport.isPending || deleteDashboard.isPending}
        />
      </main>
    </div>
  );
}

// ============================================================================
// REPORTS TAB
// ============================================================================

interface ReportsTabProps {
  reports: Report[];
  isLoading: boolean;
  error: unknown;
  filter: ReportType | 'ALL';
  onFilterChange: (filter: ReportType | 'ALL') => void;
  onSelectReport: (report: Report) => void;
  onEditReport: (report: Report) => void;
  onDeleteReport: (reportId: string) => void;
  onCreateReport: () => void;
  searchTerm: string;
  onSearchChange: (term: string) => void;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

function ReportsTab({
  reports,
  isLoading,
  error,
  filter,
  onFilterChange,
  onSelectReport,
  onEditReport,
  onDeleteReport,
  onCreateReport,
  searchTerm,
  onSearchChange,
  currentPage,
  totalPages,
  onPageChange,
}: ReportsTabProps) {
  return (
    <div>
      {/* Actions Bar */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex gap-2">
          <button
            onClick={() => onFilterChange('ALL')}
            className={cn(
              'px-4 py-2 rounded-md font-medium transition-colors',
              filter === 'ALL'
                ? 'bg-primary-500/20 text-primary-400 border border-primary-500/30'
                : 'bg-white/5 text-gray-300 border border-white/[0.08] hover:bg-white/10'
            )}
          >
            All Reports
          </button>
          <button
            onClick={() => onFilterChange(ReportType.INVENTORY)}
            className={cn(
              'px-4 py-2 rounded-md font-medium transition-colors',
              filter === ReportType.INVENTORY
                ? 'bg-primary-500/20 text-primary-400 border border-primary-500/30'
                : 'bg-white/5 text-gray-300 border border-white/[0.08] hover:bg-white/10'
            )}
          >
            Inventory
          </button>
          <button
            onClick={() => onFilterChange(ReportType.ORDERS)}
            className={cn(
              'px-4 py-2 rounded-md font-medium transition-colors',
              filter === ReportType.ORDERS
                ? 'bg-primary-500/20 text-primary-400 border border-primary-500/30'
                : 'bg-white/5 text-gray-300 border border-white/[0.08] hover:bg-white/10'
            )}
          >
            Orders
          </button>
          <button
            onClick={() => onFilterChange(ReportType.PICKING_PERFORMANCE)}
            className={cn(
              'px-4 py-2 rounded-md font-medium transition-colors',
              filter === ReportType.PICKING_PERFORMANCE
                ? 'bg-primary-500/20 text-primary-400 border border-primary-500/30'
                : 'bg-white/5 text-gray-300 border border-white/[0.08] hover:bg-white/10'
            )}
          >
            Performance
          </button>
        </div>

        <button
          onClick={onCreateReport}
          className="flex items-center px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors"
        >
          <PlusIcon className="h-5 w-5 mr-2" />
          New Report
        </button>
      </div>

      {/* Search Bar */}
      <div className="mb-6">
        <div className="relative">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search reports..."
            className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
          <p className="mt-4 text-gray-400">Loading reports...</p>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 text-center">
          <p className="text-red-400">Failed to load reports</p>
        </div>
      )}

      {/* Reports Grid */}
      {!isLoading && !error && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {reports.map(report => (
            <div
              key={report.reportId}
              className="glass-card rounded-lg p-6 hover:shadow-lg transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-white">{report.name}</h3>
                  <p className="text-sm text-gray-400 mt-1">{report.description}</p>
                </div>
                <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-900/50 text-blue-300 border border-blue-700">
                  {report.reportType}
                </span>
              </div>

              <div className="mb-4">
                <div className="flex items-center text-sm text-gray-400">
                  <span>Created by {report.createdBy}</span>
                  <span className="mx-2">•</span>
                  <span>{new Date(report.createdAt).toLocaleDateString()}</span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-white/[0.08]">
                <div className="flex gap-2">
                  <button
                    onClick={() => onSelectReport(report)}
                    className="text-green-400 hover:text-green-300 transition-colors"
                    title="Run Report"
                  >
                    <PlayIcon className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => onEditReport(report)}
                    className="text-blue-400 hover:text-blue-300 transition-colors"
                    title="Edit Report"
                  >
                    <PencilIcon className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => onDeleteReport(report.reportId)}
                    className="text-red-400 hover:text-red-300 transition-colors"
                    title="Delete Report"
                  >
                    <TrashIcon className="h-5 w-5" />
                  </button>
                </div>
                <div className="flex gap-2 text-xs text-gray-400">
                  {report.chartConfig.enabled && (
                    <span>{report.chartConfig.chartType}</span>
                  )}
                  <span>{report.defaultFormat}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {!isLoading && !error && totalPages > 1 && (
        <div className="mt-6 flex justify-center">
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={onPageChange}
          />
        </div>
      )}

      {!isLoading && !error && reports.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-400">No reports found</p>
          <button onClick={onCreateReport} className="mt-4 text-primary-400 hover:text-primary-300">
            Create your first report
          </button>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// DASHBOARDS TAB
// ============================================================================

interface DashboardsTabProps {
  dashboards: Dashboard[];
  reports: Report[];
  isLoading: boolean;
  onSelectDashboard: (dashboard: Dashboard) => void;
  onCreateDashboard: () => void;
  onDeleteDashboard: (dashboardId: string) => void;
  searchTerm: string;
  onSearchChange: (term: string) => void;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

function DashboardsTab({
  dashboards,
  reports,
  isLoading,
  onSelectDashboard,
  onCreateDashboard,
  onDeleteDashboard,
  searchTerm,
  onSearchChange,
  currentPage,
  totalPages,
  onPageChange,
}: DashboardsTabProps) {
  return (
    <div>
      {/* Actions Bar */}
      <div className="mb-6 flex justify-end">
        <button
          onClick={onCreateDashboard}
          className="flex items-center px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors"
        >
          <PlusIcon className="h-5 w-5 mr-2" />
          New Dashboard
        </button>
      </div>

      {/* Search Bar */}
      <div className="mb-6">
        <div className="relative">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search dashboards..."
            className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
          <p className="mt-4 text-gray-400">Loading dashboards...</p>
        </div>
      )}

      {/* Dashboards Grid */}
      {!isLoading && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {dashboards.map(dashboard => (
            <div key={dashboard.dashboardId} className="glass-card rounded-lg p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-white mb-2">{dashboard.name}</h3>
                  <p className="text-sm text-gray-400">{dashboard.description}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => onSelectDashboard(dashboard)}
                    className="text-blue-400 hover:text-blue-300 transition-colors"
                    title="View Dashboard"
                  >
                    <EyeIcon className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => onDeleteDashboard(dashboard.dashboardId)}
                    className="text-red-400 hover:text-red-300 transition-colors"
                    title="Delete Dashboard"
                  >
                    <TrashIcon className="h-5 w-5" />
                  </button>
                </div>
              </div>

              <div className="bg-black/20 rounded-lg p-4 mb-4" style={{ minHeight: '200px' }}>
                <p className="text-center text-gray-500 text-sm">
                  Dashboard preview with {dashboard.widgets.length} widget{dashboard.widgets.length !== 1 ? 's' : ''}
                </p>
              </div>

              <div className="flex items-center justify-between text-sm text-gray-400">
                <span>Owner: {dashboard.owner}</span>
                {dashboard.isPublic && (
                  <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded-full text-xs border border-green-500/30">
                    Public
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {!isLoading && totalPages > 1 && (
        <div className="mt-6 flex justify-center">
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={onPageChange}
          />
        </div>
      )}

      {!isLoading && dashboards.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-400">No dashboards found</p>
          <button onClick={onCreateDashboard} className="mt-4 text-primary-400 hover:text-primary-300">
            Create your first dashboard
          </button>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// EXPORTS TAB
// ============================================================================

interface ExportsTabProps {
  exportJobs: ExportJob[];
  onCreateExport: (entityType: string, format: ReportFormat) => void;
}

function ExportsTab({ exportJobs, onCreateExport }: ExportsTabProps) {
  const [entityType, setEntityType] = useState('orders');
  const [format, setFormat] = useState(ReportFormat.CSV);

  const handleExport = () => {
    onCreateExport(entityType, format);
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="glass-card rounded-lg p-6">
        <h2 className="text-xl font-bold text-white mb-4">Export Data</h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Entity Type</label>
            <select
              value={entityType}
              onChange={e => setEntityType(e.target.value)}
              className="w-full px-3 py-2 bg-black/20 border border-white/[0.08] text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="orders">Orders</option>
              <option value="inventory">Inventory</option>
              <option value="shipments">Shipments</option>
              <option value="pick_tasks">Pick Tasks</option>
              <option value="users">Users</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Export Format</label>
            <select
              value={format}
              onChange={e => setFormat(e.target.value as ReportFormat)}
              className="w-full px-3 py-2 bg-black/20 border border-white/[0.08] text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value={ReportFormat.CSV}>CSV</option>
              <option value={ReportFormat.EXCEL}>Excel</option>
              <option value={ReportFormat.PDF}>PDF</option>
              <option value={ReportFormat.JSON}>JSON</option>
            </select>
          </div>

          <button
            onClick={handleExport}
            className="w-full flex items-center justify-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            <ArrowDownTrayIcon className="h-5 w-5 mr-2" />
            Export Data
          </button>
        </div>

        <div className="mt-6 pt-6 border-t border-white/[0.08]">
          <h3 className="text-sm font-medium text-gray-300 mb-3">Recent Exports</h3>
          {exportJobs.length > 0 ? (
            <div className="space-y-2">
              {exportJobs.map(job => (
                <div key={job.jobId} className="flex items-center justify-between p-3 rounded-lg bg-white/5">
                  <div>
                    <p className="text-sm text-white">{job.name}</p>
                    <p className="text-xs text-gray-400">{job.entityType} • {job.format}</p>
                  </div>
                  <div className="text-right">
                    <span className={cn(
                      'text-xs px-2 py-1 rounded-full',
                      job.status === ReportStatus.COMPLETED && 'bg-green-500/20 text-green-400',
                      job.status === ReportStatus.RUNNING && 'bg-blue-500/20 text-blue-400',
                      job.status === ReportStatus.FAILED && 'bg-red-500/20 text-red-400',
                    )}>
                      {job.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400">No recent exports</p>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// REPORT MODAL
// ============================================================================

interface ReportModalProps {
  report?: Report;
  onClose: () => void;
  onSave: (report: Omit<Report, 'reportId' | 'createdAt' | 'updatedAt' | 'createdBy'>) => void;
}

function ReportModal({ report, onClose, onSave }: ReportModalProps) {
  const { showToast } = useToast();
  const isEdit = !!report;

  // Form validation
  const {
    values: formData,
    errors,
    handleChange,
    handleSubmit,
    isSubmitting,
    setFieldValue,
  } = useFormValidation({
    initialValues: {
      name: report?.name || '',
      description: report?.description || '',
      reportType: report?.reportType || ReportType.CUSTOM,
      isPublic: report?.isPublic ?? false,
      category: report?.category || '',
      defaultFormat: report?.defaultFormat || ReportFormat.PDF,
      allowExport: report?.allowExport ?? true,
      allowSchedule: report?.allowSchedule ?? true,
    },
    validationRules: {
      name: {
        required: true,
        minLength: 3,
        maxLength: 100,
      },
      description: {
        maxLength: 500,
      },
      reportType: {
        required: true,
      },
      category: {
        required: true,
      },
    },
    onSubmit: async (values) => {
      try {
        onSave({
          ...values,
          status: ReportStatus.DRAFT,
          fields: report?.fields || [],
          filters: report?.filters || [],
          groups: report?.groups || [],
          chartConfig: report?.chartConfig || { enabled: false, chartType: 'TABLE', showLegend: false, showDataLabels: false },
          tags: report?.tags || [],
        });
        onClose();
        showToast(isEdit ? 'Report updated successfully' : 'Report created successfully', 'success');
      } catch (error: any) {
        console.error('Failed to save report:', error);
        showToast(error?.message || 'Failed to save report', 'error');
        throw error;
      }
    },
  });

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-white/[0.08]">
          <h2 className="text-xl font-bold text-white">{isEdit ? 'Edit Report' : 'Create New Report'}</h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white transition-colors"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-white mb-1">Report Name *</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className={`w-full px-3 py-2 bg-black/20 border text-white placeholder-gray-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                  errors.name ? 'border-red-500' : 'border-white/[0.08]'
                }`}
                placeholder="e.g., Inventory Summary"
              />
              {errors.name && <p className="mt-1 text-sm text-red-500">{errors.name}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-white mb-1">Description</label>
              <textarea
                name="description"
                rows={2}
                value={formData.description}
                onChange={handleChange}
                className={`w-full px-3 py-2 bg-black/20 border text-white placeholder-gray-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                  errors.description ? 'border-red-500' : 'border-white/[0.08]'
                }`}
                placeholder="Describe what this report shows..."
              />
              {errors.description && <p className="mt-1 text-sm text-red-500">{errors.description}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-white mb-1">Report Type *</label>
                <select
                  name="reportType"
                  value={formData.reportType}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 bg-black/20 border text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                    errors.reportType ? 'border-red-500' : 'border-white/[0.08]'
                  }`}
                >
                  <option value={ReportType.INVENTORY}>Inventory</option>
                  <option value={ReportType.ORDERS}>Orders</option>
                  <option value={ReportType.SHIPPING}>Shipping</option>
                  <option value={ReportType.RECEIVING}>Receiving</option>
                  <option value={ReportType.PICKING_PERFORMANCE}>Picking Performance</option>
                  <option value={ReportType.PACKING_PERFORMANCE}>Packing Performance</option>
                  <option value={ReportType.CYCLE_COUNTS}>Cycle Counts</option>
                  <option value={ReportType.LOCATION_UTILIZATION}>Location Utilization</option>
                  <option value={ReportType.USER_PERFORMANCE}>User Performance</option>
                  <option value={ReportType.CUSTOM}>Custom</option>
                </select>
                {errors.reportType && <p className="mt-1 text-sm text-red-500">{errors.reportType}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-1">Category *</label>
                <input
                  type="text"
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 bg-black/20 border text-white placeholder-gray-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                    errors.category ? 'border-red-500' : 'border-white/[0.08]'
                  }`}
                  placeholder="e.g., Operations, Analytics"
                />
                {errors.category && <p className="mt-1 text-sm text-red-500">{errors.category}</p>}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-white mb-1">Default Format</label>
              <select
                value={formData.defaultFormat}
                onChange={e => setFormData({ ...formData, defaultFormat: e.target.value as ReportFormat })}
                className="w-full px-3 py-2 bg-black/20 border border-white/[0.08] text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value={ReportFormat.PDF}>PDF</option>
                <option value={ReportFormat.EXCEL}>Excel</option>
                <option value={ReportFormat.CSV}>CSV</option>
                <option value={ReportFormat.HTML}>HTML</option>
                <option value={ReportFormat.JSON}>JSON</option>
              </select>
            </div>

            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  name="isPublic"
                  checked={formData.isPublic}
                  onChange={e => setFieldValue('isPublic', e.target.checked)}
                  className="rounded bg-white/5 border-white/[0.08]"
                />
                <span className="text-sm text-gray-300">Make this report visible to all users</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  name="allowExport"
                  checked={formData.allowExport}
                  onChange={e => setFieldValue('allowExport', e.target.checked)}
                  className="rounded bg-white/5 border-white/[0.08]"
                />
                <span className="text-sm text-gray-300">Allow exporting</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  name="allowSchedule"
                  checked={formData.allowSchedule}
                  onChange={e => setFieldValue('allowSchedule', e.target.checked)}
                  className="rounded bg-white/5 border-white/[0.08]"
                />
                <span className="text-sm text-gray-300">Allow scheduling</span>
              </label>
            </div>
          </form>
        </div>

        <div className="flex justify-end gap-3 p-6 border-t border-white/[0.08]">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-white/[0.08] rounded-lg text-gray-300 hover:bg-white/5 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
          >
            {isSubmitting ? 'Saving...' : isEdit ? 'Update Report' : 'Create Report'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// DASHBOARD BUILDER MODAL
// ============================================================================

interface DashboardBuilderModalProps {
  dashboard?: Dashboard;
  reports: Report[];
  onClose: () => void;
  onSave: (dashboard: Omit<Dashboard, 'dashboardId' | 'createdAt' | 'updatedAt' | 'createdBy'>) => void;
}

function DashboardBuilderModal({ dashboard, reports, onClose, onSave }: DashboardBuilderModalProps) {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-lg shadow-xl w-full h-[90vh] flex flex-col">
        <DashboardBuilder
          dashboard={dashboard}
          reports={reports}
          onSave={onSave}
          onCancel={onClose}
        />
      </div>
    </div>
  );
}
