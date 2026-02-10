/**
 * Tests for ProductionPage component
 */

import { describe, it, expect, vi } from 'vitest';
import { renderWithProviders } from '@/test/utils';
import { ProductionPage } from '../ProductionPage';

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
  fetchProductionStats: vi.fn(),
}));

describe('ProductionPage', () => {
  it('renders without crashing', () => {
    renderWithProviders(<ProductionPage />);
    expect(true).toBe(true);
  });
});
