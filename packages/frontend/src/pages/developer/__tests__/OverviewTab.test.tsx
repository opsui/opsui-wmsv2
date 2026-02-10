/**
 * Tests for OverviewTab component
 */

import { describe, it, expect, vi } from 'vitest';
import { renderWithProviders } from '@/test/utils';
import { OverviewTab } from '../OverviewTab';

// Mock the modules
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

vi.mock('@/lib/api-client', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('OverviewTab', () => {
  it('renders without crashing', () => {
    renderWithProviders(<OverviewTab />);
    expect(true).toBe(true);
  });
});
