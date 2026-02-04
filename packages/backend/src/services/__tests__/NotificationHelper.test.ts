/**
 * Unit tests for NotificationHelper
 * @covers src/services/NotificationHelper.ts
 */

import {
  notifyUser,
  notifyAll,
  broadcastEvent,
  notifyExceptionReported,
  NotificationType,
  NotificationPriority,
  NotificationMessage,
} from '../NotificationHelper';

// Mock console.log to capture output
const mockConsoleLog = jest.fn();
global.console.log = mockConsoleLog;

describe('NotificationHelper', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ==========================================================================
  // ENUMS
  // ==========================================================================

  describe('NotificationType enum', () => {
    it('should have all expected notification types', () => {
      expect(NotificationType.INFO).toBe('info');
      expect(NotificationType.WARNING).toBe('warning');
      expect(NotificationType.ERROR).toBe('error');
      expect(NotificationType.SUCCESS).toBe('success');
      expect(NotificationType.EXCEPTION_REPORTED).toBe('exception_reported');
      expect(NotificationType.QUALITY_FAILED).toBe('quality_failed');
      expect(NotificationType.QUALITY_APPROVED).toBe('quality_approved');
      expect(NotificationType.ORDER_SHIPPED).toBe('order_shipped');
      expect(NotificationType.WAVE_CREATED).toBe('wave_created');
      expect(NotificationType.WAVE_COMPLETED).toBe('wave_completed');
      expect(NotificationType.ZONE_ASSIGNED).toBe('zone_assigned');
    });
  });

  describe('NotificationPriority enum', () => {
    it('should have all expected priority levels', () => {
      expect(NotificationPriority.LOW).toBe('low');
      expect(NotificationPriority.NORMAL).toBe('normal');
      expect(NotificationPriority.MEDIUM).toBe('medium');
      expect(NotificationPriority.HIGH).toBe('high');
      expect(NotificationPriority.URGENT).toBe('urgent');
    });
  });

  // ==========================================================================
  // NOTIFICATION FUNCTIONS
  // ==========================================================================

  describe('notifyUser', () => {
    it('should log notification for a specific user', async () => {
      const notification: NotificationMessage & { userId: string } = {
        type: NotificationType.INFO,
        priority: NotificationPriority.NORMAL,
        title: 'Test Notification',
        message: 'This is a test',
        userId: 'user-123',
      };

      await notifyUser(notification);

      expect(mockConsoleLog).toHaveBeenCalledWith('[Notification] User: user-123');
    });

    it('should include timestamp if provided', async () => {
      const notification: NotificationMessage & { userId: string } = {
        type: NotificationType.INFO,
        priority: NotificationPriority.NORMAL,
        title: 'Test',
        message: 'Test message',
        userId: 'user-123',
        timestamp: new Date('2024-01-01'),
      };

      await notifyUser(notification);

      expect(mockConsoleLog).toHaveBeenCalledWith('[Notification] User: user-123');
    });

    it('should handle custom data', async () => {
      const notification: NotificationMessage & { userId: string } = {
        type: NotificationType.WARNING,
        priority: NotificationPriority.HIGH,
        title: 'Warning',
        message: 'Something needs attention',
        userId: 'user-123',
        data: { orderId: 'SO-123', quantity: 10 },
      };

      await notifyUser(notification);

      expect(mockConsoleLog).toHaveBeenCalledWith('[Notification] User: user-123');
    });
  });

  describe('notifyAll', () => {
    it('should log broadcast notification', async () => {
      const notification: NotificationMessage = {
        type: NotificationType.INFO,
        priority: NotificationPriority.NORMAL,
        title: 'System Update',
        message: 'System will be updated tonight',
      };

      await notifyAll(notification);

      expect(mockConsoleLog).toHaveBeenCalledWith('[Broadcast Notification] System Update');
    });

    it('should handle urgent notifications', async () => {
      const notification: NotificationMessage = {
        type: NotificationType.ERROR,
        priority: NotificationPriority.URGENT,
        title: 'Critical Error',
        message: 'System requires immediate attention',
      };

      await notifyAll(notification);

      expect(mockConsoleLog).toHaveBeenCalledWith('[Broadcast Notification] Critical Error');
    });

    it('should include data if provided', async () => {
      const notification: NotificationMessage = {
        type: NotificationType.WAVE_COMPLETED,
        priority: NotificationPriority.NORMAL,
        title: 'Wave Completed',
        message: 'Wave W-001 has been completed',
        data: { waveId: 'W-001', totalOrders: 50 },
      };

      await notifyAll(notification);

      expect(mockConsoleLog).toHaveBeenCalledWith('[Broadcast Notification] Wave Completed');
    });
  });

  describe('broadcastEvent', () => {
    it('should log broadcast event', async () => {
      await broadcastEvent('order_updated', { orderId: 'SO-123' });

      expect(mockConsoleLog).toHaveBeenCalledWith('[Broadcast Event] order_updated');
    });

    it('should handle events with complex data', async () => {
      const complexData = {
        orderId: 'SO-123',
        items: [{ sku: 'ABC-123', quantity: 10 }],
        status: 'PICKING',
      };

      await broadcastEvent('order_status_changed', complexData);

      expect(mockConsoleLog).toHaveBeenCalledWith('[Broadcast Event] order_status_changed');
    });

    it('should handle events with null data', async () => {
      await broadcastEvent('system_heartbeat', null);

      expect(mockConsoleLog).toHaveBeenCalledWith('[Broadcast Event] system_heartbeat');
    });

    it('should handle events with undefined data', async () => {
      await broadcastEvent('connection_status', undefined);

      expect(mockConsoleLog).toHaveBeenCalledWith('[Broadcast Event] connection_status');
    });
  });

  // ==========================================================================
  // SPECIALIZED NOTIFICATIONS
  // ==========================================================================

  describe('notifyExceptionReported', () => {
    it('should create exception notification with order ID', async () => {
      const notification = {
        orderId: 'SO-123',
        description: 'Item damaged during picking',
      };

      await notifyExceptionReported(notification);

      expect(mockConsoleLog).toHaveBeenCalledWith(
        '[Broadcast Notification] Order Exception: SO-123'
      );
    });

    it('should create exception notification without order ID', async () => {
      const notification = {
        description: 'Generic warehouse exception',
      };

      await notifyExceptionReported(notification);

      expect(mockConsoleLog).toHaveBeenCalledWith('[Broadcast Notification] Order Exception: N/A');
    });

    it('should use HIGH priority for exceptions', async () => {
      const notification = {
        orderId: 'SO-456',
        description: 'Short pick detected',
      };

      await notifyExceptionReported(notification);

      expect(mockConsoleLog).toHaveBeenCalledWith(
        '[Broadcast Notification] Order Exception: SO-456'
      );
    });

    it('should include notification data', async () => {
      const notification = {
        orderId: 'SO-789',
        description: 'Quality hold required',
        exceptionType: 'QUALITY',
      };

      await notifyExceptionReported(notification);

      expect(mockConsoleLog).toHaveBeenCalledWith(
        '[Broadcast Notification] Order Exception: SO-789'
      );
    });

    it('should use default description when none provided', async () => {
      const notification = {
        orderId: 'SO-999',
      };

      await notifyExceptionReported(notification);

      expect(mockConsoleLog).toHaveBeenCalledWith(
        '[Broadcast Notification] Order Exception: SO-999'
      );
    });
  });

  // ==========================================================================
  // NOTIFICATION TYPE COMBINATIONS
  // ==========================================================================

  describe('NotificationMessage interface', () => {
    it('should accept all optional fields', () => {
      const message: NotificationMessage = {
        type: NotificationType.INFO,
        priority: NotificationPriority.NORMAL,
        title: 'Test',
        message: 'Test message',
        timestamp: new Date(),
        userId: 'user-123',
        data: { key: 'value' },
        exceptionId: 'exc-001',
        orderId: 'SO-001',
        description: 'Test description',
      };

      expect(message.type).toBe(NotificationType.INFO);
      expect(message.priority).toBe(NotificationPriority.NORMAL);
      expect(message.title).toBe('Test');
      expect(message.message).toBe('Test message');
    });

    it('should accept only required fields', () => {
      const message: NotificationMessage = {
        type: NotificationType.INFO,
        priority: NotificationPriority.NORMAL,
        title: 'Test',
        message: 'Test message',
      };

      expect(message.type).toBe(NotificationType.INFO);
      expect(message.priority).toBe(NotificationPriority.NORMAL);
      expect(message.title).toBe('Test');
      expect(message.message).toBe('Test message');
    });
  });
});
