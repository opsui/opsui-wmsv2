/**
 * Integration Framework Types
 *
 * Defines the domain model for external system integrations
 * including ERP, e-commerce platforms, and carrier APIs.
 */
// ============================================================================
// ENUMS
// ============================================================================
export var IntegrationType;
(function (IntegrationType) {
    IntegrationType["ERP"] = "ERP";
    IntegrationType["ECOMMERCE"] = "ECOMMERCE";
    IntegrationType["CARRIER"] = "CARRIER";
    IntegrationType["PAYMENT"] = "PAYMENT";
    IntegrationType["WAREHOUSE"] = "WAREHOUSE";
    IntegrationType["CUSTOM"] = "CUSTOM";
})(IntegrationType || (IntegrationType = {}));
export var IntegrationStatus;
(function (IntegrationStatus) {
    IntegrationStatus["DISCONNECTED"] = "DISCONNECTED";
    IntegrationStatus["CONNECTING"] = "CONNECTING";
    IntegrationStatus["CONNECTED"] = "CONNECTED";
    IntegrationStatus["ERROR"] = "ERROR";
    IntegrationStatus["PAUSED"] = "PAUSED";
})(IntegrationStatus || (IntegrationStatus = {}));
export var SyncDirection;
(function (SyncDirection) {
    SyncDirection["INBOUND"] = "INBOUND";
    SyncDirection["OUTBOUND"] = "OUTBOUND";
    SyncDirection["BIDIRECTIONAL"] = "BIDIRECTIONAL";
})(SyncDirection || (SyncDirection = {}));
export var SyncFrequency;
(function (SyncFrequency) {
    SyncFrequency["REAL_TIME"] = "REAL_TIME";
    SyncFrequency["EVERY_5_MINUTES"] = "EVERY_5_MINUTES";
    SyncFrequency["EVERY_15_MINUTES"] = "EVERY_15_MINUTES";
    SyncFrequency["EVERY_30_MINUTES"] = "EVERY_30_MINUTES";
    SyncFrequency["HOURLY"] = "HOURLY";
    SyncFrequency["EVERY_2_HOURS"] = "EVERY_2_HOURS";
    SyncFrequency["EVERY_6_HOURS"] = "EVERY_6_HOURS";
    SyncFrequency["DAILY"] = "DAILY";
    SyncFrequency["CUSTOM"] = "CUSTOM";
})(SyncFrequency || (SyncFrequency = {}));
export var WebhookEventType;
(function (WebhookEventType) {
    WebhookEventType["ORDER_CREATED"] = "ORDER_CREATED";
    WebhookEventType["ORDER_UPDATED"] = "ORDER_UPDATED";
    WebhookEventType["ORDER_CANCELLED"] = "ORDER_CANCELLED";
    WebhookEventType["INVENTORY_UPDATED"] = "INVENTORY_UPDATED";
    WebhookEventType["PRODUCT_CREATED"] = "PRODUCT_CREATED";
    WebhookEventType["PRODUCT_UPDATED"] = "PRODUCT_UPDATED";
    WebhookEventType["SHIPMENT_CREATED"] = "SHIPMENT_CREATED";
    WebhookEventType["SHIPMENT_DELIVERED"] = "SHIPMENT_DELIVERED";
    WebhookEventType["TRACKING_UPDATED"] = "TRACKING_UPDATED";
})(WebhookEventType || (WebhookEventType = {}));
export var ApiAuthType;
(function (ApiAuthType) {
    ApiAuthType["API_KEY"] = "API_KEY";
    ApiAuthType["OAUTH2"] = "OAUTH2";
    ApiAuthType["BASIC_AUTH"] = "BASIC_AUTH";
    ApiAuthType["BEARER_TOKEN"] = "BEARER_TOKEN";
    ApiAuthType["HMAC"] = "HMAC";
    ApiAuthType["NONE"] = "NONE";
})(ApiAuthType || (ApiAuthType = {}));
export var SyncStatus;
(function (SyncStatus) {
    SyncStatus["PENDING"] = "PENDING";
    SyncStatus["RUNNING"] = "RUNNING";
    SyncStatus["COMPLETED"] = "COMPLETED";
    SyncStatus["FAILED"] = "FAILED";
    SyncStatus["CANCELLED"] = "CANCELLED";
    SyncStatus["PARTIAL"] = "PARTIAL";
})(SyncStatus || (SyncStatus = {}));
/**
 * Known integration providers
 */
export var IntegrationProvider;
(function (IntegrationProvider) {
    // ERP Systems
    IntegrationProvider["SAP"] = "SAP";
    IntegrationProvider["ORACLE"] = "ORACLE";
    IntegrationProvider["NETSUITE"] = "NETSUITE";
    IntegrationProvider["MICROSOFT_DYNAMICS"] = "MICROSOFT_DYNAMICS";
    IntegrationProvider["QUICKBOOKS"] = "QUICKBOOKS";
    IntegrationProvider["XERO"] = "XERO";
    // E-commerce
    IntegrationProvider["SHOPIFY"] = "SHOPIFY";
    IntegrationProvider["WOOCOMMERCE"] = "WOOCOMMERCE";
    IntegrationProvider["MAGENTO"] = "MAGENTO";
    IntegrationProvider["BIGCOMMERCE"] = "BIGCOMMERCE";
    IntegrationProvider["SALESFORCE_COMMERCE"] = "SALESFORCE_COMMERCE";
    IntegrationProvider["AMAZON"] = "AMAZON";
    IntegrationProvider["EBAY"] = "EBAY";
    // Carriers
    IntegrationProvider["FEDEX"] = "FEDEX";
    IntegrationProvider["UPS"] = "UPS";
    IntegrationProvider["DHL"] = "DHL";
    IntegrationProvider["USPS"] = "USPS";
    IntegrationProvider["ONTRAC"] = "ONTRAC";
    // Payment
    IntegrationProvider["STRIPE"] = "STRIPE";
    IntegrationProvider["PAYPAL"] = "PAYPAL";
    IntegrationProvider["SQUARE"] = "SQUARE";
    // Custom
    IntegrationProvider["CUSTOM"] = "CUSTOM";
})(IntegrationProvider || (IntegrationProvider = {}));
