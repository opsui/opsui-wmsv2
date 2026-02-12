/**
 * E-commerce Integration Types
 *
 * Domain model for e-commerce platform integration
 * Supports Shopify, WooCommerce, Magento, and custom platforms
 */
/**
 * E-commerce Platform Types
 */
export declare enum PlatformType {
    SHOPIFY = "SHOPIFY",
    WOOCOMMERCE = "WOOCOMMERCE",
    MAGENTO = "MAGENTO",
    BIGCOMMERCE = "BIGCOMMERCE",
    CUSTOM = "CUSTOM"
}
/**
 * Sync Status for operations
 */
export declare enum EcommerceSyncStatus {
    PENDING = "PENDING",
    IN_PROGRESS = "IN_PROGRESS",
    COMPLETED = "COMPLETED",
    FAILED = "FAILED"
}
/**
 * Inventory Sync Direction
 */
export declare enum InventorySyncType {
    PUSH = "PUSH",// WMS → Platform
    PULL = "PULL",// Platform → WMS
    BIDIRECTIONAL = "BIDIRECTIONAL"
}
/**
 * Order Sync Direction
 */
export declare enum OrderSyncType {
    IMPORT = "IMPORT",// Platform → WMS
    EXPORT = "EXPORT"
}
/**
 * Product Mapping Status
 */
export declare enum ProductMappingStatus {
    ACTIVE = "ACTIVE",
    UNSYNCED = "UNSYNCED",
    DISABLED = "DISABLED"
}
/**
 * Webhook Processing Status
 */
export declare enum WebhookProcessingStatus {
    PENDING = "PENDING",
    PROCESSED = "PROCESSED",
    FAILED = "FAILED",
    IGNORED = "IGNORED"
}
/**
 * E-commerce Connection
 * Stores platform connection credentials and configuration
 */
export interface EcommerceConnection {
    connectionId: string;
    connectionName: string;
    platformType: PlatformType;
    apiEndpoint: string;
    apiKey: string;
    apiSecret?: string;
    accessToken?: string;
    storeUrl: string;
    apiVersion: string;
    webhookUrl?: string;
    webhookSecret?: string;
    isActive: boolean;
    syncCustomers: boolean;
    syncProducts: boolean;
    syncInventory: boolean;
    syncOrders: boolean;
    autoImportOrders: boolean;
    lastSyncAt?: Date;
    syncFrequencyMinutes: number;
    connectionSettings?: Record<string, unknown>;
    rateLimitRemaining?: number;
    rateLimitResetAt?: Date;
    createdAt: Date;
    updatedAt: Date;
    createdBy?: string;
}
/**
 * E-commerce Product Mapping
 * Maps internal SKUs to external product IDs
 */
export interface EcommerceProductMapping {
    mappingId: string;
    connectionId: string;
    internalSku: string;
    externalProductId: string;
    externalVariantId?: string;
    externalProductTitle?: string;
    syncStatus: ProductMappingStatus;
    lastSyncedAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}
/**
 * E-commerce Inventory Sync
 * Tracks inventory synchronization status
 */
export interface EcommerceInventorySync {
    syncId: string;
    connectionId: string;
    sku: string;
    syncType: InventorySyncType;
    syncStatus: EcommerceSyncStatus;
    quantityBefore?: number;
    quantityAfter?: number;
    externalQuantityBefore?: number;
    externalQuantityAfter?: number;
    variance: number;
    errorMessage?: string;
    startedAt: Date;
    completedAt?: Date;
    createdBy?: string;
}
/**
 * E-commerce Order Sync
 * Tracks order synchronization from e-commerce platforms
 */
export interface EcommerceOrderSync {
    syncId: string;
    connectionId: string;
    externalOrderId: string;
    internalOrderId?: string;
    syncStatus: EcommerceSyncStatus;
    syncType: OrderSyncType;
    orderData?: Record<string, unknown>;
    lineItemsData?: Record<string, unknown>[];
    customerData?: Record<string, unknown>;
    errorMessage?: string;
    processingAttempts: number;
    lastAttemptAt?: Date;
    completedAt?: Date;
    createdAt: Date;
}
/**
 * E-commerce Customer Sync
 * Tracks customer synchronization
 */
export interface EcommerceCustomerSync {
    syncId: string;
    connectionId: string;
    externalCustomerId: string;
    internalCustomerId?: string;
    syncStatus: EcommerceSyncStatus;
    customerData?: Record<string, unknown>;
    errorMessage?: string;
    createdAt: Date;
    updatedAt: Date;
}
/**
 * E-commerce Webhook
 * Stores webhook events and processing status
 */
export interface EcommerceWebhook {
    webhookId: string;
    connectionId: string;
    webhookEvent: string;
    externalResourceId?: string;
    payload: Record<string, unknown>;
    receivedAt: Date;
    processedAt?: Date;
    processingStatus: WebhookProcessingStatus;
    errorMessage?: string;
    retryCount: number;
    createdAt: Date;
}
/**
 * E-commerce Sync Logs
 * Audit trail for sync operations
 */
export interface EcommerceSyncLog {
    logId: string;
    connectionId: string;
    syncType: string;
    resourceType?: string;
    resourceCount: number;
    successCount: number;
    failureCount: number;
    syncStatus: EcommerceSyncStatus;
    startedAt: Date;
    completedAt?: Date;
    errorSummary?: string;
    createdBy?: string;
}
/**
 * Shopify Specific Settings
 */
export interface ShopifySettings {
    connectionId: string;
    locationId?: string;
    inventoryTrackingStrategy: 'shopify' | 'managed';
    taxTaxable: boolean;
    emailCustomerNotification: boolean;
    sendReceipt: boolean;
    weightUnit: 'grams' | 'kg' | 'oz' | 'lb';
    enableCompareAtPrice: boolean;
    metafieldDefinitions?: Record<string, unknown>;
}
/**
 * WooCommerce Specific Settings
 */
export interface WooCommerceSettings {
    connectionId: string;
    apiVersion: string;
    wpAjaxUrl?: string;
    productIdentifier: 'sku' | 'id' | 'slug';
    taxBasedOn: 'shipping' | 'billing' | 'base';
    calculateTaxes: boolean;
    roundTaxAtSubtotal: boolean;
    roundTaxAtCartTotal: boolean;
    pricesIncludeTax: boolean;
    metafieldDefinitions?: Record<string, unknown>;
}
/**
 * Magento Specific Settings
 */
export interface MagentoSettings {
    connectionId: string;
    apiVersion: string;
    storeViewCode?: string;
    attributeSetId?: string;
    websiteId?: number;
    stockId: number;
    notifyCustomer: boolean;
    visibleCatalogVisible: boolean;
    metafieldDefinitions?: Record<string, unknown>;
}
/**
 * E-commerce Connection Status View
 */
export interface EcommerceConnectionStatus {
    connectionId: string;
    connectionName: string;
    platformType: PlatformType;
    storeUrl: string;
    isActive: boolean;
    syncFrequencyMinutes: number;
    lastSyncAt?: Date;
    productsSynced: number;
    inventorySyncsToday: number;
    ordersSyncedToday: number;
    webhooksToday: number;
    createdAt: Date;
    updatedAt: Date;
}
/**
 * Sync Error Summary
 */
export interface EcommerceSyncError {
    connectionName: string;
    platformType: PlatformType;
    syncType?: string;
    sku?: string;
    errorMessage: string;
    completedAt?: Date;
    externalOrderId?: string;
    orderError?: string;
    webhookUrl?: string;
}
/**
 * Pending Sync Queue Summary
 */
export interface EcommercePendingSync {
    connectionName: string;
    platformType: PlatformType;
    pendingProducts: number;
    pendingInventory: number;
    pendingOrders: number;
    pendingWebhooks: number;
}
/**
 * Create E-commerce Connection DTO
 */
export interface CreateEcommerceConnectionDTO {
    connectionName: string;
    platformType: PlatformType;
    apiEndpoint: string;
    apiKey: string;
    apiSecret?: string;
    accessToken?: string;
    storeUrl: string;
    apiVersion?: string;
    webhookUrl?: string;
    webhookSecret?: string;
    syncCustomers?: boolean;
    syncProducts?: boolean;
    syncInventory?: boolean;
    syncOrders?: boolean;
    autoImportOrders?: boolean;
    syncFrequencyMinutes?: number;
    connectionSettings?: Record<string, unknown>;
    platformSettings?: ShopifySettings | WooCommerceSettings | MagentoSettings;
    createdBy: string;
}
/**
 * Update E-commerce Connection DTO
 */
export interface UpdateEcommerceConnectionDTO {
    connectionName?: string;
    apiEndpoint?: string;
    apiKey?: string;
    apiSecret?: string;
    accessToken?: string;
    storeUrl?: string;
    apiVersion?: string;
    webhookUrl?: string;
    webhookSecret?: string;
    isActive?: boolean;
    syncCustomers?: boolean;
    syncProducts?: boolean;
    syncInventory?: boolean;
    syncOrders?: boolean;
    autoImportOrders?: boolean;
    syncFrequencyMinutes?: number;
    connectionSettings?: Record<string, unknown>;
}
/**
 * Create Product Mapping DTO
 */
export interface CreateProductMappingDTO {
    connectionId: string;
    internalSku: string;
    externalProductId: string;
    externalVariantId?: string;
    externalProductTitle?: string;
}
/**
 * Update Product Mapping DTO
 */
export interface UpdateProductMappingDTO {
    syncStatus?: ProductMappingStatus;
    externalProductId?: string;
    externalVariantId?: string;
    externalProductTitle?: string;
}
/**
 * Create Inventory Sync DTO
 */
export interface CreateInventorySyncDTO {
    connectionId: string;
    sku: string;
    syncType: InventorySyncType;
    quantityBefore?: number;
    quantityAfter?: number;
    externalQuantityBefore?: number;
    createdBy?: string;
}
/**
 * Sync Inventory Request DTO
 */
export interface SyncInventoryRequestDTO {
    connectionId: string;
    skus: string[];
    syncType?: InventorySyncType;
    forceSync?: boolean;
}
/**
 * Sync Products Request DTO
 */
export interface SyncProductsRequestDTO {
    connectionId: string;
    skus?: string[];
    includeUnmapped?: boolean;
}
/**
 * Sync Orders Request DTO
 */
export interface SyncOrdersRequestDTO {
    connectionId: string;
    orderIds?: string[];
    daysToLookBack?: number;
}
/**
 * Test Connection Result
 */
export interface TestConnectionResult {
    success: boolean;
    message: string;
    responseTimeMs: number;
    platformInfo?: Record<string, unknown>;
}
/**
 * Platform Product Data
 * Normalized product data from e-commerce platform
 */
export interface PlatformProductData {
    externalProductId: string;
    externalVariantId?: string;
    title: string;
    description?: string;
    sku?: string;
    price?: number;
    compareAtPrice?: number;
    costPrice?: number;
    quantity?: number;
    weight?: number;
    weightUnit?: string;
    images?: string[];
    tags?: string[];
    status?: string;
    createdAt?: Date;
    updatedAt?: Date;
}
/**
 * Platform Order Data
 * Normalized order data from e-commerce platform
 */
export interface PlatformOrderData {
    externalOrderId: string;
    orderNumber?: string;
    orderDate: Date;
    orderStatus: string;
    financialStatus: string;
    currency: string;
    subtotal: number;
    tax: number;
    shipping: number;
    total: number;
    discount: number;
    customer: {
        externalCustomerId?: string;
        email?: string;
        firstName?: string;
        lastName?: string;
        phone?: string;
    };
    shippingAddress?: {
        firstName?: string;
        lastName?: string;
        company?: string;
        address1?: string;
        address2?: string;
        city?: string;
        province?: string;
        country?: string;
        postalCode?: string;
        phone?: string;
    };
    billingAddress?: {
        firstName?: string;
        lastName?: string;
        company?: string;
        address1?: string;
        address2?: string;
        city?: string;
        province?: string;
        country?: string;
        postalCode?: string;
        phone?: string;
    };
    lineItems: Array<{
        externalLineItemId?: string;
        sku?: string;
        title: string;
        quantity: number;
        price: number;
        total: number;
        productId?: string;
        variantId?: string;
    }>;
    shippingMethod?: string;
    trackingNumbers?: string[];
    notes?: string;
}
//# sourceMappingURL=ecommerce.d.ts.map