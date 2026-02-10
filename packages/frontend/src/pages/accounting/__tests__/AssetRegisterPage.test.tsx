/**
 * Tests for AssetRegisterPage component
 */

import { describe, it, expect, vi } from 'vitest';
import { renderWithProviders } from '@/test/utils';
import { AssetRegisterPage } from '../AssetRegisterPage';

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

describe('AssetRegisterPage', () => {
  it('renders without crashing', () => {
    renderWithProviders(<AssetRegisterPage />);
    expect(true).toBe(true);
  });
});
