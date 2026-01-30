/**
 * useWebSocket Hook
 *
 * React hook for managing WebSocket connection and event subscriptions
 * Provides easy interface to WebSocketService with automatic cleanup
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import webSocketService, { ServerToClientEvents } from '@/services/WebSocketService';

// ============================================================================
// TYPES
// ============================================================================

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

export interface UseWebSocketReturn {
  isConnected: boolean;
  connectionStatus: ConnectionStatus;
  socketId: string | undefined;
  subscribe: <E extends keyof ServerToClientEvents>(
    event: E,
    handler: ServerToClientEvents[E]
  ) => () => void;
  connect: () => void;
  disconnect: () => void;
  reconnect: () => void;
}

// ============================================================================
// HOOK
// ============================================================================

export function useWebSocket(autoConnect = true): UseWebSocketReturn {
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
  const [socketId, setSocketId] = useState<string | undefined>();
  const subscriptionsRef = useRef<Map<keyof ServerToClientEvents, Set<ServerToClientEvents[keyof ServerToClientEvents]>>>(
    new Map()
  );

  // Update connection status from WebSocket service
  useEffect(() => {
    const handleConnect = () => {
      setIsConnected(true);
      setConnectionStatus('connected');
      setSocketId(webSocketService.getSocketId());
    };

    const handleDisconnect = () => {
      setIsConnected(false);
      setConnectionStatus('disconnected');
      setSocketId(undefined);
    };

    const handleError = () => {
      setConnectionStatus('error');
      setIsConnected(false);
    };

    // Subscribe to connection events
    const unsubscribeConnect = webSocketService.on('connected', handleConnect);

    // Check current connection status
    if (webSocketService.isConnected()) {
      handleConnect();
    }

    return () => {
      unsubscribeConnect();
    };
  }, []);

  // Subscribe to event with automatic cleanup
  const subscribe = useCallback(
    <E extends keyof ServerToClientEvents>(
      event: E,
      handler: ServerToClientEvents[E]
    ): (() => void) => {
      // Store subscription for cleanup
      if (!subscriptionsRef.current.has(event)) {
        subscriptionsRef.current.set(event, new Set());
      }
      subscriptionsRef.current.get(event)!.add(handler);

      // Subscribe to WebSocket service
      const unsubscribe = webSocketService.on(event, handler);

      // Return cleanup function
      return () => {
        unsubscribe();
        const handlers = subscriptionsRef.current.get(event);
        if (handlers) {
          handlers.delete(handler);
          if (handlers.size === 0) {
            subscriptionsRef.current.delete(event);
          }
        }
      };
    },
    []
  );

  // Connect to WebSocket
  const connect = useCallback(() => {
    setConnectionStatus('connecting');
    webSocketService.connect();
  }, []);

  // Disconnect from WebSocket
  const disconnect = useCallback(() => {
    webSocketService.disconnect();
    setIsConnected(false);
    setConnectionStatus('disconnected');
    setSocketId(undefined);
  }, []);

  // Reconnect to WebSocket
  const reconnect = useCallback(() => {
    webSocketService.resetManualDisconnect();
    connect();
  }, [connect]);

  // Auto-connect on mount if enabled
  useEffect(() => {
    if (autoConnect && !isConnected && connectionStatus === 'disconnected') {
      // Delay connection slightly to ensure auth is ready
      const timer = setTimeout(() => {
        connect();
      }, 100);

      return () => clearTimeout(timer);
    }
  }, [autoConnect, isConnected, connectionStatus, connect]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Unsubscribe all event handlers
      subscriptionsRef.current.forEach((handlers, event) => {
        handlers.forEach(handler => {
          webSocketService.off(event, handler);
        });
      });
      subscriptionsRef.current.clear();
    };
  }, []);

  return {
    isConnected,
    connectionStatus,
    socketId,
    subscribe,
    connect,
    disconnect,
    reconnect,
  };
}

// ============================================================================
// SPECIALIZED HOOKS FOR COMMON USE CASES
// ============================================================================

/**
 * Hook for subscribing to order updates
 */
export function useOrderUpdates(handler: (data: { orderId: string; pickerId?: string; pickerName?: string }) => void) {
  const { subscribe } = useWebSocket();

  useEffect(() => {
    const unsubscribes = [
      subscribe('order:claimed', handler as any),
      subscribe('order:completed', handler as any),
      subscribe('order:cancelled', handler as any),
    ];

    return () => {
      unsubscribes.forEach(unsub => unsub());
    };
  }, [subscribe, handler]);
}

/**
 * Hook for subscribing to pick updates
 */
export function usePickUpdates(handler: (data: { orderId: string; orderItemId: string; pickedQuantity?: number }) => void) {
  const { subscribe } = useWebSocket();

  useEffect(() => {
    const unsubscribe1 = subscribe('pick:updated', handler as any);
    const unsubscribe2 = subscribe('pick:completed', handler as any);

    return () => {
      unsubscribe1();
      unsubscribe2();
    };
  }, [subscribe, handler]);
}

/**
 * Hook for subscribing to inventory updates
 */
export function useInventoryUpdates(handler: (data: { sku: string; binLocation?: string; quantity?: number }) => void) {
  const { subscribe } = useWebSocket();

  useEffect(() => {
    const unsubscribe1 = subscribe('inventory:updated', handler as any);
    const unsubscribe2 = subscribe('inventory:low', handler as any);

    return () => {
      unsubscribe1();
      unsubscribe2();
    };
  }, [subscribe, handler]);
}

/**
 * Hook for subscribing to zone updates
 */
export function useZoneUpdates(handler: (data: { zoneId: string; taskCount?: number; pickerCount?: number }) => void) {
  const { subscribe } = useWebSocket();

  useEffect(() => {
    const unsubscribe1 = subscribe('zone:updated', handler as any);
    const unsubscribe2 = subscribe('zone:assignment', handler as any);

    return () => {
      unsubscribe1();
      unsubscribe2();
    };
  }, [subscribe, handler]);
}

/**
 * Hook for subscribing to notification updates
 */
export function useNotifications(handler: (data: { notificationId: string; title: string; message: string }) => void) {
  const { subscribe } = useWebSocket();

  useEffect(() => {
    const unsubscribe = subscribe('notification:new', handler);
    return () => unsubscribe();
  }, [subscribe, handler]);
}
