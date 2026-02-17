/**
 * Organization Service
 *
 * Business logic for multi-tenant organization management.
 * Handles organization CRUD, memberships, invitations, and access control.
 */

import type {
  AcceptInvitationDTO,
  AssignOrganizationUserDTO,
  CreateInvitationDTO,
  CreateOrganizationDTO,
  Organization,
  OrganizationInvitation,
  OrganizationInvitationWithDetails,
  OrganizationListResponse,
  OrganizationQueryFilters,
  OrganizationSetting,
  OrganizationStatus,
  OrganizationTier,
  OrganizationUser,
  OrganizationUserQueryFilters,
  OrganizationUserWithDetails,
  OrganizationWithStats,
  UpdateOrganizationDTO,
  UpdateOrganizationUserDTO,
  UserOrganizationsResponse,
} from '@opsui/shared';
import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from '@opsui/shared';
import { logger } from '../config/logger';
import {
  organizationInvitationRepository,
  organizationRepository,
  organizationSettingRepository,
  organizationUserRepository,
} from '../repositories/OrganizationRepository';
import { UserRepository } from '../repositories/UserRepository';

// ============================================================================
// ORGANIZATION SERVICE
// ============================================================================

class OrganizationService {
  private userRepository: UserRepository;

  constructor() {
    this.userRepository = new UserRepository();
  }

  // --------------------------------------------------------------------------
  // ORGANIZATION CRUD
  // --------------------------------------------------------------------------

  /**
   * Create a new organization
   * The creator becomes the ORG_OWNER
   */
  async createOrganization(data: CreateOrganizationDTO): Promise<Organization> {
    // Validate owner exists
    const owner = await this.userRepository.findById(data.ownerId);
    if (!owner) {
      throw new NotFoundError('User', data.ownerId);
    }

    // Check if slug is available (if provided)
    if (data.slug) {
      const existing = await organizationRepository.findBySlug(data.slug);
      if (existing) {
        throw new ConflictError(`Organization with slug '${data.slug}' already exists`);
      }
    }

    // Create organization
    const organization = await organizationRepository.createOrganization(data);

    logger.info('Organization created', {
      organizationId: organization.organizationId,
      name: organization.organizationName,
      ownerId: data.ownerId,
    });

    return organization;
  }

  /**
   * Get organization by ID
   */
  async getOrganization(organizationId: string): Promise<OrganizationWithStats> {
    const organization = await organizationRepository.findByIdWithStats(organizationId);
    if (!organization) {
      throw new NotFoundError('Organization', organizationId);
    }
    return organization;
  }

  /**
   * Get organization by slug
   */
  async getOrganizationBySlug(slug: string): Promise<OrganizationWithStats> {
    const organization = await organizationRepository.findBySlug(slug);
    if (!organization) {
      throw new NotFoundError('Organization', `slug: ${slug}`);
    }
    return this.getOrganization(organization.organizationId);
  }

  /**
   * List organizations with filters
   */
  async listOrganizations(
    filters: OrganizationQueryFilters,
    page: number = 1,
    pageSize: number = 20
  ): Promise<OrganizationListResponse> {
    const { organizations, total } = await organizationRepository.findAllWithFilters(
      filters,
      page,
      pageSize
    );

    return {
      organizations,
      total,
      page,
      pageSize,
    };
  }

  /**
   * Update organization
   */
  async updateOrganization(
    organizationId: string,
    data: UpdateOrganizationDTO,
    userId: string
  ): Promise<Organization> {
    // Check user has permission
    await this.checkPermission(organizationId, userId, 'can_manage_settings');

    const organization = await organizationRepository.updateOrganization(
      organizationId,
      data,
      userId
    );
    if (!organization) {
      throw new NotFoundError('Organization', organizationId);
    }

    logger.info('Organization updated', {
      organizationId,
      userId,
      changes: Object.keys(data),
    });

    return organization;
  }

  /**
   * Update organization status
   */
  async updateStatus(
    organizationId: string,
    status: OrganizationStatus,
    userId: string
  ): Promise<Organization> {
    // Only system admins or ORG_OWNER can change status
    const membership = await organizationUserRepository.findByOrganizationAndUser(
      organizationId,
      userId
    );
    if (!membership || membership.role !== 'ORG_OWNER') {
      throw new ForbiddenError('Only organization owners can change status');
    }

    const organization = await organizationRepository.updateStatus(organizationId, status, userId);
    if (!organization) {
      throw new NotFoundError('Organization', organizationId);
    }

    logger.info('Organization status changed', {
      organizationId,
      status,
      userId,
    });

    return organization;
  }

  /**
   * Update organization tier
   */
  async updateTier(
    organizationId: string,
    tier: OrganizationTier,
    userId: string
  ): Promise<Organization> {
    // Only system admins can change tier (for billing)
    const membership = await organizationUserRepository.findByOrganizationAndUser(
      organizationId,
      userId
    );
    if (!membership || (membership.role !== 'ORG_OWNER' && !membership.canManageBilling)) {
      throw new ForbiddenError('Only organization owners or billing managers can change tier');
    }

    const organization = await organizationRepository.updateTier(organizationId, tier, userId);
    if (!organization) {
      throw new NotFoundError('Organization', organizationId);
    }

    logger.info('Organization tier changed', {
      organizationId,
      tier,
      userId,
    });

    return organization;
  }

  // --------------------------------------------------------------------------
  // USER'S ORGANIZATIONS
  // --------------------------------------------------------------------------

  /**
   * Get user's organizations
   */
  async getUserOrganizations(userId: string): Promise<UserOrganizationsResponse> {
    const memberships = await organizationUserRepository.findUserOrganizations(userId);

    return {
      organizations: memberships.map(m => ({
        organizationId: m.organizationId,
        organizationName: m.organization.organizationName,
        slug: m.organization.slug,
        role: m.role,
        isPrimary: m.isPrimary,
        logoUrl: m.organization.logoUrl,
      })),
      total: memberships.length,
    };
  }

  /**
   * Set user's primary organization
   */
  async setPrimaryOrganization(userId: string, organizationId: string): Promise<void> {
    // Verify user is member of organization
    const membership = await organizationUserRepository.findByOrganizationAndUser(
      organizationId,
      userId
    );
    if (!membership || !membership.isActive) {
      throw new ForbiddenError('User is not a member of this organization');
    }

    await organizationUserRepository.setPrimaryOrganization(userId, organizationId);

    logger.info('Primary organization set', { userId, organizationId });
  }

  // --------------------------------------------------------------------------
  // MEMBERSHIP MANAGEMENT
  // --------------------------------------------------------------------------

  /**
   * Get organization members
   */
  async getMembers(
    organizationId: string,
    userId: string,
    filters: OrganizationUserQueryFilters = {},
    page: number = 1,
    pageSize: number = 50
  ): Promise<{ members: OrganizationUserWithDetails[]; total: number }> {
    // Check user has access
    await this.checkAccess(organizationId, userId);

    return organizationUserRepository.findOrganizationMembers(
      organizationId,
      filters,
      page,
      pageSize
    );
  }

  /**
   * Add user to organization
   */
  async addMember(
    organizationId: string,
    data: AssignOrganizationUserDTO,
    addedBy: string
  ): Promise<OrganizationUser> {
    // Check permission
    await this.checkPermission(organizationId, addedBy, 'can_manage_users');

    // Check user limit
    const memberCount = await organizationUserRepository.getMemberCount(organizationId);
    const org = await organizationRepository.findById(organizationId);
    if (org && org.maxUsers > 0 && memberCount >= org.maxUsers) {
      throw new ValidationError(`Organization has reached maximum member limit (${org.maxUsers})`);
    }

    // Verify user exists
    const user = await this.userRepository.findById(data.userId);
    if (!user) {
      throw new NotFoundError('User', data.userId);
    }

    const membership = await organizationUserRepository.assignUser({
      ...data,
      organizationId,
    });

    logger.info('Member added to organization', {
      organizationId,
      userId: data.userId,
      role: data.role,
      addedBy,
    });

    return membership;
  }

  /**
   * Update member role/permissions
   */
  async updateMember(
    organizationId: string,
    targetUserId: string,
    data: UpdateOrganizationUserDTO,
    updatedBy: string
  ): Promise<OrganizationUser> {
    // Check permission
    await this.checkPermission(organizationId, updatedBy, 'can_manage_users');

    // Cannot modify ORG_OWNER role unless you're ORG_OWNER
    const targetMembership = await organizationUserRepository.findByOrganizationAndUser(
      organizationId,
      targetUserId
    );
    if (targetMembership?.role === 'ORG_OWNER' && data.role && data.role !== 'ORG_OWNER') {
      const updaterMembership = await organizationUserRepository.findByOrganizationAndUser(
        organizationId,
        updatedBy
      );
      if (updaterMembership?.role !== 'ORG_OWNER') {
        throw new ForbiddenError('Only organization owners can modify owner role');
      }
    }

    const membership = await organizationUserRepository.updateUserMembership(
      organizationId,
      targetUserId,
      data
    );
    if (!membership) {
      throw new NotFoundError('Organization membership', `${organizationId}/${targetUserId}`);
    }

    logger.info('Member updated', {
      organizationId,
      targetUserId,
      updatedBy,
      changes: Object.keys(data),
    });

    return membership;
  }

  /**
   * Remove member from organization
   */
  async removeMember(
    organizationId: string,
    targetUserId: string,
    removedBy: string
  ): Promise<void> {
    // Check permission
    await this.checkPermission(organizationId, removedBy, 'can_manage_users');

    // Cannot remove ORG_OWNER
    const targetMembership = await organizationUserRepository.findByOrganizationAndUser(
      organizationId,
      targetUserId
    );
    if (targetMembership?.role === 'ORG_OWNER') {
      throw new ForbiddenError('Cannot remove organization owner');
    }

    const removed = await organizationUserRepository.removeUser(organizationId, targetUserId);
    if (!removed) {
      throw new NotFoundError('Organization membership', `${organizationId}/${targetUserId}`);
    }

    logger.info('Member removed from organization', {
      organizationId,
      targetUserId,
      removedBy,
    });
  }

  // --------------------------------------------------------------------------
  // INVITATIONS
  // --------------------------------------------------------------------------

  /**
   * Invite user to organization
   */
  async inviteUser(
    organizationId: string,
    data: CreateInvitationDTO,
    invitedBy: string
  ): Promise<OrganizationInvitation> {
    // Check permission
    await this.checkPermission(organizationId, invitedBy, 'can_invite_users');

    // Check if user is already a member
    const existingUser = await this.userRepository.findByEmail(data.email);
    if (existingUser) {
      const existingMembership = await organizationUserRepository.findByOrganizationAndUser(
        organizationId,
        existingUser.userId
      );
      if (existingMembership?.isActive) {
        throw new ConflictError('User is already a member of this organization');
      }
    }

    // Check for existing pending invitation
    const pendingInvites = await organizationInvitationRepository.findPendingByEmail(data.email);
    const existingInvite = pendingInvites.find(i => i.organizationId === organizationId);
    if (existingInvite) {
      throw new ConflictError('User already has a pending invitation to this organization');
    }

    const invitation = await organizationInvitationRepository.createInvitation(
      { ...data, organizationId },
      invitedBy
    );

    logger.info('User invited to organization', {
      organizationId,
      email: data.email,
      role: data.role,
      invitedBy,
    });

    // TODO: Send invitation email

    return invitation;
  }

  /**
   * Get pending invitations for organization
   */
  async getInvitations(organizationId: string, userId: string): Promise<OrganizationInvitation[]> {
    // Check access
    await this.checkAccess(organizationId, userId);

    return organizationInvitationRepository.findOrganizationInvitations(organizationId);
  }

  /**
   * Get pending invitations for email
   */
  async getPendingInvitations(email: string): Promise<OrganizationInvitationWithDetails[]> {
    return organizationInvitationRepository.findPendingByEmail(email);
  }

  /**
   * Get invitation by token
   */
  async getInvitationByToken(token: string): Promise<OrganizationInvitationWithDetails> {
    const invitation = await organizationInvitationRepository.findByToken(token);
    if (!invitation) {
      throw new NotFoundError('Invitation', 'invalid or expired token');
    }
    return invitation;
  }

  /**
   * Accept invitation
   */
  async acceptInvitation(data: AcceptInvitationDTO): Promise<OrganizationUser> {
    const result = await organizationInvitationRepository.acceptInvitation(data.token, data.userId);
    if (!result) {
      throw new NotFoundError('Invitation', 'invalid or expired token');
    }

    logger.info('Invitation accepted', {
      organizationId: result.membership.organizationId,
      userId: data.userId,
      invitationId: result.invitation.invitationId,
    });

    return result.membership;
  }

  /**
   * Decline invitation
   */
  async declineInvitation(token: string): Promise<void> {
    const invitation = await organizationInvitationRepository.declineInvitation(token);
    if (!invitation) {
      throw new NotFoundError('Invitation', 'invalid token');
    }

    logger.info('Invitation declined', {
      organizationId: invitation.organizationId,
      email: invitation.email,
    });
  }

  /**
   * Cancel invitation
   */
  async cancelInvitation(
    invitationId: string,
    organizationId: string,
    cancelledBy: string
  ): Promise<void> {
    // Check permission
    await this.checkPermission(organizationId, cancelledBy, 'can_invite_users');

    const cancelled = await organizationInvitationRepository.cancelInvitation(invitationId);
    if (!cancelled) {
      throw new NotFoundError('Invitation', invitationId);
    }

    logger.info('Invitation cancelled', {
      invitationId,
      organizationId,
      cancelledBy,
    });
  }

  // --------------------------------------------------------------------------
  // SETTINGS
  // --------------------------------------------------------------------------

  /**
   * Get organization settings
   */
  async getSettings(organizationId: string, userId: string): Promise<OrganizationSetting[]> {
    // Check access
    await this.checkAccess(organizationId, userId);

    return organizationSettingRepository.getAllSettings(organizationId);
  }

  /**
   * Get specific setting
   */
  async getSetting(
    organizationId: string,
    key: string,
    userId: string
  ): Promise<OrganizationSetting | null> {
    // Check access
    await this.checkAccess(organizationId, userId);

    return organizationSettingRepository.getSetting(organizationId, key);
  }

  /**
   * Set organization setting
   */
  async setSetting(
    organizationId: string,
    key: string,
    value: string,
    type: 'STRING' | 'NUMBER' | 'BOOLEAN' | 'JSON',
    userId: string
  ): Promise<OrganizationSetting> {
    // Check permission
    await this.checkPermission(organizationId, userId, 'can_manage_settings');

    return organizationSettingRepository.upsertSetting(organizationId, key, value, type, userId);
  }

  /**
   * Delete organization setting
   */
  async deleteSetting(organizationId: string, key: string, userId: string): Promise<void> {
    // Check permission
    await this.checkPermission(organizationId, userId, 'can_manage_settings');

    const deleted = await organizationSettingRepository.deleteSetting(organizationId, key);
    if (!deleted) {
      throw new NotFoundError('Setting', key);
    }
  }

  // --------------------------------------------------------------------------
  // ACCESS CONTROL HELPERS
  // --------------------------------------------------------------------------

  /**
   * Check if user has access to organization
   */
  async checkAccess(organizationId: string, userId: string): Promise<OrganizationUser> {
    const membership = await organizationUserRepository.findByOrganizationAndUser(
      organizationId,
      userId
    );
    if (!membership || !membership.isActive) {
      throw new ForbiddenError('User does not have access to this organization');
    }

    const organization = await organizationRepository.findById(organizationId);
    if (!organization || !organization.isActive) {
      throw new ForbiddenError('Organization is not active');
    }

    return membership;
  }

  /**
   * Check if user has specific permission
   */
  async checkPermission(
    organizationId: string,
    userId: string,
    permission:
      | 'can_manage_users'
      | 'can_manage_billing'
      | 'can_manage_settings'
      | 'can_invite_users'
  ): Promise<OrganizationUser> {
    const membership = await this.checkAccess(organizationId, userId);

    // ORG_OWNER and ORG_ADMIN have all permissions
    if (membership.role === 'ORG_OWNER' || membership.role === 'ORG_ADMIN') {
      return membership;
    }

    // Check specific permission
    const permissionMap: Record<string, keyof OrganizationUser> = {
      can_manage_users: 'canManageUsers',
      can_manage_billing: 'canManageBilling',
      can_manage_settings: 'canManageSettings',
      can_invite_users: 'canInviteUsers',
    };

    if (!membership[permissionMap[permission]]) {
      throw new ForbiddenError(`User does not have permission: ${permission}`);
    }

    return membership;
  }

  /**
   * Check if user is organization owner
   */
  async isOwner(organizationId: string, userId: string): Promise<boolean> {
    const membership = await organizationUserRepository.findByOrganizationAndUser(
      organizationId,
      userId
    );
    return membership?.role === 'ORG_OWNER';
  }

  /**
   * Check if user is organization admin
   */
  async isAdmin(organizationId: string, userId: string): Promise<boolean> {
    const membership = await organizationUserRepository.findByOrganizationAndUser(
      organizationId,
      userId
    );
    return membership?.role === 'ORG_OWNER' || membership?.role === 'ORG_ADMIN';
  }

  // --------------------------------------------------------------------------
  // CLEANUP & MAINTENANCE
  // --------------------------------------------------------------------------

  /**
   * Cleanup expired invitations
   */
  async cleanupExpiredInvitations(): Promise<number> {
    const count = await organizationInvitationRepository.cleanupExpired();
    if (count > 0) {
      logger.info('Expired invitations cleaned up', { count });
    }
    return count;
  }
}

// ============================================================================
// EXPORT
// ============================================================================

export const organizationService = new OrganizationService();
