/**
 * WebSocket Client Service
 *
 * Manages real-time WebSocket connection with the backend
 * Handles authentication, reconnection, and event subscriptions
 */

import { useAuthStore } from '@/stores/authStore';
import { io, Socket } from 'socket.io-client';

// ============================================================================
// TYPES
// ============================================================================

export type ServerToClientEvents = {
  'order:claimed': (data: { orderId: string; pickerId: string; pickerName: string }) => void;
  'order:completed': (data: { orderId: string; pickerId: string }) => void;
  'order:cancelled': (data: { orderId: string; reason: string }) => void;
  'pick:updated': (data: { orderId: string; orderItemId: string; pickedQuantity: number }) => void;
  'pick:completed': (data: { orderId: string; orderItemId: string }) => void;
  'zone:updated': (data: { zoneId: string; taskCount: number; pickerCount: number }) => void;
  'zone:assignment': (data: { zoneId: string; pickerId: string; assigned: boolean }) => void;
  'inventory:updated': (data: { sku: string; binLocation: string; quantity: number }) => void;
  'inventory:low': (data: { sku: string; quantity: number; minThreshold: number }) => void;
  'notification:new': (data: { notificationId: string; title: string; message: string }) => void;
  'user:activity': (data: { userId: string; status: string; currentView?: string }) => void;
  connected: (data: { message: string }) => void;
};

export type ClientToServerEvents = {
  'subscribe:orders': () => void;
  'subscribe:zone': (zoneId: string) => void;
  'unsubscribe:zone': (zoneId: string) => void;
  'subscribe:inventory': () => void;
  'update:activity': (data: { currentView?: string; status?: string }) => void;
  ping: () => void;
};

export type EventHandler<E extends keyof ServerToClientEvents> = (
  ...args: Parameters<ServerToClientEvents[E]>
) => void;

// ============================================================================
// WEBSOCKET SERVICE CLASS
// ============================================================================

class WebSocketService {
  private socket: Socket<ServerToClientEvents, ClientToServerEvents> | null = null;
  private isManualDisconnect = false;
  private eventHandlers: Map<keyof ServerToClientEvents, Set<EventHandler<any>>> = new Map();
  private hasLoggedMaxAttempts = false;
  // Track active connections to handle React StrictMode double-invocation
  private connectionId = 0;
  private activeConnectionId = 0;

  /**
   * Connect to WebSocket server
   */
  connect(): void {
    // Increment connection ID to track this connection attempt
    const currentConnectionId = ++this.connectionId;
    this.activeConnectionId = currentConnectionId;

    if (this.socket?.connected) {
      console.warn('[WebSocket] Already connected');
      return;
    }

    const token = useAuthStore.getState().accessToken;
    if (!token) {
      console.warn('[WebSocket] No auth token available');
      return;
    }

    // Reset the max attempts log flag when manually connecting
    this.hasLoggedMaxAttempts = false;
    // Reset manual disconnect flag when connecting
    this.isManualDisconnect = false;

    try {
      const wsUrl =
        import.meta.env.VITE_WS_URL ||
        `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.hostname}`;

      this.socket = io(wsUrl, {
        auth: { token },
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionDelay: 2000,
        reconnectionDelayMax: 10000,
        reconnectionAttempts: 5,
        timeout: 10000,
      });

      this.setupEventHandlers();
      console.log('[WebSocket] Connecting...', { url: wsUrl, connectionId: currentConnectionId });
    } catch (error) {
      console.error('[WebSocket] Connection error', error);
    }
  }

  /**
   * Set up core socket event handlers
   */
  private setupEventHandlers(): void {
    if (!this.socket) return;

    // Connection established
    this.socket.on('connect', () => {
      console.log('[WebSocket] Connected', { socketId: this.socket?.id });
      this.hasLoggedMaxAttempts = false;
      this.triggerHandlers('connected' as const, [{ message: 'Connected' }]);
    });

    // Disconnection
    this.socket.on('disconnect', reason => {
      console.log('[WebSocket] Disconnected', { reason });
      // Socket.io handles reconnection automatically when reconnection: true
    });

    // Connection error - socket.io handles reconnection, we just log
    this.socket.on('connect_error', error => {
      // Only log once when max attempts reached to avoid console spam
      if (!this.hasLoggedMaxAttempts) {
        console.warn('[WebSocket] Connection failed, will retry...', error.message);
      }
    });

    // Reconnection failed (all attempts exhausted)
    this.socket.io.on('reconnect_failed', () => {
      if (!this.hasLoggedMaxAttempts) {
        console.warn(
          '[WebSocket] Max reconnection attempts reached. Will retry on next user action.'
        );
        this.hasLoggedMaxAttempts = true;
      }
    });

    // Set up all registered event handlers
    this.eventHandlers.forEach((handlers, event) => {
      handlers.forEach(handler => {
        this.socket?.on(event, handler as any);
      });
    });
  }

  /**
   * Subscribe to an event
   */
  on<E extends keyof ServerToClientEvents>(event: E, handler: EventHandler<E>): () => void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set());
    }
    this.eventHandlers.get(event)!.add(handler);

    // Also add to socket if connected
    if (this.socket?.connected) {
      this.socket.on(event, handler as any);
    }

    // Return unsubscribe function
    return () => this.off(event, handler);
  }

  /**
   * Unsubscribe from an event
   */
  off<E extends keyof ServerToClientEvents>(event: E, handler: EventHandler<E>): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.delete(handler);
      if (handlers.size === 0) {
        this.eventHandlers.delete(event);
      }
    }

    if (this.socket?.connected) {
      this.socket.off(event, handler as any);
    }
  }

  /**
   * Trigger all handlers for an event (for internal use)
   */
  private triggerHandlers<E extends keyof ServerToClientEvents>(
    event: E,
    args: Parameters<ServerToClientEvents[E]>
  ): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(...args);
        } catch (error) {
          console.error(`[WebSocket] Error in handler for ${event}`, error);
        }
      });
    }
  }

  /**
   * Emit an event to the server
   */
  emit<E extends keyof ClientToServerEvents>(
    event: E,
    ...args: Parameters<ClientToServerEvents[E]>
  ): void {
    if (!this.socket?.connected) {
      console.warn('[WebSocket] Cannot emit - not connected', { event });
      return;
    }

    this.socket.emit(event, ...args);
  }

  /**
   * Subscribe to order updates
   */
  subscribeToOrders(): void {
    this.emit('subscribe:orders');
  }

  /**
   * Subscribe to zone updates
   */
  subscribeToZone(zoneId: string): void {
    this.emit('subscribe:zone', zoneId);
  }

  /**
   * Unsubscribe from zone updates
   */
  unsubscribeFromZone(zoneId: string): void {
    this.emit('unsubscribe:zone', zoneId);
  }

  /**
   * Subscribe to inventory updates
   */
  subscribeToInventory(): void {
    this.emit('subscribe:inventory');
  }

  /**
   * Update current user activity
   */
  updateActivity(data: { currentView?: string; status?: string }): void {
    this.emit('update:activity', data);
  }

  /**
   * Disconnect from WebSocket server
   * @param force - If true, disconnect immediately. If false, defer disconnect to handle StrictMode.
   */
  disconnect(force = false): void {
    const currentConnectionId = this.connectionId;

    // In development mode with React StrictMode, effects are double-invoked.
    // This causes connect -> disconnect -> connect cycle rapidly.
    // We use a small defer to allow the reconnect to cancel the disconnect.
    if (!force && !this.isManualDisconnect) {
      // Use a small timeout to allow reconnection to cancel this disconnect
      setTimeout(() => {
        // Only disconnect if no new connection was started and this wasn't a manual disconnect
        if (this.connectionId === currentConnectionId && !this.isManualDisconnect && this.socket) {
          console.log('[WebSocket] Disconnecting (deferred cleanup)', {
            connectionId: currentConnectionId,
          });
          this.socket.disconnect();
          this.socket = null;
          this.eventHandlers.clear();
        }
      }, 100);
      return;
    }

    this.isManualDisconnect = true;
    this.hasLoggedMaxAttempts = false;

    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }

    // Clear all event handlers
    this.eventHandlers.clear();

    console.log('[WebSocket] Disconnected manually', { connectionId: currentConnectionId });
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.socket?.connected ?? false;
  }

  /**
   * Get socket ID
   */
  getSocketId(): string | undefined {
    return this.socket?.id;
  }

  /**
   * Reset manual disconnect flag (for reconnection)
   */
  resetManualDisconnect(): void {
    this.isManualDisconnect = false;
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

const webSocketService = new WebSocketService();

export default webSocketService;
