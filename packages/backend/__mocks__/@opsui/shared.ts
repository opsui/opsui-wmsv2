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
  NOT_STARTED = 'NOT_STARTED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  ON_HOLD = 'ON_HOLD',
}

export enum TaskPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  URGENT = 'URGENT',
}

export enum WorkType {
  REGULAR = 'REGULAR',
  OVERTIME_1_5 = 'OVERTIME_1_5',
  OVERTIME_2_0 = 'OVERTIME_2_0',
  TRAVEL = 'TRAVEL',
  TRAINING = 'TRAINING',
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

// ============================================================================
// E-COMMERCE TYPES
// ============================================================================

export enum PlatformType {
  SHOPIFY = 'SHOPIFY',
  WOOCOMMERCE = 'WOOCOMMERCE',
  MAGENTO = 'MAGENTO',
  BIGCOMMERCE = 'BIGCOMMERCE',
  CUSTOM = 'CUSTOM',
}

export enum EcommerceSyncStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

export enum InventorySyncType {
  PUSH = 'PUSH',
  PULL = 'PULL',
  BIDIRECTIONAL = 'BIDIRECTIONAL',
}

export enum OrderSyncType {
  IMPORT = 'IMPORT',
  EXPORT = 'EXPORT',
}

export enum ProductMappingStatus {
  ACTIVE = 'ACTIVE',
  UNSYNCED = 'UNSYNCED',
  DISABLED = 'DISABLED',
}

export enum WebhookProcessingStatus {
  PENDING = 'PENDING',
  PROCESSED = 'PROCESSED',
  FAILED = 'FAILED',
  IGNORED = 'IGNORED',
}

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

export interface TestConnectionResult {
  success: boolean;
  message: string;
  responseTimeMs: number;
  platformInfo?: Record<string, unknown>;
  rateLimitRemaining?: number;
  rateLimitResetAt?: Date;
}

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
  platformSettings?: Record<string, unknown>;
  createdBy: string;
}

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

export interface CreateProductMappingDTO {
  connectionId: string;
  internalSku: string;
  externalProductId: string;
  externalVariantId?: string;
  externalProductTitle?: string;
}

export interface UpdateProductMappingDTO {
  syncStatus?: ProductMappingStatus;
  externalProductId?: string;
  externalVariantId?: string;
  externalProductTitle?: string;
}

export interface SyncInventoryRequestDTO {
  connectionId: string;
  skus: string[];
  syncType?: InventorySyncType;
  forceSync?: boolean;
}

export interface SyncProductsRequestDTO {
  connectionId: string;
  skus?: string[];
  includeUnmapped?: boolean;
}

export interface SyncOrdersRequestDTO {
  connectionId: string;
  orderIds?: string[];
  daysToLookBack?: number;
}

// ============================================================================
// MANUFACTURING TYPES
// ============================================================================

export enum WorkCenterStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  MAINTENANCE = 'MAINTENANCE',
  DOWN = 'DOWN',
}

export enum ManufacturingOrderStatus {
  DRAFT = 'DRAFT',
  PLANNED = 'PLANNED',
  RELEASED = 'RELEASED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export enum RoutingStatus {
  DRAFT = 'DRAFT',
  ACTIVE = 'ACTIVE',
  ARCHIVED = 'ARCHIVED',
}

export enum OperationType {
  SETUP = 'SETUP',
  PROCESSING = 'PROCESSING',
  INSPECTION = 'INSPECTION',
  PACKAGING = 'PACKAGING',
}

export enum MPSStatus {
  DRAFT = 'DRAFT',
  ACTIVE = 'ACTIVE',
  FROZEN = 'FROZEN',
  ARCHIVED = 'ARCHIVED',
}

export enum MRPPlanStatus {
  DRAFT = 'DRAFT',
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED',
  ARCHIVED = 'ARCHIVED',
}

export enum MRPActionType {
  ORDER = 'ORDER',
  CANCEL = 'CANCEL',
  RESCHEDULE = 'RESCHEDULE',
  EXPEDITE = 'EXPEDITE',
  DEFER = 'DEFER',
}

export enum ShopFloorTransactionType {
  CLOCK_ON = 'CLOCK_ON',
  CLOCK_OFF = 'CLOCK_ON',
  REPORT_OUTPUT = 'REPORT_OUTPUT',
  REPORT_SCRAP = 'REPORT_SCRAP',
  REPORT_DOWNTIME = 'REPORT_DOWNTIME',
}

export enum DefectSeverity {
  MINOR = 'MINOR',
  MAJOR = 'MAJOR',
  CRITICAL = 'CRITICAL',
}

export enum DefectDisposition {
  REWORK = 'REWORK',
  SCRAP = 'SCRAP',
  QUARANTINE = 'QUARANTINE',
  USE_AS_IS = 'USE_AS_IS',
  RETURN_TO_VENDOR = 'RETURN_TO_VENDOR',
}

export enum CapacityPlanStatus {
  DRAFT = 'DRAFT',
  ACTIVE = 'ACTIVE',
  ARCHIVED = 'ARCHIVED',
}

export interface ManufacturingOrder {
  orderId: string;
  orderNumber: string;
  productId: string;
  productName: string;
  bomId: string;
  status: ManufacturingOrderStatus;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
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

export interface ManufacturingOrderWithDetails extends ManufacturingOrder {
  routing?: Routing;
  shopFloorTransactions?: ShopFloorTransaction[];
  inspections?: ProductionInspection[];
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

export interface ProductionOrderOperation {
  operationId: string;
  orderId: string;
  operationNumber: number;
  operationType: OperationType;
  workCenter: string;
  description: string;
  estimatedDurationMinutes: number;
  actualDurationMinutes?: number;
  laborCost?: number;
  overheadCost?: number;
  setupMinutes?: number;
  status: ManufacturingOrderStatus;
  startedAt?: Date;
  completedAt?: Date;
}

export interface CreateManufacturingOrderDTO {
  productId: string;
  bomId: string;
  quantityToProduce: number;
  scheduledStartDate: Date;
  scheduledEndDate: Date;
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  assignedTo?: string;
  workCenter?: string;
  notes?: string;
}

export interface ReleaseProductionOrderDTO {
  releaseDate?: Date;
  materialsToReserve?: Array<{
    sku: string;
    quantity: number;
    binLocation?: string;
  }>;
}

export interface ShopFloorTransaction {
  transactionId: string;
  orderId: string;
  operationId?: string;
  transactionType: ShopFloorTransactionType;
  userId: string;
  quantity?: number;
  transactionDate: Date;
  notes?: string;
  createdAt: Date;
}

export interface CreateShopFloorTransactionDTO {
  orderId: string;
  operationId?: string;
  transactionType: ShopFloorTransactionType;
  quantity?: number;
  notes?: string;
}

export interface ProductionInspection {
  inspectionId: string;
  orderId: string;
  productId: string;
  inspectionDate: Date;
  inspectedBy: string;
  quantityInspected: number;
  quantityPassed: number;
  quantityFailed: number;
  defects?: ProductionDefect[];
  notes?: string;
  createdAt: Date;
}

export interface ProductionDefect {
  defectId: string;
  inspectionId: string;
  defectType: string;
  severity: DefectSeverity;
  disposition: DefectDisposition;
  quantity: number;
  description: string;
}

export interface CreateProductionInspectionDTO {
  orderId: string;
  quantityInspected: number;
  quantityPassed: number;
  quantityFailed: number;
  defects?: Array<{
    defectType: string;
    severity: DefectSeverity;
    disposition: DefectDisposition;
    quantity: number;
    description: string;
  }>;
  notes?: string;
}

export interface CapacityPlan {
  planId: string;
  planName: string;
  workCenter: string;
  startDate: Date;
  endDate: Date;
  status: CapacityPlanStatus;
  capacityPercent: number;
  details: CapacityPlanDetail[];
  createdAt: Date;
  createdBy: string;
}

export interface CapacityPlanDetail {
  detailId: string;
  planId: string;
  date: Date;
  plannedHours: number;
  actualHours?: number;
  ordersScheduled: number;
}

export interface CreateCapacityPlanDTO {
  planName: string;
  workCenter: string;
  startDate: Date;
  endDate: Date;
  details: Array<{
    date: Date;
    plannedHours: number;
  }>;
}

export interface WorkCenter {
  workCenterId: string;
  code: string;
  name: string;
  description?: string;
  capacityPerHour: number;
  efficiencyPercent: number;
  isActive: boolean;
  createdAt: Date;
  createdBy: string;
}

export interface WorkCenterQueue {
  workCenterId: string;
  queuedOrders: Array<{
    orderId: string;
    orderNumber: string;
    scheduledDate: Date;
    priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
    estimatedHours: number;
  }>;
}

export interface CreateWorkCenterDTO {
  code: string;
  name: string;
  description?: string;
  capacityPerHour: number;
  efficiencyPercent: number;
}

export interface Routing {
  routingId: string;
  code: string;
  name: string;
  productId: string;
  status: RoutingStatus;
  operations: RoutingOperation[];
  version: string;
  createdAt: Date;
  createdBy: string;
}

export interface RoutingWithDetails extends Routing {
  totalEstimatedMinutes: number;
  bomComponents?: BOMComponent[];
}

export interface RoutingOperation {
  operationId: string;
  routingId: string;
  operationNumber: number;
  operationType: OperationType;
  workCenter: string;
  description: string;
  estimatedDurationMinutes: number;
  laborCost?: number;
  overheadCost?: number;
  setupMinutes?: number;
}

export interface RoutingBOMComponent {
  componentId: string;
  routingId: string;
  operationNumber: number;
  sku: string;
  quantity: number;
}

export interface CreateRoutingDTO {
  code: string;
  name: string;
  productId: string;
  operations: Array<{
    operationNumber: number;
    operationType: OperationType;
    workCenter: string;
    description: string;
    estimatedDurationMinutes: number;
    laborCost?: number;
    overheadCost?: number;
    setupMinutes?: number;
  }>;
}

export interface MSPPeriod {
  periodId: string;
  planId: string;
  startDate: Date;
  endDate: Date;
  status: MPSStatus;
  items: MSPItem[];
  createdAt: Date;
  createdBy: string;
}

export interface MSPItem {
  itemId: string;
  planId: string;
  periodId: string;
  sku: string;
  forecastQuantity: number;
  actualOrders?: number;
  productionQuantity?: number;
  availableInventory: number;
}

export interface MRPParameters {
  planningHorizonDays: number;
  lotSizeRule: 'FIXED' | 'PERIODIC' | 'LFL';
  safetyStockDays: number;
  leadTimeDays: number;
}

export interface MRPPlan {
  planId: string;
  planName: string;
  planDate: Date;
  status: MRPPlanStatus;
  parameters: MRPParameters;
  details: MRPPlanDetail[];
  actionMessages: MRPActionMessage[];
  createdAt: Date;
  createdBy: string;
}

export interface MRPPlanDetail {
  detailId: string;
  planId: string;
  sku: string;
  grossRequirement: number;
  scheduledReceipts: number;
  availableInventory: number;
  plannedOrderRelease?: number;
  plannedOrderReceipt?: number;
}

export interface MRPActionMessage {
  messageId: string;
  planId: string;
  sku: string;
  actionType: MRPActionType;
  quantity: number;
  dueDate: Date;
  notes?: string;
}

export interface CreateMRPPlanDTO {
  planName: string;
  planningHorizonDays?: number;
  lotSizeRule?: 'FIXED' | 'PERIODIC' | 'LFL';
  safetyStockDays?: number;
  skus?: string[];
}

export interface ManufacturingDashboardMetrics {
  ordersInProgress: number;
  ordersCompletedToday: number;
  ordersPastDue: number;
  capacityUtilization: number;
  qualityPassRate: number;
  averageCycleTime: number;
}

export interface WorkCenterPerformanceReport {
  workCenterId: string;
  code: string;
  name: string;
  totalOrders: number;
  onTimeDeliveryRate: number;
  averageCycleTime: number;
  utilizationPercent: number;
  downtimeMinutes: number;
}

export interface ProductionOrderCostAnalysis {
  orderId: string;
  orderNumber: string;
  materialCost: number;
  laborCost: number;
  overheadCost: number;
  totalCost: number;
  costPerUnit: number;
}

export interface MRPAnalysisSummary {
  planId: string;
  planName: string;
  totalItems: number;
  actionsRequired: number;
  ExpediteCount: number;
  deferCount: number;
  cancelCount: number;
}

export interface BatchReleaseProductionOrdersDTO {
  orderIds: string[];
  releaseDate?: Date;
}

export interface BatchCompleteProductionOrdersDTO {
  orderIds: string[];
  completionData: Array<{
    orderId: string;
    quantityCompleted: number;
    quantityRejected: number;
    binLocation?: string;
    lotNumber?: string;
  }>;
}

export interface ImplementMRPActionsDTO {
  planId: string;
  actionIds: string[];
}

// ============================================================================
// PURCHASING TYPES
// ============================================================================

export enum RequisitionStatus {
  DRAFT = 'DRAFT',
  SUBMITTED = 'SUBMITTED',
  PENDING_APPROVAL = 'PENDING_APPROVAL',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  CANCELLED = 'CANCELLED',
  CONVERTED_TO_PO = 'CONVERTED_TO_PO',
}

export enum RFQStatus {
  DRAFT = 'DRAFT',
  SENT = 'SENT',
  RESPONSE_PENDING = 'RESPONSE_PENDING',
  RESPONSE_RECEIVED = 'RESPONSE_RECEIVED',
  AWARDED = 'AWARDED',
  CANCELLED = 'CANCELLED',
}

export enum PurchaseOrderStatus {
  DRAFT = 'DRAFT',
  PENDING_APPROVAL = 'PENDING_APPROVAL',
  APPROVED = 'APPROVED',
  SENT = 'SENT',
  ACKNOWLEDGED = 'ACKNOWLEDGED',
  PARTIALLY_RECEIVED = 'PARTIALLY_RECEIVED',
  RECEIVED = 'RECEIVED',
  CANCELLED = 'CANCELLED',
}

export enum ThreeWayMatchStatus {
  PENDING_RECEIPT = 'PENDING_RECEIPT',
  PARTIALLY_MATCHED = 'PARTIALLY_MATCHED',
  MATCHED = 'MATCHED',
  DISCREPANCY = 'DISCREPANCY',
}

export enum VendorPerformanceRank {
  EXCELLENT = 'EXCELLENT',
  GOOD = 'GOOD',
  AVERAGE = 'AVERAGE',
  POOR = 'POOR',
}

export interface PurchaseRequisition {
  requisitionId: string;
  requisitionNumber: string;
  requestedBy: string;
  department?: string;
  entityId?: string;
  approvalStatus: RequisitionStatus;
  approvedBy?: string;
  approvedAt?: Date;
  rejectionReason?: string;
  requiredByDate?: Date;
  jobNumber?: string;
  notes?: string;
  lines: PurchaseRequisitionLine[];
  createdAt: Date;
  updatedAt: Date;
  convertedToPoId?: string;
}

export interface PurchaseRequisitionLine {
  lineId: string;
  requisitionId: string;
  lineNumber: number;
  sku?: string;
  description: string;
  quantity: number;
  unitOfMeasure: string;
  estimatedUnitPrice?: number;
  estimatedTotal?: number;
  requestedDeliveryDate?: Date;
  vendorId?: string;
  notes?: string;
}

export interface RFQ {
  rfqId: string;
  rfqNumber: string;
  title: string;
  sourceType: string;
  sourceId: string;
  status: RFQStatus;
  createdBy: string;
  createdById?: string;
  dueDate: Date;
  sentAt?: Date;
  awardedAt?: Date;
  notes?: string;
  vendors: RFQVendor[];
  lines: RFQLine[];
  createdAt: Date;
  updatedAt: Date;
}

export interface RFQVendor {
  rfqVendorId: string;
  rfqId: string;
  vendorId: string;
  vendorContactId?: string;
  sentAt?: Date;
  responseReceivedAt?: boolean;
  quotedTotal?: number;
  notes?: string;
}

export interface RFQLine {
  lineId: string;
  rfqId: string;
  lineNumber: number;
  sku?: string;
  description: string;
  quantity: number;
  unitOfMeasure: string;
  requiredDate?: Date;
  notes?: string;
}

export interface VendorQuote {
  quoteId: string;
  rfqVendorId: string;
  quoteNumber?: string;
  validUntil?: Date;
  quotedAt: Date;
  lines: VendorQuoteLine[];
  terms?: string;
  notes?: string;
}

export interface VendorQuoteLine {
  lineId: string;
  quoteId: string;
  rfqLineId: string;
  unitPrice: number;
  quotedQuantity: number;
  totalAmount: number;
  promisedDate?: Date;
  notes?: string;
}

export interface VendorCatalogItem {
  catalogItemId: string;
  vendorId: string;
  sku: string;
  vendorSku?: string;
  description: string;
  unitOfMeasure: string;
  unitPrice: number;
  currency: string;
  leadTimeDays: number;
  minOrderQuantity: number;
  quantityBreaks?: VendorQuantityBreak[];
  isActive: boolean;
  vendorPartNumber?: string;
  discontinuedDate?: Date;
  replacementSku?: string;
  updatedAt: Date;
}

export interface VendorQuantityBreak {
  breakId: string;
  catalogItemId: string;
  minQuantity: number;
  unitPrice: number;
}

export interface PurchaseOrder {
  poId: string;
  poNumber: string;
  vendorId: string;
  vendor?: Vendor;
  sourceType: string;
  sourceId: string;
  entityId?: string;
  poStatus: PurchaseOrderStatus;
  threeWayMatchStatus?: string;
  approvedBy?: string;
  approvedAt?: Date;
  currency: string;
  exchangeRate?: number;
  subtotal: number;
  taxAmount: number;
  shippingAmount: number;
  otherCharges: number;
  totalAmount: number;
  notes?: string;
  internalNotes?: string;
  vendorNotes?: string;
  requestedBy: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  lines: PurchaseOrderLine[];
}

export interface Vendor {
  vendorId: string;
  vendorNumber: string;
  name: string;
  contactName?: string;
  email?: string;
  phone?: string;
  website?: string;
  billingAddress?: Address;
  shippingAddress?: Address;
  paymentTerms?: string;
  currency: string;
  taxId?: string;
  isActive: boolean;
  onHoldFromDate?: Date;
  onHoldToDate?: Date;
  onHoldReason?: string;
  notes?: string;
  createdAt: Date;
  createdBy: string;
  updatedAt?: Date;
}

export interface PurchaseOrderLine {
  lineId: string;
  poId: string;
  lineNumber: number;
  sku?: string;
  description: string;
  quantity: number;
  unitOfMeasure: string;
  unitPrice: number;
  taxRate?: number;
  taxAmount?: number;
  discountPercent?: number;
  discountAmount?: number;
  totalAmount: number;
  requestedDate?: Date;
  promisedDate?: Date;
  binLocation?: string;
  assetId?: string;
  projectId?: string;
  vendorSku?: string;
  notes?: string;
}

export interface PurchaseReceipt {
  receiptId: string;
  receiptNumber: string;
  poId: string;
  purchaseOrder?: PurchaseOrder;
  vendorId: string;
  entityId?: string;
  receivedBy: string;
  receivedDate: Date;
  deliveryDate?: Date;
  shipmentNumber?: string;
  carrier?: string;
  trackingNumber?: string;
  notes?: string;
  status: string;
  lines: PurchaseReceiptLine[];
  createdAt: Date;
  updatedAt?: Date;
}

export interface PurchaseReceiptLine {
  lineId: string;
  receiptId: string;
  poLineId: string;
  lineNumber: number;
  sku?: string;
  description: string;
  quantityOrdered: number;
  quantityReceived: number;
  quantityRejected: number;
  quantityAccepted: number;
  binLocation?: string;
  lotNumber?: string;
  expiryDate?: Date;
  unitOfMeasure: string;
  qualityStatus?: QualityStatus;
  rejectionReason?: string;
  notes?: string;
  createdAt: Date;
}

export interface ThreeWayMatch {
  matchId: string;
  poId: string;
  poLineId?: string;
  receiptId?: string;
  invoiceId?: string;
  matchStatus: string;
  poQuantity: number;
  poUnitPrice: number;
  poAmount: number;
  receivedQuantity?: number;
  receivedUnitPrice?: number;
  receivedAmount?: number;
  invoicedQuantity?: number;
  invoicedUnitPrice?: number;
  invoicedAmount?: number;
  quantityVariance?: number;
  priceVariance?: number;
  totalVariance?: number;
  varianceTolerance?: number;
  requiresApproval: boolean;
  approvedBy?: string;
  approvedAt?: Date;
  resolvedAt?: Date;
  resolutionNotes?: string;
  createdAt: Date;
  updatedAt?: Date;
}

export interface VendorPerformance {
  performanceId: string;
  vendorId: string;
  reviewPeriod: string;
  onTimeDeliveryRate: number;
  qualityAcceptanceRate: number;
  priceCompetitivenessScore: number;
  responsivenessRating: number;
  overallScore: number;
  totalOrders: number;
  onTimeOrders: number;
  totalReceipts: number;
  acceptedReceipts: number;
  totalQuotes: number;
  avgResponseTimeHours?: number;
  reviewedBy: string;
  reviewedAt: Date;
  notes?: string;
  createdAt: Date;
}

export interface VendorPerformanceEvent {
  eventId: string;
  vendorId: string;
  eventType: 'DELIVERY' | 'QUALITY' | 'RESPONSIVENESS' | 'COMMUNICATION' | 'OTHER';
  eventDate: Date;
  severity: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL';
  description: string;
  poId?: string;
  receiptId?: string;
  reportedBy: string;
  createdAt: Date;
}

export interface VendorScorecard {
  scorecardId: string;
  vendorId: string;
  scorecardPeriod: string;
  onTimeDeliveryScore: number;
  qualityScore: number;
  priceScore: number;
  responsivenessScore: number;
  technicalCapabilityScore?: number;
  financialStabilityScore?: number;
  overallScore: number;
  rank: VendorPerformanceRank;
  strengths: string[];
  areasForImprovement: string[];
  reviewedBy: string;
  reviewDate: Date;
  notes?: string;
  createdAt: Date;
}

export interface SpendAnalysisReport {
  reportId: string;
  entityType?: string;
  entityId?: string;
  vendorId?: string;
  category?: string;
  reportPeriod: string;
  totalSpend: number;
  totalOrders: number;
  averageOrderValue: number;
  spendByCategory: Array<{
    category: string;
    amount: number;
    percentage: number;
  }>;
  spendByVendor: Array<{
    vendorId: string;
    vendorName: string;
    amount: number;
    percentage: number;
  }>;
  topSkus: Array<{
    sku: string;
    description: string;
    amount: number;
    quantity: number;
  }>;
  trends: Array<{
    period: string;
    amount: number;
  }>;
  generatedAt: Date;
  generatedBy: string;
}

export interface PurchasingDashboardMetrics {
  pendingRequisitions: number;
  pendingApprovals: number;
  openPurchaseOrders: number;
  ordersPastDue: number;
  pendingReceipts: number;
  pendingThreeWayMatches: number;
  totalSpendMonth: number;
  totalSendYear: number;
  activeVendors: number;
}

// ============================================================================
// MULTI-ENTITY TYPES
// ============================================================================

export enum EntityType {
  HEAD_OFFICE = 'HEAD_OFFICE',
  SUBSIDIARY = 'SUBSIDIARY',
  BRANCH = 'BRANCH',
  DIVISION = 'DIVISION',
}

export enum EntityStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  PENDING_SETUP = 'PENDING_SETUP',
  CLOSED = 'CLOSED',
}

export enum IntercompanyTransactionType {
  TRANSFER_OF_GOODS = 'TRANSFER_OF_GOODS',
  TRANSFER_OF_FUNDS = 'TRANSFER_OF_FUNDS',
  INTERCOMPANY_LOAN = 'INTERCOMPANY_LOAN',
  COST_ALLOCATION = 'COST_ALLOCATION',
  REVENUE_ALLOCATION = 'REVENUE_ALLOCATION',
  MANAGEMENT_FEE = 'MANAGEMENT_FEE',
  ROYALTY_PAYMENT = 'ROYALTY_PAYMENT',
  DIVIDEND_PAYMENT = 'DIVIDEND_PAYMENT',
}

export enum IntercompanyTransactionStatus {
  PENDING = 'PENDING',
  POSTED = 'POSTED',
  ELIMINATED = 'ELIMINATED',
  REVERSED = 'REVERSED',
}

export enum EntityRelationshipType {
  PARENT_SUBSIDIARY = 'PARENT_SUBSIDIARY',
  JOINT_VENTURE = 'JOINT_VENTURE',
  AFFILIATE = 'AFFILIATE',
  PARTNERSHIP = 'PARTNERSHIP',
  STRATEGIC_ALLIANCE = 'STRATEGIC_ALLIANCE',
}

export enum EntityUserRole {
  ENTITY_ADMIN = 'ENTITY_ADMIN',
  ENTITY_USER = 'ENTITY_USER',
  ENTITY_VIEWER = 'ENTITY_VIEWER',
  ENTITY_ACCOUNTANT = 'ENTITY_ACCOUNTANT',
  ENTITY_MANAGER = 'ENTITY_MANAGER',
}

export enum ConsolidationMethod {
  FULL_CONSOLIDATION = 'FULL_CONSOLIDATION',
  PROPORTIONAL_CONSOLIDATION = 'PROPORTIONAL_CONSOLIDATION',
  EQUITY_METHOD = 'EQUITY_METHOD',
  COST_METHOD = 'COST_METHOD',
}

export enum ProjectType {
  FIXED_BID = 'FIXED_BID',
  TIME_MATERIALS = 'TIME_MATERIALS',
  COST_PLUS = 'COST_PLUS',
  RETAINER = 'RETAINER',
  INTERNAL = 'INTERNAL',
}

export enum ProjectStatus {
  DRAFT = 'DRAFT',
  PLANNING = 'PLANNING',
  ACTIVE = 'ACTIVE',
  ON_HOLD = 'ON_HOLD',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export enum BillingType {
  MILESTONE = 'MILESTONE',
  PROGRESS = 'PROGRESS',
  TIME_MATERIAL = 'TIME_MATERIAL',
  FIXED_INTERVAL = 'FIXED_INTERVAL',
  COMPLETION = 'COMPLETION',
}

export enum BillingScheduleStatus {
  PENDING = 'PENDING',
  BILLED = 'BILLED',
  PAID = 'PAID',
  OVERDUE = 'OVERDUE',
}

export enum IssueType {
  ISSUE = 'ISSUE',
  RISK = 'RISK',
  DEFECT = 'DEFECT',
  CHANGE_REQUEST = 'CHANGE_REQUEST',
}

export enum IssueSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export enum IssueStatus {
  OPEN = 'OPEN',
  IN_PROGRESS = 'IN_PROGRESS',
  RESOLVED = 'RESOLVED',
  CLOSED = 'CLOSED',
}

// ============================================================================
// PROJECTS TYPES
// ============================================================================

export interface Project {
  projectId: string;
  projectNumber: string;
  name: string;
  description?: string;
  customerId?: string;
  customerName?: string;
  typeId?: string;
  status: 'PLANNING' | 'ACTIVE' | 'ON_HOLD' | 'COMPLETED' | 'CANCELLED';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  startDate: Date;
  endDate?: Date;
  estimatedCompletionDate?: Date;
  actualCompletionDate?: Date;
  estimatedBudget: number;
  actualCost?: number;
  progressPercent: number;
  entityId?: string;
  projectManagerId: string;
  projectManagerName?: string;
  notes?: string;
  createdBy: string;
  createdAt: Date;
  updatedBy?: string;
  updatedAt?: Date;
}

export interface ProjectTask {
  taskId: string;
  projectId: string;
  taskNumber: string;
  title: string;
  description?: string;
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  startDate?: Date;
  dueDate?: Date;
  completedAt?: Date;
  estimatedHours: number;
  actualHours?: number;
  progressPercent: number;
  assignedTo?: string;
  assignedToName?: string;
  dependsOnTasks?: string[];
  parentTaskId?: string;
  notes?: string;
  createdBy: string;
  createdAt: Date;
  updatedBy?: string;
  updatedAt?: Date;
}

export interface ProjectMilestone {
  milestoneId: string;
  projectId: string;
  name: string;
  description?: string;
  dueDate: Date;
  completedAt?: Date;
  status: 'PENDING' | 'COMPLETED' | 'OVERDUE';
  notes?: string;
}

export interface ProjectBudgetItem {
  itemId: string;
  projectId: string;
  category: string;
  description: string;
  budgetedAmount: number;
  actualAmount?: number;
  variance?: number;
}

export interface ProjectTimeEntry {
  entryId: string;
  projectId: string;
  taskId?: string;
  userId: string;
  userName?: string;
  date: Date;
  hours: number;
  description?: string;
  billable: boolean;
  hourlyRate?: number;
  createdAt: Date;
  approvedAt?: Date;
  approvedBy?: string;
}

export interface ProjectIssue {
  issueId: string;
  projectId: string;
  title: string;
  description: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
  assignedTo?: string;
  dueDate?: Date;
  resolvedAt?: Date;
  createdAt: Date;
  createdBy: string;
}

export interface ProjectResourceAllocation {
  allocationId: string;
  projectId: string;
  userId: string;
  role?: string;
  allocatedPercent: number;
  startDate: Date;
  endDate: Date;
}

export interface ProjectDocument {
  documentId: string;
  projectId: string;
  name: string;
  description?: string;
  fileUrl: string;
  fileType: string;
  fileSizeBytes: number;
  uploadedBy: string;
  uploadedAt: Date;
}

export interface ProjectsDashboardMetrics {
  activeProjects: number;
  completedProjectsMonth: number;
  totalHoursThisMonth: number;
  projectsOverBudget: number;
  projectsBehindSchedule: number;
  totalBudgetAllProjects: number;
  totalActualCostAllProjects: number;
}

export interface CreateProjectDTO {
  name: string;
  description?: string;
  customerId?: string;
  typeId?: string;
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  startDate: Date;
  endDate?: Date;
  estimatedBudget: number;
  projectManagerId: string;
  notes?: string;
}

export interface UpdateProjectDTO {
  name?: string;
  description?: string;
  customerId?: string;
  typeId?: string;
  status?: 'PLANNING' | 'ACTIVE' | 'ON_HOLD' | 'COMPLETED' | 'CANCELLED';
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  startDate?: Date;
  endDate?: Date;
  estimatedCompletionDate?: Date;
  estimatedBudget?: number;
  projectManagerId?: string;
  notes?: string;
}

export interface CreateProjectTaskDTO {
  title: string;
  description?: string;
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  startDate?: Date;
  dueDate?: Date;
  estimatedHours: number;
  assignedTo?: string;
  dependsOnTasks?: string[];
  parentTaskId?: string;
  notes?: string;
}

export interface UpdateProjectTaskDTO {
  title?: string;
  description?: string;
  status?: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  startDate?: Date;
  dueDate?: Date;
  estimatedHours?: number;
  actualHours?: number;
  assignedTo?: string;
  dependsOnTasks?: string[];
  notes?: string;
}

export interface CreateProjectMilestoneDTO {
  name: string;
  description?: string;
  dueDate: Date;
  notes?: string;
}

export interface CreateProjectTimeEntryDTO {
  taskId?: string;
  date: Date;
  hours: number;
  description?: string;
  billable?: boolean;
}

export interface CreateProjectIssueDTO {
  title: string;
  description: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  assignedTo?: string;
  dueDate?: Date;
}

export interface ProjectWithDetails extends Project {
  tasks: ProjectTask[];
  milestones: ProjectMilestone[];
  team: Array<{
    userId: string;
    userName: string;
    role?: string;
  }>;
  budget: ProjectBudgetItem[];
}

// ============================================================================
// ADVANCED INVENTORY TYPES
// ============================================================================

export enum VelocityCategory {
  FAST = 'FAST',
  MEDIUM = 'MEDIUM',
  SLOW = 'SLOW',
  DEAD = 'DEAD',
}

export enum ABCClass {
  A = 'A',
  B = 'B',
  C = 'C',
}

export enum CountPriority {
  HIGH = 'HIGH',
  MEDIUM = 'MEDIUM',
  LOW = 'LOW',
}

export enum SafetyStockMethod {
  SERVICE_LEVEL = 'SERVICE_LEVEL',
  STANDARD_DEVIATION = 'STANDARD_DEVIATION',
  MANUAL = 'MANUAL',
}

export enum CycleCountStrategy {
  ABC_BASED = 'ABC_BASED',
  RANDOM = 'RANDOM',
  ITEM_SPECIFIC = 'ITEM_SPECIFIC',
}

export enum PeriodType {
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY',
  MONTHLY = 'MONTHLY',
  QUARTERLY = 'QUARTERLY',
}

export enum LandedCostComponentType {
  FREIGHT = 'FREIGHT',
  INSURANCE = 'INSURANCE',
  DUTIES = 'DUTIES',
  CUSTOMS_BROKERAGE = 'CUSTOMS_BROKERAGE',
  OTHER = 'OTHER',
}

export enum AllocationMethod {
  PROPORTIONAL = 'PROPORTIONAL',
  EQUAL = 'EQUAL',
  WEIGHTED = 'WEIGHTED',
  MANUAL = 'MANUAL',
}

export enum ForecastMethod {
  MOVING_AVERAGE = 'MOVING_AVERAGE',
  EXPONENTIAL_SMOOTHING = 'EXPONENTIAL_SMOOTHING',
  LINEAR_REGRESSION = 'LINEAR_REGRESSION',
  SEASONAL = 'SEASONAL',
}

// ============================================================================
// ACCOUNTING TYPES
// ============================================================================

/**
 * Accounting Period
 */
export enum AccountingPeriod {
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY',
  MONTHLY = 'MONTHLY',
  QUARTERLY = 'QUARTERLY',
  YEARLY = 'YEARLY',
}

/**
 * Cost Category
 */
export enum CostCategory {
  LABOR = 'LABOR',
  MATERIALS = 'MATERIALS',
  SHIPPING = 'SHIPPING',
  STORAGE = 'STORAGE',
  OVERHEAD = 'OVERHEAD',
  EXCEPTIONS = 'EXCEPTIONS',
  QUALITY_CONTROL = 'QUALITY_CONTROL',
  MAINTENANCE = 'MAINTENANCE',
}

/**
 * Revenue Category
 */
export enum RevenueCategory {
  SALES = 'SALES',
  RESTOCKING_FEES = 'RESTOCKING_FEES',
  SERVICE_FEES = 'SERVICE_FEES',
  OTHER = 'OTHER',
}

/**
 * Financial Metrics Summary
 */
export interface FinancialMetrics {
  period: AccountingPeriod;
  startDate: Date;
  endDate: Date;
  totalRevenue: number;
  revenueByCategory: Record<RevenueCategory, number>;
  revenueByCustomer: Array<{ customerId: string; customerName: string; amount: number }>;
  totalCost: number;
  costByCategory: Record<CostCategory, number>;
  laborCosts: number;
  materialCosts: number;
  shippingCosts: number;
  storageCosts: number;
  inventoryValue: number;
  inventoryValueByCategory: Record<string, number>;
  grossProfit: number;
  netProfit: number;
  profitMargin: number;
  ordersProcessed: number;
  averageOrderValue: number;
  previousPeriodRevenue?: number;
  revenueGrowthRate?: number;
  includePreviousPeriod: boolean;
}

/**
 * Inventory Valuation
 */
export interface InventoryValuation {
  valuationDate: Date;
  totalValue: number;
  valuationByMethod: Record<string, number>;
  categoryBreakdown: Array<{ category: string; value: number; percentage: number }>;
  zoneBreakdown: Array<{ zone: string; value: number; percentage: number }>;
  skuCount: number;
  totalUnits: number;
  averageCostPerUnit: number;
  valuationMethod: 'FIFO' | 'LIFO' | 'WEIGHTED_AVERAGE' | 'STANDARD_COST';
}

/**
 * Labor Cost Detail
 */
export interface LaborCostDetail {
  userId: string;
  userName: string;
  role: string;
  hoursWorked: number;
  hourlyRate: number;
  totalCost: number;
  tasksCompleted: number;
  costPerTask: number;
  period: AccountingPeriod;
  date: Date;
}

/**
 * Cost Analysis Report
 */
export interface CostAnalysisReport {
  reportId: string;
  period: AccountingPeriod;
  startDate: Date;
  endDate: Date;
  generatedAt: Date;
  generatedBy: string;
  totalCosts: number;
  costBreakdown: Record<CostCategory, number>;
  costTrends: Array<{
    category: CostCategory;
    currentPeriod: number;
    previousPeriod: number;
    variance: number;
    variancePercent: number;
  }>;
  topCostDrivers: Array<{
    category: CostCategory;
    amount: number;
    percentage: number;
  }>;
  recommendations: string[];
}

/**
 * Transaction Type for financial transactions
 * This redefines the earlier TransactionType enum for financial contexts
 * (matching the behavior in the actual shared package)
 */
export enum TransactionType {
  SALE = 'SALE',
  REFUND = 'REFUND',
  CREDIT_RECEIVED = 'CREDIT_RECEIVED',
  CREDIT_ISSUED = 'CREDIT_ISSUED',
  WRITE_OFF = 'WRITE_OFF',
  PAYMENT_RECEIVED = 'PAYMENT_RECEIVED',
  PAYMENT_MADE = 'PAYMENT_MADE',
  JOURNAL_ENTRY = 'JOURNAL_ENTRY',
}

/**
 * Financial Transaction
 */
export interface FinancialTransaction {
  transactionId: string;
  transactionType: TransactionType;
  amount: number;
  currency: string;
  referenceType: 'ORDER' | 'RETURN' | 'EXCEPTION' | 'GENERAL';
  referenceId?: string;
  description?: string;
  accountId?: string;
  userId?: string;
  createdAt: Date;
  createdBy?: string;
  fiscalYear?: number;
  fiscalPeriod?: number;
  reconciled: boolean;
  attachments?: string[];
}

/**
 * Profit Loss Statement
 */
export interface ProfitLossStatement {
  statementId: string;
  period: AccountingPeriod;
  startDate: Date;
  endDate: Date;
  generatedAt: Date;
  generatedBy: string;
  revenue: {
    totalRevenue: number;
    sales: number;
    restockingFees: number;
    serviceFees: number;
    otherRevenue: number;
  };
  costOfGoodsSold: {
    materials: number;
    labor: number;
    overhead: number;
    totalCOGS: number;
  };
  grossProfit: number;
  grossProfitMargin: number;
  operatingExpenses: {
    shipping: number;
    storage: number;
    exceptions: number;
    qualityControl: number;
    maintenance: number;
    otherOverhead: number;
    totalOperatingExpenses: number;
  };
  operatingIncome: number;
  operatingMargin: number;
  otherIncome: number;
  otherExpenses: number;
  netIncome: number;
  netProfitMargin: number;
  previousPeriodRevenue?: number;
  revenueGrowthPercent?: number;
}

/**
 * Vendor Performance Financial
 */
export interface VendorPerformanceFinancial {
  vendorId: string;
  vendorName: string;
  period: AccountingPeriod;
  startDate: Date;
  endDate: Date;
  totalPurchases: number;
  orderCount: number;
  averageOrderValue: number;
  onTimeDeliveryRate: number;
  qualityAcceptanceRate: number;
  returnRate: number;
  totalCredits: number;
  creditsAsPercentageOfPurchases: number;
  paymentTerms: string;
  averagePaymentDays: number;
  earlyPaymentDiscounts: number;
  performanceScore: number;
  lastReviewDate?: Date;
  reviewedBy?: string;
}

/**
 * Customer Financial Summary
 */
export interface CustomerFinancialSummary {
  customerId: string;
  customerName: string;
  period: AccountingPeriod;
  startDate: Date;
  endDate: Date;
  totalPurchases: number;
  orderCount: number;
  averageOrderValue: number;
  paymentHistory: {
    onTimePayments: number;
    latePayments: number;
    totalPayments: number;
    onTimePaymentRate: number;
  };
  outstandingBalance: number;
  creditLimit: number;
  creditUtilization: number;
  creditStatus: 'GOOD' | 'WARNING' | 'BLOCKED';
  totalReturns: number;
  returnRate: number;
  averagePaymentDays: number;
  daysSalesOutstanding: number;
}

/**
 * Account Type
 */
export enum AccountType {
  ASSET = 'ASSET',
  LIABILITY = 'LIABILITY',
  EQUITY = 'EQUITY',
  REVENUE = 'REVENUE',
  EXPENSE = 'EXPENSE',
}

/**
 * Journal Entry Status
 */
export enum JournalEntryStatus {
  DRAFT = 'DRAFT',
  SUBMITTED = 'SUBMITTED',
  APPROVED = 'APPROVED',
  POSTED = 'POSTED',
  REVERSED = 'REVERSED',
}

/**
 * Chart of Accounts
 */
export interface ChartOfAccounts {
  accountId: string;
  accountNumber: string;
  accountName: string;
  accountType: AccountType;
  parentId?: string;
  normalBalance: 'DEBIT' | 'CREDIT';
  currency: string;
  isActive: boolean;
  isControlAccount: boolean;
  reconciliationAccountId?: string;
  description?: string;
  createdAt: Date;
  createdBy: string;
  updatedAt?: Date;
  updatedBy?: string;
  currentBalance?: number;
  children?: ChartOfAccounts[];
}

/**
 * Journal Entry
 */
export interface JournalEntry {
  entryId: string;
  entryNumber: string;
  entryDate: Date;
  status: JournalEntryStatus;
  description: string;
  lines: JournalEntryLine[];
  totalDebit: number;
  totalCredit: number;
  currency: string;
  createdAt: Date;
  createdBy: string;
  submittedAt?: Date;
  submittedBy?: string;
  approvedAt?: Date;
  approvedBy?: string;
  postedAt?: Date;
  postedBy?: string;
  reversedEntryId?: string;
  reversalReason?: string;
  attachments?: string[];
  notes?: string;
}

/**
 * Journal Entry Line
 */
export interface JournalEntryLine {
  lineId: string;
  entryId: string;
  lineNumber: number;
  accountId: string;
  accountName?: string;
  description?: string;
  debitAmount: number;
  creditAmount: number;
  entityType?: string;
  entityId?: string;
  referenceType?: string;
  referenceId?: string;
  taxCode?: string;
  taxAmount?: number;
}

/**
 * Trial Balance
 */
export interface TrialBalance {
  reportId: string;
  reportDate: Date;
  periodStart: Date;
  periodEnd: Date;
  generatedAt: Date;
  generatedBy: string;
  currency: string;
  accounts: AccountBalance[];
  totalDebits: number;
  totalCredits: number;
  isInBalance: boolean;
  difference: number;
  fiscalYear: number;
  fiscalPeriod: number;
}

/**
 * Account Balance
 */
export interface AccountBalance {
  accountId: string;
  accountNumber: string;
  accountName: string;
  accountType: AccountType;
  debitBalance: number;
  creditBalance: number;
  netBalance: number;
  normalBalance: 'DEBIT' | 'CREDIT';
}

/**
 * Balance Sheet
 */
export interface BalanceSheet {
  statementId: string;
  statementDate: Date;
  asOfDate: Date;
  generatedAt: Date;
  generatedBy: string;
  currency: string;
  fiscalYear: number;
  fiscalPeriod?: number;
  assets: {
    currentAssets: {
      cash: number;
      accountsReceivable: number;
      inventory: number;
      prepaidExpenses: number;
      otherCurrentAssets: number;
      totalCurrentAssets: number;
    };
    nonCurrentAssets: {
      propertyPlantEquipment: number;
      accumulatedDepreciation: number;
      netPropertyPlantEquipment: number;
      intangibleAssets: number;
      otherNonCurrentAssets: number;
      totalNonCurrentAssets: number;
    };
    totalAssets: number;
  };
  liabilities: {
    currentLiabilities: {
      accountsPayable: number;
      accruedExpenses: number;
      shortTermDebt: number;
      currentPortionLongTermDebt: number;
      otherCurrentLiabilities: number;
      totalCurrentLiabilities: number;
    };
    nonCurrentLiabilities: {
      longTermDebt: number;
      deferredTaxLiabilities: number;
      otherNonCurrentLiabilities: number;
      totalNonCurrentLiabilities: number;
    };
    totalLiabilities: number;
  };
  equity: {
    shareCapital: number;
    retainedEarnings: number;
    currentEarnings: number;
    otherEquity: number;
    totalEquity: number;
  };
  totalLiabilitiesAndEquity: number;
  previousPeriodAssets?: number;
  previousPeriodLiabilities?: number;
  previousPeriodEquity?: number;
}

/**
 * Cash Flow Statement
 */
export interface CashFlowStatement {
  statementId: string;
  statementDate: Date;
  periodStart: Date;
  periodEnd: Date;
  generatedAt: Date;
  generatedBy: string;
  currency: string;
  fiscalYear: number;
  fiscalPeriod?: number;
  operatingActivities: {
    netIncome: number;
    adjustments: {
      depreciation: number;
      amortization: number;
      accountsReceivableChange: number;
      inventoryChange: number;
      accountsPayableChange: number;
      otherAdjustments: number;
    };
    netCashFromOperations: number;
  };
  investingActivities: {
    capitalExpenditures: number;
    assetSales: number;
    otherInvestingActivities: number;
    netCashFromInvesting: number;
  };
  financingActivities: {
    debtProceeds: number;
    debtRepayments: number;
    equityIssuance: number;
    dividendsPaid: number;
    otherFinancingActivities: number;
    netCashFromFinancing: number;
  };
  netChangeInCash: number;
  cashAtBeginning: number;
  cashAtEnd: number;
}

/**
 * Create Account DTO
 */
export interface CreateAccountDTO {
  accountNumber: string;
  accountName: string;
  accountType: AccountType;
  parentId?: string;
  normalBalance: 'DEBIT' | 'CREDIT';
  currency?: string;
  isControlAccount?: boolean;
  reconciliationAccountId?: string;
  description?: string;
  createdBy: string;
}

/**
 * Revenue Recognition Method
 */
export enum RevenueRecognitionMethod {
  INSTANT = 'INSTANT',
  MILESTONE = 'MILESTONE',
  RATABLE = 'RATABLE',
  DEFERRED = 'DEFERRED',
}

/**
 * Depreciation Method
 */
export enum DepreciationMethod {
  STRAIGHT_LINE = 'STRAIGHT_LINE',
  DECLINING_BALANCE = 'DECLINING_BALANCE',
  DOUBLE_DECLINING = 'DOUBLE_DECLINING',
  UNITS_OF_PRODUCTION = 'UNITS_OF_PRODUCTION',
}

/**
 * Update Account DTO
 */
export interface UpdateAccountDTO {
  accountName?: string;
  accountType?: AccountType;
  parentId?: string;
  normalBalance?: 'DEBIT' | 'CREDIT';
  isActive?: boolean;
  isControlAccount?: boolean;
  reconciliationAccountId?: string;
  description?: string;
  updatedBy: string;
}

/**
 * Create Journal Entry DTO
 */
export interface CreateJournalEntryDTO {
  entryDate: Date;
  description: string;
  lines: Array<{
    accountId: string;
    description?: string;
    debitAmount: number;
    creditAmount: number;
    entityType?: string;
    entityId?: string;
    referenceType?: string;
    referenceId?: string;
    taxCode?: string;
    taxAmount?: number;
  }>;
  currency?: string;
  createdBy: string;
}

// ============================================================================
// PHASE 2: INTERMEDIATE TYPES
// ============================================================================

/**
 * AR Payment
 */
export interface ARPayment {
  paymentId: string;
  receivableId: string;
  paymentDate: Date;
  paymentMethod?: string;
  amount: number;
  referenceNumber?: string;
  notes?: string;
  createdBy?: string;
  createdAt: Date;
}

/**
 * Credit Memo
 */
export interface CreditMemo {
  memoId: string;
  receivableId?: string;
  memoNumber: string;
  memoDate: Date;
  reason: string;
  amount: number;
  status: string;
  approvedBy?: string;
  approvedAt?: Date;
  createdAt: Date;
}

/**
 * AP Payment
 */
export interface APPayment {
  paymentId: string;
  payableId: string;
  paymentDate: Date;
  paymentMethod?: string;
  amount: number;
  referenceNumber?: string;
  notes?: string;
  createdBy?: string;
  createdAt: Date;
}

/**
 * Vendor Credit Memo
 */
export interface VendorCreditMemo {
  memoId: string;
  payableId?: string;
  memoNumber: string;
  memoDate: Date;
  reason: string;
  amount: number;
  status: string;
  approvedBy?: string;
  approvedAt?: Date;
  createdAt: Date;
}

/**
 * Bank Reconciliation
 */
export interface BankReconciliation {
  reconciliationId: string;
  bankAccountId: string;
  statementDate: Date;
  statementBalance: number;
  bookBalance: number;
  difference: number;
  status: string;
  reconciledBy?: string;
  reconciledAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Cash Position
 */
export interface CashPosition {
  positionId: string;
  asOfDate: Date;
  cashOnHand: number;
  cashInBank: number;
  totalCash: number;
  accountsReceivable: number;
  accountsPayable: number;
  netCash: number;
  createdAt: Date;
}

/**
 * Revenue Contract
 */
export interface RevenueContract {
  contractId: string;
  contractNumber: string;
  customerId: string;
  contractName: string;
  totalValue: number;
  startDate: Date;
  endDate: Date;
  recognitionMethod: RevenueRecognitionMethod;
  status: string;
  createdBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Revenue Milestone
 */
export interface RevenueMilestone {
  milestoneId: string;
  contractId: string;
  milestoneName: string;
  description?: string;
  targetAmount: number;
  achievedAmount: number;
  percentage: number;
  targetDate?: Date;
  achievedDate?: Date;
  status: string;
  createdAt: Date;
}

/**
 * Revenue Schedule
 */
export interface RevenueSchedule {
  scheduleId: string;
  contractId: string;
  revenueDate: Date;
  amount: number;
  recognizedAmount: number;
  remainingAmount: number;
  status: string;
  recognizedAt?: Date;
  createdAt: Date;
}

/**
 * Deferred Revenue
 */
export interface DeferredRevenue {
  deferralId: string;
  contractId?: string;
  originalAmount: number;
  remainingAmount: number;
  recognizedAmount: number;
  recognitionStartDate: Date;
  recognitionEndDate: Date;
  monthlyRecognitionAmount?: number;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// PHASE 3: ADVANCED TYPES
// ============================================================================

/**
 * Currency
 */
export interface Currency {
  currencyCode: string;
  currencyName: string;
  symbol: string;
  isActive: boolean;
  createdAt: Date;
}

/**
 * Exchange Rate
 */
export interface ExchangeRate {
  rateId: string;
  fromCurrency: string;
  toCurrency: string;
  rateDate: Date;
  exchangeRate: number;
  isActive: boolean;
  createdAt: Date;
}

/**
 * Budget
 */
export interface Budget {
  budgetId: string;
  budgetName: string;
  fiscalYear: number;
  budgetType: string;
  status: string;
  createdBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Budget Line
 */
export interface BudgetLine {
  lineId: string;
  budgetId: string;
  accountId: string;
  period: string;
  budgetedAmount: number;
  actualAmount: number;
  variance: number;
  variancePercent: number;
  lastUpdated: Date;
  createdAt: Date;
}

/**
 * Forecast
 */
export interface Forecast {
  forecastId: string;
  forecastName: string;
  forecastType: string;
  startDate: Date;
  endDate: Date;
  createdBy?: string;
  createdAt: Date;
}

/**
 * Fixed Asset
 */
export interface FixedAsset {
  assetId: string;
  assetNumber: string;
  assetName: string;
  assetCategory?: string;
  serialNumber?: string;
  purchaseDate: Date;
  purchaseCost: number;
  salvageValue: number;
  usefulLife: number;
  depreciationMethod: DepreciationMethod;
  currentBookValue?: number;
  accumulatedDepreciation: number;
  status: string;
  location?: string;
  assignedTo?: string;
  createdAt: Date;
  createdBy?: string;
  updatedAt?: Date;
}

/**
 * Depreciation Schedule
 */
export interface DepreciationSchedule {
  scheduleId: string;
  assetId: string;
  fiscalYear: number;
  fiscalPeriod: string;
  depreciationAmount: number;
  bookValueBeginning: number;
  bookValueEnding: number;
  accumulatedDepreciation: number;
  isDepreciated: boolean;
  calculatedAt: Date;
  createdAt: Date;
}

/**
 * Audit Log
 */
export interface AuditLog {
  auditId: string;
  tableName: string;
  recordId: string;
  action: string;
  oldValues?: Record<string, unknown>;
  newValues?: Record<string, unknown>;
  changedBy?: string;
  changedAt: Date;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Document Attachment
 */
export interface DocumentAttachment {
  attachmentId: string;
  recordType: string;
  recordId: string;
  documentName: string;
  documentType?: string;
  filePath: string;
  fileSize?: number;
  mimeType?: string;
  uploadedBy?: string;
  uploadedAt: Date;
}

/**
 * Approval
 */
export interface Approval {
  approvalId: string;
  approvalType: string;
  recordId: string;
  status: string;
  requestedBy?: string;
  requestedAt: Date;
  approvedBy?: string;
  approvedAt?: Date;
  rejectedBy?: string;
  rejectedAt?: Date;
  comments?: string;
  createdAt: Date;
}

/**
 * Apply Payment DTO
 */
export interface ApplyPaymentDTO {
  paymentDate: Date;
  paymentMethod?: string;
  amount: number;
  referenceNumber?: string;
  notes?: string;
  createdBy: string;
}

/**
 * Create Credit Memo DTO
 */
export interface CreateCreditMemoDTO {
  memoDate: Date;
  reason: string;
  amount: number;
  createdBy: string;
}

/**
 * Create Bank Reconciliation DTO
 */
export interface CreateBankReconciliationDTO {
  bankAccountId: string;
  statementDate: Date;
  statementBalance: number;
  reconciledBy?: string;
}

/**
 * Create Revenue Contract DTO
 */
export interface CreateRevenueContractDTO {
  contractNumber: string;
  customerId: string;
  contractName: string;
  totalValue: number;
  startDate: Date;
  endDate: Date;
  recognitionMethod: RevenueRecognitionMethod;
  createdBy: string;
}

/**
 * Create Budget DTO
 */
export interface CreateBudgetDTO {
  budgetName: string;
  fiscalYear: number;
  budgetType: string;
  createdBy: string;
}

/**
 * Create Fixed Asset DTO
 */
export interface CreateFixedAssetDTO {
  assetNumber: string;
  assetName: string;
  assetCategory?: string;
  serialNumber?: string;
  purchaseDate: Date;
  purchaseCost: number;
  salvageValue: number;
  usefulLife: number;
  depreciationMethod: DepreciationMethod;
  location?: string;
  createdBy: string;
}

/**
 * Create Forecast DTO
 */
export interface CreateForecastDTO {
  forecastName: string;
  forecastType: string;
  startDate: Date;
  endDate: Date;
  createdBy: string;
}

// ============================================================================
// RMA (RETURN MERCHANDISE AUTHORIZATION) TYPES
// ============================================================================

/**
 * RMA Status
 */
export enum RMAStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  RECEIVED = 'RECEIVED',
  INSPECTING = 'INSPECTING',
  AWAITING_DECISION = 'AWAITING_DECISION',
  REFUND_APPROVED = 'REFUND_APPROVED',
  REFUND_PROCESSING = 'REFUND_PROCESSING',
  REFUNDED = 'REFUNDED',
  REPLACEMENT_APPROVED = 'REPLACEMENT_APPROVED',
  REPLACEMENT_PROCESSING = 'REPLACEMENT_PROCESSING',
  REPLACED = 'REPLACED',
  REPAIR_APPROVED = 'REPAIR_APPROVED',
  REPAIRING = 'REPAIRING',
  REPAIRED = 'REPAIRED',
  CLOSED = 'CLOSED',
}

/**
 * RMA Reason
 */
export enum RMAReason {
  DEFECTIVE = 'DEFECTIVE',
  DAMAGED_SHIPPING = 'DAMAGED_SHIPPING',
  WRONG_ITEM = 'WRONG_ITEM',
  NO_LONGER_NEEDED = 'NO_LONGER_NEEDED',
  WARRANTY = 'WARRANTY',
  QUALITY_ISSUE = 'QUALITY_ISSUE',
  MISSING_PARTS = 'MISSING_PARTS',
  ARRIVED_LATE = 'ARRIVED_LATE',
  ORDER_ERROR = 'ORDER_ERROR',
  OTHER = 'OTHER',
}

/**
 * RMA Priority
 */
export enum RMAPriority {
  LOW = 'LOW',
  NORMAL = 'NORMAL',
  HIGH = 'HIGH',
  URGENT = 'URGENT',
}

/**
 * RMA Resolution Type
 */
export enum RMAResolutionType {
  REFUND = 'REFUND',
  REPLACEMENT = 'REPLACEMENT',
  REPAIR = 'REPAIR',
  CREDIT = 'CREDIT',
  EXCHANGE = 'EXCHANGE',
  RESTOCK = 'RESTOCK',
  DISPOSE = 'DISPOSE',
}

/**
 * RMA Condition
 */
export enum RMACondition {
  NEW = 'NEW',
  USED = 'USED',
  OPENED = 'OPENED',
  DAMAGED = 'DAMAGED',
  DEFECTIVE = 'DEFECTIVE',
}

/**
 * RMA Disposition
 */
export enum RMADisposition {
  RESALE = 'RESALE',
  REFURBISH = 'REFURBISH',
  REPAIR = 'REPAIR',
  RETURN_TO_VENDOR = 'RETURN_TO_VENDOR',
  DISPOSE = 'DISPOSE',
  DONATE = 'DONATE',
  QUARANTINE = 'QUARANTINE',
}

/**
 * RMA Request
 */
export interface RMARequest {
  rmaId: string;
  rmaNumber: string;
  orderId: string;
  orderItemId: string;
  customerId?: string;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  sku: string;
  productName: string;
  quantity: number;
  reason: RMAReason;
  reasonDescription?: string;
  status: RMAStatus;
  priority: RMAPriority;
  condition?: RMACondition;
  resolutionType?: RMAResolutionType;
  disposition?: RMADisposition;
  refundAmount?: number;
  replacementOrderId?: string;
  requestedDate: Date;
  approvedAt?: Date;
  approvedBy?: string;
  receivedAt?: Date;
  receivedBy?: string;
  inspectedAt?: Date;
  inspectedBy?: string;
  resolvedAt?: Date;
  resolvedBy?: string;
  closedAt?: Date;
  closedBy?: string;
  trackingNumber?: string;
  carrier?: string;
  returnLabelUrl?: string;
  customerNotes?: string;
  internalNotes?: string;
  resolutionNotes?: string;
  rejectionReason?: string;
  refundMethod?: 'ORIGINAL' | 'STORE_CREDIT' | 'BANK_TRANSFER' | 'CHECK';
  refundProcessedAt?: Date;
  replacementShippedAt?: Date;
  createdBy: string;
  createdAt: Date;
  updatedAt?: Date;
  updatedBy?: string;
  images?: string[];
  attachments?: string[];
}

/**
 * RMA Inspection
 */
export interface RMAInspection {
  inspectionId: string;
  rmaId: string;
  inspectedBy: string;
  inspectionDate: Date;
  condition: RMACondition;
  findings: string;
  disposition?: RMADisposition;
  recommendedResolution?: RMAResolutionType;
  estimatedRefundAmount?: number;
  repairable: boolean;
  images?: string[];
  createdAt: Date;
}

/**
 * RMA Activity
 */
export interface RMAActivity {
  activityId: string;
  rmaId: string;
  activityType:
    | 'CREATED'
    | 'APPROVED'
    | 'REJECTED'
    | 'RECEIVED'
    | 'INSPECTED'
    | 'RESOLVED'
    | 'REFUNDED'
    | 'REPLACED'
    | 'REPAIRED'
    | 'CLOSED'
    | 'NOTE_ADDED'
    | 'STATUS_CHANGED';
  description: string;
  oldStatus?: RMAStatus;
  newStatus?: RMAStatus;
  performedBy: string;
  performedAt: Date;
}

/**
 * Create RMA DTO
 */
export interface CreateRMADTO {
  orderId: string;
  orderItemId: string;
  sku: string;
  quantity: number;
  reason: RMAReason;
  reasonDescription?: string;
  priority?: RMAPriority;
  condition?: RMACondition;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  customerNotes?: string;
  createdBy: string;
}

/**
 * Update RMA Status DTO
 */
export interface UpdateRMAStatusDTO {
  status: RMAStatus;
  notes?: string;
}

/**
 * Process Refund DTO
 */
export interface ProcessRefundDTO {
  refundMethod: 'ORIGINAL' | 'STORE_CREDIT' | 'BANK_TRANSFER' | 'CHECK';
  refundAmount: number;
  notes?: string;
}
