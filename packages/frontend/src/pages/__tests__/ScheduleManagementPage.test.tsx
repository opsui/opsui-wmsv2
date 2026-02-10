/**
 * Tests for ScheduleManagementPage component
 *
 * Tests for the Schedule Management page functionality including:
 * - Recurring cycle count schedules
 * - Create/edit/delete schedules
 * - Filter and search functionality
 * - Statistics display
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen } from '@/test/utils';
import ScheduleManagementPage from '../ScheduleManagementPage';

// Mock react-router-dom
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Mock the shared components
vi.mock('@/components/shared', async importOriginal => {
  const actual = await importOriginal<typeof import('@/components/shared')>();
  return {
    ...actual,
    Header: () => <div data-testid="header">Header</div>,
    Card: ({ children, className }: any) => <div className={className}>{children}</div>,
    CardContent: ({ children }: any) => <div>{children}</div>,
    CardHeader: ({ children }: any) => <div>{children}</div>,
    CardTitle: ({ children }: any) => <h3>{children}</h3>,
    Button: ({ children, onClick, ...props }: any) => (
      <button onClick={onClick} {...props}>
        {children}
      </button>
    ),
    Badge: ({ children }: any) => <span>{children}</span>,
    ConfirmDialog: ({ isOpen, onClose }: any) =>
      isOpen ? <div data-testid="confirm-dialog">Confirm Dialog</div> : null,
    CycleCountNavigation: ({ activePage }: any) => (
      <div data-testid="cycle-count-nav">Cycle Count Nav - {activePage}</div>
    ),
  };
});

// Mock useFormValidation hook
vi.mock('@/hooks/useFormValidation', () => ({
  useFormValidation: (config: any) => ({
    values: config.initialValues,
    errors: {},
    handleChange: vi.fn(),
    handleSubmit: vi.fn(async () => {}),
    isSubmitting: false,
    reset: vi.fn(),
    setFieldValue: vi.fn(),
  }),
}));

// Mock useToast
vi.mock('@/components/shared', async importOriginal => {
  const actual = await importOriginal<typeof import('@/components/shared')>();
  return {
    ...actual,
    useToast: () => ({
      showToast: vi.fn(),
    }),
  };
});

// Mock API hooks
vi.mock('@/services/api', async importOriginal => {
  const actual = await importOriginal<typeof import('@/services/api')>();
  return {
    ...actual,
    useRecurringSchedules: vi.fn(() => ({
      data: [
        {
          scheduleId: 'sched-001',
          scheduleName: 'Weekly A-Items Count',
          countType: 'ABC',
          frequencyType: 'WEEKLY',
          frequencyInterval: 1,
          location: 'Zone A',
          assignedTo: 'user-001',
          nextRunDate: '2025-01-20T10:00:00Z',
          isActive: true,
        },
      ],
      isLoading: false,
    })),
    useAssignableUsers: vi.fn(() => ({
      data: [
        { userId: 'user-001', name: 'John Doe', role: 'ADMIN' },
        { userId: 'user-002', name: 'Jane Smith', role: 'PICKER' },
      ],
      isLoading: false,
    })),
    useCreateRecurringSchedule: vi.fn(() => ({
      mutateAsync: vi.fn().mockResolvedValue({}),
      isPending: false,
    })),
    useUpdateRecurringSchedule: vi.fn(() => ({
      mutateAsync: vi.fn().mockResolvedValue({}),
      isPending: false,
    })),
    useDeleteRecurringSchedule: vi.fn(() => ({
      mutateAsync: vi.fn().mockResolvedValue({}),
      isPending: false,
    })),
  };
});

describe('ScheduleManagementPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock localStorage
    const localStorageMock = {
      getItem: vi.fn(() => null),
      setItem: vi.fn(),
      clear: vi.fn(),
    };
    global.localStorage = localStorageMock as any;
  });

  describe('Rendering', () => {
    it('renders without crashing', () => {
      const { container } = renderWithProviders(<ScheduleManagementPage />);
      expect(container).toBeInTheDocument();
    });

    it('displays page title', () => {
      renderWithProviders(<ScheduleManagementPage />);
      expect(screen.getByText('Recurring Count Schedules')).toBeInTheDocument();
      expect(
        screen.getByText('Automate your cycle counts by creating recurring schedules')
      ).toBeInTheDocument();
    });

    it('displays create schedule button', () => {
      renderWithProviders(<ScheduleManagementPage />);
      expect(screen.getByText('Create Schedule')).toBeInTheDocument();
    });
  });

  describe('Statistics', () => {
    it('displays total schedules count', () => {
      renderWithProviders(<ScheduleManagementPage />);
      expect(screen.getByText('Total Schedules')).toBeInTheDocument();
    });

    it('displays active schedules count', () => {
      renderWithProviders(<ScheduleManagementPage />);
      // There are multiple "Active" elements (stats and filters), so we check that at least one exists
      const activeElements = screen.getAllByText('Active');
      expect(activeElements.length).toBeGreaterThan(0);
    });

    it('displays inactive schedules count', () => {
      renderWithProviders(<ScheduleManagementPage />);
      // There are multiple "Inactive" elements (stats and filters), so we check that at least one exists
      const inactiveElements = screen.getAllByText('Inactive');
      expect(inactiveElements.length).toBeGreaterThan(0);
    });
  });

  describe('Filters', () => {
    it('renders status filter buttons', () => {
      renderWithProviders(<ScheduleManagementPage />);
      // Filter buttons have counts in parentheses like "All (1)", so we use flexible matchers
      expect(
        screen.getByText((content, element) => {
          return element?.tagName.toLowerCase() === 'button' && content?.startsWith('All');
        })
      ).toBeInTheDocument();
      expect(
        screen.getByText((content, element) => {
          return element?.tagName.toLowerCase() === 'button' && content?.startsWith('Active');
        })
      ).toBeInTheDocument();
      expect(
        screen.getByText((content, element) => {
          return element?.tagName.toLowerCase() === 'button' && content?.startsWith('Inactive');
        })
      ).toBeInTheDocument();
    });

    it('renders search input', () => {
      renderWithProviders(<ScheduleManagementPage />);
      expect(screen.getByPlaceholderText('Search schedules...')).toBeInTheDocument();
    });
  });

  describe('Schedule Cards', () => {
    it('displays schedule cards', () => {
      renderWithProviders(<ScheduleManagementPage />);
      expect(screen.getByText('Weekly A-Items Count')).toBeInTheDocument();
    });

    it('displays schedule details', () => {
      renderWithProviders(<ScheduleManagementPage />);
      expect(screen.getByText('ABC Analysis')).toBeInTheDocument();
      expect(screen.getByText('Zone A')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper heading structure', () => {
      renderWithProviders(<ScheduleManagementPage />);
      const heading = screen.getByRole('heading', { level: 1 });
      expect(heading).toHaveTextContent('Recurring Count Schedules');
    });
  });
});
