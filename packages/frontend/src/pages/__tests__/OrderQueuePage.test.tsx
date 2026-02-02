/**
 * Tests for OrderQueuePage component
 */

import { describe, it, expect, vi } from 'vitest';
import { renderWithProviders } from '@/test/utils';
import { OrderQueuePage } from '../OrderQueuePage';

// Mock the modules
vi.mock('@/stores', () => ({
  useAuthStore: Object.assign(
    vi.fn(() => ({
      user: { userId: 'test-user', name: 'Test User', role: 'SUPERVISOR', active: true },
      canSupervise: () => true,
      getEffectiveRole: () => 'SUPERVISOR',
    })),
    {
      getState: () => ({
        isAuthenticated: true,
        user: { userId: 'test-user', name: 'Test User', role: 'SUPERVISOR', active: true },
      }),
    }
  ),
}));

vi.mock('@/hooks/useWebSocket', async () => ({
  ...(await vi.importActual('@/hooks/useWebSocket')),
  useWebSocket: vi.fn(() => ({
    connectionStatus: 'connected',
    socketId: 'test-socket',
    reconnect: vi.fn(),
  })),
}));

vi.mock('@/services/api', async () => ({
  ...(await vi.importActual('@/services/api')),
  fetchOrders: vi.fn(),
  updateOrderStatus: vi.fn(),
}));

vi.mock('@/components/shared', async () => ({
  ...(await vi.importActual('@/components/shared')),
  useToast: vi.fn(() => ({
    toast: vi.fn(),
    dismiss: vi.fn(),
  })),
}));

describe('OrderQueuePage', () => {
  it('renders without crashing', () => {
    renderWithProviders(<OrderQueuePage />);
    expect(true).toBe(true);
  });
});
