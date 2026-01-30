/**
 * Notification Helper
 *
 * Convenience functions for sending notifications across all services
 * Handles WebSocket broadcasting and in-app notifications
 */

import { notificationService } from './NotificationService';
import wsServer from '../websocket';
import { logger } from '../config/logger';

// ============================================================================
// NOTIFICATION TYPES
// ============================================================================

export enum NotificationType {
  // Order notifications
  ORDER_CLAIMED = 'ORDER_CLAIMED',
  ORDER_COMPLETED = 'ORDER_COMPLETED',
  ORDER_CANCELLED = 'ORDER_CANCELLED',
  ORDER_BACKORDERED = 'ORDER_BACKORDERED',
  ORDER_SHIPPED = 'ORDER_SHIPPED',
  ORDER_PACKED = 'ORDER_PACKED',

  // Pick notifications
  PICK_UPDATED = 'PICK_UPDATED',
  PICK_COMPLETED = 'PICK_COMPLETED',

  // Inventory notifications
  INVENTORY_LOW = 'INVENTORY_LOW',
  INVENTORY_OUT = 'INVENTORY_OUT',
  INVENTORY_REPLENISHED = 'INVENTORY_REPLENISHED',

  // Exception notifications
  EXCEPTION_REPORTED = 'EXCEPTION_REPORTED',
  EXCEPTION_RESOLVED = 'EXCEPTION_RESOLVED',

  // Quality notifications
  QUALITY_FAILED = 'QUALITY_FAILED',
  QUALITY_APPROVED = 'QUALITY_APPROVED',

  // Zone notifications
  ZONE_ASSIGNED = 'ZONE_ASSIGNED',
  ZONE_UPDATED = 'ZONE_UPDATED',

  // Wave notifications
  WAVE_CREATED = 'WAVE_CREATED',
  WAVE_COMPLETED = 'WAVE_COMPLETED',

  // System notifications
  SYSTEM_ALERT = 'SYSTEM_ALERT',
  SYSTEM_ERROR = 'SYSTEM_ERROR',
  MAINTENANCE_REQUIRED = 'MAINTENANCE_REQUIRED',

  // User notifications
  USER_LOGIN = 'USER_LOGIN',
  USER_LOGOUT = 'USER_LOGOUT',
  ROLE_CHANGED = 'ROLE_CHANGED',
}

export enum NotificationPriority {
  LOW = 'LOW',
  NORMAL = 'NORMAL',
  HIGH = 'HIGH',
  URGENT = 'URGENT',
}

// ============================================================================
// NOTIFICATION HELPER FUNCTIONS
// ============================================================================

/**
 * Send a notification to a specific user
 */
export async function notifyUser(options: {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  priority?: NotificationPriority;
  data?: Record<string, any>;
}): Promise<void> {
  try {
    await notificationService.sendNotification({
      userId: options.userId,
      type: options.type,
      channel: 'IN_APP',
      title: options.title,
      message: options.message,
      priority: options.priority || NotificationPriority.NORMAL,
      data: options.data,
    });
  } catch (error) {
    logger.error('Failed to send notification', { error, options });
  }
}

/**
 * Send notification to multiple users
 */
export async function notifyUsers(options: {
  userIds: string[];
  type: NotificationType;
  title: string;
  message: string;
  priority?: NotificationPriority;
  data?: Record<string, any>;
}): Promise<void> {
  try {
    await notificationService.bulkSend({
      userIds: options.userIds,
      type: options.type,
      channels: ['IN_APP'],
      title: options.title,
      message: options.message,
      priority: options.priority || NotificationPriority.NORMAL,
      data: options.data,
    });
  } catch (error) {
    logger.error('Failed to send bulk notification', { error, options });
  }
}

/**
 * Send a global notification to all users
 */
export async function notifyAll(options: {
  type: NotificationType;
  title: string;
  message: string;
  priority?: NotificationPriority;
  data?: Record<string, any>;
}): Promise<void> {
  const broadcaster = wsServer.getBroadcaster();
  if (!broadcaster) {
    logger.warn('Cannot broadcast: WebSocket broadcaster not available');
    return;
  }

  try {
    broadcaster.broadcastGlobalNotification({
      notificationId: `GLOBAL-${Date.now()}`,
      title: options.title,
      message: options.message,
      type: getNotificationType(options.priority),
      createdAt: new Date(),
    });
  } catch (error) {
    logger.error('Failed to broadcast global notification', { error, options });
  }
}

/**
 * Broadcast an event via WebSocket without creating a notification record
 */
export function broadcastEvent(
  event: keyof import('../websocket').ServerToClientEvents,
  data: any
): void {
  const broadcaster = wsServer.getBroadcaster();
  if (!broadcaster) {
    logger.warn('Cannot broadcast: WebSocket broadcaster not available');
    return;
  }

  try {
    wsServer.broadcast(event, data);
  } catch (error) {
    logger.error('Failed to broadcast event', { error, event, data });
  }
}

// ============================================================================
// ORDER NOTIFICATIONS
// ============================================================================

export async function notifyOrderClaimed(options: {
  orderId: string;
  pickerId: string;
  pickerName?: string;
}): Promise<void> {
  const broadcaster = wsServer.getBroadcaster();
  if (broadcaster) {
    broadcaster.broadcastOrderClaimed({
      orderId: options.orderId,
      pickerId: options.pickerId,
      pickerName: options.pickerName || options.pickerId,
      claimedAt: new Date(),
    });
  }

  await notifyUser({
    userId: options.pickerId,
    type: NotificationType.ORDER_CLAIMED,
    title: 'Order Claimed',
    message: `You have claimed order ${options.orderId}`,
    priority: NotificationPriority.NORMAL,
    data: { orderId: options.orderId },
  });
}

export async function notifyOrderCompleted(options: {
  orderId: string;
  pickerId: string;
  itemCount: number;
}): Promise<void> {
  const broadcaster = wsServer.getBroadcaster();
  if (broadcaster) {
    broadcaster.broadcastOrderCompleted({
      orderId: options.orderId,
      pickerId: options.pickerId,
      completedAt: new Date(),
      itemCount: options.itemCount,
    });
  }

  await notifyUser({
    userId: options.pickerId,
    type: NotificationType.ORDER_COMPLETED,
    title: 'Order Completed',
    message: `Order ${options.orderId} has been picked and is ready for packing`,
    priority: NotificationPriority.HIGH,
    data: { orderId: options.orderId },
  });
}

export async function notifyOrderCancelled(options: {
  orderId: string;
  userId: string;
  reason?: string;
}): Promise<void> {
  const broadcaster = wsServer.getBroadcaster();
  if (broadcaster) {
    broadcaster.broadcastOrderCancelled({
      orderId: options.orderId,
      reason: options.reason || 'No reason provided',
    });
  }

  await notifyUser({
    userId: options.userId,
    type: NotificationType.ORDER_CANCELLED,
    title: 'Order Cancelled',
    message: `Order ${options.orderId} has been cancelled${options.reason ? `. Reason: ${options.reason}` : ''}`,
    priority: NotificationPriority.HIGH,
    data: { orderId: options.orderId, reason: options.reason },
  });
}

// ============================================================================
// INVENTORY NOTIFICATIONS
// ============================================================================

export async function notifyInventoryLow(options: {
  sku: string;
  binLocation: string;
  quantity: number;
  minThreshold: number;
}): Promise<void> {
  const broadcaster = wsServer.getBroadcaster();
  if (broadcaster) {
    broadcaster.broadcastInventoryLow({
      sku: options.sku,
      binLocation: options.binLocation,
      quantity: options.quantity,
      minThreshold: options.minThreshold,
      alertedAt: new Date(),
    });
  }

  await notifyAll({
    type: NotificationType.INVENTORY_LOW,
    title: 'Low Stock Alert',
    message: `SKU ${options.sku} at ${options.binLocation} is low (${options.quantity} units, min: ${options.minThreshold})`,
    priority: NotificationPriority.HIGH,
    data: {
      sku: options.sku,
      binLocation: options.binLocation,
      quantity: options.quantity,
      minThreshold: options.minThreshold,
    },
  });
}

// ============================================================================
// EXCEPTION NOTIFICATIONS
// ============================================================================

export async function notifyExceptionReported(options: {
  exceptionId: string;
  orderId: string;
  type: string;
  description: string;
  userId: string;
}): Promise<void> {
  await notifyUser({
    userId: options.userId,
    type: NotificationType.EXCEPTION_REPORTED,
    title: 'Exception Reported',
    message: `Exception reported for order ${options.orderId}: ${options.type}`,
    priority: NotificationPriority.HIGH,
    data: {
      exceptionId: options.exceptionId,
      orderId: options.orderId,
      type: options.type,
      description: options.description,
    },
  });

  // Also notify supervisors
  await notifyAll({
    type: NotificationType.EXCEPTION_REPORTED,
    title: 'Exception Reported',
    message: `Exception ${options.exceptionId} reported by ${options.userId}`,
    priority: NotificationPriority.HIGH,
    data: {
      exceptionId: options.exceptionId,
      orderId: options.orderId,
      type: options.type,
    },
  });
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getNotificationType(
  priority?: NotificationPriority
): 'INFO' | 'WARNING' | 'ERROR' | 'SUCCESS' {
  if (
    !priority ||
    priority === NotificationPriority.NORMAL ||
    priority === NotificationPriority.LOW
  ) {
    return 'INFO';
  }
  if (priority === NotificationPriority.HIGH) {
    return 'WARNING';
  }
  if (priority === NotificationPriority.URGENT) {
    return 'ERROR';
  }
  return 'INFO';
}

/**
 * Get a user-friendly notification message from a template
 */
export function getNotificationMessage(type: NotificationType, data: Record<string, any>): string {
  const messages: Record<NotificationType, (data: any) => string> = {
    [NotificationType.ORDER_CLAIMED]: d => `Order ${d.orderId} has been claimed`,
    [NotificationType.ORDER_COMPLETED]: d => `Order ${d.orderId} picking completed`,
    [NotificationType.ORDER_CANCELLED]: d => `Order ${d.orderId} was cancelled`,
    [NotificationType.ORDER_BACKORDERED]: d => `Order ${d.orderId} has been backordered`,
    [NotificationType.ORDER_SHIPPED]: d => `Order ${d.orderId} has been shipped`,
    [NotificationType.ORDER_PACKED]: d => `Order ${d.orderId} has been packed`,
    [NotificationType.PICK_UPDATED]: d => `Pick updated for ${d.sku}`,
    [NotificationType.PICK_COMPLETED]: d => `Item ${d.sku} picking completed`,
    [NotificationType.INVENTORY_LOW]: d => `Low stock: ${d.sku} at ${d.binLocation}`,
    [NotificationType.INVENTORY_OUT]: d => `Out of stock: ${d.sku}`,
    [NotificationType.INVENTORY_REPLENISHED]: d => `Stock replenished: ${d.sku}`,
    [NotificationType.EXCEPTION_REPORTED]: d => `Exception ${d.exceptionId} reported`,
    [NotificationType.EXCEPTION_RESOLVED]: d => `Exception ${d.exceptionId} resolved`,
    [NotificationType.QUALITY_FAILED]: d => `Quality check failed for ${d.sku}`,
    [NotificationType.QUALITY_APPROVED]: d => `Quality check passed for ${d.sku}`,
    [NotificationType.ZONE_ASSIGNED]: d => `Zone ${d.zoneId} assignment updated`,
    [NotificationType.ZONE_UPDATED]: d => `Zone ${d.zoneId} status updated`,
    [NotificationType.WAVE_CREATED]: d => `Wave ${d.waveId} created`,
    [NotificationType.WAVE_COMPLETED]: d => `Wave ${d.waveId} completed`,
    [NotificationType.SYSTEM_ALERT]: d => d.message || 'System alert',
    [NotificationType.SYSTEM_ERROR]: d => d.message || 'System error occurred',
    [NotificationType.MAINTENANCE_REQUIRED]: d => `Maintenance required: ${d.equipment}`,
    [NotificationType.USER_LOGIN]: d => `User ${d.userId} logged in`,
    [NotificationType.USER_LOGOUT]: d => `User ${d.userId} logged out`,
    [NotificationType.ROLE_CHANGED]: d => `Role changed for user ${d.userId}`,
  };

  const messageFn = messages[type];
  return messageFn ? messageFn(data) : 'Notification';
}
