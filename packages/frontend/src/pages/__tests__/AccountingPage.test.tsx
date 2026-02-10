/**
 * Tests for AccountingPage component
 */

import { describe, it, expect, vi } from 'vitest';
import { renderWithProviders } from '@/test/utils';
import AccountingPage from '../AccountingPage';

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

describe('AccountingPage', () => {
  it('renders without crashing', () => {
    renderWithProviders(<AccountingPage />);
    expect(true).toBe(true);
  });
});
