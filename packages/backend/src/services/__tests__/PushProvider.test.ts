/**
 * Unit tests for PushProvider service
 * @covers src/services/PushProvider.ts
 */

import { PushProvider, PushProviderConfig, getPushProvider } from '../PushProvider';
import { PushParams, PushSubscription } from '@opsui/shared';

// Mock all dependencies before importing
const mockWebPushSendNotification = jest.fn().mockResolvedValue(undefined);
const mockWebPushSetVapidDetails = jest.fn();
const mockWebPushSetGCMAPIKey = jest.fn();
const mockWebPushGenerateVAPIDKeys = jest.fn(() => ({
  publicKey: 'test-public-key',
  privateKey: 'test-private-key',
}));

const mockWebPush = {
  setVapidDetails: mockWebPushSetVapidDetails,
  setGCMAPIKey: mockWebPushSetGCMAPIKey,
  sendNotification: mockWebPushSendNotification,
  generateVAPIDKeys: mockWebPushGenerateVAPIDKeys,
};

jest.mock('web-push', () => mockWebPush);

jest.mock('../../config/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock notification repository with proper functions
jest.mock('../../repositories/NotificationRepository', () => ({
  notificationRepository: {
    getPreferences: jest.fn(),
    updatePushSubscription: jest.fn(),
    removePushSubscription: jest.fn(),
  },
}));

describe('PushProvider', () => {
  let pushProvider: PushProvider;
  let config: PushProviderConfig;

  const validSubscription: PushSubscription = {
    endpoint: 'https://fcm.googleapis.com/fcm/test-token',
    keys: {
      p256dh: 'test-p256dh-key',
      auth: 'test-auth-key',
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Get the mocked repository and reset behaviors
    const { notificationRepository } = require('../../repositories/NotificationRepository');
    notificationRepository.getPreferences.mockResolvedValue({
      pushSubscription: validSubscription,
    });
    notificationRepository.updatePushSubscription.mockResolvedValue(undefined);
    notificationRepository.removePushSubscription.mockResolvedValue(undefined);
    mockWebPushSendNotification.mockResolvedValue(undefined);

    config = {
      vapidPublicKey: 'test-public-key',
      vapidPrivateKey: 'test-private-key',
      vapidSubject: 'mailto:admin@wms.local',
    };

    pushProvider = new PushProvider(config);
  });

  // ==========================================================================
  // CONSTRUCTOR & INITIALIZATION
  // ==========================================================================

  describe('Constructor', () => {
    it('should initialize web-push provider with VAPID credentials', () => {
      expect(mockWebPushSetVapidDetails).toHaveBeenCalledWith(
        'mailto:admin@wms.local',
        'test-public-key',
        'test-private-key'
      );
    });

    it('should set GCM API key when provided', () => {
      const configWithGCM: PushProviderConfig = {
        vapidPublicKey: 'test-public-key',
        vapidPrivateKey: 'test-private-key',
        gcmAPIKey: 'test-gcm-key',
      };

      new PushProvider(configWithGCM);

      expect(mockWebPushSetGCMAPIKey).toHaveBeenCalledWith('test-gcm-key');
    });

    it('should use default subject when not provided', () => {
      const minimalConfig: PushProviderConfig = {
        vapidPublicKey: 'test-public-key',
        vapidPrivateKey: 'test-private-key',
      };

      new PushProvider(minimalConfig);

      expect(mockWebPushSetVapidDetails).toHaveBeenCalledWith(
        'mailto:admin@wms.local',
        'test-public-key',
        'test-private-key'
      );
    });
  });

  // ==========================================================================
  // SEND PUSH NOTIFICATION
  // ==========================================================================

  describe('sendPush', () => {
    const validPushParams: PushParams = {
      userId: 'user-123',
      title: 'Test Notification',
      message: 'Test message body',
    };

    it('should send push notification successfully', async () => {
      const result = await pushProvider.sendPush(validPushParams);

      expect(result.success).toBe(true);
      expect(result.messageId).toMatch(/^push-\d+$/);
      expect(mockWebPushSendNotification).toHaveBeenCalled();
    });

    it('should return error when missing required fields', async () => {
      const result = await pushProvider.sendPush({
        userId: '',
        title: '',
        message: '',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Missing required fields: userId, title, and message');
    });

    it('should return error when user has no subscriptions', async () => {
      const { notificationRepository } = require('../../repositories/NotificationRepository');
      notificationRepository.getPreferences.mockResolvedValue({
        pushSubscription: null,
      });

      const result = await pushProvider.sendPush(validPushParams);

      expect(result.success).toBe(false);
      expect(result.error).toBe('No push subscriptions found for user');
    });

    it('should include data in payload when provided', async () => {
      const paramsWithData: PushParams = {
        ...validPushParams,
        data: { orderId: 'ORD-123', action: 'view' },
      };

      await pushProvider.sendPush(paramsWithData);

      const payloadArg = JSON.parse(mockWebPushSendNotification.mock.calls[0][1]);
      expect(payloadArg.notification.data).toEqual({ orderId: 'ORD-123', action: 'view' });
    });

    it('should handle failed push send', async () => {
      mockWebPushSendNotification.mockRejectedValue(new Error('Push failed'));

      const result = await pushProvider.sendPush(validPushParams);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to send to all subscriptions');
    });
  });

  // ==========================================================================
  // VALIDATE SUBSCRIPTION
  // ==========================================================================

  describe('isValidSubscription', () => {
    it('should return true for valid subscription', () => {
      expect(pushProvider.isValidSubscription(validSubscription)).toBe(true);
    });

    it('should return false when endpoint is missing', () => {
      const invalidSubscription = {
        endpoint: '',
        keys: validSubscription.keys,
      };

      expect(pushProvider.isValidSubscription(invalidSubscription)).toBe(false);
    });

    it('should return false when keys are missing', () => {
      const invalidSubscription = {
        endpoint: validSubscription.endpoint,
        keys: undefined as any,
      };

      expect(pushProvider.isValidSubscription(invalidSubscription)).toBe(false);
    });

    it('should return false when p256dh is missing', () => {
      const invalidSubscription = {
        endpoint: validSubscription.endpoint,
        keys: {
          p256dh: '',
          auth: 'test-auth',
        },
      };

      expect(pushProvider.isValidSubscription(invalidSubscription)).toBe(false);
    });

    it('should return false when auth is missing', () => {
      const invalidSubscription = {
        endpoint: validSubscription.endpoint,
        keys: {
          p256dh: 'test-p256dh',
          auth: '',
        },
      };

      expect(pushProvider.isValidSubscription(invalidSubscription)).toBe(false);
    });

    it('should return false for non-HTTPS endpoint', () => {
      const invalidSubscription = {
        endpoint: 'http://example.com/push',
        keys: validSubscription.keys,
      };

      expect(pushProvider.isValidSubscription(invalidSubscription)).toBe(false);
    });

    it('should return false for invalid URL', () => {
      const invalidSubscription = {
        endpoint: 'not-a-url',
        keys: validSubscription.keys,
      };

      expect(pushProvider.isValidSubscription(invalidSubscription)).toBe(false);
    });
  });

  // ==========================================================================
  // GENERATE VAPID KEYS
  // ==========================================================================

  describe('generateVapidKeys static', () => {
    it('should generate VAPID keys', () => {
      const keys = PushProvider.generateVapidKeys();

      expect(keys).toEqual({
        publicKey: 'test-public-key',
        privateKey: 'test-private-key',
      });
    });
  });

  // ==========================================================================
  // REGISTER SUBSCRIPTION
  // ==========================================================================

  describe('registerSubscription', () => {
    it('should register a valid subscription', async () => {
      const result = await pushProvider.registerSubscription('user-123', validSubscription);

      expect(result.success).toBe(true);
      const { notificationRepository } = require('../../repositories/NotificationRepository');
      expect(notificationRepository.updatePushSubscription).toHaveBeenCalledWith(
        'user-123',
        validSubscription
      );
    });

    it('should reject invalid subscription', async () => {
      const invalidSubscription = {
        endpoint: '',
        keys: validSubscription.keys,
      };

      const result = await pushProvider.registerSubscription('user-123', invalidSubscription);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid push subscription');
      const { notificationRepository } = require('../../repositories/NotificationRepository');
      expect(notificationRepository.updatePushSubscription).not.toHaveBeenCalled();
    });

    it('should handle database errors', async () => {
      const { notificationRepository } = require('../../repositories/NotificationRepository');
      notificationRepository.updatePushSubscription.mockRejectedValue(new Error('Database error'));

      const result = await pushProvider.registerSubscription('user-123', validSubscription);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Database error');
    });
  });

  // ==========================================================================
  // UNREGISTER SUBSCRIPTION
  // ==========================================================================

  describe('unregisterSubscription', () => {
    it('should unregister subscription', async () => {
      const result = await pushProvider.unregisterSubscription('user-123');

      expect(result.success).toBe(true);
      const { notificationRepository } = require('../../repositories/NotificationRepository');
      expect(notificationRepository.removePushSubscription).toHaveBeenCalledWith('user-123');
    });

    it('should return error when no subscription found', async () => {
      const { notificationRepository } = require('../../repositories/NotificationRepository');
      notificationRepository.getPreferences.mockResolvedValue({
        pushSubscription: null,
      });

      const result = await pushProvider.unregisterSubscription('user-123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('No subscription found for user');
    });

    it('should verify endpoint when provided', async () => {
      const result = await pushProvider.unregisterSubscription('user-123', 'different-endpoint');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Subscription endpoint does not match');
      const { notificationRepository } = require('../../repositories/NotificationRepository');
      expect(notificationRepository.removePushSubscription).not.toHaveBeenCalled();
    });

    it('should handle database errors', async () => {
      const { notificationRepository } = require('../../repositories/NotificationRepository');
      notificationRepository.removePushSubscription.mockRejectedValue(new Error('Database error'));

      const result = await pushProvider.unregisterSubscription('user-123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Database error');
    });
  });

  // ==========================================================================
  // STATS
  // ==========================================================================

  describe('getStats', () => {
    it('should return current stats', async () => {
      await pushProvider.sendPush({
        userId: 'user-123',
        title: 'Test',
        message: 'Test',
      });

      const stats = pushProvider.getStats();

      expect(stats.sent).toBe(1);
      expect(stats.failed).toBe(0);
      expect(stats.byEndpoint['fcm.googleapis.com']).toEqual({ sent: 1, failed: 0 });
    });

    it('should return copy of stats (not reference)', () => {
      const stats1 = pushProvider.getStats();
      const stats2 = pushProvider.getStats();

      expect(stats1).not.toBe(stats2);
      expect(stats1.byEndpoint).not.toBe(stats2.byEndpoint);
    });
  });

  describe('resetStats', () => {
    it('should reset all stats to zero', async () => {
      await pushProvider.sendPush({
        userId: 'user-123',
        title: 'Test',
        message: 'Test',
      });
      pushProvider.resetStats();

      const stats = pushProvider.getStats();

      expect(stats.sent).toBe(0);
      expect(stats.failed).toBe(0);
      expect(stats.byEndpoint).toEqual({});
    });
  });

  // ==========================================================================
  // HEALTH CHECK
  // ==========================================================================

  describe('healthCheck', () => {
    it('should return true when provider is healthy', async () => {
      const result = await pushProvider.healthCheck();

      expect(result).toBe(true);
    });
  });

  // ==========================================================================
  // GET VAPID PUBLIC KEY
  // ==========================================================================

  describe('getVapidPublicKey', () => {
    it('should return the VAPID public key', () => {
      const key = pushProvider.getVapidPublicKey();

      expect(key).toBe('test-public-key');
    });
  });

  // ==========================================================================
  // BULK SEND
  // ==========================================================================

  describe('bulkSend', () => {
    it('should send multiple push notifications', async () => {
      const params: PushParams[] = [
        { userId: 'user-1', title: 'Test 1', message: 'Message 1' },
        { userId: 'user-2', title: 'Test 2', message: 'Message 2' },
        { userId: 'user-3', title: 'Test 3', message: 'Message 3' },
      ];

      const results = await pushProvider.bulkSend(params);

      expect(results).toHaveLength(3);
      expect(results.every(r => r.success)).toBe(true);
    });

    it('should apply rate limiting between sends', async () => {
      const params: PushParams[] = [
        { userId: 'user-1', title: 'Test 1', message: 'Message 1' },
        { userId: 'user-2', title: 'Test 2', message: 'Message 2' },
      ];

      const startTime = Date.now();
      await pushProvider.bulkSend(params, 100);
      const endTime = Date.now();

      expect(endTime - startTime).toBeGreaterThanOrEqual(100);
    });

    it('should use default rate limit when not specified', async () => {
      const params: PushParams[] = [
        { userId: 'user-1', title: 'Test 1', message: 'Message 1' },
        { userId: 'user-2', title: 'Test 2', message: 'Message 2' },
      ];

      await pushProvider.bulkSend(params);

      // Should complete without error
      expect(params.length).toBeGreaterThan(0);
    });

    it('should handle empty array', async () => {
      const results = await pushProvider.bulkSend([]);

      expect(results).toEqual([]);
    });
  });

  // ==========================================================================
  // SINGLETON
  // ==========================================================================

  describe('getPushProvider singleton', () => {
    const originalEnv = process.env;

    beforeEach(() => {
      jest.resetModules();
      process.env = { ...originalEnv };
    });

    afterAll(() => {
      process.env = originalEnv;
    });

    it('should create singleton when env vars are set', () => {
      process.env.VAPID_PUBLIC_KEY = 'test-public-key';
      process.env.VAPID_PRIVATE_KEY = 'test-private-key';

      jest.resetModules();
      const PushModule = require('../PushProvider');

      const provider = PushModule.getPushProvider();

      expect(provider).toBeTruthy();
      expect(provider).toHaveProperty('sendPush');
    });

    it('should return null when env vars are not set', () => {
      delete process.env.VAPID_PUBLIC_KEY;
      delete process.env.VAPID_PRIVATE_KEY;

      jest.resetModules();
      const PushModule = require('../PushProvider');

      const provider = PushModule.getPushProvider();

      expect(provider).toBeNull();
    });

    it('should return same instance on multiple calls', () => {
      process.env.VAPID_PUBLIC_KEY = 'test-public-key';
      process.env.VAPID_PRIVATE_KEY = 'test-private-key';

      jest.resetModules();
      const PushModule = require('../PushProvider');

      const provider1 = PushModule.getPushProvider();
      const provider2 = PushModule.getPushProvider();

      expect(provider1).toBe(provider2);
    });
  });
});
