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

      expect(screen.getByText('Connected')).toBeInTheDocument();
    });

    it('displays status label by default', () => {
      renderWithProviders(<ConnectionStatus />);

      expect(screen.getByText('Connected')).toBeInTheDocument();
    });

    it('hides label when showLabel is false', () => {
      renderWithProviders(<ConnectionStatus showLabel={false} />);

      expect(screen.queryByText('Connected')).not.toBeInTheDocument();
    });

    it('has proper title attribute for accessibility', () => {
      const { container } = renderWithProviders(<ConnectionStatus />);

      const wrapper = container.querySelector('div[title]');
      expect(wrapper).toHaveAttribute('title', 'WebSocket: Connected');
    });
  });

  describe('ConnectionStatusDot', () => {
    it('renders dot with connected state', () => {
      const { container } = renderWithProviders(<ConnectionStatusDot />);

      const dot = container.querySelector('.bg-green-400');
      expect(dot).toBeInTheDocument();
    });

    it('has proper title attribute', () => {
      const { container } = renderWithProviders(<ConnectionStatusDot />);

      const dot = container.querySelector('div[title]');
      expect(dot).toHaveAttribute('title', 'WebSocket: connected');
    });
  });

  describe('ConnectionStatusPanel', () => {
    it('renders connection details', () => {
      renderWithProviders(<ConnectionStatusPanel />);

      expect(screen.getByText('Connected')).toBeInTheDocument();
      expect(screen.getByText('Real-time updates are active')).toBeInTheDocument();
    });

    it('displays socket ID when available', () => {
      renderWithProviders(<ConnectionStatusPanel />);

      expect(screen.getByText(/Socket ID:/i)).toBeInTheDocument();
    });
  });

  describe('Styling', () => {
    it('applies custom className', () => {
      const { container } = renderWithProviders(<ConnectionStatus className="custom-class" />);

      const wrapper = container.querySelector('.custom-class');
      expect(wrapper).toBeInTheDocument();
    });

    it('applies green styling for connected state', () => {
      const { container } = renderWithProviders(<ConnectionStatus />);

      const wrapper = container.querySelector('.bg-green-400\\/10');
      expect(wrapper).toBeInTheDocument();
    });
  });
});
