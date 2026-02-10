/**
 * Tests for RootCauseAnalysisPage component
 */

import { describe, it, expect, vi } from 'vitest';
import { renderWithProviders } from '@/test/utils';
import { RootCauseAnalysisPage } from '../RootCauseAnalysisPage';

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
  useRootCausePareto: vi.fn(() => ({ data: [], isLoading: false })),
  useRootCauseCategoryBreakdown: vi.fn(() => ({ data: [], isLoading: false })),
  useRootCauseTrending: vi.fn(() => ({ data: [], isLoading: false })),
}));

describe('RootCauseAnalysisPage', () => {
  it('renders without crashing', () => {
    renderWithProviders(<RootCauseAnalysisPage />);
    expect(true).toBe(true);
  });
});
