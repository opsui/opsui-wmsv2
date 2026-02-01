/**
 * Notification routes
 *
 * Provides endpoints for managing user notifications
 */

import { Router } from 'express';
import { notificationService } from '../services/NotificationService';
import { asyncHandler, authenticate } from '../middleware';
import { requirePermission } from '../middleware/permissions';
import { AuthenticatedRequest } from '../middleware/auth';
import { Permission } from '@opsui/shared';

const router = Router();

/**
 * GET /api/notifications
 * Get current user's notifications
 */
router.get(
  '/',
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const userId = req.user!.userId;
    const type = req.query.type as string | undefined;
    const status = req.query.status as string | undefined;
    const channel = req.query.channel as string | undefined;
    const unreadOnly = req.query.unreadOnly === 'true';
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
    const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;

    const result = await notificationService.listNotifications(userId, {
      type: type as any,
      status: status as any,
      channel: channel as any,
      unreadOnly,
      limit,
      offset,
    });

    res.json(result);
  })
);

/**
 * GET /api/notifications/stats
 * Get notification statistics for current user
 */
router.get(
  '/stats',
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const userId = req.user!.userId;
    const stats = await notificationService.getNotificationStats(userId);
    res.json(stats);
  })
);

/**
 * GET /api/notifications/:id
 * Get a specific notification
 */
router.get(
  '/:id',
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const notificationId = req.params.id;
    const userId = req.user!.userId;

    // Get notifications and filter by ID and user ownership
    const result = await notificationService.listNotifications(userId, {
      limit: 1000,
    });

    const notification = result.notifications.find(n => n.notificationId === notificationId);

    if (!notification) {
      res.status(404).json({
        error: 'Notification not found',
        code: 'NOT_FOUND',
      });
      return;
    }

    res.json(notification);
  })
);

/**
 * PUT /api/notifications/:id/read
 * Mark a notification as read
 */
router.put(
  '/:id/read',
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const notificationId = req.params.id;
    const userId = req.user!.userId;

    const success = await notificationService.markAsRead(notificationId, userId);

    if (!success) {
      res.status(404).json({
        error: 'Notification not found',
        code: 'NOT_FOUND',
      });
      return;
    }

    res.json({ success: true });
  })
);

/**
 * PUT /api/notifications/read-all
 * Mark all notifications as read for current user
 */
router.put(
  '/read-all',
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const userId = req.user!.userId;
    const count = await notificationService.markAllAsRead(userId);
    res.json({ count, success: true });
  })
);

/**
 * DELETE /api/notifications/:id
 * Delete a notification
 */
router.delete(
  '/:id',
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const notificationId = req.params.id;
    const userId = req.user!.userId;

    const success = await notificationService.deleteNotification(notificationId, userId);

    if (!success) {
      res.status(404).json({
        error: 'Notification not found',
        code: 'NOT_FOUND',
      });
      return;
    }

    res.json({ success: true });
  })
);

/**
 * POST /api/notifications/send
 * Send a notification (admin only)
 */
router.post(
  '/send',
  authenticate,
  requirePermission(Permission.MANAGE_BUSINESS_RULES), // Using existing permission as proxy
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { userId, type, channel, title, message, data, priority, scheduledFor } = req.body;

    // Validate required fields
    if (!userId || !type || !channel || !title || !message) {
      res.status(400).json({
        error: 'userId, type, channel, title, and message are required',
        code: 'MISSING_FIELDS',
      });
      return;
    }

    // Validate type
    const validTypes = [
      'ORDER_CLAIMED',
      'ORDER_COMPLETED',
      'PICK_UPDATED',
      'INVENTORY_LOW',
      'EXCEPTION_REPORTED',
      'ZONE_ASSIGNED',
      'WAVE_CREATED',
      'SYSTEM_ALERT',
    ];
    if (!validTypes.includes(type)) {
      res.status(400).json({
        error: 'Invalid notification type',
        code: 'INVALID_TYPE',
      });
      return;
    }

    // Validate channel
    const validChannels = ['EMAIL', 'SMS', 'PUSH', 'IN_APP'];
    if (!validChannels.includes(channel)) {
      res.status(400).json({
        error: 'Invalid notification channel',
        code: 'INVALID_CHANNEL',
      });
      return;
    }

    // Validate priority if provided
    if (priority) {
      const validPriorities = ['LOW', 'NORMAL', 'HIGH', 'URGENT'];
      if (!validPriorities.includes(priority)) {
        res.status(400).json({
          error: 'Invalid notification priority',
          code: 'INVALID_PRIORITY',
        });
        return;
      }
    }

    const result = await notificationService.sendNotification({
      userId,
      type,
      channel,
      title,
      message,
      data,
      priority,
      scheduledFor: scheduledFor ? new Date(scheduledFor) : undefined,
    });

    res.status(result.success ? 201 : 500).json(result);
  })
);

/**
 * POST /api/notifications/bulk
 * Send bulk notifications (admin only)
 */
router.post(
  '/bulk',
  authenticate,
  requirePermission(Permission.MANAGE_BUSINESS_RULES),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { userIds, type, channels, title, message, data, priority } = req.body;

    // Validate required fields
    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      res.status(400).json({
        error: 'userIds must be a non-empty array',
        code: 'INVALID_USER_IDS',
      });
      return;
    }

    if (!type || !channels || !title || !message) {
      res.status(400).json({
        error: 'type, channels, title, and message are required',
        code: 'MISSING_FIELDS',
      });
      return;
    }

    // Validate channels is an array
    if (!Array.isArray(channels)) {
      res.status(400).json({
        error: 'channels must be an array',
        code: 'INVALID_CHANNELS',
      });
      return;
    }

    const result = await notificationService.bulkSend({
      userIds,
      type,
      channels,
      title,
      message,
      data,
      priority,
    });

    res.json(result);
  })
);

/**
 * POST /api/notifications/template/:templateName
 * Send notification from template (admin only)
 */
router.post(
  '/template/:templateName',
  authenticate,
  requirePermission(Permission.MANAGE_BUSINESS_RULES),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const templateName = req.params.templateName;
    const { userId, variables } = req.body;

    if (!userId) {
      res.status(400).json({
        error: 'userId is required',
        code: 'MISSING_USER_ID',
      });
      return;
    }

    if (!variables || typeof variables !== 'object') {
      res.status(400).json({
        error: 'variables must be an object',
        code: 'INVALID_VARIABLES',
      });
      return;
    }

    const result = await notificationService.sendFromTemplate(userId, templateName, variables);

    res.status(result.success ? 201 : 500).json(result);
  })
);

/**
 * GET /api/notifications/preferences
 * Get current user's notification preferences
 */
router.get(
  '/preferences',
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const userId = req.user!.userId;
    const preferences = await notificationService.getPreferences(userId);
    res.json(preferences);
  })
);

/**
 * PUT /api/notifications/preferences
 * Update current user's notification preferences
 */
router.put(
  '/preferences',
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const userId = req.user!.userId;
    const {
      emailEnabled,
      smsEnabled,
      pushEnabled,
      inAppEnabled,
      quietHoursEnabled,
      quietHoursStart,
      quietHoursEnd,
      quietHoursTimezone,
      smsPhone,
      typePreferences,
    } = req.body;

    // Validate phone format if provided
    if (smsPhone !== undefined) {
      const phoneRegex = /^\+\d{10,15}$/;
      if (smsPhone && !phoneRegex.test(smsPhone)) {
        res.status(400).json({
          error: 'Invalid phone number format. Must be in E.164 format (e.g., +64212345678)',
          code: 'INVALID_PHONE',
        });
        return;
      }
    }

    // Validate time format if provided
    const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
    if (quietHoursStart && !timeRegex.test(quietHoursStart)) {
      res.status(400).json({
        error: 'Invalid quietHoursStart format. Must be HH:MM',
        code: 'INVALID_TIME_FORMAT',
      });
      return;
    }

    if (quietHoursEnd && !timeRegex.test(quietHoursEnd)) {
      res.status(400).json({
        error: 'Invalid quietHoursEnd format. Must be HH:MM',
        code: 'INVALID_TIME_FORMAT',
      });
      return;
    }

    const preferences = await notificationService.updatePreferences(userId, {
      emailEnabled,
      smsEnabled,
      pushEnabled,
      inAppEnabled,
      quietHoursEnabled,
      quietHoursStart,
      quietHoursEnd,
      quietHoursTimezone,
      smsPhone,
      typePreferences,
    });

    res.json(preferences);
  })
);

export default router;
