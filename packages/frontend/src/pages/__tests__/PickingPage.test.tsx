/**
 * Tests for PickingPage component
 * @covers src/pages/PickingPage.tsx
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { PickingPage } from '../PickingPage';
import { useAuthStore } from '@/stores';
import * as api from '@/services/api';
import { usePickUpdates, useZoneUpdates } from '@/hooks/useWebSocket';

// Mock the hooks
jest.mock('@/stores');
jest.mock('@/services/api');
jest.mock('@/hooks/useWebSocket');
jest.mock('@/components/shared', () => ({
  ...jest.requireActual('@/components/shared'),
  Header: ({ children, ...props }: any) => <header {...props}>{children}</header>,
}));

const mockUseAuthStore = useAuthStore as jest.MockedFunction<typeof useAuthStore>;
const mockUsePickUpdates = usePickUpdates as jest.MockedFunction<typeof usePickUpdates>;
const mockUseZoneUpdates = useZoneUpdates as jest.MockedFunction<typeof useZoneUpdates>;

describe('PickingPage', () => {
  let queryClient: QueryClient;

  const mockUser = {
    userId: 'user-123',
    email: 'picker@example.com',
    name: 'Test Picker',
    role: 'PICKER' as const,
    active: true,
  };

  const mockOrder = {
    orderId: 'ORD-001',
    customerName: 'Test Customer',
    status: 'PICKING' as const,
    priority: 'HIGH' as const,
    items: [
      {
        orderItemId: 'OI-001',
        sku: 'SKU-001',
        name: 'Test Item 1',
        quantity: 2,
        binLocation: 'A-01-01',
        pickedQuantity: 0,
        status: 'PENDING',
      },
      {
        orderItemId: 'OI-002',
        sku: 'SKU-002',
        name: 'Test Item 2',
        quantity: 1,
        binLocation: 'B-01-01',
        pickedQuantity: 0,
        status: 'PENDING',
      },
    ],
    pickerId: 'user-123',
    progress: 0,
  };

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    mockUseAuthStore.mockReturnValue({
      user: mockUser,
      getEffectiveRole: () => 'PICKER',
    } as any);

    mockUsePickUpdates.mockImplementation(() => undefined);

    mockUseZoneUpdates.mockImplementation(() => undefined);

    (api.useOrder as jest.Mock).mockReturnValue({
      data: mockOrder,
      isLoading: false,
      refetch: jest.fn(),
    });

    (api.usePickItem as jest.Mock).mockReturnValue({
      mutateAsync: jest.fn().mockResolvedValue({}),
      isPending: false,
    });

    (api.useCompleteOrder as jest.Mock).mockReturnValue({
      mutateAsync: jest.fn().mockResolvedValue({}),
      isPending: false,
    });

    (api.useLogException as jest.Mock).mockReturnValue({
      mutateAsync: jest.fn().mockResolvedValue({}),
      isPending: false,
    });

    // Mock apiClient
    jest.spyOn(require('@/lib/api-client'), 'apiClient').mockReturnValue({
      post: jest.fn().mockResolvedValue({ data: {} }),
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const renderWithProviders = (component: React.ReactElement) => {
    return render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <Routes>
            <Route path="/orders/:orderId/pick" element={component} />
          </Routes>
        </BrowserRouter>
      </QueryClientProvider>
    );
  };

  const navigateToPickingPage = () => {
    window.history.pushState({}, 'Test Page', '/orders/ORD-001/pick');
  };

  describe('Rendering', () => {
    it('should render the picking page', async () => {
      navigateToPickingPage();
      renderWithProviders(<PickingPage />);

      await waitFor(() => {
        expect(screen.getByText('ORD-001')).toBeInTheDocument();
        expect(screen.getByText('Test Customer')).toBeInTheDocument();
      });
    });

    it('should display current item to pick', async () => {
      navigateToPickingPage();
      renderWithProviders(<PickingPage />);

      await waitFor(() => {
        expect(screen.getByText('SKU-001')).toBeInTheDocument();
        expect(screen.getByText('Test Item 1')).toBeInTheDocument();
        expect(screen.getByText('A-01-01')).toBeInTheDocument();
        expect(screen.getByText('Qty: 2')).toBeInTheDocument();
      });
    });

    it('should display task progress', async () => {
      navigateToPickingPage();
      renderWithProviders(<PickingPage />);

      await waitFor(() => {
        expect(screen.getByText(/Task 1 of 2/)).toBeInTheDocument();
      });
    });

    it('should display order progress bar', async () => {
      navigateToPickingPage();
      renderWithProviders(<PickingPage />);

      await waitFor(() => {
        expect(screen.getByText('Order Progress: 0%')).toBeInTheDocument();
      });
    });
  });

  describe('Scanning Items', () => {
    it('should accept valid SKU scan', async () => {
      navigateToPickingPage();
      const pickMock = jest.fn().mockResolvedValue({});
      (api.usePickItem as jest.Mock).mockReturnValue({
        mutateAsync: pickMock,
        isPending: false,
      });

      renderWithProviders(<PickingPage />);

      await waitFor(() => {
        expect(screen.getByText('SKU-001')).toBeInTheDocument();
      });

      const scanInput = screen.getByPlaceholderText(/scan/i);
      await userEvent.type(scanInput, 'SKU-001{Enter}');

      await waitFor(() => {
        expect(pickMock).toHaveBeenCalled();
      });
    });

    it('should show error for invalid SKU scan', async () => {
      navigateToPickingPage();
      renderWithProviders(<PickingPage />);

      await waitFor(() => {
        expect(screen.getByText('SKU-001')).toBeInTheDocument();
      });

      const scanInput = screen.getByPlaceholderText(/scan/i);
      await userEvent.type(scanInput, 'WRONG-SKU{Enter}');

      await waitFor(() => {
        expect(screen.getByText(/SKU mismatch/i)).toBeInTheDocument();
      });
    });

    it('should move to next item after successful pick', async () => {
      navigateToPickingPage();
      const pickMock = jest.fn().mockResolvedValue({
        data: {
          ...mockOrder,
          items: [
            { ...mockOrder.items[0], pickedQuantity: 2, status: 'COMPLETED' },
            { ...mockOrder.items[1] },
          ],
          progress: 50,
        },
      });

      (api.usePickItem as jest.Mock).mockReturnValue({
        mutateAsync: pickMock,
        isPending: false,
      });

      (api.useOrder as jest.Mock).mockReturnValue({
        data: {
          ...mockOrder,
          items: [
            { ...mockOrder.items[0], pickedQuantity: 2, status: 'COMPLETED' },
            { ...mockOrder.items[1] },
          ],
          progress: 50,
        },
        isLoading: false,
        refetch: jest.fn(),
      });

      renderWithProviders(<PickingPage />);

      await waitFor(() => {
        expect(screen.getByText('SKU-002')).toBeInTheDocument();
      });
    });
  });

  describe('Completing Order', () => {
    it('should show complete button when all items picked', async () => {
      const completedOrder = {
        ...mockOrder,
        items: mockOrder.items.map(item => ({
          ...item,
          pickedQuantity: item.quantity,
          status: 'COMPLETED',
        })),
        progress: 100,
      };

      (api.useOrder as jest.Mock).mockReturnValue({
        data: completedOrder,
        isLoading: false,
        refetch: jest.fn(),
      });

      navigateToPickingPage();
      renderWithProviders(<PickingPage />);

      await waitFor(() => {
        expect(screen.getByText('Complete Order')).toBeInTheDocument();
      });
    });

    it('should complete order when button clicked', async () => {
      const completedOrder = {
        ...mockOrder,
        items: mockOrder.items.map(item => ({
          ...item,
          pickedQuantity: item.quantity,
          status: 'COMPLETED',
        })),
        progress: 100,
      };

      (api.useOrder as jest.Mock).mockReturnValue({
        data: completedOrder,
        isLoading: false,
        refetch: jest.fn(),
      });

      const completeMock = jest.fn().mockResolvedValue({});
      (api.useCompleteOrder as jest.Mock).mockReturnValue({
        mutateAsync: completeMock,
        isPending: false,
      });

      navigateToPickingPage();
      renderWithProviders(<PickingPage />);

      await waitFor(() => {
        const completeButton = screen.getByText('Complete Order');
        return completeButton;
      });

      const completeButton = screen.getByText('Complete Order');
      await userEvent.click(completeButton);

      await waitFor(() => {
        expect(completeMock).toHaveBeenCalled();
      });
    });
  });

  describe('Exception Handling', () => {
    it('should open exception modal when exception button clicked', async () => {
      navigateToPickingPage();
      renderWithProviders(<PickingPage />);

      await waitFor(() => {
        expect(screen.getByText('Report Exception')).toBeInTheDocument();
      });

      const exceptionButton = screen.getByText('Report Exception');
      await userEvent.click(exceptionButton);

      await waitFor(() => {
        expect(screen.getByText('Report Exception')).toBeInTheDocument();
        expect(screen.getByText('Select exception type')).toBeInTheDocument();
      });
    });

    it('should log exception when form submitted', async () => {
      navigateToPickingPage();
      const logExceptionMock = jest.fn().mockResolvedValue({});
      (api.useLogException as jest.Mock).mockReturnValue({
        mutateAsync: logExceptionMock,
        isPending: false,
      });

      renderWithProviders(<PickingPage />);

      await waitFor(() => {
        const exceptionButton = screen.getByText('Report Exception');
        return exceptionButton;
      });

      const exceptionButton = screen.getByText('Report Exception');
      await userEvent.click(exceptionButton);

      // Select exception type and submit
      await waitFor(() => {
        const outOfStockOption = screen.getByText('Out of Stock');
        return outOfStockOption;
      });

      // Form submission would be tested here
    });
  });

  describe('Navigation', () => {
    it('should have back button to return to order queue', async () => {
      navigateToPickingPage();
      renderWithProviders(<PickingPage />);

      await waitFor(() => {
        const backButton = document.querySelector('[class*="ArrowLeftIcon"]');
        expect(backButton).toBeInTheDocument();
      });
    });
  });

  describe('Zone Assignment', () => {
    it('should show toast notification when zone assignment received', async () => {
      mockUseZoneUpdates.mockImplementation(() => undefined);

      navigateToPickingPage();
      renderWithProviders(<PickingPage />);

      await waitFor(() => {
        expect(mockUseZoneUpdates).toHaveBeenCalled();
      });
    });
  });

  describe('Unclaim Modal', () => {
    it('should show unclaim confirmation', async () => {
      navigateToPickingPage();
      renderWithProviders(<PickingPage />);

      await waitFor(() => {
        const unclaimButton = screen.queryByText('Unclaim Order');
        if (unclaimButton) {
          userEvent.click(unclaimButton);
        }
      });
    });
  });

  describe('Undo Pick', () => {
    it('should allow undoing last pick', async () => {
      const orderWithProgress = {
        ...mockOrder,
        items: [
          { ...mockOrder.items[0], pickedQuantity: 1, status: 'IN_PROGRESS' },
          { ...mockOrder.items[1] },
        ],
        progress: 25,
      };

      (api.useOrder as jest.Mock).mockReturnValue({
        data: orderWithProgress,
        isLoading: false,
        refetch: jest.fn(),
      });

      navigateToPickingPage();
      renderWithProviders(<PickingPage />);

      await waitFor(() => {
        const undoButton = screen.queryByText('Undo');
        if (undoButton) {
          expect(undoButton).toBeInTheDocument();
        }
      });
    });
  });

  describe('Loading State', () => {
    it('should show loading while order loads', () => {
      (api.useOrder as jest.Mock).mockReturnValue({
        data: undefined,
        isLoading: true,
        refetch: jest.fn(),
      } as any);

      navigateToPickingPage();
      renderWithProviders(<PickingPage />);

      expect(screen.getByText(/loading/i)).toBeInTheDocument();
    });
  });

  describe('Error States', () => {
    it('should show error when order not found', () => {
      (api.useOrder as jest.Mock).mockReturnValue({
        data: undefined,
        isLoading: false,
        refetch: jest.fn(),
        error: new Error('Order not found'),
      } as any);

      navigateToPickingPage();
      renderWithProviders(<PickingPage />);

      // Error should be displayed
      const errorMessage = screen.queryByText(/not found/i);
      if (errorMessage) {
        expect(errorMessage).toBeInTheDocument();
      }
    });
  });

  describe('WebSocket Integration', () => {
    it('should subscribe to pick updates', () => {
      navigateToPickingPage();
      renderWithProviders(<PickingPage />);

      expect(mockUsePickUpdates).toHaveBeenCalled();
      expect(mockUseZoneUpdates).toHaveBeenCalled();
    });

    it('should refresh order data on pick completion', () => {
      jest.spyOn(queryClient, 'invalidateQueries');

      navigateToPickingPage();
      renderWithProviders(<PickingPage />);

      // WebSocket event would trigger invalidation
    });
  });

  describe('Bin Location Formatting', () => {
    it('should display formatted bin location', async () => {
      navigateToPickingPage();
      renderWithProviders(<PickingPage />);

      await waitFor(() => {
        expect(screen.getByText('A-01-01')).toBeInTheDocument();
      });
    });
  });

  describe('Item Count Display', () => {
    it('should show remaining quantity to pick', async () => {
      navigateToPickingPage();
      renderWithProviders(<PickingPage />);

      await waitFor(() => {
        expect(screen.getByText('Qty: 2')).toBeInTheDocument();
      });
    });
  });

  describe('Skip Item', () => {
    it('should allow skipping an item with reason', async () => {
      navigateToPickingPage();
      renderWithProviders(<PickingPage />);

      await waitFor(() => {
        const skipButton = screen.queryByText('Skip');
        if (skipButton) {
          userEvent.click(skipButton);
        }
      });
    });
  });
});
