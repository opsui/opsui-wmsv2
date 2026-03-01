/**
 * WebSocket Server Setup
 *
 * Provides real-time bidirectional communication between clients and server
 * Uses Socket.IO for WebSocket functionality with JWT authentication
 */

import { Server as HTTPServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import config from '../config';
import { logger } from '../config/logger';
import { WebSocketBroadcaster, broadcastEvent } from './broadcaster';
import { verifyToken } from '../middleware/auth';

// ============================================================================
// TYPES
// ============================================================================

interface AuthenticatedSocket extends Socket {
  userId?: string;
  userRole?: string;
}

interface ServerToClientEvents {
  // Order events
  'order:created': (data: { orderId: string; customerId: string; itemCount: number }) => void;
  'order:claimed': (data: { orderId: string; pickerId: string; pickerName: string }) => void;
  'order:completed': (data: { orderId: string; pickerId: string }) => void;
  'order:cancelled': (data: { orderId: string; reason: string }) => void;

  // Pick events
  'pick:updated': (data: { orderId: string; orderItemId: string; pickedQuantity: number }) => void;
  'pick:completed': (data: { orderId: string; orderItemId: string }) => void;

  // Zone events
  'zone:updated': (data: { zoneId: string; taskCount: number; pickerCount: number }) => void;
  'zone:assignment': (data: { zoneId: string; pickerId: string; assigned: boolean }) => void;

  // Inventory events
  'inventory:updated': (data: { sku: string; binLocation: string; quantity: number }) => void;
  'inventory:low': (data: { sku: string; quantity: number; minThreshold: number }) => void;

  // Notification events
  'notification:new': (data: { notificationId: string; title: string; message: string }) => void;

  // User activity events
  'user:activity': (data: { userId: string; status: string; currentView?: string }) => void;

  // Connection events
  connected: (data: { message: string }) => void;
}

interface ClientToServerEvents {
  // Subscription events
  'subscribe:orders': () => void;
  'subscribe:zone': (zoneId: string) => void;
  'unsubscribe:zone': (zoneId: string) => void;
  'subscribe:inventory': () => void;

  // Activity updates
  'update:activity': (data: { currentView?: string; status?: string }) => void;

  // Ping/pong for connection health
  ping: () => void;
}

// ============================================================================
// WEBSOCKET SERVER CLASS
// ============================================================================

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

class WebSocketServer {
  private io: SocketIOServer<ServerToClientEvents, ClientToServerEvents> | null = null;
  private broadcaster: WebSocketBroadcaster | null = null;

  // Rate limiting configuration
  private rateLimiters = new Map<string, RateLimitEntry>();
  private readonly rateLimitWindowMs = 1000; // 1 second window
  private readonly rateLimitMaxRequests = 20; // Max 20 events per second per user

  /**
   * Initialize WebSocket server with HTTP server
   */
  initialize(httpServer: HTTPServer): void {
    if (this.io) {
      logger.warn('WebSocket server already initialized');
      return;
    }

    // Create Socket.IO server with CORS configuration and compression
    this.io = new SocketIOServer<ServerToClientEvents, ClientToServerEvents>(httpServer, {
      cors: {
        origin: config.cors.origin,
        credentials: true,
      },
      transports: ['websocket', 'polling'],
      pingTimeout: 60000,
      pingInterval: 25000,
      // Enable per-message compression for messages > 256 bytes
      perMessageDeflate: {
        threshold: 256,
        zlibDeflateOptions: {
          level: 3, // Fast compression
        },
      },
    });

    // Initialize broadcaster
    this.broadcaster = new WebSocketBroadcaster(this.io);

    // Set up authentication middleware
    this.io.use((socket, next) => {
      this.authenticateSocket(socket as AuthenticatedSocket, next);
    });

    // Set up rate limiting middleware
    this.io.use((socket, next) => {
      this.checkRateLimit(socket as AuthenticatedSocket, next);
    });

    // Set up connection handling
    this.io.on('connection', (socket: AuthenticatedSocket) => {
      this.handleConnection(socket);
    });

    // Start periodic cleanup of rate limiters
    this.startRateLimitCleanup();

    logger.info('WebSocket server initialized', {
      compression: 'enabled (threshold: 256 bytes)',
      rateLimit: `${this.rateLimitMaxRequests} events/${this.rateLimitWindowMs}ms per user`,
    });
  }

  /**
   * Check rate limit for a socket connection
   */
  private checkRateLimit(socket: AuthenticatedSocket, next: (err?: Error) => void): void {
    const userId = socket.userId;
    if (!userId) {
      return next();
    }

    const now = Date.now();
    const limiter = this.rateLimiters.get(userId);

    if (!limiter || limiter.resetAt < now) {
      // New window
      this.rateLimiters.set(userId, { count: 1, resetAt: now + this.rateLimitWindowMs });
      return next();
    }

    if (limiter.count >= this.rateLimitMaxRequests) {
      logger.warn('WebSocket rate limit exceeded', { userId, count: limiter.count });
      return next(new Error('Rate limit exceeded. Please slow down.'));
    }

    limiter.count++;
    next();
  }

  /**
   * Periodic cleanup of stale rate limiters
   */
  private startRateLimitCleanup(): void {
    setInterval(() => {
      const now = Date.now();
      let cleaned = 0;
      // Use Array.from to avoid iterator issues
      const entries = Array.from(this.rateLimiters.entries());
      for (const [userId, limiter] of entries) {
        if (limiter.resetAt < now) {
          this.rateLimiters.delete(userId);
          cleaned++;
        }
      }
      if (cleaned > 0) {
        logger.debug('Rate limiter cleanup', { cleaned, remaining: this.rateLimiters.size });
      }
    }, 60000); // Cleanup every minute
  }

  /**
   * Authenticate WebSocket connection using JWT
   * Handles both compact (new) and legacy (old) token formats
   */
  private authenticateSocket(socket: AuthenticatedSocket, next: (err?: Error) => void): void {
    try {
      const token =
        socket.handshake.auth.token ||
        socket.handshake.headers.authorization?.replace('Bearer ', '');

      if (!token) {
        return next(new Error('Authentication error: No token provided'));
      }

      // Verify JWT token (handles both compact and legacy formats)
      const decoded = verifyToken(token);

      socket.userId = decoded.userId;
      socket.userRole = decoded.role;

      logger.info('WebSocket authenticated', {
        socketId: socket.id,
        userId: decoded.userId,
        role: decoded.role,
      });

      next();
    } catch (error) {
      logger.error('WebSocket authentication failed', { error });
      next(new Error('Authentication error: Invalid token'));
    }
  }

  /**
   * Handle new WebSocket connection
   */
  private handleConnection(socket: AuthenticatedSocket): void {
    const userId = socket.userId!;
    const userRole = socket.userRole!;

    logger.info('WebSocket connected', {
      socketId: socket.id,
      userId,
      role: userRole,
    });

    // Join user-specific room
    socket.join(`user:${userId}`);

    // Send welcome message
    socket.emit('connected', { message: 'WebSocket connection established' });

    // Set up event handlers for this socket
    this.setupSocketHandlers(socket);

    // Handle disconnection
    socket.on('disconnect', reason => {
      logger.info('WebSocket disconnected', {
        socketId: socket.id,
        userId,
        reason,
      });
    });

    // Handle errors
    socket.on('error', error => {
      logger.error('WebSocket error', {
        socketId: socket.id,
        userId,
        error,
      });
    });
  }

  /**
   * Set up event handlers for socket events from client
   */
  private setupSocketHandlers(socket: AuthenticatedSocket): void {
    // Subscribe to order updates
    socket.on('subscribe:orders', () => {
      socket.join('orders');
      logger.debug('Socket subscribed to orders', { socketId: socket.id });
    });

    // Subscribe to specific zone updates
    socket.on('subscribe:zone', (zoneId: string) => {
      socket.join(`zone:${zoneId}`);
      logger.debug('Socket subscribed to zone', { socketId: socket.id, zoneId });
    });

    // Unsubscribe from zone updates
    socket.on('unsubscribe:zone', (zoneId: string) => {
      socket.leave(`zone:${zoneId}`);
      logger.debug('Socket unsubscribed from zone', { socketId: socket.id, zoneId });
    });

    // Subscribe to inventory updates
    socket.on('subscribe:inventory', () => {
      socket.join('inventory');
      logger.debug('Socket subscribed to inventory', { socketId: socket.id });
    });

    // Handle user activity updates
    socket.on('update:activity', data => {
      const userId = socket.userId!;
      // Broadcast activity to admin/supervisor users
      (this.io?.to('user:activity') as any).emit('user:activity', {
        userId,
        ...data,
      });
    });

    // Handle ping/pong
    socket.on('ping', () => {
      socket.emit('pong');
    });
  }

  /**
   * Get the Socket.IO server instance
   */
  getIO(): SocketIOServer<ServerToClientEvents, ClientToServerEvents> | null {
    return this.io;
  }

  /**
   * Get the broadcaster instance
   */
  getBroadcaster(): WebSocketBroadcaster | null {
    return this.broadcaster;
  }

  /**
   * Broadcast an event (convenience method)
   */
  broadcast(event: string, data: any, room?: string): void {
    if (!this.io) return;

    if (room) {
      this.io.to(room).emit(event as any, data);
    } else {
      this.io.emit(event as any, data);
    }
  }

  /**
   * Get connected clients count
   */
  getConnectedCount(): number {
    return this.io?.sockets.sockets.size || 0;
  }

  /**
   * Disconnect all clients
   */
  disconnectAll(): void {
    if (!this.io) return;

    this.io.disconnectSockets();
    logger.info('Disconnected all WebSocket clients');
  }

  /**
   * Close WebSocket server
   */
  close(): void {
    if (!this.io) return;

    this.io.close();
    this.io = null;
    this.broadcaster = null;
    logger.info('WebSocket server closed');
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

const wsServer = new WebSocketServer();

export default wsServer;

// Export broadcaster convenience functions
export { broadcastEvent };
export type { ServerToClientEvents, ClientToServerEvents };
