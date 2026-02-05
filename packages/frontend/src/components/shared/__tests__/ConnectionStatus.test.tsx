/**
 * ConnectionStatus Component Tests
 * @complexity high
 * @tested yes
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { renderWithProviders, renderHook } from '@/test/utils';
import {
  ConnectionStatus,
  ConnectionStatusDot,
  ConnectionStatusPanel,
  useWebSocketConnection,
} from '../ConnectionStatus';

// Mock useWebSocket hook
vi.mock('@/hooks/useWebSocket', () => ({
  useWebSocket: vi.fn(),
}));

import { useWebSocket } from '@/hooks/useWebSocket';

// Helper function to create a complete mock return value
const createMockWebSocket = (overrides: Partial<ReturnType<typeof useWebSocket>> = {}) => ({
  isConnected: true,
  connectionStatus: 'connected' as const,
  socketId: 'test-socket-id',
  reconnect: vi.fn(),
  subscribe: vi.fn(),
  connect: vi.fn(),
  disconnect: vi.fn(),
  ...overrides,
});

describe('useWebSocketConnection Hook', () => {
  const mockReconnect = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('maps connected status', () => {
    vi.mocked(useWebSocket).mockReturnValue(
      createMockWebSocket({
        isConnected: true,
        connectionStatus: 'connected',
        socketId: 'socket-123',
        reconnect: mockReconnect,
      })
    );

    const { result } = renderHook(() => useWebSocketConnection());
    expect(result.current.status).toBe('connected');
    expect(result.current.socketId).toBe('socket-123');
    expect(result.current.reconnect).toBe(mockReconnect);
  });

  it('maps connecting status', () => {
    vi.mocked(useWebSocket).mockReturnValue(
      createMockWebSocket({
        isConnected: false,
        connectionStatus: 'connecting',
        socketId: undefined,
      })
    );

    const { result } = renderHook(() => useWebSocketConnection());
    expect(result.current.status).toBe('connecting');
  });

  it('maps disconnected status', () => {
    vi.mocked(useWebSocket).mockReturnValue(
      createMockWebSocket({
        isConnected: false,
        connectionStatus: 'disconnected',
        socketId: undefined,
      })
    );

    const { result } = renderHook(() => useWebSocketConnection());
    expect(result.current.status).toBe('disconnected');
  });

  it('maps error status', () => {
    vi.mocked(useWebSocket).mockReturnValue(
      createMockWebSocket({
        isConnected: false,
        connectionStatus: 'error',
        socketId: undefined,
      })
    );

    const { result } = renderHook(() => useWebSocketConnection());
    expect(result.current.status).toBe('error');
  });

  it('defaults to disconnected for unknown status', () => {
    vi.mocked(useWebSocket).mockReturnValue(
      createMockWebSocket({
        isConnected: false,
        connectionStatus: 'unknown' as any,
        socketId: undefined,
      })
    );

    const { result } = renderHook(() => useWebSocketConnection());
    expect(result.current.status).toBe('disconnected');
  });
});

describe('ConnectionStatus Component', () => {
  const mockReconnect = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    // Default mock - connected state
    vi.mocked(useWebSocket).mockReturnValue(
      createMockWebSocket({
        connectionStatus: 'connected',
        socketId: 'test-socket-id',
        reconnect: mockReconnect,
      })
    );
  });

  describe('Connected State', () => {
    beforeEach(() => {
      vi.mocked(useWebSocket).mockReturnValue(
        createMockWebSocket({
          connectionStatus: 'connected',
          socketId: 'socket-123',
          reconnect: mockReconnect,
        })
      );
    });

    it('renders connected state', () => {
      renderWithProviders(<ConnectionStatus />);
      expect(screen.getByText('Connected')).toBeInTheDocument();
    });

    it('displays status label by default', () => {
      renderWithProviders(<ConnectionStatus />);
      expect(screen.getByText('Connected')).toBeInTheDocument();
    });

    it('shows green icon for connected state', () => {
      const { container } = renderWithProviders(<ConnectionStatus />);
      const icon = container.querySelector('svg');
      expect(icon).toBeInTheDocument();
      expect(icon).toHaveClass('text-green-400');
    });

    it('has proper title attribute for accessibility', () => {
      const { container } = renderWithProviders(<ConnectionStatus />);
      const wrapper = container.querySelector('div[title]');
      expect(wrapper).toHaveAttribute('title', 'WebSocket: Connected');
    });

    it('applies green styling for connected state', () => {
      const { container } = renderWithProviders(<ConnectionStatus />);
      const wrapper = container.querySelector('.bg-green-400\\/10');
      expect(wrapper).toBeInTheDocument();
    });

    it('does not show reconnect button when connected', () => {
      renderWithProviders(<ConnectionStatus />);
      expect(screen.queryByText('Reconnect')).not.toBeInTheDocument();
    });
  });

  describe('Connecting State', () => {
    beforeEach(() => {
      vi.mocked(useWebSocket).mockReturnValue(
        createMockWebSocket({
          connectionStatus: 'connecting',
          socketId: undefined,
        })
      );
    });

    it('renders connecting status', () => {
      renderWithProviders(<ConnectionStatus />);
      expect(screen.getByText('Connecting...')).toBeInTheDocument();
    });

    it('shows yellow icon for connecting state', () => {
      const { container } = renderWithProviders(<ConnectionStatus />);
      const icon = container.querySelector('svg');
      expect(icon).toBeInTheDocument();
      expect(icon).toHaveClass('text-yellow-400');
    });

    it('animates icon when connecting', () => {
      const { container } = renderWithProviders(<ConnectionStatus />);
      const icon = container.querySelector('svg');
      expect(icon).toHaveClass('animate-pulse');
    });

    it('does not show reconnect button when connecting', () => {
      renderWithProviders(<ConnectionStatus />);
      expect(screen.queryByText('Reconnect')).not.toBeInTheDocument();
    });
  });

  describe('Disconnected State', () => {
    beforeEach(() => {
      vi.mocked(useWebSocket).mockReturnValue(
        createMockWebSocket({
          connectionStatus: 'disconnected',
          socketId: undefined,
          reconnect: mockReconnect,
        })
      );
    });

    it('renders disconnected status', () => {
      renderWithProviders(<ConnectionStatus />);
      expect(screen.getByText('Disconnected')).toBeInTheDocument();
    });

    it('shows gray icon for disconnected state', () => {
      const { container } = renderWithProviders(<ConnectionStatus />);
      const icon = container.querySelector('svg');
      expect(icon).toBeInTheDocument();
      expect(icon).toHaveClass('text-gray-400');
    });

    it('shows reconnect button when disconnected', () => {
      renderWithProviders(<ConnectionStatus />);
      expect(screen.getByText('Reconnect')).toBeInTheDocument();
    });

    it('calls reconnect when reconnect button is clicked', () => {
      renderWithProviders(<ConnectionStatus />);
      fireEvent.click(screen.getByText('Reconnect'));
      expect(mockReconnect).toHaveBeenCalledTimes(1);
    });
  });

  describe('Error State', () => {
    beforeEach(() => {
      vi.mocked(useWebSocket).mockReturnValue(
        createMockWebSocket({
          connectionStatus: 'error',
          socketId: undefined,
          reconnect: mockReconnect,
        })
      );
    });

    it('renders error status', () => {
      renderWithProviders(<ConnectionStatus />);
      expect(screen.getByText('Connection Error')).toBeInTheDocument();
    });

    it('shows red icon for error state', () => {
      const { container } = renderWithProviders(<ConnectionStatus />);
      const icon = container.querySelector('svg');
      expect(icon).toBeInTheDocument();
      expect(icon).toHaveClass('text-red-400');
    });

    it('shows reconnect button when in error state', () => {
      renderWithProviders(<ConnectionStatus />);
      expect(screen.getByText('Reconnect')).toBeInTheDocument();
    });

    it('calls reconnect when reconnect button is clicked', () => {
      renderWithProviders(<ConnectionStatus />);
      fireEvent.click(screen.getByText('Reconnect'));
      expect(mockReconnect).toHaveBeenCalledTimes(1);
    });
  });

  describe('showLabel prop', () => {
    it('hides label when showLabel is false', () => {
      renderWithProviders(<ConnectionStatus showLabel={false} />);
      expect(screen.queryByText('Connected')).not.toBeInTheDocument();
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

describe('ConnectionStatusDot Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default to connected state
    vi.mocked(useWebSocket).mockReturnValue(
      createMockWebSocket({
        connectionStatus: 'connected',
        socketId: 'socket-123',
      })
    );
  });

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

  it('shows green dot when connected', () => {
    vi.mocked(useWebSocket).mockReturnValue(
      createMockWebSocket({
        connectionStatus: 'connected',
        socketId: 'socket-123',
      })
    );

    const { container } = renderWithProviders(<ConnectionStatusDot />);
    const dot = container.querySelector('div');
    expect(dot).toHaveClass('bg-green-400');
  });

  it('shows yellow dot when connecting', () => {
    vi.mocked(useWebSocket).mockReturnValue(
      createMockWebSocket({
        connectionStatus: 'connecting',
        socketId: undefined,
      })
    );

    const { container } = renderWithProviders(<ConnectionStatusDot />);
    const dot = container.querySelector('div');
    expect(dot).toHaveClass('bg-yellow-400', 'animate-pulse');
  });

  it('shows gray dot when disconnected', () => {
    vi.mocked(useWebSocket).mockReturnValue(
      createMockWebSocket({
        connectionStatus: 'disconnected',
        socketId: undefined,
      })
    );

    const { container } = renderWithProviders(<ConnectionStatusDot />);
    const dot = container.querySelector('div');
    expect(dot).toHaveClass('bg-gray-400');
  });

  it('shows red dot when in error state', () => {
    vi.mocked(useWebSocket).mockReturnValue(
      createMockWebSocket({
        connectionStatus: 'error',
        socketId: undefined,
      })
    );

    const { container } = renderWithProviders(<ConnectionStatusDot />);
    const dot = container.querySelector('div');
    expect(dot).toHaveClass('bg-red-400');
  });

  it('applies custom className', () => {
    const { container } = renderWithProviders(<ConnectionStatusDot className="custom-dot" />);
    const dot = container.querySelector('.custom-dot');
    expect(dot).toBeInTheDocument();
  });
});

describe('ConnectionStatusPanel Component', () => {
  const mockReconnect = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Connected State', () => {
    beforeEach(() => {
      vi.mocked(useWebSocket).mockReturnValue(
        createMockWebSocket({
          connectionStatus: 'connected',
          socketId: 'socket-123',
          reconnect: mockReconnect,
        })
      );
    });

    it('renders connection details', () => {
      renderWithProviders(<ConnectionStatusPanel />);
      expect(screen.getByText('Connected')).toBeInTheDocument();
      expect(screen.getByText('Real-time updates are active')).toBeInTheDocument();
    });

    it('displays socket ID when available', () => {
      renderWithProviders(<ConnectionStatusPanel />);
      expect(screen.getByText(/Socket ID:/i)).toBeInTheDocument();
    });

    it('shows exact socket ID value', () => {
      renderWithProviders(<ConnectionStatusPanel />);
      expect(screen.getByText('Socket ID: socket-123')).toBeInTheDocument();
    });

    it('does not show reconnect button when connected', () => {
      renderWithProviders(<ConnectionStatusPanel />);
      expect(screen.queryByText('Reconnect')).not.toBeInTheDocument();
    });

    it('does not show progress bar when connected', () => {
      const { container } = renderWithProviders(<ConnectionStatusPanel />);
      const progressBar = container.querySelector('.animate-pulse');
      expect(progressBar).not.toBeInTheDocument();
    });
  });

  describe('Connecting State', () => {
    beforeEach(() => {
      vi.mocked(useWebSocket).mockReturnValue(
        createMockWebSocket({
          connectionStatus: 'connecting',
          socketId: undefined,
        })
      );
    });

    it('renders connecting status', () => {
      renderWithProviders(<ConnectionStatusPanel />);
      expect(screen.getByText('Connecting')).toBeInTheDocument();
    });

    it('shows description', () => {
      renderWithProviders(<ConnectionStatusPanel />);
      expect(screen.getByText('Establishing WebSocket connection...')).toBeInTheDocument();
    });

    it('shows progress bar', () => {
      const { container } = renderWithProviders(<ConnectionStatusPanel />);
      const progressBar = container.querySelector('.animate-pulse');
      expect(progressBar).toBeInTheDocument();
    });

    it('does not show reconnect button when connecting', () => {
      renderWithProviders(<ConnectionStatusPanel />);
      expect(screen.queryByText('Reconnect')).not.toBeInTheDocument();
    });
  });

  describe('Disconnected State', () => {
    beforeEach(() => {
      vi.mocked(useWebSocket).mockReturnValue(
        createMockWebSocket({
          connectionStatus: 'disconnected',
          socketId: undefined,
          reconnect: mockReconnect,
        })
      );
    });

    it('renders disconnected status', () => {
      renderWithProviders(<ConnectionStatusPanel />);
      expect(screen.getByText('Disconnected')).toBeInTheDocument();
    });

    it('shows description', () => {
      renderWithProviders(<ConnectionStatusPanel />);
      expect(screen.getByText('WebSocket connection is not active')).toBeInTheDocument();
    });

    it('does not show socket ID when null', () => {
      renderWithProviders(<ConnectionStatusPanel />);
      expect(screen.queryByText(/Socket ID:/)).not.toBeInTheDocument();
    });

    it('shows reconnect button when disconnected', () => {
      renderWithProviders(<ConnectionStatusPanel />);
      expect(screen.getByText('Reconnect')).toBeInTheDocument();
    });

    it('calls reconnect when reconnect button is clicked', () => {
      renderWithProviders(<ConnectionStatusPanel />);
      fireEvent.click(screen.getByText('Reconnect'));
      expect(mockReconnect).toHaveBeenCalledTimes(1);
    });
  });

  describe('Error State', () => {
    beforeEach(() => {
      vi.mocked(useWebSocket).mockReturnValue(
        createMockWebSocket({
          connectionStatus: 'error',
          socketId: undefined,
          reconnect: mockReconnect,
        })
      );
    });

    it('renders error status', () => {
      renderWithProviders(<ConnectionStatusPanel />);
      expect(screen.getByText('Connection Error')).toBeInTheDocument();
    });

    it('shows description', () => {
      renderWithProviders(<ConnectionStatusPanel />);
      expect(screen.getByText('Failed to establish WebSocket connection')).toBeInTheDocument();
    });

    it('shows reconnect button when in error state', () => {
      renderWithProviders(<ConnectionStatusPanel />);
      expect(screen.getByText('Reconnect')).toBeInTheDocument();
    });

    it('calls reconnect when reconnect button is clicked', () => {
      renderWithProviders(<ConnectionStatusPanel />);
      fireEvent.click(screen.getByText('Reconnect'));
      expect(mockReconnect).toHaveBeenCalledTimes(1);
    });
  });

  describe('Custom ClassName', () => {
    beforeEach(() => {
      vi.mocked(useWebSocket).mockReturnValue(
        createMockWebSocket({
          connectionStatus: 'connected',
          socketId: 'socket-123',
          reconnect: mockReconnect,
        })
      );
    });

    it('applies custom className', () => {
      const { container } = renderWithProviders(<ConnectionStatusPanel className="custom-panel" />);
      const panel = container.querySelector('.custom-panel');
      expect(panel).toBeInTheDocument();
    });
  });
});
