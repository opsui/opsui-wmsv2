/**
 * Tests for PackingQueuePage component
 */

import { describe, it, expect, vi } from 'vitest';
import { renderWithProviders } from '@/test/utils';
import { PackingQueuePage } from '../PackingQueuePage';

// Mock the modules
vi.mock('@/stores', () => ({
  useAuthStore: Object.assign(
    vi.fn(selector => {
      const state = {
        user: { userId: 'test-user', name: 'Test User', role: 'ADMIN', active: true },
        canSupervise: () => true,
        getEffectiveRole: () => 'ADMIN',
        isAuthenticated: true,
      };
      return selector ? selector(state) : state;
    }),
    {
      getState: () => ({
        isAuthenticated: true,
        user: { userId: 'test-user', name: 'Test User', role: 'ADMIN', active: true },
        canSupervise: () => true,
        getEffectiveRole: () => 'ADMIN',
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
}));

describe('PackingQueuePage', () => {
  it('renders without crashing', () => {
    renderWithProviders(<PackingQueuePage />);
    expect(true).toBe(true);
  });
});
