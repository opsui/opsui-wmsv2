/**
 * RoleModal component
 *
 * Modal for creating and editing custom roles with permissions
 */

import { useState, useEffect } from 'react';
import { Button } from '@/components/shared';
import {
  XMarkIcon,
  ShieldCheckIcon,
  KeyIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  CheckIcon,
} from '@heroicons/react/24/outline';
import { Permission, PERMISSION_GROUPS } from '@opsui/shared';
import { useFormValidation } from '@/hooks/useFormValidation';

interface RoleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: RoleFormData) => void;
  initialData?: {
    name: string;
    permissions: Permission[];
  };
  permissionGroups: Array<{
    key: string;
    label: string;
    permissions: Permission[];
  }>;
  selectedPermissionGroups?: Set<string>;
  isEditing?: boolean;
  isLoading?: boolean;
}

export interface RoleFormData {
  name: string;
  description: string;
  permissions: Permission[];
}

function RoleModal({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  permissionGroups,
  selectedPermissionGroups: _initialSelectedGroups = new Set(),
  isEditing = false,
  isLoading = false,
}: RoleModalProps) {
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  // Track selected permissions by group
  const [selectedPermissionsByGroup, setSelectedPermissionsByGroup] = useState<
    Record<string, Set<Permission>>
  >({});

  // Form validation
  const {
    values: formData,
    errors,
    handleChange,
    handleSubmit,
    isSubmitting,
    reset,
    setFieldValue,
  } = useFormValidation<RoleFormData>({
    initialValues: {
      name: initialData?.name || '',
      description: '',
      permissions: initialData?.permissions || [],
    },
    validationRules: {
      name: {
        required: true,
        minLength: 3,
        maxLength: 50,
      },
      description: {
        maxLength: 500,
      },
      permissions: {
        custom: value => {
          if (!value || value.length === 0) {
            return 'At least one permission must be selected';
          }
          return null;
        },
      },
    },
    onSubmit: async values => {
      // Flatten all selected permissions
      const allPermissions = Object.values(selectedPermissionsByGroup).flatMap(set =>
        Array.from(set)
      );

      const submitData: RoleFormData = {
        name: values.name.trim(),
        description: values.description.trim(),
        permissions: allPermissions as Permission[],
      };

      onSubmit(submitData);
    },
    validateOnChange: true,
  });

  // Initialize form when modal opens
  useEffect(() => {
    if (isOpen) {
      reset();
      setFieldValue('name', initialData?.name || '');
      setFieldValue('description', '');
      setFieldValue('permissions', initialData?.permissions || []);

      // Initialize selected permissions from initial data
      const initialSelectedByGroup: Record<string, Set<Permission>> = {};
      if (initialData?.permissions) {
        initialData.permissions.forEach(permission => {
          Object.entries(PERMISSION_GROUPS).forEach(([groupKey, groupPermissions]) => {
            if ((groupPermissions as readonly Permission[]).includes(permission)) {
              if (!initialSelectedByGroup[groupKey]) {
                initialSelectedByGroup[groupKey] = new Set<Permission>();
              }
              initialSelectedByGroup[groupKey]!.add(permission);
            }
          });
        });
      }
      setSelectedPermissionsByGroup(initialSelectedByGroup);

      // Expand all groups by default
      const allGroups = new Set(Object.keys(PERMISSION_GROUPS));
      setExpandedGroups(allGroups);
    }
  }, [isOpen, initialData, reset, setFieldValue]);

  const toggleGroupExpanded = (groupKey: string) => {
    setExpandedGroups(prev => {
      const newSet = new Set(prev);
      if (newSet.has(groupKey)) {
        newSet.delete(groupKey);
      } else {
        newSet.add(groupKey);
      }
      return newSet;
    });
  };

  const togglePermission = (groupKey: string, permission: Permission) => {
    setSelectedPermissionsByGroup(prev => {
      const groupPermissions = prev[groupKey] || new Set();

      if (groupPermissions.has(permission)) {
        groupPermissions.delete(permission);
      } else {
        groupPermissions.add(permission);
      }

      // Update the permissions field for validation
      const allPermissions = Object.values({
        ...prev,
        [groupKey]: groupPermissions,
      }).flatMap(set => Array.from(set));
      setFieldValue('permissions', allPermissions);

      return {
        ...prev,
        [groupKey]: groupPermissions,
      };
    });
  };

  const isPermissionSelected = (groupKey: string, permission: Permission) => {
    return selectedPermissionsByGroup[groupKey]?.has(permission) || false;
  };

  const getGroupSelectedCount = (groupKey: string) => {
    return selectedPermissionsByGroup[groupKey]?.size || 0;
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50" onClick={onClose} />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="w-full max-w-4xl bg-gray-900 rounded-2xl shadow-2xl border border-gray-700 max-h-[90vh] overflow-hidden flex flex-col"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-700">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary-500/20 rounded-lg">
                <ShieldCheckIcon className="h-5 w-5 text-primary-400" />
              </div>
              <h2 className="text-xl font-semibold text-white">
                {isEditing ? 'Edit Custom Role' : 'Create Custom Role'}
              </h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Name Field */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Role Name</label>
                <input
                  name="name"
                  type="text"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="e.g., Warehouse Manager"
                  className={`w-full px-4 py-3 bg-gray-800 border rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-colors ${
                    errors.name ? 'border-red-500' : 'border-gray-700'
                  }`}
                  disabled={isEditing} // System role names cannot be edited
                />
                {errors.name && <p className="mt-2 text-sm text-red-400">{errors.name}</p>}
              </div>

              {/* Description Field */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Description</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  placeholder="Describe the purpose of this role..."
                  rows={3}
                  className={`w-full px-4 py-3 bg-gray-800 border rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-colors resize-none ${
                    errors.description ? 'border-red-500' : 'border-gray-700'
                  }`}
                />
                {errors.description && (
                  <p className="mt-2 text-sm text-red-400">{errors.description}</p>
                )}
              </div>

              {/* Permissions Section */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <label className="block text-sm font-medium text-gray-300">Permissions</label>
                  <div className="text-sm text-gray-500">
                    {Object.values(selectedPermissionsByGroup).reduce(
                      (sum, set) => sum + set.size,
                      0
                    )}{' '}
                    selected
                  </div>
                </div>

                {errors.permissions && (
                  <div className="mb-4 p-3 bg-error-500/10 border border-error-500/30 rounded-lg">
                    <p className="text-sm text-error-400">{errors.permissions}</p>
                  </div>
                )}

                <div className="space-y-3">
                  {permissionGroups.map(group => {
                    const isExpanded = expandedGroups.has(group.key);
                    const selectedCount = getGroupSelectedCount(group.key);
                    const totalCount = group.permissions.length;

                    return (
                      <div
                        key={group.key}
                        className="border border-gray-700 rounded-lg overflow-hidden"
                      >
                        <button
                          type="button"
                          onClick={() => toggleGroupExpanded(group.key)}
                          className="w-full flex items-center justify-between p-4 bg-gray-800/50 hover:bg-gray-800 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            {isExpanded ? (
                              <ChevronDownIcon className="h-5 w-5 text-gray-400" />
                            ) : (
                              <ChevronRightIcon className="h-5 w-5 text-gray-400" />
                            )}
                            <KeyIcon className="h-5 w-5 text-primary-400" />
                            <span className="text-sm font-medium text-white capitalize">
                              {group.label}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="badge badge-primary text-xs">
                              {selectedCount}/{totalCount}
                            </span>
                            {selectedCount > 0 && (
                              <CheckIcon className="h-4 w-4 text-success-400" />
                            )}
                          </div>
                        </button>

                        {isExpanded && (
                          <div className="p-4 pt-0 grid grid-cols-2 gap-2">
                            {group.permissions.map(permission => {
                              const isSelected = isPermissionSelected(group.key, permission);
                              return (
                                <button
                                  key={permission}
                                  type="button"
                                  onClick={() => togglePermission(group.key, permission)}
                                  className={`flex items-start gap-2 p-3 rounded-lg border transition-all duration-200 text-left ${
                                    isSelected
                                      ? 'bg-primary-600 border-primary-500 text-white'
                                      : 'bg-gray-800/50 border-gray-700 hover:bg-gray-700 hover:border-gray-600'
                                  }`}
                                >
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={() => togglePermission(group.key, permission)}
                                    className="mt-1 flex-shrink-0"
                                  />
                                  <span className="text-sm">{permission.replace(/_/g, ' ')}</span>
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-700">
              <Button
                type="button"
                variant="secondary"
                onClick={onClose}
                disabled={isLoading || isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                disabled={isLoading || isSubmitting}
                className="min-w-[100px]"
              >
                {isLoading || isSubmitting ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    Saving...
                  </div>
                ) : isEditing ? (
                  'Update Role'
                ) : (
                  'Create Role'
                )}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}

export default RoleModal;
