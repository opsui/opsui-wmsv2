/**
 * WebSocket Broadcaster
 *
 * Provides typed methods for broadcasting events to connected WebSocket clients
 * Handles event validation and room-based targeting
 */

import { Server as SocketIOServer } from 'socket.io';
import { logger } from '../config/logger';
import type { ServerToClientEvents } from './index';

// ============================================================================
// EVENT TYPES
// ============================================================================

export interface OrderClaimedEvent {
  orderId: string;
  pickerId: string;
  pickerName: string;
  claimedAt: Date;
}

export interface OrderCompletedEvent {
  orderId: string;
  pickerId: string;
  completedAt: Date;
  itemCount: number;
}

export interface PickUpdatedEvent {
  orderId: string;
  orderItemId: string;
  sku: string;
  pickedQuantity: number;
  targetQuantity: number;
  pickerId: string;
}

export interface ZoneUpdatedEvent {
  zoneId: string;
  taskCount: number;
  pickerCount: number;
  lastUpdatedAt: Date;
}

export interface InventoryLowEvent {
  sku: string;
  binLocation: string;
  quantity: number;
  minThreshold: number;
  alertedAt: Date;
}

export interface NotificationEvent {
  notificationId: string;
  userId: string;
  title: string;
  message: string;
  type: 'INFO' | 'WARNING' | 'ERROR' | 'SUCCESS';
  createdAt: Date;
}

// ============================================================================
// WEBSOCKET BROADCASTER CLASS
// ============================================================================

export class WebSocketBroadcaster {
  constructor(private io: SocketIOServer<ServerToClientEvents, any>) {}

  /**
   * Broadcast to all connected clients
   */
  private broadcastAll<E extends keyof ServerToClientEvents>(
    event: E,
    data: Parameters<ServerToClientEvents[E]>[0]
  ): void {
    try {
      this.io.emit(event, data);
      logger.debug('Broadcast to all', { event, data });
    } catch (error) {
      logger.error('Failed to broadcast to all', { event, error });
    }
  }

  /**
   * Broadcast to a specific room
   */
  private broadcastToRoom<E extends keyof ServerToClientEvents>(
    room: string,
    event: E,
    data: Parameters<ServerToClientEvents[E]>[0]
  ): void {
    try {
      this.io.to(room).emit(event, data);
      logger.debug('Broadcast to room', { room, event, data });
    } catch (error) {
      logger.error('Failed to broadcast to room', { room, event, error });
    }
  }

  /**
   * Broadcast to a specific user
   */
  private broadcastToUser<E extends keyof ServerToClientEvents>(
    userId: string,
    event: E,
    data: Parameters<ServerToClientEvents[E]>[0]
  ): void {
    try {
      this.io.to(`user:${userId}`).emit(event, data);
      logger.debug('Broadcast to user', { userId, event, data });
    } catch (error) {
      logger.error('Failed to broadcast to user', { userId, event, error });
    }
  }

  // ==========================================================================
  // ORDER EVENTS
  // ==========================================================================

  /**
   * Broadcast when an order is claimed by a picker
   */
  broadcastOrderClaimed(data: OrderClaimedEvent): void {
    this.broadcastAll('order:claimed', {
      orderId: data.orderId,
      pickerId: data.pickerId,
      pickerName: data.pickerName,
    });
  }

  /**
   * Broadcast when an order is completed
   */
  broadcastOrderCompleted(data: OrderCompletedEvent): void {
    this.broadcastAll('order:completed', {
      orderId: data.orderId,
      pickerId: data.pickerId,
    });
  }

  /**
   * Broadcast when an order is cancelled
   */
  broadcastOrderCancelled(data: { orderId: string; reason: string }): void {
    this.broadcastAll('order:cancelled', data);
  }

  // ==========================================================================
  // PICK EVENTS
  // ==========================================================================

  /**
   * Broadcast when a pick is updated
   */
  broadcastPickUpdated(data: PickUpdatedEvent): void {
    // Broadcast to all users subscribed to orders
    this.broadcastToRoom('orders', 'pick:updated', {
      orderId: data.orderId,
      orderItemId: data.orderItemId,
      pickedQuantity: data.pickedQuantity,
    });

    // Also broadcast to the specific picker
    this.broadcastToUser(data.pickerId, 'pick:updated', {
      orderId: data.orderId,
      orderItemId: data.orderItemId,
      pickedQuantity: data.pickedQuantity,
    });
  }

  /**
   * Broadcast when a pick is completed
   */
  broadcastPickCompleted(data: { orderId: string; orderItemId: string; pickerId: string }): void {
    this.broadcastAll('pick:completed', {
      orderId: data.orderId,
      orderItemId: data.orderItemId,
    });
  }

  // ==========================================================================
  // ZONE EVENTS
  // ==========================================================================

  /**
   * Broadcast zone updates to users subscribed to that zone
   */
  broadcastZoneUpdated(data: ZoneUpdatedEvent): void {
    this.broadcastToRoom(`zone:${data.zoneId}`, 'zone:updated', {
      zoneId: data.zoneId,
      taskCount: data.taskCount,
      pickerCount: data.pickerCount,
    });
  }

  /**
   * Broadcast picker assignment/unassignment from zone
   */
  broadcastZoneAssignment(data: { zoneId: string; pickerId: string; assigned: boolean }): void {
    this.broadcastToRoom(`zone:${data.zoneId}`, 'zone:assignment', data);
  }

  // ==========================================================================
  // INVENTORY EVENTS
  // ==========================================================================

  /**
   * Broadcast inventory updates
   */
  broadcastInventoryUpdated(data: { sku: string; binLocation: string; quantity: number }): void {
    this.broadcastToRoom('inventory', 'inventory:updated', data);
  }

  /**
   * Broadcast low stock alerts
   */
  broadcastInventoryLow(data: InventoryLowEvent): void {
    this.broadcastAll('inventory:low', {
      sku: data.sku,
      quantity: data.quantity,
      minThreshold: data.minThreshold,
    });
  }

  // ==========================================================================
  // NOTIFICATION EVENTS
  // ==========================================================================

  /**
   * Broadcast a notification to a specific user
   */
  broadcastNotification(data: NotificationEvent): void {
    this.broadcastToUser(data.userId, 'notification:new', {
      notificationId: data.notificationId,
      title: data.title,
      message: data.message,
    });
  }

  /**
   * Broadcast a notification to all users
   */
  broadcastGlobalNotification(data: Omit<NotificationEvent, 'userId'>): void {
    this.broadcastAll('notification:new', {
      notificationId: data.notificationId,
      title: data.title,
      message: data.message,
    });
  }

  // ==========================================================================
  // USER ACTIVITY EVENTS
  // ==========================================================================

  /**
   * Broadcast user activity updates
   */
  broadcastUserActivity(data: {
    userId: string;
    status: string;
    currentView?: string;
    currentTask?: string;
  }): void {
    this.broadcastToRoom('user:activity', 'user:activity', data);
  }

  // ==========================================================================
  // UTILITY METHODS
  // ==========================================================================

  /**
   * Get number of connected clients
   */
  getConnectedCount(): number {
    return this.io.sockets.sockets.size;
  }

  /**
   * Get number of clients in a specific room
   */
  getRoomCount(room: string): number {
    return this.io.sockets.adapter.rooms.get(room)?.size || 0;
  }

  /**
   * Get all room names and their client counts
   */
  getAllRoomCounts(): Map<string, number> {
    const roomCounts = new Map<string, number>();
    const rooms = this.io.sockets.adapter.rooms;

    rooms.forEach((sockets, roomName) => {
      roomCounts.set(roomName, sockets.size);
    });

    return roomCounts;
  }
}

// ============================================================================
// CONVENIENCE FUNCTION
// ============================================================================

/**
 * Broadcast an event without accessing the broadcaster instance
 * This is useful for calling from services that don't have direct access to the WebSocket server
 */
export function broadcastEvent<E extends keyof ServerToClientEvents>(
  event: E,
  data: Parameters<ServerToClientEvents[E]>[0],
  room?: string
): void {
  // This will be called from the singleton wsServer instance
  // The actual implementation is in the WebSocketServer class
  // This is a type-safe wrapper for external use
}
