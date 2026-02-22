/**
 * User Roles Management page
 *
 * Admin page for managing user role assignments and creating users
 *
 * ============================================================================
 * AESTHETIC DIRECTION: ACCESS CONTROL
 * ============================================================================
 * Identity and access management aesthetic:
 * - Dark theme with indigo/violet accents for trust/authority
 * - Space Grotesk for headings, JetBrains Mono for IDs/codes
 * - Scale-up entrance animations with staggered delays
 * - Role toggle grid with clear state indicators
 * - User card hierarchy with status badges
 * - Permission matrix visualization
 * - Subtle atmospheric gradient orbs in background
 * ============================================================================
 */

import {
  Breadcrumb,
  Button,
  Card,
  CardContent,
  CardHeader,
  ConfirmDialog,
  Header,
  Pagination,
  UserRoleBadge,
} from '@/components/shared';
import UserModal, { UserFormData } from '@/components/users/UserModal';
import {
  useAllRoleAssignments,
  useCreateUser,
  useDeleteUser,
  useGrantRole,
  useRestoreUser,
  useRevokeRole,
  useUpdateUser,
  useUsers,
} from '@/services/api';
import { playSound } from '@/stores';
import {
  ArrowPathIcon,
  CheckIcon,
  KeyIcon,
  LockClosedIcon,
  MagnifyingGlassIcon,
  PencilIcon,
  PlusIcon,
  TrashIcon,
  UserGroupIcon,
  UserIcon,
} from '@heroicons/react/24/outline';
import { User, UserRole } from '@opsui/shared';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

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
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-indigo-50 dark:from-gray-950 dark:via-slate-900 dark:to-indigo-950">
        <Header />
        {/* Breadcrumb Navigation */}
        <Breadcrumb />
        <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Card variant="default" className="bg-white/95 dark:bg-gray-800/30 backdrop-blur-sm">
            <CardContent className="p-8">
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500 dark:border-purple-400" />
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-purple-50 via-white to-indigo-50 dark:from-gray-950 dark:via-slate-900 dark:to-indigo-950">
      {/* Atmospheric background - themed for light/dark mode */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-purple-300/20 dark:bg-indigo-500/10 rounded-full blur-3xl transform translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-violet-300/15 dark:bg-violet-500/10 rounded-full blur-3xl transform -translate-x-1/2 translate-y-1/2" />
        <div className="absolute top-1/2 left-1/2 w-[300px] h-[300px] bg-indigo-200/10 dark:bg-blue-500/5 rounded-full blur-2xl transform -translate-x-1/2 -translate-y-1/2" />
      </div>

      <Header />
      {/* Breadcrumb Navigation */}
      <Breadcrumb />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10">
        {/* Page Header with animation */}
        <div className="mb-8" style={{ animation: 'userrole-stagger-in 0.5s ease-out' }}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4"></div>
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
            <div className="p-3 bg-purple-100 dark:bg-purple-500/20 rounded-xl shadow-sm">
              <UserGroupIcon className="h-8 w-8 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight font-['Space_Grotesk',sans-serif]">
                User Roles Management
              </h1>
              <p className="mt-2 text-gray-600 dark:text-gray-400 font-medium">
                Create users and manage role assignments
              </p>
            </div>
          </div>
        </div>

        {/* Info Box */}
        <Card
          variant="default"
          className="mb-8 border-l-4 border-l-purple-500 bg-white/90 dark:bg-purple-500/10 backdrop-blur-sm shadow-sm"
        >
          <CardContent className="p-5">
            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <UserGroupIcon className="h-6 w-6 text-purple-600 dark:text-purple-400" />
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
        <Card
          variant="default"
          className="mb-6 bg-white/90 dark:bg-gray-800/50 backdrop-blur-sm shadow-sm"
        >
          <CardContent className="p-4">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 dark:text-gray-500" />
              <input
                type="text"
                placeholder="Search users by name, email, or ID..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent shadow-sm"
              />
            </div>
          </CardContent>
        </Card>

        {/* Users List */}
        <div className="space-y-6">
          {paginatedUsers.map((user, index) => {
            const daysRemaining = getDaysRemaining(user.deletedAt);
            const isDeleted = !!user.deletedAt;

            return (
              <Card
                key={user.userId}
                variant="default"
                className={`userrole-card bg-white/95 dark:bg-gray-800/30 backdrop-blur-sm shadow-sm dark:shadow-none ${isDeleted ? 'border-amber-300/50 dark:border-warning-500/30 bg-amber-50/50 dark:bg-warning-500/5' : ''}`}
                style={{
                  animation: `userrole-stagger-in 0.4s ease-out ${0.1 + index * 0.08}s backwards`,
                }}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-4">
                      <div
                        className={`p-3 rounded-xl ${isDeleted ? 'bg-amber-100 dark:bg-warning-500/20' : 'bg-purple-100 dark:bg-purple-500/20'}`}
                      >
                        <UserIcon
                          className={`h-6 w-6 ${isDeleted ? 'text-amber-600 dark:text-warning-400' : 'text-purple-600 dark:text-purple-400'}`}
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
                            <span className="px-2 py-1 text-xs font-medium bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400 rounded-md border border-red-200 dark:border-red-500/30">
                              Inactive
                            </span>
                          )}
                          {isDeleted && (
                            <span className="px-2 py-1 text-xs font-medium bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 rounded-md border border-amber-200 dark:border-amber-500/30">
                              Deleting in {daysRemaining} day{daysRemaining !== 1 ? 's' : ''}
                            </span>
                          )}
                        </div>
                        <p
                          className={`text-sm ${isDeleted ? 'text-gray-400 dark:text-gray-500' : 'text-gray-600 dark:text-gray-400'}`}
                        >
                          {user.email}
                        </p>
                        <div className="flex items-center gap-3 mt-2">
                          <span className="text-xs text-gray-500 dark:text-gray-500 font-['JetBrains_Mono',monospace]">
                            ID: {user.userId}
                          </span>
                          {isDeleted ? (
                            <span className="px-2 py-1 text-xs font-medium bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 rounded-md border border-amber-200 dark:border-amber-500/30">
                              {user.role}
                            </span>
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
                          className="flex items-center gap-2 text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300"
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
                            className="flex items-center gap-2 text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300"
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
                        <span className="text-xs text-gray-500 dark:text-gray-500">
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
                                  ? 'bg-purple-100 dark:bg-purple-500/10 border-purple-300 dark:border-purple-500/30 cursor-not-allowed opacity-60'
                                  : isAdminUser
                                    ? 'bg-gray-100 dark:bg-gray-700/30 border-gray-300 dark:border-gray-600/30 cursor-not-allowed opacity-50'
                                    : hasRole
                                      ? 'bg-emerald-100 dark:bg-emerald-500/20 border-emerald-300 dark:border-emerald-500/30 hover:bg-emerald-200 dark:hover:bg-emerald-500/30 shadow-sm'
                                      : 'bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600'
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
                                      ? 'text-purple-700 dark:text-purple-400'
                                      : isAdminUser
                                        ? 'text-gray-400 dark:text-gray-500'
                                        : hasRole
                                          ? 'text-emerald-700 dark:text-emerald-400'
                                          : 'text-gray-700 dark:text-gray-400'
                                  }`}
                                >
                                  {role}
                                </span>
                                {isBaseRole && (
                                  <KeyIcon className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                                )}
                                {isAdminUser && !isBaseRole && (
                                  <LockClosedIcon className="h-5 w-5 text-gray-400 dark:text-gray-500" />
                                )}
                                {hasRole && !isBaseRole && !isAdminUser && (
                                  <CheckIcon className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                                )}
                              </div>
                            </button>
                          );
                        })}
                      </div>

                      <p className="text-sm text-gray-500 dark:text-gray-500 mt-3">
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
            <Card variant="default" className="bg-white/95 dark:bg-gray-800/30 backdrop-blur-sm">
              <CardContent className="p-12 text-center">
                <UserIcon className="h-16 w-16 text-gray-400 dark:text-gray-600 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-700 dark:text-gray-400 mb-2">
                  No users found
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-500">
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
