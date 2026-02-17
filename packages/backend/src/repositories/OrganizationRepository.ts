/**
 * Organization Repository
 *
 * Data access layer for multi-tenant organization management.
 * Handles organizations, memberships, invitations, and settings.
 */

import type {
  AssignOrganizationUserDTO,
  CreateInvitationDTO,
  CreateOrganizationDTO,
  Organization,
  OrganizationInvitation,
  OrganizationInvitationWithDetails,
  OrganizationQueryFilters,
  OrganizationSetting,
  OrganizationUser,
  OrganizationUserQueryFilters,
  OrganizationUserWithDetails,
  OrganizationWithStats,
  UpdateOrganizationDTO,
  UpdateOrganizationUserDTO,
} from '@opsui/shared';
import { OrganizationAuditEventType, OrganizationStatus, OrganizationTier } from '@opsui/shared';
import { v4 as uuidv4 } from 'uuid';
import { query, transaction } from '../db/client';
import { BaseRepository } from './BaseRepository';

// ============================================================================
// ORGANIZATION REPOSITORY
// ============================================================================

export class OrganizationRepository extends BaseRepository<Organization> {
  constructor() {
    super('organizations', 'organization_id');
  }

  // --------------------------------------------------------------------------
  // FIND BY SLUG
  // --------------------------------------------------------------------------

  async findBySlug(slug: string): Promise<Organization | null> {
    const result = await query<Organization>(`SELECT * FROM organizations WHERE slug = $1`, [slug]);
    return result.rows[0] || null;
  }

  // --------------------------------------------------------------------------
  // FIND BY CODE
  // --------------------------------------------------------------------------

  async findByCode(code: string): Promise<Organization | null> {
    const result = await query<Organization>(
      `SELECT * FROM organizations WHERE organization_code = $1`,
      [code]
    );
    return result.rows[0] || null;
  }

  // --------------------------------------------------------------------------
  // FIND BY CUSTOM DOMAIN
  // --------------------------------------------------------------------------

  async findByCustomDomain(domain: string): Promise<Organization | null> {
    const result = await query<Organization>(
      `SELECT * FROM organizations WHERE custom_domain = $1 AND is_active = true`,
      [domain]
    );
    return result.rows[0] || null;
  }

  // --------------------------------------------------------------------------
  // FIND WITH STATS
  // --------------------------------------------------------------------------

  async findByIdWithStats(organizationId: string): Promise<OrganizationWithStats | null> {
    const result = await query<OrganizationWithStats>(
      `SELECT 
        o.*,
        (SELECT COUNT(*) FROM organization_users WHERE organization_id = o.organization_id AND is_active = true) as member_count,
        (SELECT COUNT(*) FROM entities WHERE organization_id = o.organization_id) as entity_count,
        0 as storage_used_mb
      FROM organizations o
      WHERE o.organization_id = $1`,
      [organizationId]
    );
    return result.rows[0] || null;
  }

  // --------------------------------------------------------------------------
  // FIND ALL WITH FILTERS
  // --------------------------------------------------------------------------

  async findAllWithFilters(
    filters: OrganizationQueryFilters,
    page: number = 1,
    pageSize: number = 20
  ): Promise<{ organizations: OrganizationWithStats[]; total: number }> {
    const conditions: string[] = [];
    const params: (string | number | boolean | Date)[] = [];
    let paramIndex = 1;

    if (filters.status) {
      conditions.push(`status = $${paramIndex++}`);
      params.push(filters.status);
    }

    if (filters.tier) {
      conditions.push(`tier = $${paramIndex++}`);
      params.push(filters.tier);
    }

    if (filters.isActive !== undefined) {
      conditions.push(`is_active = $${paramIndex++}`);
      params.push(filters.isActive);
    }

    if (filters.search) {
      conditions.push(
        `(organization_name ILIKE $${paramIndex} OR slug ILIKE $${paramIndex} OR email ILIKE $${paramIndex})`
      );
      params.push(`%${filters.search}%`);
      paramIndex++;
    }

    if (filters.createdAfter) {
      conditions.push(`created_at >= $${paramIndex++}`);
      params.push(filters.createdAfter);
    }

    if (filters.createdBefore) {
      conditions.push(`created_at <= $${paramIndex++}`);
      params.push(filters.createdBefore);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Get total count
    const countResult = await query<{ count: string }>(
      `SELECT COUNT(*) as count FROM organizations ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].count, 10);

    // Get paginated results with stats
    const offset = (page - 1) * pageSize;
    const dataResult = await query<OrganizationWithStats>(
      `SELECT 
        o.*,
        (SELECT COUNT(*) FROM organization_users WHERE organization_id = o.organization_id AND is_active = true) as member_count,
        (SELECT COUNT(*) FROM entities WHERE organization_id = o.organization_id) as entity_count,
        0 as storage_used_mb
      FROM organizations o
      ${whereClause}
      ORDER BY o.created_at DESC
      LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
      [...params, pageSize, offset]
    );

    return {
      organizations: dataResult.rows,
      total,
    };
  }

  // --------------------------------------------------------------------------
  // CREATE ORGANIZATION
  // --------------------------------------------------------------------------

  async createOrganization(data: CreateOrganizationDTO): Promise<Organization> {
    const organizationId = `ORG${uuidv4().substring(0, 7).toUpperCase()}`;

    return await transaction(async client => {
      // Create organization
      const orgResult = await client.query<Organization>(
        `INSERT INTO organizations (
          organization_id, organization_code, organization_name, slug,
          legal_name, tax_id, registration_number, tier,
          address_line1, address_line2, city, state_province, postal_code, country_code,
          phone, email, website,
          base_currency, timezone, date_format, fiscal_year_start_month,
          status, is_active, created_by
        ) VALUES (
          $1, $2, $3, $4,
          $5, $6, $7, $8,
          $9, $10, $11, $12, $13, $14,
          $15, $16, $17,
          $18, $19, $20, $21,
          'PENDING_SETUP', true, $22
        ) RETURNING *`,
        [
          organizationId,
          organizationId,
          data.organizationName,
          data.slug ||
            data.organizationName
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, '-')
              .replace(/^-|-$/g, ''),
          data.legalName || null,
          data.taxId || null,
          data.registrationNumber || null,
          data.tier || 'STARTER',
          data.addressLine1 || null,
          data.addressLine2 || null,
          data.city || null,
          data.stateProvince || null,
          data.postalCode || null,
          data.countryCode || null,
          data.phone || null,
          data.email || null,
          data.website || null,
          data.baseCurrency || 'USD',
          data.timezone || 'UTC',
          data.dateFormat || 'YYYY-MM-DD',
          data.fiscalYearStartMonth || 1,
          data.ownerId,
        ]
      );

      const organization = orgResult.rows[0];

      // Add owner as ORG_OWNER
      await client.query(
        `INSERT INTO organization_users (
          organization_user_id, organization_id, user_id, role, is_primary,
          can_manage_users, can_manage_billing, can_manage_settings, can_invite_users,
          is_active, joined_at
        ) VALUES ($1, $2, $3, 'ORG_OWNER', true, true, true, true, true, true, NOW())`,
        [`OU${uuidv4().substring(0, 7).toUpperCase()}`, organizationId, data.ownerId]
      );

      // Log creation
      await client.query(
        `INSERT INTO organization_audit_log (
          audit_id, organization_id, event_type, event_description,
          user_id, new_values, created_at
        ) VALUES ($1, $2, 'ORG_CREATED', 'Organization created', $3, $4, NOW())`,
        [
          `AUD${uuidv4().substring(0, 7).toUpperCase()}`,
          organizationId,
          data.ownerId,
          JSON.stringify(organization),
        ]
      );

      return organization;
    });
  }

  // --------------------------------------------------------------------------
  // UPDATE ORGANIZATION
  // --------------------------------------------------------------------------

  async updateOrganization(
    organizationId: string,
    data: UpdateOrganizationDTO,
    userId: string
  ): Promise<Organization | null> {
    const updates: string[] = [];
    const params: (string | number | boolean | Record<string, unknown>)[] = [];
    let paramIndex = 1;

    const fieldMap: Record<string, string> = {
      organizationName: 'organization_name',
      legalName: 'legal_name',
      taxId: 'tax_id',
      registrationNumber: 'registration_number',
      addressLine1: 'address_line1',
      addressLine2: 'address_line2',
      city: 'city',
      stateProvince: 'state_province',
      postalCode: 'postal_code',
      countryCode: 'country_code',
      phone: 'phone',
      email: 'email',
      website: 'website',
      logoUrl: 'logo_url',
      primaryColor: 'primary_color',
      customDomain: 'custom_domain',
      baseCurrency: 'base_currency',
      timezone: 'timezone',
      dateFormat: 'date_format',
      fiscalYearStartMonth: 'fiscal_year_start_month',
      settings: 'settings',
    };

    for (const [key, dbKey] of Object.entries(fieldMap)) {
      if (data[key as keyof UpdateOrganizationDTO] !== undefined) {
        updates.push(`${dbKey} = $${paramIndex++}`);
        params.push(
          data[key as keyof UpdateOrganizationDTO] as
            | string
            | number
            | boolean
            | Record<string, unknown>
        );
      }
    }

    if (updates.length === 0) {
      return this.findById(organizationId);
    }

    params.push(organizationId);
    const result = await query<Organization>(
      `UPDATE organizations SET ${updates.join(', ')}, updated_at = NOW()
       WHERE organization_id = $${paramIndex}
       RETURNING *`,
      params
    );

    if (result.rows[0]) {
      // Log update
      await this.logAuditEvent(
        organizationId,
        OrganizationAuditEventType.ORG_UPDATED,
        userId,
        null,
        data as Record<string, unknown>
      );
    }

    return result.rows[0] || null;
  }

  // --------------------------------------------------------------------------
  // UPDATE STATUS
  // --------------------------------------------------------------------------

  async updateStatus(
    organizationId: string,
    status: OrganizationStatus,
    userId: string
  ): Promise<Organization | null> {
    const result = await query<Organization>(
      `UPDATE organizations SET status = $1, updated_at = NOW()
       WHERE organization_id = $2
       RETURNING *`,
      [status, organizationId]
    );

    if (result.rows[0]) {
      await this.logAuditEvent(
        organizationId,
        OrganizationAuditEventType.ORG_STATUS_CHANGED,
        userId,
        null,
        { status }
      );
    }

    return result.rows[0] || null;
  }

  // --------------------------------------------------------------------------
  // UPDATE TIER
  // --------------------------------------------------------------------------

  async updateTier(
    organizationId: string,
    tier: OrganizationTier,
    userId: string
  ): Promise<Organization | null> {
    // Get tier limits
    const tierLimits = this.getTierLimits(tier);

    const result = await query<Organization>(
      `UPDATE organizations 
       SET tier = $1, 
           max_users = $2, 
           max_entities = $3, 
           max_storage_mb = $4,
           updated_at = NOW()
       WHERE organization_id = $5
       RETURNING *`,
      [tier, tierLimits.maxUsers, tierLimits.maxEntities, tierLimits.maxStorageMb, organizationId]
    );

    if (result.rows[0]) {
      await this.logAuditEvent(
        organizationId,
        OrganizationAuditEventType.ORG_TIER_CHANGED,
        userId,
        null,
        { tier }
      );
    }

    return result.rows[0] || null;
  }

  // --------------------------------------------------------------------------
  // GET TIER LIMITS
  // --------------------------------------------------------------------------

  private getTierLimits(tier: OrganizationTier): {
    maxUsers: number;
    maxEntities: number;
    maxStorageMb: number;
  } {
    const limits: Record<
      OrganizationTier,
      { maxUsers: number; maxEntities: number; maxStorageMb: number }
    > = {
      FREE: { maxUsers: 3, maxEntities: 1, maxStorageMb: 100 },
      STARTER: { maxUsers: 10, maxEntities: 3, maxStorageMb: 1000 },
      PROFESSIONAL: { maxUsers: 50, maxEntities: 10, maxStorageMb: 10000 },
      ENTERPRISE: { maxUsers: 500, maxEntities: 50, maxStorageMb: 100000 },
      CUSTOM: { maxUsers: -1, maxEntities: -1, maxStorageMb: -1 },
    };
    return limits[tier];
  }

  // --------------------------------------------------------------------------
  // LOG AUDIT EVENT
  // --------------------------------------------------------------------------

  private async logAuditEvent(
    organizationId: string,
    eventType: OrganizationAuditEventType,
    userId: string | null,
    oldValues: Record<string, unknown> | null,
    newValues: Record<string, unknown> | null
  ): Promise<void> {
    await query(
      `INSERT INTO organization_audit_log (
        audit_id, organization_id, event_type, user_id, old_values, new_values, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
      [
        `AUD${uuidv4().substring(0, 7).toUpperCase()}`,
        organizationId,
        eventType,
        userId,
        oldValues,
        newValues,
      ]
    );
  }
}

// ============================================================================
// ORGANIZATION USER REPOSITORY
// ============================================================================

export class OrganizationUserRepository extends BaseRepository<OrganizationUser> {
  constructor() {
    super('organization_users', 'organization_user_id');
  }

  // --------------------------------------------------------------------------
  // FIND BY ORGANIZATION AND USER
  // --------------------------------------------------------------------------

  async findByOrganizationAndUser(
    organizationId: string,
    userId: string
  ): Promise<OrganizationUser | null> {
    const result = await query<OrganizationUser>(
      `SELECT * FROM organization_users 
       WHERE organization_id = $1 AND user_id = $2`,
      [organizationId, userId]
    );
    return result.rows[0] || null;
  }

  // --------------------------------------------------------------------------
  // FIND USER'S ORGANIZATIONS
  // --------------------------------------------------------------------------

  async findUserOrganizations(userId: string): Promise<OrganizationUserWithDetails[]> {
    const result = await query<OrganizationUserWithDetails>(
      `SELECT 
        ou.*,
        json_build_object(
          'userId', u.user_id,
          'name', u.name,
          'email', u.email,
          'role', u.role
        ) as user,
        o as organization
      FROM organization_users ou
      INNER JOIN organizations o ON ou.organization_id = o.organization_id
      INNER JOIN users u ON ou.user_id = u.user_id
      WHERE ou.user_id = $1 AND ou.is_active = true AND o.is_active = true
      ORDER BY ou.is_primary DESC, o.organization_name`,
      [userId]
    );
    return result.rows;
  }

  // --------------------------------------------------------------------------
  // FIND ORGANIZATION MEMBERS
  // --------------------------------------------------------------------------

  async findOrganizationMembers(
    organizationId: string,
    filters: OrganizationUserQueryFilters = {},
    page: number = 1,
    pageSize: number = 50
  ): Promise<{ members: OrganizationUserWithDetails[]; total: number }> {
    const conditions: string[] = ['ou.organization_id = $1'];
    const params: (string | number | boolean)[] = [organizationId];
    let paramIndex = 2;

    if (filters.role) {
      conditions.push(`ou.role = $${paramIndex++}`);
      params.push(filters.role);
    }

    if (filters.isActive !== undefined) {
      conditions.push(`ou.is_active = $${paramIndex++}`);
      params.push(filters.isActive);
    }

    if (filters.search) {
      conditions.push(`(u.name ILIKE $${paramIndex} OR u.email ILIKE $${paramIndex})`);
      params.push(`%${filters.search}%`);
      paramIndex++;
    }

    // Get total count
    const countResult = await query<{ count: string }>(
      `SELECT COUNT(*) as count 
       FROM organization_users ou
       INNER JOIN users u ON ou.user_id = u.user_id
       WHERE ${conditions.join(' AND ')}`,
      params
    );
    const total = parseInt(countResult.rows[0].count, 10);

    // Get paginated results
    const offset = (page - 1) * pageSize;
    const dataResult = await query<OrganizationUserWithDetails>(
      `SELECT 
        ou.*,
        json_build_object(
          'userId', u.user_id,
          'name', u.name,
          'email', u.email,
          'role', u.role
        ) as user,
        o as organization
      FROM organization_users ou
      INNER JOIN organizations o ON ou.organization_id = o.organization_id
      INNER JOIN users u ON ou.user_id = u.user_id
      WHERE ${conditions.join(' AND ')}
      ORDER BY ou.role, u.name
      LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
      [...params, pageSize, offset]
    );

    return {
      members: dataResult.rows,
      total,
    };
  }

  // --------------------------------------------------------------------------
  // ASSIGN USER TO ORGANIZATION
  // --------------------------------------------------------------------------

  async assignUser(data: AssignOrganizationUserDTO): Promise<OrganizationUser> {
    const organizationUserId = `OU${uuidv4().substring(0, 7).toUpperCase()}`;

    const result = await query<OrganizationUser>(
      `INSERT INTO organization_users (
        organization_user_id, organization_id, user_id, role, is_primary,
        can_manage_users, can_manage_billing, can_manage_settings, can_invite_users,
        is_active, joined_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, true, NOW())
      ON CONFLICT (organization_id, user_id) 
      DO UPDATE SET 
        role = EXCLUDED.role,
        is_primary = EXCLUDED.is_primary,
        can_manage_users = EXCLUDED.can_manage_users,
        can_manage_billing = EXCLUDED.can_manage_billing,
        can_manage_settings = EXCLUDED.can_manage_settings,
        can_invite_users = EXCLUDED.can_invite_users,
        is_active = true,
        updated_at = NOW()
      RETURNING *`,
      [
        organizationUserId,
        data.organizationId,
        data.userId,
        data.role || 'ORG_MEMBER',
        data.isPrimary || false,
        data.canManageUsers || false,
        data.canManageBilling || false,
        data.canManageSettings || false,
        data.canInviteUsers || false,
      ]
    );

    return result.rows[0];
  }

  // --------------------------------------------------------------------------
  // UPDATE USER MEMBERSHIP
  // --------------------------------------------------------------------------

  async updateUserMembership(
    organizationId: string,
    userId: string,
    data: UpdateOrganizationUserDTO
  ): Promise<OrganizationUser | null> {
    const updates: string[] = [];
    const params: (string | number | boolean)[] = [];
    let paramIndex = 1;

    const fieldMap: Record<string, string> = {
      role: 'role',
      isPrimary: 'is_primary',
      canManageUsers: 'can_manage_users',
      canManageBilling: 'can_manage_billing',
      canManageSettings: 'can_manage_settings',
      canInviteUsers: 'can_invite_users',
      isActive: 'is_active',
    };

    for (const [key, dbKey] of Object.entries(fieldMap)) {
      if (data[key as keyof UpdateOrganizationUserDTO] !== undefined) {
        updates.push(`${dbKey} = $${paramIndex++}`);
        params.push(data[key as keyof UpdateOrganizationUserDTO] as boolean);
      }
    }

    if (updates.length === 0) {
      return this.findByOrganizationAndUser(organizationId, userId);
    }

    params.push(organizationId, userId);
    const result = await query<OrganizationUser>(
      `UPDATE organization_users 
       SET ${updates.join(', ')}, updated_at = NOW()
       WHERE organization_id = $${paramIndex++} AND user_id = $${paramIndex++}
       RETURNING *`,
      params
    );

    return result.rows[0] || null;
  }

  // --------------------------------------------------------------------------
  // REMOVE USER FROM ORGANIZATION
  // --------------------------------------------------------------------------

  async removeUser(organizationId: string, userId: string): Promise<boolean> {
    const result = await query(
      `DELETE FROM organization_users 
       WHERE organization_id = $1 AND user_id = $2`,
      [organizationId, userId]
    );
    return (result.rowCount ?? 0) > 0;
  }

  // --------------------------------------------------------------------------
  // SET PRIMARY ORGANIZATION
  // --------------------------------------------------------------------------

  async setPrimaryOrganization(userId: string, organizationId: string): Promise<void> {
    await transaction(async client => {
      // Clear existing primary
      await client.query(`UPDATE organization_users SET is_primary = false WHERE user_id = $1`, [
        userId,
      ]);

      // Set new primary
      await client.query(
        `UPDATE organization_users SET is_primary = true 
         WHERE user_id = $1 AND organization_id = $2`,
        [userId, organizationId]
      );

      // Update user's default organization
      await client.query(`UPDATE users SET default_organization_id = $1 WHERE user_id = $2`, [
        organizationId,
        userId,
      ]);
    });
  }

  // --------------------------------------------------------------------------
  // CHECK USER ACCESS
  // --------------------------------------------------------------------------

  async checkUserAccess(userId: string, organizationId: string): Promise<boolean> {
    const result = await query<{ exists: boolean }>(
      `SELECT EXISTS(
        SELECT 1 FROM organization_users ou
        INNER JOIN organizations o ON ou.organization_id = o.organization_id
        WHERE ou.user_id = $1 
          AND ou.organization_id = $2 
          AND ou.is_active = true 
          AND o.is_active = true
      ) as exists`,
      [userId, organizationId]
    );
    return result.rows[0].exists;
  }

  // --------------------------------------------------------------------------
  // GET MEMBER COUNT
  // --------------------------------------------------------------------------

  async getMemberCount(organizationId: string): Promise<number> {
    const result = await query<{ count: string }>(
      `SELECT COUNT(*) as count 
       FROM organization_users 
       WHERE organization_id = $1 AND is_active = true`,
      [organizationId]
    );
    return parseInt(result.rows[0].count, 10);
  }
}

// ============================================================================
// ORGANIZATION INVITATION REPOSITORY
// ============================================================================

export class OrganizationInvitationRepository extends BaseRepository<OrganizationInvitation> {
  constructor() {
    super('organization_invitations', 'invitation_id');
  }

  // --------------------------------------------------------------------------
  // FIND BY TOKEN
  // --------------------------------------------------------------------------

  async findByToken(token: string): Promise<OrganizationInvitationWithDetails | null> {
    const result = await query<OrganizationInvitationWithDetails>(
      `SELECT 
        i.*,
        json_build_object(
          'organizationId', o.organization_id,
          'organizationName', o.organization_name,
          'slug', o.slug,
          'logoUrl', o.logo_url
        ) as organization,
        json_build_object(
          'userId', u.user_id,
          'name', u.name,
          'email', u.email
        ) as inviter
      FROM organization_invitations i
      INNER JOIN organizations o ON i.organization_id = o.organization_id
      INNER JOIN users u ON i.invited_by = u.user_id
      WHERE i.token = $1`,
      [token]
    );
    return result.rows[0] || null;
  }

  // --------------------------------------------------------------------------
  // FIND PENDING BY EMAIL
  // --------------------------------------------------------------------------

  async findPendingByEmail(email: string): Promise<OrganizationInvitationWithDetails[]> {
    const result = await query<OrganizationInvitationWithDetails>(
      `SELECT 
        i.*,
        json_build_object(
          'organizationId', o.organization_id,
          'organizationName', o.organization_name,
          'slug', o.slug,
          'logoUrl', o.logo_url
        ) as organization,
        json_build_object(
          'userId', u.user_id,
          'name', u.name,
          'email', u.email
        ) as inviter
      FROM organization_invitations i
      INNER JOIN organizations o ON i.organization_id = o.organization_id
      INNER JOIN users u ON i.invited_by = u.user_id
      WHERE i.email = $1 
        AND i.accepted_at IS NULL 
        AND i.declined_at IS NULL 
        AND i.expires_at > NOW()
      ORDER BY i.invited_at DESC`,
      [email.toLowerCase()]
    );
    return result.rows;
  }

  // --------------------------------------------------------------------------
  // FIND ORGANIZATION INVITATIONS
  // --------------------------------------------------------------------------

  async findOrganizationInvitations(organizationId: string): Promise<OrganizationInvitation[]> {
    const result = await query<OrganizationInvitation>(
      `SELECT * FROM organization_invitations 
       WHERE organization_id = $1 
         AND accepted_at IS NULL 
         AND declined_at IS NULL 
         AND expires_at > NOW()
       ORDER BY invited_at DESC`,
      [organizationId]
    );
    return result.rows;
  }

  // --------------------------------------------------------------------------
  // CREATE INVITATION
  // --------------------------------------------------------------------------

  async createInvitation(
    data: CreateInvitationDTO,
    invitedBy: string
  ): Promise<OrganizationInvitation> {
    const invitationId = `INV${uuidv4().substring(0, 7).toUpperCase()}`;
    const token = uuidv4();

    const result = await query<OrganizationInvitation>(
      `INSERT INTO organization_invitations (
        invitation_id, organization_id, email, role, token, invited_by, message, invited_at, expires_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW() + INTERVAL '7 days')
      RETURNING *`,
      [
        invitationId,
        data.organizationId,
        data.email.toLowerCase(),
        data.role || 'ORG_MEMBER',
        token,
        invitedBy,
        data.message || null,
      ]
    );

    return result.rows[0];
  }

  // --------------------------------------------------------------------------
  // ACCEPT INVITATION
  // --------------------------------------------------------------------------

  async acceptInvitation(
    token: string,
    userId: string
  ): Promise<{ invitation: OrganizationInvitation; membership: OrganizationUser } | null> {
    return await transaction(async client => {
      // Get and validate invitation
      const invResult = await client.query<OrganizationInvitation>(
        `SELECT * FROM organization_invitations 
         WHERE token = $1 
           AND accepted_at IS NULL 
           AND declined_at IS NULL 
           AND expires_at > NOW()`,
        [token]
      );

      if (invResult.rows.length === 0) {
        return null;
      }

      const invitation = invResult.rows[0];

      // Mark as accepted
      await client.query(
        `UPDATE organization_invitations SET accepted_at = NOW() WHERE invitation_id = $1`,
        [invitation.invitationId]
      );

      // Create membership
      const membershipId = `OU${uuidv4().substring(0, 7).toUpperCase()}`;
      const memResult = await client.query<OrganizationUser>(
        `INSERT INTO organization_users (
          organization_user_id, organization_id, user_id, role, is_primary, is_active, joined_at
        ) VALUES ($1, $2, $3, $4, false, true, NOW())
        RETURNING *`,
        [membershipId, invitation.organizationId, userId, invitation.role]
      );

      return {
        invitation: { ...invitation, acceptedAt: new Date() },
        membership: memResult.rows[0],
      };
    });
  }

  // --------------------------------------------------------------------------
  // DECLINE INVITATION
  // --------------------------------------------------------------------------

  async declineInvitation(token: string): Promise<OrganizationInvitation | null> {
    const result = await query<OrganizationInvitation>(
      `UPDATE organization_invitations 
       SET declined_at = NOW() 
       WHERE token = $1 
         AND accepted_at IS NULL 
         AND declined_at IS NULL
       RETURNING *`,
      [token]
    );
    return result.rows[0] || null;
  }

  // --------------------------------------------------------------------------
  // CANCEL INVITATION
  // --------------------------------------------------------------------------

  async cancelInvitation(invitationId: string): Promise<boolean> {
    const result = await query(
      `DELETE FROM organization_invitations 
       WHERE invitation_id = $1 AND accepted_at IS NULL`,
      [invitationId]
    );
    return (result.rowCount ?? 0) > 0;
  }

  // --------------------------------------------------------------------------
  // CLEANUP EXPIRED
  // --------------------------------------------------------------------------

  async cleanupExpired(): Promise<number> {
    const result = await query(
      `DELETE FROM organization_invitations 
       WHERE expires_at < NOW() AND accepted_at IS NULL AND declined_at IS NULL`
    );
    return result.rowCount ?? 0;
  }
}

// ============================================================================
// ORGANIZATION SETTING REPOSITORY
// ============================================================================

export class OrganizationSettingRepository extends BaseRepository<OrganizationSetting> {
  constructor() {
    super('organization_settings', 'setting_id');
  }

  // --------------------------------------------------------------------------
  // GET SETTING
  // --------------------------------------------------------------------------

  async getSetting(organizationId: string, key: string): Promise<OrganizationSetting | null> {
    const result = await query<OrganizationSetting>(
      `SELECT * FROM organization_settings 
       WHERE organization_id = $1 AND setting_key = $2`,
      [organizationId, key]
    );
    return result.rows[0] || null;
  }

  // --------------------------------------------------------------------------
  // GET ALL SETTINGS
  // --------------------------------------------------------------------------

  async getAllSettings(organizationId: string): Promise<OrganizationSetting[]> {
    const result = await query<OrganizationSetting>(
      `SELECT * FROM organization_settings WHERE organization_id = $1`,
      [organizationId]
    );
    return result.rows;
  }

  // --------------------------------------------------------------------------
  // UPSERT SETTING
  // --------------------------------------------------------------------------

  async upsertSetting(
    organizationId: string,
    key: string,
    value: string,
    type: 'STRING' | 'NUMBER' | 'BOOLEAN' | 'JSON' = 'STRING',
    userId: string
  ): Promise<OrganizationSetting> {
    const settingId = `SET${uuidv4().substring(0, 7).toUpperCase()}`;

    const result = await query<OrganizationSetting>(
      `INSERT INTO organization_settings (
        setting_id, organization_id, setting_key, setting_value, setting_type, updated_by
      ) VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (organization_id, setting_key)
      DO UPDATE SET 
        setting_value = EXCLUDED.setting_value,
        setting_type = EXCLUDED.setting_type,
        updated_by = EXCLUDED.updated_by,
        updated_at = NOW()
      RETURNING *`,
      [settingId, organizationId, key, value, type, userId]
    );

    return result.rows[0];
  }

  // --------------------------------------------------------------------------
  // DELETE SETTING
  // --------------------------------------------------------------------------

  async deleteSetting(organizationId: string, key: string): Promise<boolean> {
    const result = await query(
      `DELETE FROM organization_settings 
       WHERE organization_id = $1 AND setting_key = $2`,
      [organizationId, key]
    );
    return (result.rowCount ?? 0) > 0;
  }
}

// ============================================================================
// SINGLETON EXPORTS
// ============================================================================

export const organizationRepository = new OrganizationRepository();
export const organizationUserRepository = new OrganizationUserRepository();
export const organizationInvitationRepository = new OrganizationInvitationRepository();
export const organizationSettingRepository = new OrganizationSettingRepository();
