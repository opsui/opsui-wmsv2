/**
 * Multi-Entity Types
 *
 * Types for multi-company, multi-subsidiary ERP functionality.
 * Supports entity hierarchy, inter-company transactions, and consolidation.
 */

// ============================================================================
// ENUMS
// ============================================================================

/**
 * Entity types in the hierarchy
 */
export enum EntityType {
  HEAD_OFFICE = 'HEAD_OFFICE',
  SUBSIDIARY = 'SUBSIDIARY',
  BRANCH = 'BRANCH',
  DIVISION = 'DIVISION',
}

/**
 * Entity status
 */
export enum EntityStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  PENDING_SETUP = 'PENDING_SETUP',
  CLOSED = 'CLOSED',
}

/**
 * Inter-company transaction types
 */
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

/**
 * Inter-company transaction status
 */
export enum IntercompanyTransactionStatus {
  PENDING = 'PENDING',
  POSTED = 'POSTED',
  ELIMINATED = 'ELIMINATED',
  REVERSED = 'REVERSED',
}

/**
 * Entity relationship types
 */
export enum EntityRelationshipType {
  PARENT_SUBSIDIARY = 'PARENT_SUBSIDIARY',
  JOINT_VENTURE = 'JOINT_VENTURE',
  AFFILIATE = 'AFFILIATE',
  PARTNERSHIP = 'PARTNERSHIP',
  STRATEGIC_ALLIANCE = 'STRATEGIC_ALLIANCE',
}

/**
 * Entity user roles
 */
export enum EntityUserRole {
  ENTITY_ADMIN = 'ENTITY_ADMIN',
  ENTITY_USER = 'ENTITY_USER',
  ENTITY_VIEWER = 'ENTITY_VIEWER',
  ENTITY_ACCOUNTANT = 'ENTITY_ACCOUNTANT',
  ENTITY_MANAGER = 'ENTITY_MANAGER',
}

/**
 * Consolidation methods for subsidiary financials
 */
export enum ConsolidationMethod {
  FULL_CONSOLIDATION = 'FULL_CONSOLIDATION',
  PROPORTIONAL_CONSOLIDATION = 'PROPORTIONAL_CONSOLIDATION',
  EQUITY_METHOD = 'EQUITY_METHOD',
  COST_METHOD = 'COST_METHOD',
}

/**
 * Entity audit actions
 */
export enum EntityAuditAction {
  ENTITY_CREATED = 'ENTITY_CREATED',
  ENTITY_UPDATED = 'ENTITY_UPDATED',
  ENTITY_DELETED = 'ENTITY_DELETED',
  ENTITY_MERGED = 'ENTITY_MERGED',
  RELATIONSHIP_ADDED = 'RELATIONSHIP_ADDED',
  RELATIONSHIP_REMOVED = 'RELATIONSHIP_REMOVED',
  USER_ASSIGNED = 'USER_ASSIGNED',
  USER_REMOVED = 'USER_REMOVED',
  CONSOLIDATION_RULE_CHANGED = 'CONSOLIDATION_RULE_CHANGED',
  SETTINGS_CHANGED = 'SETTINGS_CHANGED',
}

// ============================================================================
// ENTITY TYPES
// ============================================================================

/**
 * Entity (company/subsidiary) interface
 */
export interface Entity {
  entity_id: string;
  entity_code: string;
  entity_name: string;
  parent_entity_id: string | null;
  entity_type: EntityType;
  entity_status: EntityStatus;
  legal_name: string | null;
  tax_id: string | null;
  registration_number: string | null;
  base_currency: string;
  // Address
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  state_province: string | null;
  postal_code: string | null;
  country_code: string | null;
  // Contact
  phone: string | null;
  email: string | null;
  website: string | null;
  // Financial
  fiscal_year_start_month: number;
  // Hierarchy
  hierarchy_level: number;
  sort_order: number;
  // Metadata
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
  created_by: string | null;
}

/**
 * Entity with parent details expanded
 */
export interface EntityWithParent extends Entity {
  parent_entity: Entity | null;
  children_entities?: Entity[];
  hierarchy_path?: Entity[];
}

/**
 * Create Entity DTO
 */
export interface CreateEntityDTO {
  entity_code: string;
  entity_name: string;
  parent_entity_id?: string;
  entity_type: EntityType;
  legal_name?: string;
  tax_id?: string;
  registration_number?: string;
  base_currency?: string;
  address_line1?: string;
  address_line2?: string;
  city?: string;
  state_province?: string;
  postal_code?: string;
  country_code?: string;
  phone?: string;
  email?: string;
  website?: string;
  fiscal_year_start_month?: number;
}

/**
 * Update Entity DTO
 */
export interface UpdateEntityDTO {
  entity_name?: string;
  parent_entity_id?: string;
  entity_type?: EntityType;
  entity_status?: EntityStatus;
  legal_name?: string;
  tax_id?: string;
  registration_number?: string;
  base_currency?: string;
  address_line1?: string;
  address_line2?: string;
  city?: string;
  state_province?: string;
  postal_code?: string;
  country_code?: string;
  phone?: string;
  email?: string;
  website?: string;
  fiscal_year_start_month?: number;
}

// ============================================================================
// INTER-COMPANY TRANSACTION TYPES
// ============================================================================

/**
 * Inter-company transaction interface
 */
export interface IntercompanyTransaction {
  transaction_id: string;
  transaction_number: string;
  from_entity_id: string;
  to_entity_id: string;
  transaction_date: Date;
  transaction_type: IntercompanyTransactionType;
  transaction_status: IntercompanyTransactionStatus;
  amount: number;
  currency: string;
  exchange_rate: number;
  base_currency_amount: number | null;
  description: string | null;
  reference_number: string | null;
  // Accounting integration
  from_journal_entry_id: string | null;
  to_journal_entry_id: string | null;
  elimination_journal_id: string | null;
  // Approval
  approved_by: string | null;
  approved_at: Date | null;
  // Metadata
  notes: string | null;
  created_at: Date;
  updated_at: Date;
  created_by: string | null;
}

/**
 * Inter-company transaction with entity details
 */
export interface IntercompanyTransactionWithDetails extends IntercompanyTransaction {
  from_entity: Entity;
  to_entity: Entity;
}

/**
 * Create Inter-company Transaction DTO
 */
export interface CreateIntercompanyTransactionDTO {
  from_entity_id: string;
  to_entity_id: string;
  transaction_date: Date;
  transaction_type: IntercompanyTransactionType;
  amount: number;
  currency?: string;
  description?: string;
  reference_number?: string;
  notes?: string;
}

/**
 * Update Inter-company Transaction DTO
 */
export interface UpdateIntercompanyTransactionDTO {
  transaction_date?: Date;
  transaction_status?: IntercompanyTransactionStatus;
  amount?: number;
  description?: string;
  notes?: string;
}

// ============================================================================
// ENTITY RELATIONSHIP TYPES
// ============================================================================

/**
 * Entity relationship interface
 */
export interface EntityRelationship {
  relationship_id: string;
  entity_id: string;
  related_entity_id: string;
  relationship_type: EntityRelationshipType;
  ownership_percentage: number | null;
  is_primary_contact: boolean;
  effective_date: Date | null;
  expiry_date: Date | null;
  notes: string | null;
  created_at: Date;
  created_by: string | null;
}

/**
 * Entity relationship with details
 */
export interface EntityRelationshipWithDetails extends EntityRelationship {
  entity: Entity;
  related_entity: Entity;
}

/**
 * Create Entity Relationship DTO
 */
export interface CreateEntityRelationshipDTO {
  entity_id: string;
  related_entity_id: string;
  relationship_type: EntityRelationshipType;
  ownership_percentage?: number;
  is_primary_contact?: boolean;
  effective_date?: Date;
  expiry_date?: Date;
  notes?: string;
}

// ============================================================================
// ENTITY SETTINGS TYPES
// ============================================================================

/**
 * Entity setting interface
 */
export interface EntitySetting {
  setting_id: string;
  entity_id: string;
  setting_key: string;
  setting_value: string | null;
  setting_type: 'STRING' | 'NUMBER' | 'BOOLEAN' | 'JSON';
  description: string | null;
  is_encrypted: boolean;
  updated_at: Date;
  updated_by: string | null;
}

/**
 * Create/Update Entity Setting DTO
 */
export interface UpsertEntitySettingDTO {
  entity_id: string;
  setting_key: string;
  setting_value: string;
  setting_type?: 'STRING' | 'NUMBER' | 'BOOLEAN' | 'JSON';
  description?: string;
  is_encrypted?: boolean;
}

// ============================================================================
// ENTITY USER TYPES
// ============================================================================

/**
 * Entity user assignment interface
 */
export interface EntityUser {
  entity_user_id: string;
  entity_id: string;
  user_id: string;
  entity_user_role: EntityUserRole;
  is_default_entity: boolean;
  // Access control
  can_view_financials: boolean;
  can_edit_financials: boolean;
  can_approve_transactions: boolean;
  // Permissions (JSON)
  permissions: Record<string, unknown> | null;
  // Metadata
  effective_date: Date;
  expiry_date: Date | null;
  is_active: boolean;
  created_at: Date;
  created_by: string | null;
}

/**
 * Entity user with details
 */
export interface EntityUserWithDetails extends EntityUser {
  entity: Entity;
  user: {
    user_id: string;
    email: string;
    first_name: string;
    last_name: string;
  };
}

/**
 * Assign Entity User DTO
 */
export interface AssignEntityUserDTO {
  entity_id: string;
  user_id: string;
  entity_user_role: EntityUserRole;
  is_default_entity?: boolean;
  can_view_financials?: boolean;
  can_edit_financials?: boolean;
  can_approve_transactions?: boolean;
  permissions?: Record<string, unknown>;
  effective_date?: Date;
  expiry_date?: Date;
}

/**
 * Update Entity User DTO
 */
export interface UpdateEntityUserDTO {
  entity_user_role?: EntityUserRole;
  is_default_entity?: boolean;
  can_view_financials?: boolean;
  can_edit_financials?: boolean;
  can_approve_transactions?: boolean;
  permissions?: Record<string, unknown>;
  expiry_date?: Date;
  is_active?: boolean;
}

// ============================================================================
// CONSOLIDATION RULE TYPES
// ============================================================================

/**
 * Consolidation rule interface
 */
export interface ConsolidationRule {
  rule_id: string;
  parent_entity_id: string;
  subsidiary_entity_id: string;
  consolidation_method: ConsolidationMethod;
  ownership_percentage: number;
  control_percentage: number;
  voting_percentage: number;
  // Elimination rules
  eliminate_intercompany: boolean;
  eliminate_unrealized_gains: boolean;
  // Accounting
  consolidation_account_id: string | null;
  minority_interest_account_id: string | null;
  // Effective dates
  effective_date: Date;
  expiry_date: Date | null;
  // Metadata
  notes: string | null;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
  created_by: string | null;
}

/**
 * Consolidation rule with details
 */
export interface ConsolidationRuleWithDetails extends ConsolidationRule {
  parent_entity: Entity;
  subsidiary_entity: Entity;
}

/**
 * Create Consolidation Rule DTO
 */
export interface CreateConsolidationRuleDTO {
  parent_entity_id: string;
  subsidiary_entity_id: string;
  consolidation_method: ConsolidationMethod;
  ownership_percentage: number;
  control_percentage?: number;
  voting_percentage?: number;
  eliminate_intercompany?: boolean;
  eliminate_unrealized_gains?: boolean;
  consolidation_account_id?: string;
  minority_interest_account_id?: string;
  effective_date?: Date;
  expiry_date?: Date;
  notes?: string;
}

/**
 * Update Consolidation Rule DTO
 */
export interface UpdateConsolidationRuleDTO {
  consolidation_method?: ConsolidationMethod;
  ownership_percentage?: number;
  control_percentage?: number;
  voting_percentage?: number;
  eliminate_intercompany?: boolean;
  eliminate_unrealized_gains?: boolean;
  consolidation_account_id?: string;
  minority_interest_account_id?: string;
  expiry_date?: Date;
  is_active?: boolean;
  notes?: string;
}

// ============================================================================
// ENTITY EXCHANGE RATE TYPES
// ============================================================================

/**
 * Entity exchange rate interface
 */
export interface EntityExchangeRate {
  rate_id: string;
  entity_id: string;
  from_currency: string;
  to_currency: string;
  rate_date: Date;
  exchange_rate: number;
  rate_source: string | null;
  is_override: boolean;
  is_active: boolean;
  created_at: Date;
  created_by: string | null;
}

/**
 * Create Entity Exchange Rate DTO
 */
export interface CreateEntityExchangeRateDTO {
  entity_id: string;
  from_currency: string;
  to_currency: string;
  rate_date: Date;
  exchange_rate: number;
  rate_source?: string;
  is_override?: boolean;
}

// ============================================================================
// ENTITY AUDIT TYPES
// ============================================================================

/**
 * Entity audit log interface
 */
export interface EntityAuditLog {
  audit_id: string;
  entity_id: string | null;
  action: EntityAuditAction;
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  related_entity_id: string | null;
  user_id: string | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: Date;
}

/**
 * Entity audit log with details
 */
export interface EntityAuditLogWithDetails extends EntityAuditLog {
  entity: Entity | null;
  related_entity: Entity | null;
  user: {
    user_id: string;
    email: string;
    first_name: string;
    last_name: string;
  } | null;
}

// ============================================================================
// CONSOLIDATION TYPES
// ============================================================================

/**
 * Consolidated financial statements interface
 */
export interface ConsolidatedFinancials {
  period: string;
  parent_entity_id: string;
  entity_ids: string[];
  // Financial statements
  balance_sheet: {
    assets: number;
    liabilities: number;
    equity: number;
    minority_interest: number;
    consolidated_equity: number;
  };
  profit_loss: {
    revenue: number;
    expenses: number;
    net_income: number;
    minority_interest_share: number;
    consolidated_net_income: number;
  };
  cash_flow: {
    operating_cash_flow: number;
    investing_cash_flow: number;
    financing_cash_flow: number;
    net_cash_flow: number;
  };
  // Elimination entries
  elimination_entries: Array<{
    account_id: string;
    account_name: string;
    debit: number;
    credit: number;
    description: string;
  }>;
  // Inter-company eliminations
  intercompany_eliminations: {
    total_revenue_eliminated: number;
    total_expense_eliminated: number;
    total_receivables_eliminated: number;
    total_payables_eliminated: number;
  };
}

/**
 * Entity hierarchy node
 */
export interface EntityHierarchyNode {
  entity_id: string;
  entity_code: string;
  entity_name: string;
  entity_type: EntityType;
  hierarchy_level: number;
  parent_entity_id: string | null;
  children: EntityHierarchyNode[];
}

// ============================================================================
// FILTER AND QUERY TYPES
// ============================================================================

/**
 * Entity query filters
 */
export interface EntityQueryFilters {
  entity_type?: EntityType;
  entity_status?: EntityStatus;
  parent_entity_id?: string | null;
  base_currency?: string;
  country_code?: string;
  is_active?: boolean;
  search?: string;
}

/**
 * Inter-company transaction query filters
 */
export interface IntercompanyTransactionQueryFilters {
  from_entity_id?: string;
  to_entity_id?: string;
  entity_id?: string; // Either from or to
  transaction_type?: IntercompanyTransactionType;
  transaction_status?: IntercompanyTransactionStatus;
  date_from?: Date;
  date_to?: Date;
  search?: string;
}

/**
 * Consolidation request
 */
export interface ConsolidationRequest {
  period: string; // YYYY-MM format
  parent_entity_id: string;
  include_subsidiaries?: boolean;
  include_branches?: boolean;
  consolidation_date?: Date;
}

// ============================================================================
// RESPONSE TYPES
// ============================================================================

/**
 * Entity list response
 */
export interface EntityListResponse {
  entities: EntityWithParent[];
  total_count: number;
  page: number;
  page_size: number;
}

/**
 * Entity hierarchy response
 */
export interface EntityHierarchyResponse {
  hierarchy: EntityHierarchyNode[];
  total_entities: number;
  max_depth: number;
}

/**
 * Inter-company transaction summary
 */
export interface IntercompanyTransactionSummary {
  total_transactions: number;
  total_amount: number;
  by_type: Record<IntercompanyTransactionType, number>;
  by_status: Record<IntercompanyTransactionStatus, number>;
  pending_count: number;
  pending_amount: number;
}
