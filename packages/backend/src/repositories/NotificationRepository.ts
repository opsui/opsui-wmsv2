/**
 * @purpose: Notification repository - handles all database operations for notifications
 * @domain: Notifications
 * @tested: No tests yet (0% coverage)
 * @last-change: 2025-01-25 - Initial implementation
 * @dependencies: BaseRepository, pg, logger
 * @description: Manages notification persistence, preferences, templates, and queue
 * @invariants: All notifications have valid userId, type, and channel
 * @performance: Queries optimized with indexes on userId, type, status, channel
 * @security: User-scoped queries prevent cross-user notification access
 */

import { BaseRepository } from './BaseRepository';
import {
  Notification,
  NotificationPreferences,
  NotificationTemplate,
  NotificationQueue,
  CreateNotificationDTO,
  ListNotificationsParams,
  NotificationType,
  NotificationStatus,
  NotificationChannel,
  NotificationPriority,
  UpdateNotificationPreferencesDTO,
  NotificationStats,
} from '@opsui/shared';
import { query } from '../db/client';
import { logger } from '../config/logger';
import { NotFoundError } from '@opsui/shared';

// ============================================================================
// NOTIFICATION REPOSITORY
// ============================================================================

export class NotificationRepository extends BaseRepository<Notification> {
  constructor() {
    super('notifications', 'notification_id');
  }

  // --------------------------------------------------------------------------
  // CREATE NOTIFICATION
  // --------------------------------------------------------------------------

  async createNotification(dto: CreateNotificationDTO): Promise<Notification> {
    const notification = await this.insert({
      notificationId: crypto.randomUUID(),
      userId: dto.userId,
      type: dto.type,
      channel: dto.channel,
      title: dto.title,
      message: dto.message,
      data: dto.data || {},
      status: NotificationStatus.PENDING,
      priority: dto.priority || NotificationPriority.NORMAL,
      scheduledFor: dto.scheduledFor,
      createdAt: new Date(),
      updatedAt: new Date(),
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    } as any);

    logger.info('Notification created', {
      notificationId: notification.notificationId,
      userId: dto.userId,
      type: dto.type,
      channel: dto.channel,
    });

    return notification;
  }

  // --------------------------------------------------------------------------
  // LIST NOTIFICATIONS
  // --------------------------------------------------------------------------

  async listNotifications(
    userId: string,
    params: ListNotificationsParams = {}
  ): Promise<{ notifications: Notification[]; total: number }> {
    const conditions: string[] = ['n.user_id = $1'];
    const queryParams: any[] = [userId];
    let paramIndex = 2;

    if (params.type) {
      conditions.push(`n.type = $${paramIndex++}`);
      queryParams.push(params.type);
    }

    if (params.status) {
      conditions.push(`n.status = $${paramIndex++}`);
      queryParams.push(params.status);
    }

    if (params.channel) {
      conditions.push(`n.channel = $${paramIndex++}`);
      queryParams.push(params.channel);
    }

    if (params.unreadOnly) {
      conditions.push(`n.status IN ($${paramIndex++}, $${paramIndex++})`);
      queryParams.push(NotificationStatus.PENDING, NotificationStatus.SENT);
    }

    // Exclude expired notifications
    conditions.push(`n.expires_at > CURRENT_TIMESTAMP`);

    const whereClause = conditions.join(' AND ');
    const limit = params.limit || 50;
    const offset = params.offset || 0;

    // Get total count
    const countResult = await query(
      `SELECT COUNT(*) FROM notifications n WHERE ${whereClause}`,
      queryParams
    );
    const total = parseInt(countResult.rows[0].count, 10);

    // Get notifications
    const notificationsResult = await query<Notification>(
      `SELECT * FROM notifications n
       WHERE ${whereClause}
       ORDER BY n.created_at DESC
       LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
      [...queryParams, limit, offset]
    );

    return {
      notifications: notificationsResult.rows,
      total,
    };
  }

  // --------------------------------------------------------------------------
  // GET NOTIFICATION STATISTICS
  // --------------------------------------------------------------------------

  async getNotificationStats(userId: string): Promise<NotificationStats> {
    const result = await query(
      `SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status IN ('PENDING', 'SENT', 'DELIVERED')) as unread,
        COUNT(*) FILTER (WHERE type = 'ORDER_CLAIMED') as order_claimed,
        COUNT(*) FILTER (WHERE type = 'ORDER_COMPLETED') as order_completed,
        COUNT(*) FILTER (WHERE type = 'PICK_UPDATED') as pick_updated,
        COUNT(*) FILTER (WHERE type = 'INVENTORY_LOW') as inventory_low,
        COUNT(*) FILTER (WHERE type = 'EXCEPTION_REPORTED') as exception_reported,
        COUNT(*) FILTER (WHERE type = 'ZONE_ASSIGNED') as zone_assigned,
        COUNT(*) FILTER (WHERE type = 'WAVE_CREATED') as wave_created,
        COUNT(*) FILTER (WHERE type = 'SYSTEM_ALERT') as system_alert,
        COUNT(*) FILTER (WHERE channel = 'EMAIL') as email,
        COUNT(*) FILTER (WHERE channel = 'SMS') as sms,
        COUNT(*) FILTER (WHERE channel = 'PUSH') as push,
        COUNT(*) FILTER (WHERE channel = 'IN_APP') as in_app,
        COUNT(*) FILTER (WHERE status = 'PENDING') as pending,
        COUNT(*) FILTER (WHERE status = 'SENT') as sent,
        COUNT(*) FILTER (WHERE status = 'DELIVERED') as delivered,
        COUNT(*) FILTER (WHERE status = 'FAILED') as failed,
        COUNT(*) FILTER (WHERE status = 'READ') as read
       FROM notifications
       WHERE user_id = $1 AND expires_at > CURRENT_TIMESTAMP`,
      [userId]
    );

    const row = result.rows[0];

    return {
      total: parseInt(row.total, 10),
      unread: parseInt(row.unread, 10),
      byType: {
        [NotificationType.ORDER_CLAIMED]: parseInt(row.order_claimed, 10),
        [NotificationType.ORDER_COMPLETED]: parseInt(row.order_completed, 10),
        [NotificationType.PICK_UPDATED]: parseInt(row.pick_updated, 10),
        [NotificationType.INVENTORY_LOW]: parseInt(row.inventory_low, 10),
        [NotificationType.EXCEPTION_REPORTED]: parseInt(row.exception_reported, 10),
        [NotificationType.ZONE_ASSIGNED]: parseInt(row.zone_assigned, 10),
        [NotificationType.WAVE_CREATED]: parseInt(row.wave_created, 10),
        [NotificationType.SYSTEM_ALERT]: parseInt(row.system_alert, 10),
      },
      byChannel: {
        [NotificationChannel.EMAIL]: parseInt(row.email, 10),
        [NotificationChannel.SMS]: parseInt(row.sms, 10),
        [NotificationChannel.PUSH]: parseInt(row.push, 10),
        [NotificationChannel.IN_APP]: parseInt(row.in_app, 10),
        [NotificationChannel.BULK]: 0, // Bulk notifications are aggregated
      },
      byStatus: {
        [NotificationStatus.PENDING]: parseInt(row.pending, 10),
        [NotificationStatus.SENT]: parseInt(row.sent, 10),
        [NotificationStatus.DELIVERED]: parseInt(row.delivered, 10),
        [NotificationStatus.FAILED]: parseInt(row.failed, 10),
        [NotificationStatus.READ]: parseInt(row.read, 10),
      },
    };
  }

  // --------------------------------------------------------------------------
  // MARK AS READ
  // --------------------------------------------------------------------------

  async markAsRead(notificationId: string): Promise<Notification | null> {
    const result = await query<Notification>(
      `UPDATE notifications
       SET status = 'READ',
           read_at = CURRENT_TIMESTAMP,
           updated_at = CURRENT_TIMESTAMP
       WHERE notification_id = $1 AND status IN ('PENDING', 'SENT', 'DELIVERED')
       RETURNING *`,
      [notificationId]
    );

    if (result.rows[0]) {
      logger.info('Notification marked as read', { notificationId });
    }

    return result.rows[0] || null;
  }

  async markAllAsRead(userId: string): Promise<number> {
    const result = await query(
      `UPDATE notifications
       SET status = 'READ',
           read_at = CURRENT_TIMESTAMP,
           updated_at = CURRENT_TIMESTAMP
       WHERE user_id = $1
         AND status IN ('PENDING', 'SENT', 'DELIVERED')
         AND expires_at > CURRENT_TIMESTAMP
       RETURNING notification_id`,
      [userId]
    );

    logger.info('All notifications marked as read', {
      userId,
      count: result.rowCount || 0,
    });

    return result.rowCount || 0;
  }

  // --------------------------------------------------------------------------
  // UPDATE NOTIFICATION STATUS
  // --------------------------------------------------------------------------

  async updateStatus(
    notificationId: string,
    status: NotificationStatus,
    externalId?: string,
    errorMessage?: string
  ): Promise<Notification | null> {
    const updates: string[] = ['status = $2', 'updated_at = CURRENT_TIMESTAMP'];
    const values: any[] = [notificationId, status];
    let paramIndex = 3;

    if (status === NotificationStatus.SENT && !updates.includes('sent_at')) {
      updates.push(`sent_at = CURRENT_TIMESTAMP`);
    }

    if (status === NotificationStatus.DELIVERED) {
      updates.push(`delivered_at = CURRENT_TIMESTAMP`);
    }

    if (status === NotificationStatus.FAILED) {
      updates.push(`failed_at = CURRENT_TIMESTAMP`);
      if (errorMessage) {
        updates.push(`error_message = $${paramIndex++}`);
        values.push(errorMessage);
      }
    }

    if (externalId) {
      // Determine which external ID field to update based on channel
      // This is handled at service level
    }

    const result = await query<Notification>(
      `UPDATE notifications
       SET ${updates.join(', ')}
       WHERE notification_id = $1
       RETURNING *`,
      values
    );

    return result.rows[0] || null;
  }

  // --------------------------------------------------------------------------
  // DELETE NOTIFICATION
  // --------------------------------------------------------------------------

  async deleteNotification(notificationId: string, userId: string): Promise<boolean> {
    const result = await query(
      `DELETE FROM notifications
       WHERE notification_id = $1 AND user_id = $2
       RETURNING notification_id`,
      [notificationId, userId]
    );

    return (result.rowCount || 0) > 0;
  }

  // --------------------------------------------------------------------------
  // CLEANUP EXPIRED NOTIFICATIONS
  // --------------------------------------------------------------------------

  async cleanupExpired(): Promise<number> {
    const result = await query(
      `DELETE FROM notifications
       WHERE expires_at < CURRENT_TIMESTAMP
       RETURNING notification_id`
    );

    const count = result.rowCount || 0;
    if (count > 0) {
      logger.info('Expired notifications cleaned up', { count });
    }

    return count;
  }

  // --------------------------------------------------------------------------
  // NOTIFICATION PREFERENCES
  // --------------------------------------------------------------------------

  async getPreferences(userId: string): Promise<NotificationPreferences | null> {
    const result = await query<NotificationPreferences>(
      `SELECT * FROM notification_preferences WHERE user_id = $1`,
      [userId]
    );

    return result.rows[0] || null;
  }

  async createDefaultPreferences(userId: string): Promise<NotificationPreferences> {
    const result = await query<NotificationPreferences>(
      `INSERT INTO notification_preferences (user_id, email_enabled, sms_enabled, push_enabled, in_app_enabled, quiet_hours_enabled, type_preferences)
       VALUES ($1, true, false, true, true, false, '{}')
       RETURNING *`,
      [userId]
    );

    return result.rows[0];
  }

  async updatePreferences(
    userId: string,
    dto: UpdateNotificationPreferencesDTO
  ): Promise<NotificationPreferences> {
    // Check if preferences exist
    const existing = await this.getPreferences(userId);

    if (!existing) {
      return this.createDefaultPreferences(userId);
    }

    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (dto.emailEnabled !== undefined) {
      updates.push(`email_enabled = $${paramIndex++}`);
      values.push(dto.emailEnabled);
    }
    if (dto.smsEnabled !== undefined) {
      updates.push(`sms_enabled = $${paramIndex++}`);
      values.push(dto.smsEnabled);
    }
    if (dto.pushEnabled !== undefined) {
      updates.push(`push_enabled = $${paramIndex++}`);
      values.push(dto.pushEnabled);
    }
    if (dto.inAppEnabled !== undefined) {
      updates.push(`in_app_enabled = $${paramIndex++}`);
      values.push(dto.inAppEnabled);
    }
    if (dto.quietHoursEnabled !== undefined) {
      updates.push(`quiet_hours_enabled = $${paramIndex++}`);
      values.push(dto.quietHoursEnabled);
    }
    if (dto.quietHoursStart !== undefined) {
      updates.push(`quiet_hours_start = $${paramIndex++}`);
      values.push(dto.quietHoursStart);
    }
    if (dto.quietHoursEnd !== undefined) {
      updates.push(`quiet_hours_end = $${paramIndex++}`);
      values.push(dto.quietHoursEnd);
    }
    if (dto.quietHoursTimezone !== undefined) {
      updates.push(`quiet_hours_timezone = $${paramIndex++}`);
      values.push(dto.quietHoursTimezone);
    }
    if (dto.smsPhone !== undefined) {
      updates.push(`sms_phone = $${paramIndex++}`);
      values.push(dto.smsPhone);
    }
    if (dto.typePreferences !== undefined) {
      updates.push(`type_preferences = $${paramIndex++}`);
      values.push(JSON.stringify(dto.typePreferences));
    }
    if (dto.pushSubscription !== undefined) {
      updates.push(`push_subscription = $${paramIndex++}`);
      values.push(JSON.stringify(dto.pushSubscription));
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(userId);

    const result = await query<NotificationPreferences>(
      `UPDATE notification_preferences
       SET ${updates.join(', ')}
       WHERE user_id = $${paramIndex}
       RETURNING *`,
      values
    );

    return result.rows[0];
  }

  async updatePushSubscription(
    userId: string,
    pushSubscription: any
  ): Promise<NotificationPreferences> {
    // Check if preferences exist
    const existing = await this.getPreferences(userId);

    if (!existing) {
      const result = await query<NotificationPreferences>(
        `INSERT INTO notification_preferences (user_id, push_subscription, email_enabled, sms_enabled, push_enabled, in_app_enabled, quiet_hours_enabled, type_preferences)
         VALUES ($1, $2, true, false, true, true, false, '{}')
         RETURNING *`,
        [userId, JSON.stringify(pushSubscription)]
      );
      return result.rows[0];
    }

    const result = await query<NotificationPreferences>(
      `UPDATE notification_preferences
       SET push_subscription = $2,
           push_enabled = true,
           updated_at = CURRENT_TIMESTAMP
       WHERE user_id = $1
       RETURNING *`,
      [userId, JSON.stringify(pushSubscription)]
    );

    return result.rows[0];
  }

  async removePushSubscription(userId: string): Promise<NotificationPreferences | null> {
    const existing = await this.getPreferences(userId);

    if (!existing) {
      return null;
    }

    const result = await query<NotificationPreferences>(
      `UPDATE notification_preferences
       SET push_subscription = NULL,
           push_enabled = false,
           updated_at = CURRENT_TIMESTAMP
       WHERE user_id = $1
       RETURNING *`,
      [userId]
    );

    return result.rows[0] || null;
  }

  // --------------------------------------------------------------------------
  // NOTIFICATION TEMPLATES
  // --------------------------------------------------------------------------

  async getTemplateByName(name: string): Promise<NotificationTemplate | null> {
    const result = await query<NotificationTemplate>(
      `SELECT * FROM notification_templates WHERE name = $1 AND is_active = true`,
      [name]
    );

    return result.rows[0] || null;
  }

  async getTemplatesByType(type: NotificationType): Promise<NotificationTemplate[]> {
    const result = await query<NotificationTemplate>(
      `SELECT * FROM notification_templates
       WHERE type = $1 AND is_active = true
       ORDER BY name ASC`,
      [type]
    );

    return result.rows;
  }

  // --------------------------------------------------------------------------
  // NOTIFICATION QUEUE
  // --------------------------------------------------------------------------

  async enqueueJob(
    jobType: string,
    payload: Record<string, any>,
    priority: number = 5
  ): Promise<NotificationQueue> {
    const result = await query<NotificationQueue>(
      `INSERT INTO notification_queue (queue_id, job_type, payload, status, priority, max_attempts)
       VALUES ($1, $2, $3, 'PENDING', $4, 3)
       RETURNING *`,
      [crypto.randomUUID(), jobType, JSON.stringify(payload), priority]
    );

    return result.rows[0];
  }

  async getNextPendingJobs(limit: number = 10): Promise<NotificationQueue[]> {
    const result = await query<NotificationQueue>(
      `SELECT * FROM notification_queue_pending_view
       LIMIT $1`,
      [limit]
    );

    return result.rows;
  }

  async updateQueueJob(
    queueId: string,
    status: string,
    errorMessage?: string
  ): Promise<NotificationQueue | null> {
    const updates: string[] = [`status = $2`];
    const values: any[] = [queueId, status];
    let paramIndex = 3;

    if (status === 'PROCESSING') {
      updates.push(`started_at = CURRENT_TIMESTAMP`);
    }
    if (status === 'COMPLETED') {
      updates.push(`completed_at = CURRENT_TIMESTAMP`);
    }
    if (status === 'FAILED') {
      updates.push(`failed_at = CURRENT_TIMESTAMP`);
      if (errorMessage) {
        updates.push(`error_message = $${paramIndex++}`);
        values.push(errorMessage);
      }
      updates.push(`last_error_at = CURRENT_TIMESTAMP`);
    }
    if (status === 'RETRYING') {
      updates.push(`attempts = attempts + 1`);
      updates.push(`next_retry_at = CURRENT_TIMESTAMP + INTERVAL '1 minute' * attempts`);
    }

    const result = await query<NotificationQueue>(
      `UPDATE notification_queue
       SET ${updates.join(', ')}
       WHERE queue_id = $1
       RETURNING *`,
      values
    );

    return result.rows[0] || null;
  }

  async deleteCompletedJobs(): Promise<number> {
    const result = await query(
      `DELETE FROM notification_queue
       WHERE status = 'COMPLETED'
         AND completed_at < CURRENT_TIMESTAMP - INTERVAL '7 days'
       RETURNING queue_id`
    );

    return result.rowCount || 0;
  }
}

// Singleton instance

export const notificationRepository = new NotificationRepository();
