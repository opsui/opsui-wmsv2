/**
 * Mock for @opsui/shared package
 *
 * This mock provides default implementations for the shared utilities
 * to allow Jest tests to run without loading the actual ES module dist files.
 */

// ============================================================================
// ENUMS
// ============================================================================

export enum OrderStatus {
  PENDING = 'PENDING',
  PICKING = 'PICKING',
  PICKED = 'PICKED',
  PACKING = 'PACKING',
  PACKED = 'PACKED',
  SHIPPED = 'SHIPPED',
  CANCELLED = 'CANCELLED',
  BACKORDER = 'BACKORDER',
}

export enum OrderPriority {
  LOW = 'LOW',
  NORMAL = 'NORMAL',
  HIGH = 'HIGH',
  URGENT = 'URGENT',
}

export enum OrderItemStatus {
  PENDING = 'PENDING',
  PARTIAL_PICKED = 'PARTIAL_PICKED',
  FULLY_PICKED = 'FULLY_PICKED',
}

export enum TaskStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  SKIPPED = 'SKIPPED',
}

export enum UserRole {
  PICKER = 'PICKER',
  PACKER = 'PACKER',
  STOCK_CONTROLLER = 'STOCK_CONTROLLER',
  INWARDS = 'INWARDS',
  SUPERVISOR = 'SUPERVISOR',
  ADMIN = 'ADMIN',
  PRODUCTION = 'PRODUCTION',
  SALES = 'SALES',
  MAINTENANCE = 'MAINTENANCE',
  RMA = 'RMA',
}

export enum BinType {
  SHELF = 'SHELF',
  FLOOR = 'FLOOR',
  RACK = 'RACK',
  BIN = 'BIN',
}

export enum TransactionType {
  RESERVATION = 'RESERVATION',
  DEDUCTION = 'DEDUCTION',
  CANCELLATION = 'CANCELLATION',
  ADJUSTMENT = 'ADJUSTMENT',
  RECEIPT = 'RECEIPT',
}

export enum ASNStatus {
  PENDING = 'PENDING',
  IN_TRANSIT = 'IN_TRANSIT',
  RECEIVED = 'RECEIVED',
  PARTIALLY_RECEIVED = 'PARTIALLY_RECEIVED',
  CANCELLED = 'CANCELLED',
}

export enum ASNLineStatus {
  PENDING = 'PENDING',
  PARTIALLY_RECEIVED = 'PARTIALLY_RECEIVED',
  FULLY_RECEIVED = 'FULLY_RECEIVED',
  CANCELLED = 'CANCELLED',
}

export enum ReceiptType {
  PO = 'PO',
  RETURN = 'RETURN',
  TRANSFER = 'TRANSFER',
  ADJUSTMENT = 'ADJUSTMENT',
}

export enum ReceiptStatus {
  RECEIVING = 'RECEIVING',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export enum QualityStatus {
  PENDING = 'PENDING',
  PASSED = 'PASSED',
  FAILED = 'FAILED',
  PARTIAL = 'PARTIAL',
}

export enum InspectionStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  PASSED = 'PASSED',
  FAILED = 'FAILED',
  PARTIAL = 'PARTIAL',
}

export enum InspectionType {
  INCOMING = 'INCOMING',
  OUTGOING = 'OUTGOING',
  INVENTORY = 'INVENTORY',
  QUALITY_HOLD = 'QUALITY_HOLD',
}

export enum DefectType {
  DAMAGED = 'DAMAGED',
  DEFECTIVE = 'DEFECTIVE',
  MISSING_PARTS = 'MISSING_PARTS',
  WRONG_ITEM = 'WRONG_ITEM',
}

export enum DispositionAction {
  RETURN_TO_VENDOR = 'RETURN_TO_VENDOR',
  SCRAP = 'SCRAP',
  REWORK = 'REWORK',
  QUARANTINE = 'QUARANTINE',
  SELL_AS_IS = 'SELL_AS_IS',
  DISCOUNT = 'DISCOUNT',
}

export enum PutawayStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export enum ShipmentStatus {
  PENDING = 'PENDING',
  LABEL_CREATED = 'LABEL_CREATED',
  SHIPPED = 'SHIPPED',
  IN_TRANSIT = 'IN_TRANSIT',
  OUT_FOR_DELIVERY = 'OUT_FOR_DELIVERY',
  DELIVERED = 'DELIVERED',
  EXCEPTION = 'EXCEPTION',
  CANCELLED = 'CANCELLED',
}

export enum CycleCountStatus {
  SCHEDULED = 'SCHEDULED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  RECONCILED = 'RECONCILED',
}

export enum CycleCountType {
  ABC = 'ABC',
  BLANKET = 'BLANKET',
  SPOT_CHECK = 'SPOT_CHECK',
  RECEIVING = 'RECEIVING',
  SHIPPING = 'SHIPPING',
  AD_HOC = 'AD_HOC',
}

export enum VarianceStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  AUTO_ADJUSTED = 'AUTO_ADJUSTED',
}

export enum CapacityType {
  WEIGHT = 'WEIGHT',
  VOLUME = 'VOLUME',
  QUANTITY = 'QUANTITY',
}

export enum CapacityUnit {
  LBS = 'LBS',
  KG = 'KG',
  CUBIC_FT = 'CUBIC_FT',
  CUBIC_M = 'CUBIC_M',
  UNITS = 'UNITS',
  PALLET = 'PALLET',
}

export enum CapacityRuleStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  WARNING = 'WARNING',
  EXCEEDED = 'EXCEEDED',
}

export enum ExceptionType {
  UNCLAIM = 'UNCLAIM',
  UNDO_PICK = 'UNDO_PICK',
  SHORT_PICK = 'SHORT_PICK',
  SHORT_PICK_BACKORDER = 'SHORT_PICK_BACKORDER',
  DAMAGE = 'DAMAGE',
  DEFECTIVE = 'DEFECTIVE',
  WRONG_ITEM = 'WRONG_ITEM',
  SUBSTITUTION = 'SUBSTITUTION',
  OUT_OF_STOCK = 'OUT_OF_STOCK',
  BIN_MISMATCH = 'BIN_MISMATCH',
}

export enum ExceptionStatus {
  OPEN = 'OPEN',
  REVIEWING = 'REVIEWING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  RESOLVED = 'RESOLVED',
  CANCELLED = 'CANCELLED',
}

export enum ExceptionResolution {
  BACKORDER = 'BACKORDER',
  SUBSTITUTE = 'SUBSTITUTE',
  CANCEL_ITEM = 'CANCEL_ITEM',
  CANCEL_ORDER = 'CANCEL_ORDER',
  ADJUST_QUANTITY = 'ADJUST_QUANTITY',
  RETURN_TO_STOCK = 'RETURN_TO_STOCK',
  WRITE_OFF = 'WRITE_OFF',
  TRANSFER_BIN = 'TRANSFER_BIN',
  CONTACT_CUSTOMER = 'CONTACT_CUSTOMER',
  MANUAL_OVERRIDE = 'MANUAL_OVERRIDE',
}

export enum AutomationTaskType {
  CYCLE_COUNT = 'CYCLE_COUNT',
  INVENTORY_CHECK = 'INVENTORY_CHECK',
  PICK = 'PICK',
  PUTAWAY = 'PUTAWAY',
  REPLENISHMENT = 'REPLENISHMENT',
}

export enum AutomationTaskStatus {
  PENDING = 'PENDING',
  ASSIGNED = 'ASSIGNED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
}

export enum UnitLevel {
  PALLET = 'PALLET',
  CASE = 'CASE',
  EACH = 'EACH',
}

// Reporting types
export enum ReportType {
  INVENTORY = 'INVENTORY',
  ORDERS = 'ORDERS',
  SHIPPING = 'SHIPPING',
  RECEIVING = 'RECEIVING',
  PICKING_PERFORMANCE = 'PICKING_PERFORMANCE',
  PACKING_PERFORMANCE = 'PACKING_PERFORMANCE',
  CYCLE_COUNTS = 'CYCLE_COUNTS',
  LOCATION_UTILIZATION = 'LOCATION_UTILIZATION',
  USER_PERFORMANCE = 'USER_PERFORMANCE',
  CUSTOM = 'CUSTOM',
}

export enum ReportFormat {
  PDF = 'PDF',
  EXCEL = 'EXCEL',
  CSV = 'CSV',
  HTML = 'HTML',
  JSON = 'JSON',
}

export enum ReportStatus {
  DRAFT = 'DRAFT',
  SCHEDULED = 'SCHEDULED',
  RUNNING = 'RUNNING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
}

export enum ScheduleFrequency {
  ON_DEMAND = 'ON_DEMAND',
  HOURLY = 'HOURLY',
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY',
  MONTHLY = 'MONTHLY',
  QUARTERLY = 'QUARTERLY',
  YEARLY = 'YEARLY',
}

export enum ChartType {
  TABLE = 'TABLE',
  BAR = 'BAR',
  LINE = 'LINE',
  PIE = 'PIE',
  AREA = 'AREA',
  SCATTER = 'SCATTER',
  GAUGE = 'GAUGE',
  HEATMAP = 'HEATMAP',
}

export enum AggregationType {
  COUNT = 'COUNT',
  SUM = 'SUM',
  AVG = 'AVG',
  MIN = 'MIN',
  MAX = 'MAX',
  DISTINCT_COUNT = 'DISTINCT_COUNT',
  MEDIAN = 'MEDIAN',
  PERCENTILE = 'PERCENTILE',
}

// Sales & CRM enums
export enum CustomerStatus {
  PROSPECT = 'PROSPECT',
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  BLOCKED = 'BLOCKED',
}

export enum LeadStatus {
  NEW = 'NEW',
  CONTACTED = 'CONTACTED',
  QUALIFIED = 'QUALIFIED',
  PROPOSAL = 'PROPOSAL',
  NEGOTIATION = 'NEGOTIATION',
  WON = 'WON',
  LOST = 'LOST',
}

export enum LeadPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  URGENT = 'URGENT',
}

export enum OpportunityStage {
  PROSPECTING = 'PROSPECTING',
  QUALIFICATION = 'QUALIFICATION',
  PROPOSAL = 'PROPOSAL',
  NEGOTIATION = 'NEGOTIATION',
  CLOSED_WON = 'CLOSED_WON',
  CLOSED_LOST = 'CLOSED_LOST',
}

export enum QuoteStatus {
  DRAFT = 'DRAFT',
  SENT = 'SENT',
  ACCEPTED = 'ACCEPTED',
  REJECTED = 'REJECTED',
  EXPIRED = 'EXPIRED',
}

// Permission enum - common permissions
export enum Permission {
  VIEW_ORDERS = 'view_orders',
  CREATE_ORDERS = 'create_orders',
  EDIT_ORDERS = 'edit_orders',
  DELETE_ORDERS = 'delete_orders',
  ASSIGN_ORDERS = 'assign_orders',
  VIEW_PICK_TASKS = 'view_pick_tasks',
  CLAIM_PICK_TASK = 'claim_pick_task',
  COMPLETE_PICK_TASK = 'complete_pick_task',
  SKIP_PICK_TASK = 'skip_pick_task',
  VIEW_INVENTORY = 'view_inventory',
  ADJUST_INVENTORY = 'adjust_inventory',
}

export enum LabelFormat {
  PDF = 'PDF',
  PNG = 'PNG',
  ZPLII = 'ZPLII',
  EPL2 = 'EPL2',
}

export enum NZCLabelFormat {
  PNG_100X175 = 'LABEL_PNG_100X175',
  PNG_100X150 = 'LABEL_PNG_100X150',
  PDF_100X175 = 'LABEL_PDF_100X175',
  PDF = 'LABEL_PDF',
}

// User type for authentication and user management
export interface User {
  userId: string;
  email: string;
  name: string;
  role: UserRole;
  activeRole?: UserRole | null;
  additionalRoles?: UserRole[];
  active: boolean;
  createdAt: Date;
  lastLoginAt?: Date;
  deletedAt?: Date;
  password?: string; // For password hashing in tests
  currentTaskId?: string;
}

// ============================================================================
// MOCK FUNCTIONS
// ============================================================================

// Mock validators - simple implementations that pass by default
export const validateOrderItems = jest.fn(() => ({ valid: true, errors: [] }));
export const validateSKU = jest.fn(() => ({ valid: true, errors: [] }));
export const validateBinLocation = jest.fn(() => ({ valid: true, errors: [] }));
export const validateQuantity = jest.fn(() => ({ valid: true, errors: [] }));

// Mock generators - use counter for predictable values
let idCounter = 1;
export const generateId = jest.fn(() => `test-id-${String(idCounter++).padStart(3, '0')}`);
let skuCounter = 1;
export const generateSKU = jest.fn(() => `TEST-SKU-${String(skuCounter++).padStart(3, '0')}`);
let orderIdCounter = 1;
export const generateOrderId = jest.fn(() => `ORD-${String(orderIdCounter++).padStart(3, '0')}`);

// Helper to reset counters - call this in beforeEach if needed
export function resetGeneratorMocks() {
  idCounter = 1;
  skuCounter = 1;
  orderIdCounter = 1;
}

// Mock system constants
export const WAREHOUSE_ZONES = ['A', 'B', 'C', 'D'];
export const PICK_PRIORITIES = ['CRITICAL', 'HIGH', 'NORMAL', 'LOW'];
export const ORDER_STATUSES = ['PENDING', 'PICKING', 'PICKED', 'PACKED', 'SHIPPED'];

// Mock workflow guardrails
export const checkWorkflowGuardrails = jest.fn(() => ({ allowed: true, violations: [] }));
export const recordWorkflowAction = jest.fn(() => ({ success: true }));

// Mock invariants
export const checkInventoryInvariant = jest.fn(() => ({ holds: true, violation: undefined }));
export const checkOrderInvariant = jest.fn(() => ({ holds: true, violation: undefined }));

// ============================================================================
// ERROR CLASSES
// ============================================================================

/**
 * Base WMS Error class for mocking
 */
export class WMSError extends Error {
  constructor(
    public code: string,
    public statusCode: number,
    message: string,
    public details?: unknown
  ) {
    super(message);
    this.name = 'WMSError';
  }
}

/**
 * Inventory Error - thrown when inventory operations fail
 */
export class InventoryError extends WMSError {
  constructor(message: string, details?: unknown) {
    super('INVENTORY_ERROR', 409, message, details);
  }
}

/**
 * Validation Error - thrown when input validation fails
 */
export class ValidationError extends WMSError {
  constructor(message: string, details?: unknown) {
    super('VALIDATION_ERROR', 400, message, details);
  }
}

/**
 * Not Found Error - thrown when a resource is not found
 */
export class NotFoundError extends WMSError {
  constructor(resource: string, id?: string) {
    super('NOT_FOUND', 404, `${resource}${id !== undefined ? ` (${id})` : ''} not found`);
  }
}

/**
 * Conflict Error - thrown when there's a conflict with existing data
 */
export class ConflictError extends WMSError {
  constructor(message: string, details?: unknown) {
    super('CONFLICT', 409, message, details);
  }
}

/**
 * Unauthorized Error - thrown when authentication is required but missing
 */
export class UnauthorizedError extends WMSError {
  constructor(message: string = 'Unauthorized') {
    super('UNAUTHORIZED', 401, message);
  }
}

/**
 * Forbidden Error - thrown when user lacks permission
 */
export class ForbiddenError extends WMSError {
  constructor(message: string = 'Forbidden') {
    super('FORBIDDEN', 403, message);
  }
}

// ============================================================================
// SALES & CRM TYPES
// ============================================================================

export interface Address {
  street1: string;
  street2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

export interface Customer {
  customerId: string;
  customerNumber: string;
  companyName: string;
  contactName?: string;
  email?: string;
  phone?: string;
  billingAddress: Address;
  shippingAddress?: Address;
  status: CustomerStatus;
  taxId?: string;
  paymentTerms?: string;
  creditLimit?: number;
  accountBalance?: number;
  notes?: string;
  assignedTo?: string;
  createdAt: Date;
  createdBy: string;
  updatedAt?: Date;
  updatedBy?: string;
  lastContactDate?: Date;
}

export interface Lead {
  leadId: string;
  customerName: string;
  contactName?: string;
  email?: string;
  phone?: string;
  company?: string;
  status: LeadStatus;
  priority: LeadPriority;
  estimatedValue?: number;
  source: string;
  description?: string;
  assignedTo: string;
  expectedCloseDate?: Date;
  createdAt: Date;
  createdBy: string;
  updatedAt?: Date;
  updatedBy?: string;
  lastContactDate?: Date;
  nextFollowUpDate?: Date;
}

export interface Opportunity {
  opportunityId: string;
  opportunityNumber: string;
  customerId?: string;
  name: string;
  stage: OpportunityStage;
  amount: number;
  probability: number;
  expectedCloseDate: Date;
  description?: string;
  assignedTo: string;
  source: string;
  competitor?: string;
  lostReason?: string;
  createdAt: Date;
  createdBy: string;
  updatedAt?: Date;
  updatedBy?: string;
  closedAt?: Date;
  closedBy?: string;
}

export interface QuoteLineItem {
  lineItemId: string;
  quoteId: string;
  sku: string;
  description: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  taxRate: number;
  lineNumber: number;
  total: number;
}

export interface Quote {
  quoteId: string;
  quoteNumber: string;
  customerId: string;
  opportunityId?: string;
  status: QuoteStatus;
  validUntil: Date;
  lineItems: QuoteLineItem[];
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  totalAmount: number;
  notes?: string;
  termsAndConditions?: string;
  createdAt: Date;
  createdBy: string;
  updatedAt?: Date;
  updatedBy?: string;
  sentAt?: Date;
  acceptedAt?: Date;
  rejectedAt?: Date;
  convertedToOrderId?: string;
}

export interface CustomerInteraction {
  interactionId: string;
  customerId?: string;
  leadId?: string;
  opportunityId?: string;
  interactionType: 'CALL' | 'EMAIL' | 'MEETING' | 'NOTE' | 'OTHER';
  subject: string;
  notes: string;
  durationMinutes?: number;
  nextFollowUpDate?: Date;
  createdAt: Date;
  createdBy: string;
}

export interface CreateCustomerDTO {
  companyName: string;
  contactName?: string;
  email?: string;
  phone?: string;
  billingAddress: Address;
  shippingAddress?: Address;
  taxId?: string;
  paymentTerms?: string;
  creditLimit?: number;
  notes?: string;
  assignedTo?: string;
}

export interface CreateLeadDTO {
  customerName: string;
  contactName?: string;
  email?: string;
  phone?: string;
  company?: string;
  source: string;
  estimatedValue?: number;
  description?: string;
  assignedTo: string;
  expectedCloseDate?: string;
}

export interface CreateOpportunityDTO {
  customerId?: string;
  name: string;
  amount: number;
  expectedCloseDate: string;
  stage: OpportunityStage;
  probability?: number;
  source: string;
  description?: string;
  assignedTo: string;
}

export interface CreateQuoteDTO {
  customerId: string;
  opportunityId?: string;
  validUntil: string;
  lineItems: Omit<QuoteLineItem, 'lineItemId' | 'quoteId' | 'total'>[];
  notes?: string;
  termsAndConditions?: string;
}

// Notifications types (for completeness)
export enum NotificationType {
  INFO = 'INFO',
  SUCCESS = 'SUCCESS',
  WARNING = 'WARNING',
  ERROR = 'ERROR',
}

export enum NotificationPriority {
  LOW = 'LOW',
  NORMAL = 'NORMAL',
  HIGH = 'HIGH',
  URGENT = 'URGENT',
}

export interface PushParams {
  userId: string;
  title: string;
  message: string;
  data?: Record<string, unknown>;
}

export interface SMSParams {
  to: string;
  message: string;
  from?: string;
}

export interface EmailParams {
  to: string;
  subject: string;
  html: string;
  from?: string;
}

// ============================================================================
// INTEGRATIONS TYPES
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

export enum IntegrationProvider {
  SAP = 'SAP',
  ORACLE = 'ORACLE',
  NETSUITE = 'NETSUITE',
  MICROSOFT_DYNAMICS = 'MICROSOFT_DYNAMICS',
  QUICKBOOKS = 'QUICKBOOKS',
  XERO = 'XERO',
  SHOPIFY = 'SHOPIFY',
  WOOCOMMERCE = 'WOOCOMMERCE',
  MAGENTO = 'MAGENTO',
  BIGCOMMERCE = 'BIGCOMMERCE',
  SALESFORCE_COMMERCE = 'SALESFORCE_COMMERCE',
  AMAZON = 'AMAZON',
  EBAY = 'EBAY',
  FEDEX = 'FEDEX',
  UPS = 'UPS',
  DHL = 'DHL',
  USPS = 'USPS',
  ONTRAC = 'ONTRAC',
  STRIPE = 'STRIPE',
  PAYPAL = 'PAYPAL',
  SQUARE = 'SQUARE',
  CUSTOM = 'CUSTOM',
}

export enum SyncDirection {
  INBOUND = 'INBOUND',
  OUTBOUND = 'OUTBOUND',
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

export enum SyncStatus {
  PENDING = 'PENDING',
  RUNNING = 'RUNNING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
  PARTIAL = 'PARTIAL',
}

export enum ApiAuthType {
  API_KEY = 'API_KEY',
  OAUTH2 = 'OAUTH2',
  BASIC_AUTH = 'BASIC_AUTH',
  BEARER_TOKEN = 'BEARER_TOKEN',
  HMAC = 'HMAC',
  NONE = 'NONE',
}

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

export interface AuthConfig {
  type: ApiAuthType;
  apiKey?: string;
  apiKeyName?: string;
  clientId?: string;
  clientSecret?: string;
  accessToken?: string;
  refreshToken?: string;
  tokenUrl?: string;
  scope?: string;
  username?: string;
  password?: string;
  bearerToken?: string;
  apiKeyHmac?: string;
  secretKeyHmac?: string;
  secretKey?: string;
  host?: string;
  port?: number;
  service?: string;
  client?: string;
  shopDomain?: string;
  storeUrl?: string;
  consumerKey?: string;
  consumerSecret?: string;
  apiToken?: string;
  accessLicenseNumber?: string;
  accountNumber?: string;
  siteId?: string;
  userId?: string;
}

export interface SyncSettings {
  direction: SyncDirection;
  frequency: SyncFrequency;
  syncInventory: boolean;
  syncOrders: boolean;
  syncProducts: boolean;
  syncShipments: boolean;
  syncTracking: boolean;
  cronExpression?: string;
  syncStartTime?: string;
  syncEndTime?: string;
  fieldMappings: FieldMapping[];
  dataFilters?: DataFilter[];
}

export interface FieldMapping {
  wmsField: string;
  externalField: string;
  transformType?: 'NONE' | 'UPPERCASE' | 'LOWERCASE' | 'TRIM' | 'CUSTOM';
  transformFunction?: string;
  required: boolean;
  defaultValue?: unknown;
}

export interface DataFilter {
  field: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than' | 'in';
  value: unknown;
}

export interface WebhookSettings {
  enabled: boolean;
  endpointUrl?: string;
  secretKey?: string;
  subscribedEvents: WebhookEventType[];
  lastReceivedAt?: Date;
}

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

// ============================================================================
// BUSINESS RULES TYPES
// ============================================================================

export enum RuleType {
  ALLOCATION = 'ALLOCATION',
  PICKING = 'PICKING',
  SHIPPING = 'SHIPPING',
  INVENTORY = 'INVENTORY',
  PRICING = 'PRICING',
  VALIDATION = 'VALIDATION',
  NOTIFICATION = 'NOTIFICATION',
}

export enum RuleStatus {
  DRAFT = 'DRAFT',
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  ARCHIVED = 'ARCHIVED',
}

export enum ConditionOperator {
  EQUALS = 'EQUALS',
  NOT_EQUALS = 'NOT_EQUALS',
  GREATER_THAN = 'GREATER_THAN',
  LESS_THAN = 'LESS_THAN',
  GREATER_THAN_OR_EQUAL = 'GREATER_THAN_OR_EQUAL',
  LESS_THAN_OR_EQUAL = 'LESS_THAN_OR_EQUAL',
  CONTAINS = 'CONTAINS',
  NOT_CONTAINS = 'NOT_CONTAINS',
  STARTS_WITH = 'STARTS_WITH',
  ENDS_WITH = 'ENDS_WITH',
  IN = 'IN',
  NOT_IN = 'NOT_IN',
  BETWEEN = 'BETWEEN',
  IS_NULL = 'IS_NULL',
  IS_NOT_NULL = 'IS_NOT_NULL',
  MATCHES_REGEX = 'MATCHES_REGEX',
}

export enum LogicalOperator {
  AND = 'AND',
  OR = 'OR',
}

export enum ActionType {
  SET_PRIORITY = 'SET_PRIORITY',
  ALLOCATE_LOCATION = 'ALLOCATE_LOCATION',
  ASSIGN_USER = 'ASSIGN_USER',
  SEND_NOTIFICATION = 'SEND_NOTIFICATION',
  CALCULATE_FIELD = 'CALCULATE_FIELD',
  BLOCK_ACTION = 'BLOCK_ACTION',
  REQUIRE_APPROVAL = 'REQUIRE_APPROVAL',
  UPDATE_INVENTORY = 'UPDATE_INVENTORY',
  CREATE_TASK = 'CREATE_TASK',
  MODIFY_FIELD = 'MODIFY_FIELD',
}

export enum RuleEventType {
  ORDER_CREATED = 'ORDER_CREATED',
  ORDER_UPDATED = 'ORDER_UPDATED',
  INVENTORY_ADDED = 'INVENTORY_ADDED',
  INVENTORY_REMOVED = 'INVENTORY_REMOVED',
  LOCATION_CAPACITY_CHANGED = 'LOCATION_CAPACITY_CHANGED',
  USER_ASSIGNED = 'USER_ASSIGNED',
  SHIPMENT_CREATED = 'SHIPMENT_CREATED',
  PICK_TASK_COMPLETED = 'PICK_TASK_COMPLETED',
}

export interface RuleCondition {
  conditionId: string;
  ruleId: string;
  field: string;
  operator: ConditionOperator;
  value: string | number | boolean | null;
  value2?: string | number | null;
  logicalOperator?: LogicalOperator;
  order: number;
}

export interface RuleAction {
  actionId: string;
  ruleId: string;
  actionType: ActionType;
  parameters: Record<string, unknown>;
  order: number;
}

export interface BusinessRule {
  ruleId: string;
  name: string;
  description: string;
  ruleType: RuleType;
  status: RuleStatus;
  priority: number;
  triggerEvents: RuleEventType[];
  conditions: RuleCondition[];
  actions: RuleAction[];
  startDate?: Date;
  endDate?: Date;
  createdBy: string;
  createdAt: Date;
  updatedBy?: string;
  updatedAt?: Date;
  version: number;
  lastExecutedAt?: Date;
  executionCount: number;
}

export interface RuleExecutionLog {
  logId: string;
  ruleId: string;
  eventType: RuleEventType;
  entityId: string;
  entityType: string;
  triggeredAt: Date;
  triggeredBy: string;
  conditionsMet: boolean;
  executionResults: RuleActionResult[];
  executionTimeMs: number;
  errorMessage?: string;
}

export interface RuleActionResult {
  actionId: string;
  actionType: ActionType;
  success: boolean;
  result?: unknown;
  errorMessage?: string;
}

export interface RuleTemplate {
  templateId: string;
  name: string;
  description: string;
  ruleType: RuleType;
  category: string;
  conditions: Omit<RuleCondition, 'ruleId' | 'conditionId' | 'order'>[];
  actions: Omit<RuleAction, 'ruleId' | 'actionId' | 'order'>[];
  isSystemTemplate: boolean;
  createdAt: Date;
}

export enum AllocationStrategy {
  FIFO = 'FIFO',
  LIFO = 'LIFO',
  FEFO = 'FEFO',
  LEAST_PICKS = 'LEAST_PICKS',
  ZONE_PICKING = 'ZONE_PICKING',
  WAVE_PICKING = 'WAVE_PICKING',
  BULK_PICKING = 'BULK_PICKING',
}

export interface AllocationRule {
  ruleId: string;
  name: string;
  description: string;
  status: RuleStatus;
  priority: number;
  strategy: AllocationStrategy;
  conditions: RuleCondition[];
  allowPartialAllocation: boolean;
  reserveInventory: boolean;
  maxLocationsPerItem: number;
  preferSameZone: boolean;
  consolidateInventory: boolean;
  createdBy: string;
  createdAt: Date;
  updatedBy?: string;
  updatedAt?: Date;
}

export interface AllocationResult {
  allocationId: string;
  orderId: string;
  items: ItemAllocation[];
  allocatedAt: Date;
  allocatedBy: string;
  rulesApplied: string[];
  totalLocationsUsed: number;
}

export interface ItemAllocation {
  orderItemId: string;
  sku: string;
  quantityRequested: number;
  quantityAllocated: number;
  allocations: LocationAllocation[];
  status: 'FULLY_ALLOCATED' | 'PARTIALLY_ALLOCATED' | 'NOT_ALLOCATED';
}

export interface LocationAllocation {
  location: string;
  quantity: number;
  lotNumber?: string;
  expiryDate?: Date;
}

// ============================================================================
// AUTOMATION TYPES (RFID only - other types defined elsewhere in file)
// ============================================================================

export interface RFIDTag {
  tagId: string;
  epc: string;
  sku?: string;
  binLocation?: string;
  lastScanned?: Date;
  scanCount: number;
}

export interface RFIDScanResult {
  tags: RFIDTag[];
  scanDuration: number;
  scanLocation: string;
  scannedBy: string;
  scannedAt: Date;
}

// ============================================================================
// MAINTENANCE & ASSETS TYPES
// ============================================================================

export enum AssetStatus {
  OPERATIONAL = 'OPERATIONAL',
  IN_MAINTENANCE = 'IN_MAINTENANCE',
  OUT_OF_SERVICE = 'OUT_OF_SERVICE',
  RETIRED = 'RETIRED',
}

export enum AssetType {
  MACHINERY = 'MACHINERY',
  VEHICLE = 'VEHICLE',
  EQUIPMENT = 'EQUIPMENT',
  FACILITY = 'FACILITY',
  TOOL = 'TOOL',
  OTHER = 'OTHER',
}

export enum MaintenanceStatus {
  SCHEDULED = 'SCHEDULED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  OVERDUE = 'OVERDUE',
}

export enum MaintenancePriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  EMERGENCY = 'EMERGENCY',
}

export enum MaintenanceType {
  PREVENTIVE = 'PREVENTIVE',
  CORRECTIVE = 'CORRECTIVE',
  EMERGENCY = 'EMERGENCY',
  PREDICTIVE = 'PREDICTIVE',
}

export interface Asset {
  assetId: string;
  assetNumber: string;
  name: string;
  description?: string;
  type: AssetType;
  status: AssetStatus;
  serialNumber?: string;
  manufacturer?: string;
  model?: string;
  year?: number;
  purchaseDate?: Date;
  purchasePrice?: number;
  location?: string;
  assignedTo?: string;
  parentId?: string;
  warrantyExpiry?: Date;
  expectedLifespanYears?: number;
  lastMaintenanceDate?: Date;
  nextMaintenanceDate?: Date;
  notes?: string;
  createdAt: Date;
  createdBy: string;
  updatedAt?: Date;
  updatedBy?: string;
}

export interface MaintenanceSchedule {
  scheduleId: string;
  assetId: string;
  name: string;
  description?: string;
  maintenanceType: MaintenanceType;
  priority: MaintenancePriority;
  frequency: 'ONE_TIME' | 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY' | 'CUSTOM';
  intervalDays?: number;
  estimatedDurationHours: number;
  assignedTo?: string;
  partsRequired?: MaintenancePart[];
  instructions?: string;
  isActive: boolean;
  createdAt: Date;
  createdBy: string;
  updatedAt?: Date;
  updatedBy?: string;
  lastPerformedDate?: Date;
  nextDueDate: Date;
}

export interface MaintenanceWorkOrder {
  workOrderId: string;
  workOrderNumber: string;
  assetId: string;
  scheduleId?: string;
  title: string;
  description?: string;
  maintenanceType: MaintenanceType;
  priority: MaintenancePriority;
  status: MaintenanceStatus;
  scheduledDate: Date;
  scheduledStartTime?: string;
  estimatedDurationHours: number;
  assignedTo?: string;
  partsRequired?: MaintenancePart[];
  actualStartDate?: Date;
  actualEndDate?: Date;
  actualDurationHours?: number;
  workPerformed?: string;
  partsUsed?: MaintenancePart[];
  laborCost?: number;
  partsCost?: number;
  totalCost?: number;
  performedBy?: string;
  completedAt?: Date;
  completedBy?: string;
  notes?: string;
  createdAt: Date;
  createdBy: string;
  updatedAt?: Date;
  updatedBy?: string;
}

export interface MaintenancePart {
  partId: string;
  sku: string;
  description: string;
  quantityRequired: number;
  quantityUsed?: number;
  binLocation?: string;
  unitCost?: number;
}

export interface ServiceLog {
  logId: string;
  assetId: string;
  workOrderId?: string;
  serviceDate: Date;
  serviceType: string;
  description: string;
  performedBy: string;
  cost?: number;
  notes?: string;
  attachments?: string[];
  createdAt: Date;
  createdBy: string;
}

export interface MeterReading {
  readingId: string;
  assetId: string;
  meterType: string;
  value: number;
  unit: string;
  readingDate: Date;
  readBy: string;
  notes?: string;
}

export interface CreateAssetDTO {
  name: string;
  description?: string;
  type: AssetType;
  serialNumber?: string;
  manufacturer?: string;
  model?: string;
  year?: number;
  purchaseDate?: string;
  purchasePrice?: number;
  location?: string;
  assignedTo?: string;
  parentId?: string;
  warrantyExpiry?: string;
  expectedLifespanYears?: number;
  notes?: string;
}

export interface CreateMaintenanceScheduleDTO {
  assetId: string;
  name: string;
  description?: string;
  maintenanceType: MaintenanceType;
  priority: MaintenancePriority;
  frequency: 'ONE_TIME' | 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY' | 'CUSTOM';
  intervalDays?: number;
  estimatedDurationHours: number;
  assignedTo?: string;
  partsRequired?: Omit<MaintenancePart, 'partId'>[];
  instructions?: string;
  nextDueDate: string;
}

export interface CreateWorkOrderDTO {
  assetId: string;
  scheduleId?: string;
  title: string;
  description?: string;
  maintenanceType: MaintenanceType;
  priority: MaintenancePriority;
  scheduledDate: string;
  scheduledStartTime?: string;
  estimatedDurationHours: number;
  assignedTo?: string;
  partsRequired?: Omit<MaintenancePart, 'partId'>[];
}

export interface CompleteWorkOrderDTO {
  workPerformed: string;
  partsUsed?: Omit<MaintenancePart, 'partId'>[];
  actualDurationHours?: number;
  laborCost?: number;
  partsCost?: number;
  notes?: string;
}

export interface AddMeterReadingDTO {
  assetId: string;
  meterType: string;
  value: number;
  unit: string;
  readingDate: string;
  notes?: string;
}

// ============================================================================
// ORDER EXCEPTION TYPES
// ============================================================================

export interface OrderException {
  exceptionId: string;
  orderId: string;
  orderItemId: string;
  sku: string;
  type: ExceptionType;
  status: ExceptionStatus;
  resolution?: ExceptionResolution;
  quantityExpected: number;
  quantityActual: number;
  quantityShort: number;
  reason: string;
  reportedBy: string;
  reportedAt: Date;
  reviewedBy?: string;
  reviewedAt?: Date;
  resolvedBy?: string;
  resolvedAt?: Date;
  resolutionNotes?: string;
  substituteSku?: string;
  cycleCountEntryId?: string;
  cycleCountPlanId?: string;
  binLocation?: string;
  systemQuantity?: number;
  countedQuantity?: number;
  variancePercent?: number;
  varianceReasonCode?: string;
}

export interface LogExceptionDTO {
  orderId: string;
  orderItemId: string;
  sku: string;
  type: ExceptionType;
  quantityExpected: number;
  quantityActual: number;
  reason: string;
  reportedBy: string;
  substituteSku?: string;
}

export interface ResolveExceptionDTO {
  exceptionId: string;
  resolution: ExceptionResolution;
  notes?: string;
  resolvedBy: string;
  substituteSku?: string;
  newQuantity?: number;
  newBinLocation?: string;
}

// ============================================================================
// INTERLEAVED COUNT TYPES
// ============================================================================

export interface MicroCount {
  microCountId: string;
  planId: string;
  cycleCountEntryId: string;
  sku: string;
  binLocation: string;
  systemQuantity: number;
  countedQuantity: number;
  variance: number;
  variancePercent: number;
  varianceStatus: 'MATCHED' | 'WITHIN_TOLERANCE' | 'REQUIRES_REVIEW';
  autoAdjusted: boolean;
  createdAt: Date;
}

export interface CreateMicroCountDTO {
  sku: string;
  binLocation: string;
  countedQuantity: number;
  userId: string;
  notes?: string;
}

// ============================================================================
// PRODUCTION TYPES
// ============================================================================

export enum ProductionOrderStatus {
  DRAFT = 'DRAFT',
  PLANNED = 'PLANNED',
  RELEASED = 'RELEASED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export enum ProductionOrderPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  URGENT = 'URGENT',
}

export enum BillOfMaterialStatus {
  DRAFT = 'DRAFT',
  ACTIVE = 'ACTIVE',
  ARCHIVED = 'ARCHIVED',
}

export interface BillOfMaterial {
  bomId: string;
  name: string;
  description?: string;
  productId: string;
  version: string;
  status: BillOfMaterialStatus;
  components: BOMComponent[];
  totalQuantity: number;
  unitOfMeasure: string;
  estimatedCost?: number;
  createdBy: string;
  createdAt: Date;
  updatedBy?: string;
  updatedAt?: Date;
  effectiveDate?: Date;
  expiryDate?: Date;
}

export interface BOMComponent {
  componentId: string;
  bomId: string;
  sku: string;
  quantity: number;
  unitOfMeasure: string;
  isOptional: boolean;
  substituteSkus?: string[];
  notes?: string;
}

export interface ProductionOrder {
  orderId: string;
  orderNumber: string;
  productId: string;
  productName: string;
  bomId: string;
  status: ProductionOrderStatus;
  priority: ProductionOrderPriority;
  quantityToProduce: number;
  quantityCompleted: number;
  quantityRejected: number;
  unitOfMeasure: string;
  scheduledStartDate: Date;
  scheduledEndDate: Date;
  actualStartDate?: Date;
  actualEndDate?: Date;
  assignedTo?: string;
  workCenter?: string;
  notes?: string;
  materialsReserved: boolean;
  components: ProductionOrderComponent[];
  createdAt: Date;
  createdBy: string;
  updatedAt?: Date;
  updatedBy?: string;
}

export interface ProductionOrderComponent {
  componentId: string;
  orderId: string;
  sku: string;
  description?: string;
  quantityRequired: number;
  quantityIssued: number;
  quantityReturned: number;
  unitOfMeasure: string;
  binLocation?: string;
  lotNumber?: string;
}

export interface ProductionOutput {
  outputId: string;
  orderId: string;
  productId: string;
  quantity: number;
  quantityRejected: number;
  lotNumber?: string;
  producedAt: Date;
  producedBy: string;
  inspectedBy?: string;
  inspectionDate?: Date;
  notes?: string;
  binLocation?: string;
}

export interface CreateProductionOrderDTO {
  productId: string;
  bomId: string;
  quantityToProduce: number;
  scheduledStartDate: Date;
  scheduledEndDate: Date;
  priority?: ProductionOrderPriority;
  assignedTo?: string;
  workCenter?: string;
  notes?: string;
}

export interface UpdateProductionOrderDTO {
  status?: ProductionOrderStatus;
  priority?: ProductionOrderPriority;
  quantityToProduce?: number;
  scheduledStartDate?: Date;
  scheduledEndDate?: Date;
  assignedTo?: string;
  workCenter?: string;
  notes?: string;
}

export interface RecordProductionOutputDTO {
  orderId: string;
  quantity: number;
  quantityRejected: number;
  lotNumber?: string;
  binLocation?: string;
  notes?: string;
}

export interface CreateBOMDTO {
  name: string;
  description?: string;
  productId: string;
  components: Omit<BOMComponent, 'componentId' | 'bomId'>[];
  totalQuantity: number;
  unitOfMeasure: string;
  estimatedCost?: number;
  effectiveDate?: Date;
  expiryDate?: Date;
}
