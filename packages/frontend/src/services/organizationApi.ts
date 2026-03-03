/**
 * Organization API Service
 *
 * API client for organization management endpoints.
 */

import { apiClient } from '@/lib/api-client';

import type {
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
  OrganizationUserRole,
  OrganizationUserWithDetails,
  OrganizationWithStats,
  UpdateOrganizationDTO,
  UpdateOrganizationUserDTO,
  UserOrganizationsResponse,
} from '@opsui/shared';

// ============================================================================
// RESPONSE TYPES
// ============================================================================

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

interface PaginatedResponse<T> {
  success: boolean;
  data: {
    organizations: T[];
    total: number;
    page: number;
    pageSize: number;
  };
}

// ============================================================================
// ORGANIZATION API
// ============================================================================

export const organizationApi = {
  // --------------------------------------------------------------------------
  // ORGANIZATION CRUD
  // --------------------------------------------------------------------------

  /**
   * Create a new organization
   */
  async create(data: CreateOrganizationDTO): Promise<Organization> {
    const response = await apiClient.post<ApiResponse<Organization>>('/organizations', data);
    return response.data.data;
  },

  /**
   * List organizations (admin only)
   */
  async list(
    filters?: OrganizationQueryFilters,
    page = 1,
    pageSize = 20
  ): Promise<OrganizationListResponse> {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.tier) params.append('tier', filters.tier);
    if (filters?.search) params.append('search', filters.search);
    if (filters?.isActive !== undefined) params.append('isActive', String(filters.isActive));
    params.append('page', String(page));
    params.append('pageSize', String(pageSize));

    const response = await apiClient.get<PaginatedResponse<OrganizationWithStats>>(
      `/organizations?${params}`
    );
    return response.data.data;
  },

  /**
   * Get user's organizations
   */
  async getMyOrganizations(): Promise<UserOrganizationsResponse> {
    const response =
      await apiClient.get<ApiResponse<UserOrganizationsResponse>>('/organizations/my');
    return response.data.data;
  },

  /**
   * Get organization by ID
   */
  async getById(organizationId: string): Promise<OrganizationWithStats> {
    const response = await apiClient.get<ApiResponse<OrganizationWithStats>>(
      `/organizations/${organizationId}`
    );
    return response.data.data;
  },

  /**
   * Get organization by slug
   */
  async getBySlug(slug: string): Promise<OrganizationWithStats> {
    const response = await apiClient.get<ApiResponse<OrganizationWithStats>>(
      `/organizations/slug/${slug}`
    );
    return response.data.data;
  },

  /**
   * Update organization
   */
  async update(organizationId: string, data: UpdateOrganizationDTO): Promise<Organization> {
    const response = await apiClient.put<ApiResponse<Organization>>(
      `/organizations/${organizationId}`,
      data
    );
    return response.data.data;
  },

  /**
   * Update organization status
   */
  async updateStatus(organizationId: string, status: OrganizationStatus): Promise<Organization> {
    const response = await apiClient.put<ApiResponse<Organization>>(
      `/organizations/${organizationId}/status`,
      { status }
    );
    return response.data.data;
  },

  /**
   * Update organization tier
   */
  async updateTier(organizationId: string, tier: OrganizationTier): Promise<Organization> {
    const response = await apiClient.put<ApiResponse<Organization>>(
      `/organizations/${organizationId}/tier`,
      { tier }
    );
    return response.data.data;
  },

  /**
   * Set as primary organization
   */
  async setPrimary(organizationId: string): Promise<void> {
    await apiClient.put(`/organizations/${organizationId}/set-primary`);
  },

  // --------------------------------------------------------------------------
  // MEMBERSHIP MANAGEMENT
  // --------------------------------------------------------------------------

  /**
   * Get organization members
   */
  async getMembers(
    organizationId: string,
    filters?: OrganizationUserQueryFilters,
    page = 1,
    pageSize = 50
  ): Promise<{ members: OrganizationUserWithDetails[]; total: number }> {
    const params = new URLSearchParams();
    if (filters?.role) params.append('role', filters.role);
    if (filters?.isActive !== undefined) params.append('isActive', String(filters.isActive));
    if (filters?.search) params.append('search', filters.search);
    params.append('page', String(page));
    params.append('pageSize', String(pageSize));

    const response = await apiClient.get<
      ApiResponse<{ members: OrganizationUserWithDetails[]; total: number }>
    >(`/organizations/${organizationId}/members?${params}`);
    return response.data.data;
  },

  /**
   * Add member to organization
   */
  async addMember(
    organizationId: string,
    data: AssignOrganizationUserDTO
  ): Promise<OrganizationUser> {
    const response = await apiClient.post<ApiResponse<OrganizationUser>>(
      `/organizations/${organizationId}/members`,
      data
    );
    return response.data.data;
  },

  /**
   * Update member
   */
  async updateMember(
    organizationId: string,
    userId: string,
    data: UpdateOrganizationUserDTO
  ): Promise<OrganizationUser> {
    const response = await apiClient.put<ApiResponse<OrganizationUser>>(
      `/organizations/${organizationId}/members/${userId}`,
      data
    );
    return response.data.data;
  },

  /**
   * Remove member
   */
  async removeMember(organizationId: string, userId: string): Promise<void> {
    await apiClient.delete(`/organizations/${organizationId}/members/${userId}`);
  },

  /**
   * Get users not in organization (for adding to org)
   */
  async getAvailableUsers(
    organizationId: string
  ): Promise<Array<{ userId: string; name: string; email: string; role: string }>> {
    const response = await apiClient.get<
      ApiResponse<Array<{ userId: string; name: string; email: string; role: string }>>
    >(`/organizations/${organizationId}/available-users`);
    return response.data.data;
  },

  // --------------------------------------------------------------------------
  // INVITATIONS
  // --------------------------------------------------------------------------

  /**
   * Get pending invitations for current user
   */
  async getPendingInvitations(): Promise<OrganizationInvitationWithDetails[]> {
    const response = await apiClient.get<ApiResponse<OrganizationInvitationWithDetails[]>>(
      '/organizations/invitations/pending'
    );
    return response.data.data;
  },

  /**
   * Get invitation by token
   */
  async getInvitationByToken(token: string): Promise<OrganizationInvitationWithDetails> {
    const response = await apiClient.get<ApiResponse<OrganizationInvitationWithDetails>>(
      `/organizations/invitations/${token}`
    );
    return response.data.data;
  },

  /**
   * Accept invitation
   */
  async acceptInvitation(token: string): Promise<OrganizationUser> {
    const response = await apiClient.post<ApiResponse<OrganizationUser>>(
      `/organizations/invitations/${token}/accept`
    );
    return response.data.data;
  },

  /**
   * Decline invitation
   */
  async declineInvitation(token: string): Promise<void> {
    await apiClient.post(`/organizations/invitations/${token}/decline`);
  },

  /**
   * Get organization invitations
   */
  async getOrganizationInvitations(organizationId: string): Promise<OrganizationInvitation[]> {
    const response = await apiClient.get<ApiResponse<OrganizationInvitation[]>>(
      `/organizations/${organizationId}/invitations`
    );
    return response.data.data;
  },

  /**
   * Invite user to organization
   */
  async inviteUser(
    organizationId: string,
    data: CreateInvitationDTO
  ): Promise<OrganizationInvitation> {
    const response = await apiClient.post<ApiResponse<OrganizationInvitation>>(
      `/organizations/${organizationId}/invitations`,
      data
    );
    return response.data.data;
  },

  /**
   * Cancel invitation
   */
  async cancelInvitation(organizationId: string, invitationId: string): Promise<void> {
    await apiClient.delete(`/organizations/${organizationId}/invitations/${invitationId}`);
  },

  // --------------------------------------------------------------------------
  // SETTINGS
  // --------------------------------------------------------------------------

  /**
   * Get organization settings
   */
  async getSettings(organizationId: string): Promise<OrganizationSetting[]> {
    const response = await apiClient.get<ApiResponse<OrganizationSetting[]>>(
      `/organizations/${organizationId}/settings`
    );
    return response.data.data;
  },

  /**
   * Get specific setting
   */
  async getSetting(organizationId: string, key: string): Promise<OrganizationSetting | null> {
    const response = await apiClient.get<ApiResponse<OrganizationSetting | null>>(
      `/organizations/${organizationId}/settings/${key}`
    );
    return response.data.data;
  },

  /**
   * Set organization setting
   */
  async setSetting(
    organizationId: string,
    key: string,
    value: string,
    type: 'STRING' | 'NUMBER' | 'BOOLEAN' | 'JSON' = 'STRING'
  ): Promise<OrganizationSetting> {
    const response = await apiClient.put<ApiResponse<OrganizationSetting>>(
      `/organizations/${organizationId}/settings/${key}`,
      { value, type }
    );
    return response.data.data;
  },

  /**
   * Delete organization setting
   */
  async deleteSetting(organizationId: string, key: string): Promise<void> {
    await apiClient.delete(`/organizations/${organizationId}/settings/${key}`);
  },

  // --------------------------------------------------------------------------
  // ACCESS CHECK
  // --------------------------------------------------------------------------

  /**
   * Check access to organization
   */
  async checkAccess(organizationId: string): Promise<{
    hasAccess: boolean;
    role?: OrganizationUserRole;
    isPrimary?: boolean;
    permissions?: {
      canManageUsers: boolean;
      canManageBilling: boolean;
      canManageSettings: boolean;
      canInviteUsers: boolean;
    };
  }> {
    const response = await apiClient.get<
      ApiResponse<{
        hasAccess: boolean;
        role?: OrganizationUserRole;
        isPrimary?: boolean;
        permissions?: {
          canManageUsers: boolean;
          canManageBilling: boolean;
          canManageSettings: boolean;
          canInviteUsers: boolean;
        };
      }>
    >(`/organizations/${organizationId}/check-access`);
    return response.data.data;
  },
};

export default organizationApi;
