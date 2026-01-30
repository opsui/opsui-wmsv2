/**
 * ConnectionStatus Component Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { renderWithProviders } from '@/test/utils';
import { ConnectionStatus, ConnectionStatusDot, ConnectionStatusPanel } from '../ConnectionStatus';

// Mock WebSocket store
vi.mock('@/stores/websocketStore', () => ({
  useWebSocketStore: () => ({
    connected: true,
    connecting: false,
    error: null,
    lastMessage: null,
    connect: vi.fn(),
    disconnect: vi.fn(),
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

    it('shows green dot when connected', () => {
      const { container } = renderWithProviders(<ConnectionStatus connected />);

      const dot = container.querySelector('.bg-green-500');
      expect(dot).toBeInTheDocument();
    });

    it('shows red dot when disconnected', () => {
      const { container } = renderWithProviders(<ConnectionStatus connected={false} />);

      const dot = container.querySelector('.bg-red-500');
      expect(dot).toBeInTheDocument();
    });

    it('shows yellow dot when connecting', () => {
      const { container } = renderWithProviders(<ConnectionStatus connecting />);

      const dot = container.querySelector('.bg-yellow-500');
      expect(dot).toBeInTheDocument();
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
      const { container } = renderWithProviders(<ConnectionStatusDot connected />);

      const dot = container.querySelector('[class*="rounded-full"]');
      expect(dot).toBeInTheDocument();
      expect(dot).toHaveClass('bg-green-500');
    });

    it('renders dot with disconnected state', () => {
      const { container } = renderWithProviders(<ConnectionStatusDot connected={false} />);

      const dot = container.querySelector('[class*="rounded-full"]');
      expect(dot).toHaveClass('bg-red-500');
    });

    it('renders dot with connecting state', () => {
      const { container } = renderWithProviders(<ConnectionStatusDot connecting />);

      const dot = container.querySelector('[class*="rounded-full"]');
      expect(dot).toHaveClass('bg-yellow-500');
    });

    it('applies custom size', () => {
      const { container } = renderWithProviders(<ConnectionStatusDot size="lg" />);

      const dot = container.querySelector('[class*="w-3"]');
      expect(dot).toBeInTheDocument();
    });

    it('shows animation when connecting', () => {
      const { container } = renderWithProviders(<ConnectionStatusDot connecting />);

      const dot = container.querySelector('[class*="animate-pulse"]');
      expect(dot).toBeInTheDocument();
    });
  });

  describe('ConnectionStatusPanel', () => {
    it('renders connection details', () => {
      renderWithProviders(<ConnectionStatusPanel />);

      expect(screen.getByText(/websocket connection/i)).toBeInTheDocument();
    });

    it('shows connected status with icon', () => {
      renderWithProviders(<ConnectionStatusPanel connected />);

      expect(screen.getByText(/connected/i)).toBeInTheDocument();
    });

    it('shows disconnected status with icon', () => {
      renderWithProviders(<ConnectionStatusPanel connected={false} />);

      expect(screen.getByText(/disconnected/i)).toBeInTheDocument();
    });

    it('shows reconnect button when disconnected', () => {
      const mockReconnect = vi.fn();
      renderWithProviders(<ConnectionStatusPanel connected={false} onReconnect={mockReconnect} />);

      const reconnectButton = screen.getByRole('button', { name: /reconnect/i });
      expect(reconnectButton).toBeInTheDocument();

      fireEvent.click(reconnectButton);
      expect(mockReconnect).toHaveBeenCalled();
    });

    it('shows last activity timestamp', () => {
      const lastActivity = new Date('2024-01-25T10:00:00Z');
      renderWithProviders(<ConnectionStatusPanel lastActivity={lastActivity} />);

      expect(screen.getByText(/last activity/i)).toBeInTheDocument();
    });

    it('hides reconnect button when connected', () => {
      renderWithProviders(<ConnectionStatusPanel connected />);

      expect(screen.queryByRole('button', { name: /reconnect/i })).not.toBeInTheDocument();
    });

    it('displays connection quality', () => {
      renderWithProviders(<ConnectionStatusPanel connected latency={50} />);

      expect(screen.getByText(/good/i)).toBeInTheDocument();
    });

    it('shows error message when connection fails', () => {
      renderWithProviders(<ConnectionStatusPanel error="Connection failed" />);

      expect(screen.getByText(/connection failed/i)).toBeInTheDocument();
    });

    it('shows connecting state', () => {
      renderWithProviders(<ConnectionStatusPanel connecting />);

      expect(screen.getByText(/connecting/i)).toBeInTheDocument();
    });

    it('displays message count', () => {
      renderWithProviders(<ConnectionStatusPanel messagesReceived={150} messagesSent={75} />);

      expect(screen.getByText(/150/i)).toBeInTheDocument();
      expect(screen.getByText(/75/i)).toBeInTheDocument();
    });

    it('can be collapsed', () => {
      renderWithProviders(<ConnectionStatusPanel collapsible defaultExpanded={false} />);

      // Panel should be in collapsed state
      expect(screen.getByRole('button', { name: /expand/i })).toBeInTheDocument();
    });

    it('toggles expand/collapse on click', () => {
      renderWithProviders(<ConnectionStatusPanel collapsible />);

      const toggleButton = screen.getByRole('button');
      fireEvent.click(toggleButton);

      // Should toggle state
    });
  });

  describe('Accessibility', () => {
    it('has proper aria labels', () => {
      renderWithProviders(<ConnectionStatus />);

      const status = screen.getByRole('status');
      expect(status).toBeInTheDocument();
    });

    it('announces connection state changes', () => {
      const { rerender } = renderWithProviders(<ConnectionStatus connected={false} />);

      rerender(<ConnectionStatus connected />);

      // Should announce change to screen readers
      const status = screen.getByRole('status');
      expect(status).toHaveTextContent(/connected/i);
    });

    it('provides accessible reconnect button', () => {
      const mockReconnect = vi.fn();
      renderWithProviders(<ConnectionStatusPanel connected={false} onReconnect={mockReconnect} />);

      const reconnectButton = screen.getByRole('button', { name: /reconnect/i });
      expect(reconnectButton).toHaveAttribute('aria-label');
    });
  });

  describe('Styling', () => {
    it('applies custom className', () => {
      const { container } = renderWithProviders(<ConnectionStatus className="custom-class" />);

      const wrapper = container.querySelector('.custom-class');
      expect(wrapper).toBeInTheDocument();
    });

    it('supports different variants', () => {
      const { container: inlineContainer } = renderWithProviders(
        <ConnectionStatus variant="inline" />
      );

      const { container: compactContainer } = renderWithProviders(
        <ConnectionStatus variant="compact" />
      );

      expect(inlineContainer).toBeInTheDocument();
      expect(compactContainer).toBeInTheDocument();
    });
  });

  describe('Integration with WebSocket', () => {
    it('reflects WebSocket connection state', () => {
      const { rerender } = renderWithProviders(<ConnectionStatus connected={false} />);

      expect(screen.getByText(/disconnected/i)).toBeInTheDocument();

      rerender(<ConnectionStatus connected />);

      expect(screen.getByText(/connected/i)).toBeInTheDocument();
    });

    it('triggers reconnect callback', () => {
      const mockReconnect = vi.fn();

      renderWithProviders(<ConnectionStatusPanel connected={false} onReconnect={mockReconnect} />);

      const reconnectButton = screen.getByRole('button', { name: /reconnect/i });
      fireEvent.click(reconnectButton);

      expect(mockReconnect).toHaveBeenCalledTimes(1);
    });
  });

  describe('Auto-Reconnect Indicator', () => {
    it('shows auto-reconnect status', () => {
      renderWithProviders(<ConnectionStatusPanel autoReconnect reconnectIn={5} />);

      expect(screen.getByText(/reconnecting/i)).toBeInTheDocument();
      expect(screen.getByText(/5s/i)).toBeInTheDocument();
    });

    it('updates countdown', () => {
      const { rerender } = renderWithProviders(
        <ConnectionStatusPanel autoReconnect reconnectIn={5} />
      );

      expect(screen.getByText('5s')).toBeInTheDocument();

      rerender(<ConnectionStatusPanel autoReconnect reconnectIn={3} />);

      expect(screen.getByText('3s')).toBeInTheDocument();
    });
  });
});
