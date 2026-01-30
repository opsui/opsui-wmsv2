/**
 * Custom Roles Management page
 *
 * Admin page for creating and managing custom roles with granular permissions
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, Header, Button, Pagination, useToast, ConfirmDialog } from '@/components/shared';
import {
  ShieldCheckIcon,
  ArrowLeftIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  KeyIcon,
  CheckIcon,
  InformationCircleIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline';
import { Permission, PERMISSION_GROUPS } from '@opsui/shared';
import {
  useCustomRoles,
  useAllPermissions,
  useCreateCustomRole,
  useUpdateCustomRole,
  useDeleteCustomRole,
} from '@/services/api';
import { playSound } from '@/stores';
import RoleModal, { RoleFormData } from '@/components/roles/RoleModal';

interface Role {
  roleId: string;
  name: string;
  permissions: Permission[];
  isSystem?: boolean;
}

interface PermissionGroup {
  key: string;
  label: string;
  permissions: Permission[];
}

function RolesManagementPage() {
  const { showToast } = useToast();
  const navigate = useNavigate();
  // Backend already returns custom + system roles combined and deduplicated
  const { data: allRolesData = [], isLoading: rolesLoading } = useCustomRoles();
  // Frontend safeguard: ensure unique roleIds
  const deduplicatedRoles = Array.from(
    new Map(allRolesData.map((role: Role) => [role.roleId, role])).values()
  );
  const { data: permissionsData } = useAllPermissions();
  const createRoleMutation = useCreateCustomRole();
  const updateRoleMutation = useUpdateCustomRole();
  const deleteRoleMutation = useDeleteCustomRole();

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [selectedPermissionGroups, setSelectedPermissionGroups] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; role: Role }>({
    isOpen: false,
    role: null as any,
  });

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const rolesPerPage = 10;

  // Filter roles by search
  const filteredRoles = deduplicatedRoles.filter((role: Role) => {
    if (!searchTerm.trim()) return true;
    const query = searchTerm.toLowerCase();
    return (
      role.roleId?.toLowerCase().includes(query) ||
      role.name?.toLowerCase().includes(query) ||
      role.permissions?.some((p: Permission) => p.toLowerCase().includes(query))
    );
  });

  // Paginate roles
  const totalPages = Math.ceil(filteredRoles.length / rolesPerPage);
  const paginatedRoles = filteredRoles.slice(
    (currentPage - 1) * rolesPerPage,
    currentPage * rolesPerPage
  );

  // Reset to first page when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  // Organize permissions into groups
  const permissionGroups: PermissionGroup[] = Object.entries(PERMISSION_GROUPS).map(([key, perms]) => ({
    key,
    label: key
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' '),
    permissions: perms as Permission[],
  }));

  const handleCreateRole = async (data: RoleFormData) => {
    try {
      await createRoleMutation.mutateAsync({
        name: data.name,
        description: data.description || '',
        permissions: data.permissions,
      });
      playSound('success');
      setIsCreateModalOpen(false);
      setSelectedPermissionGroups(new Set());
    } catch (error) {
      console.error('Failed to create role:', error);
    }
  };

  const handleEditRole = (role: Role) => {
    setSelectedRole(role);
    // Determine which permission groups this role has permissions from
    const groupsWithPermissions = new Set<string>();
    role.permissions.forEach(permission => {
      Object.entries(PERMISSION_GROUPS).forEach(([groupKey, groupPermissions]) => {
        if (groupPermissions.includes(permission)) {
          groupsWithPermissions.add(groupKey);
        }
      });
    });
    setSelectedPermissionGroups(groupsWithPermissions);
    setIsEditModalOpen(true);
  };

  const handleUpdateRole = async (data: RoleFormData) => {
    if (!selectedRole) return;
    try {
      await updateRoleMutation.mutateAsync({
        roleId: selectedRole.roleId,
        data: {
          name: data.name,
          description: data.description || '',
          permissions: data.permissions,
        },
      });
      playSound('success');
      setIsEditModalOpen(false);
      setSelectedRole(null);
      setSelectedPermissionGroups(new Set());
    } catch (error) {
      console.error('Failed to update role:', error);
    }
  };

  const handleDeleteRole = async (role: Role) => {
    if (role.isSystem) {
      showToast('Cannot delete system roles', 'error');
      return;
    }

    setDeleteConfirm({ isOpen: true, role });
  };

  const confirmDeleteRole = async () => {
    const { role } = deleteConfirm;
    try {
      await deleteRoleMutation.mutateAsync(role.roleId);
      playSound('success');
      showToast('Role deleted successfully', 'success');
    } catch (error) {
      console.error('Failed to delete role:', error);
      showToast('Failed to delete role', 'error');
    } finally {
      setDeleteConfirm({ isOpen: false, role: null as any });
    }
  };

  // Get permissions for display (count by group)
  const getPermissionCounts = (role: Role) => {
    const counts: Record<string, number> = {};
    role.permissions.forEach(permission => {
      Object.entries(PERMISSION_GROUPS).forEach(([groupKey, groupPermissions]) => {
        if (groupPermissions.includes(permission)) {
          counts[groupKey] = (counts[groupKey] || 0) + 1;
        }
      });
    });
    return counts;
  };

  if (rolesLoading) {
    return (
      <div className="min-h-screen">
        <Header />
        <main className="w-full px-4 sm:px-6 lg:px-8 py-8">
          <Card variant="glass">
            <CardContent className="p-8">
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" />
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Header />

      <main className="w-full px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => navigate('/dashboard')}
              className="flex items-center gap-2"
            >
              <ArrowLeftIcon className="h-4 w-4" />
              Back to Dashboard
            </Button>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary-500/20 rounded-xl">
                <ShieldCheckIcon className="h-8 w-8 text-primary-400" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white tracking-tight">
                  Custom Roles Management
                </h1>
                <p className="mt-2 text-gray-400">Create and manage custom roles with granular permissions</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {/* Search Input */}
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search roles..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2.5 w-64 bg-white/[0.05] border border-white/[0.08] rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
                />
              </div>
              <Button
                variant="primary"
                size="sm"
                onClick={() => setIsCreateModalOpen(true)}
                className="flex items-center gap-2"
              >
                <PlusIcon className="h-4 w-4" />
                Create Role
              </Button>
            </div>
          </div>
        </div>

        {/* Info Box */}
        <Card variant="glass" className="mb-8 border-l-4 border-l-blue-500">
          <CardContent className="p-5">
            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <InformationCircleIcon className="h-6 w-6 text-blue-400" />
              </div>
              <div>
                <h4 className="text-white font-semibold mb-2">About Custom Roles</h4>
                <ul className="text-sm text-gray-400 space-y-1">
                  <li>• <strong className="text-gray-300">System roles</strong> are predefined (Picker, Packer, etc.) and cannot be modified</li>
                  <li>• <strong className="text-gray-300">Custom roles</strong> can be created with any combination of permissions</li>
                  <li>• Custom roles can be granted to users as additional roles via the User Roles page</li>
                  <li>• Permissions are organized into logical groups for easier management</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Roles List */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {paginatedRoles.map((role, index) => {
            const permissionCounts = getPermissionCounts(role);
            const isSystem = role.isSystem ?? false;
            const totalPermissions = role.permissions.length;

            return (
              <Card key={role.roleId || `role-${index}`} variant="glass">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`p-3 rounded-xl ${isSystem ? 'bg-purple-500/20' : 'bg-primary-500/20'}`}>
                        <ShieldCheckIcon className={`h-6 w-6 ${isSystem ? 'text-purple-400' : 'text-primary-400'}`} />
                      </div>
                      <div>
                        <div className="flex items-center gap-3">
                          <h3 className="text-xl font-semibold text-white">{role.name}</h3>
                          {isSystem && (
                            <span className="badge badge-secondary text-xs">System</span>
                          )}
                        </div>
                        <p className="text-sm text-gray-400">{totalPermissions} permissions</p>
                      </div>
                    </div>
                    {!isSystem && (
                      <div className="flex items-center gap-2">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handleEditRole(role)}
                          className="flex items-center gap-2"
                        >
                          <PencilIcon className="h-4 w-4" />
                          Edit
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handleDeleteRole(role)}
                          className="flex items-center gap-2 text-error-400 hover:text-error-300"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {Object.entries(permissionCounts).map(([groupKey, count]) => (
                      <div key={groupKey} className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg border border-gray-700">
                        <div className="flex items-center gap-3">
                          <KeyIcon className="h-5 w-5 text-primary-400" />
                          <span className="text-sm font-medium text-white capitalize">
                            {groupKey.replace(/_/g, ' ')}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="badge badge-primary">{count}</span>
                          <span className="text-xs text-gray-500">
                            {count === 1 ? 'permission' : 'permissions'}
                          </span>
                        </div>
                      </div>
                    ))}

                    {totalPermissions === 0 && (
                      <div className="text-center py-8 text-gray-500">
                        <ShieldCheckIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">No permissions assigned</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center mt-6">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />
          </div>
        )}

        {deduplicatedRoles.length === 0 && (
          <Card variant="glass">
            <CardContent className="p-12 text-center">
              <ShieldCheckIcon className="h-16 w-16 text-gray-600 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-400 mb-2">No roles found</h3>
              <p className="text-sm text-gray-500">Create a custom role to get started</p>
            </CardContent>
          </Card>
        )}
      </main>

      {/* Create Role Modal */}
      <RoleModal
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          setSelectedPermissionGroups(new Set());
        }}
        onSubmit={handleCreateRole}
        permissionGroups={permissionGroups}
        isLoading={createRoleMutation.isPending}
      />

      {/* Edit Role Modal */}
      <RoleModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedRole(null);
          setSelectedPermissionGroups(new Set());
        }}
        onSubmit={handleUpdateRole}
        initialData={selectedRole || undefined}
        permissionGroups={permissionGroups}
        selectedPermissionGroups={selectedPermissionGroups}
        isEditing={true}
        isLoading={updateRoleMutation.isPending}
      />

      <ConfirmDialog
        isOpen={deleteConfirm.isOpen}
        onClose={() => setDeleteConfirm({ isOpen: false, role: null as any })}
        onConfirm={confirmDeleteRole}
        title={`Delete Role "${deleteConfirm.role?.name || ''}"`}
        message="Are you sure you want to delete this role? Users with this role will lose access."
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        isLoading={deleteRoleMutation.isPending}
      />
    </div>
  );
}

export default RolesManagementPage;
