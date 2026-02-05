/**
 * Tests for useWebSocket
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import {
  useWebSocket,
  useOrderUpdates,
  usePickUpdates,
  useInventoryUpdates,
  useZoneUpdates,
  useNotifications,
} from './useWebSocket';
import webSocketService from '@/services/WebSocketService';

// Mock the WebSocketService
vi.mock('@/services/WebSocketService', () => ({
  default: {
    isConnected: vi.fn(() => false),
    getSocketId: vi.fn(() => 'test-socket-id'),
    connect: vi.fn(),
    disconnect: vi.fn(),
    resetManualDisconnect: vi.fn(),
    on: vi.fn(() => vi.fn()),
    off: vi.fn(),
  },
}));

describe('useWebSocket', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should initialize with disconnected status', () => {
    const { result } = renderHook(() => useWebSocket(false));

    expect(result.current.isConnected).toBe(false);
    expect(result.current.connectionStatus).toBe('disconnected');
    expect(result.current.socketId).toBeUndefined();
  });

  it('should auto-connect when autoConnect is true', async () => {
    renderHook(() => useWebSocket(true));

    await waitFor(() => {
      expect(webSocketService.connect).toHaveBeenCalled();
    });
  });

  it('should not auto-connect when autoConnect is false', () => {
    renderHook(() => useWebSocket(false));

    expect(webSocketService.connect).not.toHaveBeenCalled();
  });

  it('should connect when connect is called', () => {
    const { result } = renderHook(() => useWebSocket(false));

    act(() => {
      result.current.connect();
    });

    expect(webSocketService.connect).toHaveBeenCalled();
    expect(result.current.connectionStatus).toBe('connecting');
  });

  it('should disconnect when disconnect is called', () => {
    const { result } = renderHook(() => useWebSocket(false));

    act(() => {
      result.current.disconnect();
    });

    expect(webSocketService.disconnect).toHaveBeenCalled();
    expect(result.current.connectionStatus).toBe('disconnected');
  });

  it('should reconnect when reconnect is called', () => {
    const { result } = renderHook(() => useWebSocket(false));

    act(() => {
      result.current.reconnect();
    });

    expect(webSocketService.resetManualDisconnect).toHaveBeenCalled();
    expect(webSocketService.connect).toHaveBeenCalled();
  });

  it('should subscribe to events and return unsubscribe function', () => {
    const mockUnsubscribe = vi.fn();
    vi.mocked(webSocketService.on).mockReturnValue(mockUnsubscribe);

    const { result } = renderHook(() => useWebSocket(false));
    const handler = vi.fn();

    const unsubscribe = result.current.subscribe('order:updated' as any, handler);

    expect(webSocketService.on).toHaveBeenCalledWith('order:updated', handler);
    expect(typeof unsubscribe).toBe('function');

    act(() => {
      unsubscribe();
    });

    expect(mockUnsubscribe).toHaveBeenCalled();
  });

  it('should handle connection status updates', async () => {
    let connectedHandler: (() => void) | undefined;

    vi.mocked(webSocketService.on).mockImplementation((event, handler) => {
      if (event === 'connected') {
        connectedHandler = handler as () => void;
      }
      return vi.fn();
    });

    const { result } = renderHook(() => useWebSocket(false));

    // Simulate connection
    act(() => {
      connectedHandler?.();
    });

    await waitFor(() => {
      expect(result.current.isConnected).toBe(true);
      expect(result.current.connectionStatus).toBe('connected');
      expect(result.current.socketId).toBe('test-socket-id');
    });
  });

  it('should detect existing connection on mount', () => {
    vi.mocked(webSocketService.isConnected).mockReturnValue(true);

    const { result } = renderHook(() => useWebSocket(false));

    expect(result.current.isConnected).toBe(true);
    expect(result.current.connectionStatus).toBe('connected');
  });
});

describe('useOrderUpdates', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should subscribe to order events', () => {
    const mockUnsubscribe = vi.fn();
    vi.mocked(webSocketService.on).mockReturnValue(mockUnsubscribe);

    const handler = vi.fn();
    renderHook(() => useOrderUpdates(handler));

    expect(webSocketService.on).toHaveBeenCalledWith('order:claimed', handler);
    expect(webSocketService.on).toHaveBeenCalledWith('order:completed', handler);
    expect(webSocketService.on).toHaveBeenCalledWith('order:cancelled', handler);
  });

  it('should unsubscribe on unmount', () => {
    const mockUnsubscribe = vi.fn();
    vi.mocked(webSocketService.on).mockReturnValue(mockUnsubscribe);

    const handler = vi.fn();
    const { unmount } = renderHook(() => useOrderUpdates(handler));

    unmount();

    // The unsubscribe is called for each event subscription + cleanup
    expect(mockUnsubscribe).toHaveBeenCalled();
    expect(mockUnsubscribe).toHaveBeenCalledTimes(4);
  });
});

describe('usePickUpdates', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should subscribe to pick events', () => {
    const mockUnsubscribe = vi.fn();
    vi.mocked(webSocketService.on).mockReturnValue(mockUnsubscribe);

    const handler = vi.fn();
    renderHook(() => usePickUpdates(handler));

    expect(webSocketService.on).toHaveBeenCalledWith('pick:updated', handler);
    expect(webSocketService.on).toHaveBeenCalledWith('pick:completed', handler);
  });

  it('should unsubscribe on unmount', () => {
    const mockUnsubscribe = vi.fn();
    vi.mocked(webSocketService.on).mockReturnValue(mockUnsubscribe);

    const handler = vi.fn();
    const { unmount } = renderHook(() => usePickUpdates(handler));

    unmount();

    expect(mockUnsubscribe).toHaveBeenCalledTimes(3);
  });
});

describe('useInventoryUpdates', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should subscribe to inventory events', () => {
    const mockUnsubscribe = vi.fn();
    vi.mocked(webSocketService.on).mockReturnValue(mockUnsubscribe);

    const handler = vi.fn();
    renderHook(() => useInventoryUpdates(handler));

    expect(webSocketService.on).toHaveBeenCalledWith('inventory:updated', handler);
    expect(webSocketService.on).toHaveBeenCalledWith('inventory:low', handler);
  });

  it('should unsubscribe on unmount', () => {
    const mockUnsubscribe = vi.fn();
    vi.mocked(webSocketService.on).mockReturnValue(mockUnsubscribe);

    const handler = vi.fn();
    const { unmount } = renderHook(() => useInventoryUpdates(handler));

    unmount();

    expect(mockUnsubscribe).toHaveBeenCalledTimes(3);
  });
});

describe('useZoneUpdates', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should subscribe to zone events', () => {
    const mockUnsubscribe = vi.fn();
    vi.mocked(webSocketService.on).mockReturnValue(mockUnsubscribe);

    const handler = vi.fn();
    renderHook(() => useZoneUpdates(handler));

    expect(webSocketService.on).toHaveBeenCalledWith('zone:updated', handler);
    expect(webSocketService.on).toHaveBeenCalledWith('zone:assignment', handler);
  });

  it('should unsubscribe on unmount', () => {
    const mockUnsubscribe = vi.fn();
    vi.mocked(webSocketService.on).mockReturnValue(mockUnsubscribe);

    const handler = vi.fn();
    const { unmount } = renderHook(() => useZoneUpdates(handler));

    unmount();

    expect(mockUnsubscribe).toHaveBeenCalledTimes(3);
  });
});

describe('useNotifications', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should subscribe to notification events', () => {
    const mockUnsubscribe = vi.fn();
    vi.mocked(webSocketService.on).mockReturnValue(mockUnsubscribe);

    const handler = vi.fn();
    renderHook(() => useNotifications(handler));

    expect(webSocketService.on).toHaveBeenCalledWith('notification:new', handler);
  });

  it('should unsubscribe on unmount', () => {
    const mockUnsubscribe = vi.fn();
    vi.mocked(webSocketService.on).mockReturnValue(mockUnsubscribe);

    const handler = vi.fn();
    const { unmount } = renderHook(() => useNotifications(handler));

    unmount();

    expect(mockUnsubscribe).toHaveBeenCalledTimes(2);
  });
});
