/**
 * Organization Routes
 *
 * API endpoints for multi-tenant organization management.
 * Handles organization CRUD, memberships, invitations, and settings.
 */

import type {
  AcceptInvitationDTO,
  AssignOrganizationUserDTO,
  CreateInvitationDTO,
  CreateOrganizationDTO,
  OrganizationQueryFilters,
  OrganizationStatus,
  OrganizationTier,
  OrganizationUserQueryFilters,
  UpdateOrganizationDTO,
  UpdateOrganizationUserDTO,
} from '@opsui/shared';
import { UserRole } from '@opsui/shared';
import { Response, Router } from 'express';
import { asyncHandler, authenticate, authorize } from '../middleware';
import { AuthenticatedRequest } from '../middleware/auth';
import { organizationService } from '../services/OrganizationService';

// ============================================================================
// ROUTER SETUP
// ============================================================================

const router = Router();

// All organization routes require authentication
router.use(authenticate);

// ============================================================================
// ORGANIZATION CRUD
// ============================================================================

/**
 * POST /api/organizations
 * Create a new organization
 * Any authenticated user can create an organization (becomes owner)
 */
router.post(
  '/',
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const data: CreateOrganizationDTO = {
      organizationName: req.body.organizationName,
      slug: req.body.slug,
      legalName: req.body.legalName,
      taxId: req.body.taxId,
      registrationNumber: req.body.registrationNumber,
      tier: req.body.tier,
      addressLine1: req.body.addressLine1,
      addressLine2: req.body.addressLine2,
      city: req.body.city,
      stateProvince: req.body.stateProvince,
      postalCode: req.body.postalCode,
      countryCode: req.body.countryCode,
      phone: req.body.phone,
      email: req.body.email,
      website: req.body.website,
      baseCurrency: req.body.baseCurrency,
      timezone: req.body.timezone,
      dateFormat: req.body.dateFormat,
      fiscalYearStartMonth: req.body.fiscalYearStartMonth,
      ownerId: req.user.userId,
    };

    const organization = await organizationService.createOrganization(data);

    res.status(201).json({
      success: true,
      data: organization,
    });
  })
);

/**
 * GET /api/organizations
 * List organizations (admin only - for system management)
 */
router.get(
  '/',
  authorize(UserRole.ADMIN),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const filters: OrganizationQueryFilters = {
      status: req.query.status as OrganizationStatus,
      tier: req.query.tier as OrganizationTier,
      search: req.query.search as string,
      isActive:
        req.query.isActive === 'true' ? true : req.query.isActive === 'false' ? false : undefined,
    };

    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 20;

    const result = await organizationService.listOrganizations(filters, page, pageSize);

    res.json({
      success: true,
      data: result,
    });
  })
);

/**
 * GET /api/organizations/my
 * Get current user's organizations
 */
router.get(
  '/my',
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const result = await organizationService.getUserOrganizations(req.user.userId);

    res.json({
      success: true,
      data: result,
    });
  })
);

/**
 * GET /api/organizations/:organizationId
 * Get organization by ID
 */
router.get(
  '/:organizationId',
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const { organizationId } = req.params;

    // Check access
    await organizationService.checkAccess(organizationId, req.user.userId);

    const organization = await organizationService.getOrganization(organizationId);

    res.json({
      success: true,
      data: organization,
    });
  })
);

/**
 * GET /api/organizations/slug/:slug
 * Get organization by slug
 */
router.get(
  '/slug/:slug',
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const { slug } = req.params;

    const organization = await organizationService.getOrganizationBySlug(slug);

    // Check access
    await organizationService.checkAccess(organization.organizationId, req.user.userId);

    res.json({
      success: true,
      data: organization,
    });
  })
);

/**
 * PUT /api/organizations/:organizationId
 * Update organization
 */
router.put(
  '/:organizationId',
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const { organizationId } = req.params;

    const data: UpdateOrganizationDTO = {
      organizationName: req.body.organizationName,
      legalName: req.body.legalName,
      taxId: req.body.taxId,
      registrationNumber: req.body.registrationNumber,
      addressLine1: req.body.addressLine1,
      addressLine2: req.body.addressLine2,
      city: req.body.city,
      stateProvince: req.body.stateProvince,
      postalCode: req.body.postalCode,
      countryCode: req.body.countryCode,
      phone: req.body.phone,
      email: req.body.email,
      website: req.body.website,
      logoUrl: req.body.logoUrl,
      primaryColor: req.body.primaryColor,
      customDomain: req.body.customDomain,
      baseCurrency: req.body.baseCurrency,
      timezone: req.body.timezone,
      dateFormat: req.body.dateFormat,
      fiscalYearStartMonth: req.body.fiscalYearStartMonth,
      settings: req.body.settings,
    };

    const organization = await organizationService.updateOrganization(
      organizationId,
      data,
      req.user.userId
    );

    res.json({
      success: true,
      data: organization,
    });
  })
);

/**
 * PUT /api/organizations/:organizationId/status
 * Update organization status
 */
router.put(
  '/:organizationId/status',
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const { organizationId } = req.params;
    const { status } = req.body;

    if (!status) {
      res.status(400).json({ error: 'Status is required' });
      return;
    }

    const organization = await organizationService.updateStatus(
      organizationId,
      status,
      req.user.userId
    );

    res.json({
      success: true,
      data: organization,
    });
  })
);

/**
 * PUT /api/organizations/:organizationId/tier
 * Update organization tier
 */
router.put(
  '/:organizationId/tier',
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const { organizationId } = req.params;
    const { tier } = req.body;

    if (!tier) {
      res.status(400).json({ error: 'Tier is required' });
      return;
    }

    const organization = await organizationService.updateTier(
      organizationId,
      tier,
      req.user.userId
    );

    res.json({
      success: true,
      data: organization,
    });
  })
);

/**
 * PUT /api/organizations/:organizationId/set-primary
 * Set as user's primary organization
 */
router.put(
  '/:organizationId/set-primary',
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const { organizationId } = req.params;

    await organizationService.setPrimaryOrganization(req.user.userId, organizationId);

    res.json({
      success: true,
      message: 'Primary organization updated',
    });
  })
);

// ============================================================================
// MEMBERSHIP MANAGEMENT
// ============================================================================

/**
 * GET /api/organizations/:organizationId/members
 * Get organization members
 */
router.get(
  '/:organizationId/members',
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const { organizationId } = req.params;

    const filters: OrganizationUserQueryFilters = {
      role: req.query.role as any,
      isActive:
        req.query.isActive === 'true' ? true : req.query.isActive === 'false' ? false : undefined,
      search: req.query.search as string,
    };

    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 50;

    const result = await organizationService.getMembers(
      organizationId,
      req.user.userId,
      filters,
      page,
      pageSize
    );

    res.json({
      success: true,
      data: result,
    });
  })
);

/**
 * POST /api/organizations/:organizationId/members
 * Add member to organization
 */
router.post(
  '/:organizationId/members',
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const { organizationId } = req.params;

    const data: AssignOrganizationUserDTO = {
      organizationId,
      userId: req.body.userId,
      role: req.body.role,
      isPrimary: req.body.isPrimary,
      canManageUsers: req.body.canManageUsers,
      canManageBilling: req.body.canManageBilling,
      canManageSettings: req.body.canManageSettings,
      canInviteUsers: req.body.canInviteUsers,
    };

    const membership = await organizationService.addMember(organizationId, data, req.user.userId);

    res.status(201).json({
      success: true,
      data: membership,
    });
  })
);

/**
 * PUT /api/organizations/:organizationId/members/:userId
 * Update member role/permissions
 */
router.put(
  '/:organizationId/members/:userId',
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const { organizationId, userId } = req.params;

    const data: UpdateOrganizationUserDTO = {
      role: req.body.role,
      isPrimary: req.body.isPrimary,
      canManageUsers: req.body.canManageUsers,
      canManageBilling: req.body.canManageBilling,
      canManageSettings: req.body.canManageSettings,
      canInviteUsers: req.body.canInviteUsers,
      isActive: req.body.isActive,
    };

    const membership = await organizationService.updateMember(
      organizationId,
      userId,
      data,
      req.user.userId
    );

    res.json({
      success: true,
      data: membership,
    });
  })
);

/**
 * DELETE /api/organizations/:organizationId/members/:userId
 * Remove member from organization
 */
router.delete(
  '/:organizationId/members/:userId',
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const { organizationId, userId } = req.params;

    await organizationService.removeMember(organizationId, userId, req.user.userId);

    res.json({
      success: true,
      message: 'Member removed from organization',
    });
  })
);

// ============================================================================
// INVITATIONS
// ============================================================================

/**
 * GET /api/organizations/invitations/pending
 * Get pending invitations for current user's email
 */
router.get(
  '/invitations/pending',
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    // Get user's email from database
    const invitations = await organizationService.getPendingInvitations(req.user.email);

    res.json({
      success: true,
      data: invitations,
    });
  })
);

/**
 * GET /api/organizations/invitations/:token
 * Get invitation by token
 */
router.get(
  '/invitations/:token',
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { token } = req.params;

    const invitation = await organizationService.getInvitationByToken(token);

    res.json({
      success: true,
      data: invitation,
    });
  })
);

/**
 * POST /api/organizations/invitations/:token/accept
 * Accept invitation
 */
router.post(
  '/invitations/:token/accept',
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const { token } = req.params;

    const data: AcceptInvitationDTO = {
      token,
      userId: req.user.userId,
      name: req.body.name,
      password: req.body.password,
    };

    const membership = await organizationService.acceptInvitation(data);

    res.json({
      success: true,
      data: membership,
      message: 'Invitation accepted',
    });
  })
);

/**
 * POST /api/organizations/invitations/:token/decline
 * Decline invitation
 */
router.post(
  '/invitations/:token/decline',
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { token } = req.params;

    await organizationService.declineInvitation(token);

    res.json({
      success: true,
      message: 'Invitation declined',
    });
  })
);

/**
 * GET /api/organizations/:organizationId/invitations
 * Get organization's pending invitations
 */
router.get(
  '/:organizationId/invitations',
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const { organizationId } = req.params;

    const invitations = await organizationService.getInvitations(organizationId, req.user.userId);

    res.json({
      success: true,
      data: invitations,
    });
  })
);

/**
 * POST /api/organizations/:organizationId/invitations
 * Invite user to organization
 */
router.post(
  '/:organizationId/invitations',
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const { organizationId } = req.params;

    const data: CreateInvitationDTO = {
      organizationId,
      email: req.body.email,
      role: req.body.role,
      message: req.body.message,
    };

    const invitation = await organizationService.inviteUser(organizationId, data, req.user.userId);

    res.status(201).json({
      success: true,
      data: invitation,
      message: 'Invitation sent',
    });
  })
);

/**
 * DELETE /api/organizations/:organizationId/invitations/:invitationId
 * Cancel invitation
 */
router.delete(
  '/:organizationId/invitations/:invitationId',
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const { organizationId, invitationId } = req.params;

    await organizationService.cancelInvitation(invitationId, organizationId, req.user.userId);

    res.json({
      success: true,
      message: 'Invitation cancelled',
    });
  })
);

// ============================================================================
// SETTINGS
// ============================================================================

/**
 * GET /api/organizations/:organizationId/settings
 * Get organization settings
 */
router.get(
  '/:organizationId/settings',
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const { organizationId } = req.params;

    const settings = await organizationService.getSettings(organizationId, req.user.userId);

    res.json({
      success: true,
      data: settings,
    });
  })
);

/**
 * GET /api/organizations/:organizationId/settings/:key
 * Get specific setting
 */
router.get(
  '/:organizationId/settings/:key',
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const { organizationId, key } = req.params;

    const setting = await organizationService.getSetting(organizationId, key, req.user.userId);

    res.json({
      success: true,
      data: setting,
    });
  })
);

/**
 * PUT /api/organizations/:organizationId/settings/:key
 * Set organization setting
 */
router.put(
  '/:organizationId/settings/:key',
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const { organizationId, key } = req.params;
    const { value, type } = req.body;

    const setting = await organizationService.setSetting(
      organizationId,
      key,
      value,
      type || 'STRING',
      req.user.userId
    );

    res.json({
      success: true,
      data: setting,
    });
  })
);

/**
 * DELETE /api/organizations/:organizationId/settings/:key
 * Delete organization setting
 */
router.delete(
  '/:organizationId/settings/:key',
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const { organizationId, key } = req.params;

    await organizationService.deleteSetting(organizationId, key, req.user.userId);

    res.json({
      success: true,
      message: 'Setting deleted',
    });
  })
);

// ============================================================================
// ACCESS CHECK
// ============================================================================

/**
 * GET /api/organizations/:organizationId/check-access
 * Check if current user has access to organization
 */
router.get(
  '/:organizationId/check-access',
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const { organizationId } = req.params;

    try {
      const membership = await organizationService.checkAccess(organizationId, req.user.userId);

      res.json({
        success: true,
        data: {
          hasAccess: true,
          role: membership.role,
          isPrimary: membership.isPrimary,
          permissions: {
            canManageUsers: membership.canManageUsers,
            canManageBilling: membership.canManageBilling,
            canManageSettings: membership.canManageSettings,
            canInviteUsers: membership.canInviteUsers,
          },
        },
      });
    } catch (error) {
      res.json({
        success: true,
        data: {
          hasAccess: false,
        },
      });
    }
  })
);

// ============================================================================
// EXPORT
// ============================================================================

export default router;
