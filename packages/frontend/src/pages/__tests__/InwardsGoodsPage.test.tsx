/**
 * Tests for InwardsGoodsPage component
 *
 * Core tests for the Inwards Goods page functionality
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen } from '@/test/utils';
import InwardsGoodsPage from '../InwardsGoodsPage';

// Mock all the external dependencies
vi.mock('@/stores', () => ({
  useAuthStore: vi.fn(selector => {
    const state = {
      user: { userId: 'test-user', name: 'Test User', role: 'INWARDS', active: true },
      canSupervise: () => false,
      getEffectiveRole: () => 'INWARDS',
      hasRole: () => false,
      canPick: () => true,
      canPack: () => true,
      isAuthenticated: true,
      accessToken: 'test-token',
      refreshToken: 'test-refresh',
      activeRole: null,
      login: vi.fn(),
      logout: vi.fn(),
      updateTokens: vi.fn(),
      setUser: vi.fn(),
      setActiveRole: vi.fn(),
      clearAuth: vi.fn(),
    };
    // If selector is provided, call it with the state
    return selector ? selector(state) : state;
  }),
}));

vi.mock('@/hooks/useWebSocket', () => ({
  useWebSocket: vi.fn(() => ({
    connectionStatus: 'connected',
    socketId: 'test-socket',
    reconnect: vi.fn(),
  })),
}));

vi.mock('@/services/api', async importOriginal => {
  const actual = await importOriginal<typeof import('@/services/api')>();
  return {
    ...actual,
    useInwardsDashboard: vi.fn(() => ({
      data: {
        pendingASNs: 5,
        activeReceipts: 3,
        pendingPutaway: 8,
        todayReceived: 12,
      },
      isLoading: false,
    })),
    useASNs: vi.fn(() => ({
      data: { asns: [], total: 0 },
      isLoading: false,
      isFetching: false,
      refetch: vi.fn(),
    })),
    useReceipts: vi.fn(() => ({
      data: { receipts: [], total: 0 },
      isLoading: false,
      isFetching: false,
      refetch: vi.fn(),
    })),
    usePutawayTasks: vi.fn(() => ({
      data: { tasks: [], total: 0 },
      isLoading: false,
      isFetching: false,
      refetch: vi.fn(),
    })),
    useCreateASN: vi.fn(() => ({
      mutateAsync: vi.fn(),
      isPending: false,
    })),
    useCreateReceipt: vi.fn(() => ({
      mutateAsync: vi.fn(),
      isPending: false,
    })),
    useUpdateASNStatus: vi.fn(() => ({
      mutateAsync: vi.fn(),
      isPending: false,
    })),
    useUpdatePutawayTask: vi.fn(() => ({
      mutateAsync: vi.fn(),
      isPending: false,
    })),
    // All other hooks will be preserved from the actual module
    // to avoid "No export is defined" errors
  };
});

vi.mock('@/hooks/useFormValidation', () => ({
  useFormValidation: vi.fn(() => ({
    values: {},
    errors: {},
    handleChange: vi.fn(),
    handleSubmit: vi.fn(),
    isSubmitting: false,
    resetForm: vi.fn(),
  })),
}));

describe('InwardsGoodsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders without crashing', () => {
      const { container } = renderWithProviders(<InwardsGoodsPage />);
      expect(container).toBeInTheDocument();
    });

    it('displays dashboard metrics', () => {
      renderWithProviders(<InwardsGoodsPage />);
      // Check for metric cards that are displayed on the overview tab
      expect(screen.getByText('In Transit ASNs')).toBeInTheDocument();
      expect(screen.getByText('Active Receiving')).toBeInTheDocument();
      expect(screen.getByText('Pending Putaway')).toBeInTheDocument();
      expect(screen.getByText('Pending QC')).toBeInTheDocument();
      expect(screen.getByText('Exceptions')).toBeInTheDocument();
    });

    it('has header with proper role', () => {
      renderWithProviders(<InwardsGoodsPage />);
      const header = screen.getByRole('banner');
      expect(header).toBeInTheDocument();
    });

    it('has navigation buttons', () => {
      renderWithProviders(<InwardsGoodsPage />);
      const buttons = screen.getAllByRole('button');
      // Check that we have navigation buttons (at least header buttons)
      expect(buttons.length).toBeGreaterThan(0);
    });
  });

  describe('Accessibility', () => {
    it('has buttons with ARIA labels for accessibility', () => {
      renderWithProviders(<InwardsGoodsPage />);
      const buttons = screen.getAllByRole('button');
      // At least some buttons should have aria-label for accessibility
      const buttonsWithAria = buttons.filter(btn => btn.getAttribute('aria-label'));
      expect(buttonsWithAria.length).toBeGreaterThan(0);
    });
  });
});
