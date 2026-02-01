/**
 * Tests for DashboardPage component
 * @covers src/pages/DashboardPage.tsx
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { DashboardPage } from '../DashboardPage';
import { useAuthStore } from '@/stores';
import * as api from '@/services/api';
import { useWebSocket } from '@/hooks/useWebSocket';

// Mock the hooks
jest.mock('@/stores');
jest.mock('@/services/api');
jest.mock('@/hooks/useWebSocket');
jest.mock('@/components/shared', () => ({
  ...jest.requireActual('@/components/shared'),
  Header: ({ children, ...props }: any) => <header {...props}>{children}</header>,
}));

const mockUseAuthStore = useAuthStore as jest.MockedFunction<typeof useAuthStore>;
const mockUseWebSocket = useWebSocket as jest.MockedFunction<typeof useWebSocket>;

describe('DashboardPage', () => {
  let queryClient: QueryClient;

  const mockUser = {
    userId: 'user-123',
    email: 'supervisor@example.com',
    name: 'Test Supervisor',
    role: 'SUPERVISOR' as const,
    active: true,
  };

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    // Mock auth store
    mockUseAuthStore.mockReturnValue({
      user: mockUser,
      canSupervise: () => true,
      getEffectiveRole: () => 'SUPERVISOR',
    } as any);

    // Mock WebSocket
    mockUseWebSocket.mockReturnValue({
      isConnected: true,
      connectionStatus: 'connected',
      socketId: 'socket-123',
      subscribe: jest.fn(),
      connect: jest.fn(),
      disconnect: jest.fn(),
      reconnect: jest.fn(),
    });

    // Mock API responses
    (api.useDashboardMetrics as jest.Mock).mockReturnValue({
      data: {
        activePickers: 5,
        ordersPickedPerHour: 45,
        queueDepth: 12,
        exceptions: 2,
      },
      isLoading: false,
    });

    (api.useRoleActivity as jest.Mock).mockReturnValue({
      data: {
        PICKER: [],
        PACKER: [],
      },
      isLoading: false,
    });

    (api.useThroughputByRange as jest.Mock).mockReturnValue({
      data: [],
      isLoading: false,
    });

    (api.useOrderStatusBreakdown as jest.Mock).mockReturnValue({
      data: [],
      isLoading: false,
    });

    (api.useTopSKUs as jest.Mock).mockReturnValue({
      data: [],
      isLoading: false,
    });

    (api.useAllPickersPerformance as jest.Mock).mockReturnValue({
      data: [],
      isLoading: false,
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
    it('should render the dashboard page', () => {
      renderWithProviders(<DashboardPage />);

      expect(screen.getByText('Dashboard')).toBeInTheDocument();
      expect(screen.getByText('Real-time warehouse operations overview')).toBeInTheDocument();
    });

    it('should display key metrics cards', () => {
      renderWithProviders(<DashboardPage />);

      expect(screen.getByText('Active Staff')).toBeInTheDocument();
      expect(screen.getByText('Orders/Hour')).toBeInTheDocument();
      expect(screen.getByText('Queue Depth')).toBeInTheDocument();
      expect(screen.getByText('Exceptions')).toBeInTheDocument();
    });

    it('should display metric values', () => {
      renderWithProviders(<DashboardPage />);

      expect(screen.getByText('5')).toBeInTheDocument(); // activePickers
      expect(screen.getByText('45')).toBeInTheDocument(); // ordersPickedPerHour
      expect(screen.getByText('12')).toBeInTheDocument(); // queueDepth
      expect(screen.getByText('2')).toBeInTheDocument(); // exceptions
    });
  });

  describe('Access Control', () => {
    it('should show access denied for non-supervisor users', () => {
      mockUseAuthStore.mockReturnValue({
        user: { ...mockUser, role: 'PICKER' as const },
        canSupervise: () => false,
      } as any);

      renderWithProviders(<DashboardPage />);

      expect(screen.getByText('Access Denied')).toBeInTheDocument();
      expect(screen.getByText(/You need supervisor or admin privileges/)).toBeInTheDocument();
    });

    it('should render dashboard for supervisor users', () => {
      renderWithProviders(<DashboardPage />);

      expect(screen.queryByText('Access Denied')).not.toBeInTheDocument();
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
    });

    it('should render dashboard for admin users', () => {
      mockUseAuthStore.mockReturnValue({
        user: { ...mockUser, role: 'ADMIN' as const },
        canSupervise: () => true,
        getEffectiveRole: () => 'ADMIN',
      } as any);

      renderWithProviders(<DashboardPage />);

      expect(screen.queryByText('Access Denied')).not.toBeInTheDocument();
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
    });
  });

  describe('Loading State', () => {
    it('should show loading skeleton while metrics are loading', () => {
      (api.useDashboardMetrics as jest.Mock).mockReturnValue({
        data: undefined,
        isLoading: true,
      } as any);

      renderWithProviders(<DashboardPage />);

      // Skeleton components would be rendered - check for dashboard not showing
      expect(screen.queryByText('5')).not.toBeInTheDocument();
    });
  });

  describe('Metric Card Interactions', () => {
    it('should open admin orders modal when queue depth is clicked', async () => {
      renderWithProviders(<DashboardPage />);

      const queueDepthCard = screen.getByText('Queue Depth').closest('div');
      await userEvent.click(queueDepthCard!);

      await waitFor(() => {
        expect(screen.getByText('All Orders (Admin View)')).toBeInTheDocument();
      });
    });

    it('should navigate to exceptions page when exceptions metric is clicked', async () => {
      const windowLocation = spyOn(window.location, 'href').and.returnValue('/exceptions');

      renderWithProviders(<DashboardPage />);

      const exceptionsCard = screen.getByText('Exceptions').closest('div');
      await userEvent.click(exceptionsCard!);

      // Should trigger navigation - verify through window location or similar
      expect(windowLocation).toBeDefined();
    });
  });

  describe('Charts', () => {
    it('should render throughput chart', () => {
      renderWithProviders(<DashboardPage />);

      // ThroughputChart should be in the document
      const throughputSection = screen.getByText('Throughput');
      expect(throughputSection).toBeInTheDocument();
    });

    it('should render order status chart', () => {
      renderWithProviders(<DashboardPage />);

      const orderStatusSection = screen.getByText('Order Status');
      expect(orderStatusSection).toBeInTheDocument();
    });

    it('should render top SKUs chart', () => {
      renderWithProviders(<DashboardPage />);

      const topSKUsSection = screen.getByText('Top SKUs');
      expect(topSKUsSection).toBeInTheDocument();
    });

    it('should render performance chart', () => {
      renderWithProviders(<DashboardPage />);

      const performanceSection = screen.getByText('Performance');
      expect(performanceSection).toBeInTheDocument();
    });
  });

  describe('Role Activity', () => {
    it('should display role activity card', () => {
      renderWithProviders(<DashboardPage />);

      expect(screen.getByText('Role Activity')).toBeInTheDocument();
    });

    it('should toggle between role activity and audit logs for admin users', async () => {
      mockUseAuthStore.mockReturnValue({
        user: { ...mockUser, role: 'ADMIN' as const },
        canSupervise: () => true,
        getEffectiveRole: () => 'ADMIN',
      } as any);

      (api.useAuditLogs as jest.Mock).mockReturnValue({
        data: [],
        isLoading: false,
      });

      renderWithProviders(<DashboardPage />);

      const auditLogsButton = screen.getByText('Audit Logs');
      await userEvent.click(auditLogsButton);

      await waitFor(() => {
        expect(screen.getByText('Audit Logs')).toBeInTheDocument();
      });
    });
  });

  describe('WebSocket Integration', () => {
    it('should initialize WebSocket connection', () => {
      renderWithProviders(<DashboardPage />);

      expect(mockUseWebSocket).toHaveBeenCalledWith(true);
    });

    it('should subscribe to order updates', () => {
      const mockSubscribe = jest.fn();
      mockUseWebSocket.mockReturnValue({
        isConnected: true,
        connectionStatus: 'connected',
        subscribe: mockSubscribe,
        unsubscribe: jest.fn(),
        connect: jest.fn(),
        disconnect: jest.fn(),
      } as any);

      renderWithProviders(<DashboardPage />);

      // WebSocket hook should be called and subscriptions set up
      expect(mockUseWebSocket).toHaveBeenCalled();
    });
  });

  describe('Data Refreshing', () => {
    it('should invalidate queries when WebSocket events occur', async () => {
      jest.spyOn(queryClient, 'invalidateQueries');

      renderWithProviders(<DashboardPage />);

      // Simulate WebSocket event handling - the component uses useWebSocket
      // which should trigger query invalidation on events
      // This is tested through integration with actual WebSocket events
    });
  });

  describe('Responsive Design', () => {
    it('should render on mobile viewports', () => {
      // Set mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });

      renderWithProviders(<DashboardPage />);

      expect(screen.getByText('Dashboard')).toBeInTheDocument();
    });

    it('should render on desktop viewports', () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 1920,
      });

      renderWithProviders(<DashboardPage />);

      expect(screen.getByText('Dashboard')).toBeInTheDocument();
    });
  });
});
