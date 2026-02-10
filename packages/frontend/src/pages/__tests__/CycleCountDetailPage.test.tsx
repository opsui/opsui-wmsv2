/**
 * Tests for CycleCountDetailPage component
 */

import { describe, it, expect, vi } from 'vitest';
import { renderWithProviders } from '@/test/utils';
import CycleCountDetailPage from '../CycleCountDetailPage';

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
  fetchCycleCountDetails: vi.fn(),
}));

describe('CycleCountDetailPage', () => {
  it('renders without crashing', () => {
    renderWithProviders(<CycleCountDetailPage />);
    expect(true).toBe(true);
  });
});
