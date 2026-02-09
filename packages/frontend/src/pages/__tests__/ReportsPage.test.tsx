/**
 * Tests for ReportsPage component
 *
 * Tests for the Reports & Analytics page functionality including:
 * - Report management and execution
 * - Dashboard creation and viewing
 * - Export jobs
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen } from '@/test/utils';
import { ReportsPage } from '../ReportsPage';

// Mock the Header component
vi.mock('@/components/shared', async importOriginal => {
  const actual = await importOriginal<typeof import('@/components/shared')>();
  return {
    ...actual,
    Header: () => <div data-testid="header">Header</div>,
    Breadcrumb: () => <div data-testid="breadcrumb">Breadcrumb</div>,
    Button: ({ children, onClick, ...props }: any) => (
      <button onClick={onClick} {...props}>
        {children}
      </button>
    ),
    Pagination: ({ currentPage, totalItems, pageSize, onPageChange }: any) => (
      <div data-testid="pagination">
        Page {currentPage} of {Math.ceil(totalItems / pageSize)}
      </div>
    ),
    ConfirmDialog: ({ isOpen, onClose }: any) =>
      isOpen ? <div data-testid="confirm-dialog">Confirm Dialog</div> : null,
  };
});

// Mock report components
vi.mock('@/components/reports', () => ({
  ReportExecutionModal: ({ report, onClose }: any) =>
    report ? <div data-testid="report-execution-modal">Report Execution Modal</div> : null,
  DashboardBuilder: ({ dashboard, onSave, onCancel }: any) => (
    <div data-testid="dashboard-builder">Dashboard Builder</div>
  ),
}));

// Mock API services - use importOriginal to preserve all exports
const mockReports = [
  {
    reportId: 'rep-001',
    name: 'Inventory Summary',
    description: 'Daily inventory report',
    reportType: 'INVENTORY',
    status: 'DRAFT',
    createdBy: 'admin',
    createdAt: '2025-01-15T10:00:00Z',
    defaultFormat: 'PDF',
    chartConfig: { enabled: false, chartType: 'TABLE' },
  },
  {
    reportId: 'rep-002',
    name: 'Order Analysis',
    description: 'Weekly order analysis',
    reportType: 'ORDERS',
    status: 'DRAFT',
    createdBy: 'admin',
    createdAt: '2025-01-14T10:00:00Z',
    defaultFormat: 'EXCEL',
    chartConfig: { enabled: true, chartType: 'BAR' },
  },
];

const mockDashboards = [
  {
    dashboardId: 'dash-001',
    name: 'Operations Dashboard',
    description: 'Main operations overview',
    owner: 'admin',
    isPublic: true,
    widgets: [{ widgetId: 'widget-1', type: 'chart' }],
  },
];

const mockExportJobs = [
  {
    jobId: 'export-001',
    name: 'Orders Export',
    entityType: 'orders',
    format: 'CSV',
    status: 'COMPLETED',
  },
];

vi.mock('@/services/api', async importOriginal => {
  const actual = await importOriginal<typeof import('@/services/api')>();
  return {
    ...actual,
    useReports: vi.fn(() => ({
      data: { reports: mockReports },
      isLoading: false,
    })),
    useDashboards: vi.fn(() => ({
      data: { dashboards: mockDashboards },
      isLoading: false,
    })),
    useExportJobs: vi.fn(() => ({
      data: { jobs: mockExportJobs },
    })),
    useCreateReport: vi.fn(() => ({
      mutateAsync: vi.fn().mockResolvedValue({}),
    })),
    useUpdateReport: vi.fn(() => ({
      mutateAsync: vi.fn().mockResolvedValue({}),
    })),
    useDeleteReport: vi.fn(() => ({
      mutateAsync: vi.fn().mockResolvedValue({}),
    })),
    useExecuteReport: vi.fn(() => ({
      mutateAsync: vi.fn().mockResolvedValue({}),
    })),
    useCreateDashboard: vi.fn(() => ({
      mutateAsync: vi.fn().mockResolvedValue({}),
    })),
    useUpdateDashboard: vi.fn(() => ({
      mutateAsync: vi.fn().mockResolvedValue({}),
    })),
    useDeleteDashboard: vi.fn(() => ({
      mutateAsync: vi.fn().mockResolvedValue({}),
    })),
    useCreateExportJob: vi.fn(() => ({
      mutateAsync: vi.fn().mockResolvedValue({}),
    })),
  };
});

// Mock react-router-dom
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe('ReportsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders without crashing', () => {
      const { container } = renderWithProviders(<ReportsPage />);
      expect(container).toBeInTheDocument();
    });

    it('displays the page title', () => {
      renderWithProviders(<ReportsPage />);
      expect(screen.getByText('Reports & Analytics')).toBeInTheDocument();
      expect(
        screen.getByText('Create custom reports, view dashboards, and export data')
      ).toBeInTheDocument();
    });
  });

  describe('Tab Navigation', () => {
    it('renders all tabs', () => {
      renderWithProviders(<ReportsPage />);
      expect(screen.getByText('Reports')).toBeInTheDocument();
      expect(screen.getByText('Dashboards')).toBeInTheDocument();
      expect(screen.getByText('Exports')).toBeInTheDocument();
    });
  });

  describe('Reports Tab', () => {
    it('displays report cards', () => {
      renderWithProviders(<ReportsPage />);
      expect(screen.getByText('Inventory Summary')).toBeInTheDocument();
      expect(screen.getByText('Order Analysis')).toBeInTheDocument();
    });

    it('displays filter buttons', () => {
      renderWithProviders(<ReportsPage />);
      expect(screen.getByText('All Reports')).toBeInTheDocument();
      expect(screen.getByText('Inventory')).toBeInTheDocument();
      expect(screen.getByText('Orders')).toBeInTheDocument();
      expect(screen.getByText('Performance')).toBeInTheDocument();
    });

    it('renders search input', () => {
      renderWithProviders(<ReportsPage />);
      expect(screen.getByPlaceholderText('Search reports...')).toBeInTheDocument();
    });

    it('renders new report button', () => {
      renderWithProviders(<ReportsPage />);
      expect(screen.getByText('New Report')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper heading structure', () => {
      renderWithProviders(<ReportsPage />);
      const heading = screen.getByRole('heading', { level: 1 });
      expect(heading).toHaveTextContent('Reports & Analytics');
    });
  });
});
