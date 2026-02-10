/**
 * User Roles Management page
 *
 * Admin page for managing user role assignments and creating users
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card,
  CardHeader,
  CardContent,
  Button,
  UserRoleBadge,
  Pagination,
  ConfirmDialog,
  Breadcrumb,
  Header,
} from '@/components/shared';
import {
  UserGroupIcon,
  ArrowLeftIcon,
  UserIcon,
  KeyIcon,
  CheckIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  LockClosedIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';
import { UserRole, User } from '@opsui/shared';
import { playSound } from '@/stores';
import {
  useUsers,
  useGrantRole,
  useRevokeRole,
  useAllRoleAssignments,
  useCreateUser,
  useUpdateUser,
  useDeleteUser,
  useRestoreUser,
} from '@/services/api';
import UserModal, { UserFormData } from '@/components/users/UserModal';

// ============================================================================
// MAIN PAGE
// ============================================================================

function UserRolesPage() {
  const navigate = useNavigate();
  const { data: users, isLoading: usersLoading } = useUsers();
  const { data: assignments, isLoading: assignmentsLoading } = useAllRoleAssignments();
  const grantRoleMutation = useGrantRole();
  const revokeRoleMutation = useRevokeRole();
  const createUserMutation = useCreateUser();
  const updateUserMutation = useUpdateUser();
  const deleteUserMutation = useDeleteUser();
  const restoreUserMutation = useRestoreUser();

  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  // Confirm dialog states
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; user: User | null }>({
    isOpen: false,
    user: null,
  });
  const [restoreConfirm, setRestoreConfirm] = useState<{ isOpen: boolean; user: User | null }>({
    isOpen: false,
    user: null,
  });

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const usersPerPage = 10;

  // Available roles that can be granted (excluding ADMIN as it's a base role only)
  const grantableRoles = Object.values(UserRole).filter(role => role !== UserRole.ADMIN);

  // Filter users by search
  const filteredUsers =
    users?.filter(
      user =>
        user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.userId.toLowerCase().includes(searchQuery.toLowerCase())
    ) || [];

  // Paginate users
  const totalPages = Math.ceil(filteredUsers.length / usersPerPage);
  const paginatedUsers = filteredUsers.slice(
    (currentPage - 1) * usersPerPage,
    currentPage * usersPerPage
  );

  // Reset page when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  // Get granted roles for a specific user
  const getUserGrantedRoles = (userId: string) => {
    return assignments?.filter(a => a.userId === userId && a.active).map(a => a.role) || [];
  };

  // Check if a user has a specific role granted
  const userHasRole = (userId: string, role: UserRole) => {
    const grantedRoles = getUserGrantedRoles(userId);
    // Also check if it's their base role
    const user = users?.find(u => u.userId === userId);
    return grantedRoles.includes(role) || user?.role === role;
  };

  const handleGrantRole = async (userId: string, role: UserRole) => {
    try {
      await grantRoleMutation.mutateAsync({ userId, role });
      playSound('success');
    } catch (error) {
      console.error('Failed to grant role:', error);
    }
  };

  const handleRevokeRole = async (userId: string, role: UserRole) => {
    try {
      await revokeRoleMutation.mutateAsync({ userId, role });
      playSound('success');
    } catch (error) {
      console.error('Failed to revoke role:', error);
    }
  };

  const handleCreateUser = async (data: UserFormData) => {
    try {
      await createUserMutation.mutateAsync({
        name: data.name,
        email: data.email,
        password: data.password!,
        role: data.role,
      });
      playSound('success');
      setIsCreateModalOpen(false);
    } catch (error) {
      console.error('Failed to create user:', error);
    }
  };

  const handleUpdateUser = async (data: UserFormData) => {
    if (!selectedUser) return;
    try {
      await updateUserMutation.mutateAsync({
        userId: selectedUser.userId,
        data: {
          name: data.name,
          email: data.email,
          role: data.role,
          active: data.active,
        },
      });
      playSound('success');
      setIsEditModalOpen(false);
      setSelectedUser(null);
    } catch (error) {
      console.error('Failed to update user:', error);
    }
  };

  const handleEditUser = (user: User) => {
    setSelectedUser(user);
    setIsEditModalOpen(true);
  };

  const handleDeleteUser = async (user: User) => {
    setDeleteConfirm({ isOpen: true, user });
  };

  const confirmDeleteUser = async () => {
    if (!deleteConfirm.user) return;
    try {
      await deleteUserMutation.mutateAsync(deleteConfirm.user.userId);
      playSound('success');
      setDeleteConfirm({ isOpen: false, user: null });
    } catch (error) {
      console.error('Failed to delete user:', error);
    }
  };

  const handleRestoreUser = async (user: User) => {
    setRestoreConfirm({ isOpen: true, user });
  };

  const confirmRestoreUser = async () => {
    if (!restoreConfirm.user) return;
    try {
      await restoreUserMutation.mutateAsync(restoreConfirm.user.userId);
      playSound('success');
      setRestoreConfirm({ isOpen: false, user: null });
    } catch (error) {
      console.error('Failed to restore user:', error);
    }
  };

  // Calculate days remaining until permanent deletion
  const getDaysRemaining = (deletedAt: Date | null | undefined): number | null => {
    if (!deletedAt) return null;
    const deletionDate = new Date(deletedAt);
    const permanentDeletionDate = new Date(deletionDate.getTime() + 3 * 24 * 60 * 60 * 1000); // 3 days
    const now = new Date();
    const remainingMs = permanentDeletionDate.getTime() - now.getTime();
    const remainingDays = Math.ceil(remainingMs / (24 * 60 * 60 * 1000));
    return remainingDays > 0 ? remainingDays : 0;
  };

  if (usersLoading || assignmentsLoading) {
    return (
      <div className="min-h-screen">
        <Header />
        {/* Breadcrumb Navigation */}
        <Breadcrumb />
        <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
      {/* Breadcrumb Navigation */}
      <Breadcrumb />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
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
            <div className="flex items-center gap-3">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => navigate('/roles-management')}
                className="flex items-center gap-2"
              >
                <KeyIcon className="h-4 w-4" />
                Manage Roles
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => setIsCreateModalOpen(true)}
                className="flex items-center gap-2"
              >
                <PlusIcon className="h-4 w-4" />
                Create User
              </Button>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="p-3 bg-primary-100 dark:bg-primary-500/20 rounded-xl">
              <UserGroupIcon className="h-8 w-8 text-primary-500 dark:text-primary-400" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">
                User Roles Management
              </h1>
              <p className="mt-2 text-gray-600 dark:text-gray-400">
                Create users and manage role assignments
              </p>
            </div>
          </div>
        </div>

        {/* Info Box */}
        <Card variant="glass" className="mb-8 border-l-4 border-l-blue-500">
          <CardContent className="p-5">
            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <UserGroupIcon className="h-6 w-6 text-blue-500 dark:text-blue-400" />
              </div>
              <div>
                <h4 className="text-gray-900 dark:text-white font-semibold mb-2">How it works</h4>
                <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                  <li>
                    • <strong className="text-gray-700 dark:text-gray-300">Base role</strong> is the
                    user's primary role (marked with key icon)
                  </li>
                  <li>
                    • <strong className="text-gray-700 dark:text-gray-300">Additional roles</strong>{' '}
                    can be granted to allow role switching
                  </li>
                  <li>
                    • Users can switch between their base role and any granted roles via the role
                    dropdown
                  </li>
                  <li>• ADMIN role cannot be granted as it's a base role only</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Search */}
        <Card variant="glass" className="mb-6">
          <CardContent className="p-4">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search users by name, email, or ID..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
          </CardContent>
        </Card>

        {/* Users List */}
        <div className="space-y-6">
          {paginatedUsers.map(user => {
            const daysRemaining = getDaysRemaining(user.deletedAt);
            const isDeleted = !!user.deletedAt;

            return (
              <Card
                key={user.userId}
                variant="glass"
                className={isDeleted ? 'border-warning-500/30 bg-warning-500/5' : ''}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-4">
                      <div
                        className={`p-3 rounded-xl ${isDeleted ? 'bg-warning-100 dark:bg-warning-500/20' : 'bg-primary-100 dark:bg-primary-500/20'}`}
                      >
                        <UserIcon
                          className={`h-6 w-6 ${isDeleted ? 'text-warning-500 dark:text-warning-400' : 'text-primary-500 dark:text-primary-400'}`}
                        />
                      </div>
                      <div>
                        <div className="flex items-center gap-3">
                          <h3
                            className={`text-xl font-semibold ${isDeleted ? 'text-gray-400 line-through' : 'text-gray-900 dark:text-white'}`}
                          >
                            {user.name}
                          </h3>
                          {!user.active && !isDeleted && (
                            <span className="badge badge-error">Inactive</span>
                          )}
                          {isDeleted && (
                            <span className="badge badge-warning">
                              Deleting in {daysRemaining} day{daysRemaining !== 1 ? 's' : ''}
                            </span>
                          )}
                        </div>
                        <p
                          className={`text-sm ${isDeleted ? 'text-gray-400' : 'text-gray-600 dark:text-gray-400'}`}
                        >
                          {user.email}
                        </p>
                        <div className="flex items-center gap-3 mt-2">
                          <span className="text-xs text-gray-500">ID: {user.userId}</span>
                          {isDeleted ? (
                            <span className={`badge badge-warning`}>{user.role}</span>
                          ) : (
                            <UserRoleBadge role={user.role} userId={user.userId} />
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {isDeleted ? (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handleRestoreUser(user)}
                          className="flex items-center gap-2 text-warning-500 dark:text-warning-400 hover:text-warning-600 dark:hover:text-warning-300"
                        >
                          <ArrowPathIcon className="h-4 w-4" />
                          Restore
                        </Button>
                      ) : (
                        <>
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => handleEditUser(user)}
                            className="flex items-center gap-2"
                          >
                            <PencilIcon className="h-4 w-4" />
                            Edit
                          </Button>
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => handleDeleteUser(user)}
                            className="flex items-center gap-2 text-error-400 hover:text-error-300"
                          >
                            <TrashIcon className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </CardHeader>
                {!isDeleted && (
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          Additional Roles
                        </h4>
                        <span className="text-xs text-gray-500">
                          {getUserGrantedRoles(user.userId).length} role
                          {getUserGrantedRoles(user.userId).length !== 1 ? 's' : ''} granted
                        </span>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {grantableRoles.map(role => {
                          const hasRole = userHasRole(user.userId, role);
                          const isBaseRole = user.role === role;
                          // Disable all additional roles for ADMIN users (they already have full access)
                          const isAdminUser = user.role === UserRole.ADMIN;
                          const isDisabled = isBaseRole || isAdminUser;

                          return (
                            <button
                              key={role}
                              onClick={() => {
                                if (isDisabled) return;
                                if (hasRole) {
                                  handleRevokeRole(user.userId, role);
                                } else {
                                  handleGrantRole(user.userId, role);
                                }
                              }}
                              disabled={isDisabled}
                              className={`p-4 rounded-xl border transition-all duration-200 ${
                                isBaseRole
                                  ? 'bg-primary-100 dark:bg-primary-500/10 border-primary-300 dark:border-primary-500/30 cursor-not-allowed opacity-50'
                                  : isAdminUser
                                    ? 'bg-gray-100 dark:bg-gray-700/30 border-gray-300 dark:border-gray-600/30 cursor-not-allowed opacity-40'
                                    : hasRole
                                      ? 'bg-success-100 dark:bg-success-500/20 border-success-300 dark:border-success-500/30 hover:bg-success-200 dark:hover:bg-success-500/30'
                                      : 'bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                              }`}
                              title={
                                isBaseRole
                                  ? "This is user's base role"
                                  : isAdminUser
                                    ? 'ADMIN users have full access and do not need additional roles'
                                    : hasRole
                                      ? 'Click to revoke'
                                      : 'Click to grant'
                              }
                            >
                              <div className="flex items-center justify-between">
                                <span
                                  className={`text-sm font-medium ${
                                    isBaseRole
                                      ? 'text-primary-600 dark:text-primary-400'
                                      : isAdminUser
                                        ? 'text-gray-400 dark:text-gray-500'
                                        : hasRole
                                          ? 'text-success-600 dark:text-success-400'
                                          : 'text-gray-600 dark:text-gray-400'
                                  }`}
                                >
                                  {role}
                                </span>
                                {isBaseRole && (
                                  <KeyIcon className="h-5 w-5 text-primary-500 dark:text-primary-400" />
                                )}
                                {isAdminUser && !isBaseRole && (
                                  <LockClosedIcon className="h-5 w-5 text-gray-400 dark:text-gray-500" />
                                )}
                                {hasRole && !isBaseRole && !isAdminUser && (
                                  <CheckIcon className="h-5 w-5 text-success-500 dark:text-success-400" />
                                )}
                              </div>
                            </button>
                          );
                        })}
                      </div>

                      <p className="text-sm text-gray-500 mt-3">
                        Click to toggle roles. Users can switch between their base role and any
                        granted roles via the role dropdown in the header.
                      </p>
                    </div>
                  </CardContent>
                )}
              </Card>
            );
          })}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center mt-6">
              <Pagination
                currentPage={currentPage}
                totalItems={filteredUsers.length}
                pageSize={usersPerPage}
                onPageChange={setCurrentPage}
              />
            </div>
          )}

          {filteredUsers.length === 0 && (
            <Card variant="glass">
              <CardContent className="p-12 text-center">
                <UserIcon className="h-16 w-16 text-gray-400 dark:text-gray-600 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-600 dark:text-gray-400 mb-2">
                  No users found
                </h3>
                <p className="text-sm text-gray-500">
                  Try adjusting your search query or create a new user
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </main>

      {/* Create User Modal */}
      <UserModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={handleCreateUser}
        isLoading={createUserMutation.isPending}
      />

      {/* Edit User Modal */}
      <UserModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedUser(null);
        }}
        onSubmit={handleUpdateUser}
        initialData={selectedUser || undefined}
        isEditing={true}
        isLoading={updateUserMutation.isPending}
      />

      {/* Delete User Confirmation Dialog */}
      <ConfirmDialog
        isOpen={deleteConfirm.isOpen}
        onClose={() => setDeleteConfirm({ isOpen: false, user: null })}
        onConfirm={confirmDeleteUser}
        title="Delete User"
        message={`Are you sure you want to delete ${deleteConfirm.user?.name}? The user will be marked for deletion and permanently removed after 3 days. You can restore the user during this grace period.`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        isLoading={deleteUserMutation.isPending}
      />

      {/* Restore User Confirmation Dialog */}
      <ConfirmDialog
        isOpen={restoreConfirm.isOpen}
        onClose={() => setRestoreConfirm({ isOpen: false, user: null })}
        onConfirm={confirmRestoreUser}
        title="Restore User"
        message={`Restore ${restoreConfirm.user?.name}? The user will be able to log in and access the system again.`}
        confirmText="Restore"
        cancelText="Cancel"
        variant="success"
        isLoading={restoreUserMutation.isPending}
      />
    </div>
  );
}

export default UserRolesPage;
