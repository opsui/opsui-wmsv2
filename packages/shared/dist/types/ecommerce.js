/**
 * E-commerce Integration Types
 *
 * Domain model for e-commerce platform integration
 * Supports Shopify, WooCommerce, Magento, and custom platforms
 */
// ============================================================================
// ENUMS
// ============================================================================
/**
 * E-commerce Platform Types
 */
export var PlatformType;
(function (PlatformType) {
    PlatformType["SHOPIFY"] = "SHOPIFY";
    PlatformType["WOOCOMMERCE"] = "WOOCOMMERCE";
    PlatformType["MAGENTO"] = "MAGENTO";
    PlatformType["BIGCOMMERCE"] = "BIGCOMMERCE";
    PlatformType["CUSTOM"] = "CUSTOM";
})(PlatformType || (PlatformType = {}));
/**
 * Sync Status for operations
 */
export var EcommerceSyncStatus;
(function (EcommerceSyncStatus) {
    EcommerceSyncStatus["PENDING"] = "PENDING";
    EcommerceSyncStatus["IN_PROGRESS"] = "IN_PROGRESS";
    EcommerceSyncStatus["COMPLETED"] = "COMPLETED";
    EcommerceSyncStatus["FAILED"] = "FAILED";
})(EcommerceSyncStatus || (EcommerceSyncStatus = {}));
/**
 * Inventory Sync Direction
 */
export var InventorySyncType;
(function (InventorySyncType) {
    InventorySyncType["PUSH"] = "PUSH";
    InventorySyncType["PULL"] = "PULL";
    InventorySyncType["BIDIRECTIONAL"] = "BIDIRECTIONAL";
})(InventorySyncType || (InventorySyncType = {}));
/**
 * Order Sync Direction
 */
export var OrderSyncType;
(function (OrderSyncType) {
    OrderSyncType["IMPORT"] = "IMPORT";
    OrderSyncType["EXPORT"] = "EXPORT";
})(OrderSyncType || (OrderSyncType = {}));
/**
 * Product Mapping Status
 */
export var ProductMappingStatus;
(function (ProductMappingStatus) {
    ProductMappingStatus["ACTIVE"] = "ACTIVE";
    ProductMappingStatus["UNSYNCED"] = "UNSYNCED";
    ProductMappingStatus["DISABLED"] = "DISABLED";
})(ProductMappingStatus || (ProductMappingStatus = {}));
/**
 * Webhook Processing Status
 */
export var WebhookProcessingStatus;
(function (WebhookProcessingStatus) {
    WebhookProcessingStatus["PENDING"] = "PENDING";
    WebhookProcessingStatus["PROCESSED"] = "PROCESSED";
    WebhookProcessingStatus["FAILED"] = "FAILED";
    WebhookProcessingStatus["IGNORED"] = "IGNORED";
})(WebhookProcessingStatus || (WebhookProcessingStatus = {}));
