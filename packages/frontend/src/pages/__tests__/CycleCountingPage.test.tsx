/**
 * Tests for CycleCountingPage component
 */

import { describe, it, expect, vi } from 'vitest';
import { renderWithProviders } from '@/test/utils';
import { CycleCountingPage } from '../CycleCountingPage';

// Mock the modules
vi.mock('@/stores', () => ({
  useAuthStore: Object.assign(
    vi.fn(selector => {
      const state = {
        user: { userId: 'test-user', name: 'Test User', role: 'SUPERVISOR', active: true },
        canSupervise: () => true,
        getEffectiveRole: () => 'SUPERVISOR',
        isAuthenticated: true,
      };
      return selector ? selector(state) : state;
    }),
    {
      getState: () => ({
        isAuthenticated: true,
        user: { userId: 'test-user', name: 'Test User', role: 'SUPERVISOR', active: true },
        canSupervise: () => true,
        getEffectiveRole: () => 'SUPERVISOR',
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
  fetchCycleCounts: vi.fn(),
  createCycleCount: vi.fn(),
}));

vi.mock('@/components/shared', async () => ({
  ...(await vi.importActual('@/components/shared')),
  useToast: vi.fn(() => ({
    toast: vi.fn(),
    dismiss: vi.fn(),
  })),
}));

describe('CycleCountingPage', () => {
  it('renders without crashing', () => {
    renderWithProviders(<CycleCountingPage />);
    expect(true).toBe(true);
  });
});
