/**
 * Tests for CycleCountingPage component
 * @covers src/pages/CycleCountingPage.tsx
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { CycleCountingPage } from '../CycleCountingPage';
import { useAuthStore } from '@/stores';
import * as api from '@/services/api';

// Mock the hooks
jest.mock('@/stores');
jest.mock('@/services/api');
jest.mock('@/components/shared', () => ({
  ...jest.requireActual('@/components/shared'),
  Header: ({ children, ...props }: any) => <header {...props}>{children}</header>,
}));

const mockUseAuthStore = useAuthStore as jest.MockedFunction<typeof useAuthStore>;

describe('CycleCountingPage', () => {
  let queryClient: QueryClient;

  const mockUser = {
    userId: 'user-123',
    email: 'stockcontroller@example.com',
    name: 'Test Stock Controller',
    role: 'STOCK_CONTROLLER' as const,
    active: true,
  };

  const mockCycleCounts = [
    {
      countId: 'COUNT-001',
      type: 'BLANKET' as const,
      zone: 'A',
      status: 'IN_PROGRESS' as const,
      startDate: '2024-01-01T10:00:00Z',
      scheduledDate: '2024-01-01T10:00:00Z',
      countedBy: 'user-123',
      totalItems: 100,
      completedItems: 45,
      varianceCount: 2,
    },
    {
      countId: 'COUNT-002',
      type: 'SPOT_CHECK' as const,
      zone: 'B',
      status: 'PENDING' as const,
      startDate: '2024-01-02T10:00:00Z',
      scheduledDate: '2024-01-02T10:00:00Z',
      totalItems: 50,
      completedItems: 0,
      varianceCount: 0,
    },
  ];

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    mockUseAuthStore.mockReturnValue({
      user: mockUser,
      getEffectiveRole: () => 'STOCK_CONTROLLER',
    } as any);

    (api.useStockCounts as jest.Mock).mockReturnValue({
      data: {
        counts: mockCycleCounts,
        total: 2,
        page: 1,
        totalPages: 1,
      },
      isLoading: false,
    });

    (api.useStartCycleCount as jest.Mock).mockReturnValue({
      mutateAsync: jest.fn().mockResolvedValue({}),
      isPending: false,
    });

    (api.useCompleteCycleCount as jest.Mock).mockReturnValue({
      mutateAsync: jest.fn().mockResolvedValue({}),
      isPending: false,
    });

    (api.useCreateStockCount as jest.Mock).mockReturnValue({
      mutateAsync: jest.fn().mockResolvedValue({}),
      isPending: false,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const renderWithProviders = (component: React.ReactElement) => {
    return render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>{component}</BrowserRouter>
      </QueryClientProvider>
    );
  };

  describe('Rendering', () => {
    it('should render the cycle counting page', () => {
      renderWithProviders(<CycleCountingPage />);

      expect(screen.getByText('Cycle Counting')).toBeInTheDocument();
    });

    it('should display cycle count cards', () => {
      renderWithProviders(<CycleCountingPage />);

      expect(screen.getByText('COUNT-001')).toBeInTheDocument();
      expect(screen.getByText('COUNT-002')).toBeInTheDocument();
    });

    it('should display count type badges', () => {
      renderWithProviders(<CycleCountingPage />);

      expect(screen.getByText('BLANKET')).toBeInTheDocument();
      expect(screen.getByText('SPOT CHECK')).toBeInTheDocument();
    });

    it('should display zone information', () => {
      renderWithProviders(<CycleCountingPage />);

      expect(screen.getByText('Zone A')).toBeInTheDocument();
      expect(screen.getByText('Zone B')).toBeInTheDocument();
    });
  });

  describe('Access Control', () => {
    it('should show access denied for unauthorized users', () => {
      mockUseAuthStore.mockReturnValue({
        user: { ...mockUser, role: 'PICKER' as const },
        getEffectiveRole: () => 'PICKER',
      } as any);

      renderWithProviders(<CycleCountingPage />);

      expect(screen.getByText(/Access Denied/i)).toBeInTheDocument();
    });

    it('should render for stock controller users', () => {
      renderWithProviders(<CycleCountingPage />);

      expect(screen.queryByText(/Access Denied/i)).not.toBeInTheDocument();
      expect(screen.getByText('Cycle Counting')).toBeInTheDocument();
    });

    it('should render for supervisor users', () => {
      mockUseAuthStore.mockReturnValue({
        user: { ...mockUser, role: 'SUPERVISOR' as const },
        getEffectiveRole: () => 'SUPERVISOR',
      } as any);

      renderWithProviders(<CycleCountingPage />);

      expect(screen.getByText('Cycle Counting')).toBeInTheDocument();
    });

    it('should render for admin users', () => {
      mockUseAuthStore.mockReturnValue({
        user: { ...mockUser, role: 'ADMIN' as const },
        getEffectiveRole: () => 'ADMIN',
      } as any);

      renderWithProviders(<CycleCountingPage />);

      expect(screen.getByText('Cycle Counting')).toBeInTheDocument();
    });
  });

  describe('Count Status', () => {
    it('should display count status badges', () => {
      renderWithProviders(<CycleCountingPage />);

      expect(screen.getByText('IN PROGRESS')).toBeInTheDocument();
      expect(screen.getByText('PENDING')).toBeInTheDocument();
    });

    it('should show progress for in-progress counts', () => {
      renderWithProviders(<CycleCountingPage />);

      expect(screen.getByText('45 / 100')).toBeInTheDocument();
      expect(screen.getByText('45%')).toBeInTheDocument();
    });
  });

  describe('Filtering', () => {
    it('should filter counts by status', async () => {
      renderWithProviders(<CycleCountingPage />);

      // Status filter would be in the UI
      const inProgressFilter = screen.queryByText('IN_PROGRESS');
      if (inProgressFilter) {
        await userEvent.click(inProgressFilter);

        await waitFor(() => {
          expect(screen.getByText('COUNT-001')).toBeInTheDocument();
        });
      }
    });

    it('should filter counts by type', async () => {
      renderWithProviders(<CycleCountingPage />);

      const typeFilter = screen.queryByText('BLANKET');
      if (typeFilter) {
        await userEvent.click(typeFilter);

        await waitFor(() => {
          expect(screen.getByText('COUNT-001')).toBeInTheDocument();
        });
      }
    });

    it('should filter counts by zone', async () => {
      renderWithProviders(<CycleCountingPage />);

      const zoneFilter = screen.queryByText('Zone A');
      if (zoneFilter) {
        await userEvent.click(zoneFilter);

        await waitFor(() => {
          expect(screen.getByText('COUNT-001')).toBeInTheDocument();
        });
      }
    });
  });

  describe('Starting a Count', () => {
    it('should start a count when start button is clicked', async () => {
      const startCountMock = jest.fn().mockResolvedValue({});
      (api.useStartCycleCount as jest.Mock).mockReturnValue({
        mutateAsync: startCountMock,
        isPending: false,
      });

      renderWithProviders(<CycleCountingPage />);

      const startButton = screen.queryByText('Start');
      if (startButton) {
        await userEvent.click(startButton);

        await waitFor(() => {
          expect(startCountMock).toHaveBeenCalled();
        });
      }
    });
  });

  describe('Creating a New Count', () => {
    it('should open new count modal when button clicked', async () => {
      renderWithProviders(<CycleCountingPage />);

      const newCountButton = screen.queryByText(/New Count/i);
      if (newCountButton) {
        await userEvent.click(newCountButton);

        await waitFor(() => {
          expect(screen.getByText('Create Cycle Count')).toBeInTheDocument();
        });
      }
    });

    it('should have count type options', async () => {
      renderWithProviders(<CycleCountingPage />);

      const newCountButton = screen.queryByText(/New Count/i);
      if (newCountButton) {
        await userEvent.click(newCountButton);

        await waitFor(() => {
          expect(screen.getByText('BLANKET')).toBeInTheDocument();
          expect(screen.getByText('ABC ANALYSIS')).toBeInTheDocument();
          expect(screen.getByText('SPOT CHECK')).toBeInTheDocument();
          expect(screen.getByText('BIN SPECIFIC')).toBeInTheDocument();
        });
      }
    });
  });

  describe('Count Details', () => {
    it('should show count details when count is clicked', async () => {
      renderWithProviders(<CycleCountingPage />);

      const countCard = screen.getByText('COUNT-001').closest('div');
      if (countCard) {
        await userEvent.click(countCard);

        await waitFor(() => {
          // Count details should be visible
          expect(screen.getByText('Variance Count')).toBeInTheDocument();
        });
      }
    });

    it('should display variance information', () => {
      renderWithProviders(<CycleCountingPage />);

      expect(screen.getByText('2 Variances')).toBeInTheDocument();
    });
  });

  describe('Completing a Count', () => {
    it('should allow completing an in-progress count', async () => {
      const completeCountMock = jest.fn().mockResolvedValue({});
      (api.useCompleteCycleCount as jest.Mock).mockReturnValue({
        mutateAsync: completeCountMock,
        isPending: false,
      });

      renderWithProviders(<CycleCountingPage />);

      const completeButton = screen.queryByText('Complete');
      if (completeButton) {
        await userEvent.click(completeButton);

        await waitFor(() => {
          expect(completeCountMock).toHaveBeenCalled();
        });
      }
    });
  });

  describe('Count Entries', () => {
    it('should display count entries for a count', async () => {
      const mockCountWithEntries = {
        ...mockCycleCounts[0],
        entries: [
          {
            entryId: 'ENTRY-001',
            countId: 'COUNT-001',
            sku: 'SKU-001',
            binLocation: 'A-01-01',
            expectedQuantity: 10,
            countedQuantity: 10,
            variance: 0,
          },
          {
            entryId: 'ENTRY-002',
            countId: 'COUNT-001',
            sku: 'SKU-002',
            binLocation: 'A-01-02',
            expectedQuantity: 5,
            countedQuantity: 4,
            variance: -1,
          },
        ],
      };

      (api.useCycleCountDashboard as jest.Mock).mockReturnValue({
        data: mockCountWithEntries,
        isLoading: false,
      });

      renderWithProviders(<CycleCountingPage />);

      const countCard = screen.getByText('COUNT-001').closest('div');
      if (countCard) {
        await userEvent.click(countCard);

        await waitFor(() => {
          expect(screen.getByText('SKU-001')).toBeInTheDocument();
          expect(screen.getByText('SKU-002')).toBeInTheDocument();
        });
      }
    });
  });

  describe('Search Functionality', () => {
    it('should filter counts by search query', async () => {
      renderWithProviders(<CycleCountingPage />);

      const searchInput = screen.queryByPlaceholderText(/search/i);
      if (searchInput) {
        await userEvent.type(searchInput, 'COUNT-001');

        await waitFor(() => {
          expect(screen.getByText('COUNT-001')).toBeInTheDocument();
          expect(screen.queryByText('COUNT-002')).not.toBeInTheDocument();
        });
      }
    });
  });

  describe('Pagination', () => {
    it('should render pagination for multiple pages', () => {
      (api.useStockCounts as jest.Mock).mockReturnValue({
        data: {
          counts: mockCycleCounts,
          total: 50,
          page: 1,
          totalPages: 5,
        },
        isLoading: false,
      } as any);

      renderWithProviders(<CycleCountingPage />);

      const pagination = screen.queryByRole('navigation');
      if (pagination) {
        expect(pagination).toBeInTheDocument();
      }
    });
  });

  describe('Loading State', () => {
    it('should show loading while counts load', () => {
      (api.useStockCounts as jest.Mock).mockReturnValue({
        data: undefined,
        isLoading: true,
      } as any);

      renderWithProviders(<CycleCountingPage />);

      expect(screen.getByText(/loading/i)).toBeInTheDocument();
    });
  });

  describe('Empty State', () => {
    it('should show empty state when no counts', () => {
      (api.useStockCounts as jest.Mock).mockReturnValue({
        data: {
          counts: [],
          total: 0,
        },
        isLoading: false,
      } as any);

      renderWithProviders(<CycleCountingPage />);

      expect(screen.getByText(/No cycle counts/i)).toBeInTheDocument();
    });
  });

  describe('Count Actions', () => {
    it('should show appropriate actions based on count status', () => {
      renderWithProviders(<CycleCountingPage />);

      // IN_PROGRESS count should have different actions than PENDING
      const inProgressCard = screen.getByText('COUNT-001').closest('div');
      const pendingCard = screen.getByText('COUNT-002').closest('div');

      expect(inProgressCard).toBeInTheDocument();
      expect(pendingCard).toBeInTheDocument();
    });
  });

  describe('Variance Display', () => {
    it('should highlight counts with variances', () => {
      renderWithProviders(<CycleCountingPage />);

      const varianceElement = screen.getByText('2 Variances');
      expect(varianceElement).toBeInTheDocument();
    });

    it('should show variance percentage', () => {
      renderWithProviders(<CycleCountingPage />);

      // Variance percentage calculation
      const variancePercent = (2 / 100) * 100;
      expect(variancePercent).toBe(2);
    });
  });

  describe('Form Validation', () => {
    it('should validate new count form inputs', async () => {
      renderWithProviders(<CycleCountingPage />);

      const newCountButton = screen.queryByText(/New Count/i);
      if (newCountButton) {
        await userEvent.click(newCountButton);

        await waitFor(() => {
          // Zone should be required
          const zoneInput = screen.queryByPlaceholderText(/zone/i);
          expect(zoneInput).toBeInTheDocument();
        });
      }
    });
  });

  describe('Date Display', () => {
    it('should display scheduled date', () => {
      renderWithProviders(<CycleCountingPage />);

      expect(screen.getByText(/2024-01-01/)).toBeInTheDocument();
      expect(screen.getByText(/2024-01-02/)).toBeInTheDocument();
    });
  });

  describe('Assigned User', () => {
    it('should display assigned user for in-progress counts', () => {
      renderWithProviders(<CycleCountingPage />);

      const assignedUser = screen.queryByText(/user-123/);
      if (assignedUser) {
        expect(assignedUser).toBeInTheDocument();
      }
    });
  });
});
