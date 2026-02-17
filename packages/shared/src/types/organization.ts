/**
 * Organization Types
 *
 * Types for multi-tenant organization management.
 * Each organization represents a separate customer/account with isolated data.
 */

// ============================================================================
// ENUMS
// ============================================================================

/**
 * Organization status
 */
export enum OrganizationStatus {
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
  PENDING_SETUP = 'PENDING_SETUP',
  TRIAL = 'TRIAL',
  CLOSED = 'CLOSED',
}

/**
 * Organization subscription tier
 */
export enum OrganizationTier {
  FREE = 'FREE',
  STARTER = 'STARTER',
  PROFESSIONAL = 'PROFESSIONAL',
  ENTERPRISE = 'ENTERPRISE',
  CUSTOM = 'CUSTOM',
}

/**
 * Organization user role
 */
export enum OrganizationUserRole {
  ORG_OWNER = 'ORG_OWNER',
  ORG_ADMIN = 'ORG_ADMIN',
  ORG_MEMBER = 'ORG_MEMBER',
  ORG_VIEWER = 'ORG_VIEWER',
}

/**
 * Organization audit event types
 */
export enum OrganizationAuditEventType {
  ORG_CREATED = 'ORG_CREATED',
  ORG_UPDATED = 'ORG_UPDATED',
  ORG_STATUS_CHANGED = 'ORG_STATUS_CHANGED',
  ORG_TIER_CHANGED = 'ORG_TIER_CHANGED',
  USER_INVITED = 'USER_INVITED',
  USER_JOINED = 'USER_JOINED',
  USER_REMOVED = 'USER_REMOVED',
  USER_ROLE_CHANGED = 'USER_ROLE_CHANGED',
  SETTINGS_CHANGED = 'SETTINGS_CHANGED',
  DOMAIN_CHANGED = 'DOMAIN_CHANGED',
  BRANDING_CHANGED = 'BRANDING_CHANGED',
}

// ============================================================================
// ORGANIZATION INTERFACES
// ============================================================================

/**
 * Organization (tenant) interface
 */
export interface Organization {
  organizationId: string;
  organizationCode: string;
  organizationName: string;
  slug: string;

  // Status and tier
  status: OrganizationStatus;
  tier: OrganizationTier;

  // Contact information
  legalName: string | null;
  taxId: string | null;
  registrationNumber: string | null;

  // Address
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  stateProvince: string | null;
  postalCode: string | null;
  countryCode: string | null;

  // Contact
  phone: string | null;
  email: string | null;
  website: string | null;

  // Branding
  logoUrl: string | null;
  primaryColor: string | null;
  customDomain: string | null;

  // Settings
  baseCurrency: string;
  timezone: string;
  dateFormat: string;
  fiscalYearStartMonth: number;

  // Limits
  maxUsers: number;
  maxEntities: number;
  maxStorageMb: number;

  // Trial/subscription
  trialEndsAt: Date | null;
  subscriptionEndsAt: Date | null;

  // Metadata
  settings: Record<string, unknown>;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string | null;
}

/**
 * Organization with member count
 */
export interface OrganizationWithStats extends Organization {
  memberCount: number;
  entityCount: number;
  storageUsedMb: number;
}

/**
 * Create organization DTO
 */
export interface CreateOrganizationDTO {
  organizationName: string;
  slug?: string;
  legalName?: string;
  taxId?: string;
  registrationNumber?: string;
  tier?: OrganizationTier;

  // Address
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  stateProvince?: string;
  postalCode?: string;
  countryCode?: string;

  // Contact
  phone?: string;
  email?: string;
  website?: string;

  // Settings
  baseCurrency?: string;
  timezone?: string;
  dateFormat?: string;
  fiscalYearStartMonth?: number;

  // Owner (first user)
  ownerId: string;
}

/**
 * Update organization DTO
 */
export interface UpdateOrganizationDTO {
  organizationName?: string;
  legalName?: string;
  taxId?: string;
  registrationNumber?: string;

  // Address
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  stateProvince?: string;
  postalCode?: string;
  countryCode?: string;

  // Contact
  phone?: string;
  email?: string;
  website?: string;

  // Branding
  logoUrl?: string;
  primaryColor?: string;
  customDomain?: string;

  // Settings
  baseCurrency?: string;
  timezone?: string;
  dateFormat?: string;
  fiscalYearStartMonth?: number;
  settings?: Record<string, unknown>;
}

/**
 * Organization settings
 */
export interface OrganizationSetting {
  settingId: string;
  organizationId: string;
  settingKey: string;
  settingValue: string | null;
  settingType: 'STRING' | 'NUMBER' | 'BOOLEAN' | 'JSON';
  description: string | null;
  isEncrypted: boolean;
  isPublic: boolean;
  updatedAt: Date;
  updatedBy: string | null;
}

// ============================================================================
// ORGANIZATION USER INTERFACES
// ============================================================================

/**
 * Organization user (membership) interface
 */
export interface OrganizationUser {
  organizationUserId: string;
  organizationId: string;
  userId: string;

  // Role and permissions
  role: OrganizationUserRole;
  isPrimary: boolean;

  // Access control
  canManageUsers: boolean;
  canManageBilling: boolean;
  canManageSettings: boolean;
  canInviteUsers: boolean;

  // Status
  isActive: boolean;
  invitedBy: string | null;
  invitedAt: Date | null;
  joinedAt: Date;

  // Metadata
  lastAccessAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Organization user with user details
 */
export interface OrganizationUserWithDetails extends OrganizationUser {
  user: {
    userId: string;
    name: string;
    email: string;
    role: string;
    avatarUrl?: string;
  };
  organization: Organization;
}

/**
 * Assign user to organization DTO
 */
export interface AssignOrganizationUserDTO {
  organizationId: string;
  userId: string;
  role?: OrganizationUserRole;
  isPrimary?: boolean;
  canManageUsers?: boolean;
  canManageBilling?: boolean;
  canManageSettings?: boolean;
  canInviteUsers?: boolean;
}

/**
 * Update organization user DTO
 */
export interface UpdateOrganizationUserDTO {
  role?: OrganizationUserRole;
  isPrimary?: boolean;
  canManageUsers?: boolean;
  canManageBilling?: boolean;
  canManageSettings?: boolean;
  canInviteUsers?: boolean;
  isActive?: boolean;
}

// ============================================================================
// ORGANIZATION INVITATION INTERFACES
// ============================================================================

/**
 * Organization invitation interface
 */
export interface OrganizationInvitation {
  invitationId: string;
  organizationId: string;

  // Invitee details
  email: string;
  role: OrganizationUserRole;

  // Invitation tracking
  token: string;
  invitedBy: string;
  invitedAt: Date;

  // Status
  acceptedAt: Date | null;
  declinedAt: Date | null;
  expiresAt: Date;

  // Metadata
  message: string | null;
  createdAt: Date;
}

/**
 * Organization invitation with organization details
 */
export interface OrganizationInvitationWithDetails extends OrganizationInvitation {
  organization: {
    organizationId: string;
    organizationName: string;
    slug: string;
    logoUrl: string | null;
  };
  inviter: {
    userId: string;
    name: string;
    email: string;
  };
}

/**
 * Create invitation DTO
 */
export interface CreateInvitationDTO {
  organizationId: string;
  email: string;
  role?: OrganizationUserRole;
  message?: string;
}

/**
 * Accept invitation DTO
 */
export interface AcceptInvitationDTO {
  token: string;
  userId: string;
  name: string;
  password?: string; // For new users
}

// ============================================================================
// ORGANIZATION AUDIT LOG INTERFACES
// ============================================================================

/**
 * Organization audit log interface
 */
export interface OrganizationAuditLog {
  auditId: string;
  organizationId: string;

  // Event details
  eventType: OrganizationAuditEventType;
  eventDescription: string | null;

  // Actor
  userId: string | null;
  userEmail: string | null;

  // Changes
  oldValues: Record<string, unknown> | null;
  newValues: Record<string, unknown> | null;

  // Request context
  ipAddress: string | null;
  userAgent: string | null;

  // Metadata
  createdAt: Date;
}

// ============================================================================
// QUERY FILTERS AND RESPONSES
// ============================================================================

/**
 * Organization query filters
 */
export interface OrganizationQueryFilters {
  status?: OrganizationStatus;
  tier?: OrganizationTier;
  search?: string;
  isActive?: boolean;
  createdAfter?: Date;
  createdBefore?: Date;
}

/**
 * Organization user query filters
 */
export interface OrganizationUserQueryFilters {
  role?: OrganizationUserRole;
  isActive?: boolean;
  search?: string;
}

/**
 * Organization list response
 */
export interface OrganizationListResponse {
  organizations: OrganizationWithStats[];
  total: number;
  page: number;
  pageSize: number;
}

/**
 * User's organizations response
 */
export interface UserOrganizationsResponse {
  organizations: Array<{
    organizationId: string;
    organizationName: string;
    slug: string;
    role: OrganizationUserRole;
    isPrimary: boolean;
    logoUrl: string | null;
  }>;
  total: number;
}

// ============================================================================
// TIER LIMITS CONFIGURATION
// ============================================================================

/**
 * Tier limits configuration
 */
export interface TierLimits {
  tier: OrganizationTier;
  maxUsers: number;
  maxEntities: number;
  maxStorageMb: number;
  features: string[];
  priceMonthly: number;
  priceYearly: number;
}

/**
 * Default tier limits
 */
export const TIER_LIMITS: TierLimits[] = [
  {
    tier: OrganizationTier.FREE,
    maxUsers: 3,
    maxEntities: 1,
    maxStorageMb: 100,
    features: ['basic_inventory', 'basic_orders'],
    priceMonthly: 0,
    priceYearly: 0,
  },
  {
    tier: OrganizationTier.STARTER,
    maxUsers: 10,
    maxEntities: 3,
    maxStorageMb: 1000,
    features: ['basic_inventory', 'orders', 'shipping', 'basic_reports'],
    priceMonthly: 49,
    priceYearly: 490,
  },
  {
    tier: OrganizationTier.PROFESSIONAL,
    maxUsers: 50,
    maxEntities: 10,
    maxStorageMb: 10000,
    features: ['full_inventory', 'orders', 'shipping', 'reports', 'integrations', 'api_access'],
    priceMonthly: 149,
    priceYearly: 1490,
  },
  {
    tier: OrganizationTier.ENTERPRISE,
    maxUsers: 500,
    maxEntities: 50,
    maxStorageMb: 100000,
    features: ['all_features', 'sso', 'audit_logs', 'priority_support', 'custom_integrations'],
    priceMonthly: 499,
    priceYearly: 4990,
  },
  {
    tier: OrganizationTier.CUSTOM,
    maxUsers: -1, // Unlimited
    maxEntities: -1,
    maxStorageMb: -1,
    features: ['all_features', 'custom_limits', 'dedicated_support'],
    priceMonthly: 0, // Negotiated
    priceYearly: 0,
  },
];
