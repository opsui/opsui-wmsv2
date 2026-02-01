/**
 * ConnectionStatus Component Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '@/test/utils';
import { ConnectionStatus, ConnectionStatusDot, ConnectionStatusPanel } from '../ConnectionStatus';

// Mock useWebSocket hook
vi.mock('@/hooks/useWebSocket', () => ({
  useWebSocket: () => ({
    connectionStatus: 'connected',
    socketId: 'test-socket-id',
    reconnect: vi.fn(),
  }),
}));

describe('ConnectionStatus Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('ConnectionStatus', () => {
    it('renders connected state', () => {
      renderWithProviders(<ConnectionStatus />);

      expect(screen.getByText(/connected/i)).toBeInTheDocument();
    });

    it('displays connection label', () => {
      renderWithProviders(<ConnectionStatus showLabel />);

      expect(screen.getByText(/connection/i)).toBeInTheDocument();
    });

    it('hides label when showLabel is false', () => {
      renderWithProviders(<ConnectionStatus showLabel={false} />);

      expect(screen.queryByText(/connection/i)).not.toBeInTheDocument();
    });
  });

  describe('ConnectionStatusDot', () => {
    it('renders dot with connected state', () => {
      const { container } = renderWithProviders(<ConnectionStatusDot />);

      const dot = container.querySelector('[class*="rounded-full"]');
      expect(dot).toBeInTheDocument();
    });

    it('shows animation when connecting', () => {
      vi.doMock('@/hooks/useWebSocket', () => ({
        useWebSocket: () => ({
          connectionStatus: 'connecting',
          socketId: 'test-socket-id',
          reconnect: vi.fn(),
        }),
      }));

      const { container } = renderWithProviders(<ConnectionStatusDot />);

      const dot = container.querySelector('[class*="animate-pulse"]');
      expect(dot).toBeInTheDocument();
    });
  });

  describe('ConnectionStatusPanel', () => {
    it('renders connection details', () => {
      renderWithProviders(<ConnectionStatusPanel />);

      expect(screen.getByText(/connected/i)).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper aria labels', () => {
      renderWithProviders(<ConnectionStatus />);

      const status = screen.getByRole('status');
      expect(status).toBeInTheDocument();
    });
  });

  describe('Styling', () => {
    it('applies custom className', () => {
      const { container } = renderWithProviders(<ConnectionStatus className="custom-class" />);

      const wrapper = container.querySelector('.custom-class');
      expect(wrapper).toBeInTheDocument();
    });
  });
});
