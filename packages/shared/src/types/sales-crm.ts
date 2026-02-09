/**
 * Sales & CRM Module Types
 *
 * Basic customer relationship management and sales pipeline functionality
 */

// ============================================================================
// ENUMS
// ============================================================================

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

// ============================================================================
// INTERFACES
// ============================================================================

/**
 * Customer record
 */
export interface Customer {
  customerId: string;
  customerNumber: string; // Human-readable CUST-XXXXX
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
  assignedTo?: string; // User ID
  createdAt: Date;
  createdBy: string;
  updatedAt?: Date;
  updatedBy?: string;
  lastContactDate?: Date;
}

/**
 * Sales lead
 */
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
  source: string; // Website, Referral, Cold Call, etc.
  description?: string;
  assignedTo: string; // User ID
  expectedCloseDate?: Date;
  createdAt: Date;
  createdBy: string;
  updatedAt?: Date;
  updatedBy?: string;
  lastContactDate?: Date;
  nextFollowUpDate?: Date;
}

/**
 * Sales opportunity
 */
export interface Opportunity {
  opportunityId: string;
  opportunityNumber: string; // OPP-XXXXX
  customerId?: string; // Linked to customer if converted
  name: string;
  stage: OpportunityStage;
  amount: number;
  probability: number; // 0-100
  expectedCloseDate: Date;
  description?: string;
  assignedTo: string; // User ID
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

/**
 * Sales quote
 */
export interface Quote {
  quoteId: string;
  quoteNumber: string; // QT-XXXXX
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

/**
 * Quote line item
 */
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

/**
 * Customer interaction log
 */
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

/**
 * Address type
 */
export interface Address {
  street1: string;
  street2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

// ============================================================================
// SALES ORDER MANAGEMENT TYPES (Phase 6)
// ============================================================================

/**
 * Sales order status
 */
export enum SalesOrderStatus {
  DRAFT = 'DRAFT',
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  PICKING = 'PICKING',
  PICKED = 'PICKED',
  PARTIAL = 'PARTIAL',
  SHIPPED = 'SHIPPED',
  INVOICED = 'INVOICED',
  CLOSED = 'CLOSED',
  CANCELLED = 'CANCELLED',
}

/**
 * Sales order line status
 */
export enum SalesOrderLineStatus {
  PENDING = 'PENDING',
  PICKED = 'PICKED',
  SHIPPED = 'SHIPPED',
  INVOICED = 'INVOICED',
  BACKORDERED = 'BACKORDERED',
  CANCELLED = 'CANCELLED',
}

/**
 * Source channel for orders
 */
export enum OrderSourceChannel {
  WEB = 'WEB',
  PHONE = 'PHONE',
  EMAIL = 'EMAIL',
  FAX = 'FAX',
  ECOMMERCE = 'ECOMMERCE',
  WALK_IN = 'WALK_IN',
}

/**
 * Approval status
 */
export enum ApprovalStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

/**
 * Transaction type for commissions
 */
export enum CommissionTransactionType {
  SALE = 'SALE',
  PAYMENT = 'PAYMENT',
  ADJUSTMENT = 'ADJUSTMENT',
}

/**
 * Commission status
 */
export enum CommissionStatus {
  EARNED = 'EARNED',
  PAID = 'PAID',
  VOIDED = 'VOIDED',
}

/**
 * Territory type
 */
export enum TerritoryType {
  REGION = 'REGION',
  DISTRICT = 'DISTRICT',
  AREA = 'AREA',
  ZONE = 'ZONE',
}

/**
 * Backorder status
 */
export enum BackorderStatus {
  OPEN = 'OPEN',
  PARTIAL = 'PARTIAL',
  FULFILLED = 'FULFILLED',
  CANCELLED = 'CANCELLED',
}

/**
 * Sales order
 */
export interface SalesOrder {
  orderId: string;
  entityId?: string;
  customerId: string;
  orderNumber: string;
  orderDate: Date;
  orderStatus: SalesOrderStatus;
  warehouseId?: string;
  shippingMethodId?: string;
  paymentTerms: string;
  currency: string;
  exchangeRate: number;
  subtotal: number;
  discountAmount: number;
  discountPercent: number;
  taxAmount: number;
  shippingAmount: number;
  totalAmount: number;
  customerPoNumber?: string;
  requestedDate?: Date;
  promisedDate?: Date;
  shipDate?: Date;
  trackingNumber?: string;
  notes?: string;
  internalNotes?: string;
  salesPersonId?: string;
  territoryId?: string;
  commissionRate: number;
  commissionAmount: number;
  commissionPaid: boolean;
  requiresApproval: boolean;
  approvalStatus: ApprovalStatus;
  approvedBy?: string;
  approvedDate?: Date;
  approvalNotes?: string;
  sourceChannel?: OrderSourceChannel;
  ecommerceOrderId?: string;
  originalOrderId?: string;
  isBackorder: boolean;
  createdAt: Date;
  createdBy?: string;
  updatedAt?: Date;
  updatedBy?: string;
}

/**
 * Sales order line
 */
export interface SalesOrderLine {
  lineId: string;
  orderId: string;
  lineNumber: number;
  sku: string;
  description?: string;
  quantity: number;
  unitPrice: number;
  discountPercent: number;
  discountAmount: number;
  taxCode?: string;
  taxRate: number;
  taxAmount: number;
  lineTotal: number;
  quantityPicked: number;
  quantityShipped: number;
  quantityInvoiced: number;
  quantityBackordered: number;
  status: SalesOrderLineStatus;
  notes?: string;
  createdAt: Date;
}

/**
 * Backorder
 */
export interface Backorder {
  backorderId: string;
  originalOrderId: string;
  originalLineId?: string;
  orderId: string;
  sku: string;
  description?: string;
  quantityOriginal: number;
  quantityOutstanding: number;
  quantityFulfilled: number;
  promisedDate?: Date;
  customerId: string;
  status: BackorderStatus;
  priority: number;
  notes?: string;
  createdAt: Date;
  updatedAt?: Date;
  fulfilledDate?: Date;
}

/**
 * Sales commission
 */
export interface SalesCommission {
  commissionId: string;
  orderId: string;
  lineId?: string;
  salesPersonId: string;
  commissionDate: Date;
  transactionType: CommissionTransactionType;
  baseAmount: number;
  commissionRate: number;
  commissionAmount: number;
  status: CommissionStatus;
  paidDate?: Date;
  paymentId?: string;
  notes?: string;
  createdAt: Date;
}

/**
 * Sales territory
 */
export interface SalesTerritory {
  territoryId: string;
  territoryCode: string;
  territoryName: string;
  description?: string;
  managerId?: string;
  territoryType: TerritoryType;
  parentTerritoryId?: string;
  isActive: boolean;
  createdAt: Date;
}

/**
 * Sales territory customer assignment
 */
export interface SalesTerritoryCustomer {
  territoryCustomerId: string;
  territoryId: string;
  customerId: string;
  assignedDate: Date;
  assignedBy?: string;
  isPrimary: boolean;
  notes?: string;
  createdAt: Date;
}

/**
 * Sales territory quota
 */
export interface SalesTerritoryQuota {
  quotaId: string;
  territoryId: string;
  quotaYear: number;
  quotaMonth?: number;
  quotaAmount: number;
  quotaType: string;
  actualAmount: number;
  variancePercent?: number;
  status: string;
  notes?: string;
  createdAt: Date;
}

/**
 * Sales order approval
 */
export interface SalesOrderApproval {
  approvalId: string;
  orderId: string;
  approvalLevel: number;
  approverId: string;
  approvalStatus: ApprovalStatus;
  requestedDate: Date;
  approvedDate?: Date;
  rejectionReason?: string;
  notes?: string;
}

/**
 * Sales order activity
 */
export interface SalesOrderActivity {
  activityId: string;
  orderId: string;
  activityType: string;
  activityDate: Date;
  userId: string;
  fieldName?: string;
  oldValue?: string;
  newValue?: string;
  notes?: string;
}

// ============================================================================
// REQUEST/RESPONSE TYPES
// ============================================================================

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

// ============================================================================
// SALES ORDER MANAGEMENT DTOs (Phase 6)
// ============================================================================

export interface CreateSalesOrderDTO {
  customerId: string;
  warehouseId?: string;
  shippingMethodId?: string;
  paymentTerms?: string;
  currency?: string;
  customerPoNumber?: string;
  requestedDate?: string;
  promisedDate?: string;
  notes?: string;
  internalNotes?: string;
  salesPersonId?: string;
  territoryId?: string;
  commissionRate?: number;
  sourceChannel?: OrderSourceChannel;
  lines: CreateSalesOrderLineDTO[];
}

export interface CreateSalesOrderLineDTO {
  lineNumber: number;
  sku: string;
  description?: string;
  quantity: number;
  unitPrice: number;
  discountPercent?: number;
  taxCode?: string;
  notes?: string;
}

export interface UpdateSalesOrderDTO {
  orderStatus?: SalesOrderStatus;
  promisedDate?: string;
  shippingMethodId?: string;
  notes?: string;
  internalNotes?: string;
  salesPersonId?: string;
  territoryId?: string;
}

export interface UpdateSalesOrderLineDTO {
  quantity?: number;
  unitPrice?: number;
  discountPercent?: number;
  notes?: string;
}

export interface CreateBackorderDTO {
  originalLineId: string;
  backorderQuantity: number;
  promisedDate?: string;
  priority?: number;
}

export interface CreateSalesTerritoryDTO {
  territoryCode: string;
  territoryName: string;
  description?: string;
  managerId?: string;
  territoryType?: TerritoryType;
  parentTerritoryId?: string;
}

export interface CreateTerritoryQuotaDTO {
  territoryId: string;
  quotaYear: number;
  quotaMonth?: number;
  quotaAmount: number;
  quotaType?: string;
}

export interface AssignTerritoryCustomerDTO {
  territoryId: string;
  customerId: string;
  isPrimary?: boolean;
}

export interface SalesOrderFilters {
  customerId?: string;
  orderStatus?: SalesOrderStatus;
  salesPersonId?: string;
  territoryId?: string;
  orderDateFrom?: string;
  orderDateTo?: string;
  sourceChannel?: OrderSourceChannel;
  isBackorder?: boolean;
  search?: string;
}

export interface BackorderFilters {
  customerId?: string;
  status?: BackorderStatus;
  sku?: string;
  promisedDateFrom?: string;
  promisedDateTo?: string;
}

export interface CommissionFilters {
  salesPersonId?: string;
  status?: CommissionStatus;
  commissionDateFrom?: string;
  commissionDateTo?: string;
}

export interface SalesOrderMetrics {
  totalOrders: number;
  pendingOrders: number;
  openOrders: number;
  shippedToday: number;
  totalRevenue: number;
  revenueThisMonth: number;
  averageOrderValue: number;
  backorderCount: number;
}

export interface TerritoryMetrics {
  territoryId: string;
  territoryName: string;
  customerCount: number;
  orderCount: number;
  totalSales: number;
  sales30Days: number;
  salesYTD: number;
  currentQuota: number;
  quotaPercentAchieved: number;
}
