/**
 * @purpose: Push notification provider service - Web Push API (VAPID) integration
 * @domain: Notifications
 * @tested: No tests yet (0% coverage)
 * @last-change: 2025-01-25 - Initial implementation
 * @dependencies: web-push, logger
 * @description: Sends web push notifications using VAPID keys for browser push
 * @invariants: All push notifications have valid subscription and payload
 * @performance: Batch sending for multiple subscribers
 * @security: VAPID keys stored in environment variables, subscriptions validated
 */

import { logger } from '../config/logger';
import { notificationRepository } from '../repositories/NotificationRepository';
import { PushParams, PushSubscription } from '@opsui/shared';

// ============================================================================
// TYPES
// ============================================================================

export interface PushResult {
  success: boolean;
  messageId?: string;
  error?: string;
  endpoint?: string;
}

export interface PushProviderConfig {
  vapidPublicKey: string;
  vapidPrivateKey: string;
  vapidSubject?: string;
  gcmAPIKey?: string; // For Firebase Cloud Messaging (optional)
}

export interface PushStats {
  sent: number;
  failed: number;
  byEndpoint: Record<string, { sent: number; failed: number }>;
}

// ============================================================================
// PUSH PROVIDER CLASS
// ============================================================================

export class PushProvider {
  private webPush: any;
  private config: PushProviderConfig;
  private stats: PushStats = {
    sent: 0,
    failed: 0,
    byEndpoint: {},
  };

  constructor(config: PushProviderConfig) {
    this.config = config;
    this.initializeProvider();
  }

  // --------------------------------------------------------------------------
  // INITIALIZATION
  // --------------------------------------------------------------------------

  private initializeProvider(): void {
    try {
      this.webPush = require('web-push');

      // Set VAPID credentials
      this.webPush.setVapidDetails(
        this.config.vapidSubject || 'mailto:admin@wms.local',
        this.config.vapidPublicKey,
        this.config.vapidPrivateKey
      );

      // Set GCM API key if provided (for FCM fallback)
      if (this.config.gcmAPIKey) {
        this.webPush.setGCMAPIKey(this.config.gcmAPIKey);
      }

      logger.info('Web Push provider initialized');
    } catch (error) {
      logger.error('Failed to initialize Web Push provider', { error });
      throw new Error('Failed to initialize Web Push: package not installed or invalid VAPID keys');
    }
  }

  // --------------------------------------------------------------------------
  // SEND PUSH NOTIFICATION
  // --------------------------------------------------------------------------

  async sendPush(params: PushParams): Promise<PushResult> {
    // Validate required fields
    if (!params.userId || !params.title || !params.message) {
      return {
        success: false,
        error: 'Missing required fields: userId, title, and message',
      };
    }

    // Get user's push subscriptions
    const subscriptions = await this.getUserSubscriptions(params.userId);

    if (subscriptions.length === 0) {
      return {
        success: false,
        error: 'No push subscriptions found for user',
      };
    }

    // Prepare payload
    const payload = JSON.stringify({
      notification: {
        title: params.title,
        body: params.message,
        data: params.data || {},
        icon: '/icon-192.png',
        badge: '/badge-72.png',
        vibrate: [200, 100, 200],
        timestamp: Date.now(),
      },
    });

    // Send to all subscriptions
    const results = await this.sendToSubscriptions(subscriptions, payload);

    // Count successes
    const successCount = results.filter(r => r.success).length;

    if (successCount > 0) {
      logger.info('Push notification sent', {
        userId: params.userId,
        title: params.title,
        sentTo: successCount,
        total: results.length,
      });

      return {
        success: true,
        messageId: `push-${Date.now()}`,
      };
    }

    return {
      success: false,
      error: 'Failed to send to all subscriptions',
    };
  }

  // --------------------------------------------------------------------------
  // SEND TO SUBSCRIPTIONS
  // --------------------------------------------------------------------------

  private async sendToSubscriptions(
    subscriptions: PushSubscription[],
    payload: string
  ): Promise<PushResult[]> {
    const results: PushResult[] = [];

    for (const subscription of subscriptions) {
      try {
        // Convert subscription format to web-push format
        const pushSubscription = {
          endpoint: subscription.endpoint,
          keys: {
            p256dh: subscription.keys.p256dh,
            auth: subscription.keys.auth,
          },
        };

        // Send push notification
        await this.webPush.sendNotification(pushSubscription, payload);

        // Update stats
        const endpoint = this.getEndpointDomain(subscription.endpoint);
        this.stats.sent++;
        this.stats.byEndpoint[endpoint] = this.stats.byEndpoint[endpoint] || { sent: 0, failed: 0 };
        this.stats.byEndpoint[endpoint].sent++;

        results.push({
          success: true,
          endpoint: subscription.endpoint,
        });
      } catch (error: any) {
        // Update stats
        const endpoint = this.getEndpointDomain(subscription.endpoint);
        this.stats.failed++;
        this.stats.byEndpoint[endpoint] = this.stats.byEndpoint[endpoint] || { sent: 0, failed: 0 };
        this.stats.byEndpoint[endpoint].failed++;

        // Check if subscription is invalid/expired
        if (error.statusCode === 410 || error.statusCode === 404) {
          logger.warn('Push subscription expired, should be removed', {
            endpoint: subscription.endpoint,
          });
        }

        results.push({
          success: false,
          endpoint: subscription.endpoint,
          error: error.message || 'Push send failed',
        });
      }
    }

    return results;
  }

  // --------------------------------------------------------------------------
  // BULK SEND
  // --------------------------------------------------------------------------

  async bulkSend(params: PushParams[], rateLimitMs: number = 50): Promise<PushResult[]> {
    const results: PushResult[] = [];

    for (let i = 0; i < params.length; i++) {
      const result = await this.sendPush(params[i]);
      results.push(result);

      // Rate limiting
      if (i < params.length - 1) {
        await this.sleep(rateLimitMs);
      }
    }

    return results;
  }

  // --------------------------------------------------------------------------
  // VALIDATE SUBSCRIPTION
  // --------------------------------------------------------------------------

  isValidSubscription(subscription: PushSubscription): boolean {
    if (!subscription.endpoint || !subscription.keys) {
      return false;
    }

    const { p256dh, auth } = subscription.keys;

    if (!p256dh || !auth) {
      return false;
    }

    // Validate endpoint URL
    try {
      const url = new URL(subscription.endpoint);
      return url.protocol === 'https:';
    } catch {
      return false;
    }
  }

  // --------------------------------------------------------------------------
  // GENERATE VAPID KEYS
  // --------------------------------------------------------------------------

  static generateVapidKeys(): { publicKey: string; privateKey: string } {
    try {
      const webPush = require('web-push');
      return webPush.generateVAPIDKeys();
    } catch (error) {
      throw new Error('Failed to generate VAPID keys: web-push package not installed');
    }
  }

  // --------------------------------------------------------------------------
  // GET USER SUBSCRIPTIONS
  // --------------------------------------------------------------------------

  private async getUserSubscriptions(userId: string): Promise<PushSubscription[]> {
    try {
      // Query notification_preferences table for push_subscription
      const preferences = await notificationRepository.getPreferences(userId);

      if (preferences?.pushSubscription) {
        // Validate the subscription before returning
        if (this.isValidSubscription(preferences.pushSubscription)) {
          return [preferences.pushSubscription];
        } else {
          logger.warn('Invalid push subscription found for user', { userId });
          return [];
        }
      }

      return [];
    } catch (error) {
      logger.error('Failed to get user push subscriptions', { userId, error });
      return [];
    }
  }

  // --------------------------------------------------------------------------
  // REGISTER PUSH SUBSCRIPTION
  // --------------------------------------------------------------------------

  async registerSubscription(
    userId: string,
    subscription: PushSubscription
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Validate subscription
      if (!this.isValidSubscription(subscription)) {
        return {
          success: false,
          error: 'Invalid push subscription',
        };
      }

      // Save to database
      await notificationRepository.updatePushSubscription(userId, subscription);

      logger.info('Push subscription registered', {
        userId,
        endpoint: subscription.endpoint,
      });

      return { success: true };
    } catch (error: any) {
      logger.error('Failed to register push subscription', {
        userId,
        error: error.message,
      });
      return {
        success: false,
        error: error.message || 'Failed to register subscription',
      };
    }
  }

  // --------------------------------------------------------------------------
  // UNREGISTER PUSH SUBSCRIPTION
  // --------------------------------------------------------------------------

  async unregisterSubscription(
    userId: string,
    endpoint?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const preferences = await notificationRepository.getPreferences(userId);

      if (!preferences?.pushSubscription) {
        return {
          success: false,
          error: 'No subscription found for user',
        };
      }

      // If endpoint provided, verify it matches
      if (endpoint && preferences.pushSubscription.endpoint !== endpoint) {
        return {
          success: false,
          error: 'Subscription endpoint does not match',
        };
      }

      // Remove from database
      await notificationRepository.removePushSubscription(userId);

      logger.info('Push subscription unregistered', {
        userId,
        endpoint: preferences.pushSubscription.endpoint,
      });

      return { success: true };
    } catch (error: any) {
      logger.error('Failed to unregister push subscription', {
        userId,
        error: error.message,
      });
      return {
        success: false,
        error: error.message || 'Failed to unregister subscription',
      };
    }
  }

  // --------------------------------------------------------------------------
  // STATS AND HEALTH CHECK
  // --------------------------------------------------------------------------

  getStats(): PushStats {
    return { ...this.stats, byEndpoint: { ...this.stats.byEndpoint } };
  }

  resetStats(): void {
    this.stats = {
      sent: 0,
      failed: 0,
      byEndpoint: {},
    };
  }

  async healthCheck(): Promise<boolean> {
    try {
      // Basic check: verify VAPID keys are set
      if (!this.config.vapidPublicKey || !this.config.vapidPrivateKey) {
        return false;
      }

      // Verify web-push is loaded
      if (!this.webPush) {
        return false;
      }

      return true;
    } catch (error) {
      logger.error('Push provider health check failed', { error });
      return false;
    }
  }

  // --------------------------------------------------------------------------
  // HELPERS
  // --------------------------------------------------------------------------

  private getEndpointDomain(endpoint: string): string {
    try {
      const url = new URL(endpoint);
      return url.hostname;
    } catch {
      return 'unknown';
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // --------------------------------------------------------------------------
  // GET VAPID PUBLIC KEY
  // --------------------------------------------------------------------------

  getVapidPublicKey(): string {
    return this.config.vapidPublicKey;
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

let pushProviderInstance: PushProvider | null = null;

export function getPushProvider(): PushProvider | null {
  if (!pushProviderInstance && process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
    pushProviderInstance = new PushProvider({
      vapidPublicKey: process.env.VAPID_PUBLIC_KEY,
      vapidPrivateKey: process.env.VAPID_PRIVATE_KEY,
      vapidSubject: process.env.VAPID_SUBJECT || 'mailto:admin@wms.local',
      gcmAPIKey: process.env.GCM_API_KEY,
    });
    logger.info('Web Push provider singleton created');
  }

  return pushProviderInstance;
}
