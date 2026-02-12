/**
 * Notification System Types
 *
 * Types for multi-channel notification delivery
 */
/**
 * Notification types - categories of notifications in the system
 */
export declare enum NotificationType {
    ORDER_CLAIMED = "ORDER_CLAIMED",
    ORDER_COMPLETED = "ORDER_COMPLETED",
    PICK_UPDATED = "PICK_UPDATED",
    INVENTORY_LOW = "INVENTORY_LOW",
    EXCEPTION_REPORTED = "EXCEPTION_REPORTED",
    ZONE_ASSIGNED = "ZONE_ASSIGNED",
    WAVE_CREATED = "WAVE_CREATED",
    SYSTEM_ALERT = "SYSTEM_ALERT"
}
/**
 * Notification delivery channels
 */
export declare enum NotificationChannel {
    EMAIL = "EMAIL",
    SMS = "SMS",
    PUSH = "PUSH",
    IN_APP = "IN_APP",
    BULK = "BULK"
}
/**
 * Notification delivery status
 */
export declare enum NotificationStatus {
    PENDING = "PENDING",
    SENT = "SENT",
    DELIVERED = "DELIVERED",
    FAILED = "FAILED",
    READ = "READ"
}
/**
 * Notification priority levels
 */
export declare enum NotificationPriority {
    LOW = "LOW",
    NORMAL = "NORMAL",
    HIGH = "HIGH",
    URGENT = "URGENT"
}
/**
 * Queue job status
 */
export declare enum QueueJobStatus {
    PENDING = "PENDING",
    PROCESSING = "PROCESSING",
    COMPLETED = "COMPLETED",
    FAILED = "FAILED",
    RETRYING = "RETRYING"
}
/**
 * Queue job types
 */
export declare enum QueueJobType {
    EMAIL_SEND = "EMAIL_SEND",
    SMS_SEND = "SMS_SEND",
    PUSH_SEND = "PUSH_SEND",
    BULK_SEND = "BULK_SEND"
}
/**
 * Notification entity (in-app and external notification history)
 */
export interface Notification {
    id: number;
    notificationId: string;
    userId: string;
    type: NotificationType;
    channel: NotificationChannel;
    title: string;
    message: string;
    data?: Record<string, unknown>;
    status: NotificationStatus;
    sentAt?: Date;
    deliveredAt?: Date;
    readAt?: Date;
    failedAt?: Date;
    errorMessage?: string;
    emailId?: string;
    smsId?: string;
    pushMessageId?: string;
    priority: NotificationPriority;
    createdAt: Date;
    updatedAt: Date;
    scheduledFor?: Date;
    expiresAt: Date;
}
/**
 * Notification preferences (user delivery settings)
 */
export interface NotificationPreferences {
    id: number;
    userId: string;
    emailEnabled: boolean;
    smsEnabled: boolean;
    pushEnabled: boolean;
    inAppEnabled: boolean;
    quietHoursEnabled: boolean;
    quietHoursStart?: string;
    quietHoursEnd?: string;
    quietHoursTimezone?: string;
    typePreferences: Record<string, TypeChannelPreferences>;
    smsPhone?: string;
    pushSubscription?: PushSubscription;
    createdAt: Date;
    updatedAt: Date;
}
/**
 * Per-type channel preferences
 */
export interface TypeChannelPreferences {
    email?: boolean;
    sms?: boolean;
    push?: boolean;
    inApp?: boolean;
}
/**
 * Web Push subscription info
 */
export interface PushSubscription {
    endpoint: string;
    keys: {
        p256dh: string;
        auth: string;
    };
}
/**
 * Notification template
 */
export interface NotificationTemplate {
    id: number;
    templateId: string;
    name: string;
    type: NotificationType;
    description?: string;
    subjectTemplate?: string;
    bodyTemplate: string;
    supportedChannels: NotificationChannel[];
    defaultPriority: NotificationPriority;
    variables: Record<string, string>;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
    createdBy?: string;
}
/**
 * Notification queue job
 */
export interface NotificationQueue {
    id: number;
    queueId: string;
    notificationId?: string;
    jobType: QueueJobType;
    payload: Record<string, unknown>;
    status: QueueJobStatus;
    attempts: number;
    maxAttempts: number;
    nextRetryAt?: Date;
    priority: number;
    createdAt: Date;
    startedAt?: Date;
    completedAt?: Date;
    failedAt?: Date;
    errorMessage?: string;
    lastErrorAt?: Date;
}
/**
 * Create notification DTO
 */
export interface CreateNotificationDTO {
    userId: string;
    type: NotificationType;
    channel: NotificationChannel;
    title: string;
    message: string;
    data?: Record<string, unknown>;
    priority?: NotificationPriority;
    scheduledFor?: Date;
}
/**
 * Bulk notification DTO
 */
export interface BulkNotificationDTO {
    userIds: string[];
    type: NotificationType;
    channels: NotificationChannel[];
    title: string;
    message: string;
    data?: Record<string, unknown>;
    priority?: NotificationPriority;
}
/**
 * Send email params
 */
export interface EmailParams {
    to: string | string[];
    subject: string;
    html: string;
    text?: string;
    from?: string;
    replyTo?: string;
    attachments?: Array<{
        filename: string;
        content: string | Buffer;
        contentType?: string;
    }>;
}
/**
 * Send SMS params
 */
export interface SMSParams {
    to: string;
    message: string;
    from?: string;
}
/**
 * Send push notification params
 */
export interface PushParams {
    userId: string;
    title: string;
    message: string;
    data?: Record<string, unknown>;
}
/**
 * In-app notification params
 */
export interface InAppNotificationParams {
    userId: string;
    type: NotificationType;
    title: string;
    message: string;
    data?: Record<string, unknown>;
    priority?: NotificationPriority;
}
/**
 * Update notification preferences DTO
 */
export interface UpdateNotificationPreferencesDTO {
    emailEnabled?: boolean;
    smsEnabled?: boolean;
    pushEnabled?: boolean;
    inAppEnabled?: boolean;
    quietHoursEnabled?: boolean;
    quietHoursStart?: string;
    quietHoursEnd?: string;
    quietHoursTimezone?: string;
    smsPhone?: string;
    pushSubscription?: PushSubscription;
    typePreferences?: Record<string, TypeChannelPreferences>;
}
/**
 * List notifications query params
 */
export interface ListNotificationsParams {
    type?: NotificationType;
    status?: NotificationStatus;
    channel?: NotificationChannel;
    unreadOnly?: boolean;
    limit?: number;
    offset?: number;
}
/**
 * Notification statistics
 */
export interface NotificationStats {
    total: number;
    unread: number;
    byType: Record<NotificationType, number>;
    byChannel: Record<NotificationChannel, number>;
    byStatus: Record<NotificationStatus, number>;
}
/**
 * Notification delivery result
 */
export interface NotificationDeliveryResult {
    success: boolean;
    notificationId: string;
    channel: NotificationChannel;
    externalId?: string;
    error?: string;
}
/**
 * Bulk notification result
 */
export interface BulkNotificationResult {
    total: number;
    successful: number;
    failed: number;
    results: NotificationDeliveryResult[];
}
//# sourceMappingURL=notifications.d.ts.map