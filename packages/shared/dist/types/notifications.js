/**
 * Notification System Types
 *
 * Types for multi-channel notification delivery
 */
// ============================================================================
// ENUMS
// ============================================================================
/**
 * Notification types - categories of notifications in the system
 */
export var NotificationType;
(function (NotificationType) {
    NotificationType["ORDER_CLAIMED"] = "ORDER_CLAIMED";
    NotificationType["ORDER_COMPLETED"] = "ORDER_COMPLETED";
    NotificationType["PICK_UPDATED"] = "PICK_UPDATED";
    NotificationType["INVENTORY_LOW"] = "INVENTORY_LOW";
    NotificationType["EXCEPTION_REPORTED"] = "EXCEPTION_REPORTED";
    NotificationType["ZONE_ASSIGNED"] = "ZONE_ASSIGNED";
    NotificationType["WAVE_CREATED"] = "WAVE_CREATED";
    NotificationType["SYSTEM_ALERT"] = "SYSTEM_ALERT";
})(NotificationType || (NotificationType = {}));
/**
 * Notification delivery channels
 */
export var NotificationChannel;
(function (NotificationChannel) {
    NotificationChannel["EMAIL"] = "EMAIL";
    NotificationChannel["SMS"] = "SMS";
    NotificationChannel["PUSH"] = "PUSH";
    NotificationChannel["IN_APP"] = "IN_APP";
    NotificationChannel["BULK"] = "BULK";
})(NotificationChannel || (NotificationChannel = {}));
/**
 * Notification delivery status
 */
export var NotificationStatus;
(function (NotificationStatus) {
    NotificationStatus["PENDING"] = "PENDING";
    NotificationStatus["SENT"] = "SENT";
    NotificationStatus["DELIVERED"] = "DELIVERED";
    NotificationStatus["FAILED"] = "FAILED";
    NotificationStatus["READ"] = "READ";
})(NotificationStatus || (NotificationStatus = {}));
/**
 * Notification priority levels
 */
export var NotificationPriority;
(function (NotificationPriority) {
    NotificationPriority["LOW"] = "LOW";
    NotificationPriority["NORMAL"] = "NORMAL";
    NotificationPriority["HIGH"] = "HIGH";
    NotificationPriority["URGENT"] = "URGENT";
})(NotificationPriority || (NotificationPriority = {}));
/**
 * Queue job status
 */
export var QueueJobStatus;
(function (QueueJobStatus) {
    QueueJobStatus["PENDING"] = "PENDING";
    QueueJobStatus["PROCESSING"] = "PROCESSING";
    QueueJobStatus["COMPLETED"] = "COMPLETED";
    QueueJobStatus["FAILED"] = "FAILED";
    QueueJobStatus["RETRYING"] = "RETRYING";
})(QueueJobStatus || (QueueJobStatus = {}));
/**
 * Queue job types
 */
export var QueueJobType;
(function (QueueJobType) {
    QueueJobType["EMAIL_SEND"] = "EMAIL_SEND";
    QueueJobType["SMS_SEND"] = "SMS_SEND";
    QueueJobType["PUSH_SEND"] = "PUSH_SEND";
    QueueJobType["BULK_SEND"] = "BULK_SEND";
})(QueueJobType || (QueueJobType = {}));
