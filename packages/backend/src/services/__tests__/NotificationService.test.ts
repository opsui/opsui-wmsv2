/**
 * Unit tests for NotificationService
 * @covers src/services/NotificationService.ts
 */

import { NotificationService } from '../NotificationService';

type NotificationChannel = 'IN_APP' | 'EMAIL' | 'SMS' | 'PUSH';

interface SendNotificationInput {
  userId: string;
  type: string;
  channel: NotificationChannel;
  title: string;
  message: string;
  data?: Record<string, unknown>;
  priority?: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  scheduledFor?: Date;
}

interface BulkSendInput {
  userIds: string[];
  type: string;
  channels: NotificationChannel[];
  title: string;
  message: string;
  data?: Record<string, unknown>;
}

// Mock all dependencies
jest.mock('../../db/client', () => ({
  query: jest.fn(),
}));

jest.mock('../../config/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock WebSocket broadcaster - define inside the mock factory
jest.mock('../../websocket', () => {
  const mockBroadcastNotification = jest.fn();
  const mockBroadcaster = {
    broadcastNotification: mockBroadcastNotification,
  };

  class MockWebSocketServer {
    getBroadcaster() {
      return mockBroadcaster;
    }
  }

  const mockWsServer = new MockWebSocketServer() as any;
  mockWsServer.getBroadcaster = jest.fn(() => mockBroadcaster);

  return {
    __esModule: true,
    default: mockWsServer,
  };
});

jest.mock('../EmailProvider', () => ({
  EmailProvider: jest.fn().mockImplementation(() => ({
    sendEmail: jest.fn().mockResolvedValue({
      success: true,
      messageId: 'email-msg-123',
      provider: 'sendgrid',
    }),
    bulkSend: jest.fn().mockResolvedValue([]),
  })),
}));

jest.mock('../SMSProvider', () => ({
  SMSProvider: jest.fn().mockImplementation(() => ({
    sendSMS: jest.fn().mockResolvedValue({
      success: true,
      messageId: 'sms-msg-123',
    }),
  })),
}));

jest.mock('../PushProvider', () => ({
  PushProvider: jest.fn().mockImplementation(() => ({
    sendPush: jest.fn().mockResolvedValue({
      success: true,
      messageId: 'push-msg-123',
    }),
  })),
}));

jest.mock('../../config', () => ({
  email: {
    sendgrid: { apiKey: null },
    postmark: { apiKey: null },
    ses: { accessKeyId: null },
  },
  sms: {
    accountSid: null,
    authToken: null,
  },
  push: {
    vapidPrivateKey: null,
    vapidPublicKey: null,
  },
}));

describe('NotificationService', () => {
  let notificationService: NotificationService;

  beforeEach(() => {
    jest.clearAllMocks();
    notificationService = new NotificationService();
  });

  // ==========================================================================
  // GET NOTIFICATIONS
  // ==========================================================================

  describe('getNotifications', () => {
    it('should get notifications for a user', async () => {
      const mockNotifications = [
        {
          notificationId: 'notif-1',
          userId: 'user-123',
          type: 'ORDER_COMPLETED',
          channel: 'IN_APP',
          title: 'Order Completed',
          message: 'Your order has been completed',
          status: 'DELIVERED',
          createdAt: new Date('2024-01-01'),
          readAt: new Date('2024-01-02'),
        },
      ];

      (require('../../db/client') as any).query.mockResolvedValueOnce({
        rows: mockNotifications,
      });
      (require('../../db/client') as any).query.mockResolvedValueOnce({
        rows: [{ count: '5' }],
      });

      const result = await notificationService.getNotifications('user-123');

      expect(result.notifications).toHaveLength(1);
      expect(result.total).toBe(5);
      expect(result.notifications[0]).toHaveProperty('notificationId', 'notif-1');
    });

    it('should filter by type', async () => {
      (require('../../db/client') as any).query.mockResolvedValueOnce({
        rows: [],
      });
      (require('../../db/client') as any).query.mockResolvedValueOnce({
        rows: [{ count: '0' }],
      });

      await notificationService.getNotifications('user-123', { type: 'ORDER_COMPLETED' });

      expect(require('../../db/client').query).toHaveBeenCalledWith(
        expect.stringContaining('AND type = $'),
        ['user-123', 'ORDER_COMPLETED', 50, 0]
      );
    });

    it('should filter by unread only', async () => {
      (require('../../db/client') as any).query.mockResolvedValueOnce({
        rows: [],
      });
      (require('../../db/client') as any).query.mockResolvedValueOnce({
        rows: [{ count: '0' }],
      });

      await notificationService.getNotifications('user-123', { unreadOnly: true });

      expect(require('../../db/client').query).toHaveBeenCalledWith(
        expect.stringContaining('AND read_at IS NULL'),
        expect.arrayContaining([expect.anything()])
      );
    });

    it('should apply limit and offset', async () => {
      (require('../../db/client') as any).query.mockResolvedValueOnce({
        rows: [],
      });
      (require('../../db/client') as any).query.mockResolvedValueOnce({
        rows: [{ count: '10' }],
      });

      await notificationService.getNotifications('user-123', { limit: 20, offset: 10 });

      expect(require('../../db/client').query).toHaveBeenCalledWith(
        expect.stringContaining('LIMIT $2 OFFSET $3'),
        expect.arrayContaining([expect.anything(), expect.anything(), 20, 10])
      );
    });
  });

  // ==========================================================================
  // MARK AS READ
  // ==========================================================================

  describe('markAsRead', () => {
    it('should mark notification as read', async () => {
      (require('../../db/client') as any).query.mockResolvedValueOnce({
        rows: [{ notificationId: 'notif-1' }],
      });

      const result = await notificationService.markAsRead('notif-1', 'user-123');

      expect(result).toBe(true);
      expect(require('../../db/client').query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE notifications'),
        ['notif-1', 'user-123']
      );
    });

    it('should return false if notification not found', async () => {
      (require('../../db/client') as any).query.mockResolvedValueOnce({
        rows: [],
      });

      const result = await notificationService.markAsRead('nonexistent', 'user-123');

      expect(result).toBe(false);
    });
  });

  // ==========================================================================
  // MARK ALL AS READ
  // ==========================================================================

  describe('markAllAsRead', () => {
    it('should mark all unread notifications as read', async () => {
      (require('../../db/client') as any).query.mockResolvedValueOnce({
        rows: [
          { notificationId: 'notif-1' },
          { notificationId: 'notif-2' },
          { notificationId: 'notif-3' },
        ],
      });

      const count = await notificationService.markAllAsRead('user-123');

      expect(count).toBe(3);
      expect(require('../../db/client').query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE user_id = $1 AND read_at IS NULL'),
        ['user-123']
      );
    });

    it('should return 0 if no unread notifications', async () => {
      (require('../../db/client') as any).query.mockResolvedValueOnce({
        rows: [],
      });

      const count = await notificationService.markAllAsRead('user-123');

      expect(count).toBe(0);
    });
  });

  // ==========================================================================
  // DELETE NOTIFICATION
  // ==========================================================================

  describe('deleteNotification', () => {
    it('should delete a notification', async () => {
      (require('../../db/client') as any).query.mockResolvedValueOnce({
        rows: [{ notificationId: 'notif-1' }],
      });

      const result = await notificationService.deleteNotification('notif-1', 'user-123');

      expect(result).toBe(true);
    });

    it('should return false if notification not found', async () => {
      (require('../../db/client') as any).query.mockResolvedValueOnce({
        rows: [],
      });

      const result = await notificationService.deleteNotification('nonexistent', 'user-123');

      expect(result).toBe(false);
    });
  });

  // ==========================================================================
  // GET NOTIFICATION PREFERENCES
  // ==========================================================================

  describe('getNotificationPreferences', () => {
    it('should get user notification preferences', async () => {
      const mockPrefs = {
        userId: 'user-123',
        email: true, // SQL alias: email_enabled as "email"
        sms: false, // SQL alias: sms_enabled as "sms"
        push: true, // SQL alias: push_enabled as "push"
        inApp: true, // SQL alias: in_app_enabled as "inApp"
      };

      (require('../../db/client') as any).query.mockResolvedValueOnce({
        rows: [mockPrefs],
      });

      const result = await notificationService.getNotificationPreferences('user-123');

      expect(result).toHaveProperty('userId', 'user-123');
      expect(result).toHaveProperty('emailEnabled', true);
      expect(result).toHaveProperty('smsEnabled', false);
    });

    it('should return null if no preferences set', async () => {
      (require('../../db/client') as any).query.mockResolvedValueOnce({
        rows: [],
      });

      const result = await notificationService.getNotificationPreferences('user-123');

      expect(result).toBeNull();
    });
  });

  // ==========================================================================
  // GET NOTIFICATION STATS
  // ==========================================================================

  describe('getNotificationStats', () => {
    it('should return notification statistics', async () => {
      (require('../../db/client') as any).query
        .mockResolvedValueOnce({
          rows: [{ total: '10', unread: '3' }],
        })
        .mockResolvedValueOnce({
          rows: [
            { type: 'ORDER_COMPLETED', count: '5' },
            { type: 'INVENTORY_LOW', count: '3' },
            { type: 'SYSTEM_ALERT', count: '2' },
          ],
        });

      const stats = await notificationService.getNotificationStats('user-123');

      expect(stats.total).toBe(10);
      expect(stats.unread).toBe(3);
      expect(stats.byType).toEqual({
        ORDER_COMPLETED: 5,
        INVENTORY_LOW: 3,
        SYSTEM_ALERT: 2,
      });
    });

    it('should handle empty stats', async () => {
      (require('../../db/client') as any).query
        .mockResolvedValueOnce({
          rows: [{ total: '0', unread: '0' }],
        })
        .mockResolvedValueOnce({
          rows: [],
        });

      const stats = await notificationService.getNotificationStats('user-123');

      expect(stats.total).toBe(0);
      expect(stats.unread).toBe(0);
      expect(stats.byType).toEqual({});
    });
  });

  // ==========================================================================
  // SEND NOTIFICATION
  // ==========================================================================

  describe('sendNotification', () => {
    it('should send a notification successfully', async () => {
      const input: SendNotificationInput = {
        userId: 'user-123',
        type: 'TEST_NOTIFICATION',
        channel: 'IN_APP',
        title: 'Test',
        message: 'Test message',
      };

      // Mock INSERT query (returns snake_case from database with all properties)
      (require('../../db/client') as any).query.mockResolvedValueOnce({
        rows: [
          {
            notification_id: 'notif-123',
            user_id: 'user-123',
            type: 'TEST_NOTIFICATION',
            channel: 'IN_APP',
            title: 'Test',
            message: 'Test message',
            status: 'PENDING',
            priority: 'NORMAL',
            data: null,
            scheduled_for: null,
            created_at: new Date(),
            read_at: null,
            sent_at: null,
            delivered_at: null,
            failed_at: null,
            error_message: null,
          },
        ],
      });

      // Mock UPDATE queries for status change to SENT and then DELIVERED
      (require('../../db/client') as any).query
        .mockResolvedValueOnce({
          rows: [],
        })
        .mockResolvedValueOnce({
          rows: [],
        });

      const result = await notificationService.sendNotification(input);

      expect(result.success).toBe(true);
      expect(result.notification).toHaveProperty('notificationId', 'notif-123');
    });

    it('should schedule notification for future delivery', async () => {
      const futureDate = new Date(Date.now() + 60000); // 1 minute in future

      const input: SendNotificationInput = {
        userId: 'user-123',
        type: 'TEST_NOTIFICATION',
        channel: 'IN_APP',
        title: 'Test',
        message: 'Test message',
        scheduledFor: futureDate,
      };

      (require('../../db/client') as any).query.mockResolvedValue({
        rows: [
          {
            notification_id: 'notif-123',
            user_id: 'user-123',
            type: 'TEST_NOTIFICATION',
            channel: 'IN_APP',
            title: 'Test',
            message: 'Test message',
            status: 'PENDING',
            priority: 'NORMAL',
            data: null,
            scheduled_for: futureDate,
            created_at: new Date(),
            read_at: null,
            sent_at: null,
            delivered_at: null,
            failed_at: null,
            error_message: null,
          },
        ],
      });

      const result = await notificationService.sendNotification(input);

      expect(result.success).toBe(true);
      // Should NOT call deliverNotification for scheduled future notification
    });

    it('should return error on database failure', async () => {
      (require('../../db/client') as any).query.mockRejectedValue(new Error('Database error'));

      const input: SendNotificationInput = {
        userId: 'user-123',
        type: 'TEST_NOTIFICATION',
        channel: 'IN_APP',
        title: 'Test',
        message: 'Test message',
      };

      const result = await notificationService.sendNotification(input);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Database error');
    });
  });

  // ==========================================================================
  // BULK SEND
  // ==========================================================================

  describe('bulkSend', () => {
    it('should send bulk notifications to multiple users', async () => {
      const input: BulkSendInput = {
        userIds: ['user-1', 'user-2', 'user-3'],
        type: 'BULK_NOTIFICATION',
        channels: ['IN_APP'],
        title: 'Bulk Test',
        message: 'Bulk test message',
      };

      // Set up a counter to track mock calls
      let callCount = 0;
      const createInsertResult = (userId: string) => ({
        rows: [
          {
            notification_id: `notif-${userId}`,
            user_id: userId,
            type: 'BULK_NOTIFICATION',
            channel: 'IN_APP',
            title: 'Bulk Test',
            message: 'Bulk test message',
            status: 'PENDING',
            priority: 'NORMAL',
            data: null,
            scheduled_for: null,
            created_at: new Date(),
            read_at: null,
            sent_at: null,
            delivered_at: null,
            failed_at: null,
            error_message: null,
          },
        ],
      });

      const updateResult = { rows: [] };

      // Set up mock implementation based on call count
      // Note: Each user needs 3 queries: INSERT, UPDATE to SENT, UPDATE to DELIVERED
      const mockQuery = (require('../../db/client') as any).query;
      mockQuery.mockReset(); // Reset first to clear any previous mocks
      mockQuery.mockImplementation(() => {
        callCount++;
        switch (callCount) {
          case 1: // INSERT for user-1
            return Promise.resolve(createInsertResult('user-1'));
          case 2: // UPDATE to SENT for user-1
            return Promise.resolve(updateResult);
          case 3: // UPDATE to DELIVERED for user-1
            return Promise.resolve(updateResult);
          case 4: // INSERT for user-2
            return Promise.resolve(createInsertResult('user-2'));
          case 5: // UPDATE to SENT for user-2
            return Promise.resolve(updateResult);
          case 6: // UPDATE to DELIVERED for user-2
            return Promise.resolve(updateResult);
          case 7: // INSERT for user-3
            return Promise.resolve(createInsertResult('user-3'));
          case 8: // UPDATE to SENT for user-3
            return Promise.resolve(updateResult);
          case 9: // UPDATE to DELIVERED for user-3
            return Promise.resolve(updateResult);
          default:
            return Promise.resolve({ rows: [] });
        }
      });

      const result = await notificationService.bulkSend(input);

      process.stderr.write('bulkSend result: ' + JSON.stringify(result, null, 2) + '\n');

      expect(result.success).toBe(true);
      expect(result.sent).toBe(3);
      expect(result.failed).toBe(0);
    });

    it('should track failed notifications in bulk send', async () => {
      const input: BulkSendInput = {
        userIds: ['user-1', 'user-2'],
        type: 'BULK_NOTIFICATION',
        channels: ['IN_APP'],
        title: 'Bulk Test',
        message: 'Bulk test message',
      };

      // Set up a counter to track mock calls
      let callCount = 0;

      // Set up mock implementation based on call count
      const mockQuery = (require('../../db/client') as any).query;
      mockQuery.mockImplementation(() => {
        callCount++;
        switch (callCount) {
          case 1: // INSERT for user-1
            return Promise.resolve({
              rows: [
                {
                  notification_id: 'notif-1',
                  user_id: 'user-1',
                  type: 'BULK_NOTIFICATION',
                  channel: 'IN_APP',
                  title: 'Bulk Test',
                  message: 'Bulk test message',
                  status: 'PENDING',
                  priority: 'NORMAL',
                  data: null,
                  scheduled_for: null,
                  created_at: new Date(),
                  read_at: null,
                  sent_at: null,
                  delivered_at: null,
                  failed_at: null,
                  error_message: null,
                },
              ],
            });
          case 2: // UPDATE to SENT for user-1
            return Promise.resolve({ rows: [] });
          case 3: // UPDATE to DELIVERED for user-1
            return Promise.resolve({ rows: [] });
          case 4: // INSERT for user-2 - this should fail
            return Promise.reject(new Error('Failed'));
          default:
            return Promise.resolve({ rows: [] });
        }
      });

      const result = await notificationService.bulkSend(input);

      expect(result.success).toBe(false);
      expect(result.sent).toBe(1);
      expect(result.failed).toBe(1);
      expect(result.errors).toHaveLength(1);
    });
  });

  // ==========================================================================
  // GET PREFERENCES
  // ==========================================================================

  describe('getPreferences', () => {
    it('should return user preferences', async () => {
      const mockPrefs = {
        userId: 'user-123',
        emailEnabled: true,
        smsEnabled: false,
        pushEnabled: true,
        inAppEnabled: true,
        typePreferences: { ORDER_COMPLETED: { email: true, sms: false, push: true, inApp: true } },
      };

      (require('../../db/client') as any).query.mockResolvedValueOnce({
        rows: [mockPrefs],
      });

      const result = await notificationService.getPreferences('user-123');

      expect(result).toHaveProperty('userId', 'user-123');
      expect(result).toHaveProperty('emailEnabled', true);
      expect(result).toHaveProperty('typePreferences');
    });

    it('should return default preferences if none exist', async () => {
      (require('../../db/client') as any).query.mockResolvedValueOnce({
        rows: [],
      });

      const result = await notificationService.getPreferences('user-123');

      expect(result).toHaveProperty('userId', 'user-123');
      expect(result).toHaveProperty('inAppEnabled', true);
      expect(result).toHaveProperty('typePreferences', {});
    });
  });

  // ==========================================================================
  // UPDATE PREFERENCES
  // ==========================================================================

  describe('updatePreferences', () => {
    it('should create new preferences if none exist', async () => {
      (require('../../db/client') as any).query
        .mockResolvedValueOnce({ rows: [] }) // No existing preferences
        .mockResolvedValueOnce({ rows: [] }); // Insert result

      const mockGetPrefs = {
        userId: 'user-123',
        emailEnabled: true,
        inAppEnabled: true,
      };

      (require('../../db/client') as any).query.mockResolvedValueOnce({
        rows: [mockGetPrefs],
      });

      const preferences = {
        emailEnabled: true,
        inAppEnabled: true,
      };

      const result = await notificationService.updatePreferences('user-123', preferences);

      expect(result).toHaveProperty('userId', 'user-123');
      expect(require('../../db/client').query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO notification_preferences'),
        expect.anything()
      );
    });

    it('should update existing preferences', async () => {
      (require('../../db/client') as any).query.mockResolvedValueOnce({
        rows: [{ userId: 'user-123' }], // Existing preferences
      });

      const mockUpdatedPrefs = {
        userId: 'user-123',
        emailEnabled: true,
        inAppEnabled: true,
      };

      (require('../../db/client') as any).query
        .mockResolvedValueOnce({ rows: [] }) // Update result
        .mockResolvedValueOnce({
          rows: [mockUpdatedPrefs],
        });

      const result = await notificationService.updatePreferences('user-123', {
        emailEnabled: true,
        inAppEnabled: true,
      });

      expect(result).toHaveProperty('emailEnabled', true);
      expect(require('../../db/client').query).toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // LIST NOTIFICATIONS (alias)
  // ==========================================================================

  describe('listNotifications', () => {
    it('should be an alias for getNotifications', async () => {
      (require('../../db/client') as any).query.mockResolvedValueOnce({
        rows: [],
      });
      (require('../../db/client') as any).query.mockResolvedValueOnce({
        rows: [{ count: '0' }],
      });

      const result = await notificationService.listNotifications('user-123');

      expect(result).toHaveProperty('notifications');
      expect(result).toHaveProperty('total');
    });
  });
});
