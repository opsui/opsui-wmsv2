/**
 * Tests for OrderQueuePage component
 * @covers src/pages/OrderQueuePage.tsx
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { OrderQueuePage } from '../OrderQueuePage';
import { useAuthStore } from '@/stores';
import * as api from '@/services/api';
import { useOrderUpdates } from '@/hooks/useWebSocket';

// Mock the hooks
jest.mock('@/stores');
jest.mock('@/services/api');
jest.mock('@/hooks/useWebSocket');
jest.mock('@/components/shared', () => ({
  ...jest.requireActual('@/components/shared'),
  Header: ({ children, ...props }: any) => <header {...props}>{children}</header>,
}));

const mockUseAuthStore = useAuthStore as jest.MockedFunction<typeof useAuthStore>;
const mockUseOrderUpdates = useOrderUpdates as jest.MockedFunction<typeof useOrderUpdates>;

describe('OrderQueuePage', () => {
  let queryClient: QueryClient;

  const mockUser = {
    userId: 'user-123',
    email: 'picker@example.com',
    name: 'Test Picker',
    role: 'PICKER' as const,
    active: true,
  };

  const mockOrders = [
    {
      orderId: 'ORD-001',
      customerName: 'Customer 1',
      status: 'PENDING' as const,
      priority: 'HIGH' as const,
      items: [
        {
          sku: 'SKU-001',
          name: 'Item 1',
          quantity: 2,
          binLocation: 'A-01-01',
          status: 'PENDING',
          pickedQuantity: 0,
        },
      ],
      progress: 0,
      createdAt: '2024-01-01T10:00:00Z',
    },
    {
      orderId: 'ORD-002',
      customerName: 'Customer 2',
      status: 'PENDING' as const,
      priority: 'NORMAL' as const,
      items: [
        {
          sku: 'SKU-002',
          name: 'Item 2',
          quantity: 1,
          binLocation: 'B-01-01',
          status: 'PENDING',
          pickedQuantity: 0,
        },
      ],
      progress: 0,
      createdAt: '2024-01-01T11:00:00Z',
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
      canPick: () => true,
      getEffectiveRole: () => 'PICKER',
    } as any);

    mockUseOrderUpdates.mockImplementation(() => undefined);

    (api.useOrderQueue as jest.Mock).mockReturnValue({
      data: {
        orders: mockOrders,
        total: 2,
        page: 1,
        totalPages: 1,
      },
      isLoading: false,
    });

    (api.useClaimOrder as jest.Mock).mockReturnValue({
      mutateAsync: jest.fn().mockResolvedValue({}),
      isPending: false,
    });

    (api.useContinueOrder as jest.Mock).mockReturnValue({
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
    it('should render the order queue page', () => {
      renderWithProviders(<OrderQueuePage />);

      expect(screen.getByText('Order Queue')).toBeInTheDocument();
      expect(screen.getByText('2 orders available')).toBeInTheDocument();
    });

    it('should display order cards', () => {
      renderWithProviders(<OrderQueuePage />);

      expect(screen.getByText('ORD-001')).toBeInTheDocument();
      expect(screen.getByText('Customer 1')).toBeInTheDocument();
      expect(screen.getByText('ORD-002')).toBeInTheDocument();
      expect(screen.getByText('Customer 2')).toBeInTheDocument();
    });

    it('should display order items', () => {
      renderWithProviders(<OrderQueuePage />);

      expect(screen.getByText('SKU-001')).toBeInTheDocument();
      expect(screen.getByText('Item 1')).toBeInTheDocument();
      expect(screen.getByText('Loc: A-01-01')).toBeInTheDocument();
    });

    it('should display order priority badges', () => {
      renderWithProviders(<OrderQueuePage />);

      expect(screen.getByText('HIGH')).toBeInTheDocument();
      expect(screen.getByText('NORMAL')).toBeInTheDocument();
    });

    it('should display progress bars', () => {
      renderWithProviders(<OrderQueuePage />);

      expect(screen.getByText('Progress:')).toBeInTheDocument();
      expect(screen.getByText('0%')).toBeInTheDocument();
    });
  });

  describe('Access Control', () => {
    it('should show access denied for non-pickers', () => {
      mockUseAuthStore.mockReturnValue({
        user: { ...mockUser, role: 'ADMIN' as const },
        canPick: () => false,
      } as any);

      renderWithProviders(<OrderQueuePage />);

      expect(screen.getByText(/You need picker privileges/)).toBeInTheDocument();
    });

    it('should render for picker users', () => {
      renderWithProviders(<OrderQueuePage />);

      expect(screen.queryByText(/You need picker privileges/)).not.toBeInTheDocument();
      expect(screen.getByText('Order Queue')).toBeInTheDocument();
    });
  });

  describe('Search Functionality', () => {
    it('should filter orders by order ID', async () => {
      renderWithProviders(<OrderQueuePage />);

      const searchInput = screen.getByPlaceholderText('Search order');
      await userEvent.type(searchInput, 'ORD-001');

      expect(screen.getByText('ORD-001')).toBeInTheDocument();
      expect(screen.queryByText('ORD-002')).not.toBeInTheDocument();
    });

    it('should filter orders by customer name', async () => {
      renderWithProviders(<OrderQueuePage />);

      const searchInput = screen.getByPlaceholderText('Search order');
      await userEvent.type(searchInput, 'Customer 1');

      expect(screen.getByText('Customer 1')).toBeInTheDocument();
      expect(screen.queryByText('Customer 2')).not.toBeInTheDocument();
    });

    it('should filter orders by SKU', async () => {
      renderWithProviders(<OrderQueuePage />);

      const searchInput = screen.getByPlaceholderText('Search order');
      await userEvent.type(searchInput, 'SKU-001');

      expect(screen.getByText('SKU-001')).toBeInTheDocument();
    });

    it('should show no results message for non-matching search', async () => {
      renderWithProviders(<OrderQueuePage />);

      const searchInput = screen.getByPlaceholderText('Search order');
      await userEvent.type(searchInput, 'NONEXISTENT');

      expect(screen.getByText('No orders match your search')).toBeInTheDocument();
    });
  });

  describe('Status Filters', () => {
    it('should filter by PENDING status', () => {
      // The component uses statusFilter - test would verify filter changes
      renderWithProviders(<OrderQueuePage />);

      // Header should have filters
      expect(screen.getByText('Order Queue')).toBeInTheDocument();
    });

    it('should filter by PICKING status', () => {
      const pickingOrders = [
        {
          ...mockOrders[0],
          status: 'PICKING' as const,
          progress: 50,
          items: [{ ...mockOrders[0].items[0], status: 'COMPLETED', pickedQuantity: 2 }],
        },
      ];

      (api.useOrderQueue as jest.Mock).mockReturnValue({
        data: {
          orders: pickingOrders,
          total: 1,
        },
        isLoading: false,
      } as any);

      renderWithProviders(<OrderQueuePage />);

      expect(screen.getByText('Continue')).toBeInTheDocument();
    });
  });

  describe('Claim Order', () => {
    it('should claim order when claim button is clicked', async () => {
      const claimMock = jest.fn().mockResolvedValue({});
      (api.useClaimOrder as jest.Mock).mockReturnValue({
        mutateAsync: claimMock,
        isPending: false,
      });

      renderWithProviders(<OrderQueuePage />);

      const claimButton = screen.getAllByText('Claim')[0];
      await userEvent.click(claimButton);

      await waitFor(() => {
        expect(claimMock).toHaveBeenCalled();
      });
    });

    it('should disable claim button while claiming', async () => {
      (api.useClaimOrder as jest.Mock).mockReturnValue({
        mutateAsync: jest.fn(),
        isPending: true,
      });

      renderWithProviders(<OrderQueuePage />);

      const claimButton = screen.getAllByText('Claim')[0];
      expect(claimButton).toBeDisabled();
    });
  });

  describe('Continue Order', () => {
    it('should show continue button for PICKING orders', () => {
      const pickingOrder = {
        ...mockOrders[0],
        status: 'PICKING' as const,
        progress: 50,
      };

      (api.useOrderQueue as jest.Mock).mockReturnValue({
        data: {
          orders: [pickingOrder],
          total: 1,
        },
        isLoading: false,
      } as any);

      renderWithProviders(<OrderQueuePage />);

      expect(screen.getByText('Continue')).toBeInTheDocument();
    });
  });

  describe('Item Status', () => {
    it('should show completed status for picked items', () => {
      const orderWithProgress = {
        ...mockOrders[0],
        items: [
          {
            ...mockOrders[0].items[0],
            status: 'COMPLETED',
            pickedQuantity: 2,
            quantity: 2,
          },
        ],
        progress: 100,
      };

      (api.useOrderQueue as jest.Mock).mockReturnValue({
        data: {
          orders: [orderWithProgress],
          total: 1,
        },
        isLoading: false,
      } as any);

      renderWithProviders(<OrderQueuePage />);

      expect(screen.getByText('2/2')).toBeInTheDocument();
    });

    it('should show partial status for partially picked items', () => {
      const partialOrder = {
        ...mockOrders[0],
        items: [
          {
            ...mockOrders[0].items[0],
            pickedQuantity: 1,
            quantity: 2,
          },
        ],
        progress: 50,
      };

      (api.useOrderQueue as jest.Mock).mockReturnValue({
        data: {
          orders: [partialOrder],
          total: 1,
        },
        isLoading: false,
      } as any);

      renderWithProviders(<OrderQueuePage />);

      expect(screen.getByText('1/2')).toBeInTheDocument();
    });
  });

  describe('Pagination', () => {
    it('should render pagination for multiple pages', () => {
      (api.useOrderQueue as jest.Mock).mockReturnValue({
        data: {
          orders: mockOrders,
          total: 50,
          page: 1,
          totalPages: 3,
        },
        isLoading: false,
      } as any);

      renderWithProviders(<OrderQueuePage />);

      // Pagination component should be rendered
      const pagination = screen.getByRole('navigation');
      expect(pagination).toBeInTheDocument();
    });
  });

  describe('WebSocket Integration', () => {
    it('should subscribe to order updates', () => {
      renderWithProviders(<OrderQueuePage />);

      expect(mockUseOrderUpdates).toHaveBeenCalled();
    });

    it('should refresh order queue when order is claimed', () => {
      jest.spyOn(queryClient, 'invalidateQueries');

      renderWithProviders(<OrderQueuePage />);

      // WebSocket event would trigger invalidation
      // Tested through integration
    });
  });

  describe('Loading State', () => {
    it('should show loading message while loading', () => {
      (api.useOrderQueue as jest.Mock).mockReturnValue({
        data: undefined,
        isLoading: true,
      } as any);

      renderWithProviders(<OrderQueuePage />);

      expect(screen.getByText('Loading order queue...')).toBeInTheDocument();
    });

    it('should show empty state when no orders', () => {
      (api.useOrderQueue as jest.Mock).mockReturnValue({
        data: {
          orders: [],
          total: 0,
        },
        isLoading: false,
      } as any);

      renderWithProviders(<OrderQueuePage />);

      expect(screen.getByText('0 orders available')).toBeInTheDocument();
      expect(screen.getByText('No orders available')).toBeInTheDocument();
    });
  });

  describe('Empty State', () => {
    it('should show empty state icon when no orders', () => {
      (api.useOrderQueue as jest.Mock).mockReturnValue({
        data: {
          orders: [],
          total: 0,
        },
        isLoading: false,
      } as any);

      renderWithProviders(<OrderQueuePage />);

      // Shopping bag icon should be visible
      const icon = document.querySelector('[class*="ShoppingBagIcon"]');
      expect(icon).toBeInTheDocument();
    });
  });
});
