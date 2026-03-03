/**
 * Organizations Management Page
 *
 * Admin-only page for managing multi-tenant organizations.
 * Handles viewing, creating, and managing organizations.
 */

import { apiClient } from '@/lib/api-client';
import { organizationApi } from '@/services/organizationApi';
import { useAuthStore } from '@/stores';
import { useOrganizationStore } from '@/stores/organizationStore';
import {
  Organization,
  OrganizationStatus,
  OrganizationTier,
  OrganizationUserRole,
  OrganizationUserWithDetails,
  OrganizationWithStats,
  UserRole,
} from '@opsui/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { useCallback, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

// Status badge colors
const STATUS_COLORS: Record<OrganizationStatus, string> = {
  ACTIVE: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  TRIAL: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  SUSPENDED: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  CANCELLED: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
};

// Tier badge colors
const TIER_COLORS: Record<OrganizationTier, string> = {
  STARTER: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
  GROWTH: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
  ENTERPRISE: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
};

export function OrganizationsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = useAuthStore(state => state.user);
  const setCurrentOrganization = useOrganizationStore(state => state.setCurrentOrganization);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<OrganizationStatus | ''>('');
  const [tierFilter, setTierFilter] = useState<OrganizationTier | ''>('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedOrg, setSelectedOrg] = useState<OrganizationWithStats | null>(null);

  // Fetch organizations
  const { data, isLoading, error } = useQuery({
    queryKey: ['organizations', searchQuery, statusFilter, tierFilter],
    queryFn: () =>
      organizationApi.list({
        search: searchQuery || undefined,
        status: statusFilter || undefined,
        tier: tierFilter || undefined,
      }),
  });

  // Fetch user's organizations for quick switching
  const { data: userOrgs } = useQuery({
    queryKey: ['user-organizations'],
    queryFn: () => organizationApi.getMyOrganizations(),
  });

  // Create organization mutation
  const createMutation = useMutation({
    mutationFn: (data: { organizationName: string; slug?: string; ownerUserId?: string }) =>
      organizationApi.create(data as any),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organizations'] });
      queryClient.invalidateQueries({ queryKey: ['user-organizations'] });
      setShowCreateModal(false);
    },
  });

  // Update status mutation
  const updateStatusMutation = useMutation({
    mutationFn: ({
      organizationId,
      status,
    }: {
      organizationId: string;
      status: OrganizationStatus;
    }) => organizationApi.updateStatus(organizationId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organizations'] });
    },
  });

  // Set primary organization
  const setPrimaryMutation = useMutation({
    mutationFn: (organizationId: string) => organizationApi.setPrimary(organizationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-organizations'] });
    },
  });

  // Handle organization click - switch to that organization
  const handleOrgClick = useCallback((org: OrganizationWithStats) => {
    setSelectedOrg(org);
  }, []);

  // Handle switch to organization
  const handleSwitchToOrg = useCallback(
    async (org: OrganizationWithStats) => {
      try {
        await setPrimaryMutation.mutateAsync(org.organizationId);
        setCurrentOrganization(org);
        navigate('/dashboard');
      } catch (error) {
        console.error('Failed to switch organization:', error);
      }
    },
    [setPrimaryMutation, setCurrentOrganization, navigate]
  );

  // Filter organizations client-side for instant feedback
  const filteredOrganizations = useMemo(() => {
    if (!data?.organizations) return [];
    return data.organizations;
  }, [data]);

  // Check if user is admin
  if (user?.role !== 'ADMIN') {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Access Denied</h1>
          <p className="text-slate-600 dark:text-slate-400">
            You need admin privileges to access this page.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Organizations</h1>
              <p className="mt-2 text-slate-600 dark:text-slate-400">
                Manage multi-tenant organizations and their settings
              </p>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
              Create Organization
            </button>
          </div>
        </div>

        {/* My Organizations Quick Access */}
        {userOrgs && userOrgs.organizations.length > 0 && (
          <div className="mb-8 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
              My Organizations
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {userOrgs.organizations.map(org => (
                <button
                  key={org.organizationId}
                  onClick={() => handleSwitchToOrg(org as OrganizationWithStats)}
                  className="p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors text-left group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary-100 dark:bg-primary-900/30 rounded-lg flex items-center justify-center">
                      <span className="text-primary-600 dark:text-primary-400 font-bold text-lg">
                        {org.organizationName.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate-900 dark:text-white truncate">
                        {org.organizationName}
                      </p>
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        {org.isPrimary ? 'Primary' : org.role}
                      </p>
                    </div>
                    <svg
                      className="w-5 h-5 text-slate-400 group-hover:text-primary-500 transition-colors"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="mb-6 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <input
                type="text"
                placeholder="Search organizations..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-slate-900 dark:text-white placeholder-slate-500"
              />
            </div>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value as OrganizationStatus | '')}
              className="px-4 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-slate-900 dark:text-white"
            >
              <option value="">All Statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="TRIAL">Trial</option>
              <option value="SUSPENDED">Suspended</option>
              <option value="CANCELLED">Cancelled</option>
            </select>

            {/* Tier Filter */}
            <select
              value={tierFilter}
              onChange={e => setTierFilter(e.target.value as OrganizationTier | '')}
              className="px-4 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-slate-900 dark:text-white"
            >
              <option value="">All Tiers</option>
              <option value="STARTER">Starter</option>
              <option value="GROWTH">Growth</option>
              <option value="ENTERPRISE">Enterprise</option>
            </select>
          </div>
        </div>

        {/* Organizations Table */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
          {isLoading ? (
            <div className="p-12 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto" />
              <p className="mt-4 text-slate-600 dark:text-slate-400">Loading organizations...</p>
            </div>
          ) : error ? (
            <div className="p-12 text-center">
              <p className="text-red-600 dark:text-red-400">Failed to load organizations</p>
            </div>
          ) : filteredOrganizations.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-slate-600 dark:text-slate-400">No organizations found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                <thead className="bg-slate-50 dark:bg-slate-700/50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Organization
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Tier
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Members
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Created
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                  {filteredOrganizations.map(org => (
                    <tr
                      key={org.organizationId}
                      className="hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer"
                      onClick={() => handleOrgClick(org)}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-primary-100 dark:bg-primary-900/30 rounded-lg flex items-center justify-center">
                            <span className="text-primary-600 dark:text-primary-400 font-bold">
                              {org.organizationName.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium text-slate-900 dark:text-white">
                              {org.organizationName}
                            </p>
                            <p className="text-sm text-slate-500 dark:text-slate-400">{org.slug}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[org.status]}`}
                        >
                          {org.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${TIER_COLORS[org.tier]}`}
                        >
                          {org.tier}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 dark:text-white">
                        {org.memberCount || 0}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">
                        {org.createdAt ? format(new Date(org.createdAt), 'MMM d, yyyy') : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            handleSwitchToOrg(org);
                          }}
                          className="text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 font-medium"
                        >
                          Switch
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Total count */}
        {data && (
          <div className="mt-4 text-sm text-slate-600 dark:text-slate-400">
            Total: {data.total} organizations
          </div>
        )}
      </div>

      {/* Create Organization Modal */}
      {showCreateModal && (
        <CreateOrganizationModal
          onClose={() => setShowCreateModal(false)}
          onCreate={data => createMutation.mutate(data)}
          isLoading={createMutation.isPending}
        />
      )}

      {/* Organization Detail Modal */}
      {selectedOrg && (
        <OrganizationDetailModal
          organization={selectedOrg}
          onClose={() => setSelectedOrg(null)}
          onSwitch={() => handleSwitchToOrg(selectedOrg)}
          onUpdateStatus={status =>
            updateStatusMutation.mutate({
              organizationId: selectedOrg.organizationId,
              status,
            })
          }
        />
      )}
    </div>
  );
}

// Org role badge colors
const ORG_ROLE_COLORS: Record<OrganizationUserRole, string> = {
  ORG_OWNER: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  ORG_ADMIN: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
  ORG_MEMBER: 'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-300',
};

// Create Organization Modal Component
function CreateOrganizationModal({
  onClose,
  onCreate,
  isLoading,
}: {
  onClose: () => void;
  onCreate: (data: { organizationName: string; slug?: string; ownerUserId?: string }) => void;
  isLoading: boolean;
}) {
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [ownerUserId, setOwnerUserId] = useState<string>('');

  // Fetch all users for owner selection
  const { data: users } = useQuery({
    queryKey: ['all-users'],
    queryFn: async () => {
      const response = await apiClient.get('/users');
      return response.data as Array<{ userId: string; name: string; email: string; role: string }>;
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onCreate({
        organizationName: name.trim(),
        slug: slug.trim() || undefined,
        ownerUserId: ownerUserId || undefined,
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl max-w-md w-full mx-4 p-6">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4">
          Create Organization
        </h2>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Organization Name *
              </label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-slate-900 dark:text-white"
                placeholder="My Company"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Slug (optional)
              </label>
              <input
                type="text"
                value={slug}
                onChange={e => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-slate-900 dark:text-white"
                placeholder="my-company"
              />
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                URL-friendly identifier. Auto-generated from name if not provided.
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Organization Owner
              </label>
              <select
                value={ownerUserId}
                onChange={e => setOwnerUserId(e.target.value)}
                className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-slate-900 dark:text-white"
              >
                <option value="">Yourself (default)</option>
                {users?.map(user => (
                  <option key={user.userId} value={user.userId}>
                    {user.name} ({user.email})
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Select a user to be the organization owner. Defaults to you.
              </p>
            </div>
          </div>
          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || !name.trim()}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
            >
              {isLoading ? 'Creating...' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Organization Detail Modal Component
function OrganizationDetailModal({
  organization,
  onClose,
  onSwitch,
  onUpdateStatus,
}: {
  organization: OrganizationWithStats;
  onClose: () => void;
  onSwitch: () => void;
  onUpdateStatus: (status: OrganizationStatus) => void;
}) {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'details' | 'members'>('details');
  const [showAddMember, setShowAddMember] = useState(false);
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedRole, setSelectedRole] = useState<OrganizationUserRole>('ORG_MEMBER');

  // Fetch members
  const { data: membersData, isLoading: membersLoading } = useQuery({
    queryKey: ['org-members', organization.organizationId],
    queryFn: () => organizationApi.getMembers(organization.organizationId),
    enabled: activeTab === 'members',
  });

  // Fetch available users (not in org)
  const { data: availableUsers } = useQuery({
    queryKey: ['available-users', organization.organizationId],
    queryFn: () => organizationApi.getAvailableUsers(organization.organizationId),
    enabled: activeTab === 'members' && showAddMember,
  });

  // Add member mutation
  const addMemberMutation = useMutation({
    mutationFn: (data: { userId: string; role: OrganizationUserRole }) =>
      organizationApi.addMember(organization.organizationId, {
        userId: data.userId,
        role: data.role,
        isPrimary: false,
        canManageUsers: data.role === 'ORG_ADMIN',
        canManageBilling: data.role === 'ORG_ADMIN',
        canManageSettings: data.role === 'ORG_ADMIN',
        canInviteUsers: data.role === 'ORG_ADMIN' || data.role === 'ORG_MEMBER',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['org-members', organization.organizationId] });
      queryClient.invalidateQueries({ queryKey: ['available-users', organization.organizationId] });
      setShowAddMember(false);
      setSelectedUserId('');
      setSelectedRole('ORG_MEMBER');
    },
  });

  // Remove member mutation
  const removeMemberMutation = useMutation({
    mutationFn: (userId: string) =>
      organizationApi.removeMember(organization.organizationId, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['org-members', organization.organizationId] });
      queryClient.invalidateQueries({ queryKey: ['available-users', organization.organizationId] });
    },
  });

  // Create user in org mutation
  const createUserMutation = useMutation({
    mutationFn: async (data: {
      name: string;
      email: string;
      password: string;
      role: UserRole;
      organizationRole: OrganizationUserRole;
    }) => {
      const response = await apiClient.post('/users', {
        name: data.name,
        email: data.email,
        password: data.password,
        role: data.role,
        organizationId: organization.organizationId,
        organizationRole: data.organizationRole,
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['org-members', organization.organizationId] });
      queryClient.invalidateQueries({ queryKey: ['available-users', organization.organizationId] });
      setShowCreateUser(false);
    },
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            {organization.organizationName}
          </h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-200 dark:border-slate-700">
          <button
            onClick={() => setActiveTab('details')}
            className={`px-6 py-3 text-sm font-medium transition-colors ${
              activeTab === 'details'
                ? 'text-primary-600 border-b-2 border-primary-600'
                : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            Details
          </button>
          <button
            onClick={() => setActiveTab('members')}
            className={`px-6 py-3 text-sm font-medium transition-colors ${
              activeTab === 'members'
                ? 'text-primary-600 border-b-2 border-primary-600'
                : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            Members ({organization.memberCount || 0})
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'details' ? (
            <div className="space-y-4">
              {/* Organization Info */}
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-primary-100 dark:bg-primary-900/30 rounded-xl flex items-center justify-center">
                  <span className="text-2xl font-bold text-primary-600 dark:text-primary-400">
                    {organization.organizationName.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                    {organization.organizationName}
                  </h3>
                  <p className="text-slate-500 dark:text-slate-400">{organization.slug}</p>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-4">
                  <p className="text-sm text-slate-500 dark:text-slate-400">Status</p>
                  <span
                    className={`inline-flex mt-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[organization.status]}`}
                  >
                    {organization.status}
                  </span>
                </div>
                <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-4">
                  <p className="text-sm text-slate-500 dark:text-slate-400">Tier</p>
                  <span
                    className={`inline-flex mt-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${TIER_COLORS[organization.tier]}`}
                  >
                    {organization.tier}
                  </span>
                </div>
                <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-4">
                  <p className="text-sm text-slate-500 dark:text-slate-400">Members</p>
                  <p className="text-lg font-semibold text-slate-900 dark:text-white">
                    {organization.memberCount || 0}
                  </p>
                </div>
                <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-4">
                  <p className="text-sm text-slate-500 dark:text-slate-400">Entities</p>
                  <p className="text-lg font-semibold text-slate-900 dark:text-white">
                    {organization.entityCount || 0}
                  </p>
                </div>
              </div>

              {/* Quick Status Actions */}
              <div>
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Quick Actions
                </p>
                <div className="flex flex-wrap gap-2">
                  {organization.status !== 'ACTIVE' && (
                    <button
                      onClick={() => onUpdateStatus('ACTIVE')}
                      className="px-3 py-1.5 text-sm bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 rounded-lg hover:bg-green-200 dark:hover:bg-green-900/50 transition-colors"
                    >
                      Activate
                    </button>
                  )}
                  {organization.status !== 'SUSPENDED' && (
                    <button
                      onClick={() => onUpdateStatus('SUSPENDED')}
                      className="px-3 py-1.5 text-sm bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 rounded-lg hover:bg-yellow-200 dark:hover:bg-yellow-900/50 transition-colors"
                    >
                      Suspend
                    </button>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Action buttons */}
              <div className="flex gap-2">
                <button
                  onClick={() => setShowAddMember(true)}
                  className="px-3 py-1.5 text-sm bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400 rounded-lg hover:bg-primary-200 dark:hover:bg-primary-900/50 transition-colors flex items-center gap-1"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
                    />
                  </svg>
                  Add Existing User
                </button>
                <button
                  onClick={() => setShowCreateUser(true)}
                  className="px-3 py-1.5 text-sm bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 rounded-lg hover:bg-green-200 dark:hover:bg-green-900/50 transition-colors flex items-center gap-1"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 4v16m8-8H4"
                    />
                  </svg>
                  Create User
                </button>
              </div>

              {/* Members list */}
              {membersLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600 mx-auto" />
                </div>
              ) : !membersData?.members?.length ? (
                <p className="text-center text-slate-500 dark:text-slate-400 py-8">
                  No members found
                </p>
              ) : (
                <div className="space-y-2">
                  {membersData.members.map(member => (
                    <div
                      key={member.userId}
                      className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center">
                          <span className="text-sm font-medium text-primary-600 dark:text-primary-400">
                            {member.user?.name?.charAt(0)?.toUpperCase() || '?'}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-slate-900 dark:text-white">
                            {member.user?.name || 'Unknown'}
                          </p>
                          <p className="text-sm text-slate-500 dark:text-slate-400">
                            {member.user?.email}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2 py-0.5 rounded text-xs font-medium ${ORG_ROLE_COLORS[member.role]}`}
                        >
                          {member.role}
                        </span>
                        {member.role !== 'ORG_OWNER' && (
                          <button
                            onClick={() => removeMemberMutation.mutate(member.userId)}
                            className="p-1 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30 rounded"
                            title="Remove member"
                          >
                            <svg
                              className="w-4 h-4"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M6 18L18 6M6 6l12 12"
                              />
                            </svg>
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Add Member Modal */}
              {showAddMember && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50">
                  <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl max-w-sm w-full mx-4 p-4">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">
                      Add Member
                    </h3>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                          User
                        </label>
                        <select
                          value={selectedUserId}
                          onChange={e => setSelectedUserId(e.target.value)}
                          className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white"
                        >
                          <option value="">Select user...</option>
                          {availableUsers?.map(user => (
                            <option key={user.userId} value={user.userId}>
                              {user.name} ({user.email})
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                          Role
                        </label>
                        <select
                          value={selectedRole}
                          onChange={e => setSelectedRole(e.target.value as OrganizationUserRole)}
                          className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white"
                        >
                          <option value="ORG_MEMBER">Member</option>
                          <option value="ORG_ADMIN">Admin</option>
                          <option value="ORG_OWNER">Owner</option>
                        </select>
                      </div>
                    </div>
                    <div className="mt-4 flex justify-end gap-2">
                      <button
                        onClick={() => {
                          setShowAddMember(false);
                          setSelectedUserId('');
                        }}
                        className="px-3 py-1.5 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => {
                          if (selectedUserId) {
                            addMemberMutation.mutate({
                              userId: selectedUserId,
                              role: selectedRole,
                            });
                          }
                        }}
                        disabled={!selectedUserId || addMemberMutation.isPending}
                        className="px-3 py-1.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
                      >
                        {addMemberMutation.isPending ? 'Adding...' : 'Add'}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Create User Modal */}
              {showCreateUser && (
                <CreateUserInOrgModal
                  organizationId={organization.organizationId}
                  onClose={() => setShowCreateUser(false)}
                  onSuccess={() => {
                    setShowCreateUser(false);
                    queryClient.invalidateQueries({
                      queryKey: ['org-members', organization.organizationId],
                    });
                  }}
                />
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-between p-6 border-t border-slate-200 dark:border-slate-700">
          <button
            onClick={onClose}
            className="px-4 py-2 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
          >
            Close
          </button>
          <button
            onClick={onSwitch}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            Switch to Organization
          </button>
        </div>
      </div>
    </div>
  );
}

// Create User in Org Modal
function CreateUserInOrgModal({
  organizationId,
  onClose,
  onSuccess,
}: {
  organizationId: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('PICKER');
  const [orgRole, setOrgRole] = useState<OrganizationUserRole>('ORG_MEMBER');

  const createUserMutation = useMutation({
    mutationFn: async () => {
      const response = await apiClient.post('/users', {
        name,
        email,
        password,
        role,
        organizationId,
        organizationRole: orgRole,
      });
      return response.data;
    },
    onSuccess,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name && email && password) {
      createUserMutation.mutate();
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl max-w-sm w-full mx-4 p-4">
        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Create User</h3>
        <form onSubmit={handleSubmit}>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Name *
              </label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Email *
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Password *
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white"
                required
                minLength={6}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                System Role
              </label>
              <select
                value={role}
                onChange={e => setRole(e.target.value as UserRole)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white"
              >
                <option value="PICKER">Picker</option>
                <option value="PACKER">Packer</option>
                <option value="STOCK_CONTROLLER">Stock Controller</option>
                <option value="SUPERVISOR">Supervisor</option>
                <option value="ADMIN">Admin</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Organization Role
              </label>
              <select
                value={orgRole}
                onChange={e => setOrgRole(e.target.value as OrganizationUserRole)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white"
              >
                <option value="ORG_MEMBER">Member</option>
                <option value="ORG_ADMIN">Admin</option>
              </select>
            </div>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createUserMutation.isPending}
              className="px-3 py-1.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
            >
              {createUserMutation.isPending ? 'Creating...' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default OrganizationsPage;
