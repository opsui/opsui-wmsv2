/**
 * Notification Service
 *
 * Handles creation, delivery, and management of user notifications
 * Supports multiple channels: EMAIL, SMS, PUSH, IN_APP
 */

import { query } from '../db/client';
import { logger } from '../config/logger';
import wsServer from '../websocket';
import type { NotificationEvent } from '../websocket/broadcaster';
import { EmailProvider } from './EmailProvider';
import { SMSProvider } from './SMSProvider';
import { PushProvider } from './PushProvider';
import config from '../config';

// ============================================================================
// TYPES
// ============================================================================

export interface Notification {
  notificationId: string;
  userId: string;
  type: string;
  channel: 'EMAIL' | 'SMS' | 'PUSH' | 'IN_APP';
  title: string;
  message: string;
  status: 'PENDING' | 'SENT' | 'DELIVERED' | 'FAILED' | 'READ';
  priority?: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  data?: Record<string, any>;
  scheduledFor?: Date;
  createdAt: Date;
  readAt?: Date;
  sentAt?: Date;
  deliveredAt?: Date;
  failedAt?: Date;
  errorMessage?: string;
}

export interface NotificationPreference {
  userId: string;
  emailEnabled?: boolean;
  smsEnabled?: boolean;
  pushEnabled?: boolean;
  inAppEnabled?: boolean;
  quietHoursEnabled?: boolean;
  quietHoursStart?: string;
  quietHoursEnd?: string;
  quietHoursTimezone?: string;
  smsPhone?: string;
  typePreferences?: Record<
    string,
    {
      email: boolean;
      sms: boolean;
      push: boolean;
      inApp: boolean;
    }
  >;
}

export interface SendNotificationInput {
  userId: string;
  type: string;
  channel: 'EMAIL' | 'SMS' | 'PUSH' | 'IN_APP';
  title: string;
  message: string;
  data?: Record<string, any>;
  priority?: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  scheduledFor?: Date;
}

export interface BulkSendInput {
  userIds: string[];
  type: string;
  channels: string[];
  title: string;
  message: string;
  data?: Record<string, any>;
  priority?: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
}

// ============================================================================
// NOTIFICATION SERVICE
// ============================================================================

export class NotificationService {
  private emailProvider: EmailProvider | null = null;
  private smsProvider: SMSProvider | null = null;
  private pushProvider: PushProvider | null = null;

  constructor() {
    // Initialize Email provider if configured
    if (
      config.email.sendgrid.apiKey ||
      config.email.postmark.apiKey ||
      config.email.ses.accessKeyId
    ) {
      try {
        this.emailProvider = new EmailProvider(config.email);
        logger.info('Email provider initialized');
      } catch (error) {
        logger.warn('Failed to initialize email provider', { error });
      }
    }

    // Initialize SMS provider if configured
    if (config.sms.accountSid && config.sms.authToken) {
      try {
        this.smsProvider = new SMSProvider({
          accountSid: config.sms.accountSid,
          authToken: config.sms.authToken,
          from: config.sms.from,
          rateLimitPerSecond: config.sms.rateLimitPerSecond,
        });
        logger.info('SMS provider initialized');
      } catch (error) {
        logger.warn('Failed to initialize SMS provider', { error });
      }
    }

    // Initialize Push provider if configured
    if (config.push.vapidPrivateKey && config.push.vapidPublicKey) {
      try {
        this.pushProvider = new PushProvider({
          vapidPublicKey: config.push.vapidPublicKey,
          vapidPrivateKey: config.push.vapidPrivateKey,
          vapidSubject: config.push.vapidSubject,
        });
        logger.info('Push provider initialized');
      } catch (error) {
        logger.warn('Failed to initialize push provider', { error });
      }
    }
  }
  /**
   * Get notifications for a user
   */
  async getNotifications(
    userId: string,
    options: {
      type?: string;
      status?: string;
      channel?: string;
      unreadOnly?: boolean;
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<{ notifications: Notification[]; total: number }> {
    const { type, status, channel, unreadOnly, limit = 50, offset = 0 } = options;

    let queryText = `
      SELECT
        notification_id as "notificationId",
        user_id as "userId",
        type,
        channel,
        title,
        message,
        status,
        created_at as "createdAt",
        read_at as "readAt"
      FROM notifications
      WHERE user_id = $1
    `;
    const params: any[] = [userId];
    let paramIndex = 2;

    if (type) {
      queryText += ` AND type = $${paramIndex++}`;
      params.push(type);
    }
    if (status) {
      queryText += ` AND status = $${paramIndex++}`;
      params.push(status);
    }
    if (channel) {
      queryText += ` AND channel = $${paramIndex++}`;
      params.push(channel);
    }
    if (unreadOnly) {
      queryText += ` AND read_at IS NULL`;
    }

    queryText += ` ORDER BY created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex}`;
    params.push(limit, offset);

    const result = await query(queryText, params);

    // Get total count
    let countQuery = `
      SELECT COUNT(*) as count
      FROM notifications
      WHERE user_id = $1
    `;
    const countParams: any[] = [userId];
    paramIndex = 2;

    if (type) {
      countQuery += ` AND type = $${paramIndex++}`;
      countParams.push(type);
    }
    if (status) {
      countQuery += ` AND status = $${paramIndex++}`;
      countParams.push(status);
    }
    if (channel) {
      countQuery += ` AND channel = $${paramIndex++}`;
      countParams.push(channel);
    }
    if (unreadOnly) {
      countQuery += ` AND read_at IS NULL`;
    }

    const countResult = await query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].count, 10);

    return {
      notifications: result.rows as any,
      total,
    };
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: string, userId: string): Promise<boolean> {
    const result = await query(
      `UPDATE notifications
       SET read_at = NOW(), status = 'READ'
       WHERE notification_id = $1 AND user_id = $2
       RETURNING notification_id`,
      [notificationId, userId]
    );
    return result.rows.length > 0;
  }

  /**
   * Mark all notifications as read for a user
   */
  async markAllAsRead(userId: string): Promise<number> {
    const result = await query(
      `UPDATE notifications
       SET read_at = NOW(), status = 'READ'
       WHERE user_id = $1 AND read_at IS NULL
       RETURNING notification_id`,
      [userId]
    );
    return result.rows.length;
  }

  /**
   * Delete a notification
   */
  async deleteNotification(notificationId: string, userId: string): Promise<boolean> {
    const result = await query(
      `DELETE FROM notifications WHERE notification_id = $1 AND user_id = $2 RETURNING notification_id`,
      [notificationId, userId]
    );
    return result.rows.length > 0;
  }

  /**
   * Get notification preferences for a user
   */
  async getNotificationPreferences(userId: string): Promise<NotificationPreference | null> {
    const result = await query(
      `SELECT
        user_id as "userId",
        type,
        email_enabled as "email",
        sms_enabled as "sms",
        push_enabled as "push",
        in_app_enabled as "inApp",
        quiet_hours_enabled as "quietHoursEnabled",
        quiet_hours_start as "quietHoursStart",
        quiet_hours_end as "quietHoursEnd"
      FROM notification_preferences
      WHERE user_id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      userId: row.userId,
      emailEnabled: row.email,
      smsEnabled: row.sms,
      pushEnabled: row.push,
      inAppEnabled: row.inApp,
      quietHoursEnabled: row.quietHoursEnabled,
      quietHoursStart: row.quietHoursStart,
      quietHoursEnd: row.quietHoursEnd,
    };
  }

  /**
   * Update notification preferences for a user
   */
  async updateNotificationPreferences(
    userId: string,
    preferences: Partial<NotificationPreference>
  ): Promise<void> {
    // This is a stub - implement full logic when needed
    console.log('[NotificationService] Update preferences stub called:', userId, preferences);
  }

  /**
   * Get notification stats for a user
   */
  async getNotificationStats(userId: string): Promise<{
    total: number;
    unread: number;
    byType: Record<string, number>;
  }> {
    const result = await query(
      `SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE read_at IS NULL) as unread
      FROM notifications
      WHERE user_id = $1`,
      [userId]
    );

    const stats = {
      total: parseInt(result.rows[0].total, 10) || 0,
      unread: parseInt(result.rows[0].unread, 10) || 0,
      byType: {} as Record<string, number>,
    };

    // Get counts by type
    const typeResult = await query(
      `SELECT type, COUNT(*) as count
       FROM notifications
       WHERE user_id = $1
       GROUP BY type`,
      [userId]
    );

    typeResult.rows.forEach(row => {
      stats.byType[row.type] = parseInt(row.count, 10);
    });

    return stats;
  }

  // ========================================================================
  // SEND NOTIFICATION
  // ========================================================================

  /**
   * Send a notification to a user
   */
  async sendNotification(input: SendNotificationInput): Promise<{
    success: boolean;
    notification?: Notification;
    error?: string;
  }> {
    try {
      const notificationId = `NOTIF-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      // Insert notification into database
      const result = await query(
        `INSERT INTO notifications
          (notification_id, user_id, type, channel, title, message, status,
           priority, data, scheduled_for, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, 'PENDING', $7, $8, $9, NOW())
         RETURNING *`,
        [
          notificationId,
          input.userId,
          input.type,
          input.channel,
          input.title,
          input.message,
          input.priority || 'NORMAL',
          input.data ? JSON.stringify(input.data) : null,
          input.scheduledFor || null,
        ]
      );

      const notification = this.mapRowToNotification(result.rows[0]);

      // Send immediately if not scheduled
      if (!input.scheduledFor || input.scheduledFor <= new Date()) {
        await this.deliverNotification(notification);
      }

      logger.info('Notification sent', { notificationId, userId: input.userId, type: input.type });

      return { success: true, notification };
    } catch (error) {
      logger.error('Failed to send notification', { error, input });
      return { success: false, error: (error as Error).message };
    }
  }

  /**
   * Send bulk notifications to multiple users
   */
  async bulkSend(input: BulkSendInput): Promise<{
    success: boolean;
    sent: number;
    failed: number;
    errors: string[];
  }> {
    const results = {
      success: true,
      sent: 0,
      failed: 0,
      errors: [] as string[],
    };

    // Send to each user via each channel
    for (const userId of input.userIds) {
      for (const channel of input.channels) {
        const result = await this.sendNotification({
          userId,
          type: input.type,
          channel: channel as any,
          title: input.title,
          message: input.message,
          data: input.data,
          priority: input.priority,
        });

        if (result.success) {
          results.sent++;
        } else {
          results.failed++;
          results.errors.push(`${userId}: ${result.error}`);
        }
      }
    }

    results.success = results.failed === 0;
    return results;
  }

  /**
   * Send notification from template
   */
  async sendFromTemplate(
    userId: string,
    templateName: string,
    variables: Record<string, any>
  ): Promise<{
    success: boolean;
    notification?: Notification;
    error?: string;
  }> {
    try {
      // Get template
      const templateResult = await query(
        `SELECT * FROM notification_templates WHERE template_name = $1`,
        [templateName]
      );

      if (templateResult.rows.length === 0) {
        return { success: false, error: 'Template not found' };
      }

      const template = templateResult.rows[0];

      // Replace variables in title and message
      const title = this.replaceVariables(template.title, variables);
      const message = this.replaceVariables(template.message, variables);

      // Get user's notification preferences for this type
      const preferences = await this.getPreferences(userId);
      const channelPreferences = preferences?.typePreferences?.[template.type];

      // Determine which channels to use
      const channels: ('EMAIL' | 'SMS' | 'PUSH' | 'IN_APP')[] = [];
      if (channelPreferences) {
        if (channelPreferences.email && preferences.emailEnabled) channels.push('EMAIL');
        if (channelPreferences.sms && preferences.smsEnabled) channels.push('SMS');
        if (channelPreferences.push && preferences.pushEnabled) channels.push('PUSH');
        if (channelPreferences.inApp && preferences.inAppEnabled) channels.push('IN_APP');
      } else {
        // Use default in-app if no preferences set
        channels.push('IN_APP');
      }

      // Send via all applicable channels
      for (const channel of channels) {
        await this.sendNotification({
          userId,
          type: template.type,
          channel,
          title,
          message,
          data: variables,
          priority: template.priority,
        });
      }

      return { success: true };
    } catch (error) {
      logger.error('Failed to send from template', { error, userId, templateName });
      return { success: false, error: (error as Error).message };
    }
  }

  /**
   * List notifications with filters (alias for getNotifications)
   */
  async listNotifications(
    userId: string,
    options: {
      type?: string;
      status?: string;
      channel?: string;
      unreadOnly?: boolean;
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<{ notifications: Notification[]; total: number }> {
    return this.getNotifications(userId, options);
  }

  /**
   * Get notification preferences
   */
  async getPreferences(userId: string): Promise<NotificationPreference | null> {
    const result = await query(
      `SELECT
        user_id as "userId",
        email_enabled as "emailEnabled",
        sms_enabled as "smsEnabled",
        push_enabled as "pushEnabled",
        in_app_enabled as "inAppEnabled",
        quiet_hours_enabled as "quietHoursEnabled",
        quiet_hours_start as "quietHoursStart",
        quiet_hours_end as "quietHoursEnd",
        quiet_hours_timezone as "quietHoursTimezone",
        sms_phone as "smsPhone",
        type_preferences as "typePreferences"
       FROM notification_preferences
       WHERE user_id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      // Return default preferences
      return {
        userId,
        emailEnabled: false,
        smsEnabled: false,
        pushEnabled: false,
        inAppEnabled: true,
        quietHoursEnabled: false,
        typePreferences: {},
      };
    }

    const row = result.rows[0];
    return {
      userId: row.userId,
      emailEnabled: row.emailEnabled ?? false,
      smsEnabled: row.smsEnabled ?? false,
      pushEnabled: row.pushEnabled ?? false,
      inAppEnabled: row.inAppEnabled ?? true,
      quietHoursEnabled: row.quietHoursEnabled ?? false,
      quietHoursStart: row.quietHoursStart,
      quietHoursEnd: row.quietHoursEnd,
      quietHoursTimezone: row.quietHoursTimezone,
      smsPhone: row.smsPhone,
      typePreferences: row.typePreferences || {},
    };
  }

  /**
   * Update notification preferences
   */
  async updatePreferences(
    userId: string,
    preferences: Partial<NotificationPreference>
  ): Promise<NotificationPreference> {
    // Check if preferences exist
    const existing = await query(
      'SELECT user_id FROM notification_preferences WHERE user_id = $1',
      [userId]
    );

    const updateData: any = {
      emailEnabled: preferences.emailEnabled,
      smsEnabled: preferences.smsEnabled,
      pushEnabled: preferences.pushEnabled,
      inAppEnabled: preferences.inAppEnabled,
      quietHoursEnabled: preferences.quietHoursEnabled,
      quietHoursStart: preferences.quietHoursStart,
      quietHoursEnd: preferences.quietHoursEnd,
      quietHoursTimezone: preferences.quietHoursTimezone,
      smsPhone: preferences.smsPhone,
      typePreferences: preferences.typePreferences,
    };

    if (existing.rows.length === 0) {
      // Insert new preferences
      await query(
        `INSERT INTO notification_preferences
          (user_id, email_enabled, sms_enabled, push_enabled, in_app_enabled,
           quiet_hours_enabled, quiet_hours_start, quiet_hours_end,
           quiet_hours_timezone, sms_phone, type_preferences)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [
          userId,
          updateData.emailEnabled ?? false,
          updateData.smsEnabled ?? false,
          updateData.pushEnabled ?? false,
          updateData.inAppEnabled ?? true,
          updateData.quietHoursEnabled ?? false,
          updateData.quietHoursStart ?? null,
          updateData.quietHoursEnd ?? null,
          updateData.quietHoursTimezone ?? null,
          updateData.smsPhone ?? null,
          updateData.typePreferences ? JSON.stringify(updateData.typePreferences) : null,
        ]
      );
    } else {
      // Update existing preferences
      const sets: string[] = [];
      const values: any[] = [];
      let paramIndex = 2;

      Object.entries(updateData).forEach(([key, value]) => {
        if (value !== undefined) {
          sets.push(`${this.camelToSnake(key)} = $${paramIndex++}`);
          values.push(typeof value === 'object' ? JSON.stringify(value) : value);
        }
      });

      if (sets.length > 0) {
        values.push(userId);
        await query(
          `UPDATE notification_preferences SET ${sets.join(', ')} WHERE user_id = $${paramIndex}`,
          values
        );
      }
    }

    logger.info('Notification preferences updated', { userId, preferences });
    return (await this.getPreferences(userId))!;
  }

  // ========================================================================
  // PRIVATE HELPER METHODS
  // ========================================================================

  /**
   * Deliver notification via appropriate channel
   */
  private async deliverNotification(notification: Notification): Promise<void> {
    const broadcaster = wsServer.getBroadcaster();
    if (!broadcaster) {
      logger.warn('WebSocket broadcaster not available');
      return;
    }

    try {
      // Update status to SENT
      await query(
        `UPDATE notifications
         SET status = 'SENT', sent_at = NOW()
         WHERE notification_id = $1`,
        [notification.notificationId]
      );

      // For IN_APP notifications, send via WebSocket
      if (notification.channel === 'IN_APP') {
        const wsEvent: NotificationEvent = {
          notificationId: notification.notificationId,
          userId: notification.userId,
          title: notification.title,
          message: notification.message,
          type: this.getNotificationType(notification.type),
          createdAt: notification.createdAt,
        };

        broadcaster.broadcastNotification(wsEvent);

        // Update status to DELIVERED
        await query(
          `UPDATE notifications
           SET status = 'DELIVERED', delivered_at = NOW()
           WHERE notification_id = $1`,
          [notification.notificationId]
        );
      }

      // TODO: Implement actual email, SMS, and push delivery
      // For now, just log
      if (notification.channel === 'EMAIL') {
        if (this.emailProvider) {
          const result = await this.emailProvider.sendEmail({
            to: notification.userId, // Would need to resolve email from userId
            subject: notification.title,
            text: notification.message,
            html: `<p>${notification.message}</p>`,
          });
          if (result.success) {
            logger.info('Email notification sent successfully', {
              notificationId: notification.notificationId,
              messageId: result.messageId,
            });
          } else {
            throw new Error(result.error || 'Failed to send email');
          }
        } else {
          logger.warn('Email notification requested but provider not configured', { notification });
        }
      } else if (notification.channel === 'SMS') {
        if (this.smsProvider) {
          // Would need to resolve phone number from userId
          const result = await this.smsProvider.sendSMS({
            to: '+1234567890', // Placeholder - would resolve from user
            message: `${notification.title}: ${notification.message}`,
          });
          if (result.success) {
            logger.info('SMS notification sent successfully', {
              notificationId: notification.notificationId,
              messageId: result.messageId,
            });
          } else {
            throw new Error(result.error || 'Failed to send SMS');
          }
        } else {
          logger.warn('SMS notification requested but provider not configured', { notification });
        }
      } else if (notification.channel === 'PUSH') {
        if (this.pushProvider) {
          // Would need to resolve push subscription from userId
          const result = await this.pushProvider.sendPush({
            userId: notification.userId,
            title: notification.title,
            message: notification.message,
            data: notification.data,
          });
          if (result.success) {
            logger.info('Push notification sent successfully', {
              notificationId: notification.notificationId,
              messageId: result.messageId,
            });
          } else {
            throw new Error(result.error || 'Failed to send push notification');
          }
        } else {
          logger.warn('Push notification requested but provider not configured', { notification });
        }
      }
    } catch (error) {
      logger.error('Failed to deliver notification', {
        error,
        notificationId: notification.notificationId,
      });

      // Update status to FAILED
      await query(
        `UPDATE notifications
         SET status = 'FAILED', failed_at = NOW(), error_message = $1
         WHERE notification_id = $2`,
        [(error as Error).message, notification.notificationId]
      );
    }
  }

  /**
   * Map database row to Notification object
   */
  private mapRowToNotification(row: any): Notification {
    return {
      notificationId: row.notification_id,
      userId: row.user_id,
      type: row.type,
      channel: row.channel,
      title: row.title,
      message: row.message,
      status: row.status,
      priority: row.priority,
      data: row.data ? JSON.parse(row.data) : undefined,
      scheduledFor: row.scheduled_for,
      createdAt: row.created_at,
      readAt: row.read_at,
      sentAt: row.sent_at,
      deliveredAt: row.delivered_at,
      failedAt: row.failed_at,
      errorMessage: row.error_message,
    };
  }

  /**
   * Replace variables in template string
   */
  private replaceVariables(template: string, variables: Record<string, any>): string {
    return template.replace(/\{\{(\w+)\}\}/g, (_, key) => {
      return variables[key] !== undefined ? String(variables[key]) : `{{${key}}}`;
    });
  }

  /**
   * Convert camelCase to snake_case
   */
  private camelToSnake(str: string): string {
    return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
  }

  /**
   * Map notification type string to NotificationEvent type
   */
  private getNotificationType(type: string): 'INFO' | 'WARNING' | 'ERROR' | 'SUCCESS' {
    const warningTypes = ['INVENTORY_LOW', 'EXCEPTION_REPORTED', 'ORDER_BACKORDERED'];
    const errorTypes = ['QUALITY_FAILED', 'SYSTEM_ERROR'];
    const successTypes = ['ORDER_COMPLETED', 'ORDER_SHIPPED', 'QUALITY_APPROVED'];

    if (warningTypes.includes(type)) return 'WARNING';
    if (errorTypes.includes(type)) return 'ERROR';
    if (successTypes.includes(type)) return 'SUCCESS';
    return 'INFO';
  }
}

// Export singleton instance
export const notificationService = new NotificationService();
