/**
 * Push Notification Service
 *
 * Handles web push notification subscription using VAPID keys.
 * Manages service worker registration and permission handling.
 */

// ============================================================================
// TYPES
// ============================================================================

export interface PushSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export interface PushSubscriptionResponse {
  success: boolean;
  subscription?: PushSubscription;
  error?: string;
}

// ============================================================================
// VAPID KEYS (should match backend)
// ============================================================================

const VAPID_PUBLIC_KEY = process.env.VITE_VAPID_PUBLIC_KEY || '';

// ============================================================================
// PUSH NOTIFICATION SERVICE CLASS
// ============================================================================

class PushNotificationServiceClass {
  private subscription: PushSubscription | null = null;
  private registration: ServiceWorkerRegistration | null = null;
  private isSupported: boolean = false;
  private permission: NotificationPermission = 'default';

  // --------------------------------------------------------------------------
  // INITIALIZATION
  // --------------------------------------------------------------------------

  async initialize(): Promise<void> {
    // Check if service workers and push notifications are supported
    this.isSupported =
      'serviceWorker' in navigator && 'PushManager' in navigator && 'Notification' in window;

    if (!this.isSupported) {
      console.warn('Push notifications are not supported in this browser');
      return;
    }

    // Get current permission
    this.permission = Notification.permission;

    // Try to load existing subscription
    await this.loadSubscription();

    // Register service worker
    await this.registerServiceWorker();
  }

  // --------------------------------------------------------------------------
  // SERVICE WORKER REGISTRATION
  // --------------------------------------------------------------------------

  private async registerServiceWorker(): Promise<void> {
    if (!('serviceWorker' in navigator)) {
      return;
    }

    try {
      this.registration = await navigator.serviceWorker.register('/sw-push.js', {
        scope: '/',
        updateViaCache: 'all',
      });

      // Listen for updates
      this.registration.addEventListener('updatefound', () => {
        const newWorker = this.registration!.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // New version available, skip waiting to activate immediately
              newWorker.postMessage({ type: 'SKIP_WAITING' });
            }
          });
        }
      });

      console.log('Service worker registered successfully');
    } catch (error) {
      console.error('Service worker registration failed:', error);
    }
  }

  // --------------------------------------------------------------------------
  // SUBSCRIPTION MANAGEMENT
  // --------------------------------------------------------------------------

  async subscribe(): Promise<PushSubscriptionResponse> {
    if (!this.isSupported) {
      return {
        success: false,
        error: 'Push notifications are not supported in this browser',
      };
    }

    // Check current permission
    this.permission = Notification.permission;

    if (this.permission === 'denied') {
      return {
        success: false,
        error:
          'Notification permission denied. Please enable notifications in your browser settings.',
      };
    }

    // Request permission if not granted
    if (this.permission !== 'granted') {
      this.permission = await Notification.requestPermission();

      if (this.permission !== 'granted') {
        return {
          success: false,
          error: 'Notification permission not granted',
        };
      }
    }

    try {
      // Wait for service worker to be ready
      if (!this.registration) {
        await this.registerServiceWorker();
      }

      // Get existing subscription or create new one
      const subscription = await this.registration!.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as BufferSource,
      });

      // Convert subscription to JSON format
      const subscriptionJson = subscription.toJSON();
      this.subscription = {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: subscriptionJson.keys?.p256dh || '',
          auth: subscriptionJson.keys?.auth || '',
        },
      };

      // Send subscription to backend
      await this.sendSubscriptionToBackend(this.subscription);

      console.log('Push subscription successful');

      return {
        success: true,
        subscription: this.subscription,
      };
    } catch (error) {
      console.error('Push subscription failed:', error);

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to subscribe to push notifications',
      };
    }
  }

  async unsubscribe(): Promise<boolean> {
    if (!this.subscription) {
      return true; // Already unsubscribed
    }

    try {
      // Unsubscribe via PushManager
      await this.registration!.pushManager.getSubscription().then(subscription => {
        if (subscription) {
          return subscription.unsubscribe();
        }
        return true;
      });

      // Remove from backend
      await this.removeSubscriptionFromBackend();

      this.subscription = null;

      console.log('Push unsubscription successful');
      return true;
    } catch (error) {
      console.error('Push unsubscription failed:', error);
      return false;
    }
  }

  // --------------------------------------------------------------------------
  // PERMISSION STATUS
  // --------------------------------------------------------------------------

  getPermissionStatus(): NotificationPermission {
    return this.permission;
  }

  isPermissionGranted(): boolean {
    return this.permission === 'granted';
  }

  isPermissionDenied(): boolean {
    return this.permission === 'denied';
  }

  isPermissionDefault(): boolean {
    return this.permission === 'default';
  }

  // --------------------------------------------------------------------------
  // SUBSCRIPTION STATUS
  // --------------------------------------------------------------------------

  isSubscribed(): boolean {
    return this.subscription !== null;
  }

  getSubscription(): PushSubscription | null {
    return this.subscription;
  }

  // --------------------------------------------------------------------------
  // PRIVATE HELPERS
  // --------------------------------------------------------------------------

  private async loadSubscription(): Promise<void> {
    try {
      if (!this.registration) {
        return;
      }

      const subscription = await this.registration.pushManager.getSubscription();

      if (subscription) {
        const subscriptionJson = subscription.toJSON();
        this.subscription = {
          endpoint: subscription.endpoint,
          keys: {
            p256dh: subscriptionJson.keys?.p256dh || '',
            auth: subscriptionJson.keys?.auth || '',
          },
        };
      }
    } catch (error) {
      console.error('Failed to load existing subscription:', error);
    }
  }

  private async sendSubscriptionToBackend(subscription: PushSubscription): Promise<void> {
    try {
      const { apiClient } = await import('@/lib/api-client');
      await apiClient.put('/notifications/preferences', {
        pushSubscription: subscription,
      });
      console.log('Subscription sent to backend');
    } catch (error) {
      console.error('Failed to send subscription to backend:', error);
    }
  }

  private async removeSubscriptionFromBackend(): Promise<void> {
    try {
      const { apiClient } = await import('@/lib/api-client');
      await apiClient.put('/notifications/preferences', {
        pushSubscription: null,
      });
      console.log('Subscription removed from backend');
    } catch (error) {
      console.error('Failed to remove subscription from backend:', error);
    }
  }

  private urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }

    return outputArray;
  }

  // --------------------------------------------------------------------------
  // UTILITY METHODS
  // --------------------------------------------------------------------------

  async requestPermission(): Promise<NotificationPermission> {
    if (!this.isSupported) {
      return 'denied';
    }

    if (this.permission === 'default') {
      this.permission = await Notification.requestPermission();
    }

    return this.permission;
  }

  getVapidPublicKey(): string {
    return VAPID_PUBLIC_KEY;
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

export const pushNotificationService = new PushNotificationServiceClass();

// Export convenience functions
export async function initializePushNotifications(): Promise<void> {
  await pushNotificationService.initialize();
}

export async function subscribeToPushNotifications(): Promise<PushSubscriptionResponse> {
  return pushNotificationService.subscribe();
}

export async function unsubscribeFromPushNotifications(): Promise<boolean> {
  return pushNotificationService.unsubscribe();
}

export function getPushPermissionStatus(): NotificationPermission {
  return pushNotificationService.getPermissionStatus();
}

export function isPushSubscribed(): boolean {
  return pushNotificationService.isSubscribed();
}

export function isPushSupported(): boolean {
  return 'serviceWorker' in navigator && 'PushManager' in navigator;
}
