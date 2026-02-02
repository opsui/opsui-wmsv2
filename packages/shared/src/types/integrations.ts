/**
 * Integration Framework Types
 *
 * Defines the domain model for external system integrations
 * including ERP, e-commerce platforms, and carrier APIs.
 */

// ============================================================================
// ENUMS
// ============================================================================

export enum IntegrationType {
  ERP = 'ERP',
  ECOMMERCE = 'ECOMMERCE',
  CARRIER = 'CARRIER',
  PAYMENT = 'PAYMENT',
  WAREHOUSE = 'WAREHOUSE',
  CUSTOM = 'CUSTOM',
}

export enum IntegrationStatus {
  DISCONNECTED = 'DISCONNECTED',
  CONNECTING = 'CONNECTING',
  CONNECTED = 'CONNECTED',
  ERROR = 'ERROR',
  PAUSED = 'PAUSED',
}

export enum SyncDirection {
  INBOUND = 'INBOUND', // External -> WMS
  OUTBOUND = 'OUTBOUND', // WMS -> External
  BIDIRECTIONAL = 'BIDIRECTIONAL',
}

export enum SyncFrequency {
  REAL_TIME = 'REAL_TIME',
  EVERY_5_MINUTES = 'EVERY_5_MINUTES',
  EVERY_15_MINUTES = 'EVERY_15_MINUTES',
  EVERY_30_MINUTES = 'EVERY_30_MINUTES',
  HOURLY = 'HOURLY',
  EVERY_2_HOURS = 'EVERY_2_HOURS',
  EVERY_6_HOURS = 'EVERY_6_HOURS',
  DAILY = 'DAILY',
  CUSTOM = 'CUSTOM',
}

export enum WebhookEventType {
  ORDER_CREATED = 'ORDER_CREATED',
  ORDER_UPDATED = 'ORDER_UPDATED',
  ORDER_CANCELLED = 'ORDER_CANCELLED',
  INVENTORY_UPDATED = 'INVENTORY_UPDATED',
  PRODUCT_CREATED = 'PRODUCT_CREATED',
  PRODUCT_UPDATED = 'PRODUCT_UPDATED',
  SHIPMENT_CREATED = 'SHIPMENT_CREATED',
  SHIPMENT_DELIVERED = 'SHIPMENT_DELIVERED',
  TRACKING_UPDATED = 'TRACKING_UPDATED',
}

export enum ApiAuthType {
  API_KEY = 'API_KEY',
  OAUTH2 = 'OAUTH2',
  BASIC_AUTH = 'BASIC_AUTH',
  BEARER_TOKEN = 'BEARER_TOKEN',
  HMAC = 'HMAC',
  NONE = 'NONE',
}

export enum SyncStatus {
  PENDING = 'PENDING',
  RUNNING = 'RUNNING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
  PARTIAL = 'PARTIAL',
}

// ============================================================================
// INTERFACES
// ============================================================================

/**
 * Base integration configuration
 */
export interface Integration {
  integrationId: string;
  name: string;
  description: string;
  type: IntegrationType;
  provider: IntegrationProvider;
  status: IntegrationStatus;
  configuration: IntegrationConfig;
  syncSettings: SyncSettings;
  webhookSettings?: WebhookSettings;
  enabled: boolean;
  createdBy: string;
  createdAt: Date;
  updatedBy?: string;
  updatedAt?: Date;
  lastSyncAt?: Date;
  lastError?: string;
}

/**
 * Known integration providers
 */
export enum IntegrationProvider {
  // ERP Systems
  SAP = 'SAP',
  ORACLE = 'ORACLE',
  NETSUITE = 'NETSUITE',
  MICROSOFT_DYNAMICS = 'MICROSOFT_DYNAMICS',
  QUICKBOOKS = 'QUICKBOOKS',
  XERO = 'XERO',

  // E-commerce
  SHOPIFY = 'SHOPIFY',
  WOOCOMMERCE = 'WOOCOMMERCE',
  MAGENTO = 'MAGENTO',
  BIGCOMMERCE = 'BIGCOMMERCE',
  SALESFORCE_COMMERCE = 'SALESFORCE_COMMERCE',
  AMAZON = 'AMAZON',
  EBAY = 'EBAY',

  // Carriers
  FEDEX = 'FEDEX',
  UPS = 'UPS',
  DHL = 'DHL',
  USPS = 'USPS',
  ONTRAC = 'ONTRAC',

  // Payment
  STRIPE = 'STRIPE',
  PAYPAL = 'PAYPAL',
  SQUARE = 'SQUARE',

  // Custom
  CUSTOM = 'CUSTOM',
}

/**
 * Integration configuration (provider-specific)
 */
export interface IntegrationConfig {
  auth: AuthConfig;
  baseUrl?: string;
  apiVersion?: string;
  timeoutMs?: number;
  retryAttempts?: number;
  retryDelayMs?: number;
  customHeaders?: Record<string, string>;
  customSettings?: Record<string, unknown>;
}

/**
 * Authentication configuration
 */
export interface AuthConfig {
  type: ApiAuthType;
  // For API Key
  apiKey?: string;
  apiKeyName?: string;
  // For OAuth2
  clientId?: string;
  clientSecret?: string;
  accessToken?: string;
  refreshToken?: string;
  tokenUrl?: string;
  scope?: string;
  // For Basic Auth
  username?: string;
  password?: string;
  // For Bearer Token
  bearerToken?: string;
  // For HMAC
  apiKeyHmac?: string;
  secretKeyHmac?: string;
}

/**
 * Synchronization settings
 */
export interface SyncSettings {
  direction: SyncDirection;
  frequency: SyncFrequency;
  syncInventory: boolean;
  syncOrders: boolean;
  syncProducts: boolean;
  syncShipments: boolean;
  syncTracking: boolean;
  // For custom frequency
  cronExpression?: string;
  // Sync time range
  syncStartTime?: string; // HH:MM format
  syncEndTime?: string; // HH:MM format
  // Field mappings
  fieldMappings: FieldMapping[];
  // Data filters
  dataFilters?: DataFilter[];
}

/**
 * Field mapping between WMS and external system
 */
export interface FieldMapping {
  wmsField: string;
  externalField: string;
  transformType?: 'NONE' | 'UPPERCASE' | 'LOWERCASE' | 'TRIM' | 'CUSTOM';
  transformFunction?: string; // For custom transforms
  required: boolean;
  defaultValue?: unknown;
}

/**
 * Data filter for selective sync
 */
export interface DataFilter {
  field: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than' | 'in';
  value: unknown;
}

/**
 * Webhook settings for receiving external updates
 */
export interface WebhookSettings {
  enabled: boolean;
  endpointUrl?: string; // Our endpoint that external system calls
  secretKey?: string; // For webhook signature verification
  subscribedEvents: WebhookEventType[];
  lastReceivedAt?: Date;
}

/**
 * Sync job execution record
 */
export interface SyncJob {
  jobId: string;
  integrationId: string;
  syncType: 'FULL' | 'INCREMENTAL';
  direction: SyncDirection;
  status: SyncStatus;
  startedAt: Date;
  completedAt?: Date;
  startedBy: string;
  recordsProcessed: number;
  recordsSucceeded: number;
  recordsFailed: number;
  errorMessage?: string;
  logEntries: SyncLogEntry[];
}

/**
 * Individual sync log entry
 */
export interface SyncLogEntry {
  logId: string;
  timestamp: Date;
  level: 'INFO' | 'WARN' | 'ERROR' | 'DEBUG';
  message: string;
  entityType?: string;
  entityId?: string;
  externalId?: string;
  errorDetails?: unknown;
}

/**
 * Webhook event received from external system
 */
export interface WebhookEvent {
  eventId: string;
  integrationId: string;
  eventType: WebhookEventType;
  payload: unknown;
  receivedAt: Date;
  processedAt?: Date;
  status: 'PENDING' | 'PROCESSED' | 'FAILED';
  processingAttempts: number;
  errorMessage?: string;
}

// ============================================================================
// CARRIER-SPECIFIC TYPES
// ============================================================================

export interface CarrierAccount {
  accountId: string;
  carrier: IntegrationProvider;
  accountNumber: string;
  accountName: string;
  isActive: boolean;
  services: CarrierService[];
  configuredServices: string[];
  createdAt: Date;
}

export interface CarrierService {
  serviceCode: string;
  serviceName: string;
  description: string;
  domestic: boolean;
  international: boolean;
  requiresDimensions: boolean;
  requiresWeight: boolean;
}

export interface ShipmentRateRequest {
  carrier: IntegrationProvider;
  accountId: string;
  serviceCode?: string;
  originAddress: Address;
  destinationAddress: Address;
  packages: Package[];
  weightUnit: 'LB' | 'KG' | 'OZ' | 'G';
  dimensionUnit: 'IN' | 'CM';
  shipmentDate?: Date;
  isResidential: boolean;
  signatureRequired: boolean;
  insuranceValue?: number;
}

export interface ShipmentRate {
  carrier: IntegrationProvider;
  serviceName: string;
  serviceCode: string;
  totalCharge: number;
  currency: string;
  estimatedDeliveryDate?: Date;
  transitDays?: number;
  guaranteed: boolean;
}

export interface ShipmentLabelRequest {
  carrier: IntegrationProvider;
  accountId: string;
  serviceCode: string;
  shipment: ShipmentDetails;
  labelFormat: 'PDF' | 'PNG' | 'ZPL';
  requestedAt: Date;
}

export interface ShipmentDetails {
  trackingNumber?: string;
  originAddress: Address;
  destinationAddress: Address;
  packages: Package[];
  weightUnit: 'LB' | 'KG' | 'OZ' | 'G';
  dimensionUnit: 'IN' | 'CM';
  referenceFields?: Record<string, string>;
  specialServices?: string[];
  insuranceValue?: number;
}

export interface ShipmentLabel {
  trackingNumber: string;
  labelData: string; // Base64 encoded label
  labelFormat: string;
  carrier: IntegrationProvider;
  serviceCode: string;
  totalCharge: number;
  currency: string;
  createdAt: Date;
}

export interface Package {
  packageCode: string;
  weight: number;
  length?: number;
  width?: number;
  height?: number;
  description?: string;
  insuredValue?: number;
  insuranceCode?: string;
}

export interface Address {
  name: string;
  company?: string;
  street1: string;
  street2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  phone?: string;
  email?: string;
  isResidential: boolean;
}

export interface TrackingInfo {
  trackingNumber: string;
  carrier: IntegrationProvider;
  status: 'IN_TRANSIT' | 'DELIVERED' | 'EXCEPTION' | 'PENDING';
  estimatedDelivery?: Date;
  actualDelivery?: Date;
  trackingEvents: TrackingEvent[];
}

export interface TrackingEvent {
  eventDate: Date;
  eventDescription: string;
  eventCode?: string;
  location?: string;
  statusCode?: string;
}
