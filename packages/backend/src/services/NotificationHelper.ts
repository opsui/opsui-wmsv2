/**
 * NotificationHelper Service
 * Provides notification functionality for various warehouse operations
 */

export enum NotificationType {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  SUCCESS = 'success',
  // Specific notification types
  EXCEPTION_REPORTED = 'exception_reported',
  QUALITY_FAILED = 'quality_failed',
  QUALITY_APPROVED = 'quality_approved',
  ORDER_SHIPPED = 'order_shipped',
  WAVE_CREATED = 'wave_created',
  WAVE_COMPLETED = 'wave_completed',
  ZONE_ASSIGNED = 'zone_assigned',
}

export enum NotificationPriority {
  LOW = 'low',
  NORMAL = 'normal',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent',
}

export interface NotificationMessage {
  type: NotificationType | string;
  priority: NotificationPriority | string;
  title: string;
  message: string;
  timestamp?: Date;
  userId?: string;
  data?: unknown;
  exceptionId?: string;
  orderId?: string;
  description?: string;
}

/**
 * Send a notification to a specific user
 */
export async function notifyUser(
  notification: NotificationMessage & { userId: string }
): Promise<void> {
  console.log(`[Notification] User: ${notification.userId}`);
}

/**
 * Send a notification to all relevant users
 */
export async function notifyAll(notification: NotificationMessage): Promise<void> {
  console.log(`[Broadcast Notification] ${notification.title}`);
}

/**
 * Broadcast an event to all connected clients
 */
export async function broadcastEvent(event: string, _data: unknown): Promise<void> {
  console.log(`[Broadcast Event] ${event}`);
}

/**
 * Send exception notification
 */
export async function notifyExceptionReported(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  notification: any
): Promise<void> {
  await notifyAll({
    type: NotificationType.EXCEPTION_REPORTED,
    priority: NotificationPriority.HIGH,
    title: `Order Exception: ${notification.orderId || 'N/A'}`,
    message: notification.description || 'No description provided',
    data: notification,
  });
}
