/**
 * Tests for InwardsGoodsPage component
 *
 * Core tests for the Inwards Goods page functionality
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@/test/utils';
import InwardsGoodsPage from '../InwardsGoodsPage';

// Mock all the external dependencies
vi.mock('@/stores', () => ({
  useAuthStore: vi.fn(() => ({
    user: { userId: 'test-user', name: 'Test User', role: 'INWARDS', active: true },
    canSupervise: () => false,
    getEffectiveRole: () => 'INWARDS',
    isAuthenticated: true,
  })),
}));

vi.mock('@/hooks/useWebSocket', () => ({
  useWebSocket: vi.fn(() => ({
    connectionStatus: 'connected',
    socketId: 'test-socket',
    reconnect: vi.fn(),
  })),
}));

vi.mock('@/services/api', () => ({
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
}));

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
      const { container } = render(<InwardsGoodsPage />);
      expect(container).toBeInTheDocument();
    });

    it('displays dashboard metrics', () => {
      render(<InwardsGoodsPage />);
      expect(screen.getByText('Pending ASNs')).toBeInTheDocument();
      expect(screen.getByText('Active Receipts')).toBeInTheDocument();
      expect(screen.getByText('Pending Putaway')).toBeInTheDocument();
      expect(screen.getByText('Received Today')).toBeInTheDocument();
    });

    it('has navigation with proper ARIA label', () => {
      render(<InwardsGoodsPage />);
      const nav = screen.getByRole('navigation', { name: /inwards goods workflow stages/i });
      expect(nav).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has workflow stage buttons with ARIA labels', () => {
      render(<InwardsGoodsPage />);
      const buttons = screen.getAllByRole('button');
      // Check that we have at least some workflow buttons
      expect(buttons.length).toBeGreaterThan(0);
      // At least one should have aria-label
      const buttonsWithAria = buttons.filter(btn => btn.getAttribute('aria-label'));
      expect(buttonsWithAria.length).toBeGreaterThan(0);
    });
  });
});
